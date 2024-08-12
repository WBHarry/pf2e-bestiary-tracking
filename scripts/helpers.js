export const slugify = (name) => {
    return name.toLowerCase().replaceAll(' ', '-');
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