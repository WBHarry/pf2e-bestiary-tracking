const savingThrowTable = {
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

export const getSavesWithApproximation = (level, saves) => {
    const tableRow = savingThrowTable[level.toString()];
    return {
        fortitude: { value: saves.fortitude.value, category: getSaveLabelFromTable(tableRow, saves.fortitude.value) },
        reflex: { value: saves.reflex.value, category: getSaveLabelFromTable(tableRow, saves.reflex.value) },
        will: { value: saves.will.value, category: getSaveLabelFromTable(tableRow, saves.will.value) },
    }

    // const sorted = Object.keys(saves).map(x => ({ value: saves[x]., category: getSaveLabelFromTable(tableRow, saves[x].value) }));
    // const fortitude = getSaveApproximation(level, saves.fortitude);
    // const reflex = getSaveApproximation(level, saves.reflex);
    // const will = getSaveApproximation(level, saves.will);

    // if(fortitude.diff === reflex.diff && fortitude.diff === will.diff) {
    //     return {
    //         fortitude: { value: fortitude.value, category: fortitude.category, },
    //         reflex: { value: reflex.value, category: reflex.category },
    //         will: { value: will.value, category: will.value },
    //     };
    // }

    // if(fortitude.diff === reflex.diff) {
    //     return {
            
    //     }
    // }
};

const getSaveLabelFromTable = (tableRow, save) => {
    if(save > tableRow.extreme) return getSaveLabel('extreme');
    if(save < tableRow.terrible) return getSaveLabel('terrible');
  
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

    return getSaveLabel(value.category);
};

const getSaveLabel = (category) => {
    switch(category){
        case 'extreme':
        case 'high':
            return 'High';
        case 'moderate':
            return 'Moderate';
        case 'low':
        case 'terrible':
            return 'Low';
    }
};