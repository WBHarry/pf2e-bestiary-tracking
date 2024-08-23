export default class RegisterHandlebarsHelpers {
    static registerHelpers(){
        Handlebars.registerHelper({
            PF2EBTNrKeys: this.nrKeys,
            PF2EBTMonsterValue: this.monsterValue,
            PF2EBTCategoryClassTitle: this.categoryClassTitle,
            PF2EBTToggleContainer: this.toggleContainer,
            PF2EBTToggleContainerOverride: this.toggleContainerOverride,
            PF2EBTFilter: this.filter,
            PF2EBTTertiary: this.tertiary,
            PF2EBTCaptialize: this.capitalize,
            PF2EBTSub: this.sub,
            PF2EBTEven: this.even,
        });
    };
    
    static nrKeys(obj, prop, context) {
        return obj ? (prop && context) ? Object.keys(obj).filter(x => obj[x][prop]).length : Object.keys(obj).length : 0;
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
        var containerClass = ' data-container';

        if(property.revealed || !user.isGM) containerClass = containerClass.concat(' revealed ');
        if(user.isGM){
            containerClass = containerClass.concat(' toggle-container');
            if(property.custom || property.fake) containerClass = containerClass.concat(' misinformation');
        }

        return containerClass;
    }

    static toggleContainerOverride(contrastRevealedState, property){
        if(!game.user.isGM || !contrastRevealedState.enabled) return '';

        if(property.revealed) return `background: ${contrastRevealedState.revealed}`;
        else return `background: ${contrastRevealedState.hidden}`;
    }

    static filter(prop, fallback, leftMargin, context, options) {
        var ret = "";
      
        var keys = Object.keys(context);
        var filteredContext = {};
        for (var i = 0; i < keys.length; i++) {
            if(foundry.utils.getProperty(context[keys[i]], prop)){
                filteredContext[keys[i]] = context[keys[i]];
            }
        }

        keys = Object.keys(filteredContext);
        if(keys.length === 0) return `<div style="margin-left: ${leftMargin}px;">${fallback}</div>`;

        for(var i = 0; i < keys.length; i++){
            ret = ret + options.fn({ ...context[keys[i]], last: i === keys.length-1, index: i, length: keys.length });
        }
      
        return ret;
    };

    static tertiary(a, b){
        return a ?? b;
    }

    static capitalize(text){
        return text.capitalize();
    }

    static sub(a, b){
        return a-b;
    }

    static even(a){
        return a%2;
    }
}