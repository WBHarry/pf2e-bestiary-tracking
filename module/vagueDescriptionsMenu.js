const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class VagueDescriptionsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        this.settings = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        this.helperSettings = {
            properties: {
                all: Object.keys(this.settings.properties).every(key => this.settings.properties[key]),
            },
            settings: {
                all: Object.keys(this.settings.settings).every(key => this.settings.settings[key])
            }
        };
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-vague-descriptions-menu',
        classes: ["bestiary-tracking", "bestiary-settings-menu"],
        position: { width: 'auto', height: 'auto' },
        actions: {
            toggleSection: this.toggleSection,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
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
        context.helperSettings = this.helperSettings;

        return context;
    }

    static async updateData(event, element, formData){
        const { settings } = foundry.utils.expandObject(formData.object);
        this.settings = foundry.utils.mergeObject(this.settings, settings)

        this.helperSettings = {
            properties: {
                all: Object.keys(this.settings.properties).every(key => this.settings.properties[key]),
            },
            settings: {
                all: Object.keys(this.settings.settings).every(key => this.settings.settings[key]),
            }
        };

        this.render();
    }

    static toggleSection(_, button){
        this.helperSettings[button.dataset.section].all = !this.helperSettings[button.dataset.section].all; 
        
        for(var key in this.settings[button.dataset.section]){
            this.settings[button.dataset.section][key] = this.helperSettings[button.dataset.section].all;
        }

        this.render();
    }

    static async save(options){
        await game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', this.settings);
        this.close();
    };
}