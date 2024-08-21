export const slugify = (name) => {
    return name.toLowerCase().replaceAll(' ', '-').replaceAll('.','');
}

export const getCreatureSize = (size) => {
    switch(size){
        case 'grg':
            return 'Gargantuan';
        case 'huge':
            return 'Huge';
        case 'lg':
            return 'Large';
        case 'med':
            return 'Medium';
        case 'sm':
            return 'Small';
        case 'tiny':
            return 'Tiny';
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
    const types = Object.keys(traits).reduce((acc, traitKey) => {
        if(Object.keys(CONFIG.PF2E.creatureTypes).includes(traitKey)) acc.push({key: traitKey, revealed: traits[traitKey].revealed, name: CONFIG.PF2E.creatureTypes[traitKey]});

        return acc;
    }, []);

    return onlyActive ? types.filter(x => x.revealed) : types; 
};