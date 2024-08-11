
import { getCreatureSize, slugify } from "../scripts/helpers.js";
import { socketEvent } from "../scripts/socket.js";
import { savingThrowTable } from "../scripts/statisticsData.js";
import { getCategoryLabel } from "../scripts/statisticsHelper.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PF2EBestiary extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        this.bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        this.selected = {
            category: 'monster',
            type: 'giant',
            monster: this.bestiary['monster']['giant']['troll'],
            abilities: [],
        };
        this.statistics = {
            expanded: false,
        };

        Hooks.on(socketEvent.UpdateBestiary, this.onBestiaryUpdate);
    }

    get title(){
        return 'Bestiary'; 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        classes: ["bestiary-tracking", "bestiary"],
        position: { width: 800, height: 800 },
        actions: {
            selectBookmark: this.selectBookmark,
            selectMonster: this.selectMonster,
            removeMonster: this.removeMonster,
            toggleStatistics: this.toggleStatistics,
            returnButton: this.returnButton,
            toggleAbility: this.toggleAbility,
            toggleRevealed: this.toggleRevealed,
        },
        form: { handler: this.updateData, submitOnChange: true },
        dragDrop: [
            {dragSelector: null, dropSelector: null },
        ],
    };
      
    static PARTS = {
        application: {
            id: "bestiary",
            template: "modules/pf2e-bestiary-tracking/templates/bestiary.hbs"
        }
    }

    _onRender(context, options) {
        this._dragDrop = this._createDragDropHandlers.bind(this)();
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.bestiary = this.bestiary;
        context.selected = this.selected;
        context.openType = this.bestiary[this.selected.category][this.selected.type];
        context.returnMessage = this.selected.monster ? `Return to the ${this.selected.type.capitalize()} category page` : this.selected.type ? `Return to main page` : null;
        context.user = game.user;

        return context;
    }

    static selectBookmark(_, button){
        this.selected.type = this.selected.type === button.dataset.bookmark ? null : button.dataset.bookmark;
        this.selected.monster = null;
        this.render();
    }

    static selectMonster(_, button){
        this.selected.monster = this.bestiary[this.selected.category][this.selected.type][button.dataset.monster];
        this.render();
    }

    static removeMonster(_, button){
        this.selected.monster = null;
        this.bestiary[this.selected.category][this.selected.type] = Object.keys(this.bestiary[this.selected.category][this.selected.type]).reduce((acc, monster) => {
            if(monster !== button.dataset.monster){
                acc[monster] = this.bestiary[this.selected.category][this.selected.type][monster];
            }
            
            return acc;
        }, {});

        this.render();
    }

    static toggleStatistics(){
        this.statistics.expanded = !this.statistics.expanded;
        this.render();
    }

    static returnButton(){
        this.selected = this.selected.monster ? { ...this.selected, monster: null } : this.selected.type ? { category: 'monster' } : this.selected;
        this.render();
    }
    
    static toggleAbility(_, button) {
        this.selected.abilities = this.selected.abilities.includes(button.dataset.ability) ? 
            this.selected.abilities.filter(x => x !== button.dataset.ability) :
            [...this.selected.abilities, button.dataset.ability];

        const html = $($(this.element).find(`[data-ability="${button.dataset.ability}"]`)[0]).parent().parent().find('.action-description')[0];
        html.classList.toggle('expanded');
    }

    static async toggleRevealed(_, button){
        foundry.utils.setProperty(this.selected.monster, `${button.dataset.path}.revealed`, !foundry.utils.getProperty(this.selected.monster, `${button.dataset.path}.revealed`));
        
        if(button.dataset.parent){
            const values = Object.values(this.selected.monster[button.dataset.parent].values);
            this.selected.monster[button.dataset.parent].currentRevealed = values.filter(x => x.revealed).length;
            this.selected.monster[button.dataset.parent].revealed = 
                values.every(x => !x.revealed) ? 0 :
                values.every(x => x.revealed) ? 2 :
                1;
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        this.render();

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { monsterSlug: this.selected.monster.slug },
        });
    }

    static async updateData(event, element, formData){
        this.customActivity = foundry.utils.mergeObject(this.customActivity, formData.object);
        this.render();
    }

    _createDragDropHandlers() {
        return this.options.dragDrop.map(d => {
          d.callbacks = {
            drop: this._onDrop.bind(this)
          };
          
          const newHandler = new DragDrop(d);
          newHandler.bind(this.element);

          return newHandler;
        });
      }
  
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = await fromUuid(data.uuid);
        if(item.type !== 'npc') return;

        var updatedBestiary = this.bestiary;

        const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);
        const types = item.system.traits.value.reduce((acc, x) => {
            if(creatureTypes.includes(x)) acc.push({key: x, name: CONFIG.PF2E.creatureTypes[x]});

            return acc;
        }, []);

        const creatureTraits = Object.keys(CONFIG.PF2E.creatureTraits);
        const traits = item.system.traits.value.reduce((acc, x, index) => {
            if(creatureTraits.includes(x)){
                acc.values[x] = { revealed: false, value: CONFIG.PF2E.creatureTraits[x] };
            }
            
            return acc;
        }, { revealed: 0, values: {} });


        const actions = { revealed: 0, values: {} };
        const passives = { revealed: 0, values: {} };
        for(var action of item.items) {
            if(action.type === 'action'){
                if( ['action', 'reaction'].includes(action.system.actionType.value)){
                    actions.values[action.id] = {
                        revealed: false,
                        name: action.name,
                        img: action.img,
                        uuid: action.uuid,
                        actions: action.system.actions.value,
                        description: await TextEditor.enrichHTML(action.system.description.value),
                    };
                }
                else {
                    passives.values[action.id] = {
                        revealed: false,
                        name: action.name,
                        img: action.img,
                        uuid: action.uuid,
                        description: await TextEditor.enrichHTML(action.system.description.value),
                    };
                }
            }
        };

        for(var type of types){
            const slug = slugify(item.name);
            updatedBestiary.monster[type.key][slug] = {
                slug: slug,
                traits: traits,
                size: getCreatureSize(item.system.traits.size.value),
                name: item.name,
                img: item.img,
                abilities: { 
                    revealed: false, 
                    values: Object.keys(item.system.abilities).map(x => { 
                        const ability = item.system.abilities[x];
                        return { label: x.capitalize(), value: ability.mod >= 0 ? `+${ability.mod}` : `${ability.mod}` }; 
                    }
                )},
                ac: { revealed: false, value: item.system.attributes.ac.value },
                hp: { revealed: false, value: item.system.attributes.hp.max },
                speeds: {
                    revealed: 0,
                    values: {
                        land: { revealed: false, name: 'Land', value: item.system.attributes.speed.value },
                        ...item.system.attributes.speed.otherSpeeds.reduce((acc, speed) => { 
                            acc[speed.type] = {
                                revealed: false,
                                name: speed.label,
                                value: speed.value
                            };
        
                            return acc;
                        }, {})
                    }
                },
                senses: {
                    revealed: 0,
                    values: {
                        perception: {
                            revealed: false,
                            label: 'Perception',
                            value: item.system.perception.value,
                        },
                        ...item.system.perception.senses.reduce((acc, sense) => {
                            acc[sense.type] = { revealed: false, label: sense.label };
        
                            return acc;
                        }, {}),
                        other: { revealed: false, label: item.system.perception.details },
                    }
                },
                attacks: item.system.actions.reduce((acc, action) => {
                    acc.values[action.slug] = {
                        revealed: false,
                        slug: action.slug,
                        range: action.item.type === 'melee' ? 'Melee' : 'Ranged', 
                        label: action.label,
                        variants: action.variants.reduce((acc, variant) => {
                            acc.values[slugify(variant.label)] = variant.label;

                            return acc;
                        }, { revealed: false, values: {} }),
                        damage: Object.values(action.item.system.damageRolls).reduce((acc, x) => {
                            acc = acc.concat(`${acc ? ' + ' : ''}${x.damage} ${x.damageType}`);

                            return acc;
                        }, ''),
                        traits: action.traits.map(trait => ({
                            label: trait.label,
                            description: trait.description,
                        }))
                    };

                    return acc;
                }, { revealed: 0, values: {} }),
                immunities: item.system.attributes.immunities.length > 0  ? item.system.attributes.immunities.reduce((acc, immunity, index) => {
                    acc.values[slugify(immunity.label)] = { revealed: false, value: immunity.label, index: index+1 };

                    return acc;
                }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: 'None' } }, fake: true },
                resistances: item.system.attributes.resistances.length > 0  ? item.system.attributes.resistances.reduce((acc, resistance, index) => {
                    acc.values[slugify(resistance.label)] = { revealed: false, value: resistance.label, index: index+1 };

                    return acc;
                }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: 'None' } }, fake: true },
                weaknesses: item.system.attributes.weaknesses.length > 0  ? item.system.attributes.weaknesses.reduce((acc, weakness, index) => {
                    acc.values[slugify(weakness.label)] = { revealed: false, value: weakness.label, index: index+1 };

                    return acc;
                }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: 'None' } }, fake: true },
                actions: actions,
                passives: passives,
                saves: {
                    fortitude: { value: item.system.saves.fortitude.value, category: getCategoryLabel(savingThrowTable, item.system.details.level.value, item.system.saves.fortitude.value), revealed: false },
                    reflex: { value: item.system.saves.reflex.value, category: getCategoryLabel(savingThrowTable, item.system.details.level.value, item.system.saves.reflex.value), revealed: false },
                    will: { value: item.system.saves.will.value, category: getCategoryLabel(savingThrowTable, item.system.details.level.value, item.system.saves.will.value), revealed: false },
                }
            };

            this.selected = { ...this.selected, category: 'monster', type: type.key, monster: updatedBestiary.monster[type.key][slug] };
        }
        
        this.bestiary = updatedBestiary;
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', updatedBestiary);
        this.render();
    }

    onBestiaryUpdate = async ({ monsterSlug }) => {
        if(!game.user.isGM){
            this.bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
            if(this.selected.monster.slug === monsterSlug) {
                this.selected.monster = this.bestiary[this.selected.category][this.selected.type][monsterSlug];
            }

            this.render(true);
        }
    };

    close = async (options) => {
        Hooks.off(socketEvent.UpdateBestiary, this.onBestiaryUpdate);

        return super.close(options);
    }
}