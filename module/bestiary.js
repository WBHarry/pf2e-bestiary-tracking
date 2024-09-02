
import { getBaseActor, getCreatureSize, getCreaturesTypes, getExpandedCreatureTypes, getIWRString, isNPC, slugify } from "../scripts/helpers.js";
import { resetBestiary } from "../scripts/macros.js";
import { bestiaryJournalEntry } from "../scripts/setup.js";
import { socketEvent } from "../scripts/socket.js";
import { acTable, attackTable, attributeTable, damageTable, hpTable, savingThrowPerceptionTable, skillTable, spellAttackTable, spellDCTable } from "../scripts/statisticsData.js";
import { getCategoryFromIntervals, getCategoryLabel, getCategoryRange, getMixedCategoryLabel, getRollAverage, getWeaknessCategoryClass } from "../scripts/statisticsHelper.js";
import PF2EBestiarySavesHandler from "./savesHandler.js";
import { dispositions } from '../data/constants.js';
import Tagify from '@yaireo/tagify';
import { getCreatureData } from "../data/modelHelpers.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PF2EBestiary extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({category = null, monsterUuid = null, actorIsNPC} = {category: 'monster', monsterUuid: null}){
        super({});

        this.bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

        const entity = monsterUuid ? this.bestiary.pages.find(x => x.system.uuid === monsterUuid) : null;
        var monsterCreatureTypes = [];
        if(category && monsterUuid) {
            if(actorIsNPC){
                monsterCreatureTypes = this.bestiary[category][monsterUuid].npcData.categories.length > 0 ? this.bestiary[category][monsterUuid].npcData.categories[0] : ['unaffiliated'];
            }
            else {
                monsterCreatureTypes = getCreaturesTypes(entity.traits).map(x => x.key);
            }
        } 
        
        this.selected = {
            category,
            type: monsterCreatureTypes.length > 0 ? monsterCreatureTypes[0] : null,
            monster: entity,
            abilities: [],
        };

        // Filter 0 = Alphebetic, 1 = by level
        // Direction 0 = Ascending, 1 = Descending
        this.search = {
            name: '',
        };

        this.npcData = {
            editMode: false,
            npcView: actorIsNPC ? true : false,
            newCategory: {
                text: null,
            }
        }

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
            selectCategory: this.selectCategory,
            selectBookmark: this.selectBookmark,
            selectMonster: this.selectMonster,
            removeMonster: this.removeMonster,
            toggleHideMonster: this.toggleHideMonster,
            toggleStatistics: this.toggleStatistics,
            returnButton: this.returnButton,
            toggleAbility: this.toggleAbility,
            toggleSpell: this.toggleSpell,
            toggleRevealed: this.toggleRevealed,
            toggleAllRevealed: this.toggleAllRevealed,
            revealEverything: this.revealEverything,
            hideEverything: this.hideEverything,
            refreshBestiary: this.refreshBestiary,
            handleSaveSlots: this.handleSaveSlots,
            resetBestiary: this.resetBestiary,
            clearSearch: this.clearSearch,
            toggleFilterDirection: this.toggleFilterDirection,
            createMisinformation: this.createMisinformation,
            imagePopout: this.imagePopout,
            setCategoriesLayout: this.setCategoriesLayout,
            addNpcCategory: this.addNpcCategory,
            removeNPCCategory: this.removeNPCCategory,
            unlinkedDialog: this.unlinkedDialog,
        },
        form: { handler: this.updateData, submitOnChange: true },
        window: {
            resizable: true,
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
                {
                    icon: 'fa-solid fa-eye',
                    label: 'PF2EBestiary.Bestiary.WindowControls.RevealAll',
                    action: 'revealEverything'
                },
                {
                    icon: 'fa-solid fa-eye-slash',
                    label: 'PF2EBestiary.Bestiary.WindowControls.HideAll',
                    action: 'hideEverything'
                }
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
        $(htmlElement).find(".bookmark.npc").on("contextmenu", this.removeBookmark.bind(this));

        const npcCategoryInput = $(htmlElement).find(".npc-category-input")[0];
        if(npcCategoryInput)
        {
            const categories = Object.keys(this.bestiary.npcCategories).map(key => ({
                value: key,
                name: this.bestiary.npcCategories[key],
            }));

            const traitsTagify = new Tagify(npcCategoryInput, {
                tagTextProp: "name",
                enforceWhitelist: true,
                whitelist : categories,
                callback: { invalid: () => console.log('invalid') },
                placeholder: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.CategoryPlaceholder"),
                dropdown : {
                  mapValueTo: 'name',
                  searchKeys: ['name'],
                  enabled: 0,              
                  maxItems: 20,    
                  closeOnSelect : true,
                  highlightFirst: false,
                },
              });
              
              traitsTagify.on('change', this.updateNpcCategories.bind(this));
        }
    }

    // Could possible rerender headercontrols here?
    _updateFrame(options) {
        if(this.selected.monster){
            super._updateFrame({ window: { controls: true } });
        } else {
            super._updateFrame(options);
        }
    }

    _getHeaderControls() {
        return this.options.window.controls?.filter(this.filterHeaderControls.bind(this)) || [];
    }

    filterHeaderControls(control) {
        switch(control.action){
            case 'revealEverything':
            case 'hideEverything':
                return game.user.isGM && Boolean(this.selected.monster);
            default:
                return game.user.isGM;
        }
    };

    getMonsterTabs() {
        const tabs = {
            statistics: { active: true, cssClass: '', group: 'primary', id: 'statistics', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Statistics") },
            spells: { active: false, cssClass: '', group: 'primary', id: 'spells', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Spells") },
            lore: { active: false, cssClass: '', group: 'primary', id: 'lore', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Lore") },
            notes: { active: false, cssClass: '', group: 'primary', id: 'notes', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes") }
        }

        for ( const v of Object.values(tabs) ) {
            v.active = this.tabGroups[v.group] ? this.tabGroups[v.group] === v.id : v.active;
            v.cssClass = v.active ? "active" : "";
        }

        return tabs;
    }

    getNPCTabs() {
        const tabs = {
            general: { active: true, cssClass: '', group: 'npc', id: 'general', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.General") },
            // influence: { active: false, cssClass: '', group: 'npc', id: 'influence', icon: null, label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.Influence") },
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
        selected.monster.notes.player.enriched = await TextEditor.enrichHTML(selected.monster.notes.player.enriched);
        selected.monster.actions = newActions;
        selected.monster.passives = newPassives;

        if(selected.monster.npcData){
            selected.monster.npcData.general.background.enrichedValue = await TextEditor.enrichHTML(selected.monster.npcData.general.background.value);
        }
    }

    async prepareData(selected, playerLevel, vagueDescriptions, detailedInformation) {

        const { category, type, monster } = selected;
        if(!monster) return { category, type, monster };

        const original = await fromUuid(monster.uuid);
        // const isUnlinked = !Boolean(original);
        const isUnlinked = false;
        const useTokenArt = await game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        const contextLevel = playerLevel ?? monster.system.details.level.value;

        var updatedType = type;
        var isUnknown = false;
        if(!game.user.isGM)
        {
            if(isNPC(monster)){
                const revealedCategories = monster.npcData.categories.filter(x => x.revealed);
                isUnknown = revealedCategories.length === 0;
                if(type){
                    if(isUnknown){
                        updatedType = 'unaffiliated';
                    } else if(!revealedCategories.includes(type)){
                        updatedType = revealedCategories[0].key;
                    }
                }
            }
            else {
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
        }

        const actions = { };
        const passives = { };
        const actionKeys = Object.keys(monster.items);
        for(var actionKey of actionKeys) {
            const action = monster.items[actionKey]
            if(action.type === 'action'){
                const item = {
                    ...action,
                    traits: action.system.traits.value.map(trait => ({ 
                        ...trait, 
                        value: game.i18n.localize(CONFIG.PF2E.actionTraits[trait.value]??trait.value), 
                        description: game.i18n.localize(CONFIG.PF2E.traitsDescriptions[trait.value]??""),
                        revealed: detailedInformation.abilityTraits ? trait.revealed : true 
                    })),
                    description: action.system.description.value,
                };
                if(action.system.actionType.value !== 'passive'){
                    actions[action._id] = item;
                }
                else {
                    passives[action._id] = item;
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
                    const levelValue = spell.system.traits.value.includes("cantrip") ? 'Cantrips' : spell.system.location.heightenedLevel ?? spell.system.cast.focusPoints ? Math.ceil(monster.system.details.level.value / 2) : spell.system.level.value;
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

        const npcData = isNPC(monster) ? {
            npcData: {
                ...monster.npcData,
                categories: monster.npcData?.categories?.map(x => x.name),
                general: {
                    ...monster.npcData.general,
                    disposition: monster ? game.users.reduce((acc, user) => {
                        if(user.active && !user.isGM){
                            const disposition = monster.npcData.general.disposition[user.id];
                            acc.push({
                                value: disposition ? disposition.value : dispositions.indifferent.value,
                                id: user.id,
                                name: user.character?.name ?? user.name,
                            });
                        }
            
                        return acc;
                    }, []) : [],
                }
            }
        } : {} 

        return {
            category: category,
            type: updatedType,
            monster: {
                id: monster.id,
                uuid: monster.uuid,
                img: useTokenArt ? monster.prototypeToken.texture.src : monster.img,
                name: monster.name,
                ...npcData,
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
                    acc.values[immunityKey] = { 
                        ...immunity, 
                        value: immunity.fake || immunity.empty ? immunity.type : game.i18n.localize(immunity.typeLabels[immunity.type]),
                        exceptions: immunity.exceptions?.map(x => ({ ...x, revealed: detailedInformation.exceptionsDouble ? x.revealed : true, key: x.value, value: game.i18n.localize(x.value.label ?? immunity.typeLabels[x.value] )})) ?? [],
                    };

                    return acc;
                }, { values: {} }) : { values: { none: { revealed: false, value: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } } },
                resistances: Object.keys(monster.system.attributes.resistances).length > 0  ? Object.keys(monster.system.attributes.resistances).reduce((acc, resistanceKey) => {
                    const resistance = monster.system.attributes.resistances[resistanceKey];
                    const label = !resistance.empty && !resistance.fake ? game.i18n.localize(resistance.typeLabels[resistance.type]) : null;
                    acc.values[resistanceKey] = { 
                        ...resistance, 
                        value: resistance.fake || resistance.empty ? resistance.type : `${label} ${resistance.value}`, 
                        class: getWeaknessCategoryClass(contextLevel, resistance.value), 
                        category: label,
                        exceptions: resistance.exceptions?.map(x => ({ ...x, revealed: detailedInformation.exceptionsDouble ? x.revealed : true, key: x.value, value: game.i18n.localize(x.value.label ?? resistance.typeLabels[x.value] )})) ?? [],
                        doubleVs: resistance.doubleVs?.map(x => ({ ...x, revealed: detailedInformation.exceptionsDouble ? x.revealed : true, key: x.value, value: game.i18n.localize(x.value.label ?? resistance.typeLabels[x.value] )})) ?? [],
                    };

                    return acc;
                }, { values: {} }) : { },
                weaknesses: Object.keys(monster.system.attributes.weaknesses).length > 0  ? Object.keys(monster.system.attributes.weaknesses).reduce((acc, weaknessKey) => {
                    const weakness = monster.system.attributes.weaknesses[weaknessKey];
                    const label = !weakness.empty && !weakness.fake ? game.i18n.localize(weakness.typeLabels[weakness.type]): null;
                    acc.values[weaknessKey] = { 
                        ...weakness, 
                        value: weakness.fake || weakness.empty ? weakness.type : `${label} ${weakness.value}`, 
                        class: getWeaknessCategoryClass(contextLevel, weakness.value), 
                        category: label,
                        exceptions: weakness.exceptions?.map(x => ({ ...x, revealed: detailedInformation.exceptionsDouble ? x.revealed : true, key: x.value, value: game.i18n.localize(x.value.label ?? weakness.typeLabels[x.value] )})) ?? [],
                    };

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

                    if(!action.fake){
                        for(var damageKey of Object.keys(monster.items[actionKey].system.damageRolls)){
                            const damage = monster.items[actionKey].system.damageRolls[damageKey];
                            damageLabel = damageLabel.concat(`${damageLabel ? ' + ' : ''}${damage.damage} ${damage.damageType.value}`);
                            const damageRollHelper = new Roll(damage.damage);
                            
                            damageInstances.push({ label: damage.damage, average: getRollAverage(damageRollHelper.terms), type: { ...damage.damageType, revealed: detailedInformation.damageTypes ? damage.damageType.revealed : true }, quality: damage.category, _id: damageKey  });
                        }
                    }

                    const damage = {
                        instances: damageInstances,
                        label: damageLabel,
                        average: damageInstances.reduce((acc, instance) => acc+instance.average, 0),
                    };
                    const attackParts = vagueDescriptions.properties.attacks ? { category: getCategoryLabel(attackTable, contextLevel, action.totalModifier) } : {  };
                    const damageParts = vagueDescriptions.properties.damage ? { 
                        damage: { ...damage, 
                            instances: damage.instances.map(instance => ({ 
                                ...instance, 
                                category: getCategoryLabel(damageTable, contextLevel, instance.average), 
                                value: instance.average,
                            }))
                        } 
                    } : { damage: { instances: damage.instances.map(instance => ({ ...instance, value: instance.label })) } };
                    acc[actionKey] = { 
                        ...action,
                        range: action.weapon.system.traits.value.find(x => x.startsWith('range-increment') || x.startsWith('range')) ? 'Ranged' : 'Melee', 
                        variants: action.variants.reduce((acc, variant) => {
                            acc.values[slugify(variant.label)] = variant.label;
        
                            return acc;
                        }, { revealed: false, values: {} }),
                        traits: monster.items[actionKey]?.system?.traits?.value?.map(trait => ({
                            label: game.i18n.localize(CONFIG.PF2E.npcAttackTraits[trait.value]),
                            description: CONFIG.PF2E.traitsDescriptions[trait.value],
                            revealed: detailedInformation.attackTraits ? trait.revealed : true,
                        })).filter(trait => trait.name !== 'attack') ?? [],
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
                    player: {
                        document: game.journal.getName(bestiaryJournalEntry).uuid,
                        page: monster.system.details.playerNotes.document,
                        text: game.journal.getName(bestiaryJournalEntry).pages.get(monster.system.details.playerNotes.document).text.content,
                        enriched: game.journal.getName(bestiaryJournalEntry).pages.get(monster.system.details.playerNotes.document).text.content
                    },
                },
                isUnlinked: isUnlinked,
            }
        };
    }

    prepareBestiary(bestiary){
        return {
            ...bestiary,
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
            npc: Object.keys(bestiary.npc).reduce((acc, npcKey) => {
                const npc = bestiary.npc[npcKey];
                const npcCategories = npc.npcData.categories.length === 0 ? [{ key: 'unaffiliated', name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated") }] : npc.npcData.categories;
                for(var category of npcCategories){
                    acc[category.key].values[npcKey] = bestiary.npc[npcKey];
                }

                return acc;
            }, { 
                unaffiliated: { name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated"), values: {}},
                ...Object.keys(bestiary.npcCategories).reduce((acc, key) => {
                    acc[key] = { name: bestiary.npcCategories[key], values: {} };
                    return acc;
                }, {})
            })
        };
    }

    getBookmarks(){
        if(this.selected.category === 'monster'){
            return this.bestiary.pages.filter(creature => {
                const isCreature = creature.type === 'pf2e-bestiary-tracking.creature';
                if(!isCreature || (!game.user.isGM && creature.system.hidden)) return false;

                const match = creature.system.name.value.toLowerCase().match(this.search.name.toLowerCase());
                const unrevealedMatch = game.i18n.localize('PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature').toLowerCase().match(this.search.name.toLowerCase());
                if(!this.search.name || ((creature.system.name.revealed || game.user.isGM) && match) || (!creature.system.name.revealed && !game.user.isGM && unrevealedMatch)) {
                    return true;
                }

                return false;
            }).sort((a, b) => {
                    if(!context.layout?.categories?.filter?.type || context.layout.categories.filter.type === 0){
                        var comparison = a.name.value < b.name.value ? -1 : a.name.value > b.name.value ? 1 : 0;
                        if(!game.user.isGM){
                            comparison = 
                            a.name.revealed && b.name.revealed ? (a.name.value < b.name.value ? -1 : a.name.value > b.name.value ? 1 : 0) :
                            a.name.revealed && !b.name.revealed ? 1 :
                            !a.name.revealed && b.name.revealed ? -1 : 0;
                        }
        
                        return context.layout?.categories?.filter?.direction === 0 ? comparison : (comparison * - 1);
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
            }).reduce((acc, creature) => {
                const types = getCreaturesTypes(creature.system.traits);

                var usedTypes = types.map(x => x.key);
                if(!game.user.isGM){
                    usedTypes = types.filter(x => x.revealed).map(x => x.key);
                }
                
                if(usedTypes.length === 0) usedTypes = ['unknown'];

                for(var type of usedTypes){
                    acc.find(x => x.value === type)?.values?.push({
                        id: creature.id, 
                        name: creature.system.name, 
                        hidden: creature.system.hidden,
                        img: creature.system.displayImage,
                    });
                }

                return acc;
            }, getExpandedCreatureTypes());
        } else if(this.selected.category === 'pf2e-bestiary-tracking.npc') {

        } else return [];
    }
    
    async _prepareContext(_options) {
        var context = await super._prepareContext(_options);

        context = await this.sharedPreparation(context);
        context.bookmarks = this.getBookmarks();
        context.bookmarkEntities = this.selected.type ? context.bookmarks.find(x => x.value === this.selected.type).values : [];

        if(this.selected.category === 'npc'){
            context = await this.npcPreparation(context);
        }
        else {
            context = await this.monsterPreparation(context);
        }

        return context;
    }

    sharedPreparation = async (context) => {
        context.layout = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        context.optionalFields = game.settings.get('pf2e-bestiary-tracking', 'optional-fields');
        context.detailedInformation = game.settings.get('pf2e-bestiary-tracking', 'detailed-information-toggles');
        context.useTokenArt = game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        context.hideAbilityDescriptions = game.settings.get('pf2e-bestiary-tracking', 'hide-ability-descriptions');
        context.contrastRevealedState = game.settings.get('pf2e-bestiary-tracking', 'contrast-revealed-state');
        context.vagueDescriptions = foundry.utils.deepClone(await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions'));
        context.vagueDescriptions.settings.playerBased = game.user.isGM ? false : context.vagueDescriptions.settings.playerBased;
        context.user = game.user;
        context.playerLevel = game.user.character ? game.user.character.system.details.level.value : null;
        context.search = this.search;
        context.npcState = this.npcData;
        context.selected = foundry.utils.deepClone(this.selected);

        // context.selected = await this.prepareData(context.selected, context.vagueDescriptions.settings.playerBased ? context.playerLevel : null, context.vagueDescriptions, context.detailedInformation);
        // await this.enrichTexts(context.selected);
        // context.bestiary = this.prepareBestiary(foundry.utils.deepClone(this.bestiary));
        context.typeTitle = this.selected.type ? 
            this.selected.category === 'monster' ? game.i18n.format("PF2EBestiary.Bestiary.CategoryView.EmptyText", { category: getExpandedCreatureTypes().find(x => x.value === this.selected.type).name }) : 
            this.selected.category === 'npc' ? game.i18n.format("PF2EBestiary.Bestiary.CategoryView.EmptyCategoryText", { category: context.bestiary.npcCategories[this.selected.type]}) : '' : '';
        
        // context.openType = (context.selected.type ? Object.keys(context.bestiary[context.selected.category][context.selected.type].values).reduce((acc, monsterKey) => { 
        //     const monster = context.bestiary[this.selected.category][context.selected.type].values[monsterKey];
        //     if(!game.user.isGM && monster.hidden) return acc;

        //     monster.img = context.useTokenArt ? monster.prototypeToken.texture.src : monster.img;
        //     const match = monster.name.value.toLowerCase().match(this.search.name.toLowerCase());
        //     const unrevealedMatch = game.i18n.localize(context.selected.category === 'monster' ? 'PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature' : 'PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated').toLowerCase().match(this.search.name.toLowerCase());
        //     if(!this.search.name || ((monster.name.revealed || game.user.isGM) && match) || (!monster.name.revealed && !game.user.isGM && unrevealedMatch)) {
        //         acc.push(monster);
        //     }

        //     return acc;
        // }, []).sort((a, b) => {
        //     if(!context.layout?.categories?.filter?.type || context.layout.categories.filter.type === 0){
        //         var comparison = a.name.value < b.name.value ? -1 : a.name.value > b.name.value ? 1 : 0;
        //         if(!game.user.isGM){
        //             comparison = 
        //             a.name.revealed && b.name.revealed ? (a.name.value < b.name.value ? -1 : a.name.value > b.name.value ? 1 : 0) :
        //             a.name.revealed && !b.name.revealed ? 1 :
        //             !a.name.revealed && b.name.revealed ? -1 : 0;
        //         }

        //         return context.layout?.categories?.filter?.direction === 0 ? comparison : (comparison * - 1);
        //     } else {
        //         var comparison = a.level.value - b.level.value;
        //         if(!game.user.isGM){
        //             comparison = 
        //             a.level.revealed && b.level.revealed ?  a.level.value - b.level.value : 
        //             a.level.revealed && !b.level.revealed ? 1 :
        //             !a.level.revealed && b.level.revealed ? -1 : 0;
        //         }

        //         return context.layout.categories.filter.direction === 0 ? comparison : (comparison * -1); 
        //     }
        // }) : null);

        context.bookmarks = [];

        return context;
    };

    monsterPreparation = async (context) => {
        context.tabs = this.getMonsterTabs();
        
        return context;
    };

    npcPreparation = async (context) => {
        context.tabs = this.getMonsterTabs();
        context.npcTabs = this.getNPCTabs();
        context.dispositions = Object.keys(dispositions).map(x => dispositions[x]);
        context.npcCategories = this.bestiary.npcCategories;

        return context;
    };

    static selectCategory(_ , button){
        this.selected.category = this.selected.category === button.dataset.category ? null : button.dataset.category;
        this.selected.type = null;
        this.selected.monster = null;

        this._updateFrame({ window: { controls: true } });

        this.render();
    }

    static selectBookmark(_, button){
        this.selected.type = button.dataset.bookmark;
        this.selected.monster = null;
        this.search.name = '';

        this._updateFrame({ window: { controls: true } });

        this.render();
    }

    async removeBookmark(event){
        if(event.currentTarget.dataset.bookmark === 'unaffiliated') return;

        delete this.bestiary.npcCategories[event.currentTarget.dataset.bookmark];

        for(var npcKey in this.bestiary.npc){
            var npc = this.bestiary.npc[npcKey];
            npc.npcData.categories = npc.npcData.categories.filter(category => category.key !== event.currentTarget.dataset.bookmark);
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static selectMonster(_, button){
        this.selected.monster = this.bestiary.pages.get(button.dataset.monster);
        this.npcData.npcView = isNPC(this.selected.monster) ? true : false;
        this.tabGroups = { primary: 'statistics', secondary: 'general' };
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

        // const journalEntry = game.journal.getName(bestiaryJournalEntry);
        // await journalEntry.pages.get(this.bestiary[this.selected.category][button.dataset.monster].system.details.playerNotes.document).delete();

        await this.bestiary.pages.get(button.dataset.monster).delete();

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        this.render();
    }

    static async toggleHideMonster(_, button){
        const entity = this.bestiary.pages.get(button.dataset.id);
        await entity.update({ 'system.hidden': !entity.system.hidden });

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
        this.selected = this.selected.monster ? { ...this.selected, type: button.dataset.contextType, monster: null } : this.selected.type ? { ...this.selected, type: null } : { };
        this._updateFrame({ window: { controls: true } });
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

    async updateNpcCategories(event){
        const categories = event.detail?.value ? JSON.parse(event.detail.value) : [];
        this.bestiary.npc[this.selected.monster.uuid].npcData.categories = categories.map(x => ({ key: x.value, name: x.name }));

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static async handleTokenNames(monster){
        if(game.settings.get('pf2e-bestiary-tracking', 'hide-token-names')){
            // Make workbench mystify if active and newValue = hidden
            // var workBenchMystifierUsed = game.modules.get("xdy-pf2e-workbench")?.active && game.settings.get('xdy-pf2e-workbench', 'npcMystifier');   
            const name = 
                monster.system.name.revealed && monster.system.name.custom ? monster.system.name.custom : 
                monster.system.name.revealed && !monster.system.name.custom ? monster.system.name.value :
                !monster.system.name.revealed ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown") : null;

            if(name) {
                for(var token of canvas.tokens.placeables.filter(x => x.document?.baseActor?.uuid === monster.system.uuid)){
                    await token.document.update({ name });
                }
            }
        }
    }

    static async toggleRevealed(event, button){
        if(!game.user.isGM) return;

        event.stopPropagation();
        const path = button.dataset.path.startsWith('npc.') ? button.dataset.path.slice(4) : button.dataset.path;

        const newValue = !foundry.utils.getProperty(this.selected.monster, `${path}.${button.dataset.key ?? 'revealed'}`);
        await this.selected.monster.update({ [`${path}.${button.dataset.key ?? 'revealed'}`]: newValue });

        if(path === 'name'){
            await PF2EBestiary.handleTokenNames(this.selected.monster);
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        this.render();
    }

    static async toggleAllRevealed(_, button){
        if(!game.user.isGM) return;

        const property = foundry.utils.getProperty(this.selected.monster, button.dataset.path);
        const keys = Object.keys(property);
        var allRevealed = false;
        switch(button.dataset.type){
            case 'attacks':
                allRevealed = Object.values(this.selected.monster.system.attacks).every(x => x.revealed);
                await this.selected.monster.update({
                    system: {
                        attacks: Object.keys(this.selected.monster.system.attacks).reduce((acc, key) => {
                            acc[key] = { revealed: !allRevealed };
                            return acc;
                        }, {}),
                    }
                });
                break;
            case 'senses':
                allRevealed = Object.values(this.selected.monster.system.senses.senses).every(x => x.revealed) && this.selected.monster.system.senses.perception.revealed && this.selected.monster.system.senses.details.revealed;
                await this.selected.monster.update({
                    system: {
                        senses: {
                            perception: { revealed: !allRevealed },
                            details: { revealed: !allRevealed },
                            senses: Object.keys(this.selected.monster.system.senses.senses).reduce((acc, key) => {
                                acc[key] = { revealed: !allRevealed };
                                return acc;
                            }, {}),
                        }
                    }
                });
                break;
            case 'speed':
                allRevealed = Object.values(this.selected.monster.system.speeds.values).every(x => x.revealed) && this.selected.monster.system.speeds.details.revealed;
                await this.selected.monster.update({
                    system: {
                        speeds: {
                            details: { revealed: !allRevealed },
                            values: Object.keys(this.selected.monster.system.speeds.values).reduce((acc, key) => { acc[key] = { revealed: !allRevealed }; return acc; }, {}),
                        }
                    }
                });
                break;
            case 'spell-level':
                allRevealed = Object.values(this.selected.monster.system.spells.entries[button.dataset.entryValue].levels[button.dataset.spellLevel].spells).every(x => x.revealed);
                const update = {
                    system: {
                        spells: {
                            entries: Object.keys(this.selected.monster.system.spells.entries).reduce((acc, entryKey) => {
                                const entry = this.selected.monster.system.spells.entries[entryKey];
                                if(button.dataset.entryValue){
                                    acc[entryKey] = {
                                        levels: Object.keys(entry.levels).reduce((acc, level) => {
                                            if(level === button.dataset.spellLevel){
                                                acc[level] = {
                                                    spells: Object.keys(entry.levels[level].spells).reduce((acc, spell) => {
                                                        acc[spell] = { revealed: !allRevealed };
                                                        return acc;
                                                    }, {})
                                                }
                                            }
                                            return acc;
                                        }, {})
                                    };
                                }
        
                                return acc;
                            }, {})}
                        } 
                };
                await this.selected.monster.update(update, { diff: true });
                break;
            default:
                allRevealed = keys.every(key => property[key].revealed);
                await this.selected.monster.update({ [button.dataset.path]: keys.reduce((acc, key) => {
                    acc[key] = { revealed: !allRevealed };
                    return acc;
                }, {})});
                break;
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        this.render();
    }

    static async revealEverything(){
        await this.toggleEverythingRevealed(true);
    }

    static async hideEverything(){
        await this.toggleEverythingRevealed(false);
    }

    async toggleEverythingRevealed(revealed){
        if(!game.user.isGM || !this.selected.monster) return;

        await this.selected.monster.system.toggleEverything(revealed);

        await PF2EBestiary.handleTokenNames(this.selected.monster);

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        this.toggleControls(false);
        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static async refreshBestiary(){
        if(!game.user.isGM) return;
        this.toggleControls(false);

        for(var monsterKey in this.bestiary.monster){
            const actor = await fromUuid(monsterKey);

            if(actor){
                const data = await PF2EBestiary.getMonsterData(actor);
                const updatedData = PF2EBestiary.getUpdatedCreature(this.bestiary.monster[monsterKey], data);
                this.bestiary.monster[monsterKey] = updatedData;
            } 
        }

        for(var npcKey in this.bestiary.npc){
            const actor = await fromUuid(npcKey);

            if(actor){
                const data = await PF2EBestiary.getMonsterData(actor);
                const updatedData = PF2EBestiary.getUpdatedCreature(this.bestiary.npc[npcKey], data);
                this.bestiary.npc[npcKey] = updatedData;
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
        this.toggleControls(false);

        await new PF2EBestiarySavesHandler().render(true);
    }

    async refreshCreature(monsterUuid, actorIsNPC){
        const actor = await fromUuid(monsterUuid);
                
        if(!actor) return;

        const data = await PF2EBestiary.getMonsterData(actor);

        if(actorIsNPC) this.bestiary.npc[monsterUuid] =  PF2EBestiary.getUpdatedCreature(this.bestiary.npc[monsterUuid], data);
        else this.bestiary.monster[monsterUuid] =  PF2EBestiary.getUpdatedCreature(this.bestiary.monster[monsterUuid], data);
        

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static async resetBestiary(){
        const successfull = await resetBestiary();
        if(successfull){
            this.toggleControls(false);
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
                                    revealed: false, type: elements.misinformation.value, fake: true,
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
                            ${new foundry.data.fields.StringField({
                                label: game.i18n.localize("PF2EBestiary.Bestiary.Misinformation.Dialog.Traitlabel"),
                                required: false
                            }).toFormGroup({}, {name: "traits"}).outerHTML}
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
                                label: elements.misinformation.value,
                                type: 'action',
                                description: elements.description?.value,
                                traits: elements.traits.value ? JSON.parse(elements.traits.value).map(x => ({ 
                                    revealed: false, 
                                    value: x.value,
                                })) : [],
                                fake: true,
                            },
                        };

                        if(name === 'Action'){
                            base.value.actions = actionOptions[Number.parseInt(elements.actions.value)]?.value;
                        }

                        return { value: base, errors: [] };
                    },
                    tagify: [{
                        element: 'traits',
                        options: {
                            whitelist: Object.keys(CONFIG.PF2E.actionTraits).map(key => { 
                                const label = CONFIG.PF2E.actionTraits[key];
                                return { value: key, name: game.i18n.localize(label) };
                            }),
                            dropdown : {
                                mapValueTo: 'name',
                                searchKeys: ['name'],
                                enabled: 0,              
                                maxItems: 20,    
                                closeOnSelect : true,
                                highlightFirst: false,
                              },
                        },
                    }],
                }
        }
    } 

    static async createMisinformation(_, button){
        if(!game.user.isGM) return;

        const addValue = async ({value, errors}) => {
            if(errors.length > 0) ui.notifications.error(game.i18n.format("PF2EBestiary.Bestiary.Misinformation.Dialog.Errors.RequiredFields", { fields: errors.map((x, index) => `${x}${index !== errors.length-1 ? ', ' : ''}`) }));

            const newValues = foundry.utils.getProperty(this.selected.monster, `${button.dataset.path}`);
            if(Array.isArray(newValues)) newValues.push(value.value);
            else newValues[value.slug] = value.value;

            await this.selected.monster.update({ [`${button.dataset.path}`]: newValues });
            
            await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                action: socketEvent.UpdateBestiary,
                data: { monsterSlug: this.selected.monster.slug },
            });

            this.render();
        };

        const { content, getValue, width, tagify = [] } = this.getMisinformationDialogData(button.dataset.name);
        
        async function callback(_, button) {
            await addValue(getValue(button.form.elements));
        }

        const dialog = new foundry.applications.api.DialogV2({
            buttons: [foundry.utils.mergeObject({
                action: "ok", label: "Confirm", icon: "fas fa-check", default: true
            }, { callback: callback })],
            content: content,
            rejectClose: false,
            modal: false,
            window: {title: game.i18n.localize('PF2EBestiary.Bestiary.Misinformation.Dialog.Title')},
            position: { width }
        });

        await dialog.render(true);

        for(var tag of tagify){
            const element = $(dialog.element).find(`input[name="${tag.element}"]`);
            var ta = new Tagify(element[0], tag.options);
            console.log('asd');
        }
    }

    static async imagePopout(){
        const title = this.selected.monster.system.name.revealed ? 
                this.selected.monster.system.name.custom ? this.selected.monster.system.name.custom :
                this.selected.monster.system.name.value :
            game.i18n.localize('PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature');

        new ImagePopout(this.selected.monster.system.displayImage, { 
            title: game.user.isGM ? this.selected.monster.system.name.value : title, 
            uuid: this.selected.monster.system.uuid, 
            showTitle: true
        }).render(true);
    }

    static async setCategoriesLayout(_, button){
        const settings = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-layout', { ...settings, categories: {
            ...settings.categories,
            layout: Number.parseInt(button.dataset.option) 
        } });
        this.render();
    }

    static async addNpcCategory(){
        if(game.user.isGM && this.npcData.newCategory.text){
            const categoryKey = `${slugify(this.npcData.newCategory.text)}-${foundry.utils.randomID()}`;

            this.bestiary.npcCategories[categoryKey] =  this.npcData.newCategory.text; 
            
            this.npcData.newCategory.text = null;

            await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
            await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                action: socketEvent.UpdateBestiary,
                data: { },
            });
            Hooks.callAll(socketEvent.UpdateBestiary, {});
        }
    }

    static async removeNPCCategory(_, button){
        if(!game.user.isGM) return;

        this.bestiary.npcCategories = Object.keys(this.bestiary.npcCategories).reduce((acc, key) => {
            if(key !== button.dataset.key) acc[key] = this.bestiary.npcCategories[key];

            return acc;
        }, {});

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });
        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static async unlinkedDialog(){
        const confirmed = await Dialog.confirm({
            title: game.i18n.localize("PF2EBestiary.Bestiary.UnlinkedDialog.Title"),
            content: game.i18n.localize("PF2EBestiary.Bestiary.UnlinkedDialog.Content"),
            yes: () => true,
            no: () => false,
        });

        if(!confirmed) return;

        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        const category = isNPC(this.selected.monster) ? 'npc' : 'monster';
        const unlinkedMonster = foundry.utils.deepClone(bestiary[category][this.selected.monster.uuid]);
        const restoredObject = Object.keys(unlinkedMonster).reduce((acc, key) => {
            var baseField = bestiary[category][this.selected.monster.uuid][key];
            switch(key){
                case 'uuid':
                case '_id':
                    break;
                case 'name':
                    acc[key] = baseField.value;
                    break;
                case 'system':
                    baseField.traits.value = Object.keys(baseField.traits.value);
                    baseField.attributes.immunities = Object.keys(baseField.attributes.immunities).filter(x => x !== 'none').map(key => ({ 
                        ...baseField.attributes.immunities[key],
                        exceptions: baseField.attributes.immunities[key].exceptions.map(exception => exception.value),
                    }));
                    baseField.attributes.weaknesses = Object.keys(baseField.attributes.weaknesses).filter(x => x !== 'none').map(key => ({ 
                        ...baseField.attributes.weaknesses[key],
                        exceptions: baseField.attributes.weaknesses[key].exceptions.map(exception => exception.value),
                    }));
                    baseField.attributes.resistances = Object.keys(baseField.attributes.resistances).filter(x => x !== 'none').map(key => ({ 
                        ...baseField.attributes.resistances[key],
                        exceptions: baseField.attributes.resistances[key].exceptions.map(exception => exception.value),
                        doubleVs: baseField.attributes.resistances[key].doubleVs.map(double => double.value),
                    }));

                    baseField.perception.details = baseField.perception.details.value;

                    baseField.details.languages.value = baseField.details.languages.value.map(x => x.value);
                    baseField.details.languages.details = baseField.details.languages.details.value; 

                    acc[key] = baseField;
                    break;
                case 'items':
                    baseField = Object.keys(baseField).reduce((acc, fieldKey) => {
                        const { revealed, ...rest } = baseField[fieldKey];

                        if(['Passive-None', 'Action-None', 'Attack-None', 'Spell-None'].includes(rest._id)){
                            return acc;
                        }

                        if(rest.system.traits?.value){
                            const keys = Object.keys(rest.system.traits.value);
                            if(keys.length > 0 && rest.system.traits.value[keys[0]].value){
                                rest.system.traits.value = keys.map(x => rest.system.traits.value[x].value);
                            }
                        }

                        if(rest.system.damageRolls){
                            Object.values(rest.system.damageRolls).forEach(damage => {
                                damage.damageType = damage.damageType.value;
                                if(typeof damage.kinds === 'object') Object.values(damage.kinds).reduce((acc, kind) => {
                                    acc.push(kind);
                                    return acc;
                                }, []) 
                            });
                        }

                        if(rest.type === 'equipment'){
                            const { damageRolls, ...systemRest } = rest.system;
                            rest.system = systemRest;
                        }

                        if(rest.type === 'spell'){
                            Object.values(rest.system.damage).forEach(damage => {
                                if(typeof damage.kinds === 'object') {
                                    damage.kinds =  Object.values(damage.kinds).reduce((acc, kind) => {
                                        acc.push(kind);
                                        return acc;
                                    }, []);
                                }
                            })
                        }

                        if(rest.type === 'spellEntry'){

                        }

                        acc.push({
                            ...rest,
                        });

                        return acc;
                    }, []);

                    acc[key] = baseField;
                    break;
                default:
                    acc[key] = baseField;
            }

            return acc;
        }, {});

        const newActor = await Actor.implementation.create([restoredObject]);
        bestiary[category][newActor[0].uuid] = { ...bestiary[category][this.selected.monster.uuid], uuid: newActor[0].uuid, _id: newActor[0].id };
        delete bestiary[category][this.selected.monster.uuid];

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
        Hooks.callAll(socketEvent.UpdateBestiary, {});

        this.render();
    }

    async obscureData(event){
        if(!game.user.isGM || !event.currentTarget.dataset.name) return;

        const setValue = async (value) => {
            if(value){
                await this.selected.monster.update({ [`${event.currentTarget.dataset.path}.custom`]: value });

                if(event.currentTarget.dataset.path === 'name'){
                    await PF2EBestiary.handleTokenNames(this.selected.monster);
                }

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
            var deletePath = pathSplit.slice(0, pathSplit.length-1).join('.');
            const newValues = foundry.utils.getProperty(this.selected.monster, deletePath);
            if(Array.isArray(newValues)){
                await this.selected.monster.update({ [deletePath]: Object.keys(newValues).reduce((acc,key) => {
                    if(key !== pathSplit[pathSplit.length-1]){
                        acc.push(newValues[key]);
                    }
    
                    return acc;
                }, [])});
            }
            else {
                deletePath = pathSplit.slice(0, pathSplit.length-1).join('.').concat(`.-=${pathSplit[pathSplit.length-1]}`);
                await this.selected.monster.update({ [deletePath]: null });
            }
        }
        else {
            await this.selected.monster.update({ [`${event.currentTarget.dataset.path}.custom`]: null });

            if(event.currentTarget.dataset.path === 'name'){
                await PF2EBestiary.handleTokenNames(this.selected.monster);
            }
        }
    
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        this.render();
    }

    static async updateData(event, element, formData){
        const { npc, system, ...rest } = foundry.utils.expandObject(formData.object);
        const npcFields = npc ? foundry.utils.flattenObject(npc) : {};
        const simpleFields = foundry.utils.flattenObject(rest);

        for(var property in npcFields){
            await foundry.utils.setProperty(this.selected.monster, property, npcFields[property]);
        }

        if(system && this.selected.monster){
            await this.selected.monster.update({system : system });
        }

        for(var property in simpleFields){
            await foundry.utils.setProperty(this, property, simpleFields[property]);
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });
        Hooks.callAll(socketEvent.UpdateBestiary, {});
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
        const monster = await PF2EBestiary.getMonsterData(getBaseActor(item));
        if (!monster) return null;

        const actorIsNPC = isNPC(monster);
        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        // We do not currently refresh already present creatures in the Bestiary.
        if(actorIsNPC ? bestiary.npc[monster.uuid] : bestiary.monster[monster.uuid]) return false;


        const journalEntry = game.journal.getName(bestiaryJournalEntry);
        const page = await journalEntry.createEmbeddedDocuments("JournalEntryPage", [{
            name: monster.name.value,
            text: {
                content: ""
            }
        }]);
        monster.system.details.playerNotes = { document: page[0].id };

        if(actorIsNPC) bestiary.npc[monster.uuid] = monster;
        else bestiary.monster[monster.uuid] = monster;
        
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

        return true;
    }

    static async getMonsterData(item){
        if(!item || item.hasPlayerOwner || item.type !== 'npc') return null;

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
            acc[getIWRString(weakness, false)] = { ...weakness, exceptions: weakness.exceptions.map(x => ({ revealed: false, value: x }))} ;

            return acc;
        }, {}) : { none: { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } };

        const resistanceKeys = Object.keys(dataObject.system.attributes.resistances);
        dataObject.system.attributes.resistances = resistanceKeys.length > 0 ? resistanceKeys.reduce((acc, key) => {
            const resistance = dataObject.system.attributes.resistances[key];
            acc[getIWRString(resistance, true)] = { ...resistance, exceptions: resistance.exceptions.map(x => ({ revealed: false, value: x })), doubleVs: resistance.doubleVs.map(x => ({ revealed: false, value: x }))  } ;

            return acc;
        }, {}) : { none: { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") } };

        dataObject.system.traits.value = dataObject.system.traits.value.reduce((acc, traitKey) => {
            acc[traitKey] = { revealed: false, value: traitKey };
            
            return acc;
        }, {});

        dataObject.system.actions = Object.keys(dataObject.system.actions).reduce((acc, index) => {
            const action = dataObject.system.actions[index];
            acc[action.item._id] = { 
                ...action, 
                damageStatsRevealed: false, 
               
            };

            Object.values(dataObject.items).filter(x => x._id === action.item._id).forEach(item => {
                if(item.type === 'melee'){
                    Object.keys(item.system.damageRolls).forEach(key => {
                        item.system.damageRolls[key].damageType = { revealed: false, value: item.system.damageRolls[key].damageType };
                    });
    
                    item.system.traits.value = item.system.traits.value.map(trait => ({ revealed: false, value: trait }));
                } 
                else if(item.type === 'equipment'){
                    item.system.damageRolls = Object.keys(action.weapon.system.damageRolls).reduce((acc, damageKey) => {
                        acc[damageKey] = {
                            ...action.weapon.system.damageRolls[damageKey],
                            damageType: { revealed: false, value: action.weapon.system.damageRolls[damageKey].damageType },
                        };

                        return acc;
                    }, {});

                    // If this crops up more, make a general helper method to extract all types of rules.
                    item.system.rules.forEach(rule => {
                        if(rule.key === 'FlatModifier'){
                            item.system.damageRolls[`${rule.damageType}-${foundry.utils.randomID()}`] = {
                                damageType : { revealed: false, value: rule.damageType },
                                damage: rule.value.toString(),
                                isFromRule: true,
                            };
                        }
                    });
    
                    item.system.traits.value = item.system.traits.value.map(trait => ({ revealed: false, value: trait }));
                }
            });

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

            dataObject.items['Attack-None'] = {
                _id: 'Attack-None',
                empty: true,
                type: 'melee',
                Name: 'None',
                value: 'PF2E.Miscellaneous.None',
                system: {
                    damageRolls: [],
                    traits: {
                        value: []
                    }
                }
            };
        }

        var hasActions = false;
        var hasPassives = false;
        for(var item of Object.values(dataObject.items)){
            if(item.type === 'action'){
                item.system.traits.value = item.system.traits.value.map(trait => ({ revealed: false, value: trait }));
            
                if(item.system.actionType.value !== 'passive') hasActions = true;
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
                    },
                    traits: {
                        value: [],
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
                    },
                    traits: {
                        value: [],
                    }
                }
            };
        }     

        dataObject.system.details.publicNotes =  { revealed: false, text: dataObject.system.details.publicNotes };
        dataObject.system.details.privateNotes = { revealed: false, text: dataObject.system.details.privateNotes }; 

        const hiddenSettings = game.settings.get('pf2e-bestiary-tracking', 'hidden-settings');
        if(isNPC(dataObject)){
            dataObject.hidden = hiddenSettings.npc;
            dataObject.npcData = {
                categories: [],
                general: {
                    background: { value: '', revealed: false },
                    appearance: { value: '', revealed: false },
                    personality: { value: '', revealed: false },
                    height: { value: '', revealed: false },
                    weight: { value: '', revealed: false },
                    birthplace: { value: '', revealed: false },
                    disposition: {},
                },
                influence: {

                },
            };
        } else {
            dataObject.hidden = hiddenSettings.monster;
        }

        return dataObject;
    }
  
    async _onDrop(event) {
        if(!game.user.isGM) return;

        const data = TextEditor.getDragEventData(event);
        const baseItem = await fromUuid(data.uuid);

        if(baseItem?.type === 'character' || baseItem.hasPlayerOwner){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedCharacterType"));
            return;
        }

        if(!baseItem || baseItem.type !== 'npc'){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedType"));
            return;
        }

        await game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking')).createEmbeddedDocuments("JournalEntryPage", [getCreatureData(baseItem)]);
        
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        this.render();

        // const item = baseItem.pack ? await Actor.implementation.create(baseItem.toObject()) : baseItem;
        // const actorIsNPC = isNPC(item);

        // // Creature already in Bestiary.
        // if(actorIsNPC ? this.bestiary.npc[item.uuid] : this.bestiary.monster[item.uuid]){
        //     await this.refreshCreature(item.uuid, actorIsNPC);
        //     return;
        // }

        // const monster = await PF2EBestiary.getMonsterData(item);
        // const updatedBestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        // const journalEntry = game.journal.getName(bestiaryJournalEntry);
        // const page = await journalEntry.createEmbeddedDocuments("JournalEntryPage", [{
        //     name: monster.name.value,
        //     text: {
        //         content: ""
        //     }
        // }]);
        // monster.system.details.playerNotes = { document: page[0].id };

        // if(actorIsNPC){
        //     updatedBestiary.npc[item.uuid] = monster;
        // }
        // else {
        //     updatedBestiary.monster[item.uuid] = monster;
        // }
        
        // const doubleClickOpenActivated = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
        // if(doubleClickOpenActivated){
        //     const ownership = item.ownership.default > 1 ? item.ownership.default : 1;
        //     await item.update({ "ownership.default": ownership });

        //     const baseItem = await fromUuid(item.uuid);
        //     await baseItem.update({ "ownership.default": ownership });
        // }
        
        // this.bestiary = updatedBestiary;
        // await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', updatedBestiary);
    }

    onBestiaryUpdate = async () => {        
        this.bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
        const entityExists = this.selected.monster ? this.bestiary.pages.get(this.selected.monster.id) : false;
        if(!entityExists) this.selected.monster = null;

        const saveButton = $(this.element).find('.prosemirror[collaborate="true"] *[data-action="save"]');
        if(saveButton.length === 0){
            this.render(true);
        }
    };

    close = async (options) => {
        Hooks.off(socketEvent.UpdateBestiary, this.onBestiaryUpdate);

        return super.close(options);
    }
}