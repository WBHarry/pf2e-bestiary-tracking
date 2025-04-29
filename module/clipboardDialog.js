const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class ClipboardDialog extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(text) {
    super({});

    this.text = text;
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.ClipboardDialog.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-subsystems-value-dialog",
    classes: ["pf2e-bestiary-tracking", "pf2e-clipboard"],
    position: { width: 500, height: "auto" },
    actions: {},
  };

  static PARTS = {
    main: {
      id: "main",
      template: "modules/pf2e-bestiary-tracking/templates/clipboard-dialog.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.text = this.text;

    return context;
  }
}
