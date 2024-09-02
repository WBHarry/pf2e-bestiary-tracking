export const slugify = (name) => {
    return name.toLowerCase().replaceAll(' ', '-').replaceAll('.','');
}

export const getCreatureSize = (size) => {
    switch(size){
        case 'grg':
            return game.i18n.localize("PF2E.ActorSizeGargantuan");
        case 'huge':
            return game.i18n.localize("PF2E.ActorSizeHuge");
        case 'lg':
            return game.i18n.localize("PF2E.ActorSizeLarge");
        case 'med':
            return game.i18n.localize("PF2E.ActorSizeMedium");
        case 'sm':
            return game.i18n.localize("PF2E.ActorSizeSmall");
        case 'tiny':
            return game.i18n.localize("PF2E.ActorSizeTiny");
    }
};

export const getMultiplesString = (mutliple) => {
    return mutliple.reduce((acc, curr, index) => acc.concat(`${index !== 0 ? index === mutliple.length-1 ? ' or ' : ', ' : ''}${curr}`), '');
};

export const getIWRString = (base, isResistance) => { // Mangled. Wtf.
    const baseString = base.type;
    const doubleVsString = base.doubleVs?.length > 0 ? `double ${isResistance ? 'resistance' : 'weakness'} ${getMultiplesString(base.doubleVs)}` : '';
    const exceptionsString = base.exceptions?.length > 0 ? `except ${getMultiplesString(base.exceptions)}` : '';

    return `${baseString}${doubleVsString || exceptionsString ? ` (${exceptionsString}${doubleVsString ? ';' : ''}${doubleVsString})` : ''}`
}

export const getCreaturesTypes = (traits, onlyActive) => {
    const creatureTypes = getExpandedCreatureTypes();
    const types = Object.values(traits).reduce((acc, trait) => {
        const typeMatch = creatureTypes.find(x => x.value === trait.value);
        if(typeMatch) acc.push({key: typeMatch.value, revealed: trait.revealed, name: typeMatch.name});

        return acc;
    }, []);

    return onlyActive ? types.filter(x => x.revealed) : types; 
};

export const getExpandedCreatureTypes = () => {
    const allTypes = [
        ...Object.keys(CONFIG.PF2E.creatureTypes).map(type => ({ value: type, name: game.i18n.localize(CONFIG.PF2E.creatureTypes[type]), values: [] })),
        ...game.settings.get('pf2e-bestiary-tracking', 'additional-creature-types').map(type => ({ value: type.value, name: game.i18n.localize(type.name), values: [] })),
    ].sort((a, b) => {
        if(a.name < b.name) return -1;
        else if(a.name > b.name) return 1;
        else return 0;
    });
    
    // const types = { unknown: { name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown"), values: {} } };
    // allTypes.forEach(type => {
    //     types[type.value] = { name: type.name, values: {} }
    // });


    return [{ value: 'unknown', name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown"), values: [] }, ...allTypes];
};

export const getBaseActor = (actor) => {
    return actor.token ? actor.token.document ? actor.token.document.baseActor :  actor.token.baseActor : actor;
};

export const isNPC = (data) => {
    if(data.type === 'pf2e-bestiary-tracking.npc') return true;
    if(data.type === 'pf2e-bestiary-tracking.creature' || data.type === 'pf2e-bestiary-tracking.hazard') return false;

    const npcRegistration = game.settings.get('pf2e-bestiary-tracking', 'npc-registration');
    return npcRegistration === 0 ? data.system.traits.rarity === 'unique' : Object.values(data.system.traits.value).find(x => x.value ? x.value === 'npc' : x === 'npc');
};