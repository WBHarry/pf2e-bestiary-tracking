
import { getCreatureSize, slugify } from "../scripts/helpers.js";
import { socketEvent } from "../scripts/socket.js";
import { acTable, attributeTable, hpTable, savingThrowPerceptionTable, spellAttackTable, spellDCTable } from "../scripts/statisticsData.js";
import { getCategoryFromIntervals, getCategoryLabel, getCategoryRange, getWeaknessCategoryClass } from "../scripts/statisticsHelper.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PF2EBestiary extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({category = 'monster', monsterUuid = null} = {category: 'monster', monsterUuid: null}){
        super({});

        this.bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        this.selected = {
            category,
            type: monsterUuid ? this.bestiary[category][monsterUuid].inTypes[0] : null,
            monster: category && monsterUuid ? this.bestiary[category][monsterUuid] : null,
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
        classes: ["pf2e-bestiary-tracking", "bestiary"],
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
            refreshBestiary: this.refreshBestiary,
            resetBestiary: this.resetBestiary,
            clearSearch: this.clearSearch,
            createMisinformation: this.createMisinformation,
            imagePopout: this.imagePopout,
            setCategoriesLayout: this.setCategoriesLayout,
        },
        form: { handler: this.updateData, submitOnChange: true },
        window: {
            controls: [
                {
                    icon: 'fa-solid fa-arrow-rotate-left',
                    label: 'PF2EBestiary.Bestiary.WindowControls.RefreshBestiary',
                    action: 'refreshBestiary'
                },
                {
                    icon: 'fa-solid fa-link-slash',
                    label: 'PF2EBestiary.Bestiary.WindowControls.ResetBestiary',
                    action: 'resetBestiary'
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

    // Could possible rerender headercontrols here?
    // _updateFrame(options) {
    //     super._updateFrame(options);
    // }

    _getHeaderControls() {
        return this.options.window.controls?.filter(control => {
            switch(control.action){
                case 'refreshBestiary':
                    return game.user.isGM;
                case 'resetBestiary':
                    return game.user.isGM;
            }
        }) || [];
    }

    getTabs() {
        const tabs = {
            statistics: { active: true, cssClass: '', group: 'primary', id: 'statistics', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Statistics") },
            spells: { active: false, cssClass: '', group: 'primary', id: 'spells', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Spells") },
            lore: { active: false, cssClass: '', group: 'primary', id: 'lore', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Lore") },
            // notes: { active: false, cssClass: '', group: 'primary', id: 'notes', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes") }
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

    prepareData(monster, playerLevel) {
        if(!monster) return monster;

        const contextLevel = playerLevel ?? monster.level.value;
        return {
            slug: monster.slug,
            id: monster.id,
            uuid: monster.uuid,
            level: monster.level,
            inTypes: monster.inTypes,
            traits: monster.traits,
            size: monster.size,
            name: monster.name,
            img: monster.img,
            abilities: { ...monster.abilities, values: monster.abilities.values.map(ability => ({ ...ability, category: getCategoryLabel(attributeTable, contextLevel, ability.mod, true) })) },
            ac: { ...monster.ac, category: getCategoryLabel(acTable, contextLevel, monster.ac.value) },
            hp: { ...monster.hp, category: getCategoryFromIntervals(hpTable, contextLevel, monster.hp.value) },
            speeds: monster.speeds,
            senses: { ...monster.senses, values: { ...monster.senses.values, perception: { ...monster.senses.values.perception, isPerception: true, category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.senses.values.perception.value) } } },
            attacks: monster.attacks,
            immunities: monster.immunities,
            resistances: monster.resistances,
            weaknesses: monster.weaknesses,
            actions: monster.actions,
            passives: monster.passives,
            saves: {
                fortitude: { ...monster.saves.fortitude, categories: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.saves.fortitude.value, true) },
                reflex: { ...monster.saves.reflex, categories: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.saves.reflex.value, true) },
                will: { ...monster.saves.will, categories: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.saves.will.value, true) },
            },
            spells: {
                ...monster.spells, 
                entries: Object.keys(monster.spells.entries).reduce((acc, entryKey) => {
                    const entry = monster.spells.entries[entryKey];
                    acc[entryKey] = {
                        ...entry,
                        id: entryKey,
                        dc: { ...entry.dc, category: getCategoryLabel(spellDCTable, contextLevel, entry.dc.value) },
                        attack: { ...entry.attack, category: getCategoryLabel(spellAttackTable, contextLevel, entry.attack.value) },
                        levels: Object.keys(entry.levels).reduce((acc, levelKey) => {
                            const spells = entry.levels[levelKey];
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

    prepareBestiary(bestiary){
        return {
            monster: Object.keys(bestiary.monster).reduce((acc, monsterKey) => {
                for(var type of bestiary.monster[monsterKey].inTypes){
                       acc[type][monsterKey] = bestiary.monster[monsterKey];
                }

                return acc;
            }, Object.keys(CONFIG.PF2E.creatureTypes).reduce((acc, type) => {  
                acc[type] = {};

                return acc;
            }, {})),
            npc: {}
        };
    }

    async _prepareContext(_options) {
        var context = await super._prepareContext(_options);

        context.tabs = this.getTabs();
        context.layout = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        context.showMonsterLevel = game.settings.get('pf2e-bestiary-tracking', 'show-monster-level');
        context.useTokenArt = game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        context.vagueDescriptions = { ... (await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions')) };

        context.user = game.user;
        context.vagueDescriptions.settings.playerBased = game.user.isGM ? false : context.vagueDescriptions.settings.playerBased;
        context.playerLevel = game.user.character ? game.user.character.system.details.level.value : null;
        context.search = this.search;

        context.bestiary = this.prepareBestiary(foundry.utils.deepClone(this.bestiary));
        context.selected = foundry.utils.deepClone(this.selected);
        await this.enrichTexts(context.selected);
        context.selected.monster = this.prepareData(context.selected.monster, context.vagueDescriptions.settings.playedBased ? context.playerLevel.value : null);

        context.openType = this.selected.type ? Object.keys(context.bestiary[this.selected.category][this.selected.type]).reduce((acc, key)=> {
            const monster = context.bestiary[this.selected.category][this.selected.type][key];
            const match = monster.name.value.toLowerCase().match(this.search.name.toLowerCase());
            const unrevealedMatch = game.i18n.localize('PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature').toLowerCase().match(this.search.name.toLowerCase());
            if(!this.search.name || ((monster.name.revealed || game.user.isGM) && match) || (!monster.name.revealed && !game.user.isGM && unrevealedMatch)) {
                acc[key] = monster;
            }

            return acc;
        }, {}) : null;

        return context;
    }

    static selectBookmark(_, button){
        this.selected.type = button.dataset.bookmark;
        this.selected.monster = null;
        this.search.name = '';

        this.render();
    }

    static selectMonster(_, button){
        this.selected.monster = this.bestiary[this.selected.category][button.dataset.monster];
        this.tabGroups = { primary: 'statistics' };
        this.render();
    }

    static async removeMonster(_, button){
        const confirmed = await Dialog.confirm({
            title: "Delete Monster",
            content: "Are you sure you want to remove the creature from the Bestiary?",
            yes: () => true,
            no: () => false,
        });

        if(!confirmed) return;

        delete this.bestiary[this.selected.category][button.dataset.monster];
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

        const newValue = !foundry.utils.getProperty(this.bestiary.monster[this.selected.monster.uuid], `${button.dataset.path}.revealed`);
        foundry.utils.setProperty(this.bestiary.monster[this.selected.monster.uuid], `${button.dataset.path}.revealed`, newValue);

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        this.render();

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });
    }

    static getUpdatedCreature(creature, data){
            creature.slug = data.slug;
            creature.level = { revealed: creature.level.revealed, value: data.level.value };
            creature.inTypes = data.inTypes;
            creature.traits = { ...data.traits, values: Object.keys(data.traits.values).reduce((acc, traitKey) => {
                acc[traitKey] = { ...data.traits.values[traitKey], revealed: creature.traits.values[traitKey] ? creature.traits.values[traitKey].revealed : false };
                return acc;
            }, {}) };
            creature.size = data.size;
            creature.name = { revealed: creature.name.revealed, value: data.name.value };
            creature.img = data.img;
            creature.abilities = { ...data.abilities, values: data.abilities.values.map(ability => { 
                const creatureAbility = creature.abilities.values.find(x => x.label === ability.label);
                return { ...ability, revealed: creatureAbility ? creatureAbility.revealed : false };   
            }) };
            creature.ac = { ...data.ac, revealed: creature.ac.revealed };
            creature.hp = { ...data.hp, revealed: creature.hp.revealed };
            creature.speeds = { ...data.speeds, values: Object.keys(data.speeds.values).reduce((acc, speedKey) => {
                acc[speedKey] = { ...data.speeds.values[speedKey], revealed: creature.speeds.values[speedKey] ? creature.speeds.values[speedKey].revealed : false }
                return acc;
            }, {}) };
            
            creature.senses = { ...data.senses, values: Object.keys(data.senses.values).reduce((acc, senseKey) => {
                acc[senseKey] = { ...data.senses.values[senseKey], revealed: creature.senses.values[senseKey] ? creature.senses.values[senseKey].revealed : false }
                return acc;
            }, {}) }
            creature.attacks = {  
                ...data.attacks,
                values: Object.keys(data.attacks.values).reduce((acc, attackKey) => {
                    const creatureAttack = creature.attacks.values[attackKey];
                    acc[attackKey] = { 
                        ...data.attacks.values[attackKey], 
                        revealed: creatureAttack ? creatureAttack.revealed : false,
                        variants: {
                            ...data.attacks.values[attackKey].variants,
                            revealed: creatureAttack ? creatureAttack.variants.revealed : false,
                        }
                    }

                    return acc;
                }, {}),
            };
            creature.immunities = {
                ...data.immunities,
                values: Object.keys(data.immunities.values).reduce((acc, immunityKey) => {
                    acc[immunityKey] = { ...data.immunities.values[immunityKey], revealed: creature.immunities.values[immunityKey] ? creature.immunities.values[immunityKey].revealed : false }
                    return acc;
                }, {})
            };
            creature.resistances = {
                ...data.resistances,
                values: Object.keys(data.resistances.values).reduce((acc, resistanceKey) => {
                    acc[resistanceKey] = { ...data.resistances.values[resistanceKey], revealed: creature.resistances.values[resistanceKey] ? creature.resistances.values[resistanceKey].revealed : false }
                    return acc;
                }, {})
            };
            creature.weaknesses = {
                ...data.weaknesses,
                values: Object.keys(data.weaknesses.values).reduce((acc, weaknessKey) => {
                    acc[weaknessKey] = { ...data.weaknesses.values[weaknessKey], revealed: creature.weaknesses.values[weaknessKey] ? creature.weaknesses.values[weaknessKey].revealed : false }
                    return acc;
                }, {})
            };

            creature.actions = {
                ...data.actions,
                values: Object.keys(data.actions.values).reduce((acc, actionKey) => {
                    acc[actionKey] = { ...data.actions.values[actionKey], revealed: creature.actions.values[actionKey] ? creature.actions.values[actionKey].revealed : false };
                    return acc;
                }, {})
            };
            creature.passives = {
                ...data.passive,
                values: Object.keys(data.passives.values).reduce((acc, passiveKey) => {
                    acc[passiveKey] = { ...data.passives.values[passiveKey], revealed: creature.passives.values[passiveKey] ? creature.passives.values[passiveKey].revealed : false };
                    return acc;
                }, {})
            };
            creature.saves = {
                fortitude: { ...data.saves.fortitude, revealed: creature.saves.fortitude.revealed },
                reflex: { ...data.saves.reflex, revealed: creature.saves.reflex.revealed },
                will: { ...data.saves.will, revealed: creature.saves.will.revealed }
            };
            creature.spells = {
                ...data.spells,
                entries: Object.keys(data.spells.entries).reduce((acc, entryKey) => {
                    const creatureEntry = creature.spells.entries[entryKey];
                    acc[entryKey] = {
                        ...data.spells.entries[entryKey],
                        dc: { ...data.spells.entries[entryKey].dc, revealed: creatureEntry ? creatureEntry.dc.revealed : false },
                        attack: { ...data.spells.entries[entryKey].attack, revealed: creatureEntry ? creatureEntry.attack.revealed : false },
                        revealed: creatureEntry ? creatureEntry.revealed : false,
                        levels: Object.keys(data.spells.entries[entryKey].levels).reduce((acc, levelKey) => {
                            const creatureLevel = creatureEntry ? creatureEntry.levels[levelKey] : null;
                            acc[levelKey] = Object.keys(data.spells.entries[entryKey].levels[levelKey]).reduce((acc, spellKey) => {
                                acc[spellKey] = {
                                    ...data.spells.entries[entryKey].levels[levelKey][spellKey],
                                    revealed: creatureLevel && creatureLevel[spellKey] ? creatureLevel[spellKey].revealed : false, 
                                };

                                return acc;
                            }, {});

                            return acc;
                        }, {})
                    }

                    return acc;
                }, {})
            }
            
            creature.notes = Object.keys(data.notes).reduce((acc, noteKey) => {
                acc[noteKey] = { ...data.notes[noteKey], revealed: creature.notes[noteKey].revealed };
                return acc;
            }, {})

        return creature;
    }

    static async refreshBestiary(){
        if(!game.user.isGM) return;


        for(var monsterKey in this.bestiary.monster){
            const actor = await fromUuid(monsterKey);

            if(actor){
                const data = await PF2EBestiary.getMonsterData(actor);
                const updatedData = PF2EBestiary.getUpdatedCreature(this.bestiary.monster[monsterKey], data);
                this.bestiary[monsterKey] = updatedData;
            } 
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    async refreshCreature(monsterUuid){
        const actor = await fromUuid(monsterUuid);
                
        if(!actor) return;

        const data = await PF2EBestiary.getMonsterData(actor);
        this.bestiary.monster[monsterUuid] =  PF2EBestiary.getUpdatedCreature(this.bestiary.monster[monsterUuid], data);

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static async resetBestiary(){
        if(!game.user.isGM) {
            ui.notifications.info(game.i18n.localize("PF2EBestiary.Bestiary.Info.GMOnly"));
        }

        const confirmed = await Dialog.confirm({
            title: "Reset Bestiary",
            content: "Are you sure you want to reset all the bestiary data?",
            yes: () => true,
            no: () => false,
        });

        if(confirmed){
            this.selected = { category: 'monster', type: null, monster: null, abilities: [] };
            this.bestiary = { monster: {}, npc: {} };

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

            const newValues = foundry.utils.getProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${button.dataset.path}.values`);
            newValues[value.slug] = value.value;
            foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${button.dataset.path}.values`, newValues);
            
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

    static async setCategoriesLayout(_, button){
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-layout', { categories: { layout: Number.parseInt(button.dataset.option) } });
        this.render();
    }

    async obscureData(event){
        if(!game.user.isGM || !event.currentTarget.dataset.name) return;

        const setValue = async (value) => {
            if(value){
                foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${event.currentTarget.dataset.path}.custom`, value);

                await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
                await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                    action: socketEvent.UpdateBestiary,
                    data: { },
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
                const newValues = foundry.utils.getProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], deletePath);
                foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], deletePath, Object.keys(newValues).reduce((acc,key) => {
                    if(key !== pathSplit[pathSplit.length-1]){
                        acc[key] = newValues[key];
                    }

                    return acc;
                }, {}));
            }
            else {
                foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${event.currentTarget.dataset.path}.custom`, null);
            }
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
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
        const monster = await PF2EBestiary.getMonsterData(item.token.document ? item.token.document.baseActor : item.token.baseActor);
        if (!monster) return;

        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        // We do not currently refresh already present creatures in the Bestiary.
        if(bestiary.monster[monster.uuid]) return;

        bestiary.monster[monster.uuid] = monster;
        
        const doubleClickOpenActivated = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
        if(doubleClickOpenActivated){
            const ownership = item.ownership.default > 1 ? item.ownership.default : 1;
            const baseItem = await fromUuid(monster.uuid);
            
            await item.update({ "ownership.default": ownership });
            await baseItem.update({ "ownership.default": ownership });
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
        const traits = item.system.traits.value.reduce((acc, x) => {
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
        const monster = {
            slug: slugify(item.name),
            id: item.id,
            uuid: item.uuid,
            level: { revealed: false, value: item.system.details.level.value },
            inTypes: types.map(x => x.key),
            traits: traits,
            size: getCreatureSize(item.system.traits.size.value),
            name: { revealed: false, value: item.name },
            img: useTokenArt ? item.prototypeToken.texture.src : item.img,
            abilities: { 
                revealed: 0, 
                values: Object.keys(item.system.abilities).map(x => { 
                    const ability = item.system.abilities[x];
                    return { revealed: false, label: x.capitalize(), mod: ability.mod, value: ability.mod >= 0 ? `+${ability.mod}` : `${ability.mod}`, }; 
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
                fortitude: { value: `${item.system.saves.fortitude.value >= 0 ? '+' : '-'}${item.system.saves.fortitude.value}`, revealed: false },
                reflex: { value: `${item.system.saves.reflex.value >= 0 ? '+' : '-'}${item.system.saves.reflex.value}`, revealed: false },
                will: { value: `${item.system.saves.will.value >= 0 ? '+' : '-'}${item.system.saves.will.value}`, revealed: false },
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
        const baseItem = await fromUuid(data.uuid);

        if(baseItem?.type === 'character'){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedCharacterType"));
            return;
        }

        if(!baseItem || baseItem.type !== 'npc'){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedType"));
            return;
        }

        const item = baseItem.pack ? await Actor.create(baseItem.toObject()) : baseItem;

        // Creature already in Bestiary.
        if(this.bestiary.monster[item.uuid]){
            await this.refreshCreature(item.uuid);
            return;
        }

        const monster = await PF2EBestiary.getMonsterData(item);
        const updatedBestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        updatedBestiary.monster[item.uuid] = monster;

        const autoSelect = await game.settings.get('pf2e-bestiary-tracking', 'automatically-open-monster'); 
        this.selected = { ...this.selected, category: 'monster', type: autoSelect ? monster.inTypes[0] : this.selected.type, monster: autoSelect ? monster : this.selected.monster ? updatedBestiary.monster[this.selected.monster.uuid] : null };
        
        const doubleClickOpenActivated = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
        if(doubleClickOpenActivated){
            const ownership = item.ownership.default > 1 ? item.ownership.default : 1;
            await item.update({ "ownership.default": ownership });

            const baseItem = await fromUuid(item.uuid);
            await baseItem.update({ "ownership.default": ownership });
        }
        
        this.bestiary = updatedBestiary;
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', updatedBestiary);

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        this.render();
    }

    onBestiaryUpdate = async () => {
        this.bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        
        if(this.selected.monster?.uuid){
            this.selected.monster = this.bestiary[this.selected.category][this.selected.monster.uuid];
        }

        this.render(true);
    };

    close = async (options) => {
        Hooks.off(socketEvent.UpdateBestiary, this.onBestiaryUpdate);

        return super.close(options);
    }
}