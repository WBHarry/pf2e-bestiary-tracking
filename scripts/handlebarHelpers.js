export default class RegisterHandlebarsHelpers {
    static registerHelpers(){
        Handlebars.registerHelper({
            add: this.add,
            includes: this.includes,
            nrKeys: this.nrKeys,
            monsterValue: this.monsterValue,
        });
    };

    static add(a, b){
        const aNum = Number.parseInt(a);
        const bNum = Number.parseInt(b);
        return (Number.isNaN(aNum) ? 0 : aNum) + (Number.isNaN(bNum) ? 0 : bNum);
    }

    static includes(array, item){
        return array?.includes(item);
    }
    
    static nrKeys(obj) {
        return obj ? Object.keys(obj).length : 0;
    }

    static monsterValue(prop, flag){
        return flag && !game.user.isGM ? prop.category : prop.value;
    }
}