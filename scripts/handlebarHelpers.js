export default class RegisterHandlebarsHelpers {
    static registerHelpers(){
        Handlebars.registerHelper({
            PF2EBTNrKeys: this.nrKeys,
            PF2EBTMonsterValue: this.monsterValue,
            PF2EBTCategoryClassTitle: this.categoryClassTitle,
            PF2EBTTertiary: this.tertiary,
        });
    };
    
    static nrKeys(obj) {
        return obj ? Object.keys(obj).length : 0;
    }

    static monsterValue(prop, flag){
        return prop.custom ?? (flag && !game.user.isGM ? prop.category : prop.value);
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

    static tertiary(a, b){
        return a ?? b;
    }
}