import { getVagueDescriptionLabels } from "../data/bestiaryLabels.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryLabelsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        this.settings = game.settings.get('pf2e-bestiary-tracking', 'bestiary-labels');
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-labels-menu',
        classes: ["pf2e-bestiary-tracking", "bestiary-settings-menu"],
        position: { width: 'auto', height: 'auto' },
        actions: {
            resetSection: this.resetSection,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "bestiary-labels-menu",
            template: "modules/pf2e-bestiary-tracking/templates/bestiaryLabelsMenu.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.settings = this.settings;

        return context;
    }

    static async updateData(event, element, formData){
        this.settings = foundry.utils.expandObject(formData.object);
        this.render();
    }

    static async resetSection (_, button){
        await foundry.utils.setProperty(this.settings, button.dataset.path, getVagueDescriptionLabels()[button.dataset.property]);
        this.render();
    };

    static async save(options){
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-labels', this.settings);
        this.close();
    };
}