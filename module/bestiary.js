
import { getCreaturesTypes, getExpandedCreatureTypes, getIWRString, getNPCCategories, isNPC, slugify } from "../scripts/helpers.js";
import { resetBestiary } from "../scripts/macros.js";
import { socketEvent } from "../scripts/socket.js";
import { getCategoryRange } from "../scripts/statisticsHelper.js";
import PF2EBestiarySavesHandler from "./savesHandler.js";
import { dispositions } from '../data/constants.js';
import Tagify from '@yaireo/tagify';
import { getCreatureData, getNPCData } from "../data/modelHelpers.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PF2EBestiary extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(page){
        super({});

        this.bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

        var monsterCreatureTypes = [];
        if(page) {
            if(page.type === 'pf2e-bestiary-tracking.npc'){
                monsterCreatureTypes = this.bestiary[category][monsterUuid].npcData.categories.length > 0 ? this.bestiary[category][monsterUuid].npcData.categories[0] : ['unaffiliated'];
            }
            else {
                monsterCreatureTypes = getCreaturesTypes(page.system.traits).map(x => x.key);
            }
        } 
        
        this.selected = {
            category: page?.type ?? 'pf2e-bestiary-tracking.creature',
            type: monsterCreatureTypes.length > 0 ? monsterCreatureTypes[0] : null,
            monster: page,
            abilities: [],
        };

        // Filter 0 = Alphebetic, 1 = by level
        // Direction 0 = Ascending, 1 = Descending
        this.search = {
            name: '',
        };

        this.npcData = {
            editMode: false,
            npcView: page?.type === 'npc' ? true : false,
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
            const traitsTagify = new Tagify(npcCategoryInput, {
                tagTextProp: "name",
                enforceWhitelist: true,
                whitelist : this.bestiary.getFlag('pf2e-bestiary-tracking', 'npcCategories'),
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
        for(var actionKey of Object.keys(selected.monster.system.actions)){
            const description = await TextEditor.enrichHTML(selected.monster.system.actions[actionKey].description);
            newActions[actionKey] = { ...selected.monster.system.actions[actionKey], description };
        }

        const newPassives = {};
        for(var passiveKey of Object.keys(selected.monster.system.passives)){
            const description = await TextEditor.enrichHTML(selected.monster.system.passives[passiveKey].description);
            newPassives[passiveKey] = { ...selected.monster.system.passives[passiveKey], description };
        }

        for(var entryKey in selected.monster.system.spells.entries){
            const entry = selected.monster.system.spells.entries[entryKey]
            for(var levelKey in entry.levels){
                for(var spellKey in entry.levels[levelKey].spells){
                    const spell = entry.levels[levelKey].spells[spellKey];
                    spell.description = { ...spell.description, value: await TextEditor.enrichHTML(spell.description.value) };
                }
            }
        }

        selected.monster.system.notes.public.value = await TextEditor.enrichHTML(selected.monster.system.notes.public.value);
        selected.monster.system.notes.private.value = await TextEditor.enrichHTML(selected.monster.system.notes.private.value);
        selected.monster.system.notes.player.enriched = await TextEditor.enrichHTML(selected.monster.system.notes.player.value);
        selected.monster.system.actions = newActions;
        selected.monster.system.passives = newPassives;

        if(selected.monster.type === 'pf2e-bestiary-tracking.npc'){
            selected.monster.system.npcData.general.background.enrichedValue = await TextEditor.enrichHTML(selected.monster.system.npcData.general.background.value);
        }
    }

    getBookmarks(){
        const bookmarks = this.selected.category === 'pf2e-bestiary-tracking.creature' ? getExpandedCreatureTypes() : getNPCCategories();

        const creatureReduce = (acc, creature) => {
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
        };

        const npcReduce = (acc, npc) => {
            const categories = npc.system.npcData.categories;
            var usedCategories = categories.length > 0 ? categories.map(x => x.value) : ['unaffiliated'];
            
            for(var category of usedCategories){
                acc.find(x => x.value === category)?.values?.push({
                    id: npc.id, 
                    name: npc.system.name, 
                    hidden: npc.system.hidden,
                    img: npc.system.displayImage,
                });
            }

            return acc;
        };

        return !this.selected.category ? [] : this.bestiary.pages.filter(entity => {
            if(entity.type !== this.selected.category || (!game.user.isGM && entity.system.hidden)) return false;

            const unknownLabel = this.selected.category === 'pf2e-bestiary-tracking.creature' ? 'PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature' : 'PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated';
            const match = entity.system.name.value.toLowerCase().match(this.search.name.toLowerCase());
            const unrevealedMatch = game.i18n.localize(unknownLabel).toLowerCase().match(this.search.name.toLowerCase());
            if(!this.search.name || ((entity.system.name.revealed || game.user.isGM) && match) || (!entity.system.name.revealed && !game.user.isGM && unrevealedMatch)) {
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
        }).reduce(this.selected.category === 'pf2e-bestiary-tracking.creature' ? creatureReduce : npcReduce, bookmarks);
        
    }
    
    async _prepareContext(_options) {
        var context = await super._prepareContext(_options);

        context = await this.sharedPreparation(context);
        context.bookmarks = this.getBookmarks();
        context.bookmarkEntities = this.selected.type ? context.bookmarks.find(x => x.value === this.selected.type).values : [];

        if(this.selected.category === 'pf2e-bestiary-tracking.npc'){
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
        await this.enrichTexts(context.selected);

        context.typeTitle = this.selected.type ? 
            this.selected.category === 'pf2e-bestiary-tracking.monster' ? game.i18n.format("PF2EBestiary.Bestiary.CategoryView.EmptyText", { category: getExpandedCreatureTypes().find(x => x.value === this.selected.type).name }) : 
            this.selected.category === 'pf2e-bestiary-tracking.npc' ? game.i18n.format("PF2EBestiary.Bestiary.CategoryView.EmptyCategoryText", { category: getNPCCategories().find(x => x.value === this.selected.type).name}) : '' : '';

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
        context.npcCategories = this.bestiary.flags['pf2e-bestiary-tracking'].npcCategories;
        context.inputCategories = this.selected.monster ? this.selected.monster.system.npcData.categories.map(x => x.name) : [];

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
        for(var npc of this.bestiary.pages.filter(page => page.system.npcData?.categories.includes(event.currentTarget.dataset.bookmark))){
            await npc.update({ "system.npcData.categories": npc.system.npcData.categories.filter(x => x === event.currentTarget.dataset.bookmark) });
        }

        await this.bestiary.setFlag('pf2e-bestiary-tracking', 'npcCategories', this.bestiary.getFlag('pf2e-bestiary-tracking', 'npcCategories').filter(x => x.value === event.currentTarget.dataset.bookmark));

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    static selectMonster(_, button){
        this.selected.monster = this.bestiary.pages.get(button.dataset.monster);
        this.npcData.npcView = this.selected.monster.type === 'pf2e-bestiary-tracking.npc' ? true : false;
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
        await this.selected.monster.update({ "system.npcData.categories": Object.values(categories).map(x => ({ value: x.value, name: x.name })) });

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

                if(game.combat){
                    await game.combat.combatants.find(x => x.token.baseActor.uuid === monster.system.uuid).update({ name: name });
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

        if(path === 'system.name'){
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

        for(var bestiaryPage of this.bestiary.pages){
            await bestiaryPage.system.refreshData();
        }

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

            await this.bestiary.setFlag('pf2e-bestiary-tracking', 'npcCategories', [...this.bestiary.getFlag('pf2e-bestiary-tracking', 'npcCategories'), { value: categoryKey, name: this.npcData.newCategory.text }]);
            this.npcData.newCategory.text = null;

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

    // static async unlinkedDialog(){
    //     const confirmed = await Dialog.confirm({
    //         title: game.i18n.localize("PF2EBestiary.Bestiary.UnlinkedDialog.Title"),
    //         content: game.i18n.localize("PF2EBestiary.Bestiary.UnlinkedDialog.Content"),
    //         yes: () => true,
    //         no: () => false,
    //     });

    //     if(!confirmed) return;

    //     const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    //     const category = isNPC(this.selected.monster) ? 'npc' : 'monster';
    //     const unlinkedMonster = foundry.utils.deepClone(bestiary[category][this.selected.monster.uuid]);
    //     const restoredObject = Object.keys(unlinkedMonster).reduce((acc, key) => {
    //         var baseField = bestiary[category][this.selected.monster.uuid][key];
    //         switch(key){
    //             case 'uuid':
    //             case '_id':
    //                 break;
    //             case 'name':
    //                 acc[key] = baseField.value;
    //                 break;
    //             case 'system':
    //                 baseField.traits.value = Object.keys(baseField.traits.value);
    //                 baseField.attributes.immunities = Object.keys(baseField.attributes.immunities).filter(x => x !== 'none').map(key => ({ 
    //                     ...baseField.attributes.immunities[key],
    //                     exceptions: baseField.attributes.immunities[key].exceptions.map(exception => exception.value),
    //                 }));
    //                 baseField.attributes.weaknesses = Object.keys(baseField.attributes.weaknesses).filter(x => x !== 'none').map(key => ({ 
    //                     ...baseField.attributes.weaknesses[key],
    //                     exceptions: baseField.attributes.weaknesses[key].exceptions.map(exception => exception.value),
    //                 }));
    //                 baseField.attributes.resistances = Object.keys(baseField.attributes.resistances).filter(x => x !== 'none').map(key => ({ 
    //                     ...baseField.attributes.resistances[key],
    //                     exceptions: baseField.attributes.resistances[key].exceptions.map(exception => exception.value),
    //                     doubleVs: baseField.attributes.resistances[key].doubleVs.map(double => double.value),
    //                 }));

    //                 baseField.perception.details = baseField.perception.details.value;

    //                 baseField.details.languages.value = baseField.details.languages.value.map(x => x.value);
    //                 baseField.details.languages.details = baseField.details.languages.details.value; 

    //                 acc[key] = baseField;
    //                 break;
    //             case 'items':
    //                 baseField = Object.keys(baseField).reduce((acc, fieldKey) => {
    //                     const { revealed, ...rest } = baseField[fieldKey];

    //                     if(['Passive-None', 'Action-None', 'Attack-None', 'Spell-None'].includes(rest._id)){
    //                         return acc;
    //                     }

    //                     if(rest.system.traits?.value){
    //                         const keys = Object.keys(rest.system.traits.value);
    //                         if(keys.length > 0 && rest.system.traits.value[keys[0]].value){
    //                             rest.system.traits.value = keys.map(x => rest.system.traits.value[x].value);
    //                         }
    //                     }

    //                     if(rest.system.damageRolls){
    //                         Object.values(rest.system.damageRolls).forEach(damage => {
    //                             damage.damageType = damage.damageType.value;
    //                             if(typeof damage.kinds === 'object') Object.values(damage.kinds).reduce((acc, kind) => {
    //                                 acc.push(kind);
    //                                 return acc;
    //                             }, []) 
    //                         });
    //                     }

    //                     if(rest.type === 'equipment'){
    //                         const { damageRolls, ...systemRest } = rest.system;
    //                         rest.system = systemRest;
    //                     }

    //                     if(rest.type === 'spell'){
    //                         Object.values(rest.system.damage).forEach(damage => {
    //                             if(typeof damage.kinds === 'object') {
    //                                 damage.kinds =  Object.values(damage.kinds).reduce((acc, kind) => {
    //                                     acc.push(kind);
    //                                     return acc;
    //                                 }, []);
    //                             }
    //                         })
    //                     }

    //                     if(rest.type === 'spellEntry'){

    //                     }

    //                     acc.push({
    //                         ...rest,
    //                     });

    //                     return acc;
    //                 }, []);

    //                 acc[key] = baseField;
    //                 break;
    //             default:
    //                 acc[key] = baseField;
    //         }

    //         return acc;
    //     }, {});

    //     const newActor = await Actor.implementation.create([restoredObject]);
    //     bestiary[category][newActor[0].uuid] = { ...bestiary[category][this.selected.monster.uuid], uuid: newActor[0].uuid, _id: newActor[0].id };
    //     delete bestiary[category][this.selected.monster.uuid];

    //     await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
    //     Hooks.callAll(socketEvent.UpdateBestiary, {});

    //     this.render();
    // }

    async obscureData(event){
        if(!game.user.isGM || !event.currentTarget.dataset.name) return;

        const setValue = async (value) => {
            if(value){
                await this.selected.monster.update({ [`${event.currentTarget.dataset.path}.custom`]: value });

                if(event.currentTarget.dataset.path === 'system.name'){
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

            if(event.currentTarget.dataset.path === 'system.name'){
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
        const { system, ...rest } = foundry.utils.expandObject(formData.object);
        const simpleFields = foundry.utils.flattenObject(rest);

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
        const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

        // We do not currently refresh already present creatures in the Bestiary.
        if(bestiary.pages.some(x => x.system.uuid === item.uuid)) return false;

        await bestiary.createEmbeddedDocuments("JournalEntryPage", [getCreatureData(item)]);
        
        const doubleClickOpenActivated = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
        if(doubleClickOpenActivated && item.ownership.default < 1){
            await item.update({ "ownership.default": 1 });
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});

        return true;
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

        const item = baseItem.pack ? await Actor.implementation.create(baseItem.toObject()) : baseItem;

        const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
        const existingPage = bestiary.pages.find(x => x.system.uuid === item.uuid);
        if(existingPage){
            await existingPage.system.refreshData(item);
        } else {
            const pageData = isNPC(item) ? getNPCData(item) : getCreatureData(item);
            await bestiary.createEmbeddedDocuments("JournalEntryPage", [pageData]);
        }

        const doubleClickOpenActivated = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
        if(doubleClickOpenActivated){
            const ownership = item.ownership.default > 1 ? item.ownership.default : 1;
            await item.update({ "ownership.default": ownership });
        }
  
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    onBestiaryUpdate = async () => {        
        this.bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
        const existingEntity = this.selected.monster ? this.bestiary.pages.get(this.selected.monster.id) ?? this.bestiary.pages.find(x => x.system.uuid === this.selected.monster.system.uuid) ?? null : null;
        if(!existingEntity) this.selected.monster = null;

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