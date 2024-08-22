import { optionalFields, revealedState } from "../data/bestiaryAppearance.js";
import Tagify from '@yaireo/tagify';

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryAppearanceMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        this.settings = {
            useTokenArt: game.settings.get('pf2e-bestiary-tracking', 'use-token-art'),
            additionalCreatureTypes: game.settings.get('pf2e-bestiary-tracking', 'additional-creature-types').map(x => ({ value: x.value, name: game.i18n.localize(x.name) })),
            contrastRevealedState: game.settings.get('pf2e-bestiary-tracking', 'contrast-revealed-state'),
            optionalFields: game.settings.get('pf2e-bestiary-tracking', 'optional-fields'),
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
            toggleOptionalFields: this.toggleOptionalFields,
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

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
  
        const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);
        const creatureTraits = Object.keys(CONFIG.PF2E.creatureTraits).filter(x => !creatureTypes.includes(x));

        const traitsInput = $(htmlElement).find('.traits-input')[0];
        const traitsTagify = new Tagify(traitsInput, {
          tagTextProp: "name",
          enforceWhitelist: true,
          whitelist : creatureTraits.map(key => { 
            const label = CONFIG.PF2E.creatureTraits[key];
            return { value: key, name: game.i18n.localize(label) };
          }),
          maxTags: 2,
          callbacks : { invalid: this.onAddTag }, 
          dropdown : {
            mapValueTo: 'name',
            searchKeys: ['name'],
            enabled: 0,              
            maxItems: 20,    
            closeOnSelect : true,
            highlightFirst: false,
          },
        });
        
        traitsTagify.on('change', this.creatureTraitSelect.bind(this));
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.settings = {
            ...this.settings,
            additionalCreatureTypes: this.settings.additionalCreatureTypes?.length ? this.settings.additionalCreatureTypes.map(x => x.name) : [],
        };

        return context;
    }

    static async updateData(event, element, formData){
        const data = foundry.utils.expandObject(formData.object);
        this.settings = {
            useTokenArt: data.useTokenArt,
            contrastRevealedState: data.contrastRevealedState,
            optionalFields: data.optionalFields,
        };
        this.render();
    }

    async creatureTraitSelect(event) {
        this.settings.additionalCreatureTypes  = event.detail?.value ? JSON.parse(event.detail.value) : [];
        this.render();
    }

    static async resetContrastRevealedState (){
        this.settings.contrastRevealedState = { ...revealedState };
        this.render();
    };

    static async toggleOptionalFields (){
        const keys = Object.keys(optionalFields);
        const enable = Object.values(this.settings.optionalFields).some(x => !x);
        this.settings.optionalFields = keys.reduce((acc, key) => {
            acc[key] = enable;
            return acc;
        }, {});
        
        this.render();
    };

    static async save(_){
        await game.settings.set('pf2e-bestiary-tracking', 'additional-creature-types', this.settings.additionalCreatureTypes.map(x => ({ value: x.value, name: CONFIG.PF2E.creatureTraits[x.value] })));
        await game.settings.set('pf2e-bestiary-tracking', 'contrast-revealed-state', this.settings.contrastRevealedState);
        await game.settings.set('pf2e-bestiary-tracking', 'use-token-art', this.settings.useTokenArt);
        await game.settings.set('pf2e-bestiary-tracking', 'optional-fields', this.settings.optionalFields);
        this.close();
    };
}