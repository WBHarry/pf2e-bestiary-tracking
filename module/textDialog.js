const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class TextDialog extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(resolve, reject, initialText, label) {
    super({});

    this.resolve = resolve;
    this.reject = reject;
    this.initialText = initialText;
    this.label = label;
  }

  get title() {
    return this.label;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-text-dialog",
    classes: ["pf2e-bestiary-tracking", "bestiary-text-dialog"],
    position: { width: "560", height: "auto" },
    actions: {},
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    main: {
      id: "main",
      template: "modules/pf2e-bestiary-tracking/templates/textDialog.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.text = this.initialText;
    context.enrichedText =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        context.text,
      );

    return context;
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.resolve(data.text);
    this.close({ updateClose: true });
  }

  async close(options = {}) {
    const { updateClose, ...baseOptions } = options;
    if (!updateClose) {
      this.reject();
    }

    await super.close(baseOptions);
  }
}
