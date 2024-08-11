export const getCategoryLabel = (savingThrowTable, level, save) => {
    const tableRow = savingThrowTable[level];
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