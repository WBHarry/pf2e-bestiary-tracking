import { revealedState } from "../data/bestiaryAppearance.js";
import { defaultRevealing, imageHideStates } from "../data/constants.js";
import { chunkArray } from "../scripts/helpers.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class BestiaryIntegrationMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor() {
    super({});

    this.settings = {
      creatureRegistration: {
        automaticCombatRegistration: game.settings.get(
          "pf2e-bestiary-tracking",
          "automatic-combat-registration",
        ),
        doubleClickOpen: game.settings.get(
          "pf2e-bestiary-tracking",
          "doubleClickOpen",
        ),
      },
      chatMessageHandling: game.settings.get(
        "pf2e-bestiary-tracking",
        "chat-message-handling",
      ),
      npcRegistration: game.settings.get(
        "pf2e-bestiary-tracking",
        "npc-registration",
      ),
      hiddenSettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "hidden-settings",
      ),
      defaultRevealed: game.settings.get(
        "pf2e-bestiary-tracking",
        "default-revealed",
      ),
    };

    this.combatRegistrationOptions = [
      {
        name: game.i18n.localize(
          "PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.Never",
        ),
        value: 0,
      },
      {
        name: game.i18n.localize(
          "PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.StartOfCombat",
        ),
        value: 1,
      },
      {
        name: game.i18n.localize(
          "PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.CreatureDefeated",
        ),
        value: 2,
      },
    ];

    this.npcRegistrationOptions = [
      {
        name: game.i18n.localize(
          "PF2EBestiary.Settings.NPCRegistation.Choices.Unique",
        ),
        value: 0,
      },
      {
        name: game.i18n.localize(
          "PF2EBestiary.Settings.NPCRegistation.Choices.Tag",
        ),
        value: 1,
      },
    ];
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Menus.BestiaryIntegration.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-integration-menu",
    classes: ["bestiary-settings-menu"],
    position: { width: 680, height: "auto" },
    actions: {
      toggleChatMessageHandlingFields: this.toggleChatMessageHandlingFields,
      toggleHiddenSettingsFields: this.toggleHiddenSettingsFields,
      toggleDefaultRevealedCreatures: this.toggleDefaultRevealedCreatures,
      toggleDefaultRevealedNPCs: this.toggleDefaultRevealedNPCs,
      toggleDefaultRevealedHazards: this.toggleDefaultRevealedHazards,
      toggleDefaultRevealedFields: this.toggleDefaultRevealedFields,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-integration-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/bestiaryIntegrationMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    const { defaultRevealed, ...rest } = this.settings;

    context.settings = rest;

    const creatures = Object.keys(defaultRevealed.creature)
      .map((propKey) => ({
        key: propKey,
        value: defaultRevealed.creature[propKey],
        name: game.i18n.localize(defaultRevealing.creature[propKey]),
      }))
      .sort(this.categorySort);
    const creatureChunks = chunkArray(
      creatures,
      Math.ceil(creatures.length / 3),
    );
    const npcs = Object.keys(defaultRevealed.npc)
      .map((propKey) => ({
        key: propKey,
        value: defaultRevealed.npc[propKey],
        name: game.i18n.localize(defaultRevealing.npc[propKey]),
      }))
      .sort(this.categorySort);
    const npcChunks = chunkArray(npcs, Math.ceil(npcs.length / 3));
    const hazards = Object.keys(defaultRevealed.hazard)
      .map((propKey) => ({
        key: propKey,
        value: defaultRevealed.hazard[propKey],
        name: game.i18n.localize(defaultRevealing.hazard[propKey]),
      }))
      .sort(this.categorySort);
    const hazardChunks = chunkArray(hazards, Math.ceil(hazards.length / 3));
    context.settings.defaultRevealed = {
      creature: {
        first: creatureChunks[0],
        second: creatureChunks[1],
        third: creatureChunks[2],
      },
      npc: { first: npcChunks[0], second: npcChunks[1], third: npcChunks[2] },
      hazard: {
        first: hazardChunks[0],
        second: hazardChunks[1],
        third: hazardChunks[2],
      },
    };

    context.combatRegistrationOptions = this.combatRegistrationOptions;
    context.npcRegistrationOptions = this.npcRegistrationOptions;

    return context;
  }

  categorySort(a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    else return 0;
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.settings = data.settings;
    this.render();
  }

  static async toggleChatMessageHandlingFields() {
    const keys = Object.keys(this.settings.chatMessageHandling.automaticReveal);
    const enable = Object.values(
      this.settings.chatMessageHandling.automaticReveal,
    ).some((x) => !x);
    this.settings.chatMessageHandling.automaticReveal = keys.reduce(
      (acc, key) => {
        acc[key] = enable;
        return acc;
      },
      {},
    );

    this.render();
  }

  static async toggleHiddenSettingsFields() {
    const keys = Object.keys(this.settings.hiddenSettings);
    const enable = Object.values(this.settings.hiddenSettings).some((x) => !x);
    this.settings.hiddenSettings = keys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.render();
  }

  static async toggleDefaultRevealedCreatures() {
    const keys = Object.keys(this.settings.defaultRevealed.creature);
    const enable = Object.values(this.settings.defaultRevealed.creature).some(
      (x) => !x,
    );

    this.settings.defaultRevealed.creature = keys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.render();
  }

  static async toggleDefaultRevealedNPCs() {
    const keys = Object.keys(this.settings.defaultRevealed.npc);
    const enable = Object.values(this.settings.defaultRevealed.npc).some(
      (x) => !x,
    );

    this.settings.defaultRevealed.npc = keys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.render();
  }

  static async toggleDefaultRevealedHazards() {
    const keys = Object.keys(this.settings.defaultRevealed.hazard);
    const enable = Object.values(this.settings.defaultRevealed.hazard).some(
      (x) => !x,
    );

    this.settings.defaultRevealed.hazard = keys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.render();
  }

  static async toggleDefaultRevealedFields() {
    const keys = Object.keys(this.settings.defaultRevealed.creature);
    const npcKeys = Object.keys(this.settings.defaultRevealed.npc);
    const hazardKeys = Object.keys(this.settings.defaultRevealed.hazard);
    const enable = Object.values(this.settings.defaultRevealed.creature)
      .concat(Object.values(this.settings.defaultRevealed.npc))
      .concat(Object.values(this.settings.defaultRevealed.hazard))
      .some((x) => !x);

    this.settings.defaultRevealed.creature = keys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.settings.defaultRevealed.npc = npcKeys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.settings.defaultRevealed.hazard = hazardKeys.reduce((acc, key) => {
      acc[key] = enable;
      return acc;
    }, {});

    this.render();
  }

  static async save(_) {
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "automatic-combat-registration",
      this.settings.creatureRegistration.automaticCombatRegistration,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "doubleClickOpen",
      this.settings.creatureRegistration.doubleClickOpen,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "chat-message-handling",
      this.settings.chatMessageHandling,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "npc-registration",
      this.settings.npcRegistration,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "hidden-settings",
      this.settings.hiddenSettings,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "default-revealed",
      this.settings.defaultRevealed,
    );
    this.close();
  }
}
