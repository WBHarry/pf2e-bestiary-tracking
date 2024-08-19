import { revealedState } from "../data/bestiaryAppearance.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryAppearanceMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        this.settings = {
            useTokenArt: game.settings.get('pf2e-bestiary-tracking', 'use-token-art'),
            contrastRevealedState: game.settings.get('pf2e-bestiary-tracking', 'contrast-revealed-state'),
        }
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-appearance-menu',
        classes: ["pf2e-bestiary-tracking", "bestiary-settings-menu"],
        position: { width: 'auto', height: 'auto' },
        actions: {
            resetContrastRevealedState: this.resetContrastRevealedState,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "bestiary-appearance-menu",
            template: "modules/pf2e-bestiary-tracking/templates/bestiaryAppearanceMenu.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.settings = this.settings;

        return context;
    }

    static async updateData(event, element, formData){
        const data = foundry.utils.expandObject(formData.object);
        this.settings = {
            useTokenArt: data.useTokenArt,
            contrastRevealedState: data.contrastRevealedState,
        };
        this.render();
    }

    static async resetContrastRevealedState (){
        const current = game.settings.get('pf2e-bestiary-tracking', 'contrast-revealed-state');
        this.settings.contrastRevealedState = { ...current, ...revealedState };
        this.render();
    };

    static async save(options){
        await game.settings.set('pf2e-bestiary-tracking', 'contrast-revealed-state', this.settings.contrastRevealedState);
        await game.settings.set('pf2e-bestiary-tracking', 'use-token-art', this.settings.useTokenArt);
        this.close();
    };
}