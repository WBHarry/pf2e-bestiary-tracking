
import { getCreatureSize, slugify } from "../scripts/helpers.js";
import { socketEvent } from "../scripts/socket.js";
import { acTable, hpTable, savingThrowPerceptionTable } from "../scripts/statisticsData.js";
import { getCategoryFromIntervals, getCategoryLabel, getWeaknessCategoryClass } from "../scripts/statisticsHelper.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PF2EBestiary extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({category = 'monster', type = null, monsterSlug = null} = {category: 'monster', type: null, monsterSlug: null}){
        super({});

        this.bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        this.selected = {
            category,
            type,
            monster: category && type && monsterSlug ? this.bestiary[category][type][monsterSlug] : null,
            abilities: [],
        };

        this.playerLevel = game.user.character ? game.user.character.system.details.level.value : null;

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
            resetBestiary: this.resetBestiary,
        },
        form: { handler: this.updateData, submitOnChange: true },
        dragDrop: [
            {dragSelector: null, dropSelector: null },
        ],
    };
      
    static PARTS = {
        application: {
            id: "bestiary",
            template: "modules/pf2e-bestiary-tracking/templates/bestiary.hbs",
            scrollable: [".left-monster-container", ".right-monster-container-data", ".type-overview-container"]
        }
    }

    _onRender(context, options) {
        this._dragDrop = this._createDragDropHandlers.bind(this)();
    }

    getWithPlayerContext(context) {
        context.vagueDescriptions.playerBased = game.user.isGM ? false : context.vagueDescriptions.playerBased;
        
        if(!game.user.isGM && context.vagueDescriptions.playerBased && context.selected.monster){
            context.selected.monster.ac.category = getCategoryLabel(acTable, this.playerLevel, context.selected.monster.ac.value);
            context.selected.monster.hp.category = getCategoryFromIntervals(hpTable, this.playerLevel, context.selected.monster.hp.value);
            context.selected.monster.senses.values.perception.category = getCategoryLabel(savingThrowPerceptionTable, this.playerLevel, context.selected.monster.senses.values.perception.value);
        }

        return context;
    }

    async _prepareContext(_options) {
        var context = await super._prepareContext(_options);
        context.bestiary = foundry.utils.deepClone(this.bestiary);
        context.selected = foundry.utils.deepClone(this.selected);
        context.openType = this.bestiary[this.selected.category][this.selected.type];
        context.returnMessage = this.selected.monster ? `Return to the ${this.selected.type.capitalize()} category page` : this.selected.type ? `Return to main page` : null;
        context.user = game.user;
        context.vagueDescriptions = { ... (await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions')) };
        context.vagueDescriptions.playerBased = game.user.isGM ? false : context.vagueDescriptions.playerBased;
        context.playerLevel = this.playerLevel;

        context = this.getWithPlayerContext(context);

        return context;
    }

    static selectBookmark(_, button){
        this.selected.type = button.dataset.bookmark;
        this.selected.monster = null;
        this.render();
    }

    static selectMonster(_, button){
        this.selected.monster = this.bestiary[this.selected.category][this.selected.type][button.dataset.monster];
        this.render();
    }

    static async removeMonster(_, button){
        for(var type of this.bestiary[this.selected.category][this.selected.type][button.dataset.monster].inTypes){
            this.bestiary[this.selected.category][type] = Object.keys(this.bestiary[this.selected.category][type]).reduce((acc, monster) => {
                if(monster !== button.dataset.monster){
                    acc[monster] = this.bestiary[this.selected.category][type][monster];
                }
                
                return acc;
            }, {});
        }

        this.selected.monster = null;

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

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
        if(!game.user.isGM) return;

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

    static async resetBestiary(){
        const confirmed = await Dialog.confirm({
            title: "Reset Bestiary",
            content: "Are you sure you want to reset all the bestiary data?",
            yes: () => true,
            no: () => false,
        });

        if(confirmed){
            this.selected = { category: 'monster', type: null, monster: null, abilities: [] };
            this.bestiary = { 
                monster: Object.keys(CONFIG.PF2E.creatureTypes).reduce((acc, type) => {  
                    acc[type] = {};

                    return acc;
                }, {}), 
                npc: {} };

            await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
            await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                action: socketEvent.UpdateBestiary,
                data: { },
            });

            this.render();
        }
    }

    static async updateData(){
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

    static async addMonster(item){
        const monster = await PF2EBestiary.getMonsterData(item);

        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        if(bestiary.monster[monster.inTypes[0]][monster.slug]) return;

        for(var type of monster.inTypes){
            bestiary['monster'][type][monster.slug] = monster;
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
    }

    static async getMonsterData(item){
        if(item.type !== 'npc') return;

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

        const slug = slugify(item.name);
        const monster = {
            slug: slug,
            inTypes: types.map(x => x.key),
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
            ac: { revealed: false, value: item.system.attributes.ac.value, category: getCategoryLabel(acTable, item.system.details.level.value, item.system.attributes.ac.value) },
            hp: { revealed: false, value: item.system.attributes.hp.max, category: getCategoryFromIntervals(hpTable, item.system.details.level.value, item.system.attributes.hp.max) },
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
                        category: getCategoryLabel(savingThrowPerceptionTable, item.system.details.level.value, item.system.perception.value)
                    },
                    ...item.system.perception.senses.reduce((acc, sense) => {
                        acc[sense.type] = { revealed: false, label: sense.label };
    
                        return acc;
                    }, {}),
                    ...(item.system.perception.details ? { other: { revealed: false, label: item.system.perception.details }} : {}),
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
                acc.values[slugify(resistance.label)] = { revealed: false, value: resistance.label, class: getWeaknessCategoryClass(item.system.details.level.value, resistance.value), category: resistance.type, index: index+1 };

                return acc;
            }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: 'None' } }, fake: true },
            weaknesses: item.system.attributes.weaknesses.length > 0  ? item.system.attributes.weaknesses.reduce((acc, weakness, index) => {
                acc.values[slugify(weakness.label)] = { revealed: false, value: weakness.label, class: getWeaknessCategoryClass(item.system.details.level.value, weakness.value), category: weakness.type, index: index+1 };

                return acc;
            }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: 'None' } }, fake: true },

            actions: actions,
            passives: passives,
            saves: {
                fortitude: { value: `${item.system.saves.fortitude.value >= 0 ? '+' : '-'}${item.system.saves.fortitude.value}`, category: getCategoryLabel(savingThrowPerceptionTable, item.system.details.level.value, item.system.saves.fortitude.value), revealed: false },
                reflex: { value: `${item.system.saves.reflex.value >= 0 ? '+' : '-'}${item.system.saves.reflex.value}`, category: getCategoryLabel(savingThrowPerceptionTable, item.system.details.level.value, item.system.saves.reflex.value), revealed: false },
                will: { value: `${item.system.saves.will.value >= 0 ? '+' : '-'}${item.system.saves.will.value}`, category: getCategoryLabel(savingThrowPerceptionTable, item.system.details.level.value, item.system.saves.will.value), revealed: false },
            }
        };
        
        return monster;
    }
  
    async _onDrop(event) {
        if(!game.user.isGM) return;

        const data = TextEditor.getDragEventData(event);
        const item = await fromUuid(data.uuid);

        const slug = slugify(item.name);
        const monster = await PF2EBestiary.getMonsterData(item);

        const updatedBestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        const autoSelect = await game.settings.get('pf2e-bestiary-tracking', 'automatically-open-monster'); 

        for(var type of monster.inTypes){
            updatedBestiary.monster[type][slug] = monster;

            if(autoSelect || this.selected.monster?.slug === slug){
                this.selected = { ...this.selected, category: 'monster', type: type, monster: updatedBestiary.monster[type][slug] };
            }
            else {
                this.selected.monster = null;
            }
        }
        
        this.bestiary = updatedBestiary;
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', updatedBestiary);

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { monsterSlug: slug },
        });

        this.render();
    }

    onBestiaryUpdate = async ({ monsterSlug }) => {
        this.bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        
        if(monsterSlug){
            if(this.selected.monster?.slug === monsterSlug) {
                this.selected.monster = this.bestiary[this.selected.category][this.selected.type][monsterSlug];
            }
        }
        
        this.render(true);
    };

    close = async (options) => {
        Hooks.off(socketEvent.UpdateBestiary, this.onBestiaryUpdate);

        return super.close(options);
    }
}