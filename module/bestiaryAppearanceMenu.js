import {
  bestiaryCategorySettings,
  revealedState,
} from "../data/bestiaryAppearance.js";
import { imageHideStates, imageSettings } from "../data/constants.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryAppearanceMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor() {
    super({});

    this.settings = {
      useTokenArt: game.settings.get("pf2e-bestiary-tracking", "use-token-art"),
      contrastRevealedState: game.settings.get(
        "pf2e-bestiary-tracking",
        "contrast-revealed-state",
      ),
      imageSettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "image-settings",
      ),
      categorySettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-category-settings",
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

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = this.settings;
    context.imageHideStates = imageHideStates;

    return context;
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.settings = {
      useTokenArt: data.useTokenArt,
      contrastRevealedState: data.contrastRevealedState,
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
      "image-settings",
      this.settings.imageSettings,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-category-settings",
      this.settings.categorySettings,
    );
    this.close();
  }
}
