import { imageHideStates } from "../data/constants.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class ActorLinkSettingsMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(resolve, reject) {
    super({});

    this.resolve = resolve;
    this.reject = reject;

    this.settings = {
      general: true,
      influence: true,
      notes: true,
      gm: true,
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.ActorLinkSettingsMenu.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-actor-link-settings-menu",
    classes: ["actor-link-settings-menu"],
    position: { width: 400, height: "auto" },
    actions: {
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-actor-link-settings-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/actorLinkSettingsMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = this.settings;

    return context;
  }

  static async updateData(event, element, formData) {
    const updateData = foundry.utils.expandObject(formData.object);
    this.settings = updateData.settings;

    this.render();
  }

  close(options) {
    this.reject();
    super.close(options);
  }

  static async save() {
    this.resolve(this.settings);
    this.close({});
  }
}
