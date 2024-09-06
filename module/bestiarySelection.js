import { handleBestiaryMigration } from "../scripts/migrationHandler";
import { currentVersion } from "../scripts/setup";
import { socketEvent } from "../scripts/socket";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiarySelection extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor() {
    super({});
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.BestiarySelection.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-bestiary-selection",
    classes: ["bestiary-selection"],
    position: { width: 680, height: "auto" },
    actions: {
      createNewBestiary: this.createNewBestiary,
      editBestiary: this.editBestiary,
      deleteBestiary: this.deleteBestiary,
      swapBestiary: this.swapBestiary,
      importOldSaves: this.importOldSaves,
    },
    window: {
      controls: [
        {
          icon: "fa-solid fa-database",
          label: "PF2EBestiary.BestiarySelection.ImportOldSaves",
          action: "importOldSaves",
        },
      ],
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-appearance-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/bestiarySelection.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    const journals = game.journal.filter((x) =>
      Boolean(x.flags["pf2e-bestiary-tracking"]),
    );

    const bestiary = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-tracking",
    );
    context.bestiaries = journals
      .map((journal) => ({
        id: journal.id,
        name: journal.name,
        img: journal.getFlag("pf2e-bestiary-tracking", "image"),
        active: journal.id === bestiary,
      }))
      .sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        else return 0;
      });

    return context;
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.newBestiary = data.newBestiary;
    this.render();
  }

  static async createNewBestiary() {
    const folder = game.folders.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking-folder"),
    );
    if (!folder) {
      ui.notifications.error(
        game.i18n.localize("PF2EBestiary.BestiarySelection.MissingFolderError"),
      );
      return;
    }

    const journal = await JournalEntry.create({
      name: "New Bestiary",
      folder: folder.id,
    });
    await journal.setFlag(
      "pf2e-bestiary-tracking",
      "image",
      "systems/pf2e/assets/compendium-banner/green.webp",
    );
    await journal.setFlag("pf2e-bestiary-tracking", "npcCategories", []);
    await journal.setFlag("pf2e-bestiary-tracking", "version", currentVersion);

    this.render();
  }

  static async editBestiary(event, button) {
    event.stopPropagation();

    const bestiary = game.journal.get(button.dataset.bestiary);
    if (!bestiary) return;

    const content = `
            <div>
                ${
                  new foundry.data.fields.StringField({
                    label: game.i18n.localize(
                      "PF2EBestiary.BestiarySelection.BestiaryNameText",
                    ),
                    initial: bestiary.name,
                    required: true,
                  }).toFormGroup({}, { name: "name" }).outerHTML
                }
                ${
                  new foundry.data.fields.FilePathField({
                    label: game.i18n.localize(
                      "PF2EBestiary.BestiarySelection.BestiaryImageText",
                    ),
                    categories: ["IMAGE"],
                    initial: bestiary.getFlag(
                      "pf2e-bestiary-tracking",
                      "image",
                    ),
                  }).toFormGroup(
                    {},
                    {
                      name: "img",
                      value: bestiary.getFlag(
                        "pf2e-bestiary-tracking",
                        "image",
                      ),
                    },
                  ).outerHTML
                }
        </div>`;

    const doEdit = async (_, button) => {
      const name = button.form.elements.name.value;
      const img = button.form.elements.img.value
        ? button.form.elements.img.value
        : "systems/pf2e/assets/compendium-banner/green.webp";

      await bestiary.update({ name: name });
      await bestiary.setFlag("pf2e-bestiary-tracking", "image", img);
      this.render();
    };

    const dialog = new foundry.applications.api.DialogV2({
      buttons: [
        foundry.utils.mergeObject(
          {
            action: "ok",
            label: game.i18n.localize("PF2EBestiary.Miscellaneous.Confirm"),
            icon: "fa-solid fa-plus",
            default: true,
          },
          { callback: doEdit.bind(this) },
        ),
        foundry.utils.mergeObject({
          action: "cancel",
          label: game.i18n.localize("PF2EBestiary.Miscellaneous.Cancel"),
          icon: "fa-solid fa-x",
          default: true,
        }),
      ],
      content: content,
      rejectClose: false,
      modal: false,
      position: { width: 408 },
      window: {
        title: game.i18n.localize(
          "PF2EBestiary.BestiarySelection.EditDialogTitle",
        ),
      },
    });

    dialog.render(true);
  }

  static async deleteBestiary(_, button) {
    if (
      button.dataset.bestiary ===
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking")
    )
      return;

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize(
        "PF2EBestiary.BestiarySelection.DeleteBestiaryTitle",
      ),
      content: game.i18n.localize(
        "PF2EBestiary.BestiarySelection.DeleteBestiaryText",
      ),
      yes: () => true,
      no: () => false,
    });

    if (!confirmed) return;

    await game.journal.get(button.dataset.bestiary).delete();

    this.render();
  }

  static async swapBestiary(_, button) {
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-tracking",
      button.dataset.bestiary,
    );

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});

    this.render();
  }

  static async importOldSaves() {
    const callback = async (path) => {
      const oldSave = await fetch(path).then(async (response) => {
        try {
          const jsonObject = await response.json();
          if (jsonObject.monster) {
            return JSON.stringify(jsonObject);
          }

          return null;
        } catch {
          return null;
        }
      });
      if (!oldSave) {
        ui.notifications.error(
          game.i18n.localize("PF2EBestiary.BestiarySelection.OldSaveInvalid"),
        );
        return;
      }
      await handleBestiaryMigration(oldSave, true);

      ui.notifications.info(
        game.i18n.localize(
          "PF2EBestiary.BestiarySelection.OldSaveStateImported",
        ),
      );
      this.render();
    };

    new FilePicker({
      type: "json",
      title: "Test",
      callback: callback.bind(this),
    }).render(true);
  }
}
