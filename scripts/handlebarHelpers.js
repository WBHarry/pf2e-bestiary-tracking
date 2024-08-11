export default class RegisterHandlebarsHelpers {
    static registerHelpers(){
        Handlebars.registerHelper({
            add: this.add,
            includes: this.includes,
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
}