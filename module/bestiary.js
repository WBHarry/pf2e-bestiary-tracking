import { getCreatureSize, slugify } from "../scripts/helpers.js";
import { getSavesWithApproximation } from "../scripts/statisticsHelper.js";

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
        const traits = item.system.traits.value.reduce((acc, x) => {
            if(creatureTraits.includes(x)) acc.push(CONFIG.PF2E.creatureTraits[x]);
            
            return acc;
        }, []);


        const actions = [];
        const passives = [];
        for(var action of item.items) {
            if(action.type === 'action'){
                if( ['action', 'reaction'].includes(action.system.actionType.value)){
                    actions.push({
                        name: action.name,
                        img: action.img,
                        uuid: action.uuid,
                        actions: action.system.actions.value,
                        description: await TextEditor.enrichHTML(action.system.description.value),
                    });
                }
                else {
                    passives.push({
                        name: action.name,
                        img: action.img,
                        uuid: action.uuid,
                        description: await TextEditor.enrichHTML(action.system.description.value),
                    });
                }
            }
        };

        for(var type of types){
            const slug = slugify(item.name);
            updatedBestiary.monster[type.key][slug] = {
                traits: traits,
                size: getCreatureSize(item.system.traits.size.value),
                name: item.name,
                img: item.img,
                abilities: Object.keys(item.system.abilities).map(x => { 
                    const ability = item.system.abilities[x];
                    return { label: x.capitalize(), value: ability.mod >= 0 ? `+${ability.mod}` : `${ability.mod}` }; 
                }),
                ac: item.system.attributes.ac.value,
                hp: item.system.attributes.hp.max,
                speeds: [
                    { name: 'land', value: item.system.attributes.speed.value },
                    ...item.system.attributes.speed.otherSpeeds.map(speed => ({ 
                        name: speed.name,
                        value: speed.value,
                    }))
                ],
                perception: item.system.perception.value,
                attacks: item.system.actions.map(action => ({
                    range: action.item.type === 'melee' ? 'Melee' : 'Ranged', 
                    label: action.label,
                    variants: action.variants.map(variant => variant.label),
                    damage: Object.values(action.item.system.damageRolls).reduce((acc, x) => {
                        acc = acc.concat(`${acc ? ' + ' : ''}${x.damage} ${x.damageType}`);

                        return acc;
                    }, ''),
                    traits: action.traits.map(trait => ({
                        label: trait.label,
                        description: trait.description,
                    }))
                })),
                immunities: item.system.attributes.immunities.map(immunity => immunity.label),
                resistances: item.system.attributes.resistances.map(resistance => resistance.label),
                weaknesses: item.system.attributes.weaknesses.map(weakness => weakness.label),
                actions: actions,
                passives: passives,
                saves: getSavesWithApproximation(item.system.details.level.value, item.system.saves),
            };

            this.selected = { ...this.selected, category: 'monster', type: type.key, monster: updatedBestiary.monster[type.key][slug] };
        }
        
        this.bestiary = updatedBestiary;
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', updatedBestiary);
        this.render();
      }
}