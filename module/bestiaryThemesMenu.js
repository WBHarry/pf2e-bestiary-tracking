import { saveDataToFile, slugify } from "../scripts/helpers";
import { setupTheme } from "../scripts/setup";
import { socketEvent } from "../scripts/socket";
import {
  bestiaryThemes,
  defaultThemeChoices,
  extendedBestiaryThemeChoices,
  extendedBestiaryThemes,
} from "../styles/themes/themes";
import PF2EBestiary from "./bestiary";
import ImportDialog from "./importDialog";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryThemesMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor() {
    super({});

    const customThemesSetting = game.settings.get(
      "pf2e-bestiary-tracking",
      "custom-themes",
    );
    this.customThemes = Object.keys(customThemesSetting).reduce((acc, key) => {
      const theme = customThemesSetting[key];
      const backgroundImage =
        theme.props["--pf2e-bestiary-tracking-application-image"];
      acc[key] = {
        ...theme,
        props: {
          ...theme.props,
          ["--pf2e-bestiary-tracking-application-image"]:
            backgroundImage === "ignore"
              ? ""
              : backgroundImage.split("../../../")[1],
        },
      };
      return acc;
    }, {});
    this.selectedTheme = "";
    this.previewApp = false;
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Menus.BestiaryThemes.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-themes-menu",
    classes: ["bestiary-settings-menu"],
    position: { width: 680, height: "auto" },
    actions: {
      addTheme: this.addTheme,
      deleteTheme: this.deleteTheme,
      exportTheme: this.exportTheme,
      importTheme: this.importTheme,
      selectTheme: this.selectTheme,
      filePicker: this.filePicker,
      clearBackgroundImage: this.clearBackgroundImage,
      togglePreview: this.togglePreview,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-labels-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/bestiaryThemesMenu.hbs",
    },
  };

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    $(htmlElement)
      .find(".menu-title-button select")
      .on("change", async (event) => {
        this.customThemes[this.selectedTheme] = {
          name: this.customThemes[this.selectedTheme].name,
          props: this.getTemplateProps(
            extendedBestiaryThemes()[event.currentTarget.value].props,
          ),
        };
        this.render();
      });
    $(htmlElement)
      .find(".background-size-select")
      .on("change", async (event) => {
        this.customThemes[this.selectedTheme] = {
          name: this.customThemes[this.selectedTheme].name,
          props: {
            ...this.customThemes[this.selectedTheme].props,
            ["--pf2e-bestiary-tracking-application-image-size"]:
              event.currentTarget.value,
          },
        };
        this.render();
      });
    $(htmlElement)
      .find(".background-repeat-select")
      .on("change", async (event) => {
        this.customThemes[this.selectedTheme] = {
          name: this.customThemes[this.selectedTheme].name,
          props: {
            ...this.customThemes[this.selectedTheme].props,
            ["--pf2e-bestiary-tracking-application-image-repeat"]:
              event.currentTarget.value,
          },
        };
        this.render();
      });
    $(htmlElement)
      .find(".background-position-select")
      .on("change", async (event) => {
        this.customThemes[this.selectedTheme] = {
          name: this.customThemes[this.selectedTheme].name,
          props: {
            ...this.customThemes[this.selectedTheme].props,
            ["--pf2e-bestiary-tracking-application-image-position"]:
              event.currentTarget.value,
          },
        };
        this.render();
      });
  }

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.baseThemes = Object.keys(bestiaryThemes).map((x) => ({
      name: x,
      value: x,
    }));
    context.customThemes = this.customThemes;
    context.selectedTheme = this.selectedTheme;

    const extendedThemes = defaultThemeChoices();
    context.extendedThemes = Object.keys(extendedThemes).map((key) => ({
      value: key,
      name: extendedThemes[key],
    }));
    context.backgroundSizeOptions = [{ value: "cover", name: "cover" }];
    context.backgroundRepeatOptions = [
      { value: "repeat", name: "repeat" },
      { value: "round", name: "round" },
      { value: "initial", name: "initial" },
    ];
    context.backgroundPositionOptions = [
      { value: "left", name: "left" },
      { value: "center", name: "center" },
      { value: "right", name: "right" },
      { value: "top", name: "top" },
      { value: "bottom", name: "bottom" },
    ];

    return context;
  }

  static async updateData(event, element, formData) {
    const { customThemes } = foundry.utils.expandObject(formData.object);
    this.customThemes = foundry.utils.mergeObject(
      this.customThemes,
      customThemes,
    );
    if (this.previewApp) {
      BestiaryThemesMenu.updateTheme(
        this.customThemes[this.selectedTheme].props,
      );
      Hooks.callAll(socketEvent.UpdateBestiary, {});
    }

    this.render();
  }

  getTemplateProps(props) {
    const copyProps = foundry.utils.deepClone(props);
    copyProps["--pf2e-bestiary-tracking-application-image"] =
      copyProps["--pf2e-bestiary-tracking-application-image"] === "ignore"
        ? ""
        : copyProps["--pf2e-bestiary-tracking-application-image"].split(
            "../../../",
          )[1];
    return copyProps;
  }

  static getNextName = (customThemes) => {
    const unnamedNr = Object.values(customThemes).reduce((acc, x) => {
      const match = x.name.match(/^(?:NewTheme)(.*)$/);
      if (match.length > 1 && !Number.isNaN(match[1])) {
        const nr = Number.parseInt(match[1]);
        acc = acc ? Math.max(acc, nr) : nr;
      }

      return acc;
    }, null);

    return !unnamedNr ? "NewTheme1" : `NewTheme${unnamedNr + 1}`;
  };

  static addTheme() {
    const newTheme = BestiaryThemesMenu.getNextName(this.customThemes);
    const id = foundry.utils.randomID();
    this.customThemes[id] = {
      name: newTheme,
      props: {
        "--pf2e-bestiary-tracking-application": "#FFFFFF",
        "--pf2e-bestiary-tracking-primary": "#FFFFFF",
        "--pf2e-bestiary-tracking-primary-faded": "#FFFFFF",
        "--pf2e-bestiary-tracking-secondary": "#FFFFFF",
        "--pf2e-bestiary-tracking-tertiary": "#FFFFFF",
        "--pf2e-bestiary-tracking-primary-accent": "#FFFFFF",
        "--pf2e-bestiary-tracking-tertiary-accent": "#FFFFFF",
        "--pf2e-bestiary-tracking-primary-color": "#FFFFFF",
        "--pf2e-bestiary-tracking-text-shadow": "#000000",
        "--pf2e-bestiary-tracking-main-hover": "#FFFFFF",
        "--pf2e-bestiary-tracking-border": "#FFFFFF",
        "--pf2e-bestiary-tracking-secondary-border": "#FFFFFF",
        "--pf2e-bestiary-tracking-application-border": "#FFFFFF",
        "--pf2e-bestiary-tracking-icon": "#FFFFFF",
        "--pf2e-bestiary-tracking-secondary-icon": "#FFFFFF",
        "--pf2e-bestiary-tracking-application-image-size": "cover",
        "--pf2e-bestiary-tracking-application-image-repeat": "round",
      },
    };
    this.selectedTheme = id;
    this.render();
  }

  static deleteTheme(_, button) {
    this.customThemes = Object.keys(this.customThemes).reduce((acc, key) => {
      if (key !== button.dataset.theme) acc[key] = this.customThemes[key];
      return acc;
    }, {});
    if (button.dataset.theme === this.selectedTheme) this.selectedTheme = null;

    if (
      game.settings.get("pf2e-bestiary-tracking", "bestiary-theme") ===
      button.dataset.theme
    )
      game.settings.set(
        "pf2e-bestiary-tracking",
        "bestiary-theme",
        "coreLight",
      );

    this.render();
  }

  static exportTheme(_, button) {
    const theme = this.customThemes[button.dataset.theme];
    saveDataToFile(
      JSON.stringify(theme, null, 2),
      "text/json",
      `BestiaryTheme_${slugify(theme.name)}.json`,
    );
  }

  static importTheme() {
    new Promise((resolve, reject) => {
      new ImportDialog(
        "PF2EBestiary.Menus.BestiaryThemes.Import.Title",
        (jsonObject) => {
          if (!jsonObject || !jsonObject.props) {
            return game.i18n.localize(
              "PF2EBestiary.Menus.BestiaryThemes.Import.FaultyImport",
            );
          }

          return null;
        },
        resolve,
        reject,
      ).render(true);
    }).then((data) => {
      const match = data.name.match(/^(?:NewTheme)(.*)$/);
      if (match && match.length > 1) {
        data.name = BestiaryThemesMenu.getNextName(this.customThemes);
      }

      const id = foundry.utils.randomID();
      this.customThemes[id] = data;
      this.render();
    });
  }

  async importFromJSONData(data) {
    await this.bestiary.createEmbeddedDocuments("JournalEntryPage", [data]);

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static selectTheme(_, button) {
    this.selectedTheme = button.dataset.theme;
    this.render();
  }

  static async filePicker(_, button) {
    new FilePicker({
      type: "image",
      title: "Image Select",
      callback: async (path) => {
        foundry.utils.setProperty(this.customThemes, button.dataset.path, path);
        BestiaryThemesMenu.updateTheme(
          this.customThemes[this.selectedTheme].props,
        );
        this.render();
      },
    }).render(true);
  }

  static updateTheme(theme) {
    const updateTheme = foundry.utils.deepClone(theme);

    updateTheme["--pf2e-bestiary-tracking-application-image"] = updateTheme[
      "--pf2e-bestiary-tracking-application-image"
    ]
      ? `../../../${updateTheme["--pf2e-bestiary-tracking-application-image"]}`
      : "ignore";

    setupTheme(updateTheme);
  }

  static clearBackgroundImage() {
    this.customThemes[this.selectedTheme].props[
      "--pf2e-bestiary-tracking-application-image"
    ] = "";
    BestiaryThemesMenu.updateTheme(this.customThemes[this.selectedTheme].props);
    this.render();
  }

  static async togglePreview() {
    if (!this.previewApp) {
      BestiaryThemesMenu.updateTheme(
        this.customThemes[this.selectedTheme].props,
      );
      this.previewApp = new PF2EBestiary();
      await this.previewApp.render(true);
    } else {
      this.previewApp.close();
      this.previewApp = null;
    }

    this.render();
  }

  static async save(options) {
    const caculatedThemes = Object.keys(this.customThemes).reduce(
      (acc, key) => {
        const backgroundImage =
          this.customThemes[key].props[
            "--pf2e-bestiary-tracking-application-image"
          ];
        acc[key] = {
          ...this.customThemes[key],
          props: {
            ...this.customThemes[key].props,
            ["--pf2e-bestiary-tracking-application-image"]: backgroundImage
              ? `../../../${backgroundImage}`
              : "ignore",
          },
        };
        return acc;
      },
      {},
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "custom-themes",
      caculatedThemes,
    );

    const reload = await foundry.applications.api.DialogV2.confirm({
      id: "reload-world-confirm",
      modal: true,
      rejectClose: false,
      window: { title: "SETTINGS.ReloadPromptTitle" },
      position: { width: 400 },
      content: `<p>${game.i18n.localize("SETTINGS.ReloadPromptBody")}</p>`,
    });
    if (reload) {
      await game.socket.emit("reload");
      foundry.utils.debouncedReload();
    }

    this.close();
  }

  close = async (options) => {
    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.ResetBestiaryTheme,
      data: {},
    });

    Hooks.callAll(socketEvent.ResetBestiaryTheme, {});

    if (this.previewApp) {
      this.previewApp.close();
    }

    return super.close(options);
  };
}
