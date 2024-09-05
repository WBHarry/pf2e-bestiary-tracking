const slugify = (name) => {
    return name.toLowerCase().replaceAll(' ', '-').replaceAll('.','');
};

const getMultiplesString = (mutliple) => {
    return mutliple.reduce((acc, curr, index) => acc.concat(`${index !== 0 ? index === mutliple.length-1 ? ' or ' : ', ' : ''}${curr}`), '');
};

const getIWRString = (base, isResistance) => { // Mangled. Wtf.
    const baseString = base.type;
    const doubleVsString = base.doubleVs?.length > 0 ? `double ${isResistance ? 'resistance' : 'weakness'} ${getMultiplesString(base.doubleVs)}` : '';
    const exceptionsString = base.exceptions?.length > 0 ? `except ${getMultiplesString(base.exceptions)}` : '';

    return `${baseString}${doubleVsString || exceptionsString ? ` (${exceptionsString}${doubleVsString ? ';' : ''}${doubleVsString})` : ''}`
};

const getCreaturesTypes = (traits, onlyActive) => {
    const creatureTypes = getExpandedCreatureTypes();
    const types = Object.values(traits).reduce((acc, trait) => {
        const typeMatch = creatureTypes.find(x => x.value === trait.value);
        if(typeMatch) acc.push({key: typeMatch.value, revealed: trait.revealed, name: typeMatch.name});

        return acc;
    }, []);

    return onlyActive ? types.filter(x => x.revealed) : types; 
};

const getExpandedCreatureTypes = () => {
    const allTypes = [
        ...Object.keys(CONFIG.PF2E.creatureTypes).map(type => ({ value: type, name: game.i18n.localize(CONFIG.PF2E.creatureTypes[type]), values: [] })),
        ...game.settings.get('pf2e-bestiary-tracking', 'additional-creature-types').map(type => ({ value: type.value, name: game.i18n.localize(type.name), values: [] })),
    ].sort((a, b) => {
        if(a.name < b.name) return -1;
        else if(a.name > b.name) return 1;
        else return 0;
    });

    return [{ value: 'unknown', name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown"), values: [] }, ...allTypes];
};

const getNPCCategories = () => {
    const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
    const categories = bestiary.getFlag('pf2e-bestiary-tracking', 'npcCategories');
    return [
        { value: 'unaffiliated', name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated"), values: [] },
        ...categories.reduce((acc, category) => {
            acc.push({ value: category.value, name: category.name, values: [] });
            return acc;
        }, []),
    ];
};

const getBaseActor = (actor) => {
    return actor.token ? actor.token.document ? actor.token.document.baseActor :  actor.token.baseActor : actor;
};

const isNPC = (data) => {
    if(data.type === 'pf2e-bestiary-tracking.npc') return true;
    if(data.type === 'pf2e-bestiary-tracking.creature' || data.type === 'pf2e-bestiary-tracking.hazard') return false;

    const npcRegistration = game.settings.get('pf2e-bestiary-tracking', 'npc-registration');
    return npcRegistration === 0 ? data.system.traits.rarity === 'unique' : Object.values(data.system.traits.value).find(x => x.value ? x.value === 'npc' : x === 'npc');
};

const getSpellLevel = (spell, creatureLevel) => {
    return spell.system.traits.value.includes("cantrip") ? 'Cantrips' : spell.system.location.heightenedLevel ?? spell.system.cast.focusPoints ? Math.ceil(creatureLevel / 2) : spell.system.level.value;
};

function handleSocketEvent({action=null, data={}}={}) {
    switch (action) {
        case socketEvent.UpdateBestiary:
            Hooks.callAll(socketEvent.UpdateBestiary, { monsterSlug: data.monsterSlug });
            break;
    }
}
  
const socketEvent = {
    UpdateBestiary: "UpdateBestiary",
};

const openBestiary = async () => {
    new PF2EBestiary().render(true);
};

const showMonster = () => {
    const selectedMonster = game.user.targets.size > 0 ? game.user.targets.values().next().value : 
        canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0]
         : null;

    if(!selectedMonster) 
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoTarget"));
        return;
    }

    if(!selectedMonster.actor){
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoActor"));
        return;
    }

    if(selectedMonster.actor.type !== 'npc' || selectedMonster.actor.hasPlayerOwner){
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"));
        return;
    }

    const actor = selectedMonster.document ? selectedMonster.document.baseActor : selectedMonster.baseActor;
    const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
    const page = bestiary.pages.find(x => x.system.uuid === actor.uuid);

    if(!page)
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"));
        return;
    }

    new PF2EBestiary(page).render(true);
};

const addMonster = async () => {
    if(!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.AddMonster.GMOnly"));
        return;
    }

    const selectedMonster = game.user.targets.size > 0 ? game.user.targets.values().next().value : 
    canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0]
    : null;

    if(!selectedMonster) 
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoTarget"));
        return;
    }

    if(selectedMonster.actor.type !== 'npc' || selectedMonster.actor.hasPlayerOwner){
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"));
        return;
    }

    const baseActor = selectedMonster.document ? selectedMonster.document.baseActor : selectedMonster.baseActor;
    const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

    if(bestiary.pages.some(x => x.system.uuid === baseActor.uuid))
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.AddMonster.TargetAlreadyInBestiary"));
        return;
    }

    const successfull = await PF2EBestiary.addMonster(baseActor);
    if(successfull){
        ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AddedToBestiary', { creatures: selectedMonster.actor.name }));
    }
    else if(successfull === false){
        ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary', { creatures: selectedMonster.actor.name }));
    }    
};

const resetBestiary = async () => {
    if(!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.AddMonster.GMOnly"));
        return;
    }

    const confirmed = await Dialog.confirm({
        title: game.i18n.localize("PF2EBestiary.Macros.ResetBestiary.Title"),
        content: game.i18n.localize("PF2EBestiary.Macros.ResetBestiary.Text"),
        yes: () => true,
        no: () => false,
    });

    if(!confirmed) return;

    for(var page of game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking')).pages){
        await page.delete();
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: { },
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});

    return true;
};

const deactivateModule = async () => {
    if(!game.user.isGM){
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.GMOnly"));
        return;
    }

    const link = await TextEditor.enrichHTML(game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Text.Link"));
    const content = `
        <div>${game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Text.FirstPart")}</div>
        <hr />
        <div>${game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Text.SecondPart")}</div>
        <div style="margin-bottom: 8px;">(${link})</div>
    `;
    
    const confirmed = await Dialog.confirm({
        title: game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Title"),
        content: content,
        yes: () => true,
        no: () => false,
    });

    if(!confirmed) return;

    const bestiaries = game.journal.filter(x => x.pages.some(x => ["pf2e-bestiary-tracking.creature", "pf2e-bestiary-tracking.npc", "pf2e-bestiary-tracking.hazard"].includes(x.type)));
    for(var bestiaryKey in bestiaries){
        const pageArray = Array.from(bestiaries[bestiaryKey].pages);
        for(var pageKey in pageArray){
            const page = pageArray[pageKey];
            await page.setFlag('pf2e-bestiary-tracking', 'deactivated-data', JSON.stringify({
                type: page.type,
                name: page.name,
                ownership: foundry.utils.deepClone(page.ownership),
                system: foundry.utils.deepClone(page.system)
            }));
            await page.update({ 
                type: 'text',
                ownership: { default: 0 },
                system: {} 
            }, { diff: false, recursive: false });
        }
    }

    await game.settings.set("core", "moduleConfiguration", {
        ...game.settings.get("core", "moduleConfiguration"),
        ['pf2e-bestiary-tracking']: false,
    });

    await game.socket.emit("reload");
    foundry.utils.debouncedReload();
};

var macros = /*#__PURE__*/Object.freeze({
    __proto__: null,
    addMonster: addMonster,
    deactivateModule: deactivateModule,
    openBestiary: openBestiary,
    resetBestiary: resetBestiary,
    showMonster: showMonster
});

const rangeOptions = ['extreme', 'high', 'moderate', 'low', 'terrible'];

const savingThrowPerceptionTable = {
    range: ['extreme', 'high', 'moderate', 'low', 'terrible'],
    values: {
        "-1": {
            extreme: 9,
            high: 8,
            moderate: 5,
            low: 2,
            terrible: 0 
        },
        '0': {
            extreme: 10,
            high: 9,
            moderate: 6,
            low: 3,
            terrible: 1 
        },
        '1': {
            extreme: 11,
            high: 10,
            moderate: 7,
            low: 4,
            terrible: 2  
        },
        '2': {
            extreme: 12,
            high: 11,
            moderate: 8,
            low: 5,
            terrible: 3 
        },
        '3': {
            extreme: 14,
            high: 12,
            moderate: 9,
            low: 6,
            terrible: 4 
        },
        '4': {
            extreme: 15,
            high: 14,
            moderate: 11,
            low: 8,
            terrible: 6 
        },
        '5': {
            extreme: 17,
            high: 15,
            moderate: 12,
            low: 9,
            terrible: 7 
        },
        '6': {
            extreme: 18,
            high: 17,
            moderate: 14,
            low: 11,
            terrible: 8 
        },
        '7': {
            extreme: 20,
            high: 18,
            moderate: 15,
            low: 12,
            terrible: 10 
        },
        '8': {
            extreme: 21,
            high: 19,
            moderate: 16,
            low: 13,
            terrible: 11 
        },
        '9': {
            extreme: 23,
            high: 21,
            moderate: 18,
            low: 15,
            terrible: 12 
        },
        '10': {
            extreme: 24,
            high: 22,
            moderate: 19,
            low: 16,
            terrible: 14 
        },
        '11': {
            extreme: 26,
            high: 24,
            moderate: 21,
            low: 18,
            terrible: 15 
        },
        '12': {
            extreme: 27,
            high: 25,
            moderate: 22,
            low: 19,
            terrible: 16 
        },
        '13': {
            extreme: 29,
            high: 26,
            moderate: 23,
            low: 20,
            terrible: 18 
        },
        '14': {
            extreme: 30,
            high: 28,
            moderate: 25,
            low: 22,
            terrible: 19 
        },
        '15': {
            extreme: 32,
            high: 29,
            moderate: 26,
            low: 23,
            terrible: 20 
        },
        '16': {
            extreme: 33,
            high: 30,
            moderate: 28,
            low: 26,
            terrible: 22 
        },
        '17': {
            extreme: 35,
            high: 32,
            moderate: 29,
            low: 26,
            terrible: 23 
        },
        '18': {
            extreme: 36,
            high: 33,
            moderate: 30,
            low: 27,
            terrible: 24 
        },
        '19': {
            extreme: 38,
            high: 35,
            moderate: 32,
            low: 29,
            terrible: 26 
        },
        '20': {
            extreme: 39,
            high: 36,
            moderate: 33,
            low: 30,
            terrible: 27 
        },
        '21': {
            extreme: 41,
            high: 38,
            moderate: 35,
            low: 32,
            terrible: 28 
        },
        '22': {
            extreme: 43,
            high: 39,
            moderate: 36,
            low: 33,
            terrible: 30 
        },
        '23': {
            extreme: 44,
            high: 40,
            moderate: 37,
            low: 34,
            terrible: 31 
        },
        '24': {
            extreme: 46,
            high: 42,
            moderate: 38,
            low: 36,
            terrible: 32 
        },
    }
};

const acTable = {
    range: ['extreme', 'high', 'moderate', 'low'],
    values: {
        "-1": {
            extreme: 18,
            high: 15,
            moderate: 14,
            low: 12
        },
        '0': {
            extreme: 19,
            high: 16,
            moderate: 15,
            low: 13,
        },
        '1': {
            extreme: 19,
            high: 16,
            moderate: 15,
            low: 13,
        },
        '2': {
            extreme: 21,
            high: 18,
            moderate: 17,
            low: 15,
        },
        '3': {
            extreme: 22,
            high: 19,
            moderate: 18,
            low: 16,
        },
        '4': {
            extreme: 24,
            high: 21,
            moderate: 20,
            low: 18,
        },
        '5': {
            extreme: 25,
            high: 25,
            moderate: 21,
            low: 19,
        },
        '6': {
            extreme: 27,
            high: 24,
            moderate: 23,
            low: 21,
        },
        '7': {
            extreme: 28,
            high: 25,
            moderate: 24,
            low: 22,
        },
        '8': {
            extreme: 30,
            high: 27,
            moderate: 26,
            low: 24,
        },
        '9': {
            extreme: 31,
            high: 28,
            moderate: 27,
            low: 25,
        },
        '10': {
            extreme: 33,
            high: 30,
            moderate: 29,
            low: 27,
        },
        '11': {
            extreme: 34,
            high: 31,
            moderate: 30,
            low: 28,
        },
        '12': {
            extreme: 36,
            high: 33,
            moderate: 32,
            low: 30,
        },
        '13': {
            extreme: 37,
            high: 34,
            moderate: 33,
            low: 31,
        },
        '14': {
            extreme: 39,
            high: 36,
            moderate: 35,
            low: 33,
        },
        '15': {
            extreme: 40,
            high: 37,
            moderate: 36,
            low: 34,
        },
        '16': {
            extreme: 43,
            high: 40,
            moderate: 39,
            low: 37,
        },
        '17': {
            extreme: 43,
            high: 40,
            moderate: 39,
            low: 37,
        },
        '18': {
            extreme: 45,
            high: 42,
            moderate: 41,
            low: 39,
        },
        '19': {
            extreme: 46,
            high: 43,
            moderate: 42,
            low: 40,
        },
        '20': {
            extreme: 48,
            high: 45,
            moderate: 44,
            low: 42,
        },
        '21': {
            extreme: 49,
            high: 46,
            moderate: 45,
            low: 43,
        },
        '22': {
            extreme: 51,
            high: 48,
            moderate: 47,
            low: 45,
        },
        '23': {
            extreme: 52,
            high: 49,
            moderate: 48,
            low: 46,
        },
        '24': {
            extreme: 54,
            high: 51,
            moderate: 50,
            low: 48,
        },
    }
};

const hpTable = {
    range: ['high', 'moderate', 'low'],
    values: {
        "-1": {
            high: { high: 9, low: 9 },
            moderate: { high: 8, low: 7 },
            low: { high: 6, low: 5 },
        },
        '0': {
            high: { high: 20, low: 17 },
            moderate: { high: 16, low: 14 },
            low: { high: 13, low: 11 },
        },
        '1': {
            high: { high: 26, low: 24 },
            moderate: { high: 21, low: 19 },
            low: { high: 16, low: 14 },
        },
        '2': {
            high: { high: 40, low: 36 },
            moderate: { high: 32, low: 28 },
            low: { high: 25, low: 21 },
        },
        '3': {
            high: { high: 59, low: 53 },
            moderate: { high: 48, low: 42 },
            low: { high: 37, low: 31 },
        },
        '4': {
            high: { high: 78, low: 72 },
            moderate: { high: 63, low: 57 },
            low: { high: 48, low: 42 },
        },
        '5': {
            high: { high: 97, low: 91 },
            moderate: { high: 78, low: 72 },
            low: { high: 59, low: 53 },
        },
        '6': {
            high: { high: 123, low: 115 },
            moderate: { high: 99, low: 91 },
            low: { high: 75, low: 67 },
        },
        '7': {
            high: { high: 148, low: 140 },
            moderate: { high: 119, low: 111 },
            low: { high: 90, low: 82 },
        },
        '8': {
            high: { high: 173, low: 165 },
            moderate: { high: 139, low: 131 },
            low: { high: 105, low: 97 },
        },
        '9': {
            high: { high: 198, low: 190 },
            moderate: { high: 159, low: 151 },
            low: { high: 120, low: 112 },
        },
        '10': {
            high: { high: 223, low: 215 },
            moderate: { high: 179, low: 171 },
            low: { high: 135, low: 127 },
        },
        '11': {
            high: { high: 248, low: 240 },
            moderate: { high: 199, low: 191 },
            low: { high: 150, low: 142 },
        },
        '12': {
            high: { high: 273, low: 265 },
            moderate: { high: 219, low: 211 },
            low: { high: 165, low: 157 },
        },
        '13': {
            high: { high: 298, low: 290 },
            moderate: { high: 239, low: 231 },
            low: { high: 180, low: 172 },
        },
        '14': {
            high: { high: 323, low: 315 },
            moderate: { high: 259, low: 251 },
            low: { high: 195, low: 187 },
        },
        '15': {
            high: { high: 348, low: 340 },
            moderate: { high: 279, low: 271 },
            low: { high: 210, low: 202 },
        },
        '16': {
            high: { high: 373, low: 365 },
            moderate: { high: 299, low: 291 },
            low: { high: 225, low: 217 },
        },
        '17': {
            high: { high: 398, low: 390 },
            moderate: { high: 319, low: 311 },
            low: { high: 240, low: 232 },
        },
        '18': {
            high: { high: 423, low: 415 },
            moderate: { high: 339, low: 331 },
            low: { high: 255, low: 247 },
        },
        '19': {
            high: { high: 448, low: 440 },
            moderate: { high: 359, low: 351 },
            low: { high: 270, low: 262 },
        },
        '20': {
            high: { high: 473, low: 465 },
            moderate: { high: 379, low: 371 },
            low: { high: 285, low: 277 },
        },
        '21': {
            high: { high: 505, low: 495 },
            moderate: { high: 405, low: 395 },
            low: { high: 305, low: 295 },
        },
        '22': {
            high: { high: 544, low: 532 },
            moderate: { high: 436, low: 424 },
            low: { high: 329, low: 317 },
        },
        '23': {
            high: { high: 581, low: 569 },
            moderate: { high: 466, low: 454 },
            low: { high: 351, low: 339 },
        },
        '24': {
            high: { high: 633, low: 617 },
            moderate: { high: 508, low: 492 },
            low: { high: 383, low: 367 },
        },
    }
};

const attributeTable = {
    range: ["extreme", "high", "moderate", "low"],
    values: {
        "-1": {
            extreme: null,
            high: 3,
            moderate: 2,
            low: 0,
        },
        '0': {
            extreme: null,
            high: 3,
            moderate: 2,
            low: 0,
        },
        '1': {
            extreme: 5,
            high: 4,
            moderate: 3,
            low: 1,
        },
        '2': {
            extreme: 5,
            high: 4,
            moderate: 3,
            low: 1,
        },
        '3': {
            extreme: 5,
            high: 4,
            moderate: 3,
            low: 1,
        },
        '4': {
            extreme: 6,
            high: 5,
            moderate: 3,
            low: 2,
        },
        '5': {
            extreme: 6,
            high: 5,
            moderate: 4,
            low: 2,
        },
        '6': {
            extreme: 7,
            high: 5,
            moderate: 4,
            low: 2,
        },
        '7': {
            extreme: 7,
            high: 6,
            moderate: 4,
            low: 2,
        },
        '8': {
            extreme: 7,
            high: 6,
            moderate: 4,
            low: 3,
        },
        '9': {
            extreme: 7,
            high: 6,
            moderate: 4,
            low: 3,
        },
        '10': {
            extreme: 8,
            high: 7,
            moderate: 5,
            low: 3,
        },
        '11': {
            extreme: 8,
            high: 7,
            moderate: 5,
            low: 3,
        },
        '12': {
            extreme: 8,
            high: 7,
            moderate: 5,
            low: 3,
        },
        '13': {
            extreme: 9,
            high: 8,
            moderate: 5,
            low: 4,
        },
        '14': {
            extreme: 9,
            high: 8,
            moderate: 5,
            low: 4,
        },
        '15': {
            extreme: 9,
            high: 8,
            moderate: 6,
            low: 4,
        },
        '16': {
            extreme: 10,
            high: 9,
            moderate: 6,
            low: 5,
        },
        '17': {
            extreme: 10,
            high: 9,
            moderate: 6,
            low: 5,
        },
        '18': {
            extreme: 10,
            high: 9,
            moderate: 6,
            low: 5,
        },
        '19': {
            extreme: 11,
            high: 10,
            moderate: 6,
            low: 5,
        },
        '20': {
            extreme: 11,
            high: 10,
            moderate: 7,
            low: 6,
        },
        '21': {
            extreme: 11,
            high: 10,
            moderate: 7,
            low: 6,
        },
        '22': {
            extreme: 11,
            high: 10,
            moderate: 8,
            low: 6,
        },
        '23': {
            extreme: 11,
            high: 10,
            moderate: 8,
            low: 6,
        },
        '24': {
            extreme: 13,
            high: 12,
            moderate: 9,
            low: 7,
        },
    }
};

const skillTable = {
    range: ["extreme", "high", "moderate", "low"],
    values: {
        "-1": {
            extreme: 8,
            high: 5,
            moderate: 4,
            low: {
                high: 2,
                low: 1,
            },
        },
        '0': {
            extreme: 9,
            high: 6,
            moderate: 5,
            low: {
                high: 3,
                low: 2,
            },
        },
        '1': {
            extreme: 10,
            high: 7,
            moderate: 6,
            low: {
                high: 4,
                low: 3,
            },
        },
        '2': {
            extreme: 11,
            high: 8,
            moderate: 7,
            low: {
                high: 5,
                low: 4,
            },
        },
        '3': {
            extreme: 13,
            high: 10,
            moderate: 9,
            low: {
                high: 7,
                low: 5,
            },
        },
        '4': {
            extreme: 15,
            high: 12,
            moderate: 10,
            low: {
                high: 8,
                low: 7,
            },
        },
        '5': {
            extreme: 16,
            high: 13,
            moderate: 12,
            low: {
                high: 10,
                low: 8,
            },
        },
        '6': {
            extreme: 18,
            high: 15,
            moderate: 13,
            low: {
                high: 11,
                low: 9,
            },
        },
        '7': {
            extreme: 20,
            high: 17,
            moderate: 15,
            low: {
                high: 13,
                low: 11,
            },
        },
        '8': {
            extreme: 21,
            high: 18,
            moderate: 16,
            low: {
                high: 14,
                low: 12,
            },
        },
        '9': {
            extreme: 23,
            high: 20,
            moderate: 18,
            low: {
                high: 16,
                low: 13,
            },
        },
        '10': {
            extreme: 25,
            high: 22,
            moderate: 19,
            low: {
                high: 17,
                low: 15,
            },
        },
        '11': {
            extreme: 26,
            high: 23,
            moderate: 21,
            low: {
                high: 19,
                low: 16,
            },
        },
        '12': {
            extreme: 28,
            high: 25,
            moderate: 22,
            low: {
                high: 20,
                low: 17,
            },
        },
        '13': {
            extreme: 30,
            high: 27,
            moderate: 24,
            low: {
                high: 22,
                low: 19,
            },
        },
        '14': {
            extreme: 31,
            high: 28,
            moderate: 25,
            low: {
                high: 23,
                low: 20,
            },
        },
        '15': {
            extreme: 33,
            high: 30,
            moderate: 27,
            low: {
                high: 25,
                low: 21,
            },
        },
        '16': {
            extreme: 35,
            high: 32,
            moderate: 28,
            low: {
                high: 26,
                low: 23,
            },
        },
        '17': {
            extreme: 36,
            high: 33,
            moderate: 30,
            low: {
                high: 28,
                low: 24,
            },
        },
        '18': {
            extreme: 38,
            high: 35,
            moderate: 31,
            low: {
                high: 29,
                low: 25,
            },
        },
        '19': {
            extreme: 40,
            high: 37,
            moderate: 33,
            low: {
                high: 31,
                low: 27,
            },
        },
        '20': {
            extreme: 41,
            high: 38,
            moderate: 34,
            low: {
                high: 32,
                low: 28,
            },
        },
        '21': {
            extreme: 43,
            high: 40,
            moderate: 36,
            low: {
                high: 34,
                low: 29,
            },
        },
        '22': {
            extreme: 45,
            high: 42,
            moderate: 37,
            low: {
                high: 35,
                low: 31,
            },
        },
        '23': {
            extreme: 46,
            high: 43,
            moderate: 38,
            low: {
                high: 36,
                low: 32,
            },
        },
        '24': {
            extreme: 48,
            high: 45,
            moderate: 40,
            low: {
                high: 38,
                low: 33,
            },
        },
    }
};

const weaknessTable = {
    range: ["high", "low"],
    values: {
        '-1': {
            high: 1,
            low: 1,
        },
        '0': {
            high: 3,
            low: 1,
        },
        '1': {
            high: 3,
            low: 2,
        },
        '2': {
            high: 5,
            low: 2,
        },
        '3': {
            high: 6,
            low: 3,
        },
        '4': {
            high: 7,
            low: 4,
        },
        '5': {
            high: 8,
            low: 4,
        },
        '6': {
            high: 9,
            low: 5,
        },
        '7': {
            high: 10,
            low: 5,
        },
        '8': {
            high: 11,
            low: 6,
        },
        '9': {
            high: 12,
            low: 6,
        },
        '10': {
            high: 13,
            low: 7,
        },
        '11': {
            high: 14,
            low: 7,
        },
        '12': {
            high: 15,
            low: 8,
        },
        '13': {
            high: 16,
            low: 8,
        },
        '14': {
            high: 17,
            low: 9,
        },
        '15': {
            high: 18,
            low: 9,
        },
        '16': {
            high: 19,
            low: 9,
        },
        '17': {
            high: 19,
            low: 10,
        },
        '18': {
            high: 20,
            low: 10,
        },
        '19': {
            high: 21,
            low: 11,
        },
        '20': {
            high: 22,
            low: 11,
        },
        '21': {
            high: 23,
            low: 12,
        },
        '22': {
            high: 24,
            low: 12,
        },
        '23': {
            high: 25,
            low: 13,
        },
        '24': {
            high: 26,
            low: 13,
        }
    }
};

const attackTable = {
    range: ["extreme", "high", "moderate", "low"],
    values: {
        "-1": {
            extreme: 10,
            high: 8,
            moderate: 6,
            low: 4,
        },
        '0': {
            extreme: 10,
            high: 8,
            moderate: 6,
            low: 4,
        },
        '1': {
            extreme: 11,
            high: 9,
            moderate: 7,
            low: 5,
        },
        '2': {
            extreme: 13,
            high: 11,
            moderate: 9,
            low: 7,
        },
        '3': {
            extreme: 14,
            high: 12,
            moderate: 10,
            low: 8,
        },
        '4': {
            extreme: 16,
            high: 14,
            moderate: 12,
            low: 9,
        },
        '5': {
            extreme: 17,
            high: 15,
            moderate: 13,
            low: 11,
        },
        '6': {
            extreme: 19,
            high: 17,
            moderate: 15,
            low: 12,
        },
        '7': {
            extreme: 20,
            high: 18,
            moderate: 16,
            low: 13,
        },
        '8': {
            extreme: 22,
            high: 20,
            moderate: 18,
            low: 15,
        },
        '9': {
            extreme: 23,
            high: 21,
            moderate: 19,
            low: 16,
        },
        '10': {
            extreme: 25,
            high: 23,
            moderate: 21,
            low: 17,
        },
        '11': {
            extreme: 27,
            high: 24,
            moderate: 22,
            low: 19,
        },
        '12': {
            extreme: 28,
            high: 26,
            moderate: 24,
            low: 20,
        },
        '13': {
            extreme: 29,
            high: 27,
            moderate: 25,
            low: 21,
        },
        '14': {
            extreme: 31,
            high: 29,
            moderate: 27,
            low: 23,
        },
        '15': {
            extreme: 32,
            high: 30,
            moderate: 28,
            low: 24,
        },
        '16': {
            extreme: 34,
            high: 32,
            moderate: 30,
            low: 25,
        },
        '17': {
            extreme: 35,
            high: 33,
            moderate: 31,
            low: 27,
        },
        '18': {
            extreme: 37,
            high: 35,
            moderate: 33,
            low: 28,
        },
        '19': {
            extreme: 38,
            high: 36,
            moderate: 34,
            low: 29,
        },
        '20': {
            extreme: 40,
            high: 38,
            moderate: 36,
            low: 31,
        },
        '21': {
            extreme: 41,
            high: 39,
            moderate: 37,
            low: 32,
        },
        '22': {
            extreme: 43,
            high: 41,
            moderate: 39,
            low: 33,
        },
        '23': {
            extreme: 44,
            high: 42,
            moderate: 40,
            low: 35,
        },
        '24': {
            extreme: 46,
            high: 44,
            moderate: 42,
            low: 36,
        },
    }
};

const damageTable = {
    range: ["extreme", "high", "moderate", "low"],
    values: {
        "-1": {
            extreme: 4,
            high: 3,
            moderate: 3,
            low: 2,
        },
        '0': {
            extreme: 6,
            high: 5,
            moderate: 4,
            low: 3,
        },
        '1': {
            extreme: 8,
            high: 6,
            moderate: 5,
            low: 4,
        },
        '2': {
            extreme: 11,
            high: 9,
            moderate: 8,
            low: 6,
        },
        '3': {
            extreme: 15,
            high: 12,
            moderate: 10,
            low: 8,
        },
        '4': {
            extreme: 18,
            high: 14,
            moderate: 12,
            low: 9,
        },
        '5': {
            extreme: 20,
            high: 16,
            moderate: 13,
            low: 11,
        },
        '6': {
            extreme: 23,
            high: 18,
            moderate: 15,
            low: 12,
        },
        '7': {
            extreme: 25,
            high: 20,
            moderate: 17,
            low: 13,
        },
        '8': {
            extreme: 28,
            high: 22,
            moderate: 18,
            low: 15,
        },
        '9': {
            extreme: 30,
            high: 24,
            moderate: 20,
            low: 16,
        },
        '10': {
            extreme: 33,
            high: 26,
            moderate: 22,
            low: 17,
        },
        '11': {
            extreme: 35,
            high: 28,
            moderate: 23,
            low: 19,
        },
        '12': {
            extreme: 38,
            high: 30,
            moderate: 25,
            low: 20,
        },
        '13': {
            extreme: 40,
            high: 32,
            moderate: 27,
            low: 21,
        },
        '14': {
            extreme: 43,
            high: 34,
            moderate: 28,
            low: 23,
        },
        '15': {
            extreme: 45,
            high: 36,
            moderate: 30,
            low: 24,
        },
        '16': {
            extreme: 48,
            high: 37,
            moderate: 31,
            low: 25,
        },
        '17': {
            extreme: 50,
            high: 38,
            moderate: 32,
            low: 26,
        },
        '18': {
            extreme: 53,
            high: 40,
            moderate: 33,
            low: 27,
        },
        '19': {
            extreme: 55,
            high: 42,
            moderate: 35,
            low: 28,
        },
        '20': {
            extreme: 58,
            high: 44,
            moderate: 37,
            low: 29,
        },
        '21': {
            extreme: 60,
            high: 46,
            moderate: 38,
            low: 31,
        },
        '22': {
            extreme: 63,
            high: 48,
            moderate: 40,
            low: 32,
        },
        '23': {
            extreme: 65,
            high: 50,
            moderate: 42,
            low: 33,
        },
        '24': {
            extreme: 68,
            high: 52,
            moderate: 44,
            low: 35,
        },
    }
};

const spellDCTable = {
    range: ["extreme", "high", "moderate"],
    values: {
        "-1": {
            extreme: 19,
            high: 16,
            moderate: 13,
        },
        '0': {
            extreme: 19,
            high: 16,
            moderate: 13,
        },
        '1': {
            extreme: 29,
            high: 17,
            moderate: 14,
        },
        '2': {
            extreme: 22,
            high: 18,
            moderate: 15,
        },
        '3': {
            extreme: 23,
            high: 20,
            moderate: 17,
        },
        '4': {
            extreme: 25,
            high: 21,
            moderate: 18,
        },
        '5': {
            extreme: 26,
            high: 22,
            moderate: 19,
        },
        '6': {
            extreme: 27,
            high: 24,
            moderate: 21,
        },
        '7': {
            extreme: 29,
            high: 25,
            moderate: 22,
        },
        '8': {
            extreme: 30,
            high: 26,
            moderate: 23, 
        },
        '9': {
            extreme: 32,
            high: 28,
            moderate: 25,
        },
        '10': {
            extreme: 33,
            high: 29,
            moderate: 26,
        },
        '11': {
            extreme: 34,
            high: 30,
            moderate: 27,
        },
        '12': {
            extreme: 36,
            high: 32,
            moderate: 29,
        },
        '13': {
            extreme: 37,
            high: 33,
            moderate: 30,
        },
        '14': {
            extreme: 39,
            high: 34,
            moderate: 31,
        },
        '15': {
            extreme: 40,
            high: 36,
            moderate: 33,
        },
        '16': {
            extreme: 41,
            high: 37,
            moderate: 34,
        },
        '17': {
            extreme: 43,
            high: 38,
            moderate: 35,
        },
        '18': {
            extreme: 44,
            high: 40,
            moderate: 37,
        },
        '19': {
            extreme: 46,
            high: 41,
            moderate: 38,
        },
        '20': {
            extreme: 47,
            high: 42,
            moderate: 39,
        },
        '21': {
            extreme: 48,
            high: 44,
            moderate: 41,
        },
        '22': {
            extreme: 50,
            high: 45,
            moderate: 42,
        },
        '23': {
            extreme: 51,
            high: 46,
            moderate: 43,
        },
        '24': {
            extreme: 52,
            high: 48,
            moderate: 45,
        },
    }
};

const spellAttackTable = {
    range: ["extreme", "high", "moderate"],
    values: {
        "-1": {
            extreme: 11,
            high: 8,
            moderate: 5,
        },
        '0': {
            extreme: 11,
            high: 8,
            moderate: 5,
        },
        '1': {
            extreme: 12,
            high: 9,
            moderate: 6,
        },
        '2': {
            extreme: 14,
            high: 10,
            moderate: 7,
        },
        '3': {
            extreme: 15,
            high: 12,
            moderate: 9,
        },
        '4': {
            extreme: 17,
            high: 13,
            moderate: 10,
        },
        '5': {
            extreme: 18,
            high: 14,
            moderate: 11,
        },
        '6': {
            extreme: 19,
            high: 16,
            moderate: 13,
        },
        '7': {
            extreme: 21,
            high: 17,
            moderate: 14,
        },
        '8': {
            extreme: 22,
            high: 18,
            moderate: 15, 
        },
        '9': {
            extreme: 24,
            high: 29,
            moderate: 17,
        },
        '10': {
            extreme: 25,
            high: 21,
            moderate: 18,
        },
        '11': {
            extreme: 26,
            high: 22,
            moderate: 19,
        },
        '12': {
            extreme: 28,
            high: 24,
            moderate: 21,
        },
        '13': {
            extreme: 29,
            high: 25,
            moderate: 22,
        },
        '14': {
            extreme: 31,
            high: 26,
            moderate: 23,
        },
        '15': {
            extreme: 32,
            high: 28,
            moderate: 25,
        },
        '16': {
            extreme: 33,
            high: 29,
            moderate: 26,
        },
        '17': {
            extreme: 43,
            high: 30,
            moderate: 27,    
        },
        '18': {
            extreme: 44,
            high: 32,
            moderate: 29,
        },
        '19': {
            extreme: 46,
            high: 33,
            moderate: 30,
        },
        '20': {
            extreme: 47,
            high: 34,
            moderate: 31,
        },
        '21': {
            extreme: 48,
            high: 36,
            moderate: 33,
        },
        '22': {
            extreme: 50,
            high: 37,
            moderate: 34,
        },
        '23': {
            extreme: 51,
            high: 38,
            moderate: 35,
        },
        '24': {
            extreme: 52,
            high: 40,
            moderate: 37,
        },
    }
};

const getCategoryLabel = (statisticsTable, level, save, short) => {
    if(!save) return save;

    const { range, values } = statisticsTable;
    const tableRow = values[level];

    if(save > tableRow[range[0]]) return getCategoryLabelValue(range, 'extreme', short);
    if(save < tableRow[range[range.length-1]]) return getCategoryLabelValue(range, 'terrible', short);
  
    var value = null;
    for(var category in tableRow) {
        const rowValue = tableRow[category];
        if(!value || (Math.abs(rowValue - save) < value.diff)){
            value = {  
                category: category,
                diff: Math.abs(rowValue - save),
            };
        }
    }

    return getCategoryLabelValue(range, value.category, short);
};

const getMixedCategoryLabel = (statisticsTable, level, save, short) => {
    const { range, values } = statisticsTable;
    const tableRow = values[level];

    const maxCategory = tableRow[range[0]];
    const minCategory = tableRow[range[range.length-1]];
    if(value > (maxCategory.high??maxCategory)) return getCategoryLabelValue(range, 'extreme');
    if(value < (minCategory.low??minCategory)) return getCategoryLabelValue(range, 'terrible');

    var value = null;
    for(var category in tableRow) {
        const rowValue = tableRow[category]?.high ? Math.min(Math.abs(tableRow[category].high - save), Math.abs(tableRow[category].low - save)) : Math.abs(tableRow[category] - save);
        if(!value || rowValue < value.diff){
            value = {  
                category: category,
                diff: rowValue,
            };
        }
    }

    return getCategoryLabelValue(range, value.category, short);
};

const getCategoryFromIntervals = (intervalTable, level, value) => {
    const { range, values } = intervalTable;
    const tableRow = values[level];

    if(value > tableRow[range[0]].high) return getCategoryLabelValue(range, 'extreme');
    if(value < tableRow[range[range.length-1]].low) return getCategoryLabelValue(range, 'terrible');

    return getCategoryLabelValue(range, Object.keys(tableRow).find(x => value <= tableRow[x].high && value >= tableRow[x].low));
};

Object.keys(weaknessTable).reduce((acc, key) => {
    const baseValues = weaknessTable[key];
    acc[key] = { ...baseValues, moderate: Math.floor(baseValues.low + (baseValues.high - baseValues.low)/2) };

    return acc;
}, {});

const getCategoryLabelValue = (range, category, short) => {
    while(!range.find(x => x === category)){
        const currentIndex = rangeOptions.indexOf(category);

        if(currentIndex > range.length-1) category = rangeOptions[currentIndex-1];
        else category = rangeOptions[currentIndex+1];
    }

    const { vagueDescriptions } = game.settings.get('pf2e-bestiary-tracking', 'bestiary-labels');
    switch(category){
        case 'extreme':
            return short ? vagueDescriptions.short.extreme : vagueDescriptions.full.extreme;
        case 'high':
            return short ? vagueDescriptions.short.high : vagueDescriptions.full.high;
        case 'moderate':
            return short ? vagueDescriptions.short.moderate : vagueDescriptions.full.moderate;
        case 'low':
            return short ? vagueDescriptions.short.low : vagueDescriptions.full.low;
        case 'terrible':
            return short ? vagueDescriptions.short.terrible : vagueDescriptions.full.terrible;
    }
};

const getCategoryRange = async (name) => {
    const { vagueDescriptions } = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-labels');
    switch(name){
        case 'ac':
            return acTable.range.map(category => vagueDescriptions.full[category]);
        case 'hp':
            return hpTable.range.map(category => vagueDescriptions.full[category]);
        case 'attributes':
            return attributeTable.range.map(category => vagueDescriptions.full[category]);
        case 'saves':
            return savingThrowPerceptionTable.range.map(category => vagueDescriptions.short[category]);
        case 'perception':
            return savingThrowPerceptionTable.range.map(category => vagueDescriptions.full[category]);
        case 'skills':
            return skillTable.range.map(category => vagueDescriptions.short[category]);
    }
};

const getRollAverage = (terms) => {
        var total = 0;
        var currentOperator = null;
        for(var i = 0; i < terms.length; i++){
            var term = terms[i];

            //Pool, string and function terms should not be applicable to damage rolls in pf2e
            if(term.operator){
                currentOperator = term.operator;
            }
            else if(term.faces){
                total = applyRollOperator(total, currentOperator, getDiceAverage(term.faces, term.number));
            }
            else if(term.number){
                total = applyRollOperator(total, currentOperator, term.number);
            }
            else if(term.terms){
                total = applyRollOperator(total, currentOperator, getRollAverage(term.terms));
            }
        }

        return total;
};

const applyRollOperator = (total, operator, value) => {
    switch(operator){
        case '+':
            return total+value;
        case '-':
            return total-value;
        case '/': 
            return total/value;
        case '*':
            return total*value;
        default: 
            return value;
    }
};

const getDiceAverage = (faces, number) => {
    var oddDice = 0, pairs = 0;
    switch(faces){
        case 10:
            if(number === 1) return 6;
        case 12:
            if(number === 1) return 7;
        default:
            oddDice = number % 2;
            pairs = (number - oddDice)/2;
            return pairs*(faces/2 + (faces/2+1)) + (oddDice ? faces/2 : 0);

    }
};

const dispositions = {
    helpful: { value: 'helpful', name: 'PF2EBestiary.Bestiary.NPC.Disposition.Helpful' },
    friendly: { value: 'friendly', name: 'PF2EBestiary.Bestiary.NPC.Disposition.Friendly' },
    indifferent: { value: 'indifferent', name: 'PF2EBestiary.Bestiary.NPC.Disposition.Indifferent' },
    unfriendly: { value: 'unfriendly', name: 'PF2EBestiary.Bestiary.NPC.Disposition.Unfriendly' },
    hostile: { value: 'hostile', name: 'PF2EBestiary.Bestiary.NPC.Disposition.Hostile' }
};

/*
Tagify v4.27.0 - tags input component
By: Yair Even-Or <vsync.design@gmail.com>
https://github.com/yairEO/tagify

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

This Software may not be rebranded and sold as a library under any other name
other than "Tagify" (by owner) or as part of another library.
*/

var t="&#8203;";function e(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function i(t){return function(t){if(Array.isArray(t))return e(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,i){if(!t)return;if("string"==typeof t)return e(t,i);var n=Object.prototype.toString.call(t).slice(8,-1);"Object"===n&&t.constructor&&(n=t.constructor.name);if("Map"===n||"Set"===n)return Array.from(n);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return e(t,i)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}var n={isEnabled:function(){var t;return null===(t=window.TAGIFY_DEBUG)||void 0===t||t},log:function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];var s;this.isEnabled()&&(s=console).log.apply(s,["[Tagify]:"].concat(i(e)));},warn:function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];var s;this.isEnabled()&&(s=console).warn.apply(s,["[Tagify]:"].concat(i(e)));}},s=function(t,e,i,n){return t=""+t,e=""+e,n&&(t=t.trim(),e=e.trim()),i?t==e:t.toLowerCase()==e.toLowerCase()},a=function(t,e){return t&&Array.isArray(t)&&t.map((function(t){return o(t,e)}))};function o(t,e){var i,n={};for(i in t)e.indexOf(i)<0&&(n[i]=t[i]);return n}function r(t){var e=document.createElement("div");return t.replace(/\&#?[0-9a-z]+;/gi,(function(t){return e.innerHTML=t,e.innerText}))}function l(t){return (new DOMParser).parseFromString(t.trim(),"text/html").body.firstElementChild}function d(t,e){for(e=e||"previous";t=t[e+"Sibling"];)if(3==t.nodeType)return t}function c(t){return "string"==typeof t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/`|'/g,"&#039;"):t}function u(t){var e=Object.prototype.toString.call(t).split(" ")[1].slice(0,-1);return t===Object(t)&&"Array"!=e&&"Function"!=e&&"RegExp"!=e&&"HTMLUnknownElement"!=e}function g(t,e,i){var n,s;function a(t,e){for(var i in e)if(e.hasOwnProperty(i)){if(u(e[i])){u(t[i])?a(t[i],e[i]):t[i]=Object.assign({},e[i]);continue}if(Array.isArray(e[i])){t[i]=Object.assign([],e[i]);continue}t[i]=e[i];}}return n=t,(null!=(s=Object)&&"undefined"!=typeof Symbol&&s[Symbol.hasInstance]?s[Symbol.hasInstance](n):n instanceof s)||(t={}),a(t,e),i&&a(t,i),t}function h(){var t=[],e={},i=!0,n=!1,s=void 0;try{for(var a,o=arguments[Symbol.iterator]();!(i=(a=o.next()).done);i=!0){var r=a.value,l=!0,d=!1,c=void 0;try{for(var g,h=r[Symbol.iterator]();!(l=(g=h.next()).done);l=!0){var p=g.value;u(p)?e[p.value]||(t.push(p),e[p.value]=1):t.includes(p)||t.push(p);}}catch(t){d=!0,c=t;}finally{try{l||null==h.return||h.return();}finally{if(d)throw c}}}}catch(t){n=!0,s=t;}finally{try{i||null==o.return||o.return();}finally{if(n)throw s}}return t}function p(t){return String.prototype.normalize?"string"==typeof t?t.normalize("NFD").replace(/[\u0300-\u036f]/g,""):void 0:t}var f=function(){return /(?=.*chrome)(?=.*android)/i.test(navigator.userAgent)};function m(){return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,(function(t){return (t^crypto.getRandomValues(new Uint8Array(1))[0]&15>>t/4).toString(16)}))}function v(t){return t&&t.classList&&t.classList.contains(this.settings.classNames.tag)}function b(t){return t&&t.closest(this.settings.classNames.tagSelector)}function w(t,e){var i=window.getSelection();return e=e||i.getRangeAt(0),"string"==typeof t&&(t=document.createTextNode(t)),e&&(e.deleteContents(),e.insertNode(t)),t}function y(t,e,i){return t?(e&&(t.__tagifyTagData=i?e:g({},t.__tagifyTagData||{},e)),t.__tagifyTagData):(n.warn("tag element doesn't exist",{tagElm:t,data:e}),e)}function T(t){if(t&&t.parentNode){var e=t,i=window.getSelection(),n=i.getRangeAt(0);i.rangeCount&&(n.setStartAfter(e),n.collapse(!0),i.removeAllRanges(),i.addRange(n));}}function O(t,e){t.forEach((function(t){if(y(t.previousSibling)||!t.previousSibling){var i=document.createTextNode("​");t.before(i),e&&T(i);}}));}var x$1={delimiters:",",pattern:null,tagTextProp:"value",maxTags:1/0,callbacks:{},addTagOnBlur:!0,addTagOn:["blur","tab","enter"],onChangeAfterBlur:!0,duplicates:!1,whitelist:[],blacklist:[],enforceWhitelist:!1,userInput:!0,focusable:!0,keepInvalidTags:!1,createInvalidTags:!0,mixTagsAllowedAfter:/,|\.|\:|\s/,mixTagsInterpolator:["[[","]]"],backspace:!0,skipInvalid:!1,pasteAsTags:!0,editTags:{clicks:2,keepInvalid:!0},transformTag:function(){},trim:!0,a11y:{focusableTags:!1},mixMode:{insertAfterTag:" "},autoComplete:{enabled:!0,rightKey:!1,tabKey:!1},classNames:{namespace:"tagify",mixMode:"tagify--mix",selectMode:"tagify--select",input:"tagify__input",focus:"tagify--focus",tagNoAnimation:"tagify--noAnim",tagInvalid:"tagify--invalid",tagNotAllowed:"tagify--notAllowed",scopeLoading:"tagify--loading",hasMaxTags:"tagify--hasMaxTags",hasNoTags:"tagify--noTags",empty:"tagify--empty",inputInvalid:"tagify__input--invalid",dropdown:"tagify__dropdown",dropdownWrapper:"tagify__dropdown__wrapper",dropdownHeader:"tagify__dropdown__header",dropdownFooter:"tagify__dropdown__footer",dropdownItem:"tagify__dropdown__item",dropdownItemActive:"tagify__dropdown__item--active",dropdownItemHidden:"tagify__dropdown__item--hidden",dropdownItemSelected:"tagify__dropdown__item--selected",dropdownInital:"tagify__dropdown--initial",tag:"tagify__tag",tagText:"tagify__tag-text",tagX:"tagify__tag__removeBtn",tagLoading:"tagify__tag--loading",tagEditing:"tagify__tag--editable",tagFlash:"tagify__tag--flash",tagHide:"tagify__tag--hide"},dropdown:{classname:"",enabled:2,maxItems:10,searchKeys:["value","searchBy"],fuzzySearch:!0,caseSensitive:!1,accentedSearch:!0,includeSelectedTags:!1,escapeHTML:!0,highlightFirst:!0,closeOnSelect:!0,clearOnSelect:!0,position:"all",appendTarget:null},hooks:{beforeRemoveTag:function(){return Promise.resolve()},beforePaste:function(){return Promise.resolve()},suggestionClick:function(){return Promise.resolve()},beforeKeyDown:function(){return Promise.resolve()}}};function D(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function S(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){D(t,e,i[e]);}));}return t}function I(t,e){return e=null!=e?e:{},Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),i.push.apply(i,n);}return i}(Object(e)).forEach((function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i));})),t}function M(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function E(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function N(t){return function(t){if(Array.isArray(t))return M(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return M(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return M(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function _(){for(var t in this.dropdown={},this._dropdown)this.dropdown[t]="function"==typeof this._dropdown[t]?this._dropdown[t].bind(this):this._dropdown[t];this.dropdown.refs(),this.DOM.dropdown.__tagify=this;}var A,C,k,L=(A=function(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){E(t,e,i[e]);}));}return t}({},{events:{binding:function(){var t=!(arguments.length>0&&void 0!==arguments[0])||arguments[0],e=this.dropdown.events.callbacks,i=this.listeners.dropdown=this.listeners.dropdown||{position:this.dropdown.position.bind(this,null),onKeyDown:e.onKeyDown.bind(this),onMouseOver:e.onMouseOver.bind(this),onMouseLeave:e.onMouseLeave.bind(this),onClick:e.onClick.bind(this),onScroll:e.onScroll.bind(this)},n=t?"addEventListener":"removeEventListener";"manual"!=this.settings.dropdown.position&&(document[n]("scroll",i.position,!0),window[n]("resize",i.position),window[n]("keydown",i.onKeyDown)),this.DOM.dropdown[n]("mouseover",i.onMouseOver),this.DOM.dropdown[n]("mouseleave",i.onMouseLeave),this.DOM.dropdown[n]("mousedown",i.onClick),this.DOM.dropdown.content[n]("scroll",i.onScroll);},callbacks:{onKeyDown:function(t){var e=this;if(this.state.hasFocus&&!this.state.composing){var i=this.settings,s=this.DOM.dropdown.querySelector(i.classNames.dropdownItemActiveSelector),a=this.dropdown.getSuggestionDataByNode(s),o="mix"==i.mode,r="select"==i.mode;i.hooks.beforeKeyDown(t,{tagify:this}).then((function(l){switch(t.key){case"ArrowDown":case"ArrowUp":case"Down":case"Up":t.preventDefault();var d=e.dropdown.getAllSuggestionsRefs(),c="ArrowUp"==t.key||"Up"==t.key;s&&(s=e.dropdown.getNextOrPrevOption(s,!c)),s&&s.matches(i.classNames.dropdownItemSelector)||(s=d[c?d.length-1:0]),e.dropdown.highlightOption(s,!0);break;case"Escape":case"Esc":e.dropdown.hide();break;case"ArrowRight":if(e.state.actions.ArrowLeft||i.autoComplete.rightKey)return;case"Tab":var u=!i.autoComplete.rightKey||!i.autoComplete.tabKey;if(!o&&!r&&s&&u&&!e.state.editing&&a){t.preventDefault();var g=e.dropdown.getMappedValue(a);return e.input.autocomplete.set.call(e,g),!1}return !0;case"Enter":t.preventDefault(),i.hooks.suggestionClick(t,{tagify:e,tagData:a,suggestionElm:s}).then((function(){if(s)return e.dropdown.selectOption(s),s=e.dropdown.getNextOrPrevOption(s,!c),void e.dropdown.highlightOption(s);e.dropdown.hide(),o||e.addTags(e.state.inputText.trim(),!0);})).catch((function(t){return n.warn(t)}));break;case"Backspace":if(o||e.state.editing.scope)return;var h=e.input.raw.call(e);""!=h&&8203!=h.charCodeAt(0)||(!0===i.backspace?e.removeTags():"edit"==i.backspace&&setTimeout(e.editTag.bind(e),0));}}));}},onMouseOver:function(t){var e=t.target.closest(this.settings.classNames.dropdownItemSelector);this.dropdown.highlightOption(e);},onMouseLeave:function(t){this.dropdown.highlightOption();},onClick:function(t){var e=this;if(0==t.button&&t.target!=this.DOM.dropdown&&t.target!=this.DOM.dropdown.content){var i=t.target.closest(this.settings.classNames.dropdownItemSelector),s=this.dropdown.getSuggestionDataByNode(i);this.state.actions.selectOption=!0,setTimeout((function(){return e.state.actions.selectOption=!1}),50),this.settings.hooks.suggestionClick(t,{tagify:this,tagData:s,suggestionElm:i}).then((function(){i?e.dropdown.selectOption(i,t):e.dropdown.hide();})).catch((function(t){return n.warn(t)}));}},onScroll:function(t){var e=t.target,i=e.scrollTop/(e.scrollHeight-e.parentNode.clientHeight)*100;this.trigger("dropdown:scroll",{percentage:Math.round(i)});}}},refilter:function(t){t=t||this.state.dropdown.query||"",this.suggestedListItems=this.dropdown.filterListItems(t),this.dropdown.fill(),this.suggestedListItems.length||this.dropdown.hide(),this.trigger("dropdown:updated",this.DOM.dropdown);},getSuggestionDataByNode:function(t){for(var e,i=t&&t.getAttribute("value"),n=this.suggestedListItems.length;n--;){if(u(e=this.suggestedListItems[n])&&e.value==i)return e;if(e==i)return {value:e}}},getNextOrPrevOption:function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],i=this.dropdown.getAllSuggestionsRefs(),n=i.findIndex((function(e){return e===t}));return e?i[n+1]:i[n-1]},highlightOption:function(t,e){var i,n=this.settings.classNames.dropdownItemActive;if(this.state.ddItemElm&&(this.state.ddItemElm.classList.remove(n),this.state.ddItemElm.removeAttribute("aria-selected")),!t)return this.state.ddItemData=null,this.state.ddItemElm=null,void this.input.autocomplete.suggest.call(this);i=this.dropdown.getSuggestionDataByNode(t),this.state.ddItemData=i,this.state.ddItemElm=t,t.classList.add(n),t.setAttribute("aria-selected",!0),e&&(t.parentNode.scrollTop=t.clientHeight+t.offsetTop-t.parentNode.clientHeight),this.settings.autoComplete&&(this.input.autocomplete.suggest.call(this,i),this.dropdown.position());},selectOption:function(t,e){var i=this,n=this.settings,s=n.dropdown,a=s.clearOnSelect,o=s.closeOnSelect;if(!t)return this.addTags(this.state.inputText,!0),void(o&&this.dropdown.hide());e=e||{};var r=t.getAttribute("value"),l="noMatch"==r,d="mix"==n.mode,c=this.suggestedListItems.find((function(t){var e;return (null!==(e=t.value)&&void 0!==e?e:t)==r}));if(this.trigger("dropdown:select",{data:c,elm:t,event:e}),r&&(c||l)){if(this.state.editing){var u=this.normalizeTags([c])[0];c=n.transformTag.call(this,u)||u,this.onEditTagDone(null,g({__isValid:!0},c));}else this[d?"addMixTags":"addTags"]([c||this.input.raw.call(this)],a);(d||this.DOM.input.parentNode)&&(setTimeout((function(){i.DOM.input.focus(),i.toggleFocusClass(!0);})),o&&setTimeout(this.dropdown.hide.bind(this)),t.addEventListener("transitionend",(function(){i.dropdown.fillHeaderFooter(),setTimeout((function(){t.remove(),i.dropdown.refilter();}),100);}),{once:!0}),t.classList.add(this.settings.classNames.dropdownItemHidden));}else o&&setTimeout(this.dropdown.hide.bind(this));},selectAll:function(t){this.suggestedListItems.length=0,this.dropdown.hide(),this.dropdown.filterListItems("");var e=this.dropdown.filterListItems("");return t||(e=this.state.dropdown.suggestions),this.addTags(e,!0),this},filterListItems:function(t,e){var i,n,s,a,o,r,l=function(){var t,l,d=void 0,c=void 0;t=m[y],n=(null!=(l=Object)&&"undefined"!=typeof Symbol&&l[Symbol.hasInstance]?l[Symbol.hasInstance](t):t instanceof l)?m[y]:{value:m[y]};var v,b=!Object.keys(n).some((function(t){return w.includes(t)}))?["value"]:w;g.fuzzySearch&&!e.exact?(a=b.reduce((function(t,e){return t+" "+(n[e]||"")}),"").toLowerCase().trim(),g.accentedSearch&&(a=p(a),r=p(r)),d=0==a.indexOf(r),c=a===r,v=a,s=r.toLowerCase().split(" ").every((function(t){return v.includes(t.toLowerCase())}))):(d=!0,s=b.some((function(t){var i=""+(n[t]||"");return g.accentedSearch&&(i=p(i),r=p(r)),g.caseSensitive||(i=i.toLowerCase()),c=i===r,e.exact?i===r:0==i.indexOf(r)}))),o=!g.includeSelectedTags&&i.isTagDuplicate(u(n)?n.value:n),s&&!o&&(c&&d?f.push(n):"startsWith"==g.sortby&&d?h.unshift(n):h.push(n));},d=this,c=this.settings,g=c.dropdown,h=(e=e||{},[]),f=[],m=c.whitelist,v=g.maxItems>=0?g.maxItems:1/0,b=g.includeSelectedTags||"select"==c.mode,w=g.searchKeys,y=0;if(!(t="select"==c.mode&&this.value.length&&this.value[0][c.tagTextProp]==t?"":t)||!w.length)return h=b?m:m.filter((function(t){return !d.isTagDuplicate(u(t)?t.value:t)})),this.state.dropdown.suggestions=h,h.slice(0,v);for(r=g.caseSensitive?""+t:(""+t).toLowerCase();y<m.length;y++)i=this,l();return this.state.dropdown.suggestions=f.concat(h),"function"==typeof g.sortby?g.sortby(f.concat(h),r):f.concat(h).slice(0,v)},getMappedValue:function(t){var e=this.settings.dropdown.mapValueTo;return e?"function"==typeof e?e(t):t[e]||t.value:t.value},createListHTML:function(t){var e=this;return g([],t).map((function(t,i){"string"!=typeof t&&"number"!=typeof t||(t={value:t});var n=e.dropdown.getMappedValue(t);return n="string"==typeof n&&e.settings.dropdown.escapeHTML?c(n):n,e.settings.templates.dropdownItem.apply(e,[I(S({},t),{mappedValue:n}),e])})).join("")}}),C=null!=(C={refs:function(){this.DOM.dropdown=this.parseTemplate("dropdown",[this.settings]),this.DOM.dropdown.content=this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-wrapper']");},getHeaderRef:function(){return this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-header']")},getFooterRef:function(){return this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-footer']")},getAllSuggestionsRefs:function(){return N(this.DOM.dropdown.content.querySelectorAll(this.settings.classNames.dropdownItemSelector))},show:function(t){var e,i,n,a=this,o=this.settings,r="mix"==o.mode&&!o.enforceWhitelist,l=!o.whitelist||!o.whitelist.length,d="manual"==o.dropdown.position;if(t=void 0===t?this.state.inputText:t,!(l&&!r&&!o.templates.dropdownItemNoMatch||!1===o.dropdown.enable||this.state.isLoading||this.settings.readonly)){if(clearTimeout(this.dropdownHide__bindEventsTimeout),this.suggestedListItems=this.dropdown.filterListItems(t),t&&!this.suggestedListItems.length&&(this.trigger("dropdown:noMatch",t),o.templates.dropdownItemNoMatch&&(n=o.templates.dropdownItemNoMatch.call(this,{value:t}))),!n){if(this.suggestedListItems.length)t&&r&&!this.state.editing.scope&&!s(this.suggestedListItems[0].value,t)&&this.suggestedListItems.unshift({value:t});else {if(!t||!r||this.state.editing.scope)return this.input.autocomplete.suggest.call(this),void this.dropdown.hide();this.suggestedListItems=[{value:t}];}i=""+(u(e=this.suggestedListItems[0])?e.value:e),o.autoComplete&&i&&0==i.indexOf(t)&&this.input.autocomplete.suggest.call(this,e);}this.dropdown.fill(n),o.dropdown.highlightFirst&&this.dropdown.highlightOption(this.DOM.dropdown.content.querySelector(o.classNames.dropdownItemSelector)),this.state.dropdown.visible||setTimeout(this.dropdown.events.binding.bind(this)),this.state.dropdown.visible=t||!0,this.state.dropdown.query=t,this.setStateSelection(),d||setTimeout((function(){a.dropdown.position(),a.dropdown.render();})),setTimeout((function(){a.trigger("dropdown:show",a.DOM.dropdown);}));}},hide:function(t){var e=this,i=this.DOM,n=i.scope,s=i.dropdown,a="manual"==this.settings.dropdown.position&&!t;if(s&&document.body.contains(s)&&!a)return window.removeEventListener("resize",this.dropdown.position),this.dropdown.events.binding.call(this,!1),n.setAttribute("aria-expanded",!1),s.parentNode.removeChild(s),setTimeout((function(){e.state.dropdown.visible=!1;}),100),this.state.dropdown.query=this.state.ddItemData=this.state.ddItemElm=this.state.selection=null,this.state.tag&&this.state.tag.value.length&&(this.state.flaggedTags[this.state.tag.baseOffset]=this.state.tag),this.trigger("dropdown:hide",s),this},toggle:function(t){this.dropdown[this.state.dropdown.visible&&!t?"hide":"show"]();},getAppendTarget:function(){var t=this.settings.dropdown;return "function"==typeof t.appendTarget?t.appendTarget():t.appendTarget},render:function(){var t,e,i,n=this,s=(t=this.DOM.dropdown,(i=t.cloneNode(!0)).style.cssText="position:fixed; top:-9999px; opacity:0",document.body.appendChild(i),e=i.clientHeight,i.parentNode.removeChild(i),e),a=this.settings,o="number"==typeof a.dropdown.enabled&&a.dropdown.enabled>=0,r=this.dropdown.getAppendTarget();return o?(this.DOM.scope.setAttribute("aria-expanded",!0),document.body.contains(this.DOM.dropdown)||(this.DOM.dropdown.classList.add(a.classNames.dropdownInital),this.dropdown.position(s),r.appendChild(this.DOM.dropdown),setTimeout((function(){return n.DOM.dropdown.classList.remove(a.classNames.dropdownInital)}))),this):this},fill:function(t){t="string"==typeof t?t:this.dropdown.createListHTML(t||this.suggestedListItems);var e,i=this.settings.templates.dropdownContent.call(this,t);this.DOM.dropdown.content.innerHTML=(e=i)?e.replace(/\>[\r\n ]+\</g,"><").split(/>\s+</).join("><").trim():"";},fillHeaderFooter:function(){var t=this.dropdown.filterListItems(this.state.dropdown.query),e=this.parseTemplate("dropdownHeader",[t]),i=this.parseTemplate("dropdownFooter",[t]),n=this.dropdown.getHeaderRef(),s=this.dropdown.getFooterRef();e&&(null==n||n.parentNode.replaceChild(e,n)),i&&(null==s||s.parentNode.replaceChild(i,s));},position:function(t){var e=this.settings.dropdown,i=this.dropdown.getAppendTarget();if("manual"!=e.position&&i){var n,s,a,o,r,l,d,c,u,g=this.DOM.dropdown,h=e.RTL,p=i===document.body,f=i===this.DOM.scope,m=p?window.pageYOffset:i.scrollTop,v=document.fullscreenElement||document.webkitFullscreenElement||document.documentElement,b=v.clientHeight,w=Math.max(v.clientWidth||0,window.innerWidth||0)>480?e.position:"all",y=this.DOM["input"==w?"input":"scope"];if(t=t||g.clientHeight,this.state.dropdown.visible){if("text"==w?(a=(n=function(){var t=document.getSelection();if(t.rangeCount){var e,i,n=t.getRangeAt(0),s=n.startContainer,a=n.startOffset;if(a>0)return (i=document.createRange()).setStart(s,a-1),i.setEnd(s,a),{left:(e=i.getBoundingClientRect()).right,top:e.top,bottom:e.bottom};if(s.getBoundingClientRect)return s.getBoundingClientRect()}return {left:-9999,top:-9999}}()).bottom,s=n.top,o=n.left,r="auto"):(l=function(t){var e=0,i=0;for(t=t.parentNode;t&&t!=v;)e+=t.offsetTop||0,i+=t.offsetLeft||0,t=t.parentNode;return {top:e,left:i}}(i),n=y.getBoundingClientRect(),s=f?-1:n.top-l.top,a=(f?n.height:n.bottom-l.top)-1,o=f?-1:n.left-l.left,r=n.width+"px"),!p){var T=function(){for(var t=0,i=e.appendTarget.parentNode;i;)t+=i.scrollTop||0,i=i.parentNode;return t}();s+=T,a+=T;}var O;s=Math.floor(s),a=Math.ceil(a),c=((d=null!==(O=e.placeAbove)&&void 0!==O?O:b-n.bottom<t)?s:a)+m,u="left: ".concat(o+(h&&n.width||0)+window.pageXOffset,"px;"),g.style.cssText="".concat(u,"; top: ").concat(c,"px; min-width: ").concat(r,"; max-width: ").concat(r),g.setAttribute("placement",d?"top":"bottom"),g.setAttribute("position",w);}}}})?C:{},Object.getOwnPropertyDescriptors?Object.defineProperties(A,Object.getOwnPropertyDescriptors(C)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),i.push.apply(i,n);}return i}(Object(C)).forEach((function(t){Object.defineProperty(A,t,Object.getOwnPropertyDescriptor(C,t));})),A),j="@yaireo/tagify/",P={empty:"empty",exceed:"number of tags exceeded",pattern:"pattern mismatch",duplicate:"already exists",notAllowed:"not allowed"},V={wrapper:function(e,i){return '<tags class="'.concat(i.classNames.namespace," ").concat(i.mode?"".concat(i.classNames[i.mode+"Mode"]):""," ").concat(e.className,'"\n                    ').concat(i.readonly?"readonly":"","\n                    ").concat(i.disabled?"disabled":"","\n                    ").concat(i.required?"required":"","\n                    ").concat("select"===i.mode?"spellcheck='false'":"",'\n                    tabIndex="-1">\n                    ').concat(this.settings.templates.input.call(this),"\n                ").concat(t,"\n        </tags>")},input:function(){var e=this.settings,i=e.placeholder||t;return "<span ".concat(!e.readonly&&e.userInput?"contenteditable":"",' tabIndex="0" data-placeholder="').concat(i,'" aria-placeholder="').concat(e.placeholder||"",'"\n                    class="').concat(e.classNames.input,'"\n                    role="textbox"\n                    autocapitalize="false"\n                    autocorrect="off"\n                    spellcheck="false"\n                    aria-autocomplete="both"\n                    aria-multiline="').concat("mix"==e.mode,'"></span>')},tag:function(t,e){var i=e.settings;return '<tag title="'.concat(t.title||t.value,"\"\n                    contenteditable='false'\n                    tabIndex=\"").concat(i.a11y.focusableTags?0:-1,'"\n                    class="').concat(i.classNames.tag," ").concat(t.class||"",'"\n                    ').concat(this.getAttributes(t),">\n            <x title='' tabIndex=\"").concat(i.a11y.focusableTags?0:-1,'" class="').concat(i.classNames.tagX,"\" role='button' aria-label='remove tag'></x>\n            <div>\n                <span ").concat("select"===i.mode&&i.userInput?"contenteditable='true'":"",' autocapitalize="false" autocorrect="off" spellcheck=\'false\' class="').concat(i.classNames.tagText,'">').concat(t[i.tagTextProp]||t.value,"</span>\n            </div>\n        </tag>")},dropdown:function(t){var e=t.dropdown,i="manual"==e.position;return '<div class="'.concat(i?"":t.classNames.dropdown," ").concat(e.classname,'" role="listbox" aria-labelledby="dropdown" dir="').concat(e.RTL?"rtl":"","\">\n                    <div data-selector='tagify-suggestions-wrapper' class=\"").concat(t.classNames.dropdownWrapper,'"></div>\n                </div>')},dropdownContent:function(t){var e=this.settings.templates,i=this.state.dropdown.suggestions;return "\n            ".concat(e.dropdownHeader.call(this,i),"\n            ").concat(t,"\n            ").concat(e.dropdownFooter.call(this,i),"\n        ")},dropdownItem:function(t){return "<div ".concat(this.getAttributes(t),"\n                    class='").concat(this.settings.classNames.dropdownItem," ").concat(this.isTagDuplicate(t.value)?this.settings.classNames.dropdownItemSelected:""," ").concat(t.class||"",'\'\n                    tabindex="0"\n                    role="option">').concat(t.mappedValue||t.value,"</div>")},dropdownHeader:function(t){return "<header data-selector='tagify-suggestions-header' class=\"".concat(this.settings.classNames.dropdownHeader,'"></header>')},dropdownFooter:function(t){var e=t.length-this.settings.dropdown.maxItems;return e>0?"<footer data-selector='tagify-suggestions-footer' class=\"".concat(this.settings.classNames.dropdownFooter,'">\n                ').concat(e," more items. Refine your search.\n            </footer>"):""},dropdownItemNoMatch:null};function F(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function R(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function H(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){var i=null==t?null:"undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(null!=i){var n,s,a=[],o=!0,r=!1;try{for(i=i.call(t);!(o=(n=i.next()).done)&&(a.push(n.value),!e||a.length!==e);o=!0);}catch(t){r=!0,s=t;}finally{try{o||null==i.return||i.return();}finally{if(r)throw s}}return a}}(t,e)||function(t,e){if(!t)return;if("string"==typeof t)return F(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return F(t,e)}(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function B(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function W(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function K(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function U(t,e){return e=null!=e?e:{},Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),i.push.apply(i,n);}return i}(Object(e)).forEach((function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i));})),t}function q(t){return function(t){if(Array.isArray(t))return B(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return B(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return B(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}var z={customBinding:function(){var t=this;this.customEventsList.forEach((function(e){t.on(e,t.settings.callbacks[e]);}));},binding:function(){var t,e=!(arguments.length>0&&void 0!==arguments[0])||arguments[0],i=this.settings,n=this.events.callbacks,s=e?"addEventListener":"removeEventListener";if(!this.state.mainEvents||!e){for(var a in this.state.mainEvents=e,e&&!this.listeners.main&&(this.events.bindGlobal.call(this),this.settings.isJQueryPlugin&&jQuery(this.DOM.originalInput).on("tagify.removeAllTags",this.removeAllTags.bind(this))),t=this.listeners.main=this.listeners.main||{keydown:["input",n.onKeydown.bind(this)],click:["scope",n.onClickScope.bind(this)],dblclick:"select"!=i.mode&&["scope",n.onDoubleClickScope.bind(this)],paste:["input",n.onPaste.bind(this)],drop:["input",n.onDrop.bind(this)],compositionstart:["input",n.onCompositionStart.bind(this)],compositionend:["input",n.onCompositionEnd.bind(this)]})t[a]&&this.DOM[t[a][0]][s](a,t[a][1]);var o=this.listeners.main.inputMutationObserver||new MutationObserver(n.onInputDOMChange.bind(this));o.disconnect(),"mix"==i.mode&&o.observe(this.DOM.input,{childList:!0}),this.events.bindOriginaInputListener.call(this);}},bindOriginaInputListener:function(t){var e=(t||0)+500;this.listeners.main&&(clearInterval(this.listeners.main.originalInputValueObserverInterval),this.listeners.main.originalInputValueObserverInterval=setInterval(this.events.callbacks.observeOriginalInputValue.bind(this),e));},bindGlobal:function(t){var e,i=this.events.callbacks,n=t?"removeEventListener":"addEventListener";if(this.listeners&&(t||!this.listeners.global)){this.listeners.global=this.listeners.global||[{type:this.isIE?"keydown":"input",target:this.DOM.input,cb:i[this.isIE?"onInputIE":"onInput"].bind(this)},{type:"keydown",target:window,cb:i.onWindowKeyDown.bind(this)},{type:"focusin",target:this.DOM.scope,cb:i.onFocusBlur.bind(this)},{type:"focusout",target:this.DOM.scope,cb:i.onFocusBlur.bind(this)},{type:"click",target:document,cb:i.onClickAnywhere.bind(this),useCapture:!0}];var s=!0,a=!1,o=void 0;try{for(var r,l=this.listeners.global[Symbol.iterator]();!(s=(r=l.next()).done);s=!0)(e=r.value).target[n](e.type,e.cb,!!e.useCapture);}catch(t){a=!0,o=t;}finally{try{s||null==l.return||l.return();}finally{if(a)throw o}}}},unbindGlobal:function(){this.events.bindGlobal.call(this,!0);},callbacks:{onFocusBlur:function(t){var e,i,n=this.settings,s=b.call(this,t.target),a=v.call(this,t.target),o=t.target.classList.contains(n.classNames.tagX),r="focusin"==t.type,l="focusout"==t.type;s&&r&&!a&&!o&&this.toggleFocusClass(this.state.hasFocus=+new Date);var d=t.target?this.trim(this.DOM.input.textContent):"",c=null===(i=this.value)||void 0===i||null===(e=i[0])||void 0===e?void 0:e[n.tagTextProp],u=n.dropdown.enabled>=0,g={relatedTarget:t.relatedTarget},h=this.state.actions.selectOption&&(u||!n.dropdown.closeOnSelect),p=this.state.actions.addNew&&u;if(l){if(t.relatedTarget===this.DOM.scope)return this.dropdown.hide(),void this.DOM.input.focus();this.postUpdate(),n.onChangeAfterBlur&&this.triggerChangeEvent();}if(!(h||p||o))if(r||s?(this.state.hasFocus=+new Date,this.toggleFocusClass(this.state.hasFocus)):this.state.hasFocus=!1,"mix"!=n.mode){if(r){if(!n.focusable)return;var f=0===n.dropdown.enabled&&!this.state.dropdown.visible;return this.toggleFocusClass(!0),this.trigger("focus",g),void(!f||a&&"select"!==n.mode||this.dropdown.show(this.value.length?"":void 0))}if(l){if(this.trigger("blur",g),this.loading(!1),"select"==n.mode){if(this.value.length){var m=this.getTagElms()[0];d=this.trim(m.textContent);}c===d&&(d="");}d&&!this.state.actions.selectOption&&n.addTagOnBlur&&n.addTagOn.includes("blur")&&this.addTags(d,!0);}s||(this.DOM.input.removeAttribute("style"),this.dropdown.hide());}else r?this.trigger("focus",g):l&&(this.trigger("blur",g),this.loading(!1),this.dropdown.hide(),this.state.dropdown.visible=void 0,this.setStateSelection());},onCompositionStart:function(t){this.state.composing=!0;},onCompositionEnd:function(t){this.state.composing=!1;},onWindowKeyDown:function(t){var e,i=this.settings,n=document.activeElement,s=b.call(this,n)&&this.DOM.scope.contains(document.activeElement),a=s&&n.hasAttribute("readonly");if(this.state.hasFocus||s&&!a){e=n.nextElementSibling;var o=t.target.classList.contains(i.classNames.tagX);switch(t.key){case"Backspace":i.readonly||this.state.editing||(this.removeTags(n),(e||this.DOM.input).focus());break;case"Enter":if(o)return void this.removeTags(t.target.parentNode);i.a11y.focusableTags&&v.call(this,n)&&setTimeout(this.editTag.bind(this),0,n);break;case"ArrowDown":this.state.dropdown.visible||"mix"==i.mode||this.dropdown.show();}}},onKeydown:function(t){var e=this,i=this.settings;if(!this.state.composing&&i.userInput){"select"==i.mode&&i.enforceWhitelist&&this.value.length&&"Tab"!=t.key&&t.preventDefault();var n=this.trim(t.target.textContent);this.trigger("keydown",{event:t}),i.hooks.beforeKeyDown(t,{tagify:this}).then((function(s){if("mix"==i.mode){switch(t.key){case"Left":case"ArrowLeft":e.state.actions.ArrowLeft=!0;break;case"Delete":case"Backspace":if(e.state.editing)return;var a=document.getSelection(),o="Delete"==t.key&&a.anchorOffset==(a.anchorNode.length||0),l=a.anchorNode.previousSibling,c=1==a.anchorNode.nodeType||!a.anchorOffset&&l&&1==l.nodeType&&a.anchorNode.previousSibling;r(e.DOM.input.innerHTML);var u,g,h,p=e.getTagElms(),m=1===a.anchorNode.length&&a.anchorNode.nodeValue==String.fromCharCode(8203);if("edit"==i.backspace&&c)return u=1==a.anchorNode.nodeType?null:a.anchorNode.previousElementSibling,setTimeout(e.editTag.bind(e),0,u),void t.preventDefault();if(f()&&K(c,Element))return h=d(c),c.hasAttribute("readonly")||c.remove(),e.DOM.input.focus(),void setTimeout((function(){T(h),e.DOM.input.click();}));if("BR"==a.anchorNode.nodeName)return;if((o||c)&&1==a.anchorNode.nodeType?g=0==a.anchorOffset?o?p[0]:null:p[Math.min(p.length,a.anchorOffset)-1]:o?g=a.anchorNode.nextElementSibling:K(c,Element)&&(g=c),3==a.anchorNode.nodeType&&!a.anchorNode.nodeValue&&a.anchorNode.previousElementSibling&&t.preventDefault(),(c||o)&&!i.backspace)return void t.preventDefault();if("Range"!=a.type&&!a.anchorOffset&&a.anchorNode==e.DOM.input&&"Delete"!=t.key)return void t.preventDefault();if("Range"!=a.type&&g&&g.hasAttribute("readonly"))return void T(d(g));"Delete"==t.key&&m&&y(a.anchorNode.nextSibling)&&e.removeTags(a.anchorNode.nextSibling),clearTimeout(k),k=setTimeout((function(){var t=document.getSelection();r(e.DOM.input.innerHTML),!o&&t.anchorNode.previousSibling,e.value=[].map.call(p,(function(t,i){var n=y(t);if(t.parentNode||n.readonly)return n;e.trigger("remove",{tag:t,index:i,data:n});})).filter((function(t){return t}));}),20);}return !0}var v="manual"==i.dropdown.position;switch(t.key){case"Backspace":"select"==i.mode&&i.enforceWhitelist&&e.value.length?e.removeTags():e.state.dropdown.visible&&"manual"!=i.dropdown.position||""!=t.target.textContent&&8203!=n.charCodeAt(0)||(!0===i.backspace?e.removeTags():"edit"==i.backspace&&setTimeout(e.editTag.bind(e),0));break;case"Esc":case"Escape":if(e.state.dropdown.visible)return;t.target.blur();break;case"Down":case"ArrowDown":e.state.dropdown.visible||e.dropdown.show();break;case"ArrowRight":var b=e.state.inputSuggestion||e.state.ddItemData;if(b&&i.autoComplete.rightKey)return void e.addTags([b],!0);break;case"Tab":var w="select"==i.mode;if(!n||w)return !0;t.preventDefault();case"Enter":if(e.state.dropdown.visible&&!v)return;t.preventDefault(),setTimeout((function(){e.state.dropdown.visible&&!v||e.state.actions.selectOption||!i.addTagOn.includes(t.key.toLowerCase())||e.addTags(n,!0);}));}})).catch((function(t){return t}));}},onInput:function(t){this.postUpdate();var e=this.settings;if("mix"==e.mode)return this.events.callbacks.onMixTagsInput.call(this,t);var i=this.input.normalize.call(this,void 0,{trim:!1}),n=i.length>=e.dropdown.enabled,s={value:i,inputElm:this.DOM.input},a=this.validateTag({value:i});"select"==e.mode&&this.toggleScopeValidation(a),s.isValid=a,this.state.inputText!=i&&(this.input.set.call(this,i,!1),-1!=i.search(e.delimiters)?this.addTags(i)&&this.input.set.call(this):e.dropdown.enabled>=0&&this.dropdown[n?"show":"hide"](i),this.trigger("input",s));},onMixTagsInput:function(t){var e,i,n,s,a,o,r,l,d=this,c=this.settings,u=this.value.length,h=this.getTagElms(),p=document.createDocumentFragment(),m=window.getSelection().getRangeAt(0),v=[].map.call(h,(function(t){return y(t).value}));if("deleteContentBackward"==t.inputType&&f()&&this.events.callbacks.onKeydown.call(this,{target:t.target,key:"Backspace"}),O(this.getTagElms()),this.value.slice().forEach((function(t){t.readonly&&!v.includes(t.value)&&p.appendChild(d.createTagElem(t));})),p.childNodes.length&&(m.insertNode(p),this.setRangeAtStartEnd(!1,p.lastChild)),h.length!=u)return this.value=[].map.call(this.getTagElms(),(function(t){return y(t)})),void this.update({withoutChangeEvent:!0});if(this.hasMaxTags())return !0;if(window.getSelection&&(o=window.getSelection()).rangeCount>0&&3==o.anchorNode.nodeType){if((m=o.getRangeAt(0).cloneRange()).collapse(!0),m.setStart(o.focusNode,0),n=(e=m.toString().slice(0,m.endOffset)).split(c.pattern).length-1,(i=e.match(c.pattern))&&(s=e.slice(e.lastIndexOf(i[i.length-1]))),s){if(this.state.actions.ArrowLeft=!1,this.state.tag={prefix:s.match(c.pattern)[0],value:s.replace(c.pattern,"")},this.state.tag.baseOffset=o.baseOffset-this.state.tag.value.length,l=this.state.tag.value.match(c.delimiters))return this.state.tag.value=this.state.tag.value.replace(c.delimiters,""),this.state.tag.delimiters=l[0],this.addTags(this.state.tag.value,c.dropdown.clearOnSelect),void this.dropdown.hide();a=this.state.tag.value.length>=c.dropdown.enabled;try{r=(r=this.state.flaggedTags[this.state.tag.baseOffset]).prefix==this.state.tag.prefix&&r.value[0]==this.state.tag.value[0],this.state.flaggedTags[this.state.tag.baseOffset]&&!this.state.tag.value&&delete this.state.flaggedTags[this.state.tag.baseOffset];}catch(t){}(r||n<this.state.mixMode.matchedPatternCount)&&(a=!1);}else this.state.flaggedTags={};this.state.mixMode.matchedPatternCount=n;}setTimeout((function(){d.update({withoutChangeEvent:!0}),d.trigger("input",g({},d.state.tag,{textContent:d.DOM.input.textContent})),d.state.tag&&d.dropdown[a?"show":"hide"](d.state.tag.value);}),10);},onInputIE:function(t){var e=this;setTimeout((function(){e.events.callbacks.onInput.call(e,t);}));},observeOriginalInputValue:function(){this.DOM.originalInput.parentNode||this.destroy(),this.DOM.originalInput.value!=this.DOM.originalInput.tagifyValue&&this.loadOriginalValues();},onClickAnywhere:function(t){t.target==this.DOM.scope||this.DOM.scope.contains(t.target)||(this.toggleFocusClass(!1),this.state.hasFocus=!1,t.target.closest(".tagify__dropdown")&&t.target.closest(".tagify__dropdown").__tagify!=this&&this.dropdown.hide());},onClickScope:function(t){var e=this.settings,i=t.target.closest("."+e.classNames.tag),n=t.target===this.DOM.scope,s=+new Date-this.state.hasFocus;if(n&&"select"!=e.mode)this.DOM.input.focus();else {if(!t.target.classList.contains(e.classNames.tagX))return i&&!this.state.editing?(this.trigger("click",{tag:i,index:this.getNodeIndex(i),data:y(i),event:t}),void(1!==e.editTags&&1!==e.editTags.clicks&&"select"!=e.mode||this.events.callbacks.onDoubleClickScope.call(this,t))):void(t.target==this.DOM.input&&("mix"==e.mode&&this.fixFirefoxLastTagNoCaret(),s>500||!e.focusable)?this.state.dropdown.visible?this.dropdown.hide():0===e.dropdown.enabled&&"mix"!=e.mode&&this.dropdown.show(this.value.length?"":void 0):"select"!=e.mode||0!==e.dropdown.enabled||this.state.dropdown.visible||(this.events.callbacks.onDoubleClickScope.call(this,U(function(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){W(t,e,i[e]);}));}return t}({},t),{target:this.getTagElms()[0]})),!e.userInput&&this.dropdown.show()));this.removeTags(t.target.parentNode);}},onPaste:function(t){var e=this;t.preventDefault();var i,n,s,a=this.settings;if("select"==a.mode&&a.enforceWhitelist||!a.userInput)return !1;a.readonly||(n=t.clipboardData||window.clipboardData,s=n.getData("Text"),a.hooks.beforePaste(t,{tagify:this,pastedText:s,clipboardData:n}).then((function(a){void 0===a&&(a=s),a&&(e.injectAtCaret(a,window.getSelection().getRangeAt(0)),"mix"==e.settings.mode?e.events.callbacks.onMixTagsInput.call(e,t):e.settings.pasteAsTags?i=e.addTags(e.state.inputText+a,!0):(e.state.inputText=a,e.dropdown.show(a))),e.trigger("paste",{event:t,pastedText:s,clipboardData:n,tagsElems:i});})).catch((function(t){return t})));},onDrop:function(t){t.preventDefault();},onEditTagInput:function(t,e){var i,n=t.closest("."+this.settings.classNames.tag),s=this.getNodeIndex(n),a=y(n),o=this.input.normalize.call(this,t),r=(W(i={},this.settings.tagTextProp,o),W(i,"__tagId",a.__tagId),i),l=this.validateTag(r);this.editTagChangeDetected(g(a,r))||!0!==t.originalIsValid||(l=!0),n.classList.toggle(this.settings.classNames.tagInvalid,!0!==l),a.__isValid=l,n.title=!0===l?a.title||a.value:l,o.length>=this.settings.dropdown.enabled&&(this.state.editing&&(this.state.editing.value=o),this.dropdown.show(o)),this.trigger("edit:input",{tag:n,index:s,data:g({},this.value[s],{newValue:o}),event:e});},onEditTagPaste:function(t,e){var i=(e.clipboardData||window.clipboardData).getData("Text");e.preventDefault();var n=w(i);this.setRangeAtStartEnd(!1,n);},onEditTagClick:function(t,e){this.events.callbacks.onClickScope.call(this,e);},onEditTagFocus:function(t){this.state.editing={scope:t,input:t.querySelector("[contenteditable]")};},onEditTagBlur:function(t,e){var i=v.call(this,e.relatedTarget);if("select"==this.settings.mode&&i&&e.relatedTarget.contains(e.target))this.dropdown.hide();else if(this.state.editing&&(this.state.hasFocus||this.toggleFocusClass(),this.DOM.scope.contains(t))){var n,s,a,o=this.settings,r=t.closest("."+o.classNames.tag),l=y(r),d=this.input.normalize.call(this,t),c=(W(n={},o.tagTextProp,d),W(n,"__tagId",l.__tagId),n),u=l.__originalData,h=this.editTagChangeDetected(g(l,c)),p=this.validateTag(c);if(d)if(h){var f;if(s=this.hasMaxTags(),a=g({},u,(W(f={},o.tagTextProp,this.trim(d)),W(f,"__isValid",p),f)),o.transformTag.call(this,a,u),!0!==(p=(!s||!0===u.__isValid)&&this.validateTag(a))){if(this.trigger("invalid",{data:a,tag:r,message:p}),o.editTags.keepInvalid)return;o.keepInvalidTags?a.__isValid=p:a=u;}else o.keepInvalidTags&&(delete a.title,delete a["aria-invalid"],delete a.class);this.onEditTagDone(r,a);}else this.onEditTagDone(r,u);else this.onEditTagDone(r);}},onEditTagkeydown:function(t,e){if(!this.state.composing)switch(this.trigger("edit:keydown",{event:t}),t.key){case"Esc":case"Escape":this.state.editing=!1,!!e.__tagifyTagData.__originalData.value?e.parentNode.replaceChild(e.__tagifyTagData.__originalHTML,e):e.remove();break;case"Enter":case"Tab":t.preventDefault();setTimeout((function(){return t.target.blur()}),0);}},onDoubleClickScope:function(t){var e,i,n=t.target.closest("."+this.settings.classNames.tag),s=y(n),a=this.settings;n&&!1!==s.editable&&(e=n.classList.contains(this.settings.classNames.tagEditing),i=n.hasAttribute("readonly"),a.readonly||e||i||!this.settings.editTags||!a.userInput||(this.events.callbacks.onEditTagFocus.call(this,n),this.editTag(n)),this.toggleFocusClass(!0),"select"!=a.mode&&this.trigger("dblclick",{tag:n,index:this.getNodeIndex(n),data:y(n)}));},onInputDOMChange:function(t){var e=this;t.forEach((function(t){t.addedNodes.forEach((function(t){if("<div><br></div>"==t.outerHTML)t.replaceWith(document.createElement("br"));else if(1==t.nodeType&&t.querySelector(e.settings.classNames.tagSelector)){var i,n=document.createTextNode("");3==t.childNodes[0].nodeType&&"BR"!=t.previousSibling.nodeName&&(n=document.createTextNode("\n")),(i=t).replaceWith.apply(i,q([n].concat(q(q(t.childNodes).slice(0,-1))))),T(n);}else if(v.call(e,t)){var s;if(3!=(null===(s=t.previousSibling)||void 0===s?void 0:s.nodeType)||t.previousSibling.textContent||t.previousSibling.remove(),t.previousSibling&&"BR"==t.previousSibling.nodeName){t.previousSibling.replaceWith("\n​");for(var a=t.nextSibling,o="";a;)o+=a.textContent,a=a.nextSibling;o.trim()&&T(t.previousSibling);}else t.previousSibling&&!y(t.previousSibling)||t.before("​");}})),t.removedNodes.forEach((function(t){t&&"BR"==t.nodeName&&v.call(e,i)&&(e.removeTags(i),e.fixFirefoxLastTagNoCaret());}));}));var i=this.DOM.input.lastChild;i&&""==i.nodeValue&&i.remove(),i&&"BR"==i.nodeName||this.DOM.input.appendChild(document.createElement("br"));}}};function X(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function J(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function G(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function $$1(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){J(t,e,i[e]);}));}return t}function Q(t){return function(t){if(Array.isArray(t))return X(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return X(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return X(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function Y(t,e){if(!t){n.warn("input element not found",t);var i=new Proxy(this,{get:function(){return function(){return i}}});return i}if(t.__tagify)return n.warn("input element is already Tagified - Same instance is returned.",t),t.__tagify;var s;g(this,function(t){var e=document.createTextNode(""),i={};function s(t,i,n){n&&i.split(/\s+/g).forEach((function(i){return e[t+"EventListener"].call(e,i,n)}));}return {removeAllCustomListeners:function(){Object.entries(i).forEach((function(t){var e=H(t,2),i=e[0];e[1].forEach((function(t){return s("remove",i,t)}));})),i={};},off:function(t,e){return t&&(e?s("remove",t,e):t.split(/\s+/g).forEach((function(t){var e;null===(e=i[t])||void 0===e||e.forEach((function(e){return s("remove",t,e)})),delete i[t];}))),this},on:function(t,e){return e&&"function"==typeof e&&(t.split(/\s+/g).forEach((function(t){Array.isArray(i[t])?i[t].push(e):i[t]=[e];})),s("add",t,e)),this},trigger:function(i,s,a){var o;if(a=a||{cloneData:!0},i)if(t.settings.isJQueryPlugin)"remove"==i&&(i="removeTag"),jQuery(t.DOM.originalInput).triggerHandler(i,[s]);else {try{var r="object"==typeof s?s:{value:s};if((r=a.cloneData?g({},r):r).tagify=this,s.event&&(r.event=this.cloneEvent(s.event)),R(s,Object))for(var l in s)R(s[l],HTMLElement)&&(r[l]=s[l]);o=new CustomEvent(i,{detail:r});}catch(t){n.warn(t);}e.dispatchEvent(o);}}}}(this)),this.isFirefox=/firefox|fxios/i.test(navigator.userAgent)&&!/seamonkey/i.test(navigator.userAgent),this.isIE=window.document.documentMode,e=e||{},this.getPersistedData=(s=e.id,function(t){var e,i="/"+t;if(1==localStorage.getItem(j+s+"/v",1))try{e=JSON.parse(localStorage[j+s+i]);}catch(t){}return e}),this.setPersistedData=function(t){return t?(localStorage.setItem(j+t+"/v",1),function(e,i){var n="/"+i,s=JSON.stringify(e);e&&i&&(localStorage.setItem(j+t+n,s),dispatchEvent(new Event("storage")));}):function(){}}(e.id),this.clearPersistedData=function(t){return function(e){var i=j+"/"+t+"/";if(e)localStorage.removeItem(i+e);else for(var n in localStorage)n.includes(i)&&localStorage.removeItem(n);}}(e.id),this.applySettings(t,e),this.state={inputText:"",editing:!1,composing:!1,actions:{},mixMode:{},dropdown:{},flaggedTags:{}},this.value=[],this.listeners={},this.DOM={},this.build(t),_.call(this),this.getCSSVars(),this.loadOriginalValues(),this.events.customBinding.call(this),this.events.binding.call(this),t.autofocus&&this.DOM.input.focus(),t.__tagify=this;}Y.prototype={_dropdown:L,placeCaretAfterNode:T,getSetTagData:y,helpers:{sameStr:s,removeCollectionProp:a,omit:o,isObject:u,parseHTML:l,escapeHTML:c,extend:g,concatWithoutDups:h,getUID:m,isNodeTag:v},customEventsList:["change","add","remove","invalid","input","paste","click","keydown","focus","blur","edit:input","edit:beforeUpdate","edit:updated","edit:start","edit:keydown","dropdown:show","dropdown:hide","dropdown:select","dropdown:updated","dropdown:noMatch","dropdown:scroll"],dataProps:["__isValid","__removed","__originalData","__originalHTML","__tagId"],trim:function(t){return this.settings.trim&&t&&"string"==typeof t?t.trim():t},parseHTML:l,templates:V,parseTemplate:function(t,e){return l((t=this.settings.templates[t]||t).apply(this,e))},set whitelist(t){var e=t&&Array.isArray(t);this.settings.whitelist=e?t:[],this.setPersistedData(e?t:[],"whitelist");},get whitelist(){return this.settings.whitelist},set userInput(t){this.settings.userInput=!!t,this.setContentEditable(!!t);},get userInput(){return this.settings.userInput},generateClassSelectors:function(t){var e=function(e){var i=e;Object.defineProperty(t,i+"Selector",{get:function(){return "."+this[i].split(" ")[0]}});};for(var i in t)e(i);},applySettings:function(t,e){var i,n;x$1.templates=this.templates;var s=g({},x$1,"mix"==e.mode?{dropdown:{position:"text"}}:{}),a=this.settings=g({},s,e);if(a.disabled=t.hasAttribute("disabled"),a.readonly=a.readonly||t.hasAttribute("readonly"),a.placeholder=c(t.getAttribute("placeholder")||a.placeholder||""),a.required=t.hasAttribute("required"),this.generateClassSelectors(a.classNames),void 0===a.dropdown.includeSelectedTags&&(a.dropdown.includeSelectedTags=a.duplicates),this.isIE&&(a.autoComplete=!1),["whitelist","blacklist"].forEach((function(e){var i=t.getAttribute("data-"+e);i&&G(i=i.split(a.delimiters),Array)&&(a[e]=i);})),"autoComplete"in e&&!u(e.autoComplete)&&(a.autoComplete=x$1.autoComplete,a.autoComplete.enabled=e.autoComplete),"mix"==a.mode&&(a.pattern=a.pattern||/@/,a.autoComplete.rightKey=!0,a.delimiters=e.delimiters||null,a.tagTextProp&&!a.dropdown.searchKeys.includes(a.tagTextProp)&&a.dropdown.searchKeys.push(a.tagTextProp)),t.pattern)try{a.pattern=new RegExp(t.pattern);}catch(t){}if(a.delimiters){a._delimiters=a.delimiters;try{a.delimiters=new RegExp(this.settings.delimiters,"g");}catch(t){}}a.disabled&&(a.userInput=!1),this.TEXTS=$$1({},P,a.texts||{}),("select"!=a.mode||(null===(i=e.dropdown)||void 0===i?void 0:i.enabled))&&a.userInput||(a.dropdown.enabled=0),a.dropdown.appendTarget=(null===(n=e.dropdown)||void 0===n?void 0:n.appendTarget)||document.body;var o=this.getPersistedData("whitelist");Array.isArray(o)&&(this.whitelist=Array.isArray(a.whitelist)?h(a.whitelist,o):o);},getAttributes:function(t){var e,i=this.getCustomAttributes(t),n="";for(e in i)n+=" "+e+(void 0!==t[e]?'="'.concat(i[e],'"'):"");return n},getCustomAttributes:function(t){if(!u(t))return "";var e,i={};for(e in t)"__"!=e.slice(0,2)&&"class"!=e&&t.hasOwnProperty(e)&&void 0!==t[e]&&(i[e]=c(t[e]));return i},setStateSelection:function(){var t=window.getSelection(),e={anchorOffset:t.anchorOffset,anchorNode:t.anchorNode,range:t.getRangeAt&&t.rangeCount&&t.getRangeAt(0)};return this.state.selection=e,e},getCSSVars:function(){var t,e,i,n=getComputedStyle(this.DOM.scope,null);this.CSSVars={tagHideTransition:(t=function(t){if(!t)return {};var e=(t=t.trim().split(" ")[0]).split(/\d+/g).filter((function(t){return t})).pop().trim();return {value:+t.split(e).filter((function(t){return t}))[0].trim(),unit:e}}((i="tag-hide-transition",n.getPropertyValue("--"+i))),e=t.value,"s"==t.unit?1e3*e:e)};},build:function(t){var e=this.DOM,i=t.closest("label");this.settings.mixMode.integrated?(e.originalInput=null,e.scope=t,e.input=t):(e.originalInput=t,e.originalInput_tabIndex=t.tabIndex,e.scope=this.parseTemplate("wrapper",[t,this.settings]),e.input=e.scope.querySelector(this.settings.classNames.inputSelector),t.parentNode.insertBefore(e.scope,t),t.tabIndex=-1),i&&i.setAttribute("for","");},destroy:function(){this.events.unbindGlobal.call(this),this.DOM.scope.parentNode.removeChild(this.DOM.scope),this.DOM.originalInput.tabIndex=this.DOM.originalInput_tabIndex,delete this.DOM.originalInput.__tagify,this.dropdown.hide(!0),this.removeAllCustomListeners(),clearTimeout(this.dropdownHide__bindEventsTimeout),clearInterval(this.listeners.main.originalInputValueObserverInterval);},loadOriginalValues:function(t){var e,i=this.settings;if(this.state.blockChangeEvent=!0,void 0===t){var n=this.getPersistedData("value");t=n&&!this.DOM.originalInput.value?n:i.mixMode.integrated?this.DOM.input.textContent:this.DOM.originalInput.value;}if(this.removeAllTags(),t)if("mix"==i.mode)this.parseMixTags(t),(e=this.DOM.input.lastChild)&&"BR"==e.tagName||this.DOM.input.insertAdjacentHTML("beforeend","<br>");else {try{G(JSON.parse(t),Array)&&(t=JSON.parse(t));}catch(t){}this.addTags(t,!0).forEach((function(t){return t&&t.classList.add(i.classNames.tagNoAnimation)}));}else this.postUpdate();this.state.lastOriginalValueReported=i.mixMode.integrated?"":this.DOM.originalInput.value;},cloneEvent:function(t){var e={};for(var i in t)"path"!=i&&(e[i]=t[i]);return e},loading:function(t){return this.state.isLoading=t,this.DOM.scope.classList[t?"add":"remove"](this.settings.classNames.scopeLoading),this},tagLoading:function(t,e){return t&&t.classList[e?"add":"remove"](this.settings.classNames.tagLoading),this},toggleClass:function(t,e){"string"==typeof t&&this.DOM.scope.classList.toggle(t,e);},toggleScopeValidation:function(t){var e=!0===t||void 0===t;!this.settings.required&&t&&t===this.TEXTS.empty&&(e=!0),this.toggleClass(this.settings.classNames.tagInvalid,!e),this.DOM.scope.title=e?"":t;},toggleFocusClass:function(t){this.toggleClass(this.settings.classNames.focus,!!t);},setPlaceholder:function(t){var e=this;["data","aria"].forEach((function(i){return e.DOM.input.setAttribute("".concat(i,"-placeholder"),t)}));},triggerChangeEvent:function(){if(!this.settings.mixMode.integrated){var t=this.DOM.originalInput,e=this.state.lastOriginalValueReported!==t.value,i=new CustomEvent("change",{bubbles:!0});e&&(this.state.lastOriginalValueReported=t.value,i.simulated=!0,t._valueTracker&&t._valueTracker.setValue(Math.random()),t.dispatchEvent(i),this.trigger("change",this.state.lastOriginalValueReported),t.value=this.state.lastOriginalValueReported);}},events:z,fixFirefoxLastTagNoCaret:function(){},setRangeAtStartEnd:function(t,e){if(e){t="number"==typeof t?t:!!t,e=e.lastChild||e;var i=document.getSelection();if(G(i.focusNode,Element)&&!this.DOM.input.contains(i.focusNode))return !0;try{i.rangeCount>=1&&["Start","End"].forEach((function(n){return i.getRangeAt(0)["set"+n](e,t||e.length)}));}catch(t){console.warn(t);}}},insertAfterTag:function(t,e){if(e=e||this.settings.mixMode.insertAfterTag,t&&t.parentNode&&e)return e="string"==typeof e?document.createTextNode(e):e,t.parentNode.insertBefore(e,t.nextSibling),e},editTagChangeDetected:function(t){var e=t.__originalData;for(var i in e)if(!this.dataProps.includes(i)&&t[i]!=e[i])return !0;return !1},getTagTextNode:function(t){return t.querySelector(this.settings.classNames.tagTextSelector)},setTagTextNode:function(t,e){this.getTagTextNode(t).innerHTML=c(e);},editTag:function(t,e){var i=this;t=t||this.getLastTag(),e=e||{};var s=this.settings,a=this.getTagTextNode(t),o=this.getNodeIndex(t),r=y(t),l=this.events.callbacks,d=!0,c="select"==s.mode;if(!c&&this.dropdown.hide(),a){if(!G(r,Object)||!("editable"in r)||r.editable)return r=y(t,{__originalData:g({},r),__originalHTML:t.cloneNode(!0)}),y(r.__originalHTML,r.__originalData),a.setAttribute("contenteditable",!0),t.classList.add(s.classNames.tagEditing),a.addEventListener("click",l.onEditTagClick.bind(this,t)),a.addEventListener("blur",l.onEditTagBlur.bind(this,this.getTagTextNode(t))),a.addEventListener("input",l.onEditTagInput.bind(this,a)),a.addEventListener("paste",l.onEditTagPaste.bind(this,a)),a.addEventListener("keydown",(function(e){return l.onEditTagkeydown.call(i,e,t)})),a.addEventListener("compositionstart",l.onCompositionStart.bind(this)),a.addEventListener("compositionend",l.onCompositionEnd.bind(this)),e.skipValidation||(d=this.editTagToggleValidity(t)),a.originalIsValid=d,this.trigger("edit:start",{tag:t,index:o,data:r,isValid:d}),a.focus(),!c&&this.setRangeAtStartEnd(!1,a),0===s.dropdown.enabled&&!c&&this.dropdown.show(),this.state.hasFocus=!0,this}else n.warn("Cannot find element in Tag template: .",s.classNames.tagTextSelector);},editTagToggleValidity:function(t,e){var i;if(e=e||y(t))return (i=!("__isValid"in e)||!0===e.__isValid)||this.removeTagsFromValue(t),this.update(),t.classList.toggle(this.settings.classNames.tagNotAllowed,!i),e.__isValid=i,e.__isValid;n.warn("tag has no data: ",t,e);},onEditTagDone:function(t,e){t=t||this.state.editing.scope,e=e||{};var i,n,s={tag:t,index:this.getNodeIndex(t),previousData:y(t),data:e},a=this.settings;this.trigger("edit:beforeUpdate",s,{cloneData:!1}),this.state.editing=!1,delete e.__originalData,delete e.__originalHTML,t&&(void 0!==(n=e[a.tagTextProp])?null===(i=(n+="").trim)||void 0===i?void 0:i.call(n):a.tagTextProp in e?void 0:e.value)?(t=this.replaceTag(t,e),this.editTagToggleValidity(t,e),a.a11y.focusableTags?t.focus():"select"!=a.mode&&T(t)):t&&this.removeTags(t),this.trigger("edit:updated",s),this.dropdown.hide(),this.settings.keepInvalidTags&&this.reCheckInvalidTags();},replaceTag:function(t,e){e&&""!==e.value&&void 0!==e.value||(e=t.__tagifyTagData),e.__isValid&&1!=e.__isValid&&g(e,this.getInvalidTagAttrs(e,e.__isValid));var i=this.createTagElem(e);return t.parentNode.replaceChild(i,t),this.updateValueByDOMTags(),i},updateValueByDOMTags:function(){var t=this;this.value.length=0;var e=this.settings.classNames,i=[e.tagNotAllowed.split(" ")[0],e.tagHide];[].forEach.call(this.getTagElms(),(function(e){Q(e.classList).some((function(t){return i.includes(t)}))||t.value.push(y(e));})),this.update();},injectAtCaret:function(t,e){var i;if(!(e=e||(null===(i=this.state.selection)||void 0===i?void 0:i.range))&&t)return this.appendMixTags(t),this;var n=w(t,e);return this.setRangeAtStartEnd(!1,n),this.updateValueByDOMTags(),this.update(),this},input:{set:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],i=this.settings,n=i.dropdown.closeOnSelect;this.state.inputText=t,e&&(this.DOM.input.innerHTML=c(""+t),t&&this.toggleClass(i.classNames.empty,!this.DOM.input.innerHTML)),!t&&n&&this.dropdown.hide.bind(this),this.input.autocomplete.suggest.call(this),this.input.validate.call(this);},raw:function(){return this.DOM.input.textContent},validate:function(){var t=!this.state.inputText||!0===this.validateTag({value:this.state.inputText});return this.DOM.input.classList.toggle(this.settings.classNames.inputInvalid,!t),t},normalize:function(t,e){var i=t||this.DOM.input,n=[];i.childNodes.forEach((function(t){return 3==t.nodeType&&n.push(t.nodeValue)})),n=n.join("\n");try{n=n.replace(/(?:\r\n|\r|\n)/g,this.settings.delimiters.source.charAt(0));}catch(t){}return n=n.replace(/\s/g," "),(null==e?void 0:e.trim)?this.trim(n):n},autocomplete:{suggest:function(t){if(this.settings.autoComplete.enabled){"object"!=typeof(t=t||{value:""})&&(t={value:t});var e=this.dropdown.getMappedValue(t);if("number"!=typeof e){var i=this.state.inputText.toLowerCase(),n=e.substr(0,this.state.inputText.length).toLowerCase(),s=e.substring(this.state.inputText.length);e&&this.state.inputText&&n==i?(this.DOM.input.setAttribute("data-suggest",s),this.state.inputSuggestion=t):(this.DOM.input.removeAttribute("data-suggest"),delete this.state.inputSuggestion);}}},set:function(t){var e=this.DOM.input.getAttribute("data-suggest"),i=t||(e?this.state.inputText+e:null);return !!i&&("mix"==this.settings.mode?this.replaceTextWithNode(document.createTextNode(this.state.tag.prefix+i)):(this.input.set.call(this,i),this.setRangeAtStartEnd(!1,this.DOM.input)),this.input.autocomplete.suggest.call(this),this.dropdown.hide(),!0)}}},getTagIdx:function(t){return this.value.findIndex((function(e){return e.__tagId==(t||{}).__tagId}))},getNodeIndex:function(t){var e=0;if(t)for(;t=t.previousElementSibling;)e++;return e},getTagElms:function(){for(var t=arguments.length,e=new Array(t),i=0;i<t;i++)e[i]=arguments[i];var n="."+Q(this.settings.classNames.tag.split(" ")).concat(Q(e)).join(".");return [].slice.call(this.DOM.scope.querySelectorAll(n))},getLastTag:function(){var t=this.settings.classNames,e=this.DOM.scope.querySelectorAll("".concat(t.tagSelector,":not(.").concat(t.tagHide,"):not([readonly])"));return e[e.length-1]},isTagDuplicate:function(t,e,i){var n=0,a=!0,o=!1,r=void 0;try{for(var l,d=this.value[Symbol.iterator]();!(a=(l=d.next()).done);a=!0){var c=l.value;s(this.trim(""+t),c.value,e)&&i!=c.__tagId&&n++;}}catch(t){o=!0,r=t;}finally{try{a||null==d.return||d.return();}finally{if(o)throw r}}return n},getTagIndexByValue:function(t){var e=this,i=[],n=this.settings.dropdown.caseSensitive;return this.getTagElms().forEach((function(a,o){a.__tagifyTagData&&s(e.trim(a.__tagifyTagData.value),t,n)&&i.push(o);})),i},getTagElmByValue:function(t){var e=this.getTagIndexByValue(t)[0];return this.getTagElms()[e]},flashTag:function(t){var e=this;t&&(t.classList.add(this.settings.classNames.tagFlash),setTimeout((function(){t.classList.remove(e.settings.classNames.tagFlash);}),100));},isTagBlacklisted:function(t){return t=this.trim(t.toLowerCase()),this.settings.blacklist.filter((function(e){return (""+e).toLowerCase()==t})).length},isTagWhitelisted:function(t){return !!this.getWhitelistItem(t)},getWhitelistItem:function(t,e,i){e=e||"value";var n,a=this.settings;return (i=i||a.whitelist).some((function(i){var o="object"==typeof i?i[e]||i.value:i;if(s(o,t,a.dropdown.caseSensitive,a.trim))return n="object"==typeof i?i:{value:i},!0})),n||"value"!=e||"value"==a.tagTextProp||(n=this.getWhitelistItem(t,a.tagTextProp,i)),n},validateTag:function(t){var e=this.settings,i="value"in t?"value":e.tagTextProp,n=this.trim(t[i]+"");return (t[i]+"").trim()?"mix"!=e.mode&&e.pattern&&G(e.pattern,RegExp)&&!e.pattern.test(n)?this.TEXTS.pattern:!e.duplicates&&this.isTagDuplicate(n,e.dropdown.caseSensitive,t.__tagId)?this.TEXTS.duplicate:this.isTagBlacklisted(n)||e.enforceWhitelist&&!this.isTagWhitelisted(n)?this.TEXTS.notAllowed:!e.validate||e.validate(t):this.TEXTS.empty},getInvalidTagAttrs:function(t,e){return {"aria-invalid":!0,class:"".concat(t.class||""," ").concat(this.settings.classNames.tagNotAllowed).trim(),title:e}},hasMaxTags:function(){return this.value.length>=this.settings.maxTags&&this.TEXTS.exceed},setReadonly:function(t,e){var i=this.settings;this.DOM.scope.contains(document.activeElement)&&document.activeElement.blur(),i[e||"readonly"]=t,this.DOM.scope[(t?"set":"remove")+"Attribute"](e||"readonly",!0),this.settings.userInput=!0,this.setContentEditable(!t);},setContentEditable:function(t){this.DOM.input.contentEditable=t,this.DOM.input.tabIndex=t?0:-1;},setDisabled:function(t){this.setReadonly(t,"disabled");},normalizeTags:function(t){var e=this,i=this.settings,n=i.whitelist,s=i.delimiters,a=i.mode,o=i.tagTextProp,r=[],l=!!n&&G(n[0],Object),d=Array.isArray(t),c=d&&t[0].value,h=function(t){return (t+"").split(s).reduce((function(t,i){var n,s=e.trim(i);return s&&t.push((J(n={},o,s),J(n,"value",s),n)),t}),[])};if("number"==typeof t&&(t=t.toString()),"string"==typeof t){if(!t.trim())return [];t=h(t);}else d&&(t=t.reduce((function(t,i){if(u(i)){var n=g({},i);o in n||(o="value"),n[o]=e.trim(n[o]),n[o]&&t.push(n);}else if(i){var s;(s=t).push.apply(s,Q(h(i)));}return t}),[]));return l&&!c&&(t.forEach((function(t){var i=r.map((function(t){return t.value})),n=e.dropdown.filterListItems.call(e,t[o],{exact:!0});e.settings.duplicates||(n=n.filter((function(t){return !i.includes(t.value)})));var s=n.length>1?e.getWhitelistItem(t[o],o,n):n[0];s&&G(s,Object)?r.push(s):"mix"!=a&&(null==t.value&&(t.value=t[o]),r.push(t));})),r.length&&(t=r)),t},parseMixTags:function(t){var e=this,i=this.settings,n=i.mixTagsInterpolator,s=i.duplicates,a=i.transformTag,o=i.enforceWhitelist,r=i.maxTags,l=i.tagTextProp,d=[];t=t.split(n[0]).map((function(t,i){var c,u,g,h=t.split(n[1]),p=h[0],f=d.length==r;try{if(p==+p)throw Error;u=JSON.parse(p);}catch(t){u=e.normalizeTags(p)[0]||{value:p};}if(a.call(e,u),f||!(h.length>1)||o&&!e.isTagWhitelisted(u.value)||!s&&e.isTagDuplicate(u.value)){if(t)return i?n[0]+t:t}else u[c=u[l]?l:"value"]=e.trim(u[c]),g=e.createTagElem(u),d.push(u),g.classList.add(e.settings.classNames.tagNoAnimation),h[0]=g.outerHTML,e.value.push(u);return h.join("")})).join(""),this.DOM.input.innerHTML=t,this.DOM.input.appendChild(document.createTextNode("")),this.DOM.input.normalize();var c=this.getTagElms();return c.forEach((function(t,e){return y(t,d[e])})),this.update({withoutChangeEvent:!0}),O(c,this.state.hasFocus),t},replaceTextWithNode:function(t,e){if(this.state.tag||e){e=e||this.state.tag.prefix+this.state.tag.value;var i,n,s=this.state.selection||window.getSelection(),a=s.anchorNode,o=this.state.tag.delimiters?this.state.tag.delimiters.length:0;return a.splitText(s.anchorOffset-o),-1==(i=a.nodeValue.lastIndexOf(e))?!0:(n=a.splitText(i),t&&a.parentNode.replaceChild(t,n),!0)}},prepareNewTagNode:function(t,e){e=e||{};var i=this.settings,n=[],s={},a=Object.assign({},t,{value:t.value+""});if(t=Object.assign({},a),i.transformTag.call(this,t),t.__isValid=this.hasMaxTags()||this.validateTag(t),!0!==t.__isValid){if(e.skipInvalid)return;if(g(s,this.getInvalidTagAttrs(t,t.__isValid),{__preInvalidData:a}),t.__isValid==this.TEXTS.duplicate&&this.flashTag(this.getTagElmByValue(t.value)),!i.createInvalidTags)return void n.push(t.value)}return "readonly"in t&&(t.readonly?s["aria-readonly"]=!0:delete t.readonly),{tagElm:this.createTagElem(t,s),tagData:t,aggregatedInvalidInput:n}},postProcessNewTagNode:function(t,e){var i=this,n=this.settings,s=e.__isValid;s&&!0===s?(this.value.push(e),setTimeout((function(){i.trigger("add",{tag:t,index:i.value.length-1,data:e});}))):(this.trigger("invalid",{data:e,index:this.value.length,tag:t,message:s}),n.keepInvalidTags||setTimeout((function(){return i.removeTags(t,!0)}),1e3)),this.dropdown.position();},selectTag:function(t,e){var i=this;if(!this.settings.enforceWhitelist||this.isTagWhitelisted(e.value)){this.state.actions.selectOption&&setTimeout((function(){return i.setRangeAtStartEnd(!1,i.DOM.input)}));var n=this.getLastTag();return n?this.replaceTag(n,e):this.appendTag(t),this.value[0]=e,this.update(),this.trigger("add",{tag:t,data:e}),[t]}},addEmptyTag:function(t){var e=g({value:""},t||{}),i=this.createTagElem(e);y(i,e),this.appendTag(i),this.editTag(i,{skipValidation:!0}),this.toggleFocusClass(!0);},addTags:function(t,e,i){var n=this,s=[],a=this.settings,o=[],r=document.createDocumentFragment();if(!t||0==t.length)return s;switch(t=this.normalizeTags(t),a.mode){case"mix":return this.addMixTags(t);case"select":e=!1,this.removeAllTags();}return this.DOM.input.removeAttribute("style"),t.forEach((function(t){var e=n.prepareNewTagNode(t,{skipInvalid:i||a.skipInvalid});if(e){var l=e.tagElm;if(t=e.tagData,o=e.aggregatedInvalidInput,s.push(l),"select"==a.mode)return n.selectTag(l,t);r.appendChild(l),n.postProcessNewTagNode(l,t);}})),this.appendTag(r),this.update(),t.length&&e&&(this.input.set.call(this,a.createInvalidTags?"":o.join(a._delimiters)),this.setRangeAtStartEnd(!1,this.DOM.input)),this.dropdown.refilter(),s},addMixTags:function(t){var e=this;if((t=this.normalizeTags(t))[0].prefix||this.state.tag)return this.prefixedTextToTag(t[0]);var i=document.createDocumentFragment();return t.forEach((function(t){var n=e.prepareNewTagNode(t);i.appendChild(n.tagElm),e.insertAfterTag(n.tagElm),e.postProcessNewTagNode(n.tagElm,n.tagData);})),this.appendMixTags(i),i.children},appendMixTags:function(t){var e=!!this.state.selection;e?this.injectAtCaret(t):(this.DOM.input.focus(),(e=this.setStateSelection()).range.setStart(this.DOM.input,e.range.endOffset),e.range.setEnd(this.DOM.input,e.range.endOffset),this.DOM.input.appendChild(t),this.updateValueByDOMTags(),this.update());},prefixedTextToTag:function(t){var e,i,n,s=this,a=this.settings,o=null===(e=this.state.tag)||void 0===e?void 0:e.delimiters;if(t.prefix=t.prefix||this.state.tag?this.state.tag.prefix:(a.pattern.source||a.pattern)[0],n=this.prepareNewTagNode(t),i=n.tagElm,this.replaceTextWithNode(i)||this.DOM.input.appendChild(i),setTimeout((function(){return i.classList.add(s.settings.classNames.tagNoAnimation)}),300),this.value.push(n.tagData),this.update(),!o){var r=this.insertAfterTag(i)||i;setTimeout(T,0,r);}return this.state.tag=null,this.postProcessNewTagNode(i,n.tagData),i},appendTag:function(t){var e=this.DOM,i=e.input;e.scope.insertBefore(t,i);},createTagElem:function(t,e){t.__tagId=m();var i,n=g({},t,$$1({value:c(t.value+"")},e));return function(t){for(var e,i=document.createNodeIterator(t,NodeFilter.SHOW_TEXT,null,!1);e=i.nextNode();)e.textContent.trim()||e.parentNode.removeChild(e);}(i=this.parseTemplate("tag",[n,this])),y(i,t),i},reCheckInvalidTags:function(){var t=this,e=this.settings;this.getTagElms(e.classNames.tagNotAllowed).forEach((function(i,n){var s=y(i),a=t.hasMaxTags(),o=t.validateTag(s),r=!0===o&&!a;if("select"==e.mode&&t.toggleScopeValidation(o),r)return s=s.__preInvalidData?s.__preInvalidData:{value:s.value},t.replaceTag(i,s);i.title=a||o;}));},removeTags:function(t,e,i){var n,s=this,a=this.settings;if(t=t&&G(t,HTMLElement)?[t]:G(t,Array)?t:t?[t]:[this.getLastTag()].filter((function(t){return t})),n=t.reduce((function(t,e){e&&"string"==typeof e&&(e=s.getTagElmByValue(e));var i=y(e);return e&&i&&!i.readonly&&t.push({node:e,idx:s.getTagIdx(i),data:y(e,{__removed:!0})}),t}),[]),i="number"==typeof i?i:this.CSSVars.tagHideTransition,"select"==a.mode&&(i=0,this.input.set.call(this)),1==n.length&&"select"!=a.mode&&n[0].node.classList.contains(a.classNames.tagNotAllowed)&&(e=!0),n.length)return a.hooks.beforeRemoveTag(n,{tagify:this}).then((function(){var t=function(t){t.node.parentNode&&(t.node.parentNode.removeChild(t.node),e?a.keepInvalidTags&&this.trigger("remove",{tag:t.node,index:t.idx}):(this.trigger("remove",{tag:t.node,index:t.idx,data:t.data}),this.dropdown.refilter(),this.dropdown.position(),this.DOM.input.normalize(),a.keepInvalidTags&&this.reCheckInvalidTags()));};i&&i>10&&1==n.length?function(e){e.node.style.width=parseFloat(window.getComputedStyle(e.node).width)+"px",document.body.clientTop,e.node.classList.add(a.classNames.tagHide),setTimeout(t.bind(this),i,e);}.call(s,n[0]):n.forEach(t.bind(s)),e||(s.removeTagsFromValue(n.map((function(t){return t.node}))),s.update(),"select"==a.mode&&a.userInput&&s.setContentEditable(!0));})).catch((function(t){}))},removeTagsFromDOM:function(){this.getTagElms().forEach((function(t){return t.remove()}));},removeTagsFromValue:function(t){var e=this;(t=Array.isArray(t)?t:[t]).forEach((function(t){var i=y(t),n=e.getTagIdx(i);n>-1&&e.value.splice(n,1);}));},removeAllTags:function(t){var e=this;t=t||{},this.value=[],"mix"==this.settings.mode?this.DOM.input.innerHTML="":this.removeTagsFromDOM(),this.dropdown.refilter(),this.dropdown.position(),this.state.dropdown.visible&&setTimeout((function(){e.DOM.input.focus();})),"select"==this.settings.mode&&(this.input.set.call(this),this.settings.userInput&&this.setContentEditable(!0)),this.update(t);},postUpdate:function(){this.state.blockChangeEvent=!1;var t,e,i=this.settings,n=i.classNames,s="mix"==i.mode?i.mixMode.integrated?this.DOM.input.textContent:this.DOM.originalInput.value.trim():this.value.length+this.input.raw.call(this).length;(this.toggleClass(n.hasMaxTags,this.value.length>=i.maxTags),this.toggleClass(n.hasNoTags,!this.value.length),this.toggleClass(n.empty,!s),"select"==i.mode)&&this.toggleScopeValidation(null===(e=this.value)||void 0===e||null===(t=e[0])||void 0===t?void 0:t.__isValid);},setOriginalInputValue:function(t){var e=this.DOM.originalInput;this.settings.mixMode.integrated||(e.value=t,e.tagifyValue=e.value,this.setPersistedData(t,"value"));},update:function(t){clearTimeout(this.debouncedUpdateTimeout),this.debouncedUpdateTimeout=setTimeout(function(){var e=this.getInputValue();this.setOriginalInputValue(e),this.settings.onChangeAfterBlur&&(t||{}).withoutChangeEvent||this.state.blockChangeEvent||this.triggerChangeEvent();this.postUpdate();}.bind(this),100),this.events.bindOriginaInputListener.call(this,100);},getInputValue:function(){var t=this.getCleanValue();return "mix"==this.settings.mode?this.getMixedTagsAsString(t):t.length?this.settings.originalInputValueFormat?this.settings.originalInputValueFormat(t):JSON.stringify(t):""},getCleanValue:function(t){return a(t||this.value,this.dataProps)},getMixedTagsAsString:function(){var t="",e=this,i=this.settings,n=i.originalInputValueFormat||JSON.stringify,s=i.mixTagsInterpolator;return function i(a){a.childNodes.forEach((function(a){if(1==a.nodeType){var r=y(a);if("BR"==a.tagName&&(t+="\r\n"),r&&v.call(e,a)){if(r.__removed)return;t+=s[0]+n(o(r,e.dataProps))+s[1];}else a.getAttribute("style")||["B","I","U"].includes(a.tagName)?t+=a.textContent:"DIV"!=a.tagName&&"P"!=a.tagName||(t+="\r\n",i(a));}else t+=a.textContent;}));}(this.DOM.input),t}},Y.prototype.removeTag=Y.prototype.removeTags;

const revealedState = {
    enabled: false,
    revealed: '#008000',
    hidden: '#ff0000'
};

const optionalFields = {
    level: false,
    languages: false,
    height: false,
    weight: false,
};

const getVagueDescriptionLabels = () => ({
    full: {
        extreme: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Extreme'),
        high: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.High'),
        moderate: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Moderate'),
        low: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Low'),
        terrible: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Terrible'),
    },
    short: {
        extreme: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Extreme'),
        high: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.High'),
        moderate: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Moderate'),
        low: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Low'),
        terrible: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Terrible'),
    }
});

class Creature extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            hidden: new fields.BooleanField({ required: true, initial: false }),
            uuid: new fields.StringField({ required: true }),
            version: new fields.StringField({ required: true }),
            img: new fields.StringField({ required: true }),
            texture: new fields.StringField({ required: true }),
            name: toggleStringField(),
            publication: new fields.SchemaField({
                authors: new fields.StringField({}),
                license: new fields.StringField({}),
                remaster: new fields.BooleanField({}),
                title: new fields.StringField({}),
            }),
            hardness: new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.StringField({}),
            }),
            allSaves: new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.StringField({}),
            }),
            ac: new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.NumberField({ required: true, integer: true }),
                custom: new fields.StringField({ nullable: true }),
                details: new fields.StringField({}),
            }),
            hp: new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.NumberField({ required: true, integer: true }),
                custom: new fields.StringField({ nullable: true }),
                temp: new fields.NumberField({ integer: true }),
                details: new fields.StringField({}),
                negativeHealing: new fields.BooleanField({}),
            }),
            level: toggleNumberField(),
            size: new fields.StringField({ required: true }),
            skills: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                empty: new fields.BooleanField({ initial: false }),
                lore: new fields.BooleanField({}),
                note: new fields.StringField({}),
                modifiers: new fields.ArrayField(new fields.SchemaField({
                    kind: new fields.StringField({}),
                    label: new fields.StringField({}),
                    modifier: new fields.NumberField({ integer: true }),
                }), { initial: []}),
                label: new fields.StringField({}),
                value: new fields.StringField({ required: true }),
                totalModifier: new fields.NumberField({ required: false, integer: true }),
            })),
            abilities: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                custom: new fields.StringField({ nullable: true }),
                mod: new fields.NumberField({ required: true, integer: true }),
                key: new fields.StringField({ required: true }),
            })),    
            saves: new fields.SchemaField({
                fortitude: toggleNumberField(),
                reflex: toggleNumberField(),
                will: toggleNumberField(),
            }),
            speeds: new fields.SchemaField({
                details: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    name: new fields.StringField({ required: true }),
                }, { required: false }),
                values: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }),
                    value: new fields.NumberField({ required: true, integer: true })
                }))
            }),
            immunities: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({ initial: false }),
                type: new fields.StringField({ required: true }),
                exceptions: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
            })),
            weaknesses: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({ initial: false }),
                type: new fields.StringField({ required: true }),
                value: new fields.NumberField({ required: true, integer: true }),
                exceptions: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
            })),
            resistances: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({ initial: false }),
                type: new fields.StringField({ required: true }),
                value: new fields.NumberField({ required: true, integer: true }),
                exceptions: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
                doubleVs: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
            })),
            rarity: new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.StringField({ required: true }),
            }),
            traits: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.StringField({ required: true }) 
            })),
            attacks: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({}),
                damageStatsRevealed: new fields.BooleanField({ required: true, initial: false }),
                label: new fields.StringField({ required: true }),
                actions: new fields.StringField({ required: true }),
                totalModifier: new fields.NumberField({ required: true }),
                isMelee: new fields.BooleanField({ required: true }),
                additionalEffects: new MappingField(new fields.SchemaField({
                    label: new fields.StringField({ required: true}),
                    tag: new fields.StringField({ required: true}), 
                })),
                traits: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true }),
                    description: new fields.StringField({ required: true }),
                })),
                variants: new MappingField(new fields.SchemaField({
                    label: new fields.StringField({}),
                })),
                damageInstances: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({  }),
                    category: new fields.StringField({ nullable: true }),
                    damage: new fields.SchemaField({
                        value: new fields.StringField({ nullable: true }),
                    }),
                    damageType: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({ required: true })
                    })
                })),
                rules: new fields.ObjectField({}),
            })),
            actions: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({}),
                label: new fields.StringField({ required: true }),
                category: new fields.StringField({}),
                deathNote: new fields.BooleanField({}),
                actions: new fields.StringField({ required: true }),
                traits: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true })
                })),
                description: new fields.HTMLField({ required: true, initial: '' }),
            })),
            passives: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({}),
                label: new fields.StringField({ required: true }),
                category: new fields.StringField({}),
                deathNote: new fields.BooleanField({}),
                traits: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true })
                })),
                description: new fields.HTMLField({ required: true, initial: '' }),
            })),
            spells: new fields.SchemaField({
                fake: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                }, { nullable: true, initial: null }),
                entries: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    tradition: new fields.StringField({ required: true }),
                    category: new fields.StringField({ required: true }),
                    dc: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.NumberField({ required: true, integer: true }),
                    }),
                    attack: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.NumberField({ required: true, integer: true }),
                    }),
                    mod: new fields.SchemaField({
                        value: new fields.NumberField({ required: true, integer: true }),
                    }),
                    levels: new MappingField(new fields.SchemaField({
                        value: new fields.StringField({ required: true }),
                        spells: new MappingField(new fields.SchemaField({
                            revealed: new fields.BooleanField({ required: true, initial: false }),
                            label: new fields.StringField({ required: true }),
                            img: new fields.StringField({ required: true }),
                            actions: new fields.StringField({ required: true }),
                            defense: new fields.SchemaField({
                                statistic: new fields.StringField({}),
                                basic: new fields.BooleanField({}),
                            }, { required: false, nullable: true, initial: null }),
                            range: new fields.StringField({}),
                            traits: new fields.SchemaField({
                                rarity: new fields.StringField({ required: true }),
                                traditions: new fields.ArrayField(new fields.StringField({})),
                                values: new MappingField(new fields.SchemaField({
                                    value: new fields.StringField({ required: true }),
                                })),
                            }),
                            description: new fields.SchemaField({
                                gm: new fields.HTMLField({ required: true }),
                                value: new fields.HTMLField({ required: true }),
                            }),
                        })),
                    })),
                }))
            }),
            senses: new fields.SchemaField({
                perception: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    custom: new fields.StringField({ nullable: true }),
                    value: new fields.NumberField({ required: true, integer: true }),
                }),
                details: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true }),
                }),
                senses: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    fake: new fields.BooleanField({}),
                    type: new fields.StringField({ required: true }),
                    acuity: new fields.StringField({ required: true }),
                    range: new fields.NumberField({ required: true, integer: true }),
                })),
            }),
            languages: new fields.SchemaField({
                details: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true }),
                }),
                values: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    fake: new fields.BooleanField({}),
                    empty: new fields.BooleanField({ initial: false }),
                    value: new fields.StringField({ required: true }),
                })),
            }),
            notes: new fields.SchemaField({
                public: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.HTMLField({ required: true, initial: '' }),
                }),
                private: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.HTMLField({ required: true, initial: '' }),
                }),
                player: new fields.SchemaField({
                    value: new fields.HTMLField({ required: true, initial: '' }),
                })
            }),
        };
    }

    get displayImage(){
        return game.settings.get('pf2e-bestiary-tracking', 'use-token-art') ? this.texture : this.img;
    }

    get sizeLabel(){
        return game.i18n.localize(CONFIG.PF2E.actorSizes[this.size]);
    }

    get allSenses(){
        const sensesDetails = this.senses.details.value ? { details: { ...this.senses.details, label: this.senses.details.value, isDetails: true }} : {};
        return {
            perception: { ...this.senses.perception, label: 'PF2E.PerceptionLabel', isPerception: true },
            ...sensesDetails,
            ...Object.keys(this.senses.senses).reduce((acc, sense) => {
                acc[sense] = { ...this.senses.senses[sense], label: CONFIG.PF2E.senses[this.senses.senses[sense].type] ?? this.senses.senses[sense].type };
                return acc;
            }, {}),
        };
    }

    get allLanguages(){
        const languageDetails = this.languages.details.value ? { details: { ...this.languages.details, label: this.languages.details.value, isDetails: true } } : {};
        return {
            ...Object.keys(this.languages.values).reduce((acc, key) => {
                acc[`values.${key}`] = { ...this.languages.values[key], label: CONFIG.PF2E.languages[this.languages.values[key].value] ?? this.languages.values[key].value };
    
                return acc;
            }, {}),
            ...languageDetails,
        };
    }

    get allSpeeds(){
        const speedDetails = this.speeds.details.value ? { details: this.speeds.details } : {};
        return { 
            ...Object.keys(this.speeds.values).reduce((acc, speed) => {
                acc[`values.${speed}`] = { ...this.speeds.values[speed], name: CONFIG.PF2E.speedTypes[this.speeds.values[speed].type] };

                return acc;
            }, {}),
            ...speedDetails,
        };
    }

    get sortedSpells(){
        return {
            fake: this.spells.fake,
            entries: Object.keys(this.spells.entries).reduce((acc, entry) => {
                acc[entry] = { 
                    ...this.spells.entries[entry],
                    label: `${game.i18n.localize(CONFIG.PF2E.magicTraditions[this.spells.entries[entry].tradition])} ${game.i18n.localize(CONFIG.PF2E.preparationType[this.spells.entries[entry].category])} ${game.i18n.localize("PF2E.Item.Spell.Plural")}`,
                    levels: Object.keys(this.spells.entries[entry].levels).reduce((acc, levelKey) => {
                        const level = this.spells.entries[entry].levels[levelKey];
                        acc.push({
                            ...level,
                            key: levelKey,
                            revealed: Object.values(level.spells).some(x => x.revealed),
                            label: levelKey === 'Cantrips' ? 
                                game.i18n.localize('PF2E.Actor.Creature.Spellcasting.Cantrips') : 
                                game.i18n.format('PF2E.Item.Spell.Rank.Ordinal', { rank: game.i18n.format("PF2E.OrdinalNumber", { value: level.value, suffix: levelKey === '1' ? 'st' : levelKey === '2' ? 'nd' : levelKey === '3' ? 'rd' : 'th' }) }),
                            spells: Object.keys(level.spells).reduce((acc, spell) => {
                                acc[spell] = {
                                    ...level.spells[spell],
                                    defense: !level.spells[spell].defense ? null : 
                                        { ...level.spells[spell].defense, label: level.spells[spell].defense.basic ? 
                                            game.i18n.format('PF2E.InlineCheck.BasicWithSave', { save: game.i18n.localize(CONFIG.PF2E.saves[level.spells[spell].defense.statistic]) }) : 
                                            game.i18n.localize(CONFIG.PF2E.saves[level.spells[spell].defense.statistic]) 
                                        }
                                };
    
                                return acc;
                            }, {}),
                        });
    
                        return acc;
                    }, []).sort((a, b) => {
                        if(a.key === 'Cantrips' && b.key !== 'Cantrips') return -1;
                        else if(a.key !== 'Cantrips' && b.key === 'Cantrips') return 1;
                        else if(a.key === 'Cantrips' && b.key === 'Cantrips') return 0;
    
                        return a.key - b.key;
                    }), 
                };
    
                return acc;
            }, {})
        };
    }

    _getRefreshData(actor, creatureData){
        const data = creatureData ?? getCreatureData(actor);

        const spells = data.system.spells.fake ? 
            { fake: { ...data.system.spells.fake, revealed: this.spells.fake?.revealed ?? data.system.spells.fake.revealed }, entries: {} } : 
            {
                entries: Object.keys(data.system.spells.entries).reduce((acc, key) =>{
                    const entry = data.system.spells.entries[key];
                    const oldEntry = this.spells.entries[key];
                    acc[key] = {
                        ...entry,
                        revealed: oldEntry?.revealed ?? entry.revealed,
                        dc: { ...entry.dc, revealed: oldEntry?.dc?.revealed ?? entry.dc.revealed },
                        attack: { ...entry.attack, revealed: oldEntry?.attack?.revealed ?? entry.attack.revealed },
                        levels: Object.keys(entry.levels).reduce((acc, key) => {
                            const { spells, ...rest } = entry.levels[key];
                            acc[key] = {
                                ...rest,
                                spells: Object.keys(entry.levels[key].spells).reduce((acc, spell) => {
                                    const oldSpell = oldEntry && oldEntry.levels[key] ? oldEntry.levels[key].spells[spell] : null;
                                    acc[spell] = {
                                        ...entry.levels[key].spells[spell],
                                        revealed: oldSpell?.revealed ?? entry.levels[key].spells[spell].revealed,
                                    };

                                    return acc;
                                }, {}),
                            };

                            return acc;
                        }, {}),
                    };

                    return acc;
                }, {}), 
            };

        return {
            name: data.name,
            system: {
                hidden: this.hidden,
                uuid: data.system.uuid,
                version: data.system.version,
                img: data.system.img,
                texture: data.system.texture,
                size: data.system.size,
                name: { ...data.system.name, revealed: this.name.revealed, custom: this.name.custom },
                ac: { ...data.system.ac, revealed: this.ac.revealed, custom: this.ac.custom },
                hp: { ...data.system.hp, revealed: this.hp.revealed, custom: this.hp.custom },
                level: { ...data.system.level, revealed: this.level.revealed, custom: this.level.custom },
                skills: Object.keys(data.system.skills).reduce((acc, key) => {
                    acc[key] = { ...data.system.skills[key], revealed: this.skills[key] ? this.skills[key].revealed : data.system.skills[key].revealed };
                    return acc;
                }, {}),
                abilities: Object.keys(data.system.abilities).reduce((acc, key) => {
                    acc[key] = { ...data.system.abilities[key], revealed: this.abilities[key] ? this.abilities[key].revealed : data.system.abilities[key].revealed };
                    return acc;
                }, {}),
                saves: Object.keys(data.system.saves).reduce((acc, key) => {
                    acc[key] = { ...data.system.saves[key], revealed: this.saves[key] ? this.saves[key].revealed : data.system.saves[key].revealed };
                    return acc;
                }, {}),
                speeds: {
                    details: { ...data.system.speeds.details, revealed: this.speeds.details.revealed },
                    values: Object.keys(data.system.speeds.values).reduce((acc, key) => {
                        acc[key] = { ...data.system.speeds.values[key], revealed: this.speeds.values[key] ? this.speeds.values[key].revealed : data.system.speeds.values[key].revealed };
                        return acc;
                    }, {})
                },
                immunities: Object.keys(data.system.immunities).reduce((acc, key) => {
                    const immunity = data.system.immunities[key];
                    const oldImmunity = this.immunities[key];
                    acc[key] = {
                        ...immunity,
                        revealed: oldImmunity ? oldImmunity.revealed : immunity.revealed,
                        exceptions: Object.keys(immunity.exceptions).reduce((acc, ex) => {
                            acc[ex] = { ...immunity.exceptions[ex], revealed: oldImmunity?.exceptions[ex] ? oldImmunity.exceptions[ex].revealed : immunity.exceptions[ex].revealed };
                            return acc;
                        }, {}),
                    };

                    return acc;
                }, Object.keys(this.immunities).reduce((acc, key) => {
                    if(this.immunities[key].fake) acc[key] = this.immunities[key];
                    return acc;
                }, {})),
                weaknesses: Object.keys(data.system.weaknesses).reduce((acc, key) => {
                    const weakness = data.system.weaknesses[key];
                    const oldWeakness = this.weaknesses[key];
                    acc[key] = {
                        ...weakness,
                        revealed: oldWeakness ? oldWeakness.revealed : weakness.revealed,
                        exceptions: Object.keys(weakness.exceptions).reduce((acc, ex) => {
                            acc[ex] = { ...weakness.exceptions[ex], revealed: oldWeakness?.exceptions[ex] ? oldWeakness.exceptions[ex].revealed : weakness.exceptions[ex].revealed };
                            return acc;
                        }, {}),
                    };

                    return acc;
                }, Object.keys(this.weaknesses).reduce((acc, key) => {
                    if(this.weaknesses[key].fake) acc[key] = this.weaknesses[key];
                    return acc;
                }, {})),
                resistances: Object.keys(data.system.resistances).reduce((acc, key) => {
                    const resistance = data.system.resistances[key];
                    const oldResistance = this.resistances[key];
                    acc[key] = {
                        ...resistance,
                        revealed: oldResistance ? oldResistance.revealed : resistance.revealed,
                        exceptions: Object.keys(resistance.exceptions).reduce((acc, ex) => {
                            acc[ex] = { ...resistance.exceptions[ex], revealed: oldResistance?.exceptions[ex] ? oldResistance.exceptions[ex].revealed : resistance.exceptions[ex].revealed };
                            return acc;
                        }, {}),
                        doubleVs: Object.keys(resistance.doubleVs).reduce((acc, ex) => {
                            acc[ex] = { ...resistance.doubleVs[ex], revealed: oldResistance?.doubleVs[ex] ? oldResistance.doubleVs[ex].revealed : resistance.doubleVs[ex].revealed };
                            return acc;
                        }, {}),
                    };

                    return acc;
                }, Object.keys(this.resistances).reduce((acc, key) => {
                    if(this.resistances[key].fake) acc[key] = this.resistances[key];
                    return acc;
                }, {})),
                rarity: { ...data.system.rarity, revealed: this.rarity.revealed },
                traits: Object.keys(data.system.traits).reduce((acc, key) => {
                    acc[key] = { ...data.system.traits[key], revealed: this.traits[key] ? this.traits[key].revealed : data.system.traits[key].revealed };
                    return acc;
                }, {}),
                attacks: Object.keys(data.system.attacks).reduce((acc, key) => {
                    const attack = data.system.attacks[key];
                    const oldAttack = this.attacks[key];
                    acc[key] = {
                        ...attack,
                        revealed: oldAttack?.revealed ?? attack.revealed,
                        damageStatsRevealed: oldAttack?.damageStatsRevealed ?? attack.damageStatsRevealed,
                        traits: Object.keys(attack.traits).reduce((acc, trait) => {
                            acc[trait] = { ...attack.traits[trait], revealed: oldAttack.traits[trait]?.revealed ?? attack.traits[trait].revealed };
                            return acc;
                        }, {}),
                        damageInstances: Object.keys(attack.damageInstances).reduce((acc, damage) => {
                            acc[damage] = { 
                                ...attack.damageInstances[damage], 
                                revealed: oldAttack ? (oldAttack.damageInstances[damage]?.revealed ?? attack.damageInstances[damage].revealed) : attack.damageInstances[damage].revealed, 
                                damageType: { ...attack.damageInstances[damage].damageType, revealed: oldAttack ? (oldAttack.damageInstances[damage]?.damageType?.revealed ?? attack.damageInstances[damage].damageType.revealed) : attack.damageInstances[damage].damageType.revealed } 
                            };
                            return acc;
                        }, {}),
                    };

                    return acc;
                }, Object.keys(this.attacks).reduce((acc, key) => {
                    if(this.attacks[key].fake) acc[key] = this.attacks[key];
                    return acc;
                }, {})),
                actions: Object.keys(data.system.actions).reduce((acc, key) => {
                    const action = data.system.actions[key];
                    const oldAction = this.actions[key];
                    acc[key] = {
                        ...action,
                        revealed: oldAction?.revealed ?? action.revealed,
                        traits: Object.keys(action.traits).reduce((acc, trait) => {
                            const oldTrait = oldAction ? oldAction.traits[trait] : null;
                            acc[trait] = { ...action.traits[trait], revealed: oldTrait?.revealed ?? action.traits[trait].revealed };
                            return acc;
                        }, {}),
                    };

                    return acc;
                }, Object.keys(this.actions).reduce((acc, key) => {
                    if(this.actions[key].fake) acc[key] = this.actions[key];
                    return acc;
                }, {})),
                passives: Object.keys(data.system.passives).reduce((acc, key) => {
                    const passive = data.system.passives[key];
                    const oldPassive = this.passives[key];
                    acc[key] = {
                        ...passive,
                        revealed: oldPassive?.revealed ?? passive.revealed,
                        traits: Object.keys(passive.traits).reduce((acc, trait) => {
                            const oldTrait = oldPassive ? oldPassive.traits[trait] : null;
                            acc[trait] = { ...passive.traits[trait], revealed: oldTrait?.revealed ?? passive.traits[trait].revealed };
                            return acc;
                        }, {}),
                    };

                    return acc;
                }, Object.keys(this.passives).reduce((acc, key) => {
                    if(this.passives[key].fake) acc[key] = this.passives[key];
                    return acc;
                }, {})),
                spells: spells,
                senses: {
                    perception: { ...data.system.senses.perception, revealed: this.senses.perception.revealed, custom: this.senses.perception.custom },
                    details: { ...data.system.senses.details, revealed: this.senses.details.revealed },
                    senses: Object.keys(data.system.senses.senses).reduce((acc, key) => {
                        const sense = data.system.senses.senses[key];
                        const oldSense = this.senses.senses[key];
                        acc[key] = { ...sense, revealed: oldSense?.revealed ?? sense.revealed };

                        return acc;
                    }, Object.keys(this.senses.senses).reduce((acc, key) => {
                        if(this.senses.senses[key].fake) acc[key] = this.senses.senses[key];
                        return acc;
                    }, {})),
                },
                languages: {
                    details: { ...data.system.languages.details, revealed: this.languages.details.revealed },
                    values: Object.keys(data.system.languages.values).reduce((acc, key) => {
                        const language = data.system.languages.values[key];
                        const oldLanguage = this.languages.values[key];
                        acc[key] = { ...language, revealed: oldLanguage?.revealed ?? language.revealed };

                        return acc;
                    }, Object.keys(this.languages.values).reduce((acc, key) => {
                        if(this.languages.values[key].fake) acc[key] = this.languages.values[key];
                        return acc;
                    }, {}))
                },
                notes: {
                    public: { ...data.system.notes.public, revealed: this.notes.public.revealed },
                    private: { ...data.system.notes.private, revealed: this.notes.private.revealed },
                    player: this.notes.player,
                }
            }
        };
    }

    async refreshData() {
        const actor = await fromUuid(this.uuid);
        if(!actor) return;

        await this.parent.update(this._getRefreshData(actor), { diff: false, recursive: false });
    }

    _getToggleUpdate(state){
        const spells = 
            this.spells.fake ? { "spells.fake.revealed": state } :
            { "spells.entries": Object.keys(this.spells.entries).reduce((acc, key) => {
                const entry = this.spells.entries[key];
                acc[key] = {
                    revealed: state,
                    dc: { revealed: state },
                    attack: { revealed: state },
                    levels: Object.keys(entry.levels).reduce((acc, level) => {
                        acc[level] = {
                            spells: Object.keys(entry.levels[level].spells).reduce((acc, level) => {
                                acc[level] = { revealed: state };
                                return acc;
                            }, {}),
                        };
                        return acc;
                    }, {})
                };
                return acc;
            }, {})};

        return {
            system: {
                "name.revealed": state,
                "ac.revealed": state,
                "hp.revealed": state,
                "level.revealed": state,
                "skills": Object.keys(this.skills).reduce((acc, key) => {
                    acc[key] = { revealed: state };
                    return acc;
                }, {}),
                "abilities": Object.keys(this.abilities).reduce((acc, key) => {
                    acc[key] = { revealed: state };
                    return acc;
                }, {}),
                "saves": {
                    "fortitude.revealed": state,
                    "reflex.revealed": state,
                    "will.revealed": state,
                },
                "speeds": {
                    "details.revealed": state,
                    "values": Object.keys(this.speeds.values).reduce((acc, key) => {
                        acc[key] = { revealed: state };
                        return acc;
                    }, {}),
                },
                "immunities": Object.keys(this.immunities).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        exceptions: Object.keys(this.immunities[key].exceptions).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                    };
                    
                    return acc;
                }, {}),
                "weaknesses": Object.keys(this.weaknesses).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        exceptions: Object.keys(this.weaknesses[key].exceptions).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                    };
                    
                    return acc;
                }, {}),
                "resistances": Object.keys(this.resistances).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        exceptions: Object.keys(this.resistances[key].exceptions).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                        doubleVs: Object.keys(this.resistances[key].doubleVs).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                    };
                    
                    return acc;
                }, {}),
                "rarity.revealed": state,
                "traits": Object.keys(this.traits).reduce((acc, key) => {
                    acc[key] = { revealed: state };
                    return acc;
                }, {}),
                "attacks": Object.keys(this.attacks).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        damageStatsRevealed: state,
                        traits: Object.keys(this.attacks[key].traits).reduce((acc, trait) => {
                            acc[trait] = { revealed: state };
                            return acc;
                        }, {}),
                        damageInstances: Object.keys(this.attacks[key].damageInstances).reduce((acc, damage) => {
                            acc[damage] = { damageType: { revealed: state } };
                            return acc;
                        }, {}),
                    };
                    return acc;
                }, {}),
                "actions": Object.keys(this.actions).reduce((acc, key) => {
                    acc[key] = { 
                        revealed: state,
                        traits: Object.keys(this.actions[key].traits).reduce((acc, trait) => {
                            acc[trait] = { revealed: state };
                            return acc;
                        }, {}), 
                    };
                    return acc;
                }, {}),
                "passives": Object.keys(this.passives).reduce((acc, key) => {
                    acc[key] = { 
                        revealed: state,
                        traits: Object.keys(this.passives[key].traits).reduce((acc, trait) => {
                            acc[trait] = { revealed: state };
                            return acc;
                        }, {}), 
                    };
                    return acc;
                }, {}),
                ...spells,
                "senses": {
                    "perception.revealed": state,
                    "details.revealed": state,
                    "senses": Object.keys(this.senses.senses).reduce((acc, key) => {
                        acc[key] = { revealed: state };
                        return acc;
                    }, {}),
                },
                "languages": {
                    "details.revealed": state,
                    "values": Object.keys(this.languages.values).reduce((acc, key) => {
                        acc[key] = { revealed: state };
                        return acc;
                    }, {})
                },
                "notes": {
                    "public.revealed": state,
                    "private.revealed": state,
                }
            }
        };
    }

    async toggleEverything(state){
        await this.parent.update(this._getToggleUpdate(state));
    }

    prepareDerivedData() {
        const vagueDescriptions = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        const playerLevel = game.user.character ? game.user.character.system.details.level.value : null;
        const contextLevel = vagueDescriptions.settings.playerBased && playerLevel ? playerLevel : this.level.value;

        this.ac.category = getCategoryLabel(acTable, contextLevel, this.ac.value);
        this.hp.category = getCategoryFromIntervals(hpTable, contextLevel, this.hp.value);

        this.saves = {
            fortitude: { ...this.saves.fortitude, label: `${this.saves.fortitude.value > 0 ? '+' : ''}${this.saves.fortitude.value}`, category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, this.saves.fortitude.value, true) },
            reflex: { ...this.saves.reflex, label: `${this.saves.reflex.value > 0 ? '+' : ''}${this.saves.reflex.value}`, category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, this.saves.reflex.value, true) },
            will: { ...this.saves.will, label: `${this.saves.will.value > 0 ? '+' : ''}${this.saves.will.value}`, category: getCategoryLabel(savingThrowPerceptionTable, contextLevel, this.saves.will.value, true) },
        };

        this.immunities = Object.keys(this.immunities).reduce((acc, key) => {
            const exceptionKeys = Object.keys(this.immunities[key].exceptions);
            acc[key] = {
                ...this.immunities[key],
                label: CONFIG.PF2E.immunityTypes[this.immunities[key].type] ?? this.immunities[key].type,
                exceptions: exceptionKeys.reduce((acc, exKey, index) => {
                    const label = CONFIG.PF2E.immunityTypes[this.immunities[key].exceptions[exKey].type];
                    const suffix = 
                        index === exceptionKeys.length-2 ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or") : 
                        index < exceptionKeys.length-1 ? ',' : 
                        index === exceptionKeys.length-1 ? ')' : '';

                    acc[exKey] = { 
                        ...this.immunities[key].exceptions[exKey], 
                        label: label ?? this.immunities[key].exceptions[exKey].type,
                        suffix: suffix,
                    };
                    return acc;
                }, {}),
            };

            return acc;
        }, {});

        this.weaknesses = Object.keys(this.weaknesses).reduce((acc, key) => {
            const exceptionKeys = Object.keys(this.weaknesses[key].exceptions);
            acc[key] = {
                ...this.weaknesses[key],
                label: CONFIG.PF2E.weaknessTypes[this.weaknesses[key].type] ?? this.weaknesses[key].type,
                category: getCategoryLabel(weaknessTable, contextLevel, this.weaknesses[key].value, true),
                exceptions: exceptionKeys.reduce((acc, exKey, index) => {
                    const label = CONFIG.PF2E.weaknessTypes[this.weaknesses[key].exceptions[exKey].type];
                    const suffix = 
                        index === exceptionKeys.length-2 ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or") : 
                        index < exceptionKeys.length-1 ? ',' : 
                        index === exceptionKeys.length-1 ? ')' : '';

                    acc[exKey] = { 
                        ...this.weaknesses[key].exceptions[exKey], 
                        label: label ?? this.weaknesses[key].exceptions[exKey].type,
                        suffix: suffix,
                    };
                    return acc;
                }, {}),
            };

            return acc;
        }, {});

        this.resistances = Object.keys(this.resistances).reduce((acc, key) => {
            const exceptionKeys = Object.keys(this.resistances[key].exceptions);
            const doubleKeys = Object.keys(this.resistances[key].doubleVs);
            acc[key] = {
                ...this.resistances[key],
                label: CONFIG.PF2E.resistanceTypes[this.resistances[key].type] ?? this.resistances[key].type,
                category: getCategoryLabel(weaknessTable, contextLevel, this.resistances[key].value, true),
                exceptions: exceptionKeys.reduce((acc, exKey) => {
                    const label = CONFIG.PF2E.resistanceTypes[this.resistances[key].exceptions[exKey].type];

                    acc[exKey] = { ...this.resistances[key].exceptions[exKey], label: label ?? this.resistances[key].exceptions[exKey].type };
                    return acc;
                }, {}),
                doubleVs: doubleKeys.reduce((acc, doubleKey) => {
                    const label = CONFIG.PF2E.resistanceTypes[this.resistances[key].doubleVs[doubleKey].type];

                    acc[doubleKey] = { ...this.resistances[key].doubleVs[doubleKey], label: label ?? this.resistances[key].doubleVs[doubleKey].type };
                    return acc;
                }, {}),
            };

            return acc;
        }, {});

        this.traits = Object.keys(this.traits).reduce((acc, key) => {
            const label = CONFIG.PF2E.creatureTraits[this.traits[key].value];
            if(label){
                acc[key] = { ...this.traits[key], label: CONFIG.PF2E.creatureTraits[this.traits[key].value] };
            }

            return acc;
        }, {});

        this.abilities = Object.keys(this.abilities).reduce((acc, key) => {
            acc[key] = { 
                ...this.abilities[key], 
                value: `${this.abilities[key].mod >= 0 ? '+' : ''}${this.abilities[key].mod}`, 
                label: CONFIG.PF2E.abilities[this.abilities[key].key],
                category: getCategoryLabel(attributeTable, contextLevel, this.abilities[key].mod, true),
            };

            return acc;
        }, {});

        this.skills = Object.keys(this.skills).reduce((acc, key) => {
            const skill = this.skills[key];
            if(key === 'empty' || skill.value > 0){
                acc[key] = { 
                    ...skill, 
                    label: skill.lore ? skill.label : CONFIG.PF2E.skills[key]?.label ?? (key === 'empty' ? skill.value : key),
                    category:  getMixedCategoryLabel(skillTable, contextLevel, skill.totalModifier),
                };
            }

            return acc;
        }, {});

        this.attacks = Object.keys(this.attacks).reduce((acc, key) => {
            const traitKeys = Object.keys(this.attacks[key].traits);
            acc[key] = { 
                ...this.attacks[key], 
                category: getCategoryLabel(attackTable, contextLevel, this.attacks[key].totalModifier),
                range: this.attacks[key].isMelee ? 'PF2E.NPCAttackMelee' : 'PF2E.NPCAttackRanged',
                traits: traitKeys.reduce((acc, trait, index) => {
                    acc[trait] = { 
                        ...this.attacks[key].traits[trait], 
                        label: CONFIG.PF2E.npcAttackTraits[this.attacks[key].traits[trait].value] ?? this.attacks[key].traits[trait].value,
                        description: CONFIG.PF2E.traitsDescriptions[this.attacks[key].traits[trait].description] ?? this.attacks[key].traits[trait].description,
                        suffix: index !== traitKeys.length-1 ? ',&nbsp;' : ')',
                    };
                    return acc;
                }, {}),
                damageInstances: Object.keys(this.attacks[key].damageInstances).reduce((acc, damage) => {
                    const instance = this.attacks[key].damageInstances[damage];
                    const average = getRollAverage(new Roll(instance.damage.value).terms);
                    acc[damage] = {
                        ...instance,
                        damage: { ...instance.damage, category: getCategoryLabel(damageTable, contextLevel, average) }
                    };

                    return acc;
                }, {})
            };

            return acc;
        }, {});

        this.actions = Object.keys(this.actions).reduce((acc, key) => {
            const traitKeys = Object.keys(this.actions[key].traits);
            acc[key] = { 
                ...this.actions[key], 
                traits: traitKeys.reduce((acc, trait, index) => {
                    acc[trait] = {  
                        ...this.actions[key].traits[trait],
                        label: CONFIG.PF2E.npcAttackTraits[this.actions[key].traits[trait].value] ?? this.actions[key].traits[trait].value,
                        description: CONFIG.PF2E.traitsDescriptions[this.actions[key].traits[trait].value] ?? '',
                        suffix: index !== traitKeys.length-1 ? ',&nbsp;' : ''
                    };

                    return acc;
                }, {}),
            };

            return acc;
        }, {});

        this.passives = Object.keys(this.passives).reduce((acc, key) => {
            const traitKeys = Object.keys(this.passives[key].traits);
            acc[key] = { 
                ...this.passives[key], 
                traits: traitKeys.reduce((acc, trait, index) => {
                    acc[trait] = {  
                        ...this.passives[key].traits[trait],
                        label: CONFIG.PF2E.npcAttackTraits[this.passives[key].traits[trait].value] ?? this.passives[key].traits[trait].value,
                        description: CONFIG.PF2E.traitsDescriptions[this.passives[key].traits[trait].value] ?? '',
                        suffix: index !== traitKeys.length-1 ? ',&nbsp;' : ''
                    };

                    return acc;
                }, {}),
            };

            return acc;
        }, {});

        this.senses.perception.category = getCategoryLabel(savingThrowPerceptionTable, contextLevel, this.senses.perception.value);

        this.spells.entries = Object.keys(this.spells.entries).reduce((acc, key) => {
            acc[key] = {
                ...this.spells.entries[key],
                dc: { ...this.spells.entries[key].dc, category: getCategoryLabel(spellDCTable, contextLevel, this.spells.entries[key].dc.value) },
                attack: { ...this.spells.entries[key].attack, category: getCategoryLabel(spellAttackTable, contextLevel, this.spells.entries[key].attack.value) },
            };
            return acc;
        }, {});
    }
}

class NPC extends Creature {
    static defineSchema() {
        const fields = foundry.data.fields;
        const creatureFields = super.defineSchema();
        return {
           ...creatureFields,
           npcData: new fields.SchemaField({
                categories: new fields.ArrayField(new fields.SchemaField({
                    hidden: new fields.BooleanField({}),
                    value: new fields.StringField({ required: true }),
                    name: new fields.StringField({ required: true }),
                })),
                general: new fields.SchemaField({
                    background: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.HTMLField({}),
                    }),
                    appearance: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    personality: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    height: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    weight: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    birthplace: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    disposition: new MappingField(new fields.StringField({ required: true, choices: dispositions, initial: dispositions.indifferent.value })),
                }),
           }),
        }
    }

    _getRefreshData(actor){
        const data = getNPCData(actor);
        const creatureData = super._getRefreshData(actor, data);
        return {
            ...creatureData,
            system: {
                ...creatureData.system,
                npcData: {
                    general: {
                        background: { ...data.system.npcData.background, revealed: this.npcData.general.background.revealed },
                        appearance: { ...data.system.npcData.appearance, revealed: this.npcData.general.appearance.revealed },
                        personality: { ...data.system.npcData.personality, revealed: this.npcData.general.personality.revealed },
                        height: { ...data.system.npcData.height, revealed: this.npcData.general.height.revealed },
                        weight: { ...data.system.npcData.weight, revealed: this.npcData.general.weight.revealed },
                        birthplace: { ...data.system.npcData.birthplace, revealed: this.npcData.general.birthplace.revealed }
                    }
                }
            }
        };
    }

    _getToggleUpdate(state){
        const creatureData = super._getToggleUpdate(state);
        return {
            ...creatureData,
            system: {
                ...creatureData.system,
                npcData: {
                    general: {
                        "background.revealed": state,
                        "appearance.revealed": state,
                        "personality.revealed": state,
                        "height.revealed": state,
                        "weight.revealed": state,
                        "birthplace.revealed": state,
                        disposition: Object.keys(this.disposition).reduce((acc, key) => {
                            acc[key] = { revealed: state };
                            return acc;
                        }, {}),
                    }
                }
            }
        };
    }

    get partyDispositions(){
        const partyCharacters = game.actors.find(x => x.type === 'party' && x.active)?.system?.details?.members?.map(x => {
            const actor = game.actors.find(actor => actor.uuid === x.uuid);
            return {
                value: dispositions.indifferent.value,
                id: actor.id,
                name: actor.name,
            };
        }) ?? [];
        return partyCharacters.reduce((acc, character) => {
            const disposition = this.npcData.general.disposition[character.id];
            acc.push({
                value: disposition ?? dispositions.indifferent.value,
                label: disposition ? dispositions[disposition].name : dispositions.indifferent.name,
                id: character.id,
                name: character.name,
            });

            return acc;
        }, []);
    }

    prepareDerivedData(){
        super.prepareDerivedData();
    }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$5, ApplicationV2: ApplicationV2$5 } = foundry.applications.api;

class BestiaryAppearanceMenu extends HandlebarsApplicationMixin$5(ApplicationV2$5) {
    constructor(){
        super({});

        this.settings = {
            useTokenArt: game.settings.get('pf2e-bestiary-tracking', 'use-token-art'),
            hideAbilityDescriptions: game.settings.get('pf2e-bestiary-tracking', 'hide-ability-descriptions'),
            additionalCreatureTypes: game.settings.get('pf2e-bestiary-tracking', 'additional-creature-types').map(x => ({ value: x.value, name: game.i18n.localize(x.name) })),
            contrastRevealedState: game.settings.get('pf2e-bestiary-tracking', 'contrast-revealed-state'),
            optionalFields: game.settings.get('pf2e-bestiary-tracking', 'optional-fields'),
            detailedInformation: game.settings.get('pf2e-bestiary-tracking', 'detailed-information-toggles'),
        };
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-appearance-menu',
        classes: ["bestiary-settings-menu"],
        position: { width: 680, height: 'auto' },
        actions: {
            resetContrastRevealedState: this.resetContrastRevealedState,
            toggleOptionalFields: this.toggleOptionalFields,
            toggleDetailedInformation: this.toggleDetailedInformation,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "bestiary-appearance-menu",
            template: "modules/pf2e-bestiary-tracking/templates/bestiaryAppearanceMenu.hbs"
        }
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
  
        const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);
        const creatureTraits = Object.keys(CONFIG.PF2E.creatureTraits).filter(x => !creatureTypes.includes(x));

        const traitsInput = $(htmlElement).find('.traits-input')[0];
        const traitsTagify = new Y(traitsInput, {
          tagTextProp: "name",
          enforceWhitelist: true,
          whitelist : creatureTraits.map(key => { 
            const label = CONFIG.PF2E.creatureTraits[key];
            return { value: key, name: game.i18n.localize(label) };
          }),
          callbacks : { invalid: this.onAddTag }, 
          dropdown : {
            mapValueTo: 'name',
            searchKeys: ['name'],
            enabled: 0,              
            maxItems: 20,    
            closeOnSelect : true,
            highlightFirst: false,
          },
        });
        
        traitsTagify.on('change', this.creatureTraitSelect.bind(this));
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.settings = {
            ...this.settings,
            additionalCreatureTypes: this.settings.additionalCreatureTypes?.length ? this.settings.additionalCreatureTypes.map(x => x.name) : [],
        };

        return context;
    }

    static async updateData(event, element, formData){
        const data = foundry.utils.expandObject(formData.object);
        this.settings = {
            additionalCreatureTypes: this.settings.additionalCreatureTypes,
            useTokenArt: data.useTokenArt,
            hideAbilityDescriptions: data.hideAbilityDescriptions,
            contrastRevealedState: data.contrastRevealedState,
            optionalFields: data.optionalFields,
            detailedInformation: { ...data.detailedInformation }
        };
        this.render();
    }

    async creatureTraitSelect(event) {
        this.settings.additionalCreatureTypes  = event.detail?.value ? JSON.parse(event.detail.value) : [];
        this.render();
    }

    static async resetContrastRevealedState (){
        this.settings.contrastRevealedState = { ...revealedState };
        this.render();
    };

    static async toggleOptionalFields (){
        const keys = Object.keys(this.settings.optionalFields);
        const enable = Object.values(this.settings.optionalFields).some(x => !x);
        this.settings.optionalFields = keys.reduce((acc, key) => {
            acc[key] = enable;
            return acc;
        }, {});
        
        this.render();
    };

    static async toggleDetailedInformation (){
        const keys = Object.keys(this.settings.detailedInformation);
        const enable = Object.values(this.settings.detailedInformation).some(x => !x);
        this.settings.detailedInformation = keys.reduce((acc, key) => {
            acc[key] = enable;
            return acc;
        }, {});
        
        this.render();
    };

    static async save(_){
        await game.settings.set('pf2e-bestiary-tracking', 'additional-creature-types', this.settings.additionalCreatureTypes.map(x => ({ value: x.value, name: CONFIG.PF2E.creatureTraits[x.value] })));
        await game.settings.set('pf2e-bestiary-tracking', 'contrast-revealed-state', this.settings.contrastRevealedState);
        await game.settings.set('pf2e-bestiary-tracking', 'use-token-art', this.settings.useTokenArt);
        await game.settings.set('pf2e-bestiary-tracking', 'hide-ability-descriptions', this.settings.hideAbilityDescriptions);
        await game.settings.set('pf2e-bestiary-tracking', 'optional-fields', this.settings.optionalFields);
        await game.settings.set('pf2e-bestiary-tracking', 'detailed-information-toggles', this.settings.detailedInformation);
        this.close();
    };
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$4, ApplicationV2: ApplicationV2$4 } = foundry.applications.api;

class BestiaryIntegrationMenu extends HandlebarsApplicationMixin$4(ApplicationV2$4) {
    constructor(){
        super({});

        this.settings = {
            creatureRegistration: {
                automaticCombatRegistration: game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration'),
                doubleClickOpen: game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen'),
            },
            chatMessageHandling: game.settings.get('pf2e-bestiary-tracking', 'chat-message-handling'),
            npcRegistration: game.settings.get('pf2e-bestiary-tracking', 'npc-registration'),
            hiddenSettings: game.settings.get('pf2e-bestiary-tracking', 'hidden-settings'),
        };

        this.combatRegistrationOptions = [
            { name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.Never'), value: 0 },
            { name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.StartOfCombat'), value: 1 },
            { name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.CreatureDefeated'), value: 2 }
        ];

        this.npcRegistrationOptions = [
            { name: game.i18n.localize('PF2EBestiary.Settings.NPCRegistation.Choices.Unique'), value: 0 },
            { name: game.i18n.localize('PF2EBestiary.Settings.NPCRegistation.Choices.Tag'), value: 1 },
        ];
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-integration-menu',
        classes: ["bestiary-settings-menu"],
        position: { width: 680, height: 'auto' },
        actions: {
            toggleChatMessageHandlingFields: this.toggleChatMessageHandlingFields,
            toggleHiddenSettingsFields: this.toggleHiddenSettingsFields,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "bestiary-integration-menu",
            template: "modules/pf2e-bestiary-tracking/templates/bestiaryIntegrationMenu.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);

        context.settings = this.settings;
        context.combatRegistrationOptions = this.combatRegistrationOptions;
        context.npcRegistrationOptions = this.npcRegistrationOptions;

        return context;
    }

    static async updateData(event, element, formData){
        const data = foundry.utils.expandObject(formData.object);
        this.settings = data.settings;
        this.render();
    }

    static async toggleChatMessageHandlingFields(){
        const keys = Object.keys(this.settings.chatMessageHandling.automaticReveal);
        const enable = Object.values(this.settings.chatMessageHandling.automaticReveal).some(x => !x);
        this.settings.chatMessageHandling.automaticReveal = keys.reduce((acc, key) => {
            acc[key] = enable;
            return acc;
        }, {});
        
        this.render();
    };

    static async toggleHiddenSettingsFields(){
        const keys = Object.keys(this.settings.hiddenSettings);
        const enable = Object.values(this.settings.hiddenSettings).some(x => !x);
        this.settings.hiddenSettings = keys.reduce((acc, key) => {
            acc[key] = enable;
            return acc;
        }, {});
        
        this.render();
    };

    static async save(_){
        await game.settings.set('pf2e-bestiary-tracking', 'automatic-combat-registration', this.settings.creatureRegistration.automaticCombatRegistration);
        await game.settings.set('pf2e-bestiary-tracking', 'doubleClickOpen', this.settings.creatureRegistration.doubleClickOpen);
        await game.settings.set('pf2e-bestiary-tracking', 'chat-message-handling', this.settings.chatMessageHandling);
        await game.settings.set('pf2e-bestiary-tracking', 'npc-registration', this.settings.npcRegistration);
        await game.settings.set('pf2e-bestiary-tracking', 'hidden-settings', this.settings.hiddenSettings);
        this.close();
    };
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$3, ApplicationV2: ApplicationV2$3 } = foundry.applications.api;

class BestiaryLabelsMenu extends HandlebarsApplicationMixin$3(ApplicationV2$3) {
    constructor(){
        super({});

        this.settings = game.settings.get('pf2e-bestiary-tracking', 'bestiary-labels');
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-labels-menu',
        classes: ["bestiary-settings-menu"],
        position: { width: 'auto', height: 'auto' },
        actions: {
            resetSection: this.resetSection,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "bestiary-labels-menu",
            template: "modules/pf2e-bestiary-tracking/templates/bestiaryLabelsMenu.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.settings = this.settings;

        return context;
    }

    static async updateData(event, element, formData){
        this.settings = foundry.utils.expandObject(formData.object);
        this.render();
    }

    static async resetSection (_, button){
        await foundry.utils.setProperty(this.settings, button.dataset.path, getVagueDescriptionLabels()[button.dataset.property]);
        this.render();
    };

    static async save(options){
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-labels', this.settings);
        this.close();
    };
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$2, ApplicationV2: ApplicationV2$2 } = foundry.applications.api;

class VagueDescriptionsMenu extends HandlebarsApplicationMixin$2(ApplicationV2$2) {
    constructor(){
        super({});

        this.settings = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        this.helperSettings = {
            properties: {
                all: Object.keys(this.settings.properties).every(key => this.settings.properties[key]),
            },
            settings: {
                all: Object.keys(this.settings.settings).every(key => this.settings.settings[key])
            }
        };
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-vague-descriptions-menu',
        classes: ["bestiary-settings-menu"],
        position: { width: 'auto', height: 'auto' },
        actions: {
            toggleSection: this.toggleSection,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "vague-descriptions-menu",
            template: "modules/pf2e-bestiary-tracking/templates/vagueDescriptionsMenu.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.settings = this.settings;
        context.helperSettings = this.helperSettings;

        return context;
    }

    static async updateData(event, element, formData){
        const { settings } = foundry.utils.expandObject(formData.object);
        this.settings = foundry.utils.mergeObject(this.settings, settings);

        this.helperSettings = {
            properties: {
                all: Object.keys(this.settings.properties).every(key => this.settings.properties[key]),
            },
            settings: {
                all: Object.keys(this.settings.settings).every(key => this.settings.settings[key]),
            }
        };

        this.render();
    }

    static toggleSection(_, button){
        this.helperSettings[button.dataset.section].all = !this.helperSettings[button.dataset.section].all; 
        
        for(var key in this.settings[button.dataset.section]){
            this.settings[button.dataset.section][key] = this.helperSettings[button.dataset.section].all;
        }

        this.render();
    }

    static async save(options){
        await game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', this.settings);
        this.close();
    };
}

const getCreatureDataFromOld = (actor) => {
    const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
    const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
    const resistancesKeys = Object.keys(actor.system.attributes.resistances);
    const attackKeys = Object.keys(actor.system.actions);
    const itemKeys = Object.values(actor.items);

    const spells = !itemKeys.some(x => x._id === 'Spell-None') ? {
        fake: null,
        entries: itemKeys.reduce((acc, entry) => {
            if(entry.type === 'spellcastingEntry'){
                const levels = {};
                Object.values(actor.items).forEach(spell => {
                if(spell.type === 'spell' && spell.system.location.value === entry._id){
                    const levelValue = getSpellLevel(spell, actor.system.details.level.value);

                    var level = Object.values(levels).find(x => x.value === levelValue);
                    if(!level) {
                        level = { value: levelValue, spells: {} };
                    }

                    const showActions = !spell.system.traits.value.some(x => x === 'exploration' || x === 'downtime');
                    level.spells[spell._id] = {
                        revealed: spell.revealed,
                        label: spell.name,
                        img: spell.img,
                        actions: showActions ? spell.system.time.value.replace('to', '-') : '',
                        defense: spell.system.defense?.save?.statistic ? {
                        statistic: spell.system.defense.save.statistic,
                        basic: spell.system.defense.save.basic,
                        } : null,
                        range: spell.system.range.value,
                        traits: {
                        rarity: spell.system.traits.rarity,
                        traditions: spell.system.traits.traditions,
                        values: spell.system.traits.value.reduce((acc, trait ) => {
                            acc[trait] = { value: trait };
                            return acc;
                        }, {})
                        },
                        description: {
                            gm: spell.system.description.gm,
                            value: spell.system.description.value,
                        }
                    };

                    levels[levelValue] = level;
                }
                }); 

                acc[entry._id] = {
                    revealed: entry.revealed,
                    tradition: entry.system.tradition.value,
                    category: entry.system.prepared.value,
                    dc: entry.system.spelldc.dc,
                    mod: { value: actor.system.abilities[entry.system.ability.value].mod },
                    attack: entry.system.spelldc.value,
                    levels: levels,
                };
            }

            return acc;
    }, {}) }: {
        fake: { revealed: actor.items['Spells-None'].revealed },
        entries: {},
    };
    
    return {
        type: 'pf2e-bestiary-tracking.creature',
        name: actor.name.value,
        ownership: { default: 3 },
        system: {
            hidden: actor.hidden,
            uuid: actor.uuid,
            version: currentVersion,
            img: actor.img,
            texture: actor.prototypeToken.texture.src,
            name: actor.name,
            hardness: { value: actor.system.attributes.hardness.value },
            allSaves: { value: actor.system.attributes.allSaves.value },
            publication: actor.system.details.publication,
            ac: { value: Number.parseInt(actor.system.attributes.ac.value), revealed: Boolean(actor.system.attributes.ac), custom: actor.system.attributes.ac.custom, details: actor.system.attributes.ac.details },
            hp: { value: Number.parseInt(actor.system.attributes.hp.max), revealed: Boolean(actor.system.attributes.hp.revealed), custom: actor.system.attributes.hp.custom, temp: Number.parseInt(actor.system.attributes.hp.temp), details: actor.system.attributes.hp.details, negativeHealing: actor.system.attributes.hp.negativeHealing },
            level: { value: Number.parseInt(actor.system.details.level.value), revealed: actor.system.details.level.revealed, custom: actor.system.details.level.custom },
            size: actor.system.traits.size.value,
            rarity: { value: actor.system.traits.rarity },
            traits: actor.system.traits.value,
            skills: Object.values(actor.system.skills).some(x => x.base > 0) ? Object.keys(actor.system.skills).reduce((acc, key) => {
              const skill = actor.system.skills[key];
              acc[key] = { 
                value: skill.base, 
                revealed: skill.revealed, 
                lore: skill.lore, 
                note: skill.note, 
                modifiers: skill.modifiers.filter(x => x.slug !== 'base').map(x => ({ kind: x.kind, label: x.label, modifier: x.modifier })), 
                label: skill.label, 
                totalModifier: Number.parseInt(skill.totalModifier)
              };
              return acc;
            }, {}) : { empty: { empty: true, value: 'PF2EBestiary.Miscellaneous.None' } },
            saves: {
              fortitude: { value: actor.system.saves.fortitude.value, revealed: actor.system.saves.fortitude.revealed, custom: actor.system.saves.fortitude.custom },
              reflex: { value: actor.system.saves.reflex.value, revealed: actor.system.saves.reflex.revealed, custom: actor.system.saves.reflex.custom },
              will: { value: actor.system.saves.will.value, revealed: actor.system.saves.will.revealed, custom: actor.system.saves.will.custom },
            },
            speeds: {
              details: { name: actor.system.attributes.speed.details },
              values: {
                land: { type: 'land', value: actor.system.attributes.speed.value, revealed: actor.system.attributes.speed.revealed },
                ...actor.system.attributes.speed.otherSpeeds.reduce((acc, speed) => {
                  acc[speed.label] = { type: speed.type, value: speed.value, revealed: speed.revealed };
                  return acc;
                }, {})
              },  
            },
            abilities: Object.keys(actor.system.abilities).reduce((acc, key) => {
              acc[key] = { key: key, revealed: actor.system.abilities[key].revealed, mod: actor.system.abilities[key].mod, custom: actor.system.abilities[key].custom, };
              return acc;
            }, {}),
            senses: {
              perception: { value: actor.system.perception.value, revealed: actor.system.perception.revealed, custom: actor.system.perception.custom },
              details: actor.system.perception.details,
              senses: actor.system.perception.senses.reduce((acc, sense) => {
                acc[sense.type] = { type: sense.type, revealed: sense.revealed, acuity: sense.acuity, range: sense.range };
                return acc;
              }, {})
            },
            languages: {
              details: actor.system.details.languages.details,
              values: actor.system.details.languages.value.length > 0 ? actor.system.details.languages.value.reduce((acc, language) => {
                acc[language.value] = language;
                return acc;
              }, {}) : { empty: { empty: true, value: 'PF2EBestiary.Miscellaneous.None', exceptions: {} }}
            },
            immunities: immunitiesKeys.reduce((acc, key) => {
                const immunity = actor.system.attributes.immunities[key];
                acc[key] = { 
                    empty: Boolean(immunity.empty),
                    fake: Boolean(immunity.fake),
                    revealed: immunity.revealed, 
                    type: immunity.empty ? 'PF2EBestiary.Miscellaneous.None' : immunity.type, 
                    exceptions:  immunity.exceptions?.reduce((acc, exception) => {  
                      const type = exception.value.label ?? exception.value;
                      acc[slugify(type)] = { revealed: exception.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                };

                return acc;
            }, {}),
            weaknesses: weaknessesKeys.reduce((acc, key) => {
                const weakness = actor.system.attributes.weaknesses[key];
                acc[key] = { 
                    empty: Boolean(weakness.empty),
                    fake: Boolean(weakness.fake),
                    revealed: weakness.revealed, 
                    type: weakness.empty ? 'PF2EBestiary.Miscellaneous.None' : weakness.type,
                    value: weakness.value, 
                    exceptions:  weakness.exceptions?.reduce((acc, exception) => { 
                      const type = exception.value.label ?? exception.value; 
                      acc[slugify(type)] = { revealed: exception.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                };

                return acc;
            }, {}),
            resistances: resistancesKeys.reduce((acc, key) => {
                const resistance = actor.system.attributes.resistances[key];
                acc[key] = { 
                    empty: Boolean(resistance.empty),
                    fake: Boolean(resistance.fake),
                    revealed: resistance.revealed, 
                    type: resistance.empty ? 'PF2EBestiary.Miscellaneous.None' : resistance.type,
                    value: resistance.value, 
                    exceptions:  resistance.exceptions?.reduce((acc, exception) => {  
                      const type = exception.value.label ?? exception.value;
                      acc[slugify(type)] = { revealed: exception.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                    doubleVs: resistance.doubleVs?.reduce((acc, doubleVs) => {  
                      const type = doubleVs.value.label ?? doubleVs.value;
                      acc[slugify(type)] = { revealed: doubleVs.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                };

                return acc;
            }, {}),
            attacks: attackKeys.reduce((acc, actionKey) => {
              const attack = actor.system.actions[actionKey];
              const item = actor.items[actionKey];
              
              if(attack.fake){
                acc[actionKey] = {
                    revealed: attack.revealed,
                    fake: true,
                    label: attack.label,
                    actions: '1',
                    totalModifier: 0,
                    isMelee: true,
                    additionalEffects: [],
                    damageInstances: attack.item.system.damageRolls,
                    traits: attack.traits,
                    variants: attack.variants,
                    rules: {}
                };
              }
              else if(item.type === 'melee' || item.type === 'equipment'){
                acc[attack.empty ? 'empty' : attack.item._id] = {
                  revealed: attack.revealed,
                  empty: Boolean(attack.empty),
                  label: attack.empty ? 'PF2EBestiary.Miscellaneous.None' : attack.label,
                  actions: attack.glyph,
                  totalModifier: attack.totalModifier,
                  isMelee: attack.weapon.system.traits.value.find(x => x.startsWith('range-increment') || x.startsWith('range')) ? false : true,
                  additionalEffects: attack.additionalEffects?.reduce((acc, effect) => {
                    acc[effect.tag] = { label: effect.label, tag: effect.tag };

                    return acc;
                  }, {}) ?? {},
                  damageInstances: Object.keys(item.system.damageRolls).reduce((acc, damage) => {
                    acc[damage] = { 
                      category: item.system.damageRolls[damage].category,
                      damage: { value: item.system.damageRolls[damage].damage },
                      damageType: item.system.damageRolls[damage].damageType, 
                    };

                    return acc;
                  }, {}),
                  traits: item.system.traits.value.reduce((acc, trait) => {
                    acc[trait.value] = { revealed: trait.revealed, value: trait.value, description: trait.value };
                    return acc;
                  }, {}),
                  variants: attack.variants.reduce((acc, variant) => {
                    acc[slugify(variant.label)] = { label: variant.label };

                    return acc;
                  }, {}),
                  rules: item.system.rules ?? {},
                };
              }

              return acc;
            }, {}),
            actions: itemKeys.reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value !== 'passive'){
                acc[action.empty ? 'empty' : action._id] = {
                  revealed: action.revealed,
                  empty: Boolean(action.empty),
                  fake: Boolean(action.fake),
                  label: action.empty ? 'PF2EBestiary.Miscellaneous.None' : action.name,
                  category: action.system.category ?? '',
                  deathNote: action.system.deathNote ?? false,
                  actions: action.system.actions ? action.system.actions.value ?? 'R' : '1',
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait.value] = trait;
                    return acc;
                  }, {}),
                  description: action.system.description.value ?? '',
                };
              }

              return acc;
            }, {}),
            passives: itemKeys.reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value === 'passive'){
                acc[action.empty ? 'empty' : action._id] = {
                  revealed: action.revealed,
                  empty: Boolean(action.empty),
                  fake: Boolean(action.fake),
                  label: action.empty ? 'PF2EBestiary.Miscellaneous.None' : action.name,
                  category: action.system.category ?? '',
                  deathNote: action.system.deathNote ?? false,
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait.value] = trait;
                    return acc;
                  }, {}),
                  description: action.system.description.value ?? '',
                };
              }

              return acc;
            }, {}),
            spells: spells,
            notes: {
              public: { value: actor.system.details.publicNotes.text, revealed: actor.system.details.publicNotes.revealed },
              private: { value: actor.system.details.privateNotes.text, revealed: actor.system.details.privateNotes.revealed },
              player: { value: game.journal.getName('pf2e-bestiary-tracking-journal-entry')?.pages?.get(actor.system.details.playerNotes.document)?.text?.content ?? '' },
            },
        }
    };
};

const getNPCDataFromOld = (actor, wrongCategory) => {
    const creatureData = getCreatureDataFromOld(actor);

    if(wrongCategory){
      return {
        ...creatureData,
        type: 'pf2e-bestiary-tracking.npc',
        system: {
            ...creatureData.system,
            hidden: actor.hidden,
            npcData: {
                categories: [],
                general: {
                    background: { value: '' },
                    appearance: { value: '' },
                    personality: { value: '' },
                    height: { value: '' },
                    weight: { value: '' },
                    birthplace: { value: '' },
                    disposition: {},
                }
            }
        }
      }
    }

    return {
        ...creatureData,
        type: 'pf2e-bestiary-tracking.npc',
        system: {
            ...creatureData.system,
            hidden: actor.hidden,
            npcData: {
                categories: actor.npcData.categories.map(category => ({ name: category.name, value: category.key })),
                general: {
                    background: actor.npcData.general.background,
                    appearance: actor.npcData.general.appearance,
                    personality: actor.npcData.general.personality,
                    height: actor.npcData.general.height,
                    weight: actor.npcData.general.weight,
                    birthplace: actor.npcData.general.birthplace,
                    disposition: Object.keys(actor.npcData.general.disposition).reduce((acc, key) => {
                      const character = game.actors.get(key);
                      const characterId = character?.id ?? game.users.get(key).character?.id;
                      if(!characterId) return acc;

                      acc[characterId] = actor.npcData.general.disposition[key].value;
                      return acc;
                    }, {}),
                }
            }
        }
    }
};

const handleDataMigration = async () => {
    if(!game.user.isGM) return;

    await handleDeactivatedPages();
    
    var version = game.settings.get('pf2e-bestiary-tracking', 'version');
    if(!version){
        version = currentVersion;
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.1'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            if(!monster.name.value){
                bestiary.monster[type][monsterKey].name = { revealed: false, value: monster.name };
            }

            return null;
        });

        version = '0.8.2';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.2'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            const origin = game.actors.find(x => x.id === monster?.id);
            if(!origin){
                return { type, monsterKey };
            }

            // Attributes should now have Mod aswell as Category attributes. Can't cleanly update this but make best attempt, otherwise remove failing creatures.
            for(var ability of bestiary.monster[type][monsterKey].abilities.values){
                ability.mod = ability.value.replace('+', '');
                ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod);              
            }

            //Actions and passives and attacks should never be empty. Add a 'None' option.
            const actionKeys = Object.keys(monster.actions.values);
            if(actionKeys.length === 0){
                bestiary.monster[type][monsterKey].actions.values['None'] = { revealed: false, name: 'None' };
            }

            const passivesKeys = Object.keys(monster.passives.values);
            if(passivesKeys.length === 0){
                bestiary.monster[type][monsterKey].passives.values['None'] = { revealed: false, name: 'None' };
            }

            const attackKeys = Object.keys(monster.attacks.values);
            if(attackKeys.length === 0){
                bestiary.monster[type][monsterKey].attacks.values['None'] = { revealed: false, label: 'None' };
            }

            //Weaknesses and Resistances should use applicationLabel for type rather than the type property to include exceptions.
            Object.keys(bestiary.monster[type][monsterKey].weaknesses.values).forEach(weaknessKey => {
                const originWeakness = origin.system.attributes.weaknesses.find(x => x.label === bestiary.monster[type][monsterKey].weaknesses.values[weaknessKey].value);
                if(originWeakness) 
                {
                    bestiary.monster[type][monsterKey].weaknesses.values[weaknessKey].category = originWeakness.applicationLabel;
                }
            });

            Object.keys(bestiary.monster[type][monsterKey].resistances.values).forEach(resistanceKey => {
                const originResistance = origin.system.attributes.resistances.find(x => x.label === bestiary.monster[type][monsterKey].resistances.values[resistanceKey].value);
                if(originResistance) 
                {
                    bestiary.monster[type][monsterKey].resistances.values[resistanceKey].category = originResistance.applicationLabel;
                }
            });

            return null;
        });

        version = '0.8.4';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.4'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            const origin = game.actors.find(x => x.id === monster?.id);
            if(!origin){
                return { type, monsterKey };
            }

            // Creatures should have notes available to be revealed.
            bestiary.monster[type][monsterKey].notes = {
                public: { revealed: false, text: origin.system.details.publicNotes },
                private: { revealed: false, text: origin.system.details.privateNotes },
            };

            return null;
        });

        version = '0.8.6';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.6'){
        await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
            const origin = monster?.uuid ? await fromUuid(monster.uuid) : game.actors.find(x => x.id === monster?.id);
            if(!origin){
                return { type, monsterKey };
            }

            // All categories now use module settings values ranging from Extreme to Terrible
            bestiary.monster[type][monsterKey].ac.category = getCategoryLabel(acTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].ac.value);
            bestiary.monster[type][monsterKey].hp.category = getCategoryLabel(acTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].hp.value);
            bestiary.monster[type][monsterKey].saves.fortitude.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].saves.fortitude.value);
            bestiary.monster[type][monsterKey].saves.reflex.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].saves.reflex.value);
            bestiary.monster[type][monsterKey].saves.will.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].saves.will.value);
            bestiary.monster[type][monsterKey].abilities.values.forEach(ability => {
                // Weird error that occured here. Safety addition.
                if(typeof x === 'object'){
                    ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod);}
                }
            );
            bestiary.monster[type][monsterKey].senses.values.perception.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].senses.values.perception.value);

            // All spellcasting creatures should have spell data
            const spellcastingEntries = {};
            for(var subItem of origin.items){
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
                    dc: { revealed: false, value: subItem.system.spelldc.dc, category: getCategoryLabel(spellDCTable, origin.system.details.level.value, subItem.system.spelldc.dc) },
                    attack: { revealed: false, value: subItem.system.spelldc.value, category: getCategoryLabel(spellAttackTable, origin.system.details.level.value, subItem.system.spelldc.value) },
                    levels: levels,
                };
            }
            
            bestiary.monster[type][monsterKey].spells = {
                fake: Object.keys(spellcastingEntries).length > 0 ? null : { revealed: false },
                entries: spellcastingEntries,
            };

            return null;
        });

        //VagueDescriptions Module Settings now has 'Properties' and 'Settings' subobjects
        const vagueDescriptions = await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        await game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', {
            properties: {
                ac: vagueDescriptions.ac,
                hp: vagueDescriptions.hp,
                resistances: vagueDescriptions.resistances,
                weaknesses: vagueDescriptions.weaknesses,
                saves: vagueDescriptions.saves,
                perception: vagueDescriptions.perception,
                speed: vagueDescriptions.speed,
                attributes: vagueDescriptions.attributes,
            },
            settings: {
                playerBased: vagueDescriptions.playerBased,
                misinformationOptions: vagueDescriptions.misinformationOptions,
            }
        });
        
        version = '0.8.7';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.7'){
        await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
            if(type && monsterKey && bestiary.monster[type][monsterKey]){
                //Yes, this is very silly, but it's an attempt to save some data after a bad previous migration tactic.
                const value = bestiary.monster[type][monsterKey].level?.value?.value?.value?.value?.value ?? 
                   bestiary.monster[type][monsterKey].level?.value?.value?.value?.value ?? 
                   bestiary.monster[type][monsterKey].level?.value?.value?.value ?? 
                   bestiary.monster[type][monsterKey].level?.value?.value ??
                   bestiary.monster[type][monsterKey].level;

                if(!value || value.value){
                    return { type, monsterKey };
                }

                bestiary.monster[type][monsterKey].level = { revealed: false, value: value };
                return null;
            } else {
                return { type, monsterKey };
            }
        });

        version = '0.8.7.1';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.7.1'){
        //VagueDescriptions was poorly migrated last version. If the setting is now faulty --> set it to standard values.
        const vagueDescriptions = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        if(!vagueDescriptions.settings){
            await game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', {
                properties: {
                    ac: false,
                    hp: false,
                    resistances: false,
                    weaknesses: false,
                    saves: false,
                    perception: false,
                    speed: false,
                    attributes: false,
                },
                settings: {
                    playerBased: false,
                    misinformationOptions: false,
                }
            });
        }

        // Bestiary Labels had poorly labeled settings that actually have more to do with Vague Descriptions.
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-labels', {
            vagueDescriptions: {
                ...getVagueDescriptionLabels()
            }
        });

        await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
            const origin = monster?.uuid ? await fromUuid(monster.uuid) : null;
            if(!origin){
                return { type, monsterKey };
            }

            // Attributes need to have shortform category names
            bestiary.monster[type][monsterKey].abilities.values.forEach(ability => {
                ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod, true);
            });

            return null;
        });

        // Add filter to bestiary-layout setting
        const layoutSetting = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-layout', { 
            categories: {
                layout: layoutSetting.categories.layout,
                filter: { type: 0, direction: 0 },
            },
         });

        // Drop the Type portion of the Bestiary data. The information already exists in monster.inTypes
        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        const monsterMap = Object.keys(bestiary.monster).reduce((acc, typeKey) => {
            Object.keys(bestiary.monster[typeKey]).forEach(monsterKey => {
                const monster = bestiary.monster[typeKey][monsterKey];
                if(monster?.uuid){
                    acc.set(monster.uuid, monster);   
                } 

            });

            return acc;
        }, new Map());

        const newBestiary = Array.from(monsterMap.values()).reduce((acc, monster) => {
            acc.monster[monster.uuid] = monster;

            return acc;
        }, { monster: {}, npc: {} });

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', newBestiary);

        version = '0.8.8';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.8'){
        version = '0.8.8.4';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.8.4'){
       version = '0.8.9';
       await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9'){
        version = '0.8.9.2';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.2'){
        // Still some users with the old version of vague descriptions. Just a safety migration
        const vagueDescriptions = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        if(!vagueDescriptions.properties){
            game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', {
                properties: {
                    ac: false,
                    hp: false,
                    resistances: false,
                    weaknesses: false,
                    saves: false,
                    perception: false,
                    speed: false,
                    attributes: false,
                    skills: false,
                    attacks: false,
                    damage: false,
                    spells: false,
                },
                settings: {
                    playerBased: false,
                    misinformationOptions: false,
                }
            });
        }

        version = '0.8.9.7';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.7'){
        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', { ...bestiary, metadata: { ...bestiary.metadata, version: '0.8.9' } });
        
        version = '0.8.9.8';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.8'){
        version = '0.8.9.8.1';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.8.1'){
        version = '0.8.9.8.2';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.8.2'){
        version = '0.8.9.9';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.8.2'){
        version = '0.8.9.9.6';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.9.6'){
        version = '0.8.12';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.12'){
        version = '0.9.4';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    await handleBestiaryMigration(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
};

const handleBestiaryMigration = async (bestiary, isSave) => {
    var bestiaryObject = null;
    try {
        bestiaryObject = JSON.parse(bestiary);
    }catch{}
    
    if(bestiaryObject){
        const dataBestiary = bestiaryObject?.monster ? bestiaryObject : bestiary;

        const oldMonsterData = Object.keys(dataBestiary.monster).length > 0 && Object.keys(dataBestiary.monster).some(key => !dataBestiary.monster[key].system); 
        dataBestiary.metadata.version = oldMonsterData ? '0.8.8.4' : !dataBestiary.metadata.version ? currentVersion : dataBestiary.metadata.version; 

        if(dataBestiary.metadata.version === '0.8.8'){
            dataBestiary = await newMigrateBestiary(async (_, monster) => {
                const origin = await fromUuid(monster.uuid);
                if(!origin) return true;
                
                // Add Total Modifier to attacks.
                monster.attacks.values = Object.keys(monster.attacks.values).reduce((acc, attackKey) => {
                    const originAttack = origin.system.actions.find(x => x.weapon._id === attackKey);
                    const base = originAttack?.item;
                    if(base){
                        const damageInstances = [];
                        var damageLabel = '';
                        for(var damageKey of Object.keys(base.system.damageRolls)){
                            const damage = base.system.damageRolls[damageKey];
                            damageLabel = damageLabel.concat(`${damageLabel ? ' + ' : ''}${damage.damage} ${damage.damageType}`);
                            const damageRollHelper = new Roll(damage.damage);
                            
                            damageInstances.push({ label: damage.damage, average: getRollAverage(damageRollHelper.terms), type: damage.damageType, quality: damage.category  });
                        }

                        acc[base.id] = { 
                            ...monster.attacks.values[attackKey], 
                            range: base.isMelee ? 'Melee' : 'Ranged',
                            value: base.system.bonus.value,
                            damage: {
                                instances: damageInstances,
                                label: damageLabel,
                                average: damageInstances.reduce((acc, instance) => acc+instance.average, 0),
                            }
                        };
                    }

                    return acc;
                }, {});
            }, dataBestiary);

            dataBestiary.metadata.version = '0.8.8.4';
        }

        if(dataBestiary.metadata.version === '0.8.8.4'){
            // Change to storing all of actor.toObject. Lots of improvement in data retention, shouldn't be too much data.
            const uuids = Object.values(dataBestiary.monster).reduce((acc, monster) => {
                    if(monster.uuid && !monster.system) acc.push(monster.uuid);
                
                    return acc;
                }, []);
            const newBestiary = { monster: Object.keys(dataBestiary.monster).reduce((acc, key) => {
                if(Boolean(dataBestiary.monster[key].system)){
                    acc[key] = dataBestiary.monster[key];
                }

                return acc;
            }, {}), npc: {}, metadata: {} };
            for(var uuid of uuids){
                const orig = await fromUuid(uuid);
                const data = await PF2EBestiary.getMonsterData(orig);
                const oldCreature = dataBestiary.monster[uuid];

                if(!data){
                    continue;
                }

                /* Big Migration Block Oh-hoy */
                data.name = { ...data.name, revealed: oldCreature.name.revealed, custom: oldCreature.name.custom };
                data.system.details.level = { ...data.system.details.level, revealed: oldCreature.level.revealed, custom: oldCreature.level.custom };
                data.system.attributes.ac = { ...data.system.attributes.ac, revealed: oldCreature.ac.revealed, custom: oldCreature.ac.custom };
                data.system.attributes.hp = { ...data.system.attributes.hp, revealed: oldCreature.hp.revealed, custom: oldCreature.hp.custom };  

                Object.keys(data.system.attributes.immunities).forEach(immunityKey => {
                    const oldImmunityKey = Object.keys(oldCreature.immunities).find(x => x === immunityKey);
                    if(oldImmunityKey) data.system.attributes.immunities[immunityKey].revealed = oldCreature.immunities[oldImmunityKey].revealed;
                });

                Object.keys(data.system.attributes.weaknesses).forEach(weaknessKey => {
                    const oldWeaknessKey = Object.keys(oldCreature.weaknesses).find(x => x === weaknessKey);
                    if(oldWeaknessKey) data.system.attributes.weaknesses[weaknessKey].revealed = oldCreature.weaknesses[oldWeaknessKey].revealed;
                });

                Object.keys(data.system.attributes.resistances).forEach(resistanceKey => {
                    const oldResistanceKey = Object.keys(oldCreature.resistances).find(x => x === resistanceKey);
                    if(oldResistanceKey) data.system.attributes.resistances[resistanceKey].revealed = oldCreature.resistances[oldResistanceKey].revealed;
                });

                data.system.saves.fortitude = { ...data.system.saves.fortitude, revealed: oldCreature.saves.fortitude.revealed, custom: oldCreature.saves.fortitude.custom };
                data.system.saves.reflex = { ...data.system.saves.reflex, revealed: oldCreature.saves.reflex.revealed, custom: oldCreature.saves.reflex.custom };
                data.system.saves.will = { ...data.system.saves.will, revealed: oldCreature.saves.will.revealed, custom: oldCreature.saves.will.custom };
                
                data.system.attributes.speed.revealed = oldCreature.speeds.values.land.revealed;
                data.system.attributes.speed.otherSpeeds.forEach(speed => {
                    const oldSpeedKey = Object.keys(oldCreature.speeds.values).find(x => speed.label === x);
                        speed.revealed = oldSpeedKey ? oldCreature.speeds.values[oldSpeedKey].revealed : false;
                });
                
                Object.keys(data.system.traits.value).forEach(traitKey => data.system.traits.value[traitKey].revealed = oldCreature.traits.values[traitKey]?.revealed);
                Object.keys(data.system.abilities).forEach(abilityKey => {
                    const oldAbility = Object.values(oldCreature.abilities.values).find(x => x.label.toLowerCase() === abilityKey);
                    data.system.abilities[abilityKey] = { ...data.system.abilities[abilityKey], revealed: oldAbility.revealed, custom: oldAbility.custom };
                });
                
                data.system.perception = { ...data.system.perception, revealed: oldCreature.senses.values.perception.revealed, custom: oldCreature.senses.values.perception.custom };
                data.system.perception.senses.forEach(sense => {
                    const oldKey = Object.keys(oldCreature.senses.values).find(x => x === sense.type);
                    const oldSense = oldKey ? oldCreature.senses.values[oldKey] : null;
                    if(oldSense){
                        sense.revealed = oldSense.revealed;
                    }
                });
                data.system.perception.details = { ...data.system.perception.details, revealed: oldCreature.senses.values.other?.revealed ?? false, custom: oldCreature.senses.values.other?.custom ?? null };

                Object.keys(data.system.actions).forEach(actionKey => {
                    const creatureKey = Object.keys(oldCreature.attacks.values).find(key => key === actionKey);
                    const creatureAction = creatureKey ? oldCreature.attacks.values[creatureKey] : null;
                    if(creatureAction){
                        const action = data.system.actions[actionKey];
                        action.revealed = creatureAction.revealed;
                        action.damageStatsRevealed = creatureAction.damageStatsRevealed;
                    }
                });
                
                Object.keys(data.items).forEach(itemKey => {
                    const item = data.items[itemKey];
                    if(item.type === 'action'){
                        if(['action', 'reaction'].includes(item.system.actionType.value)){
                            const oldKey = Object.keys(oldCreature.actions.values).find(key => key === item._id);
                            item.revealed = oldKey ? oldCreature.actions.values[oldKey].revealed : false;
                        } else {
                            const oldKey = Object.keys(oldCreature.passives.values).find(key => key === item._id);
                            item.revealed = oldKey ? oldCreature.passives.values[oldKey].revealed : false;
                        }
                    }

                    if(item.type === 'spell') {
                            const entry = oldCreature.spells.entries[item.system.location.value];
                            if(entry){
                                const levels = oldCreature.spells.entries[item.system.location.value].levels;
                                const levelKeys = Object.keys(levels);
                                const level = item.system.traits.value.includes("cantrip") ? 'Cantrips' : item.system.location.heightenedLevel ?? (levelKeys.length === 1 ? levelKeys[0] : item.system.level.value);
                                if(oldCreature.spells.entries[item.system.location.value]){
                                    const oldSpell = levels[level][item._id];

                                    item.revealed = oldSpell.revealed;
                                }
                            }
                    } else if(item.type === 'spellcastingEntry'){
                        const oldEntryKey = Object.keys(oldCreature.spells.entries).find(key => key === item._id);
                        const entry = oldEntryKey ? oldCreature.spells.entries[oldEntryKey] : null;
                        if(entry){
                            item.revealed = entry.revealed;
                            item.system.spelldc.dc.revealed =  entry.dc.revealed;
                            item.system.spelldc.value.revealed = entry.attack.revealed;
                        }
                    }
                });

                data.system.details.publicNotes.revealed = oldCreature.notes.public.revealed;
                data.system.details.privateNotes.revealed = oldCreature.notes.private.revealed;
                /* Big Migration Block Oh-hoy */

                newBestiary.monster[uuid] = data;
            }

            dataBestiary = newBestiary;
            dataBestiary.metadata.version = '0.8.9';
        }

        if(dataBestiary.metadata.version === '0.8.9'){
            // Some creatures are missing None options for IWR and Actions/Passives/Attacks/Spells
            dataBestiary = await newMigrateBestiary((_, monster) => {
                const immunitiesKeys = Object.keys(monster.system.attributes.immunities);
                const weaknessesKeys = Object.keys(monster.system.attributes.weaknesses);
                const resistancesKeys = Object.keys(monster.system.attributes.resistances);

                if(immunitiesKeys.length === 0){
                    monster.system.attributes.immunities['none'] = { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") };
                }
                if(weaknessesKeys.length === 0){
                    monster.system.attributes.weaknesses['none'] = { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") };
                }
                if(resistancesKeys.length === 0){
                    monster.system.attributes.resistances['none'] = { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") };
                }

                if(Object.keys(monster.system.actions).length === 0){
                    monster.system.actions['Attack-None'] = {
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
                for(var item of Object.values(monster.items)){
                    if(item.type === 'action'){
                        if(item.system.actionType.value === 'action' || item.system.actionType.value === 'reaction') hasActions = true;
                        if(item.system.actionType.value === 'passive') hasPassives = true;
                    }
                }
        
                if(!hasActions) {
                    monster.items['Action-None'] = {
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
                    monster.items['Passive-None'] = {
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

                const noSpells = !Object.keys(monster.items).find(x => {
                    const item = monster.items[x];
                    return item.type === 'spellcastingEntry'
                });
                if(noSpells) {
                    monster.items['Spells-None'] = {
                        type: 'spellcastingEntry',
                        _id: 'Spell-None',
                        revealed: false,
                        system: {
                            spelldc: {
                                dc: { value: 0 },
                                value: { value: 0 },
                            }
                        }
                    };
                }

            }, dataBestiary);

            dataBestiary.metadata.version = '0.8.9.2';
        }

        if(dataBestiary.metadata.version === '0.8.9.2'){
            //Insert reveal properties on ability traits, and attack damage types
            dataBestiary = await newMigrateBestiary((_, monster) => {
                for(var actionKey of Object.keys(monster.items)) {
                    const action = monster.items[actionKey];
                    if(action.type === 'action'){
                        // None-Actions
                        if(!action.system.traits){
                            action.system.traits = { value: [] };
                        }
                        else if (action.system.traits.value.length > 0 && !action.system.traits.value[0].value){
                            action.system.traits.value = action.system.traits.value.map(trait => ({ revealed: false, value: trait }));
                        }
                    }
                }
                Object.keys(monster.system.actions).forEach(attackKey => {
                    // Missing Attack-None item
                    if(attackKey === 'Attack-None'){
                        monster.items['Attack-None'] = {
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
                    else if(monster.items[attackKey].system.damageRolls) {
                        Object.values(monster.items[attackKey].system.damageRolls).forEach(damageRoll => {
                            if(!damageRoll.damageType.value){
                                damageRoll.damageType = { revealed: false, value: damageRoll.damageType };
                            }
                        });
                    }

                    monster.items[attackKey].system.traits.value = Object.keys(monster.items[attackKey].system.traits.value).map(traitKey => { 
                        if(!monster.items[attackKey].system.traits.value[traitKey].value){
                            const traitsWithoutAttack = Object.keys(monster.system.actions[attackKey].traits).reduce((acc, traitKey) => {
                                if(monster.system.actions[attackKey].traits[traitKey].name !== 'attack'){
                                    acc.push(monster.system.actions[attackKey].traits[traitKey]);
                                }
                                
                                return acc;
                            }, []);
                            return { revealed: traitsWithoutAttack[traitKey].revealed, value: monster.items[attackKey].system.traits.value[traitKey] };
                        } else {
                            return { ...monster.items[attackKey].system.traits.value[traitKey] };
                        }
                    });
                });
            }, dataBestiary);

            dataBestiary.metadata.version = '0.8.9.7';
        }

        if(dataBestiary.metadata.version === '0.8.9.7'){
            dataBestiary = await newMigrateBestiary((_, monster) => {
                const infiniteGrabber = (object, property) => {
                    if(object[property]){
                        if(object[property][property]){
                            return infiniteGrabber(object[property], property);
                        }

                        return object;
                    }
                };

                Object.values(monster.items).forEach(item => {
                    if(item.type === 'melee' || item.type === 'action'){
                        Object.keys(item.system.traits.value).forEach(traitKey => {
                            item.system.traits.value[traitKey] = infiniteGrabber(item.system.traits.value[traitKey], 'value'); 
                        });
                    }

                    if(item.type === 'melee'){
                        Object.values(item.system.damageRolls).forEach(damage => {
                            damage.damageType = infiniteGrabber(damage.damageType, 'value');
                        });
                    }
                });

            }, dataBestiary);

            dataBestiary.metadata.version = '0.8.9.8.1';
        }

        if(dataBestiary.metadata.version === '0.8.9.8.1'){
            dataBestiary = await newMigrateBestiary(async (_, monster) => {
                Object.keys(monster.system.actions).forEach(actionKey => {
                    const item = monster.items[actionKey];
                    if(item.type === 'equipment'){
                        item.system.damageRolls = Object.keys(monster.system.actions[actionKey].weapon.system.damageRolls).reduce((acc, damageKey) => {
                            const damage = monster.system.actions[actionKey].weapon.system.damageRolls[damageKey];
                            acc[damageKey] = { ...damage, damageType: { revealed: false, value: damage.damageType } };

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
                    }
                });
            }, dataBestiary);
            
            dataBestiary.metadata.version = '0.8.9.8.2';
        }   

        if(dataBestiary.metadata.version === '0.8.9.8.2'){
            const journalEntry = game.journal.getName('pf2e-bestiary-tracking-journal-entry');
            dataBestiary = await newMigrateBestiary(async (_, monster) => {
                if(!monster.system.details.playerNotes?.document){
                    const existingPage = journalEntry.pages.find(x => x.name === monster.name.value);
                    if(existingPage){
                        await existingPage.delete();
                    }

                    const page = await journalEntry.createEmbeddedDocuments("JournalEntryPage", [{
                        name: monster.name.value,
                        text: {
                            content: ""
                        }
                    }]);
        
                    monster.system.details.playerNotes = { document: page[0].id };
                }
            }, dataBestiary);
            
            dataBestiary.metadata.version = '0.8.9.9';
        }

        if(dataBestiary.metadata.version === '0.8.9.9'){
            dataBestiary = await newMigrateBestiary(async (_, monster) => {
                const itemKeys = Object.keys(monster.items);
                const actionKeys = itemKeys.filter(key => monster.items[key].type === 'action' && monster.items[key].system.actionType.value !== 'passive');
                if(actionKeys.length > 1 && actionKeys.find(key => monster.items[key]._id === 'Action-None')){
                    monster.items = itemKeys.reduce((acc, key) => {
                        if(monster.items[key]._id !== 'Action-None'){
                            acc[key] = monster.items[key];
                        }

                        return acc;
                    }, {});
                }
            }, dataBestiary);

            dataBestiary.metadata.version = '0.8.9.9.6';
        }

        if(dataBestiary.metadata.version === '0.8.9.9.6'){
            const journalEntry = game.journal.getName('pf2e-bestiary-tracking-journal-entry');
            dataBestiary = await newMigrateBestiary(async (_, monster) => {
                if(!monster.system.details.playerNotes?.document){
                    const existingPage = journalEntry.pages.find(x => x.name === monster.name.value);
                    if(existingPage){
                        await existingPage.delete();
                    }

                    const page = await journalEntry.createEmbeddedDocuments("JournalEntryPage", [{
                        name: monster.name.value,
                        text: {
                            content: ""
                        }
                    }]);
        
                    monster.system.details.playerNotes = { document: page[0].id };
                }
            }, dataBestiary);

            dataBestiary.metadata.version = '0.8.11';
        }

        if(dataBestiary.metadata.version === '0.8.11'){
            const journalEntry = game.journal.getName('pf2e-bestiary-tracking-journal-entry');
            if(journalEntry){
                dataBestiary = await newMigrateBestiary(async (_, monster) => {
                    if(!monster.system.details.playerNotes?.document){
                        const page = journalEntry.pages.find(x => x.name === monster.name.value);
                        if(page){
                            monster.system.details.playerNotes = { document: page.id };
                        }
                    }
                }, dataBestiary);
            }

            dataBestiary.metadata.version = '0.8.12';
        }

        if(dataBestiary.metadata.version < '0.9.0'){
            dataBestiary.npcCategories = {};
            
            dataBestiary.metadata.version = '0.9.0';
        }

        if(dataBestiary.metadata.version === '0.9.0'){
            if(!dataBestiary.npcCategories){
                dataBestiary.npcCategories = {};
            }
            
            dataBestiary.metadata.version = '0.9.1';
        }

        if(dataBestiary.metadata.version === '0.9.1'){
            for(var npcKey in dataBestiary.npc){
                var npc = dataBestiary.npc[npcKey];

                for(var category of npc.npcData.categories){
                    if(!dataBestiary.npcCategories[category.key]){
                        dataBestiary.npcCategories[category.key] = category.name;
                    }
                }
            } 

            dataBestiary.metadata.version = '0.9.2';
        }

        if(dataBestiary.metadata.version === '0.9.2' || dataBestiary.metadata.version === '0.9.3'){
            var folderId = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking-folder');
            var journal = isSave ? null : game.journal.getName(game.i18n.localize('PF2EBestiary.BestiaryName'));
            if(!journal){
                journal = await JournalEntry.create({ name: dataBestiary.metadata?.save?.name ?? game.i18n.localize('PF2EBestiary.BestiaryName'), folder: folderId });
                await journal.setFlag('pf2e-bestiary-tracking', 'npcCategories', !bestiary ? [] : Object.keys(bestiaryObject.npcCategories).reduce((acc, key) => {
                    acc.push({ name: bestiaryObject.npcCategories[key], value: key });
    
                    return acc;
                }, []));
                await journal.setFlag('pf2e-bestiary-tracking', 'image', 'systems/pf2e/assets/compendium-banner/green.webp');
            }

            for(var monsterKey of Object.keys(bestiaryObject.monster)){
                const monster = bestiaryObject.monster[monsterKey];
                const data = monster.system.traits.rarity === 'unique' || Boolean(monster.system.traits.value['npc']) ? getNPCDataFromOld(monster, true) : getCreatureDataFromOld(monster);
                await journal.createEmbeddedDocuments("JournalEntryPage", [data]);
            }

            for(var npcKey of Object.keys(bestiaryObject.npc)){
                const npc = bestiaryObject.npc[npcKey];
                await journal.createEmbeddedDocuments("JournalEntryPage", [getNPCDataFromOld(npc)]);
            }

            const oldJournalEntry = game.journal.getName('pf2e-bestiary-tracking-journal-entry');
            await oldJournalEntry?.delete();
            await game.folders.getName('pf2e-bestiary-tracking-folder')?.delete();

            if(!isSave){
                await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', journal.id);
            }

            await journal.setFlag('pf2e-bestiary-tracking', 'version', '0.9.4');
        }
    }

    return bestiary;
};

const migrateBestiary = async (update) => {
    const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    
    var toRemove = [];
    for(var typeKey in bestiary.monster){
        for(var monsterKey in bestiary.monster[typeKey]){
            const monster = bestiary.monster[typeKey][monsterKey];

            const result = await update(bestiary, monster, typeKey, monsterKey);
            if(result) {
                toRemove.push(result);
            } else {
                for(var inType of monster.inTypes){
                    if(typeKey !== inType){
                        bestiary.monster[inType][monsterKey] = foundry.utils.deepClone(bestiary.monster[typeKey][monsterKey]);
                    }
                }
            }
        }
    }

    for(var remove of toRemove){
        delete bestiary.monster[remove.type][remove.monsterKey];
    }
    
    await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
};

const newMigrateBestiary = async (update, bestiary) => {
    const toRemoveSadly = [];
    for(var npcKey in bestiary.monster){
        const monster = bestiary.monster[npcKey];

        const failure = await update(bestiary, monster, npcKey, 'monster');
        
        // Only send back a value from update when it's a critical update. Otherwise allow unlinked actors to stay.
        if(failure){
            toRemoveSadly.push(npcKey);
        }

        bestiary.monster[npcKey] = foundry.utils.deepClone(bestiary.monster[npcKey]);
    }

    for(var toRemove of toRemoveSadly){
        delete bestiary.monster[toRemove];
    }

    const toRemoveNPC = [];
    for(var npcKey in bestiary.npc){
        const monster = bestiary.npc[npcKey];

        const failure = await update(bestiary, monster, npcKey, 'npc');
        
        // Only send back a value from update when it's a critical update. Otherwise allow unlinked actors to stay.
        if(failure){
            toRemoveNPC.push(npcKey);
        }

        bestiary.npc[npcKey] = foundry.utils.deepClone(bestiary.monster[npcKey]);
    }

    for(var toRemove of toRemoveNPC){
        delete bestiary.npc[toRemove];
    }

    return bestiary;
};

const handleDeactivatedPages = async () => {
    var folder = game.folders.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking-folder'));
    if(!folder){
        folder = await Folder.create({ "name": bestiaryFolder, "type": "JournalEntry" });
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking-folder', folder.id);
    }

    const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    var bestiaryId = null;
    try {
        bestiaryId = JSON.parse(bestiary);
    } catch{ bestiaryId = bestiary; }

    if(typeof bestiaryId === 'object') return;

    var journal = game.journal.get(bestiaryId);
    if(!journal){
        journal = await JournalEntry.create({ name: game.i18n.localize('PF2EBestiary.BestiaryName'), folder: folder.id });
        await journal.setFlag('pf2e-bestiary-tracking', 'npcCategories', []);
        await journal.setFlag('pf2e-bestiary-tracking', 'version', currentVersion);
        await journal.setFlag('pf2e-bestiary-tracking', 'image', 'systems/pf2e/assets/compendium-banner/green.webp');

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', journal.id);
    }

    const deactivatedArray = Array.from(game.journal).reduce((acc, journal) => {
        journal.pages.forEach(page => {
            const deactivatedData = page.getFlag('pf2e-bestiary-tracking', 'deactivated-data');
            if(deactivatedData){
                acc.push({ page: page, data: JSON.parse(deactivatedData) });
            }
        });
        
        return acc;
    }, []);
    
    for(var deactivated of deactivatedArray){
        await deactivated.page.update(deactivated.data);
        await deactivated.page.unsetFlag('pf2e-bestiary-tracking', 'deactivated-data');
    }
};

const currentVersion = '0.9.4';
const bestiaryFolder = "BestiaryTracking Bestiares";

const dataTypeSetup = () => {
    CONFIG.JournalEntryPage.dataModels = {
        ...CONFIG.JournalEntryPage.dataModels,
        "pf2e-bestiary-tracking.creature": Creature,
        "pf2e-bestiary-tracking.npc": NPC,
    };
};

const registerKeyBindings = () => {
    game.keybindings.register("pf2e-bestiary-tracking", "open-bestiary", {
        name: game.i18n.localize("PF2EBestiary.KeyBindings.OpenBestiary.Name"),
        hint: game.i18n.localize("PF2EBestiary.KeyBindings.OpenBestiary.Hint"),
        uneditable: [],
        editable: [],
        onDown: () => game.modules.get('pf2e-bestiary-tracking').macros.openBestiary(),
        onUp: () => {},
        restricted: false,
        reservedModifiers: [],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });

    game.keybindings.register("pf2e-bestiary-tracking", "show-monster", {
        name: game.i18n.localize("PF2EBestiary.KeyBindings.ShowMonster.Name"),
        hint: game.i18n.localize("PF2EBestiary.KeyBindings.ShowMonster.Hint"),
        uneditable: [],
        editable: [],
        onDown: () => game.modules.get('pf2e-bestiary-tracking').macros.showMonster(),
        onUp: () => {},
        restricted: false,
        reservedModifiers: [],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });

    game.keybindings.register("pf2e-bestiary-tracking", "add-monster", {
        name: game.i18n.localize("PF2EBestiary.KeyBindings.AddMonster.Name"),
        hint: game.i18n.localize("PF2EBestiary.KeyBindings.AddMonster.Hint"),
        uneditable: [],
        editable: [],
        onDown: () => game.modules.get('pf2e-bestiary-tracking').macros.addMonster(),
        onUp: () => {},
        restricted: true,
        reservedModifiers: [],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });
};

const registerGameSettings = () => {
    configSettings();
    generalNonConfigSettings();
    vagueDescriptions();
    bestiaryLabels();
    bestiaryAppearance();
    bestiaryIntegration();
};

const configSettings = () => {
    game.settings.register('pf2e-bestiary-tracking', 'hide-token-names', {
        name: game.i18n.localize('PF2EBestiary.Settings.HideTokenNames.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.HideTokenNames.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        onChange: async value => {
            for(var token of canvas.tokens.placeables){
                var name = token.document.baseActor.name;
                if(value){
                    const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
                    const page = bestiary.pages.find(x => x.system.uuid === token.document.baseActor.uuid);
                    if(page){
                        name = page.system.name.revealed && page.system.name.custom ? page.system.name.custom : 
                        page.system.name.revealed && !page.system.name.custom ? page.system.name.value :
                            !page.system.name.revealed ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown") : name;
                    }
                }

                await token.document.update({ name });
            }

            if(game.combat){
                for(var combatant of game.combat.combatants){
                    var name = combatant.token.baseActor.name;
                    if(value){
                        const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
                        const page = bestiary.pages.find(x => x.system.uuid === combatant.token.baseActor.uuid);
                        if(page){
                            name = page.system.name.revealed && page.system.name.custom ? page.system.name.custom : 
                            page.system.name.revealed && !page.system.name.custom ? page.system.name.value :
                                !page.system.name.revealed ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown") : name;
                        }
                    }

                    await combatant.update({ name: name });
                }
            }
        },
    });
};

const generalNonConfigSettings = () => {
    game.settings.register('pf2e-bestiary-tracking', 'version', {
        name: game.i18n.localize('PF2EBestiary.Settings.Version.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.Version.Hint'),
        scope: 'world',
        config: false,
        type: String,
        default: '',
    });

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-tracking', {
        name: game.i18n.localize("PF2EBestiary.Menus.Data.Name"),
        hint: game.i18n.localize("PF2EBestiary.Menus.Data.Hint"),
        scope: 'world',
        config: false,
        type: String,
        default: '',
    });

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-tracking-folder', {
        name: game.i18n.localize("PF2EBestiary.Menus.Data.Name"),
        hint: game.i18n.localize("PF2EBestiary.Menus.Data.Hint"),
        scope: 'world',
        config: false,
        type: String,
        default: '',
    });

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-layout', {
        name: game.i18n.localize('PF2EBestiary.Settings.Version.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.Version.Hint'),
        scope: 'client',
        config: false,
        type: Object,
        default: {
            categories: {
                layout: 0,
                filter: {
                    type: 0,
                    direction: 0
                }
            }
        },
    });
};

const vagueDescriptions = () => {
    game.settings.registerMenu("pf2e-bestiary-tracking", "vague-descriptions", {
        name: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Hint'),
        icon: "fa-solid fa-eye-low-vision",
        type: VagueDescriptionsMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'vague-descriptions', {
        name: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Name'),
        hint: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            properties: {
                ac: false,
                hp: false,
                resistances: false,
                weaknesses: false,
                saves: false,
                perception: false,
                speed: false,
                attributes: false,
                skills: false,
                attacks: false,
                damage: false,
                spells: false,
            },
            settings: {
                playerBased: false,
                misinformationOptions: false,
            }
        },
    });
};

const bestiaryLabels = () => {
    game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-labels", {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Menu.Hint'),
        icon: "fa-solid fa-tags",
        type: BestiaryLabelsMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-labels', {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Name'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            vagueDescriptions: {
                ...getVagueDescriptionLabels()
            }
        },
    });
};

const bestiaryAppearance = () => {
    game.settings.register('pf2e-bestiary-tracking', 'use-token-art', {
        name: game.i18n.localize('PF2EBestiary.Settings.UseTokenArt.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.UseTokenArt.Hint'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
    });

    game.settings.register('pf2e-bestiary-tracking', 'hide-ability-descriptions', {
        name: game.i18n.localize('PF2EBestiary.Settings.HideAbilityDescriptions.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.HideAbilityDescriptions.Hint'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
    });

    game.settings.register('pf2e-bestiary-tracking', 'detailed-information-toggles', {
        name: game.i18n.localize('PF2EBestiary.Settings.DetailedInformation.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.DetailedInformation.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            exceptionsDouble: false,
            attackTraits: false,
            damageTypes: false,
            abilityTraits: false,
        },
    });

    game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-appearance", {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Hint'),
        icon: "fa-solid fa-sitemap",
        type: BestiaryAppearanceMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'contrast-revealed-state', {
        name: game.i18n.localize('PF2EBestiary.Settings.ContrastRevealState.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.ContrastRevealState.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            ...revealedState
        },
    });

    game.settings.register('pf2e-bestiary-tracking', 'optional-fields', {
        name: game.i18n.localize('PF2EBestiary.Settings.OptionalFields.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.OptionalFields.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            ...optionalFields
        },
    });

    game.settings.register('pf2e-bestiary-tracking', 'additional-creature-types', {
        name: game.i18n.localize('PF2EBestiary.Settings.AdditionalCreatureTypes.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AdditionalCreatureTypes.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: [],
    });
};

const bestiaryIntegration = () => {
    game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-integration", {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Menu.Hint'),
        icon: "fa-solid fa-feather",
        type: BestiaryIntegrationMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'automatic-combat-registration', {
        name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Hint'),
        scope: 'world',
        config: false,
        type: Number,
        choices: {
            0: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.Never'),
            1: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.StartOfCombat'),
            2: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.CreatureDefeated'),
        },
        default: 0,
    });

    game.settings.register('pf2e-bestiary-tracking', 'doubleClickOpen', {
        name: game.i18n.localize('PF2EBestiary.Settings.DoubleClickOpen.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.DoubleClickOpen.Hint'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
        onChange: async value => {
            if(!value || !game.user.isGM) return;

            const bestiary = await newMigrateBestiary(async (_, monster) => {
                const origin = await fromUuid(monster.uuid);

                await origin?.update({ "ownership.default": origin.ownership.default > 1 ? origin.ownership.default : 1 });
            }, game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

            await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
        }
    });

    game.settings.register('pf2e-bestiary-tracking', 'chat-message-handling', {
        name: game.i18n.localize('PF2EBestiary.Settings.ChatMessageHandling.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.ChatMessageHandling.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            revealRightClick: false,
            automaticReveal: {
                saves: false,
                skills: false,
                attacks: false,
                actions: false,
                spells: false,
            }
        },
    });

    game.settings.register('pf2e-bestiary-tracking', 'npc-registration', {
        name: game.i18n.localize('PF2EBestiary.Settings.NPCRegistation.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.NPCRegistation.Hint'),
        scope: 'world',
        config: false,
        type: Number,
        choices: {
            0: game.i18n.localize('PF2EBestiary.Settings.NPCRegistation.Choices.Unique'),
            1: game.i18n.localize('PF2EBestiary.Settings.NPCRegistation.Choices.Tag'),
        },
        default: 0,
    });

    game.settings.register('pf2e-bestiary-tracking', 'hidden-settings', {
        name: game.i18n.localize('PF2EBestiary.Settings.HiddenSettings.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.HiddenSettings.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            monster: false,
            npc: false,
            hazard: false,
        },
    });
};

const fields = foundry.data.fields;

const toggleStringField = () => new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.StringField({ required: true }),
    custom: new fields.StringField({ nullable: true }),
});

const toggleNumberField = () => new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.NumberField({ required: true, integer: true }),
    custom: new fields.StringField({ nullable: true }),
}) ;

const getCreatureData = (actor) => {
    const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
    const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
    const resistancesKeys = Object.keys(actor.system.attributes.resistances);
    const attackKeys = Object.keys(actor.system.actions);
    const itemKeys = Array.from(actor.items);

    const spellEntries = itemKeys.reduce((acc, entry) => {
      if(entry.type === 'spellcastingEntry'){
        const levels = {};
        actor.items.forEach(spell => {
          if(spell.type === 'spell' && spell.system.location.value === entry.id){
            const levelValue = getSpellLevel(spell, actor.system.details.level.value);

            var level = Object.values(levels).find(x => x.value === levelValue);
            if(!level) {
                level = { value: levelValue, spells: {} };
            }

            level.spells[spell._id] = {
                label: spell.name,
                img: spell.img,
                actions: spell.actionGlyph,
                defense: spell.system.defense?.save?.statistic ? {
                  statistic: spell.system.defense.save.statistic,
                  basic: spell.system.defense.save.basic,
                } : null,
                range: spell.system.range.value,
                traits: {
                  rarity: spell.system.traits.rarity,
                  traditions: spell.system.traits.traditions,
                  values: spell.system.traits.value.reduce((acc, trait ) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {})
                },
                description: {
                    gm: spell.system.description.gm,
                    value: spell.system.description.value,
                }
            };

            levels[levelValue] = level;
          }
        }); 

        acc[entry.id] = {
          tradition: entry.system.tradition.value,
          category: entry.category,
          dc: { value: entry.system.spelldc.dc },
          mod: { value: entry.system.spelldc.mod },
          attack: { value: entry.system.spelldc.value },
          levels: levels,
        };
      }

      return acc;
    }, {});

    const hasSpells = Object.keys(spellEntries).length > 0;
    const spells = {
      ...(hasSpells ? {} : { fake: { revealed: false } }),
      entries: hasSpells ? spellEntries : {},
    };

    return {
        type: 'pf2e-bestiary-tracking.creature',
        name: actor.name,
        ownership: { default: 3 },
        system: {
            hidden: game.settings.get('pf2e-bestiary-tracking', 'hidden-settings').monster,
            uuid: actor.uuid,
            version: currentVersion,
            img: actor.img,
            texture: actor.prototypeToken.texture.src,
            name: { value: actor.name },
            hardness: { value: actor.system.attributes.hardness.value },
            allSaves: { value: actor.system.attributes.allSaves.value },
            publication: actor.system.details.publication,
            ac: { value: Number.parseInt(actor.system.attributes.ac.value), details: actor.system.attributes.ac.details },
            hp: { value: Number.parseInt(actor.system.attributes.hp.max), temp: Number.parseInt(actor.system.attributes.hp.temp), details: actor.system.attributes.hp.details, negativeHealing: actor.system.attributes.hp.negativeHealing },
            level: { value: Number.parseInt(actor.system.details.level.value) },
            size: actor.system.traits.size.value,
            rarity: { value: actor.system.traits.rarity },
            traits: actor.system.traits.value.reduce((acc, trait) => {
              acc[trait] = { value: trait };
              return acc;
            }, {}),
            skills: Object.values(actor.system.skills).some(x => x.base > 0) ? Object.keys(actor.system.skills).reduce((acc, key) => {
              const skill = actor.system.skills[key];
              acc[key] = { value: skill.base, lore: skill.lore, note: skill.note, modifiers: skill.modifiers.filter(x => x.slug !== 'base').map(x => ({ kind: x.kind, label: x.label, modifier: x.modifier })), label: skill.label, totalModifier: Number.parseInt(skill.totalModifier) };
              return acc;
            }, {}) : { empty: { empty: true, value: 'PF2EBestiary.Miscellaneous.None' } },
            saves: {
              fortitude: { value: actor.system.saves.fortitude.value },
              reflex: { value: actor.system.saves.reflex.value },
              will: { value: actor.system.saves.will.value },
            },
            speeds: {
              details: { name: actor.system.attributes.speed.details },
              values: {
                land: { type: 'land', value: actor.system.attributes.speed.value },
                ...actor.system.attributes.speed.otherSpeeds.reduce((acc, speed) => {
                  acc[speed.label] = { type: speed.type, value: speed.value };
                  return acc;
                }, {})
              },  
            },
            abilities: Object.keys(actor.system.abilities).reduce((acc, key) => {
              acc[key] = { key: key, mod: actor.system.abilities[key].mod };
              return acc;
            }, {}),
            senses: {
              perception: { value: actor.system.perception.value },
              details: { value: actor.system.perception.details },
              senses: actor.system.perception.senses.reduce((acc, sense) => {
                acc[sense.type] = { type: sense.type };
                return acc;
              }, {})
            },
            languages: {
              details: { value: actor.system.details.languages.details },
              values: (actor.system.details.languages.value.length > 0 || actor.system.details.languages.details) ? actor.system.details.languages.value.reduce((acc, language) => {
                acc[language] = { value: language };
                return acc;
              }, {}) : { empty: { empty: true, value: 'PF2EBestiary.Miscellaneous.None', exceptions: {} } }
            },
            immunities: immunitiesKeys.length > 0 ? immunitiesKeys.reduce((acc, key) => {
                const immunity = actor.system.attributes.immunities[key];
                acc[getIWRString(immunity)] = { 
                    revealed: false, 
                    type: immunity.type, 
                    exceptions:  immunity.exceptions.reduce((acc, exception) => {  
                      acc[exception] = { type: exception.label ?? exception };
                      return acc;
                    }, {}),
                };

                return acc;
            }, {}) : { empty: { empty: true, type: 'PF2EBestiary.Miscellaneous.None', exceptions: {} } },
            weaknesses: weaknessesKeys.length > 0 ? weaknessesKeys.reduce((acc, key) => {
                const weakness = actor.system.attributes.weaknesses[key];
                acc[getIWRString(weakness)] = { 
                    revealed: false, 
                    type: weakness.type,
                    value: weakness.value, 
                    exceptions:  weakness.exceptions.reduce((acc, exception) => {  
                      acc[exception] = { type: exception.label ?? exception };
                      return acc;
                    }, {}),
                };

                return acc;
            }, {}) : { empty: { empty: true, type: 'PF2EBestiary.Miscellaneous.None', exceptions: {} } },
            resistances: resistancesKeys.length > 0 ? resistancesKeys.reduce((acc, key) => {
                const resistance = actor.system.attributes.resistances[key];
                acc[getIWRString(resistance)] = { 
                    revealed: false, 
                    type: resistance.type,
                    value: resistance.value, 
                    exceptions:  resistance.exceptions.reduce((acc, exception) => {  
                      const type = exception.label ?? exception;
                      acc[slugify(type)] = { type: type };
                      return acc;
                    }, {}),
                    doubleVs: resistance.doubleVs.reduce((acc, doubleVs) => {  
                      acc[doubleVs] = { type: doubleVs.label ?? doubleVs };
                      return acc;
                    }, {}),
                };

                return acc;
            }, {}) : { empty: { empty: true, type: 'PF2EBestiary.Miscellaneous.None', exceptions: {}, doubleVs: {} } },
            attacks: attackKeys.length > 0 ? attackKeys.reduce((acc, actionKey) => {
              const attack = actor.system.actions[actionKey];
              const item = actor.items.get(attack.item.id);
              
              if(item.type === 'melee' || item.type === 'equipment'){
                acc[attack.item.id] = {
                  label: attack.label,
                  actions: attack.glyph,
                  totalModifier: attack.totalModifier,
                  isMelee: attack.weapon.isMelee,
                  additionalEffects: attack.additionalEffects.reduce((acc, effect) => {
                    acc[effect.tag] = { label: effect.label, tag: effect.tag };

                    return acc;
                  }, {}),
                  damageInstances: Object.keys(item.system.damageRolls).reduce((acc, damage) => {
                    acc[damage] = { 
                      category: item.system.damageRolls[damage].category,
                      damage: { value: item.system.damageRolls[damage].damage },
                      damageType: { value: item.system.damageRolls[damage].damageType } 
                    };

                    return acc;
                  }, {}),
                  traits: item.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait, description: trait };
                    return acc;
                  }, {}),
                  variants: attack.variants.reduce((acc, variant) => {
                    acc[slugify(variant.label)] = { label: variant.label };

                    return acc;
                  }, {}),
                  rules: item.system.rules,
                };
              }

              return acc;
            }, {}) : { empty: { empty: true, label: 'PF2EBestiary.Miscellaneous.None', totalModifier: 0, isMelee: false, damageInstances: {}, traits: {}, variants: {}, rules: {} } },
            actions: itemKeys.filter(action => action.type === 'action' && action.system.actionType.value !== 'passive').length > 0 ? itemKeys.reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value !== 'passive'){
                acc[action.id] = {
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  actions: action.system.actions.value ?? 'R',
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {}),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {}) : { empty: { empty: true, label: 'PF2EBestiary.Miscellaneous.None', actions: '', traits: {}, description: '' } },
            passives: itemKeys.filter(action => action.type === 'action' && action.system.actionType.value === 'passive').length > 0 ? itemKeys.reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value === 'passive'){
                acc[action.id] = {
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {}),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {}) : { empty: { empty: true, label: 'PF2EBestiary.Miscellaneous.None', traits: {}, description: '' } },
            spells: spells,
            notes: {
              public: { value: actor.system.details.publicNotes },
              private: { value: actor.system.details.privateNotes },
            },
        }
    };
};

const getNPCData = (actor) => {
  const creatureData = getCreatureData(actor);
  
  return {
    ...creatureData,
    type: 'pf2e-bestiary-tracking.npc',
    system: {
      ...creatureData.system,
      hidden: game.settings.get('pf2e-bestiary-tracking', 'hidden-settings').npc,
      npcData: {
        categories: [],
        general: {
          background: { value: '' },
          appearance: { value: '' },
          personality: { value: '' },
          height: { value: '' },
          weight: { value: '' },
          birthplace: { value: '' },
          disposition: {},
        }
      }
    }
  }
};

class MappingField extends foundry.data.fields.ObjectField {
    constructor(model, options) {
      if ( !(model instanceof foundry.data.fields.DataField) ) {
        throw new Error("MappingField must have a DataField as its contained element");
      }
      super(options);
  
      /**
       * The embedded DataField definition which is contained in this field.
       * @type {DataField}
       */
      this.model = model;
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    static get _defaults() {
      return foundry.utils.mergeObject(super._defaults, {
        initialKeys: null,
        initialValue: null,
        initialKeysOnly: false
      });
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    _cleanType(value, options) {
      Object.entries(value).forEach(([k, v]) => value[k] = this.model.clean(v, options));
      return value;
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    getInitialValue(data) {
      let keys = this.initialKeys;
      const initial = super.getInitialValue(data);
      if ( !keys || !foundry.utils.isEmpty(initial) ) return initial;
      if ( !(keys instanceof Array) ) keys = Object.keys(keys);
      for ( const key of keys ) initial[key] = this._getInitialValueForKey(key);
      return initial;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Get the initial value for the provided key.
     * @param {string} key       Key within the object being built.
     * @param {object} [object]  Any existing mapping data.
     * @returns {*}              Initial value based on provided field type.
     */
    _getInitialValueForKey(key, object) {
      const initial = this.model.getInitialValue();
      return this.initialValue?.(key, initial, object) ?? initial;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _validateType(value, options={}) {
      if ( foundry.utils.getType(value) !== "Object" ) throw new Error("must be an Object");
      const errors = this._validateValues(value, options);
      if ( !foundry.utils.isEmpty(errors) ) throw new foundry.data.fields.ModelValidationError(errors);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Validate each value of the object.
     * @param {object} value     The object to validate.
     * @param {object} options   Validation options.
     * @returns {Object<Error>}  An object of value-specific errors by key.
     */
    _validateValues(value, options) {
      const errors = {};
      for ( const [k, v] of Object.entries(value) ) {
        const error = this.model.validate(v, options);
        if ( error ) errors[k] = error;
      }
      return errors;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    initialize(value, model, options={}) {
      if ( !value ) return value;
      const obj = {};
      const initialKeys = (this.initialKeys instanceof Array) ? this.initialKeys : Object.keys(this.initialKeys ?? {});
      const keys = this.initialKeysOnly ? initialKeys : Object.keys(value);
      for ( const key of keys ) {
        const data = value[key] ?? this._getInitialValueForKey(key, value);
        obj[key] = this.model.initialize(data, model, options);
      }
      return obj;
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    _getField(path) {
      if ( path.length === 0 ) return this;
      else if ( path.length === 1 ) return this.model;
      path.shift();
      return this.model._getField(path);
    }
  }

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$1, ApplicationV2: ApplicationV2$1 } = foundry.applications.api;

class BestiarySelection extends HandlebarsApplicationMixin$1(ApplicationV2$1) {
    constructor(){
        super({});
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.BestiarySelection.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-bestiary-selection',
        classes: ["bestiary-selection"],
        position: { width: 680, height: 'auto' },
        actions: {
            createNewBestiary: this.createNewBestiary,
            editBestiary: this.editBestiary,
            deleteBestiary: this.deleteBestiary,
            swapBestiary: this.swapBestiary,
            importOldSaves: this.importOldSaves,
        },
        window: {
            controls: [
                {
                    icon: 'fa-solid fa-database',
                    label: 'PF2EBestiary.BestiarySelection.ImportOldSaves',
                    action: 'importOldSaves'
                },
            ]
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "bestiary-appearance-menu",
            template: "modules/pf2e-bestiary-tracking/templates/bestiarySelection.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        const journals = game.journal.filter(x => Boolean(x.flags['pf2e-bestiary-tracking']));
        
        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        context.bestiaries = journals.map(journal => ({ id: journal.id, name: journal.name, img: journal.getFlag('pf2e-bestiary-tracking', 'image'), active: journal.id === bestiary })).sort((a, b) => {
            if(a.name < b.name) return -1;
            if(a.name > b.name) return 1;
            else return 0;
        });

        return context;
    }

    static async updateData(event, element, formData){
        const data = foundry.utils.expandObject(formData.object);
        this.newBestiary = data.newBestiary;
        this.render();
    }

    static async createNewBestiary(){
        const folder = game.folders.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking-folder'));
        if(!folder){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.BestiarySelection.MissingFolderError"));
            return;
        }

        const journal = await JournalEntry.create({ name: 'New Bestiary', folder: folder.id });
        await journal.setFlag('pf2e-bestiary-tracking', 'image', 'systems/pf2e/assets/compendium-banner/green.webp');
        await journal.setFlag('pf2e-bestiary-tracking', 'npcCategories', []);
        await journal.setFlag('pf2e-bestiary-tracking', 'version', currentVersion);

        this.render();
    }

    static async editBestiary(event, button){
        event.stopPropagation();

        const bestiary = game.journal.get(button.dataset.bestiary);
        if(!bestiary) return;

        const content = `
            <div>
                ${new foundry.data.fields.StringField({
                    label: game.i18n.localize("PF2EBestiary.BestiarySelection.BestiaryNameText"),
                    initial: bestiary.name,
                    required: true
                }).toFormGroup({}, {name: "name"}).outerHTML}
                ${new foundry.data.fields.FilePathField({
                    label: game.i18n.localize("PF2EBestiary.BestiarySelection.BestiaryImageText"),
                    categories: ["IMAGE"],
                    initial: bestiary.getFlag('pf2e-bestiary-tracking', 'image'),
                }).toFormGroup({}, {name: "img", value: bestiary.getFlag('pf2e-bestiary-tracking', 'image')}).outerHTML}
        </div>`;

        const doEdit = async (_, button) => {
            const name = button.form.elements.name.value;
            const img = button.form.elements.img.value ? button.form.elements.img.value : 'systems/pf2e/assets/compendium-banner/green.webp';

            await bestiary.update({ name: name });
            await bestiary.setFlag('pf2e-bestiary-tracking', 'image', img);
            this.render();
        };

        const dialog = new foundry.applications.api.DialogV2({
            buttons: [
                foundry.utils.mergeObject({
                    action: "ok", label: game.i18n.localize('PF2EBestiary.Miscellaneous.Confirm'), icon: "fa-solid fa-plus", default: true
                }, { callback: doEdit.bind(this) }),
                foundry.utils.mergeObject({
                    action: "cancel", label: game.i18n.localize('PF2EBestiary.Miscellaneous.Cancel'), icon: "fa-solid fa-x", default: true
                }),
            ],
            content: content,
            rejectClose: false,
            modal: false,
            position: { width: 408 },
            window: {title: game.i18n.localize('PF2EBestiary.BestiarySelection.EditDialogTitle')},
        });

        dialog.render(true);
    }

    static async deleteBestiary(_, button){
        if(button.dataset.bestiary === game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking')) return;
        
        const confirmed = await Dialog.confirm({
            title: game.i18n.localize('PF2EBestiary.BestiarySelection.DeleteBestiaryTitle'),
            content: game.i18n.localize('PF2EBestiary.BestiarySelection.DeleteBestiaryText'),
            yes: () => true,
            no: () => false,
        });

        if(!confirmed) return;

        await game.journal.get(button.dataset.bestiary).delete();

        this.render();
    }

    static async swapBestiary(_, button){
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', button.dataset.bestiary);

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });
        Hooks.callAll(socketEvent.UpdateBestiary, {});

        this.render();
    }

    static async importOldSaves(){
        const callback = async path => {
            const oldSave = await fetch(path).then(async response => {
                try {
                    const jsonObject = await response.json();
                    if(jsonObject.monster){
                        return JSON.stringify(jsonObject);
                    }

                    return null;
                }catch{
                    return null;
                }
            });
            if(!oldSave) {
                ui.notifications.error(game.i18n.localize("PF2EBestiary.BestiarySelection.OldSaveInvalid"));
                return;
            }
            await handleBestiaryMigration(oldSave, true);

            ui.notifications.info(game.i18n.localize("PF2EBestiary.BestiarySelection.OldSaveStateImported"));
            this.render();
        };

        new FilePicker({
            type: "json",
            title: 'Test',
            callback: callback.bind(this),
        }).render(true);
    }
}

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

class PF2EBestiary extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(page){
        super({});

        this.bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

        var monsterCreatureTypes = [];
        if(page) {
            if(page.type === 'pf2e-bestiary-tracking.npc'){
                monsterCreatureTypes = page.system.npcData.categories.length > 0 ? [page.system.npcData.categories[0].value] : ['unaffiliated'];
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
            npcView: page?.type === 'pf2e-bestiary-tracking.npc' ? true : false,
            newCategory: {
                text: null,
            }
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
                    icon: 'fa-solid fa-right-left',
                    label: 'PF2EBestiary.Bestiary.WindowControls.BestiarySelection',
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
            const tagFunc = tagData => {
                const hidden = this.selected.monster.system.npcData.categories.find(x => x.value === tagData.value)?.hidden;
                return `
                <tag
                    contenteditable='false'
                    spellcheck='false'
                    tabIndex="-1"
                    class="tagify__tag tagify--noAnim tagify-hover-parent"
                >
                    <x title='' class='tagify__tag__removeBtn' role='button' aria-label='remove tag'></x>
                    <i class="tagify-hidden-button primary-container ${hidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}"></i>
                    <div>
                        <span class="tagify__tag-text">${tagData.name}</span>
                    </div>
                </tag>
            `
        };

            const suggestionClick = this.clickTraitSuggestion.bind(this);
            const beforeRemoveTag = this.removeTraitTag.bind(this);

            const traitsTagify = new Y(npcCategoryInput, {
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
                hooks: {
                    suggestionClick,
                    beforeRemoveTag,
                },
                templates: {
                    tag: tagFunc.bind(this),
                },
              });

              traitsTagify.on('click', this.updateNpcCategoryHidden.bind(this));
        }
    }

    clickTraitSuggestion = (e) => {
        const value = e.target.closest('.tagify__dropdown__item').getAttribute('value');

        const data = this.bestiary.getFlag('pf2e-bestiary-tracking', 'npcCategories').find(x => x.value === value);
        const currentCategories = this.selected.monster.system.npcData.categories;
        const newCategories = currentCategories.some(x => x.value === data.value) ? currentCategories : [...currentCategories, data] ;
        const entity = this.selected.monster;

        return new Promise(async function(resolve, reject){
            await entity.update({ "system.npcData.categories": newCategories });

            await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                action: socketEvent.UpdateBestiary,
                data: { },
            });

            Hooks.callAll(socketEvent.UpdateBestiary, {});

            resolve();
        });
    }

    removeTraitTag = (e) => {
        const currentCategories = this.selected.monster.system.npcData.categories;
        const newCategories = currentCategories.filter(x => x.value !== e[0].data.value);
        const entity = this.selected.monster;

        return new Promise(async function(resolve, reject){
            await entity.update({ "system.npcData.categories": newCategories });

            await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                action: socketEvent.UpdateBestiary,
                data: { },
            });

            Hooks.callAll(socketEvent.UpdateBestiary, {});

            resolve();
        });
    };

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
        };

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
        };

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
            const entry = selected.monster.system.spells.entries[entryKey];
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
            const categories = npc.system.npcData.categories.filter(x => game.user.isGM || !x.hidden);
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

    async updateNpcCategoryHidden(event){
        await this.selected.monster.update({ "system.npcData.categories": this.selected.monster.system.npcData.categories.map(x => ({
            ...x,
            hidden: x.value === event.detail.data.value ? !x.hidden : x.hidden,
        })) });

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
                                                };
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

        await new BestiarySelection().render(true);
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
                        if(!elements.range?.value) errors.push('Range');

                        if(errors.length > 0) return { value: null, errors };

                        rangeOptions[Number.parseInt(elements.range.value)];
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
            new Y(element[0], tag.options);
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

        const data = isNPC(item) ? getNPCData(item) : getCreatureData(item);
        await bestiary.createEmbeddedDocuments("JournalEntryPage", [data]);

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

class RegisterHandlebarsHelpers {
    static registerHelpers(){
        Handlebars.registerHelper({
            PF2EBTNrKeys: this.nrKeys,
            PF2EBTMonsterValue: this.monsterValue,
            PF2EBTSlice: this.slice,
            PF2EBTCategoryClassTitle: this.categoryClassTitle,
            PF2EBTToggleContainer: this.toggleContainer,
            PF2EBTToggleContainerOverride: this.toggleContainerOverride,
            PF2EBTEach: this.each,
            PF2EBTFilter: this.filter,
            PF2EBTTertiary: this.tertiary,
            PF2EBTCaptialize: this.capitalize,
            PF2EBTSub: this.sub,
            PF2EBTEven: this.even,
        });
    };
    
    static nrKeys(obj, prop, context) {
        return obj ? (prop && context) ? Object.keys(obj).filter(x => obj[x][prop]).length : Object.keys(obj).length : 0;
    }

    static monsterValue(prop, flag, ignoreLabel, context){
        return prop.custom ?? (flag && !game.user.isGM && prop.category ? game.i18n.localize(prop.category) : (ignoreLabel && context ? prop.value : game.i18n.localize(prop.label) ?? prop.value));
    }

    static slice(value, length){
        return value.slice(0, length);
    }

    static toggleContainer(user, property){
        var containerClass = ' data-container';

        if(property.revealed || !user.isGM) containerClass = containerClass.concat(' revealed ');
        if(user.isGM){
            containerClass = containerClass.concat(' toggle-container');
            if(property.custom || property.fake) containerClass = containerClass.concat(' misinformation');
        }

        return containerClass;
    }

    static toggleContainerOverride(contrastRevealedState, property){
        if(!game.user.isGM || !contrastRevealedState.enabled) return '';

        if(property.revealed) return `background: ${contrastRevealedState.revealed}`;
        else return `background: ${contrastRevealedState.hidden}`;
    }

    static each(context, options){
        var ret = "";
        const keys = Object.keys(context);
        for(var i = 0; i < keys.length; i++){
            ret = ret + options.fn({ ...context[keys[i]], key: keys[i], index: i, length: keys.length });
        }
      
        return ret;
    }

    static filter(prop, fallback, leftMargin, context, use, op) {
        const options = op ?? use;
        var ret = "";
        var keys = Object.keys(context);
        
        if(op && !use){
            for(var i = 0; i < keys.length; i++){
                ret = ret + options.fn({ ...context[keys[i]], key: keys[i], last: i === keys.length-1, index: i, length: keys.length });
            }
          
            return ret; 
        }


        var filteredContext = {};
        for (var i = 0; i < keys.length; i++) {
            if(!prop || foundry.utils.getProperty(context[keys[i]], prop)){
                filteredContext[keys[i]] = context[keys[i]];
            }
        }

        keys = Object.keys(filteredContext);
        if(keys.length === 0) return `<div style="margin-left: ${leftMargin}px;">${fallback}</div>`;

        for(var i = 0; i < keys.length; i++){
            ret = ret + options.fn({ ...context[keys[i]], key: keys[i], last: i === keys.length-1, index: i, length: keys.length });
        }
      
        return ret;
    };

    static tertiary(a, b){
        return a ?? b;
    }

    static capitalize(text){
        return text.capitalize();
    }

    static sub(a, b){
        return a-b;
    }

    static even(a){
        return a%2;
    }
}

Hooks.once('init', () => {
    dataTypeSetup();
    registerGameSettings();
    registerKeyBindings();
    RegisterHandlebarsHelpers.registerHelpers();
    game.socket.on(`module.pf2e-bestiary-tracking`, handleSocketEvent);

    loadTemplates([
        "modules/pf2e-bestiary-tracking/templates/partials/monsterView.hbs",
        "modules/pf2e-bestiary-tracking/templates/partials/npcView.hbs",
        "modules/pf2e-bestiary-tracking/templates/partials/toggleTextSection.hbs",
        "modules/pf2e-bestiary-tracking/templates/partials/toggleEditorSection.hbs",
        "modules/pf2e-bestiary-tracking/templates/partials/toggleInputSection.hbs"
    ]);
});

Hooks.once("ready", async () => {
    game.modules.get('pf2e-bestiary-tracking').macros = macros;

    handleDataMigration();
});

Hooks.once("setup", () => {
    if(typeof libWrapper === 'function') {
        libWrapper.register('pf2e-bestiary-tracking', 'Token.prototype._onClickLeft2', function (wrapped, ...args) {
            const baseActor = args[0].currentTarget.document.baseActor;
            if(baseActor.type !== 'npc'){
                return wrapped(...args);
            }

            if(!game.user.isGM && (baseActor.ownership.default > 1 || (baseActor.ownership[game.user.id] && baseActor.ownership[game.user.id] > 1))){
                return wrapped(...args);
            }

            if(args[0].currentTarget.actor.isDead && !args[0].altKey){
                return wrapped(...args);
            }

            const openBestiary = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
            if(!openBestiary || (game.user.isGM && !args[0].altKey)) return wrapped(...args);
  
            const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
            const page = bestiary.pages.find(page => page.system.uuid === baseActor.uuid);

            if(!page)
            {
                ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"));
                return;
            }

            new PF2EBestiary(page).render(true);
        });
    }
});

Hooks.on("renderApplication", (_, html) => {
    const select = $(html).find('select');
    if(select.length === 0) return;

    const options = $(select).find('option');
    if(options.length === 0) return;

    const moduleSubTypes = ['pf2e-bestiary-tracking.creature', 'pf2e-bestiary-tracking.npc', 'pf2e-bestiary-tracking.hazard'];
    if(options.toArray().every(option => !moduleSubTypes.includes(option.value))) return;

    const filteredOptions = options.toArray().filter(x => !moduleSubTypes.includes(x.value));
    $(select).empty();
    filteredOptions.forEach(option => {
        $(select).append(option);
    });   
});

Hooks.on("combatStart", async (encounter) => {
    if (game.user.isGM) {
        const added = [];
        const exists = [];
        const automaticCombatSetting = await game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration');

        if (automaticCombatSetting === 1) {
            for (var combatant of encounter.combatants.filter(combatant => combatant?.actor?.type === 'npc')) {
                const successful = await PF2EBestiary.addMonster(combatant.token.baseActor);
                if (successful && combatant?.actor?.name) {
                    added.push(combatant.actor.name);
                } 
                else if (successful === false && combatant?.actor?.name){
                    exists.push(combatant.actor.name);
                }
            }

            exists?.length && ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary', { creatures: exists.join(', ') }));
            added?.length && ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AddedToBestiary', { creatures: added.join(', ') }));
        }
    }
});

Hooks.on("updateCombatant", async (combatant, changes) => {
    if(game.user.isGM){
        const automaticCombatSetting = await game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration');
        if(automaticCombatSetting === 2 && changes.defeated){
            const result = await PF2EBestiary.addMonster(combatant.token.baseActor);

            if(result) ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AddedToBestiary', { creatures: combatant.actor.name }));
            else ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary', { creatures: combatant.actor.name }));
        }
    }
});

Hooks.on("xdy-pf2e-workbench.tokenCreateMystification", token => { 
    if(!game.user.isGM) return true;

    if(game.settings.get('pf2e-bestiary-tracking', 'hide-token-names')){
        const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
        const actor = token.baseActor ?? token.actor;
        if(actor.uuid){
            const page = bestiary.pages.some(x => x.system.uuid === actor.uuid);
            if(page && (page.system.name.revealed)){
                return false;
            }
        }
    }

    return true;
});

Hooks.on("preCreateToken", async token => {
    if(!game.user.isGM || token.actor.type !== 'npc' || token.hasPlayerOwner) return;

    if(game.settings.get('pf2e-bestiary-tracking', 'hide-token-names')){
        const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
        const page = bestiary.pages.find(x => x.system.uuid === token.baseActor.uuid);
        if(page){
            if(page.system.name.revealed) {
                await token.updateSource({ name: page.system.name.custom ? page.system.name.custom : page.system.name.value });
                return;
            }
        }

        var workBenchMystifierUsed = game.modules.get("xdy-pf2e-workbench")?.active && game.settings.get('xdy-pf2e-workbench', 'npcMystifier'); 

        if(!workBenchMystifierUsed) await token.updateSource({ name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown") });
    }
});

Hooks.on("renderActorDirectory", async tab => {
    if(tab.id === 'actors'){
        const buttons = $(tab.element).find('.directory-footer.action-buttons');

        buttons.prepend(`
            <button id="pf2e-bestiary-tracker">
                <i class="fa-solid fa-spaghetti-monster-flying" />
                <span style="font-size: var(--font-size-14); font-family: var(--font-primary); font-weight: 400;">${game.i18n.localize("PF2EBestiary.Name")}</span>
            </button>`
        );

        $(buttons).find('#pf2e-bestiary-tracker')[0].onclick = () => {
            new PF2EBestiary().render(true);
        };
    }
});

Hooks.on("createChatMessage", async (message) => {
    if(game.user.isGM && message.flags.pf2e && Object.keys(message.flags.pf2e).length > 0){
        const { automaticReveal } = game.settings.get('pf2e-bestiary-tracking', 'chat-message-handling');
        if(automaticReveal){
            const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

            var page = null;
            var update = null;
            if(message.flags.pf2e.origin){
                // Attacks | Actions | Spells
                const actor = await fromUuid(message.flags.pf2e.origin.actor);
                if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return;


                const actorUuid = getBaseActor(actor).uuid;
                page = bestiary.pages.find(x => x.system.uuid === actorUuid);

                const item = await fromUuid(message.flags.pf2e.origin.uuid);
                if(page && item){
                    if(message.flags.pf2e.modifierName && automaticReveal.attacks){
                        if(page.system.attacks[item._id]){
                            update = { [`system.attacks.${item._id}.revealed`]: true };
                        }
                    }

                    if(message.flags.pf2e.origin.type === 'action' && automaticReveal.actions){
                        if(item.system.actionType.value === 'passive') update = { [`system.passives.${item._id}.revealed`]: true };
                        else update = { [`system.actions.${item._id}.revealed`]: true };
                    }

                    if(['spell', 'spell-cast'].includes(message.flags.pf2e.origin.type) && automaticReveal.spells){
                        const spellLevel = getSpellLevel(item, page.system.level.value);
                        update = {  
                            system: {
                                spells: {
                                    [`entries.${item.system.location.value}`]: {
                                        revealed: true,
                                        [`levels.${spellLevel}.spells.${item._id}.revealed`]: true,
                                    }
                                }
                            }
                        };
                    }
                }
            }
            else {
                 // Skills | Saving Throws
                 const actor = await fromUuid(`Actor.${message.flags.pf2e.context.actor}`);
                 if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return;


                 const actorUuid = getBaseActor(actor).uuid;
                 page = bestiary.pages.find(x => x.system.uuid === actorUuid);

                 if(page){
                     if(message.flags.pf2e.context.type === 'skill-check' && automaticReveal.skills)
                     {
                         if(page.system.skills[message.flags.pf2e.modifierName]){
                            update = { [`system.skills.${message.flags.pf2e.modifierName}.revealed`]: true };
                         }
                         
                     }
                     if(message.flags.pf2e.context.type ==='saving-throw' && automaticReveal.saves){
                         if(page.system.saves[message.flags.pf2e.modifierName]){
                            update = { [`system.saves.${message.flags.pf2e.modifierName}.revealed`]: true };
                         }
                     }
                 }
            }
            
            if(page && update){
                await page.update(update);

                await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                    action: socketEvent.UpdateBestiary,
                    data: { },
                });
        
                Hooks.callAll(socketEvent.UpdateBestiary, {});    
            }      
        }
    }
});

Hooks.on("getChatLogEntryContext", (_, options) => {
    options.push({
        name: game.i18n.localize("PF2EBestiary.Interactivity.RevealAbility"),
        icon: '<i class="fa-solid fa-eye"></i>',
        condition: li => {
            if(!game.user.isGM) return false;

            const message = game.messages.get(li.data().messageId);
            const actorUuid = message.flags.pf2e?.origin?.actor ?? null;            
            const actorId = message.flags.pf2e?.context?.actor ?? null;

            if(actorUuid || actorId){
                var actor = null;
                if(actorUuid){
                    actor = game.actors.find(x => x.uuid === actorUuid) ?? canvas.scene.tokens.find(x => x.actor.uuid === actorUuid).baseActor;
                }
                else actor = game.actors.find(x => x.id === actorId); 

                const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

                return Boolean(bestiary.pages.some(x => x.system.uuid === actor.uuid));
            }

            return false;
        },
        callback: async li => {
            const bestiary = game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
            const message = game.messages.get(li.data().messageId);
            const actorUuid = message.flags.pf2e?.origin?.actor ?? null;
            const actorId = message.flags.pf2e?.context?.actor ?? null;

            let update = null;
            let page = null;
            if(actorUuid){
                const actor = getBaseActor(await fromUuid(message.flags.pf2e?.origin?.actor));
                if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return;

                const rollOptions = message.flags.pf2e.origin.rollOptions;
                const itemIdSplit = rollOptions.find(option => option.includes('item:id'))?.split(':') ?? null;
                if(actor && itemIdSplit){
                    page = bestiary.pages.find(x => x.system.uuid === actor.uuid);
                    if(page){               
                        const item = actor.items.get(itemIdSplit[itemIdSplit.length-1]);
                        if(message.flags.pf2e.modifierName){
                            if(page.system.attacks[item._id]){
                                update = { [`system.attacks.${item._id}.revealed`]: true };
                            }
                        } else {
                            switch(item.type){
                                case 'action':
                                    if(item.system.actionType.value === 'passive') update = { [`system.passives.${item._id}.revealed`]: true };
                                    else update = { [`system.actions.${item._id}.revealed`]: true };
                                    
                                    break;
                                case 'spell':
                                case 'spell-cast':
                                    const spellLevel = getSpellLevel(item, page.system.level.value);
                                    update = {  
                                        system: {
                                            spells: {
                                                [`entries.${item.system.location.value}`]: {
                                                    revealed: true,
                                                    [`levels.${spellLevel}.spells.${item._id}.revealed`]: true,
                                                }
                                            }
                                        }
                                    };
                                    break;
                            }
                        }
                    }
                }
            }
            else if (actorId){
                // Skills | Saving Throws
                const actor = game.actors.find(x => x.id === actorId);
                if(actor.type !== 'npc' || actor.hasPlayerOwner) return;

                const actorUuid = getBaseActor(actor).uuid;
                page = bestiary.pages.find(x => x.system.uuid === actorUuid);
                if(page){
                    if(message.flags.pf2e.context.type === 'skill-check')
                    {
                        if(page.system.skills[message.flags.pf2e.modifierName]){
                            update = { [`system.skills.${message.flags.pf2e.modifierName}.revealed`]: true };
                        }
                        
                    }
                    if(message.flags.pf2e.context.type ==='saving-throw'){
                        update = { [`system.saves.${message.flags.pf2e.modifierName}.revealed`]: true };
                    }
                }
            }

            if(page && update){
                await page.update(update);

                await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                    action: socketEvent.UpdateBestiary,
                    data: { },
                });
        
                Hooks.callAll(socketEvent.UpdateBestiary, {});    
            }
        }
    });
});

Hooks.on('getDirectoryApplicationEntryContext', (_, buttons) => {
    buttons.push({
        name: game.i18n.localize("PF2EBestiary.Interactivity.RegisterInBestiary"),
        icon: '<i class="fa-solid fa-spaghetti-monster-flying"></i>',
        condition: li => {
            if(!game.user.isGM) return false;

            const actor = game.actors.get(li.data().documentId);
            if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return false;

            return !Boolean(game.journal.get(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking')).pages.find(page => page.system.uuid === actor.uuid));
        },
        callback: async li => {
            const actor = game.actors.get(li.data().documentId);  
            const successfull = await PF2EBestiary.addMonster(actor);
            if(successfull){
                ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AddedToBestiary', { creatures: actor.name }));
            }
            else if(successfull === false){
                ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary', { creatures: actor.name }));
            }    
        }
    });
});

// Hooks.on('renderJournalDirectory', (_, html) => {   
//     const folder = game.journal.directory.folders.find(folder => folder.name === bestiaryFolder);
//     if (folder)
//     {
//         const element = html.find(`.folder[data-folder-id="${folder.id}"]`);
//         if (element)
//         {
//             element.remove();
//         }
//     }
// });

Hooks.on('renderDependencyResolution', (dependencyResolution, html) => {
    if(dependencyResolution.object.id === 'pf2e-bestiary-tracking'){
        const lastText = $(html).find('form p').last();
        lastText.after(`
                <h2 style="margin-bottom: 4px; border-bottom: 0;">${game.i18n.format("PF2EBestiary.Macros.DeactivateModule.DependencyResolutionWarning", { name: `<strong>${game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Name")}</strong>`})}</h2>  
        `);
    }
});
//# sourceMappingURL=BestiaryTracking.js.map
