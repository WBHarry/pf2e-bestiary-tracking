import { imageHideStates } from "../data/constants.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class AvatarMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(entity, resolve, reject) {
    super({});

    this.resolve = resolve;
    this.reject = reject;
    this.update = {
      system: {
        imageState: {
          hideState: entity.system.imageState.hideState,
          hideImage: entity.system.imageState.hideImage,
        },
      },
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Bestiary.AvatarMenu.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-avatar-menu",
    classes: ["avatar-menu"],
    position: { width: 400, height: "auto" },
    actions: {
      filePicker: this.filePicker,
      clearHideImage: this.clearHideImage,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-avatar-menu",
      template: "modules/pf2e-bestiary-tracking/templates/avatarMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.update = this.update;
    context.hideStates = imageHideStates;

    return context;
  }

  static async updateData(event, element, formData) {
    const updateData = foundry.utils.expandObject(formData.object);
    this.update = {
      ...updateData,
      system: {
        ...updateData.system,
        imageState: {
          ...updateData.system.imageState,
          hideImage: this.update.system.imageState.hideImage,
        },
      },
    };
    this.render();
  }

  static async filePicker(_, button) {
    new FilePicker({
      type: "image",
      title: "Image Select",
      callback: async (path) => {
        foundry.utils.setProperty(this.update, button.dataset.path, path);
        this.render();
      },
    }).render(true);
  }

  static clearHideImage() {
    this.update.system.imageState.hideImage = null;
    this.render();
  }

  close(options) {
    this.reject();
    super.close(options);
  }

  static async save() {
    this.resolve(this.update);
    this.close({});
  }
}
