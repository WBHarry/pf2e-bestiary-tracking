import Tagify from "@yaireo/tagify";
import { standardCreatureTypes, toBestiaryOptions } from "../data/constants";
import {
  defeatedModes,
  dispositionIconModes,
  dispositionIconSize,
} from "../data/bestiaryContents";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryDisplayMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor() {
    super({});

    this.settings = {
      hideWelcome: game.settings.get("pf2e-bestiary-tracking", "hide-welcome"),
      hideTips: game.settings.get("pf2e-bestiary-tracking", "hide-tips"),
      sectionsPosition: game.settings.get(
        "pf2e-bestiary-tracking",
        "sections-position",
      ),
      hideAbilityDescriptions: game.settings.get(
        "pf2e-bestiary-tracking",
        "hide-ability-descriptions",
      ),
      usedCreatureTypes: game.settings
        .get("pf2e-bestiary-tracking", "used-creature-types")
        .map((x) => ({ value: x.value, name: game.i18n.localize(x.name) })),
      optionalFields: game.settings.get(
        "pf2e-bestiary-tracking",
        "optional-fields",
      ),
      detailedInformation: game.settings.get(
        "pf2e-bestiary-tracking",
        "detailed-information-toggles",
      ),
      usedSections: game.settings.get(
        "pf2e-bestiary-tracking",
        "used-sections",
      ),
      journalSettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-journal-settings",
      ),
      sheetSettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "sheet-settings",
      ),
      dispositionIcons: game.settings.get(
        "pf2e-bestiary-tracking",
        "disposition-icons",
      ),
      defeatedSetting: game.settings.get(
        "pf2e-bestiary-tracking",
        "defeated-setting",
      ),
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Menus.BestiaryDisplay.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-display-menu",
    classes: ["bestiary-settings-menu"],
    position: { width: 680, height: "auto" },
    actions: {
      resetCreatureTypes: this.resetCreatureTypes,
      resetJournalSettings: this.resetJournalSettings,
      resetDispositionIcons: this.resetDispositionIcons,
      toggleOptionalFields: this.toggleOptionalFields,
      toggleDetailedInformation: this.toggleDetailedInformation,
      toggleUsedSection: this.toggleUsedSection,
      filePicker: this.filePicker,
      dispositionPicker: this.dispositionPicker,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-display-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/bestiaryDisplayMenu.hbs",
    },
  };

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    htmlElement.querySelectorAll(".disposition-mode-select").forEach((event) =>
      event.addEventListener("change", async (event) => {
        this.settings.dispositionIcons.mode = Number.parseInt(
          event.currentTarget.value,
        );
        this.render();
      }),
    );

    htmlElement
      .querySelectorAll(".disposition-icon-size-select")
      .forEach((event) =>
        event.addEventListener("change", async (event) => {
          this.settings.dispositionIcons.iconSize = event.currentTarget.value;
          this.render();
        }),
      );

    htmlElement.querySelectorAll(".disposition-image-input").forEach((event) =>
      event.addEventListener("change", async (event) => {
        this.settings.dispositionIcons.icons[event.currentTarget.dataset.key] =
          {
            isIcon: true,
            image: event.currentTarget.value,
          };
        this.render();
      }),
    );

    const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);
    const creatureTraits = Object.keys(CONFIG.PF2E.creatureTraits).filter(
      (x) => !creatureTypes.includes(x),
    );

    const traitsInput = htmlElement.querySelector(".traits-input");
    if (traitsInput) {
      const traitsTagify = new Tagify(traitsInput, {
        tagTextProp: "name",
        enforceWhitelist: true,
        whitelist: [
          ...standardCreatureTypes().map((x) => ({
            value: x.value,
            name: game.i18n.localize(x.name),
            values: x.values,
          })),
          ...creatureTraits.map((key) => {
            const label = CONFIG.PF2E.creatureTraits[key];
            return { value: key, name: game.i18n.localize(label) };
          }),
        ].sort((a, b) => {
          if (a.name < b.name) return -1;
          else if (a.name > b.name) return 1;
          else return 0;
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
  }

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = {
      ...this.settings,
      usedCreatureTypes: this.settings.usedCreatureTypes?.length
        ? this.settings.usedCreatureTypes.map((x) => x.name)
        : [],
    };

    context.nrUsedSections = Object.values(this.settings.usedSections).filter(
      (x) => x,
    ).length;

    context.toBestiaryOptions = toBestiaryOptions;
    context.positionOptions = [
      {
        value: "top",
        name: "PF2EBestiary.Menus.BestiaryDisplay.PositionOptions.Top",
      },
      {
        value: "center",
        name: "PF2EBestiary.Menus.BestiaryDisplay.PositionOptions.Center",
      },
      {
        value: "bottom",
        name: "PF2EBestiary.Menus.BestiaryDisplay.PositionOptions.Bottom",
      },
    ];

    context.dispositionIconModes = dispositionIconModes;
    context.dispositionIconSize = dispositionIconSize;
    context.dispositionAttitudes = CONFIG.PF2E.attitude;
    context.defeatedModes = defeatedModes;

    return context;
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.settings = {
      usedCreatureTypes: this.settings.usedCreatureTypes,
      hideWelcome: data.hideWelcome,
      hideTips: data.hideTips,
      sectionsPosition: data.sectionsPosition,
      hideAbilityDescriptions: data.hideAbilityDescriptions,
      optionalFields: data.optionalFields,
      detailedInformation: { ...data.detailedInformation },
      usedSections: this.settings.usedSections,
      journalSettings: {
        ...data.journalSettings,
        image: this.settings.journalSettings.image,
      },
      sheetSettings: data.sheetSettings,
      dispositionIcons: this.settings.dispositionIcons,
      defeatedSetting: data.defeatedSetting,
    };
    this.render();
  }

  async creatureTraitSelect(event) {
    this.settings.usedCreatureTypes = event.detail?.value
      ? JSON.parse(event.detail.value)
      : [];
    this.render();
  }

  static async resetCreatureTypes() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize(
          "PF2EBestiary.Menus.BestiaryDisplay.UsedCreatureTypes.ResetTitle",
        ),
      },
      content: game.i18n.localize(
        "PF2EBestiary.Menus.BestiaryDisplay.UsedCreatureTypes.ResetText",
      ),
    });

    if (!confirmed) return;

    this.settings.usedCreatureTypes = standardCreatureTypes();
    this.render();
  }

  static async resetJournalSettings() {
    this.settings.journalSettings = {
      active: true,
      name: "PF2EBestiary.Bestiary.Welcome.GMsSection.RecallKnowledgeRulesTitle",
      image: "icons/sundries/books/book-embossed-bound-brown.webp",
    };
    this.render();
  }

  static async resetDispositionIcons() {
    this.settings.dispositionIcons = {
      useIcons: false,
      icons: {
        helpful: { isIcon: true, image: "fa-regular fa-face-smile-beam" },
        friendly: { isIcon: true, image: "fa-regular fa-face-smile" },
        indifferent: { isIcon: true, image: "fa-regular fa-face-meh" },
        unfriendly: { isIcon: true, image: "fa-regular fa-face-frown-open" },
        hostile: { isIcon: true, image: "fa-regular fa-face-angry" },
      },
    };
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

  static async dispositionPicker(_, button) {
    new FilePicker({
      type: "image",
      title: "Image Select",
      callback: async (path) => {
        this.settings.dispositionIcons.icons[button.dataset.key] = {
          isIcon: false,
          image: path,
        };
        this.render();
      },
    }).render(true);
  }

  static async save(_) {
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "hide-welcome",
      this.settings.hideWelcome,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "hide-tips",
      this.settings.hideTips,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "sections-position",
      this.settings.sectionsPosition,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "used-creature-types",
      this.settings.usedCreatureTypes.map((x) => ({
        value: x.value,
        name: CONFIG.PF2E.creatureTraits[x.value],
      })),
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
      "used-sections",
      this.settings.usedSections,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-journal-settings",
      this.settings.journalSettings,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "sheet-settings",
      this.settings.sheetSettings,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "disposition-icons",
      this.settings.dispositionIcons,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "defeated-setting",
      this.settings.defeatedSetting,
    );
    this.close();
  }
}
