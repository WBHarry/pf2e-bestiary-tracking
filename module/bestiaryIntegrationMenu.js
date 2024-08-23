import { revealedState } from "../data/bestiaryAppearance.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryIntegrationMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        this.settings = {
            creatureRegistration: {
                automaticCombatRegistration: game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration'),
                doubleClickOpen: game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen'),
            },
            chatMessageHandling: game.settings.get('pf2e-bestiary-tracking', 'chat-message-handling'),
        }

        this.combatRegistrationOptions = [
            { name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.Never'), value: 0 },
            { name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.StartOfCombat'), value: 1 },
            { name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.CreatureDefeated'), value: 2 }
        ];
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-integration-menu',
        classes: ["pf2e-bestiary-tracking", "bestiary-settings-menu"],
        position: { width: 680, height: 'auto' },
        actions: {
            toggleChatMessageHandlingFields: this.toggleChatMessageHandlingFields,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };
      
    static PARTS = {
        application: {
            id: "bestiary-integration-menu",
            template: "modules/pf2e-bestiary-tracking/templates/bestiaryIntegrationMenu.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);

        context.settings = this.settings;
        context.combatRegistrationOptions = this.combatRegistrationOptions;

        return context;
    }

    static async updateData(event, element, formData){
        const data = foundry.utils.expandObject(formData.object);
        this.settings = data.settings;
        this.render();
    }

    static async toggleChatMessageHandlingFields(){
        const keys = Object.keys(this.settings.chatMessageHandling.automaticReveal);
        const enable = Object.values(this.settings.chatMessageHandling.automaticReveal).some(x => !x);
        this.settings.chatMessageHandling.automaticReveal = keys.reduce((acc, key) => {
            acc[key] = enable;
            return acc;
        }, {});
        
        this.render();
    };

    static async save(_){
        await game.settings.set('pf2e-bestiary-tracking', 'automatic-combat-registration', this.settings.creatureRegistration.automaticCombatRegistration);
        await game.settings.set('pf2e-bestiary-tracking', 'doubleClickOpen', this.settings.creatureRegistration.doubleClickOpen);
        await game.settings.set('pf2e-bestiary-tracking', 'chat-message-handling', this.settings.chatMessageHandling);
        this.close();
    };
}