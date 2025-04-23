import { getUsedBestiaryTypes, readTextFromFile } from "../scripts/helpers";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class ImportDialog extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(title, validation, resolve, reject) {
    super({});

    this.titleName = title;
    this.validation = validation;
    this.resolve = resolve;
    this.reject = reject;
  }

  get title() {
    return game.i18n.localize(this.titleName);
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-import-dialog",
    classes: ["bestiary-import-dialog"],
    position: { width: 400, height: "auto" },
    actions: {
      importFile: this.importFile,
    },
    form: { handler: this.updateData, submitOnChange: false },
  };

  static PARTS = {
    application: {
      id: "bestiary-import-dialog",
      template: "modules/pf2e-bestiary-tracking/templates/importDialog.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.fileData = this.fileData;
    context.importName = this.importName;

    return context;
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    htmlElement
      .querySelector(".file-path")
      .addEventListener("change", async (event) => {
        const nameElement = this.element.querySelector(".name-field");
        const importButton = this.element.querySelector(
          'button[data-action="importFile"]',
        );
        if (!event.currentTarget.value) {
          importButton.disabled = true;
          nameElement.disabled = true;
          nameElement.value = "";
        } else {
          const text = await readTextFromFile(event.currentTarget.files[0]);
          let jsonObject = null;
          try {
            jsonObject = JSON.parse(text);
          } catch {}

          const validationError = this.validation(jsonObject);
          if (validationError) {
            ui.notifications.error(validationError);
            event.currentTarget.value = "";
            return;
          }

          importButton.disabled = false;
          nameElement.disabled = false;
          nameElement.value = jsonObject.system?.name?.value ?? jsonObject.name;
        }
      });
  }

  close(options) {
    this.reject();
    super.close(options);
  }

  static async importFile() {
    const files = this.element.querySelector(".file-path").files;
    const name = this.element.querySelector(".name-field").value;

    if (!name) {
      ui.notifications.error(
        game.i18n.localize("PF2EBestiary.ImportDialog.MissingName"),
      );
      return;
    }

    await readTextFromFile(files[0]).then((json) => {
      const data = JSON.parse(json);
      data.name = name;
      if (data.system?.name?.value) {
        data.system.name.value = name;
      }

      this.resolve(data);
    });
    this.close();
  }

  //   static async updateData(event, element, formData) {
  //     const updateData = foundry.utils.expandObject(formData.object);
  //     this.fileData = updateData.fileData;
  //     this.importName = updateData.importName;

  //     this.render();
  //   }
}
