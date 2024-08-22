
import { getCreatureSize, getCreaturesTypes, getExpandedCreatureTypes, getIWRString, getMultiplesString, slugify } from "../scripts/helpers.js";
import { socketEvent } from "../scripts/socket.js";
import { acTable, attackTable, attributeTable, damageTable, hpTable, savingThrowPerceptionTable, skillTable, spellAttackTable, spellDCTable } from "../scripts/statisticsData.js";
import { getCategoryFromIntervals, getCategoryLabel, getCategoryRange, getMixedCategoryLabel, getRollAverage, getWeaknessCategoryClass } from "../scripts/statisticsHelper.js";
import PF2EBestiarySavesHandler from "./savesHandler.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PF2EBestiary extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({category = 'monster', monsterUuid = null} = {category: 'monster', monsterUuid: null}){
        super({});

        this.bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        const monsterCreatureTypes = this.bestiary[category][monsterUuid] ? getCreaturesTypes(this.bestiary[category][monsterUuid].system.traits.value).map(x => x.key): [];
        this.selected = {
            category,
            type: monsterCreatureTypes.length > 0 ? monsterCreatureTypes[0] : null,
            monster: category && monsterUuid ? this.bestiary[category][monsterUuid] : null,
            abilities: [],
        };

        // Filter 0 = Alphebetic, 1 = by level
        // Direction 0 = Ascending, 1 = Descending
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
            handleSaveSlots: this.handleSaveSlots,
            resetBestiary: this.resetBestiary,
            clearSearch: this.clearSearch,
            toggleFilterDirection: this.toggleFilterDirection,
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
                    icon: 'fa-solid fa-floppy-disk', //saveDataToFile(JSON.stringify(data, null, 2), "text/json", `${filename}.json`);
                    label: 'PF2EBestiary.Bestiary.WindowControls.SaveSlots',
                    action: 'handleSaveSlots',
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
                default:
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
        for(var actionKey of Object.keys(selected.monster.actions)){
            const description = await TextEditor.enrichHTML(selected.monster.actions[actionKey].description);
            newActions[actionKey] = { ...selected.monster.actions[actionKey], description };
        }

        const newPassives = {};
        for(var passiveKey of Object.keys(selected.monster.passives)){
            const description = await TextEditor.enrichHTML(selected.monster.passives[passiveKey].description);
            newPassives[passiveKey] = { ...selected.monster.passives[passiveKey], description };
        }

        for(var entryKey in selected.monster.spells.entries){
            const entry = selected.monster.spells.entries[entryKey]
            for(var levelKey in entry.levels){
                for(var spellKey in entry.levels[levelKey].spells){
                    const spell = entry.levels[levelKey].spells[spellKey];
                    spell.description = { ...spell.description, value: await TextEditor.enrichHTML(spell.description.value) };
                }
            }
        }

        selected.monster.notes.public.text = await TextEditor.enrichHTML(selected.monster.notes.public.text);
        selected.monster.notes.private.text = await TextEditor.enrichHTML(selected.monster.notes.private.text);
        selected.monster.actions = newActions;
        selected.monster.passives = newPassives;
    }

    async prepareData(selected, playerLevel, vagueDescriptions) {

        const { category, type, monster } = selected;
        if(!monster) return { category, type, monster };

        const useTokenArt = await game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        const contextLevel = playerLevel ?? monster.system.details.level.value;

        var updatedType = type;
        var isUnknown = false;
        if(!game.user.isGM)
        {
            // Improve this.
            const types = getCreaturesTypes(monster.system.traits.value);

            const revealedCreatureTraits = types.filter(x => x.revealed);
            isUnknown = revealedCreatureTraits.length === 0;
            if(type){
                if(isUnknown){
                    updatedType = 'unknown';
                }
                else if(!revealedCreatureTraits.includes(type)){
                    updatedType = revealedCreatureTraits[0].key;
                }
            }
        }

        const actions = { };
        const passives = { };
        const actionKeys = Object.keys(monster.items);
        for(var actionKey of actionKeys) {
            const action = monster.items[actionKey]
            if(action.type === 'action'){
                if( ['action', 'reaction'].includes(action.system.actionType.value)){
                    actions[action._id] = {
                        ...action,
                        // actions: action.system.actions.value,
                        description: action.system.description.value,
                    };
                }
                else {
                    passives[action._id] = {
                        ...action,
                        description: action.system.description.value,
                    };
                }
            }
        };

        //  Join all iterations over item.items in a method?
        const spellcastingEntries = {};
        const spellKeys = Object.keys(monster.items);
        for(var spellKey of spellKeys){
            const subItem = monster.items[spellKey];
            if(subItem.type !== 'spellcastingEntry') {
                continue;
            }

            var levels = [];
            spellKeys.forEach(key => {
                const spell = monster.items[key];
                if(spell.type === 'spell' && spell.system.location.value === subItem._id){
                    const levelValue = spell.system.traits.value.includes("cantrip") ? 'Cantrips' : spell.system.level.value;
                    const label = levelValue === 'Cantrips' ? levelValue : levelValue === 1 ? '1st Rank' : levelValue === 2 ? '2nd Rank' : levelValue === 3 ? '3rd Rank' : `${levelValue}th Rank`;
                    
                    var level = levels.find(x => x.level === levelValue);
                    if(!level) {
                        level = { label: label, level: levelValue, spells: [] };
                        levels.push(level);
                    }

                    level.spells.push({
                        ...spell,
                        id: spell._id,
                        actions: spell.actionGlyph,
                        defense: spell.system.defense?.save?.statistic ? `${spell.system.defense.save.basic ? 'basic ' : ''} ${spell.system.defense.save.statistic}` : null,
                        range: spell.system.range.value,
                        traits: spell.system.traits,
                        description: {
                            gm: spell.system.description.gm,
                            value: spell.system.description.value,
                        }
                    });
                }
            });
           
            levels = levels.sort((a, b) => {
                const val1 = a.level;
                const val2 = b.level;
                if(val1 && val2 === 'Cantrips') return 0;
                else if(val1 === 'Cantrips') return -1;
                else if(val2 === 'Cantrips') return 1;
                else return val1 - val2;
            });

            spellcastingEntries[subItem._id] = {
                ...subItem,
                dc: { ...subItem.system.spelldc.dc, category: getCategoryLabel(spellDCTable, contextLevel, subItem.system.spelldc.dc.value) },
                attack: { ...subItem.system.spelldc.value, category: getCategoryLabel(spellAttackTable, contextLevel, subItem.system.spelldc.value.value) },
                levels: levels.map(x => ({ ...x, revealed: x.spells.some(spell => spell.revealed) })),
            };
        }
        const spellsFake = Object.keys(spellcastingEntries).find(x => x === 'Spell-None');

        return {
            category: category,
            type: updatedType,
            monster: {
                id: monster.id,
                uuid: monster.uuid,
                img: useTokenArt ? monster.prototypeToken.texture.src : monster.img,
                name: monster.name,
                level: monster.system.details.level,
                ac: { ...monster.system.attributes.ac, category: getCategoryLabel(acTable, contextLevel, monster.system.attributes.ac.value) },
                hp: { ...monster.system.attributes.hp, category: getCategoryFromIntervals(hpTable, contextLevel, monster.system.attributes.hp.value) },
                skills: Object.keys(monster.system.skills).reduce((acc, skillKey) => {
                    const skill = monster.system.skills[skillKey];
                    if(skill.base > 0){
                        acc[skillKey] = { ...skill, value: `+${skill.base}`, category: getMixedCategoryLabel(skillTable, contextLevel, skill.totalModifier) };
                    }
                    
                    return acc;
                }, {}),
                immunities: Object.keys(monster.system.attributes.immunities).length > 0  ? Object.keys(monster.system.attributes.immunities).reduce((acc, immunityKey) => {
                    const immunity = monster.system.attributes.immunities[immunityKey];
                    acc.values[immunityKey] = { ...immunity, value: immunity.fake || immunity.empty ? immunity.type : game.i18n.localize(immunity.typeLabels[immunity.type]) };

                    return acc;
                }, { values: {} }) : { values: { none: { revealed: false, value: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } } },
                resistances: Object.keys(monster.system.attributes.resistances).length > 0  ? Object.keys(monster.system.attributes.resistances).reduce((acc, resistanceKey) => {
                    const resistance = monster.system.attributes.resistances[resistanceKey];
                    const label = !resistance.empty && !resistance.fake ? game.i18n.localize(resistance.typeLabels[resistance.type]) : null;
                    acc.values[resistanceKey] = { ...resistance, value: resistance.fake || resistance.empty ? resistance.type : `${label} ${resistance.value}`, class: getWeaknessCategoryClass(contextLevel, resistance.value), category: label };

                    return acc;
                }, { values: {} }) : { },
                weaknesses: Object.keys(monster.system.attributes.weaknesses).length > 0  ? Object.keys(monster.system.attributes.weaknesses).reduce((acc, weaknessKey) => {
                    const weakness = monster.system.attributes.weaknesses[weaknessKey];
                    const label = !weakness.empty && !weakness.fake ? game.i18n.localize(weakness.typeLabels[weakness.type]): null;
                    acc.values[weaknessKey] = { ...weakness, value: weakness.fake || weakness.empty ? weakness.type : `${label} ${weakness.value}`, class: getWeaknessCategoryClass(contextLevel, weakness.value), category: label };

                    return acc;
                }, { values: {} }) : { values: { none: { revealed: false, value: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } } },
                saves: {
                    fortitude: { ...monster.system.saves.fortitude, value: `${monster.system.saves.fortitude.value >= 0 ? '+' : '-'}${monster.system.saves.fortitude.value}`, revealed: monster.system.saves.fortitude.revealed, category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.system.saves.fortitude.value, true) },
                    reflex: { ...monster.system.saves.reflex, value: `${monster.system.saves.reflex.value >= 0 ? '+' : '-'}${monster.system.saves.reflex.value}`, revealed: monster.system.saves.reflex.revealed, category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.system.saves.reflex.value, true) },
                    will: { ...monster.system.saves.will, value: `${monster.system.saves.will.value >= 0 ? '+' : '-'}${monster.system.saves.will.value}`, revealed: monster.system.saves.will.revealed, category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.system.saves.will.value, true) },
                },
                speeds: {
                    values: {
                        ['speed']: { revealed: monster.system.attributes.speed.revealed, name: 'Land', value: monster.system.attributes.speed.value },
                        ...monster.system.attributes.speed.otherSpeeds.reduce((acc, speed, index) => { 
                            acc[`speed.otherSpeeds.${index}`] = {
                                revealed: speed.revealed,
                                name: speed.label,
                                value: speed.value
                            };
        
                            return acc;
                        }, {})
                    }
                },
                inTypes: monster.system.types,
                size: getCreatureSize(monster.system.traits.size.value),
                traits: Object.keys(monster.system.traits.value).reduce((acc, traitKey) => {
                    if(Object.keys(CONFIG.PF2E.creatureTraits).includes(traitKey)){
                        acc.values[traitKey] = { ...monster.system.traits.value[traitKey], value: CONFIG.PF2E.creatureTraits[traitKey] };
                    }

                    return acc;
                }, { values: {} }),
                abilities: { 
                    values: Object.keys(monster.system.abilities).reduce((acc, x) => { 
                        const ability = monster.system.abilities[x];
                        acc[x] =  { ...ability, label: x.capitalize(), mod: ability.mod, value: ability.mod >= 0 ? `+${ability.mod}` : `${ability.mod}`, category: getCategoryLabel(attributeTable, contextLevel, ability.mod, true) };
                        return acc; 
                    }, {}),
                },
                senses: {
                    perception: {
                        ...monster.system.perception,
                        category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, monster.system.perception.value),
                        label: game.i18n.localize("PF2EBestiary.Miscellaneous.Perception"),
                        value: monster.system.perception.value,
                        isPerception: true,
                    },
                    ...monster.system.perception.senses.reduce((acc, sense, index) => {
                        acc[`senses.${index}`] = sense;
                        return acc;
                    }, {}),
                    ...(monster.system.perception.details.value ? { details: { revealed: monster.system.perception.details.revealed, label: monster.system.perception.details.value }} : {}),
                },
                languages: { values: { ...monster.system.details.languages.value } },
                attacks: Object.keys(monster.system.actions).reduce((acc, actionKey) => {
                    const action = monster.system.actions[actionKey];
                    const damageInstances = [];
                    var damageLabel = '';
                    for(var damageKey of Object.keys(action.item.system.damageRolls)){
                        const damage = action.item.system.damageRolls[damageKey];
                        damageLabel = damageLabel.concat(`${damageLabel ? ' + ' : ''}${damage.damage} ${damage.damageType}`);
                        const damageRollHelper = new Roll(damage.damage);
                        
                        damageInstances.push({ label: damage.damage, average: getRollAverage(damageRollHelper.terms), type: damage.damageType, quality: damage.category  });
                    }

                    const damage = {
                        instances: damageInstances,
                        label: damageLabel,
                        average: damageInstances.reduce((acc, instance) => acc+instance.average, 0),
                    };
                    const attackParts = vagueDescriptions.properties.attacks ? { category: getCategoryLabel(attackTable, contextLevel, action.totalModifier) } : {  };
                    const damageParts = vagueDescriptions.properties.damage ? { 
                        damage: { ...damage, 
                            instances: damage.instances.map(instance => ({ ...instance, category: getCategoryLabel(damageTable, contextLevel, instance.average), value: instance.average }))
                        } 
                    } : { damage: { instances: damage.instances.map(instance => ({ ...instance, value: instance.label })) } };
                    acc[action.item._id] = { 
                        ...action,
                        range: action.weapon.system.traits.value.find(x => x.startsWith('range-increment') || x.startsWith('range')) ? 'Ranged' : 'Melee', 
                        variants: action.variants.reduce((acc, variant) => {
                            acc.values[slugify(variant.label)] = variant.label;
        
                            return acc;
                        }, { revealed: false, values: {} }),
                        traits: action.traits.map(trait => ({
                            label: trait.label,
                            description: trait.description,
                        })),
                        value: `${action.totalModifier >= 0 ? '+' : '-'} ${action.totalModifier}`, 
                        ...attackParts, 
                        ...damageParts 
                    };

                    return acc;
                }, { }),
                actions,
                passives,
                spells: {
                    fake: spellsFake ? { revealed: spellcastingEntries[spellsFake].revealed } : null,
                    entries: spellcastingEntries,
                },
                notes: {
                    public: monster.system.details.publicNotes,
                    private: monster.system.details.privateNotes,
                }
            }
        };
    }

    prepareBestiary(bestiary){
        return {
            monster: Object.keys(bestiary.monster).reduce((acc, monsterKey) => {
                const monster = bestiary.monster[monsterKey];

                const types = getCreaturesTypes(monster.system.traits.value);

                var usedTypes = types.map(x => x.key);
                if(!game.user.isGM){
                    usedTypes = types.filter(x => x.revealed).map(x => x.key);
                }
                
                if(usedTypes.length === 0) usedTypes = ['unknown'];

                for(var type of usedTypes){
                    acc[type].values[monsterKey] = bestiary.monster[monsterKey];
                }

                return acc;
            }, getExpandedCreatureTypes()),
            npc: {}
        };
    }

    async _prepareContext(_options) {
        var context = await super._prepareContext(_options);

        context.tabs = this.getTabs();
        context.layout = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        context.optionalFields = game.settings.get('pf2e-bestiary-tracking', 'optional-fields');
        context.useTokenArt = game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        context.contrastRevealedState = game.settings.get('pf2e-bestiary-tracking', 'contrast-revealed-state');
        context.vagueDescriptions = foundry.utils.deepClone(await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions'));

        context.user = game.user;
        context.vagueDescriptions.settings.playerBased = game.user.isGM ? false : context.vagueDescriptions.settings.playerBased;
        context.playerLevel = game.user.character ? game.user.character.system.details.level.value : null;
        context.search = this.search;

        context.selected = foundry.utils.deepClone(this.selected);
        context.selected = await this.prepareData(context.selected, context.vagueDescriptions.settings.playerBased ? context.playerLevel : null, context.vagueDescriptions);
        await this.enrichTexts(context.selected);
        context.bestiary = this.prepareBestiary(foundry.utils.deepClone(this.bestiary));

        context.openType = (context.selected.type ? Object.keys(context.bestiary[context.selected.category][context.selected.type].values).reduce((acc, monsterKey) => { 
            const monster = context.bestiary[this.selected.category][context.selected.type].values[monsterKey];
            monster.img = context.useTokenArt ? monster.prototypeToken.texture.src : monster.img;
            const match = monster.name.value.toLowerCase().match(this.search.name.toLowerCase());
            const unrevealedMatch = game.i18n.localize('PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature').toLowerCase().match(this.search.name.toLowerCase());
            if(!this.search.name || ((monster.name.revealed || game.user.isGM) && match) || (!monster.name.revealed && !game.user.isGM && unrevealedMatch)) {
                acc.push(monster);
            }

            return acc;
        }, []).sort((a, b) => {
            if(context.layout.categories.filter.type === 0){
                var comparison = a.name.value < b.name.value ? -1 : a.name.value > b.name.value ? 1 : 0;
                if(!game.user.isGM){
                    comparison = 
                    a.name.revealed && b.name.revealed ? (a.name.value < b.name.value ? -1 : a.name.value > b.name.value ? 1 : 0) :
                    a.name.revealed && !b.name.revealed ? 1 :
                    !a.name.revealed && b.name.revealed ? -1 : 0;
                }

                return context.layout.categories.filter.direction === 0 ? comparison : (comparison * - 1);
            } else {
                var comparison = a.level.value - b.level.value;
                if(!game.user.isGM){
                    comparison = 
                    a.level.revealed && b.level.revealed ?  a.level.value - b.level.value : 
                    a.level.revealed && !b.level.revealed ? 1 :
                    !a.level.revealed && b.level.revealed ? -1 : 0;
                }

                return context.layout.categories.filter.direction === 0 ? comparison : (comparison * -1); 
            }
        }) : null);

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

    static returnButton(_, button){
        this.selected = this.selected.monster ? { ...this.selected, type: button.dataset.contextType, monster: null } : this.selected.type ? { category: 'monster' } : this.selected;
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

        const newValue = !foundry.utils.getProperty(this.bestiary.monster[this.selected.monster.uuid], `${button.dataset.path}.${button.dataset.key ?? 'revealed'}`);
        foundry.utils.setProperty(this.bestiary.monster[this.selected.monster.uuid], `${button.dataset.path}.${button.dataset.key ?? 'revealed'}`, newValue);

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        this.render();

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });
    }

    static getUpdatedCreature(creature, data){
        data.name = { ...data.name, revealed: creature.name.revealed, custom: creature.name.custom };
        data.system.details.level = { ...data.system.details.level, revealed: creature.system.details.level.revealed, custom: creature.system.details.level.custom };
        data.system.attributes.ac = { ...data.system.attributes.ac, revealed: creature.system.attributes.ac.revealed, custom: creature.system.attributes.ac.custom};
        data.system.attributes.hp = { ...data.system.attributes.hp, revealed: creature.system.attributes.hp.revealed, custom: creature.system.attributes.hp.custom};

        Object.keys(data.system.attributes.immunities).forEach(immunityKey => {
            const oldImmunityKey = Object.keys(creature.system.attributes.immunities).find(x => x === immunityKey);
            if(oldImmunityKey) data.system.attributes.immunities[immunityKey].revealed = creature.system.attributes.immunities[oldImmunityKey].revealed;
        });
        Object.keys(creature.system.attributes.immunities).forEach(immunityKey => {
            const immunity = creature.system.attributes.immunities[immunityKey];
            if(immunity.fake) data.system.attributes.immunities[immunityKey] = immunity;
        });

        Object.keys(data.system.attributes.weaknesses).forEach(weaknessKey => {
            const oldWeaknessKey = Object.keys(creature.system.attributes.weaknesses).find(x => x === weaknessKey);
            if(oldWeaknessKey) data.system.attributes.weaknesses[weaknessKey].revealed = creature.system.attributes.weaknesses[oldWeaknessKey].revealed;
        });
        Object.keys(creature.system.attributes.weaknesses).forEach(weaknessKey => {
            const weakness = creature.system.attributes.weaknesses[weaknessKey];
            if(weakness.fake) data.system.attributes.weaknesses[weaknessKey] = weakness;
        });

        Object.keys(data.system.attributes.resistances).forEach(resistanceKey => {
            const oldResistanceKey = Object.keys(creature.system.attributes.resistances).find(x => x === resistanceKey);
            if(oldResistanceKey) data.system.attributes.resistances[resistanceKey].revealed = creature.system.attributes.resistances[oldResistanceKey].revealed;
        });
        Object.keys(creature.system.attributes.resistances).forEach(resistanceKey => {
            const resistance = creature.system.attributes.resistances[resistanceKey];
            if(resistance.fake) data.system.attributes.resistances[resistanceKey] = resistance;
        });

        data.system.saves.fortitude = { ...data.system.saves.fortitude, revealed: creature.system.saves.fortitude.revealed, custom: creature.system.saves.fortitude.custom };
        data.system.saves.reflex = { ...data.system.saves.reflex, revealed: creature.system.saves.reflex.revealed, custom: creature.system.saves.reflex.custom };
        data.system.saves.will = { ...data.system.saves.will, revealed: creature.system.saves.will.revealed, custom: creature.system.saves.will.custom };
        
        data.system.attributes.speed = { ...data.system.attributes.speed, revealed: creature.system.attributes.speed.revealed };
        data.system.attributes.speed.otherSpeeds.forEach(speed => speed.revealed = creature.system.attributes.speed.otherSpeeds.find(x => speed.label === x.label)?.revealed);
        
        Object.keys(data.system.traits.value).forEach(traitKey => data.system.traits.value[traitKey].revealed = creature.system.traits.value[traitKey]?.revealed);
        Object.keys(data.system.abilities).forEach(abilityKey => {
            const oldAbility = creature.system.abilities[abilityKey];
            data.system.abilities[abilityKey] = { ...data.system.abilities[abilityKey], revealed: oldAbility.revealed, custom: oldAbility.custom };
        });
        
        data.system.perception = { ...data.system.perception, revealed: creature.system.perception.revealed, custom: creature.system.perception.custom };
        data.system.perception.senses.forEach(sense => sense.revealed = creature.system.perception.senses.find(x => x.value === sense.value)?.revealed);
        data.system.perception.senses.push(...creature.system.perception.senses.filter(x => x.fake));
        data.system.perception.details.revealed = creature.system.perception.details.revealed;
        
        data.system.details.languages.details.revealed = creature.system.details.languages.details.revealed;
        data.system.details.languages.value.forEach(lang => lang.revealed = creature.system.details.languages.value.find(x => x.value === lang.value)?.revealed);

        Object.keys(data.system.actions).forEach(actionKey => {
            const creatureAction = Object.values(creature.system.actions).find(x => x.weapon._id === actionKey);
            if(creatureAction){
                const action = data.system.actions[actionKey];
                action.revealed = creatureAction.revealed;
                action.damageStatsRevealed = creatureAction.damageStatsRevealed;
            }
        });
        Object.keys(creature.system.actions).forEach(actionKey => {
            const action = creature.system.actions[actionKey];
            if(action.fake) data.system.actions[action.item._id] = action;
        });
        
        Object.keys(data.items).forEach(itemKey => {
            const creatureItem = Object.values(creature.items).find(x => x._id === itemKey);
            if(creatureItem){
                const item = data.items[itemKey];
                item.revealed = creatureItem.revealed;

                if(item.type === 'spellcastingEntry'){
                    item.system.spelldc.dc.revealed = creatureItem.system.spelldc.dc.revealed;
                    item.system.spelldc.value.revealed = creatureItem.system.spelldc.value.revealed;
                }
            }
        });
        Object.keys(creature.items).forEach(itemKey => {
            const item = creature.items[itemKey];
            if(item.fake){
                data.items[itemKey] = item;
            }
        });

        data.system.details.publicNotes.revealed = creature.system.details.publicNotes.revealed;
        data.system.details.privateNotes.revealed = creature.system.details.privateNotes.revealed;

        return data;
    }

    static async refreshBestiary(){
        if(!game.user.isGM) return;


        for(var monsterKey in this.bestiary.monster){
            const actor = await fromUuid(monsterKey);

            if(actor){
                const data = await PF2EBestiary.getMonsterData(actor);
                const updatedData = PF2EBestiary.getUpdatedCreature(this.bestiary.monster[monsterKey], data);
                this.bestiary.monster[monsterKey] = updatedData;
            } 
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static async handleSaveSlots(){
        if(!game.user.isGM) return;

        await new PF2EBestiarySavesHandler().render(true);
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
            this.bestiary = { ...this.bestiary, monster: {}, npc: {} };

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

    static async toggleFilterDirection(){
        const settings = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-layout', { ...settings, categories: { 
             ...settings.categories,
             filter: {
                ...settings.categories.filter,
                direction: settings.categories.filter.direction === 0 ? 1 : 0,
             }
        }});
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
                                    revealed: false, type: elements.misinformation.value, fake: true,
                                },
                            },
                            errors: []
                        }
                    }
                }
            case 'Languages':
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

                        const range = rangeOptions[Number.parseInt(elements.range.value)]
                        return {
                            value: {
                                slug: slugify(elements.misinformation.value),
                                value: {
                                    revealed: false, 
                                    label: elements.misinformation.value, 
                                    fake: true,
                                    item: {
                                        system: {
                                            damageRolls: {}
                                        },
                                        _id: slugify(elements.misinformation.value),
                                    },
                                    weapon: {
                                        system: {
                                            traits: {
                                                value: []
                                            }
                                        },
                                    },
                                    variants: [],
                                    traits: [],
                                    totalModifier: 0,
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

                        const id = `FakeUuid-${name}-${foundry.utils.randomID()}`;
                        const base = {
                            slug: id,
                            value: {
                                revealed: false, 
                                _id: id, 
                                name: elements.misinformation.value, 
                               
                                type: 'action',
                                system: {
                                    description: { value: elements.description?.value } 
                                },
                                fake: true,
                            },
                        };

                        if(name === 'Action'){
                            base.value.actions = actionOptions[Number.parseInt(elements.actions.value)]?.value;
                            base.value.system.actionType = { value: base.value.actions === 'R' ? 'reaction' : 'action' };
                        }
                        else {
                            base.value.system.actionType = { value: 'passive' };
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

            const newValues = foundry.utils.getProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${button.dataset.path}`);
            if(Array.isArray(newValues)) newValues.push(value.value);
            else newValues[value.slug] = value.value;
            foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${button.dataset.path}`, newValues);
            
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
        const settings = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-layout', { ...settings, categories: {
            ...settings.categories,
            layout: Number.parseInt(button.dataset.option) 
        } });
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

        if(event.currentTarget.dataset.fake){
            const pathSplit = event.currentTarget.dataset.path.split('.');
            const deletePath = pathSplit.slice(0, pathSplit.length-1).join('.');
            const newValues = foundry.utils.getProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], deletePath);
            if(Array.isArray(newValues)){
                foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], deletePath, Object.keys(newValues).reduce((acc,key) => {
                    if(key !== pathSplit[pathSplit.length-1]){
                        acc.push(newValues[key]);
                    }
    
                    return acc;
                }, []));
            }
            else {
                foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], deletePath, Object.keys(newValues).reduce((acc,key) => {
                    if(key !== pathSplit[pathSplit.length-1]){
                        acc[key] = newValues[key];
                    }
    
                    return acc;
                }, {}));
            }
        }
        else {
            foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${event.currentTarget.dataset.path}.custom`, null);
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

        const dataObject = item.toObject(false);
        dataObject.uuid = item.uuid;
        dataObject.name = { revealed: false, value: dataObject.name };

        const immunityKeys = Object.keys(dataObject.system.attributes.immunities);
        dataObject.system.attributes.immunities = immunityKeys.length > 0 ? immunityKeys.reduce((acc, key) => {
            const immunity = dataObject.system.attributes.immunities[key];
            acc[getIWRString(immunity)] = { ...immunity, exceptions: immunity.exceptions.map(x => ({ revealed: false, value: x })) } ;

            return acc;
        }, {}) : { none: { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } };
        
        const weaknessKeys = Object.keys(dataObject.system.attributes.weaknesses);
        dataObject.system.attributes.weaknesses = weaknessKeys.length > 0 ? weaknessKeys.reduce((acc, key) => {
            const weakness = dataObject.system.attributes.weaknesses[key];
            acc[getIWRString(weakness, false)] = { ...weakness, exceptions: weakness.exceptions.map(x => ({ revealed: false, value: x })), doubleVs: weakness.doubleVs?.map(x => ({ revealed: false, value: x })) ?? {} } ;

            return acc;
        }, {}) : { none: { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } };

        const resistanceKeys = Object.keys(dataObject.system.attributes.resistances);
        dataObject.system.attributes.resistances = resistanceKeys.length > 0 ? resistanceKeys.reduce((acc, key) => {
            const resistance = dataObject.system.attributes.resistances[key];
            acc[getIWRString(resistance, true)] = { ...resistance, exceptions: resistance.exceptions.map(x => ({ revealed: false, value: x })), doubleVs: resistance.doubleVs?.map(x => ({ revealed: false, value: x })) ?? {} } ;

            return acc;
        }, {}) : { none: { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } };

        dataObject.system.traits.value = dataObject.system.traits.value.reduce((acc, traitKey) => {
            acc[traitKey] = { revealed: false, value: traitKey };
            
            return acc;
        }, {});

        dataObject.system.actions = Object.keys(dataObject.system.actions).reduce((acc, index) => {
            const action = dataObject.system.actions[index];
            acc[action.item._id] = { ...action, damageStatsRevealed: false, };

            return acc;
        }, {});

        dataObject.system.perception.details = { revealed: false, value: dataObject.system.perception.details };

        dataObject.system.details.languages.value = dataObject.system.details.languages.value.map(x => ({ revealed: false, value: x }));
        dataObject.system.details.languages.details = { revealed: false, value: dataObject.system.details.languages.details };

        dataObject.items = Object.keys(dataObject.items).reduce((acc, key) => {
            const item = dataObject.items[key];
            if(item.type === 'spellcastingEntry'){
                item.system.spelldc.dc = { revealed: false, value: item.system.spelldc.dc };
                item.system.spelldc.value = { revealed: false, value: item.system.spelldc.value };
            }

            acc[item._id] = { revealed: false, ...item };

            return acc;
        }, {});

        const noSpells = !Object.keys(dataObject.items).find(x => {
            const item = dataObject.items[x];
            return item.type === 'spellcastingEntry'
        });
        if(noSpells) {
            dataObject.items['Spells-None'] = {
                type: 'spellcastingEntry',
                _id: 'Spell-None',
                revealed: false,
                system: {
                    spelldc: {
                        dc: { value: 0 },
                        value: { value: 0 },
                    }
                }
            }
        }


        if(Object.keys(dataObject.system.actions).length === 0){
            dataObject.system.actions['Attack-None'] = {
                revealed: false, 
                label: 'None', 
                empty: true,
                item: {
                    system: {
                        damageRolls: {}
                    },
                    _id: 'Attack-None',
                },
                weapon: {
                    system: {
                        traits: {
                            value: []
                        }
                    },
                },
                variants: [],
                traits: [],
                totalModifier: 0,
            };
        }

        var hasActions = false;
        var hasPassives = false;
        for(var item of Object.values(dataObject.items)){
            if(item.type === 'action'){
                if(item.system.actionType.value === 'action' || item.system.actionType.value === 'reaction') hasActions = true;
                if(item.system.actionType.value === 'passive') hasPassives = true;
            }
        }

        if(!hasActions) {
            dataObject.items['Action-None'] = {
                _id: 'Action-None',
                empty: true,
                type: 'action',
                name: 'None',
                value: 'PF2E.Miscellaneous.None',
                system: {
                    actionType: { value: 'action' },
                    description: {
                        value: null,
                    }
                }
            };
        }
        if(!hasPassives) {
            dataObject.items['Passive-None'] = {
                _id: 'Passive-None',
                empty: true,
                type: 'action',
                name: 'None',
                value: 'PF2E.Miscellaneous.None',
                system: {
                    actionType: { value: 'passive' },
                    description: {
                        value: null,
                    }
                }
            };
        }     

        dataObject.system.details.publicNotes =  { revealed: false, text: dataObject.system.details.publicNotes };
        dataObject.system.details.privateNotes = { revealed: false, text: dataObject.system.details.privateNotes }; 

        return dataObject;
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
        this.selected = { ...this.selected, category: 'monster', type: autoSelect ? getCreaturesTypes(monster.system.traits.value)[0].key : this.selected.type, monster: autoSelect ? monster : this.selected.monster ? updatedBestiary.monster[this.selected.monster.uuid] : null };
        
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