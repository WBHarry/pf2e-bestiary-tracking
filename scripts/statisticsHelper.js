import { weaknessTable } from "./statisticsData.js";

export const getCategoryLabel = (savingThrowTable, level, save) => {
    const tableRow = savingThrowTable[level];
    if(save > tableRow.extreme) return getCategoryLabelValue('extreme');
    if(save < tableRow.terrible) return getCategoryLabelValue('terrible');
  
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

    return getCategoryLabelValue(value.category);
};

export const getCategoryFromIntervals = (intervalTable, level, value) => {
    const tableRow = intervalTable[level];
    if(value > tableRow.high.high) return getCategoryLabelValue('high');
    if(value < tableRow.low.low) return getCategoryLabelValue('low');

    return getCategoryLabelValue(Object.keys(tableRow).find(x => value <= tableRow[x].high && value >= tableRow[x].low));
};

const derivedWeaknessTable = Object.keys(weaknessTable).reduce((acc, key) => {
    const baseValues = weaknessTable[key];
    acc[key] = { ...baseValues, moderate: Math.floor(baseValues.low + (baseValues.high - baseValues.low)/2) };

    return acc;
}, {});

export const getWeaknessCategoryClass = (level, value) => {
    const tableRow = derivedWeaknessTable[level];
    if(value > tableRow.high) return getCategoryClass('high');
    if(value < tableRow.low) return getCategoryClass('low');

    var tempValue = null;
    for(var category in tableRow) {
        const rowValue = tableRow[category];
        if(!tempValue || (Math.abs(rowValue - value) <= tempValue.diff)){
            tempValue = {  
                category: category,
                diff: Math.abs(rowValue - value),
            };
        }
    }

    return getCategoryClass(tempValue.category);
};

const getCategoryLabelValue = (category) => {
    switch(category){
        case 'extreme':
        case 'high':
            return 'High';
        case 'moderate':
            return 'Mod';
        case 'low':
        case 'terrible':
            return 'Low';
    }
};

const getCategoryClass = (category) => {
    switch(category){
        case 'extreme':
        case 'high':
            return 'category-high';
        case 'moderate':
            return 'category-medium';
        case 'low':
        case 'terrible':
            return 'category-low';
    }
}