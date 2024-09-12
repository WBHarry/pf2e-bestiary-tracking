import {
  bestiaryCategorySettings,
  optionalFields,
  revealedState,
} from "../data/bestiaryAppearance.js";
import { getVagueDescriptionLabels } from "../data/bestiaryLabels.js";
import { Creature } from "../data/creature.js";
import { NPC } from "../data/npc.js";
import { Hazard } from "../data/hazard.js";
import BestiaryAppearanceMenu from "../module/bestiaryAppearanceMenu.js";
import BestiaryIntegrationMenu from "../module/bestiaryIntegrationMenu.js";
import BestiaryLabelsMenu from "../module/bestiaryLabelsMenu.js";
import VagueDescriptionsMenu from "../module/vagueDescriptionsMenu.js";
import { newMigrateBestiary } from "./migrationHandler.js";
import { imageSettings } from "../data/constants.js";

export const currentVersion = "1.0.1";
export const bestiaryFolder = "BestiaryTracking Bestiares";

export const dataTypeSetup = () => {
  CONFIG.JournalEntryPage.dataModels = {
    ...CONFIG.JournalEntryPage.dataModels,
    "pf2e-bestiary-tracking.creature": Creature,
    "pf2e-bestiary-tracking.npc": NPC,
    "pf2e-bestiary-tracking.hazard": Hazard,
  };
};

export const registerKeyBindings = () => {
  game.keybindings.register("pf2e-bestiary-tracking", "open-bestiary", {
    name: game.i18n.localize("PF2EBestiary.KeyBindings.OpenBestiary.Name"),
    hint: game.i18n.localize("PF2EBestiary.KeyBindings.OpenBestiary.Hint"),
    uneditable: [],
    editable: [],
    onDown: () =>
      game.modules.get("pf2e-bestiary-tracking").macros.openBestiary(),
    onUp: () => {},
    restricted: false,
    reservedModifiers: [],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register("pf2e-bestiary-tracking", "show-monster", {
    name: game.i18n.localize("PF2EBestiary.KeyBindings.ShowMonster.Name"),
    hint: game.i18n.localize("PF2EBestiary.KeyBindings.ShowMonster.Hint"),
    uneditable: [],
    editable: [],
    onDown: () =>
      game.modules.get("pf2e-bestiary-tracking").macros.showMonster(),
    onUp: () => {},
    restricted: false,
    reservedModifiers: [],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register("pf2e-bestiary-tracking", "add-monster", {
    name: game.i18n.localize("PF2EBestiary.KeyBindings.AddMonster.Name"),
    hint: game.i18n.localize("PF2EBestiary.KeyBindings.AddMonster.Hint"),
    uneditable: [],
    editable: [],
    onDown: () =>
      game.modules.get("pf2e-bestiary-tracking").macros.addMonster(),
    onUp: () => {},
    restricted: true,
    reservedModifiers: [],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
};

export const registerGameSettings = () => {
  configSettings();
  generalNonConfigSettings();
  vagueDescriptions();
  bestiaryLabels();
  bestiaryAppearance();
  bestiaryIntegration();
};

const configSettings = () => {
  game.settings.register("pf2e-bestiary-tracking", "hide-token-names", {
    name: game.i18n.localize("PF2EBestiary.Settings.HideTokenNames.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.HideTokenNames.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      for (var token of canvas.tokens.placeables) {
        var name = token.document.baseActor.name;
        if (value) {
          const bestiary = game.journal.get(
            game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
          );
          const page = bestiary.pages.find(
            (x) => x.system.uuid === token.document.baseActor.uuid,
          );
          if (page) {
            name =
              page.system.name.revealed && page.system.name.custom
                ? page.system.name.custom
                : page.system.name.revealed && !page.system.name.custom
                  ? page.system.name.value
                  : !page.system.name.revealed
                    ? game.i18n.localize(
                        "PF2EBestiary.Bestiary.Miscellaneous.Unknown",
                      )
                    : name;
          }
        }

        await token.document.update({ name });
      }

      if (game.combat) {
        for (var combatant of game.combat.combatants) {
          var name = combatant.token.baseActor.name;
          if (value) {
            const bestiary = game.journal.get(
              game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
            );
            const page = bestiary.pages.find(
              (x) => x.system.uuid === combatant.token.baseActor.uuid,
            );
            if (page) {
              name =
                page.system.name.revealed && page.system.name.custom
                  ? page.system.name.custom
                  : page.system.name.revealed && !page.system.name.custom
                    ? page.system.name.value
                    : !page.system.name.revealed
                      ? game.i18n.localize(
                          "PF2EBestiary.Bestiary.Miscellaneous.Unknown",
                        )
                      : name;
            }
          }

          await combatant.update({ name: name });
        }
      }
    },
  });
};

const generalNonConfigSettings = () => {
  game.settings.register("pf2e-bestiary-tracking", "version", {
    name: game.i18n.localize("PF2EBestiary.Settings.Version.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.Version.Hint"),
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register("pf2e-bestiary-tracking", "bestiary-tracking", {
    name: game.i18n.localize("PF2EBestiary.Menus.Data.Name"),
    hint: game.i18n.localize("PF2EBestiary.Menus.Data.Hint"),
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register("pf2e-bestiary-tracking", "bestiary-tracking-folder", {
    name: game.i18n.localize("PF2EBestiary.Menus.Data.Name"),
    hint: game.i18n.localize("PF2EBestiary.Menus.Data.Hint"),
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register("pf2e-bestiary-tracking", "bestiary-layout", {
    name: game.i18n.localize("PF2EBestiary.Settings.Version.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.Version.Hint"),
    scope: "client",
    config: false,
    type: Object,
    default: {
      categories: {
        layout: 0,
        filter: {
          type: 0,
          direction: 0,
        },
      },
    },
  });
};

const vagueDescriptions = () => {
  game.settings.registerMenu("pf2e-bestiary-tracking", "vague-descriptions", {
    name: game.i18n.localize("PF2EBestiary.Menus.VagueDescriptions.Menu.Name"),
    label: game.i18n.localize(
      "PF2EBestiary.Menus.VagueDescriptions.Menu.Label",
    ),
    hint: game.i18n.localize("PF2EBestiary.Menus.VagueDescriptions.Menu.Hint"),
    icon: "fa-solid fa-eye-low-vision",
    type: VagueDescriptionsMenu,
    restricted: true,
  });

  game.settings.register("pf2e-bestiary-tracking", "vague-descriptions", {
    name: game.i18n.localize("PF2EBestiary.Menus.VagueDescriptions.Name"),
    hint: game.i18n.localize("PF2EBestiary.Menus.VagueDescriptions.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      properties: {
        ac: false,
        hp: false,
        hardness: false,
        resistances: false,
        weaknesses: false,
        saves: false,
        perception: false,
        speed: false,
        attributes: false,
        skills: false,
        attacks: false,
        damage: false,
        spells: false,
        initiative: false,
      },
      settings: {
        playerBased: false,
        misinformationOptions: false,
        gmNumeric: false,
      },
    },
  });
};

const bestiaryLabels = () => {
  game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-labels", {
    name: game.i18n.localize("PF2EBestiary.Menus.BestiaryLabels.Menu.Name"),
    label: game.i18n.localize("PF2EBestiary.Menus.BestiaryLabels.Menu.Label"),
    hint: game.i18n.localize("PF2EBestiary.Menus.BestiaryLabels.Menu.Hint"),
    icon: "fa-solid fa-tags",
    type: BestiaryLabelsMenu,
    restricted: true,
  });

  game.settings.register("pf2e-bestiary-tracking", "bestiary-labels", {
    name: game.i18n.localize("PF2EBestiary.Menus.BestiaryLabels.Name"),
    hint: game.i18n.localize("PF2EBestiary.Menus.BestiaryLabels.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      vagueDescriptions: {
        ...getVagueDescriptionLabels(),
      },
    },
  });
};

const bestiaryAppearance = () => {
  game.settings.register("pf2e-bestiary-tracking", "use-token-art", {
    name: game.i18n.localize("PF2EBestiary.Settings.UseTokenArt.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.UseTokenArt.Hint"),
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(
    "pf2e-bestiary-tracking",
    "hide-ability-descriptions",
    {
      name: game.i18n.localize(
        "PF2EBestiary.Settings.HideAbilityDescriptions.Name",
      ),
      hint: game.i18n.localize(
        "PF2EBestiary.Settings.HideAbilityDescriptions.Hint",
      ),
      scope: "world",
      config: false,
      type: Boolean,
      default: false,
    },
  );

  game.settings.register(
    "pf2e-bestiary-tracking",
    "detailed-information-toggles",
    {
      name: game.i18n.localize(
        "PF2EBestiary.Settings.DetailedInformation.Name",
      ),
      hint: game.i18n.localize(
        "PF2EBestiary.Settings.DetailedInformation.Hint",
      ),
      scope: "world",
      config: false,
      type: Object,
      default: {
        exceptionsDouble: false,
        attackTraits: false,
        damageTypes: false,
        abilityTraits: false,
      },
    },
  );

  game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-appearance", {
    name: game.i18n.localize("PF2EBestiary.Menus.BestiaryAppearance.Menu.Name"),
    label: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryAppearance.Menu.Label",
    ),
    hint: game.i18n.localize("PF2EBestiary.Menus.BestiaryAppearance.Menu.Hint"),
    icon: "fa-solid fa-sitemap",
    type: BestiaryAppearanceMenu,
    restricted: true,
  });

  game.settings.register(
    "pf2e-bestiary-tracking",
    "bestiary-category-settings",
    {
      name: game.i18n.localize(
        "PF2EBestiary.Settings.BestiaryCategorySettings.Name",
      ),
      hint: game.i18n.localize(
        "PF2EBestiary.Settings.BestiaryCategorySettings.Hint",
      ),
      scope: "world",
      config: false,
      type: Object,
      default: bestiaryCategorySettings,
    },
  );

  game.settings.register("pf2e-bestiary-tracking", "contrast-revealed-state", {
    name: game.i18n.localize("PF2EBestiary.Settings.ContrastRevealState.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.ContrastRevealState.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      ...revealedState,
    },
  });

  game.settings.register("pf2e-bestiary-tracking", "optional-fields", {
    name: game.i18n.localize("PF2EBestiary.Settings.OptionalFields.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.OptionalFields.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      ...optionalFields,
    },
  });

  game.settings.register(
    "pf2e-bestiary-tracking",
    "additional-creature-types",
    {
      name: game.i18n.localize(
        "PF2EBestiary.Settings.AdditionalCreatureTypes.Name",
      ),
      hint: game.i18n.localize(
        "PF2EBestiary.Settings.AdditionalCreatureTypes.Hint",
      ),
      scope: "world",
      config: false,
      type: Object,
      default: [],
    },
  );

  game.settings.register("pf2e-bestiary-tracking", "image-settings", {
    name: game.i18n.localize("PF2EBestiary.Settings.ImageSettings.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.ImageSettings.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: imageSettings,
  });
};

const bestiaryIntegration = () => {
  game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-integration", {
    name: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryIntegration.Menu.Name",
    ),
    label: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryIntegration.Menu.Label",
    ),
    hint: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryIntegration.Menu.Hint",
    ),
    icon: "fa-solid fa-feather",
    type: BestiaryIntegrationMenu,
    restricted: true,
  });

  game.settings.register(
    "pf2e-bestiary-tracking",
    "automatic-combat-registration",
    {
      name: game.i18n.localize(
        "PF2EBestiary.Settings.AutomaticCombatRegistration.Name",
      ),
      hint: game.i18n.localize(
        "PF2EBestiary.Settings.AutomaticCombatRegistration.Hint",
      ),
      scope: "world",
      config: false,
      type: Number,
      choices: {
        0: game.i18n.localize(
          "PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.Never",
        ),
        1: game.i18n.localize(
          "PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.StartOfCombat",
        ),
        2: game.i18n.localize(
          "PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.CreatureDefeated",
        ),
      },
      default: 0,
    },
  );

  game.settings.register("pf2e-bestiary-tracking", "doubleClickOpen", {
    name: game.i18n.localize("PF2EBestiary.Settings.DoubleClickOpen.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.DoubleClickOpen.Hint"),
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (!value || !game.user.isGM) return;

      const bestiary = await newMigrateBestiary(
        async (_, monster) => {
          const origin = await fromUuid(monster.uuid);

          await origin?.update({
            "ownership.default":
              origin.ownership.default > 1 ? origin.ownership.default : 1,
          });
        },
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );

      await game.settings.set(
        "pf2e-bestiary-tracking",
        "bestiary-tracking",
        bestiary,
      );
    },
  });

  game.settings.register("pf2e-bestiary-tracking", "chat-message-handling", {
    name: game.i18n.localize("PF2EBestiary.Settings.ChatMessageHandling.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.ChatMessageHandling.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      revealRightClick: false,
      automaticReveal: {
        saves: false,
        skills: false,
        attacks: false,
        actions: false,
        spells: false,
      },
    },
  });

  game.settings.register("pf2e-bestiary-tracking", "npc-registration", {
    name: game.i18n.localize("PF2EBestiary.Settings.NPCRegistation.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.NPCRegistation.Hint"),
    scope: "world",
    config: false,
    type: Number,
    choices: {
      0: game.i18n.localize(
        "PF2EBestiary.Settings.NPCRegistation.Choices.Unique",
      ),
      1: game.i18n.localize("PF2EBestiary.Settings.NPCRegistation.Choices.Tag"),
    },
    default: 0,
  });

  game.settings.register("pf2e-bestiary-tracking", "hidden-settings", {
    name: game.i18n.localize("PF2EBestiary.Settings.HiddenSettings.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.HiddenSettings.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      monster: false,
      npc: true,
      hazard: false,
      npcCategories: true,
    },
  });

  game.settings.register("pf2e-bestiary-tracking", "default-revealed", {
    name: game.i18n.localize("PF2EBestiary.Settings.DefaultRevealed.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.DefaultReaveled.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      creature: {
        name: false,
        traits: false,
        attributes: false,
        description: false,
        level: false,
        ac: false,
        hp: false,
        saves: false,
        iwr: false,
        speeds: false,
        perception: false,
        senses: false,
        skills: false,
        languages: false,
        attacks: false,
        abilities: false,
        spells: false,
      },
      npc: {
        appearance: false,
        personality: false,
        background: false,
        height: false,
        weight: false,
        // birthplace: false,
        premise: false,
      },
      hazard: {
        attacks: false,
        abilities: false,
        name: false,
        traits: false,
        description: false,
        level: false,
        ac: false,
        hp: false,
        hardness: false,
        disable: false,
        routine: false,
        initiative: false,
        stealth: false,
        reset: false,
        saves: false,
        iwr: false,
      },
    },
  });
};
