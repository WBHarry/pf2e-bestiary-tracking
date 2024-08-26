
import { getBaseActor, getCreatureSize, getCreaturesTypes, getExpandedCreatureTypes, getIWRString, getMultiplesString, slugify } from "../scripts/helpers.js";
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
            unlinkedDialog: this.unlinkedDialog,
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

    async prepareData(selected, playerLevel, vagueDescriptions, detailedInformation) {

        const { category, type, monster } = selected;
        if(!monster) return { category, type, monster };

        const original = await fromUuid(monster.uuid);
        const isUnlinked = !Boolean(original);
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
                const item = {
                    ...action,
                    traits: action.system.traits.value.map(trait => ({ 
                        ...trait, 
                        value: game.i18n.localize(CONFIG.PF2E.actionTraits[trait.value]), 
                        description: game.i18n.localize(CONFIG.PF2E.traitsDescriptions[trait.value]),
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
                    for(var damageKey of Object.keys(monster.items[actionKey].system.damageRolls)){
                        const damage = monster.items[actionKey].system.damageRolls[damageKey];
                        damageLabel = damageLabel.concat(`${damageLabel ? ' + ' : ''}${damage.damage} ${damage.damageType.value}`);
                        const damageRollHelper = new Roll(damage.damage);
                        
                        damageInstances.push({ label: damage.damage, average: getRollAverage(damageRollHelper.terms), type: { ...damage.damageType, revealed: detailedInformation.damageTypes ? damage.damageType.revealed : true }, quality: damage.category, _id: damageKey  });
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
                        traits: monster.items[actionKey].system.traits.value.map(trait => ({
                            label: game.i18n.localize(CONFIG.PF2E.npcAttackTraits[trait.value]),
                            description: CONFIG.PF2E.traitsDescriptions[trait.value],
                            revealed: detailedInformation.attackTraits ? trait.revealed : true,
                        })).filter(trait => trait.name !== 'attack'),
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
                },
                isUnlinked: isUnlinked,
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
        context.detailedInformation = game.settings.get('pf2e-bestiary-tracking', 'detailed-information-toggles');
        context.useTokenArt = game.settings.get('pf2e-bestiary-tracking', 'use-token-art');
        context.contrastRevealedState = game.settings.get('pf2e-bestiary-tracking', 'contrast-revealed-state');
        context.vagueDescriptions = foundry.utils.deepClone(await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions'));

        context.user = game.user;
        context.vagueDescriptions.settings.playerBased = game.user.isGM ? false : context.vagueDescriptions.settings.playerBased;
        context.playerLevel = game.user.character ? game.user.character.system.details.level.value : null;
        context.search = this.search;

        context.selected = foundry.utils.deepClone(this.selected);
        context.selected = await this.prepareData(context.selected, context.vagueDescriptions.settings.playerBased ? context.playerLevel : null, context.vagueDescriptions, context.detailedInformation);
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

    static async handleTokenNames(monster){
        if(game.settings.get('pf2e-bestiary-tracking', 'hide-token-names')){
            // Make workbench mystify if active and newValue = hidden
            // var workBenchMystifierUsed = game.modules.get("xdy-pf2e-workbench")?.active && game.settings.get('xdy-pf2e-workbench', 'npcMystifier');   
            const name = 
                monster.name.revealed && monster.name.custom ? monster.name.custom : 
                monster.name.revealed && !monster.name.custom ? monster.name.value :
                !monster.name.revealed ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown") : null;

            if(name) {
                for(var token of canvas.tokens.placeables.filter(x => x.document.baseActor.uuid === monster.uuid)){
                    await token.document.update({ name });
                }
            }
        }
    }

    static async toggleRevealed(event, button){
        if(!game.user.isGM) return;

        event.stopPropagation();

        const newValue = !foundry.utils.getProperty(this.bestiary.monster[this.selected.monster.uuid], `${button.dataset.path}.${button.dataset.key ?? 'revealed'}`);
        foundry.utils.setProperty(this.bestiary.monster[this.selected.monster.uuid], `${button.dataset.path}.${button.dataset.key ?? 'revealed'}`, newValue);

        if(button.dataset.path === 'name'){
            await PF2EBestiary.handleTokenNames(this.selected.monster);
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        this.render();

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });
    }

    static async toggleAllRevealed(_, button){
        if(!game.user.isGM) return;

        var values = Object.values(foundry.utils.getProperty(this.bestiary.monster[this.selected.monster.uuid], button.dataset.path));;
        var allRevealed = false;
        switch(button.dataset.type){
            case 'actions':
                values = values.filter(x => x.type === 'action' && x.system.actionType.value !== 'passive');
                allRevealed = values.every(x => x.revealed);
                break;
            case 'passives':
                values = values.filter(x => x.type === 'action' && x.system.actionType.value === 'passive');
                allRevealed = values.every(x => x.revealed);
                break;
            case 'perception':
                allRevealed = values.every(x => x.revealed) && this.bestiary.monster[this.selected.monster.uuid].system.perception.revealed;
                this.bestiary.monster[this.selected.monster.uuid].system.perception.revealed = !allRevealed;
                break;
            case 'speed':
                allRevealed = values.every(x => x.revealed) && this.bestiary.monster[this.selected.monster.uuid].system.attributes.speed.revealed;
                this.bestiary.monster[this.selected.monster.uuid].system.attributes.speed.revealed = !allRevealed;
            case 'spell-level':
                values = values.filter(spell => {
                    const isSpellOfEntry = spell.type === 'spell' && spell.system.location.value === button.dataset.entryValue;
                    if(isSpellOfEntry){
                        const isCantrip = spell.system.traits.value.includes("cantrip");
                        return button.dataset.spellLevel === 'Cantrips' ? isCantrip : !isCantrip && Number.parseInt(button.dataset.spellLevel) === spell.system.level.value;
                    }

                    return false;
                }); 
            default:
                allRevealed = values.every(x => x.revealed);
                break;
        }

        for(var key in values){
            values[key].revealed = !allRevealed;
        }

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        this.render();

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });
    }

    static async revealEverything(){
        await this.toggleEverythingRevealed(true);
        this.toggleControls(false);
    }

    static async hideEverything(){
        await this.toggleEverythingRevealed(false);
        this.toggleControls(false);
    }

    async toggleEverythingRevealed(revealed){
        if(!game.user.isGM) return;

        const monster = this.bestiary.monster[this.selected.monster.uuid];

        monster.name.revealed = revealed;
        monster.system.details.level.revealed = revealed;
        monster.system.attributes.ac.revealed = revealed;
        monster.system.attributes.hp.revealed = revealed;
        Object.values(monster.system.skills).forEach(skill => skill.revealed = revealed);

        Object.values(monster.system.attributes.immunities).forEach(immunity => {
            immunity.revealed = revealed;
            immunity.exceptions?.forEach(exception => exception.revealed = revealed);
        });
        Object.values(monster.system.attributes.weaknesses).forEach(weakness => {
            weakness.revealed = revealed;
            weakness.exceptions?.forEach(exception => exception.revealed = revealed);
        });
        Object.values(monster.system.attributes.resistances).forEach(resistance => {
            resistance.revealed = revealed;
            resistance.exceptions?.forEach(exception => exception.revealed = revealed);
            resistance.doubleVs?.forEach(double => double.revealed = revealed);
        });

        Object.values(monster.system.saves).forEach(save => save.revealed = revealed);

        monster.system.attributes.speed.revealed = revealed;
        Object.values(monster.system.attributes.speed.otherSpeeds).forEach(speed => speed.revealed = revealed);
        
        Object.values(monster.system.traits.value).forEach(trait => trait.revealed = revealed);

        Object.values(monster.system.abilities).forEach(ability => ability.revealed = revealed);

        monster.system.perception.revealed = revealed;
        Object.values(monster.system.perception.senses).forEach(sense => sense.revealed = revealed);

        Object.values(monster.system.details.languages.value).forEach(language => language.revealed = revealed);

        Object.keys(monster.system.actions).forEach(attackKey => {
            monster.system.actions[attackKey].revealed = revealed;
            monster.system.actions[attackKey].damageStatsRevealed = revealed;
            monster.items[attackKey].system.traits.value.forEach(trait => trait.revealed = revealed);
            Object.values(monster.items[attackKey].system.damageRolls).forEach(damage => damage.damageType.revealed = revealed)
        });

        Object.values(monster.items).forEach(item => {
            item.revealed = revealed;
            if(item.type === 'action'){
                item.system.traits.value.forEach(trait => trait.revealed = revealed);
            }
            if(item.type === 'spellcastingEntry'){
                item.system.spelldc.dc.revealed = revealed;
                item.system.spelldc.value.revealed = revealed;
            }
        })

        monster.system.details.publicNotes.revealed = revealed;
        monster.system.details.privateNotes.revealed = revealed;

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', this.bestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static getUpdatedCreature(creature, data){
        data.name = { ...data.name, revealed: creature.name.revealed, custom: creature.name.custom };
        data.system.details.level = { ...data.system.details.level, revealed: creature.system.details.level.revealed, custom: creature.system.details.level.custom };
        data.system.attributes.ac = { ...data.system.attributes.ac, revealed: creature.system.attributes.ac.revealed, custom: creature.system.attributes.ac.custom};
        data.system.attributes.hp = { ...data.system.attributes.hp, revealed: creature.system.attributes.hp.revealed, custom: creature.system.attributes.hp.custom};

        Object.keys(data.system.attributes.immunities).forEach(immunityKey => {
            const newImmunity = data.system.attributes.immunities[immunityKey];
            const oldImmunityKey = Object.keys(creature.system.attributes.immunities).find(x => x === immunityKey);
            if(oldImmunityKey) {
                const oldImmunity = creature.system.attributes.immunities[oldImmunityKey];
                newImmunity.revealed = oldImmunity.revealed;
                newImmunity.exceptions?.forEach(exception => {
                    const oldException = oldImmunity.exceptions.find(x => x.value === exception.value);
                    if(oldException) exception.revealed = oldException.revealed;
                });
            }
        });
        Object.keys(creature.system.attributes.immunities).forEach(immunityKey => {
            const immunity = creature.system.attributes.immunities[immunityKey];
            if(immunity.fake) data.system.attributes.immunities[immunityKey] = immunity;
        });

        Object.keys(data.system.attributes.weaknesses).forEach(weaknessKey => {
            const newWeakness = data.system.attributes.weaknesses[weaknessKey];
            const oldWeaknessKey = Object.keys(creature.system.attributes.weaknesses).find(x => x === weaknessKey);
            if(oldWeaknessKey) {
                const oldWeakness = creature.system.attributes.weaknesses[oldWeaknessKey];
                newWeakness.revealed = oldWeakness.revealed;
                newWeakness.exceptions?.forEach(exception => {
                    const oldException = oldWeakness.exceptions.find(x => x.value === exception.value);
                    if(oldException) exception.revealed = oldException.revealed;
                });
            }
        });
        Object.keys(creature.system.attributes.weaknesses).forEach(weaknessKey => {
            const weakness = creature.system.attributes.weaknesses[weaknessKey];
            if(weakness.fake) data.system.attributes.weaknesses[weaknessKey] = weakness;
        });

        Object.keys(data.system.attributes.resistances).forEach(resistanceKey => {
            const newResistance = data.system.attributes.resistances[resistanceKey];
            const oldResistanceKey = Object.keys(creature.system.attributes.resistances).find(x => x === resistanceKey);
            if(oldResistanceKey) {
                const oldResistance = creature.system.attributes.resistances[oldResistanceKey];
                newResistance.revealed = oldResistance.revealed;
                newResistance.exceptions?.forEach(exception => {
                    const oldException = oldResistance.exceptions.find(x => x.value === exception.value);
                    if(oldException) exception.revealed = oldException.revealed;
                });
                newResistance.doubleVs?.forEach(double => {
                    const oldDouble = oldResistance.doubleVs.find(x => x.value === double.value);
                    if(oldDouble) double.revealed = oldDouble.revealed;
                });
            }
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

                if(item.type === 'melee'){
                    item.system.traits.value = item.system.traits.value.map(trait => {
                        const oldTrait = creatureItem.system.traits.value.find(x => x.value === trait.value);
                        if(oldTrait) trait.revealed = oldTrait.revealed;

                        return trait;
                    });

                    Object.keys(item.system.damageRolls).forEach(damageKey => {
                        if(creatureItem.system.damageRolls[damageKey]){
                            item.system.damageRolls[damageKey].damageType = { ...item.system.damageRolls[damageKey].damageType, revealed: creatureItem.system.damageRolls[damageKey].damageType.revealed };
                        }
                    });
                }

                if(item.type === 'action'){
                    Object.values(item.system.traits.value).forEach(trait => {
                        const oldTrait = creatureItem.system.traits.value.find(x => x.value === trait.value);
                        if(oldTrait) trait.revealed = oldTrait.revealed;
                    });
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
        this.toggleControls(false);

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
        this.toggleControls(false);

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
            this.toggleControls(false);

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

    static async unlinkedDialog(){
        const confirmed = await Dialog.confirm({
            title: game.i18n.localize("PF2EBestiary.Bestiary.UnlinkedDialog.Title"),
            content: game.i18n.localize("PF2EBestiary.Bestiary.UnlinkedDialog.Content"),
            yes: () => true,
            no: () => false,
        });

        if(!confirmed) return;

        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        const unlinkedMonster = foundry.utils.deepClone(bestiary.monster[this.selected.monster.uuid]);
        const restoredObject = Object.keys(unlinkedMonster).reduce((acc, key) => {
            var baseField = bestiary.monster[this.selected.monster.uuid][key];
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
        bestiary.monster[newActor[0].uuid] = { ...bestiary.monster[this.selected.monster.uuid], uuid: newActor[0].uuid, _id: newActor[0].id };
        delete bestiary.monster[this.selected.monster.uuid];

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
        Hooks.callAll(socketEvent.UpdateBestiary, {});

        this.render();
    }

    async obscureData(event){
        if(!game.user.isGM || !event.currentTarget.dataset.name) return;

        const setValue = async (value) => {
            if(value){
                foundry.utils.setProperty(this.bestiary[this.selected.category][this.selected.monster.uuid], `${event.currentTarget.dataset.path}.custom`, value);

                if(event.currentTarget.dataset.path === 'name'){
                    await PF2EBestiary.handleTokenNames(this.selected.monster);
                }

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
            
            if(event.currentTarget.dataset.path === 'name'){
                await PF2EBestiary.handleTokenNames(this.selected.monster);
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
        const monster = await PF2EBestiary.getMonsterData(getBaseActor(item));
        if (!monster) return null;

        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        // We do not currently refresh already present creatures in the Bestiary.
        if(bestiary.monster[monster.uuid]) return false;

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

        const item = baseItem.pack ? await Actor.create(baseItem.toObject()) : baseItem;

        // Creature already in Bestiary.
        if(this.bestiary.monster[item.uuid]){
            await this.refreshCreature(item.uuid);
            return;
        }

        const monster = await PF2EBestiary.getMonsterData(item);
        const updatedBestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        updatedBestiary.monster[item.uuid] = monster;
        
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