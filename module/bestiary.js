
import { getCreatureSize, slugify } from "../scripts/helpers.js";
import { socketEvent } from "../scripts/socket.js";
import { acTable, attributeTable, hpTable, savingThrowPerceptionTable } from "../scripts/statisticsData.js";
import { getCategoryFromIntervals, getCategoryLabel, getCategoryRange, getWeaknessCategoryClass } from "../scripts/statisticsHelper.js";

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

        this.search = {
            name: '',
        };

        Hooks.on(socketEvent.UpdateBestiary, this.onBestiaryUpdate);
    }

    get title(){
        return game.i18n.localize("PF2EBestiary.Bestiary.Title"); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-bestiary',
        classes: ["bestiary-tracking", "bestiary"],
        position: { width: 800, height: 800 },
        actions: {
            selectBookmark: this.selectBookmark,
            selectMonster: this.selectMonster,
            removeMonster: this.removeMonster,
            toggleStatistics: this.toggleStatistics,
            returnButton: this.returnButton,
            toggleAbility: this.toggleAbility,
            toggleSpell: this.toggleSpell,
            toggleRevealed: this.toggleRevealed,
            resetBestiary: this.resetBestiary,
            clearSearch: this.clearSearch,
            createMisinformation: this.createMisinformation,
            imagePopout: this.imagePopout,
        },
        form: { handler: this.updateData, submitOnChange: true },
        window: {
            controls: [
                {
                    icon: 'fa-solid fa-link-slash',
                    label: 'PF2EBestiary.Bestiary.WindowControls.ResetBestiary',
                    action: 'resetBestiary',
                },
            ]
        },
        dragDrop: [
            {dragSelector: null, dropSelector: null },
        ],
    };
      
    static PARTS = {
        application: {
            id: "bestiary",
            template: "modules/pf2e-bestiary-tracking/templates/bestiary.hbs",
            scrollable: [".left-monster-container", ".right-monster-container-data", ".type-overview-container", ".spells-tab"]
        }
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        $(htmlElement).find(".toggle-container:not(.misinformation)").on("contextmenu", this.obscureData.bind(this));
        $(htmlElement).find(".misinformation").on("contextmenu", this.unObscureData.bind(this));
    }

    getTabs() {
        const tabs = {
            statistics: { active: true, cssClass: '', group: 'primary', id: 'statistics', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Statistics") },
            spells: { active: false, cssClass: '', group: 'primary', id: 'spells', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Spells") },
            lore: { active: false, cssClass: '', group: 'primary', id: 'lore', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Lore") },
        }

        for ( const v of Object.values(tabs) ) {
            v.active = this.tabGroups[v.group] ? this.tabGroups[v.group] === v.id : v.active;
            v.cssClass = v.active ? "active" : "";
        }

        return tabs;
    }

    _onRender(context, options) {
        this._dragDrop = this._createDragDropHandlers.bind(this)();
    }

    async enrichTexts(selected) {
        if(!selected.monster) return;

        const newActions = {};
        for(var actionKey of Object.keys(selected.monster.actions.values)){
            const description = await TextEditor.enrichHTML(selected.monster.actions.values[actionKey].description);
            newActions[actionKey] = { ...selected.monster.actions.values[actionKey], description };
        }

        const newPassives = {};
        for(var passiveKey of Object.keys(selected.monster.passives.values)){
            const description = await TextEditor.enrichHTML(selected.monster.passives.values[passiveKey].description);
            newPassives[passiveKey] = { ...selected.monster.passives.values[passiveKey], description };
        }

        for(var entryKey in selected.monster.spells.entries){
            const entry = selected.monster.spells.entries[entryKey]
            for(var levelKey in entry.levels){
                for(var spellKey in entry.levels[levelKey]){
                    const spell = entry.levels[levelKey][spellKey];
                    spell.description = { ...spell.description, value: await TextEditor.enrichHTML(spell.description.value) };
                }
            }
        }

        selected.monster.notes.public.text = await TextEditor.enrichHTML(selected.monster.notes.public.text);
        selected.monster.notes.private.text = await TextEditor.enrichHTML(selected.monster.notes.private.text);
        selected.monster.actions.values = newActions;
        selected.monster.passives.values = newPassives;
    }

    getWithPlayerContext(context) {
        context.vagueDescriptions.settings.playerBased = game.user.isGM ? false : context.vagueDescriptions.settings.playerBased;
        
        if(!game.user.isGM && context.vagueDescriptions.settings.playerBased && context.playerLevel && context.selected.monster){
            context.selected.monster.ac.category = getCategoryLabel(acTable, context.playerLevel, context.selected.monster.ac.value);
            context.selected.monster.hp.category = getCategoryFromIntervals(hpTable, context.playerLevel, context.selected.monster.hp.value);
            Object.values(context.selected.monster.saves).forEach(save => save.category = getCategoryLabel(savingThrowPerceptionTable, context.playerLevel, save.value, true));
            Object.values(context.selected.monster.abilities.values).forEach(ability => ability.category = getCategoryLabel(attributeTable, context.playerLevel, ability.mod));
            context.selected.monster.senses.values.perception.category = getCategoryLabel(savingThrowPerceptionTable, context.playerLevel, context.selected.monster.senses.values.perception.value);
        }

        return context;
    }

    prepareData(monster) {
        if(!monster) return monster;

        return {
            slug: monster.slug,
            id: monster.id,
            uuid: monster.uuid,
            level: monster.value,
            inTypes: monster.inTypes,
            traits: monster.traits,
            size: monster.size,
            name: monster.name,
            img: monster.img,
            abilities: monster.abilities,
            ac: monster.ac,
            hp: monster.hp,
            speeds: monster.speeds,
            senses: monster.senses,
            attacks: monster.attacks,
            immunities: monster.immunities,
            resistances: monster.resistances,
            weaknesses: monster.weaknesses,
            actions: monster.actions,
            passives: monster.passives,
            saves: monster.saves,
            spells: {
                ...monster.spells, 
                entries: Object.keys(monster.spells.entries).reduce((acc, entryKey) => {
                    acc[entryKey] = {
                        ...monster.spells.entries[entryKey],
                        id: entryKey,
                        levels: Object.keys(monster.spells.entries[entryKey].levels).reduce((acc, levelKey) => {
                            const spells = monster.spells.entries[entryKey].levels[levelKey];
                            const spellArray = Object.keys(spells).map(spellKey => ({
                                ...spells[spellKey]
                            }));

                            acc.push({
                                revealed: spellArray.some(spell => spell.revealed),
                                level: levelKey,
                                label: Number.isNaN(Number.parseInt(levelKey)) ? levelKey : `${levelKey}${levelKey === '1' ? 'st' : 'nd'} Rank`,
                                spells: Object.keys(spells).map(spellKey => spells[spellKey])
                            });

                            return acc;
                        }, []).sort((a, b) => {
                            if(a.level === 'Cantrips' && b.level !== 'Cantrips') return -1;
                            if(a.level !== 'Cantrips' && b.level === 'Cantrips') return 1;
                            
                            if(a.level === b.level) return 0;
                            else if(a.level > b.level) return 1;
                            else return -1;
                        }),
                    };

                    return acc;
                }, {})
            },
            notes: monster.notes,
        };
    }

    async _prepareContext(_options) {
        var context = await super._prepareContext(_options);

        context.tabs = this.getTabs();
        context.bestiary = foundry.utils.deepClone(this.bestiary);
        context.selected = foundry.utils.deepClone(this.selected);
        await this.enrichTexts(context.selected);
        context.selected.monster = this.prepareData(context.selected.monster);

        context.openType = this.selected.type ? Object.keys(this.bestiary[this.selected.category][this.selected.type]).reduce((acc, key)=> {
            const monster = this.bestiary[this.selected.category][this.selected.type][key];
            const match = monster.name.value.toLowerCase().match(this.search.name.toLowerCase());
            const unrevealedMatch = game.i18n.localize('PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature').toLowerCase().match(this.search.name.toLowerCase());
            if(!this.search.name || ((monster.name.revealed || game.user.isGM) && match) || (!monster.name.revealed && !game.user.isGM && unrevealedMatch)) {
                acc[key] = monster;
            }

            return acc;
        }, {}) : null;

        context.user = game.user;
        context.vagueDescriptions = { ... (await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions')) };
        context.vagueDescriptions.settings.playerBased = game.user.isGM ? false : context.vagueDescriptions.settings.playerBased;
        context.playerLevel = game.user.character ? game.user.character.system.details.level.value : null;
        context.search = this.search;
        context.useTokenArt = await game.settings.get('pf2e-bestiary-tracking', 'use-token-art');

        context = this.getWithPlayerContext(context);

        return context;
    }

    static selectBookmark(_, button){
        this.selected.type = button.dataset.bookmark;
        this.selected.monster = null;
        this.search.name = '';

        this.render();
    }

    static selectMonster(_, button){
        this.selected.monster = this.bestiary[this.selected.category][this.selected.type][button.dataset.monster];
        this.tabGroups = { primary: 'statistics' };
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
        const html = $($(this.element).find(`[data-ability="${button.dataset.ability}"]`)[0]).parent().parent().find('.action-description')[0];
        html.classList.toggle('expanded');
    }

    static toggleSpell(_, button) {
        const html = $($(this.element).find(`[data-spell="${button.dataset.spell}"]`)[0]).parent().parent().parent().parent().find(`.spell-body-row.description[data-spell="${button.dataset.spell}"]`)[0];
        html.classList.toggle('expanded');
    }

    static async toggleRevealed(_, button){
        if(!game.user.isGM) return;

        const newValue = !foundry.utils.getProperty(this.bestiary.monster[this.selected.type][this.selected.monster.slug], `${button.dataset.path}.revealed`);
        for(var type of this.selected.monster.inTypes){
            foundry.utils.setProperty(this.bestiary.monster[type][this.selected.monster.slug], `${button.dataset.path}.revealed`, newValue);
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

    static clearSearch(){
        this.search.name = '';
        this.render();
    }

    getMisinformationDialogData(name){
        switch(name){
            case 'Immunity':
            case 'Weakness':
            case 'Resistance':
                return {
                    width: 400,
                    content: new foundry.data.fields.StringField({
                        label: game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel", { property: name }),
                        required: true
                    }).toFormGroup({}, {name: "misinformation"}).outerHTML,
                    getValue: (elements) => {
                        if(!elements.misinformation?.value) return { value: null, errors: [`Fake ${name}`] };

                        return {
                            value: {
                                slug: slugify(elements.misinformation.value),
                                value: {
                                    revealed: false, value: elements.misinformation.value, fake: true,
                                },
                            },
                            errors: []
                        }
                    }
                }
            case 'Sense':
                return {
                    width: 400,
                    content: new foundry.data.fields.StringField({
                        label: game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel", { property: name }),
                        required: true
                    }).toFormGroup({}, {name: "misinformation"}).outerHTML,
                    getValue: (elements) => {
                        if(!elements.misinformation?.value) return { value: null, errors: [`Fake ${name}`] };

                        return {
                            value: {
                                slug: slugify(elements.misinformation.value),
                                value: {
                                    revealed: false, label: elements.misinformation.value, fake: true,
                                },
                            },
                            errors: []
                        }
                    }
                }
            case 'Attack':
                const rangeOptions = ['Melee', 'Ranged'];
                return {
                    width: 400,
                    content: `
                        <div>
                            ${new foundry.data.fields.StringField({
                                label: game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel", { property: name }),
                                required: true
                            }).toFormGroup({}, {name: "misinformation"}).outerHTML}
                            ${new foundry.data.fields.StringField({
                                choices: rangeOptions,
                                label: game.i18n.localize("PF2EBestiary.Bestiary.Misinformation.Dialog.Attack.Range"),
                                required: true
                            }).toFormGroup({}, {name: "range"}).outerHTML}
                    </div>`,
                    getValue: (elements) => {
                        const errors = [];
                        if(!elements.misinformation?.value) errors.push(`Fake ${name}`);
                        if(!elements.range?.value) errors.push('Range')

                        if(errors.length > 0) return { value: null, errors };

                        return {
                            value: {
                                slug: slugify(elements.misinformation.value),
                                value: {
                                    revealed: false, label: elements.misinformation.value, range: rangeOptions[Number.parseInt(elements.range.value)], fake: true,
                                },
                            },
                            errors: []
                        };
                    },
                }
            case 'Action':
            case 'Passive':
                const actionOptions = name === 'Action' ? [{value: 'F', label: 'Free Action'}, {value: '1', label: '1 Action'}, { value: '2', label: '2 Actions' }, { value: '3', label: '3 Actions' }, { value: 'R', label: 'Reaction' }] : [];
                return {
                    width: 600,
                    content: `
                        <div class="pf2e-bestiary-misinformation-dialog">
                            ${new foundry.data.fields.StringField({
                                label: game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel", { property: name }),
                                required: true
                            }).toFormGroup({}, {name: "misinformation"}).outerHTML}
                            ${actionOptions.length > 0 ? new foundry.data.fields.StringField({
                                choices: actionOptions.map(x => x.label),
                                label: game.i18n.localize("PF2EBestiary.Bestiary.Misinformation.Dialog.Attack.Actions"),
                                required: true
                            }).toFormGroup({}, {name: "actions"}).outerHTML : ''}
                            ${new foundry.data.fields.HTMLField({
                                label: game.i18n.localize("PF2EBestiary.Bestiary.Misinformation.Dialog.Ability.Description"),
                                required: false
                            }).toFormGroup({}, { value: '', name: "description" }).outerHTML}
                    </div>`,
                    getValue: (elements) => {
                        const errors = [];
                        if(!elements.misinformation?.value) errors.push(`Fake ${name}`);
                        if(name === 'Action' && !elements.actions?.value) errors.push('Actions Value');

                        if(errors.length > 0) return { value: null, errors };

                        const base = {
                            slug: slugify(elements.misinformation.value),
                            value: {
                                revealed: false, uuid: `FakeUuid-${name}-${foundry.utils.randomID()}`, name: elements.misinformation.value, description: elements.description?.value, fake: true,
                            },
                        };

                        if(name === 'Action'){
                            base.value.actions = actionOptions[Number.parseInt(elements.actions.value)]?.value;
                        }

                        return { value: base, errors: [] };
                    }
                }
        }
    } 

    static async createMisinformation(_, button){
        if(!game.user.isGM) return;

        const addValue = async ({value, errors}) => {
            if(errors.length > 0) ui.notifications.error(game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.Errors.RequiredFields", { fields: errors.map((x, index) => `${x}${index !== errors.length-1 ? ', ' : ''}`) }));

            for(var type of this.selected.monster.inTypes){
                const newValues = foundry.utils.getProperty(this.bestiary[this.selected.category][type][this.selected.monster.slug], `${button.dataset.path}.values`);
                newValues[value.slug] = value.value;
                foundry.utils.setProperty(this.bestiary[this.selected.category][type][this.selected.monster.slug], `${button.dataset.path}.values`, newValues);
            }

            await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
            await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                action: socketEvent.UpdateBestiary,
                data: { monsterSlug: this.selected.monster.slug },
            });

            this.render();
        };

        const { content, getValue, width } = this.getMisinformationDialogData(button.dataset.name);
        
        async function callback(_, button) {
            await addValue(getValue(button.form.elements));
        }

        await foundry.applications.api.DialogV2.prompt({
            content: content,
            rejectClose: false,
            modal: true,
            ok: { callback: callback },
            window: {title: game.i18n.localize('PF2EBestiary.Bestiary.Misinformation.Dialog.Title')},
            position: { width }
        });
    }

    static async imagePopout(){
        const actor = await fromUuid(this.selected.monster.uuid);
        if(!actor) {
            ui.notifications.warn(game.i18n.localize("PF2EBestiary.Bestiary.Errors.DataMissing"));
            return;
        }

        const {prototypeToken, name, uuid} = actor;
        const useTokenArt = await game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        new ImagePopout(useTokenArt ? prototypeToken.texture.src : actor.img, {title: name, uuid: uuid}).render(true);
    }

    async obscureData(event){
        if(!game.user.isGM || !event.currentTarget.dataset.name) return;

        const setValue = async (value) => {
            if(value){
                for(var type of this.selected.monster.inTypes){
                    foundry.utils.setProperty(this.bestiary[this.selected.category][type][this.selected.monster.slug], `${event.currentTarget.dataset.path}.custom`, value);
                }

                await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
                await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                    action: socketEvent.UpdateBestiary,
                    data: { monsterSlug: this.selected.monster.slug },
                });

                this.render();
            }
        };

        const vagueDescriptions = await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        if(vagueDescriptions.settings.misinformationOptions && vagueDescriptions.properties[event.currentTarget.dataset.vagueProperty]){     
            const choices = await getCategoryRange(event.currentTarget.dataset.vagueProperty);
            const content = new foundry.data.fields.StringField({
                label: game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel", { property: event.currentTarget.dataset.name }),
                choices: choices,
                required: true
            }).toFormGroup({}, {name: "misinformation"}).outerHTML;
            
            async function callback(_, button) {
                const choice = choices[Number.parseInt(button.form.elements.misinformation.value)];
                await setValue(choice);
            }
            
            await foundry.applications.api.DialogV2.prompt({
                content: content,
                rejectClose: false,
                modal: true,
                ok: {callback: callback},
                window: {title: game.i18n.localize('PF2EBestiary.Bestiary.Misinformation.Dialog.Title')},
                position: {width: 400}
            });
        } 
        else {
            const content = new foundry.data.fields.StringField({
                label: game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel", { property: event.currentTarget.dataset.name }),
                required: true
            }).toFormGroup({}, {name: "misinformation"}).outerHTML;
            
            async function callback(_, button) {
                const choice = button.form.elements.misinformation.value;
                await setValue(choice);
            }

            await foundry.applications.api.DialogV2.prompt({
                content: content,
                rejectClose: false,
                modal: true,
                ok: { callback: callback },
                window: {title: game.i18n.localize('PF2EBestiary.Bestiary.Misinformation.Dialog.Title')},
                position: {width: 400}
            });
        }
    }

    async unObscureData(event){
        if(!game.user.isGM) return;

        for(var type of this.selected.monster.inTypes){
            if(event.currentTarget.dataset.fake){
                const pathSplit = event.currentTarget.dataset.path.split('.');
                const deletePath = pathSplit.slice(0, pathSplit.length-1).join('.');
                const newValues = foundry.utils.getProperty(this.bestiary[this.selected.category][type][this.selected.monster.slug], deletePath);
                foundry.utils.setProperty(this.bestiary[this.selected.category][type][this.selected.monster.slug], deletePath, Object.keys(newValues).reduce((acc,key) => {
                    if(key !== pathSplit[pathSplit.length-1]){
                        acc[key] = newValues[key];
                    }

                    return acc;
                }, {}));
            }
            else {
                foundry.utils.setProperty(this.bestiary[this.selected.category][type][this.selected.monster.slug], `${event.currentTarget.dataset.path}.custom`, null);
            }
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { monsterSlug: this.selected.monster.slug },
        });

        this.render();
    }

    static async updateData(event, element, formData){
        const data = foundry.utils.expandObject(formData);
        for(var key in data.object){
            foundry.utils.setProperty(this, key, data.object[key]);
        }

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
        if (!monster) return;

        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        if(bestiary.monster[monster.inTypes[0]][monster.slug]) return;

        for(var type of monster.inTypes){
            bestiary['monster'][type][monster.slug] = monster;
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static async getMonsterData(item){
        if(!item || item.type !== 'npc') return null;

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
                        description: action.system.description.value,
                    };
                }
                else {
                    passives.values[action.id] = {
                        revealed: false,
                        name: action.name,
                        img: action.img,
                        uuid: action.uuid,
                        description: action.system.description.value,
                    };
                }
            }
        };
        if(Object.keys(actions.values).length === 0) actions.values['None'] = { revealed: false, name: 'None' }
        if(Object.keys(passives.values).length === 0) passives.values['None'] = { revealed: false, name: 'None' }

        const attacks = item.system.actions.reduce((acc, action) => {
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
        }, { revealed: 0, values: {} })

        // Join all iterations over item.items in a method?
        const spellcastingEntries = {};
        for(var subItem of item.items){
            if(subItem.type !== 'spellcastingEntry') {
                continue;
            }

            const levels = {};
            for(var spell of subItem.spells){
                const level = spell.isCantrip ? 'Cantrips' : spell.level;
                if(!levels[level]) levels[level] = {};

                levels[level][spell.id] = {
                    revealed: false,
                    id: spell.id,
                    uuid: spell.uuid,
                    name: spell.name,
                    img: spell.img,
                    actions: spell.actionGlyph,
                    defense: spell.system.defense?.save?.statistic ? `${spell.system.defense.save.basic ? 'basic ' : ''} ${spell.system.defense.save.statistic}` : null,
                    range: spell.system.range.value,
                    traits: spell.system.traits,
                    description: {
                        gm: spell.system.description.gm,
                        value: spell.system.description.value,
                    }
                };
            }

            spellcastingEntries[subItem.id] = {
                revealed: false,
                name: subItem.name,
                dc: { revealed: false, value: subItem.system.spelldc.dc },
                attack: { revealed: false, value: subItem.system.spelldc.value },
                levels: levels,
            };
        }

        if(Object.keys(attacks.values).length === 0) attacks.values['None'] = { revealed: false, label: 'None' } // Is this needed anymore?

        const useTokenArt = await game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        const slug = slugify(item.name);
        const monster = {
            slug: slug,
            id: item.id,
            uuid: item.uuid,
            level: item.system.details.level.value,
            inTypes: types.map(x => x.key),
            traits: traits,
            size: getCreatureSize(item.system.traits.size.value),
            name: { revealed: false, value: item.name },
            img: useTokenArt ? item.prototypeToken.texture.src : item.img,
            abilities: { 
                revealed: 0, 
                values: Object.keys(item.system.abilities).map(x => { 
                    const ability = item.system.abilities[x];
                    return { revealed: false, label: x.capitalize(), mod: ability.mod, value: ability.mod >= 0 ? `+${ability.mod}` : `${ability.mod}`, category: getCategoryLabel(attributeTable, item.system.details.level.value, ability.mod), }; 
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
            attacks: attacks,
            immunities: item.system.attributes.immunities.length > 0  ? item.system.attributes.immunities.reduce((acc, immunity) => {
                acc.values[slugify(immunity.label)] = { revealed: false, value: immunity.label };

                return acc;
            }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } } },
            resistances: item.system.attributes.resistances.length > 0  ? item.system.attributes.resistances.reduce((acc, resistance) => {
                acc.values[slugify(resistance.label)] = { revealed: false, value: resistance.label, class: getWeaknessCategoryClass(item.system.details.level.value, resistance.value), category: resistance.applicationLabel };

                return acc;
            }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } } },
            weaknesses: item.system.attributes.weaknesses.length > 0  ? item.system.attributes.weaknesses.reduce((acc, weakness) => {
                acc.values[slugify(weakness.label)] = { revealed: false, value: weakness.label, class: getWeaknessCategoryClass(item.system.details.level.value, weakness.value), category: weakness.applicationLabel };

                return acc;
            }, { revealed: 0, currentRevealed: 0, values: {} }) : { revealed: 0, currentRevealed: 0, values: { none: { revealed: false, value: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } } },

            actions: actions,
            passives: passives,
            saves: {
                fortitude: { value: `${item.system.saves.fortitude.value >= 0 ? '+' : '-'}${item.system.saves.fortitude.value}`, category: getCategoryLabel(savingThrowPerceptionTable, item.system.details.level.value, item.system.saves.fortitude.value, true), revealed: false },
                reflex: { value: `${item.system.saves.reflex.value >= 0 ? '+' : '-'}${item.system.saves.reflex.value}`, category: getCategoryLabel(savingThrowPerceptionTable, item.system.details.level.value, item.system.saves.reflex.value, true), revealed: false },
                will: { value: `${item.system.saves.will.value >= 0 ? '+' : '-'}${item.system.saves.will.value}`, category: getCategoryLabel(savingThrowPerceptionTable, item.system.details.level.value, item.system.saves.will.value, true), revealed: false },
            },
            spells: {
                fake: Object.keys(spellcastingEntries).length > 0 ? null : { revealed: false },
                entries: spellcastingEntries,
            },
            notes: {
                public: { revealed: false, text: item.system.details.publicNotes },
                private: { revealed: false, text: item.system.details.privateNotes },
            }
        };
        
        return monster;
    }
  
    async _onDrop(event) {
        if(!game.user.isGM) return;

        const data = TextEditor.getDragEventData(event);
        const item = await fromUuid(data.uuid);

        if(item?.type === 'character'){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedCharacterType"));
            return;
        }

        if(!item || item.type !== 'npc'){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedType"));
            return;
        }

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