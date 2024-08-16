import { acTable, attributeTable, hpTable, rangeOptions, savingThrowPerceptionTable, weaknessTable } from "./statisticsData.js";

export const getCategoryLabel = (statisticsTable, level, save, short) => {
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

export const getCategoryFromIntervals = (intervalTable, level, value) => {
    const { range, values } = intervalTable;
    const tableRow = values[level];

    if(value > tableRow[range[0]].high) return getCategoryLabelValue(range, 'extreme');
    if(value < tableRow[range[range.length-1]].low) return getCategoryLabelValue(range, 'terrible');

    return getCategoryLabelValue(range, Object.keys(tableRow).find(x => value <= tableRow[x].high && value >= tableRow[x].low));
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

const getCategoryLabelValue = (range, category, short) => {
    while(!range.find(x => x === category)){
        const currentIndex = rangeOptions.indexOf(category);

        if(currentIndex > range.length-1) category = rangeOptions[currentIndex-1];
        else category = rangeOptions[currentIndex+1];
    }

    const { misinformation } = game.settings.get('pf2e-bestiary-tracking', 'bestiary-labels');
    switch(category){
        case 'extreme':
            return short ? misinformation.short.extreme : misinformation.full.extreme;
        case 'high':
            return short ? misinformation.short.high : misinformation.full.high;
        case 'moderate':
            return short ? misinformation.short.moderate : misinformation.full.moderate;
        case 'low':
            return short ? misinformation.short.low : misinformation.full.low;
        case 'terrible':
            return short ? misinformation.short.terrible : misinformation.full.terrible;
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

export const getCategoryRange = async (name) => {
    const { misinformation } = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-labels');
    switch(name){
        case 'ac':
            return acTable.range.map(category => misinformation.full[category]);
        case 'hp':
            return hpTable.range.map(category => misinformation.full[category]);
        case 'attributes':
            return attributeTable.range.map(category => misinformation.full[category]);
        case 'saves':
            return savingThrowPerceptionTable.range.map(category => misinformation.short[category]);
        case 'perception':
            return savingThrowPerceptionTable.range.map(category => misinformation.full[category]);
    }
}