import {
  bestiaryCategorySettings,
  revealedState,
} from "../data/bestiaryAppearance.js";
import Tagify from "@yaireo/tagify";
import { imageHideStates, imageSettings } from "../data/constants.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryAppearanceMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor() {
    super({});

    this.settings = {
      useTokenArt: game.settings.get("pf2e-bestiary-tracking", "use-token-art"),
      hideAbilityDescriptions: game.settings.get(
        "pf2e-bestiary-tracking",
        "hide-ability-descriptions",
      ),
      additionalCreatureTypes: game.settings
        .get("pf2e-bestiary-tracking", "additional-creature-types")
        .map((x) => ({ value: x.value, name: game.i18n.localize(x.name) })),
      contrastRevealedState: game.settings.get(
        "pf2e-bestiary-tracking",
        "contrast-revealed-state",
      ),
      optionalFields: game.settings.get(
        "pf2e-bestiary-tracking",
        "optional-fields",
      ),
      imageSettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "image-settings",
      ),
      detailedInformation: game.settings.get(
        "pf2e-bestiary-tracking",
        "detailed-information-toggles",
      ),
      categorySettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-category-settings",
      ),
      usedSections: game.settings.get(
        "pf2e-bestiary-tracking",
        "used-sections",
      ),
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Menus.BestiaryAppearance.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-appearance-menu",
    classes: ["bestiary-settings-menu"],
    position: { width: 680, height: "auto" },
    actions: {
      resetContrastRevealedState: this.resetContrastRevealedState,
      resetCategorySettings: this.resetCategorySettings,
      resetImageSettings: this.resetImageSettings,
      toggleOptionalFields: this.toggleOptionalFields,
      toggleDetailedInformation: this.toggleDetailedInformation,
      toggleUsedSection: this.toggleUsedSection,
      filePicker: this.filePicker,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-appearance-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/bestiaryAppearanceMenu.hbs",
    },
  };

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);
    const creatureTraits = Object.keys(CONFIG.PF2E.creatureTraits).filter(
      (x) => !creatureTypes.includes(x),
    );

    const traitsInput = $(htmlElement).find(".traits-input")[0];
    const traitsTagify = new Tagify(traitsInput, {
      tagTextProp: "name",
      enforceWhitelist: true,
      whitelist: creatureTraits.map((key) => {
        const label = CONFIG.PF2E.creatureTraits[key];
        return { value: key, name: game.i18n.localize(label) };
      }),
      callbacks: { invalid: this.onAddTag },
      dropdown: {
        mapValueTo: "name",
        searchKeys: ["name"],
        enabled: 0,
        maxItems: 20,
        closeOnSelect: true,
        highlightFirst: false,
      },
    });

    traitsTagify.on("change", this.creatureTraitSelect.bind(this));
  }

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = {
      ...this.settings,
      additionalCreatureTypes: this.settings.additionalCreatureTypes?.length
        ? this.settings.additionalCreatureTypes.map((x) => x.name)
        : [],
    };

    context.imageHideStates = imageHideStates;
    context.nrUsedSections = Object.values(this.settings.usedSections).filter(
      (x) => x,
    ).length;

    return context;
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.settings = {
      additionalCreatureTypes: this.settings.additionalCreatureTypes,
      useTokenArt: data.useTokenArt,
      hideAbilityDescriptions: data.hideAbilityDescriptions,
      contrastRevealedState: data.contrastRevealedState,
      optionalFields: data.optionalFields,
      detailedInformation: { ...data.detailedInformation },
      categorySettings: {
        creature: {
          ...data.categorySettings.creature,
          image: this.settings.categorySettings.creature.image,
        },
        npc: {
          ...data.categorySettings.npc,
          image: this.settings.categorySettings.npc.image,
        },
        hazard: {
          ...data.categorySettings.hazard,
          image: this.settings.categorySettings.hazard.image,
        },
      },
      imageSettings: {
        creature: {
          ...data.imageSettings.creature,
          hideImage: this.settings.imageSettings.creature.hideImage,
        },
        npc: {
          ...data.imageSettings.npc,
          hideImage: this.settings.imageSettings.npc.hideImage,
        },
        hazard: {
          ...data.imageSettings.hazard,
          hideImage: this.settings.imageSettings.hazard.hideImage,
        },
      },
    };
    this.render();
  }

  async creatureTraitSelect(event) {
    this.settings.additionalCreatureTypes = event.detail?.value
      ? JSON.parse(event.detail.value)
      : [];
    this.render();
  }

  static async resetContrastRevealedState() {
    this.settings.contrastRevealedState = { ...revealedState };
    this.render();
  }

  static async resetCategorySettings() {
    this.settings.categorySettings = { ...bestiaryCategorySettings };
    this.render();
  }

  static async resetImageSettings() {
    this.settings.imageSettings = { ...imageSettings };
    this.render();
  }

  static async toggleOptionalFields() {
    const keys = Object.keys(this.settings.optionalFields);
    const enable = Object.values(this.settings.optionalFields).some((x) => !x);
    this.settings.optionalFields = keys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.render();
  }

  static async toggleDetailedInformation() {
    const keys = Object.keys(this.settings.detailedInformation);
    const enable = Object.values(this.settings.detailedInformation).some(
      (x) => !x,
    );
    this.settings.detailedInformation = keys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.render();
  }

  static async toggleUsedSection(_, button) {
    const usedSections = Object.values(this.settings.usedSections).filter(
      (x) => x,
    );
    if (
      usedSections.length > 1 ||
      !this.settings.usedSections[button.dataset.section]
    )
      this.settings.usedSections[button.dataset.section] =
        !this.settings.usedSections[button.dataset.section];

    this.render();
  }

  static async filePicker(_, button) {
    new FilePicker({
      type: "image",
      title: "Image Select",
      callback: async (path) => {
        foundry.utils.setProperty(this.settings, button.dataset.path, path);
        this.render();
      },
    }).render(true);
  }

  static async save(_) {
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "additional-creature-types",
      this.settings.additionalCreatureTypes.map((x) => ({
        value: x.value,
        name: CONFIG.PF2E.creatureTraits[x.value],
      })),
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "contrast-revealed-state",
      this.settings.contrastRevealedState,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "use-token-art",
      this.settings.useTokenArt,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "hide-ability-descriptions",
      this.settings.hideAbilityDescriptions,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "optional-fields",
      this.settings.optionalFields,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "detailed-information-toggles",
      this.settings.detailedInformation,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "image-settings",
      this.settings.imageSettings,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-category-settings",
      this.settings.categorySettings,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "used-sections",
      this.settings.usedSections,
    );
    this.close();
  }
}
