export default class RegisterHandlebarsHelpers {
    static registerHelpers(){
        Handlebars.registerHelper({
            PF2EBTNrKeys: this.nrKeys,
            PF2EBTMonsterValue: this.monsterValue,
            PF2EBTCategoryClassTitle: this.categoryClassTitle,
            PF2EBTToggleContainer: this.toggleContainer,
            PF2EBTFilter: this.filter,
            PF2EBTTertiary: this.tertiary,
            PF2EBTCaptialize: this.capitalize,
        });
    };
    
    static nrKeys(obj) {
        return obj ? Object.keys(obj).length : 0;
    }

    static monsterValue(prop, flag){
        return prop.custom ?? (flag && !game.user.isGM && prop.category ? prop.category : prop.value);
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

    static toggleContainer(user, property){
        var containerClass = '';
        if(user.isGM) {
            containerClass = containerClass.concat(' toggle-container');
            if(property.revealed) containerClass = containerClass.concat(' revealed');
        }

        if(property.custom || property.fake) containerClass = containerClass.concat(' misinformation');

        return containerClass;
    }

    static filter(prop, fallback, context, options) {
        var ret = "";
      
        var keys = Object.keys(context);
        var filteredContext = {};
        for (var i = 0; i < keys.length; i++) {
            if(foundry.utils.getProperty(context[keys[i]], prop)){
                filteredContext[keys[i]] = context[keys[i]];
            }
        }

        keys = Object.keys(filteredContext);
        if(keys.length === 0) return fallback;

        for(var i = 0; i < keys.length; i++){
            ret = ret + options.fn({ ...context[keys[i]], last: i === keys.length-1 });
        }
      
        return ret;
    };

    static tertiary(a, b){
        return a ?? b;
    }

    static capitalize(text){
        return text.capitalize();
    }
}