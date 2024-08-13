export default class RegisterHandlebarsHelpers {
    static registerHelpers(){
        Handlebars.registerHelper({
            add: this.add,
            nrKeys: this.nrKeys,
            monsterValue: this.monsterValue,
            categoryClassTitle: this.categoryClassTitle,
        });
    };

    static add(a, b){
        const aNum = Number.parseInt(a);
        const bNum = Number.parseInt(b);
        return (Number.isNaN(aNum) ? 0 : aNum) + (Number.isNaN(bNum) ? 0 : bNum);
    }
    
    static nrKeys(obj) {
        return obj ? Object.keys(obj).length : 0;
    }

    static monsterValue(prop, flag){
        return flag && !game.user.isGM ? prop.category : prop.value;
    }

    static categoryClassTitle(classValue, type, useTitle){
        if(game.user.isGM || !useTitle) return '';

        switch(classValue){
            case 'category-high':
                return `Large ${type}`;
            case 'category-medium':
                return `Medium ${type}`;
            case 'category-low':
                return `Small ${type}`;
            default:
                return '';
        }
    }
}