const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class VagueDescriptionsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        this.settings = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
    }

    get title(){
        return 'Vague Descriptions'; 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        classes: ["bestiary-tracking", "vague-descriptions-menu"],
        position: { width: 'auto', height: 'auto' },
        actions: {
            close: this.close,
        },
        form: { handler: this.updateData, submitOnChange: false, submitOnClose: false },
    };
      
    static PARTS = {
        application: {
            id: "vague-descriptions-menu",
            template: "modules/pf2e-bestiary-tracking/templates/vagueDescriptionsMenu.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.settings = this.settings;

        return context;
    }

    static async updateData(event, element, formData){
        await game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', formData.object);
        this.close();
    }
}