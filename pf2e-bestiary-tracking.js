import PF2EBestiary from "./module/bestiary.js";
import RegisterHandlebarsHelpers from "./scripts/handlebarHelpers.js";
import {
  bestiaryFolder,
  dataTypeSetup,
  registerGameSettings,
  registerKeyBindings,
  setupTheme,
} from "./scripts/setup.js";
import { handleSocketEvent, socketEvent } from "./scripts/socket.js";
import * as macros from "./scripts/macros.js";
import { handleDataMigration } from "./scripts/migrationHandler.js";
import {
  getBaseActor,
  getSpellLevel,
  isValidEntityType,
} from "./scripts/helpers.js";

async function bestiaryEnricher(match, _options) {
  const linkElement = document.createElement("span");

  //Currently unused, but useful if needed to be more specific
  // const bestiaryId = match[1];

  const bestiary = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );
  let page = bestiary.pages.find((x) => x.system.uuid === match[2]);
  if (!page) {
    for (var journal of game.journal) {
      const possiblePage = journal.pages.find(
        (x) =>
          [
            "pf2e-bestiary-tracking.creature",
            "pf2e-bestiary-tracking.npc",
            "pf2e-bestiary-tracking.hazard",
          ].includes(x.type) && x.system.uuid === match[2],
      );
      if (possiblePage) {
        page = possiblePage;
        break;
      }
    }
  }
  if (page) {
    linkElement.innerHTML = await renderTemplate(
      "modules/pf2e-bestiary-tracking/templates/bestiaryLink.hbs",
      {
        name: page.system.name.value,
        displayName: page.system.displayedName,
        isGM: game.user.isGM,
        page: page.id,
      },
    );

    return linkElement;
  }

  linkElement.innerHTML = await renderTemplate(
    "modules/pf2e-bestiary-tracking/templates/bestiaryLink.hbs",
    {
      invalid: true,
    },
  );

  return linkElement;
}

Hooks.once("init", () => {
  dataTypeSetup();
  registerGameSettings();
  registerKeyBindings();
  RegisterHandlebarsHelpers.registerHelpers();
  game.socket.on(`module.pf2e-bestiary-tracking`, handleSocketEvent);

  CONFIG.TextEditor.enrichers.push({
    pattern: /@Bestiary\[(.+)\|([^\]]+)\]/g,
    enricher: bestiaryEnricher,
  });

  loadTemplates([
    "modules/pf2e-bestiary-tracking/templates/partials/monsterView.hbs",
    "modules/pf2e-bestiary-tracking/templates/partials/npcView.hbs",
    "modules/pf2e-bestiary-tracking/templates/partials/hazardView.hbs",
    "modules/pf2e-bestiary-tracking/templates/partials/toggleTextSection.hbs",
    "modules/pf2e-bestiary-tracking/templates/partials/toggleEditorSection.hbs",
    "modules/pf2e-bestiary-tracking/templates/partials/toggleInputSection.hbs",
    "modules/pf2e-bestiary-tracking/templates/partials/toggleOptionsSection.hbs",
    "modules/pf2e-bestiary-tracking/templates/partials/pcPersonality.hbs",
  ]);
});

Hooks.once("ready", async () => {
  game.modules.get("pf2e-bestiary-tracking").macros = macros;

  handleDataMigration();
});

Hooks.once("setup", () => {
  setupTheme();

  if (typeof libWrapper === "function") {
    libWrapper.register(
      "pf2e-bestiary-tracking",
      "Token.prototype._onClickLeft2",
      function (wrapped, ...args) {
        const baseActor = args[0].currentTarget.document.baseActor;
        if (!isValidEntityType(baseActor.type)) {
          return wrapped(...args);
        }

        if (
          !game.user.isGM &&
          (baseActor.ownership.default > 1 ||
            (baseActor.ownership[game.user.id] &&
              baseActor.ownership[game.user.id] > 1))
        ) {
          return wrapped(...args);
        }

        if (args[0].currentTarget.actor.isDead && !args[0].altKey) {
          return wrapped(...args);
        }

        const openBestiary = game.settings.get(
          "pf2e-bestiary-tracking",
          "doubleClickOpen",
        );
        if (!openBestiary || (game.user.isGM && !args[0].altKey)) {
          return wrapped(...args);
        }

        const bestiary = game.journal.get(
          game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
        );
        const page = bestiary.pages.find(
          (page) => page.system.uuid === baseActor.uuid,
        );

        if (!page) {
          ui.notifications.info(
            game.i18n.localize(
              "PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary",
            ),
          );
          return;
        }

        new PF2EBestiary(page).render(true);
      },
    );
  }
});

Hooks.on("renderApplication", (_, html) => {
  const select = $(html).find("select");
  if (select.length === 0) return;

  const options = $(select).find("option");
  if (options.length === 0) return;

  const moduleSubTypes = [
    "pf2e-bestiary-tracking.creature",
    "pf2e-bestiary-tracking.npc",
    "pf2e-bestiary-tracking.hazard",
  ];
  if (
    options.toArray().every((option) => !moduleSubTypes.includes(option.value))
  )
    return;

  const filteredOptions = options
    .toArray()
    .filter((x) => !moduleSubTypes.includes(x.value));
  $(select).empty();
  filteredOptions.forEach((option) => {
    $(select).append(option);
  });
});

Hooks.on("combatStart", async (encounter) => {
  if (game.user.isGM) {
    const added = [];
    const exists = [];
    const automaticCombatSetting = await game.settings.get(
      "pf2e-bestiary-tracking",
      "automatic-combat-registration",
    );

    if (automaticCombatSetting === 1) {
      for (var combatant of encounter.combatants.filter((combatant) =>
        isValidEntityType(combatant?.actor?.type),
      )) {
        const successful = await PF2EBestiary.addMonster(
          combatant.token.baseActor,
        );
        if (successful && combatant?.actor?.name) {
          added.push(combatant.actor.name);
        } else if (successful === false && combatant?.actor?.name) {
          exists.push(combatant.actor.name);
        }
      }

      exists?.length &&
        ui.notifications.info(
          game.i18n.format(
            "PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary",
            { creatures: exists.join(", ") },
          ),
        );
      added?.length &&
        ui.notifications.info(
          game.i18n.format("PF2EBestiary.Bestiary.Info.AddedToBestiary", {
            creatures: added.join(", "),
          }),
        );
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }
});

Hooks.on("deleteCombatant", () => {
  Hooks.callAll(socketEvent.UpdateBestiary, {});
});

Hooks.on("updateCombatant", async (combatant, changes) => {
  if (game.user.isGM) {
    const automaticCombatSetting = await game.settings.get(
      "pf2e-bestiary-tracking",
      "automatic-combat-registration",
    );
    if (
      automaticCombatSetting === 2 &&
      changes.defeated &&
      isValidEntityType(combatant.token.baseActor.type)
    ) {
      const result = await PF2EBestiary.addMonster(combatant.token.baseActor);

      if (result)
        ui.notifications.info(
          game.i18n.format("PF2EBestiary.Bestiary.Info.AddedToBestiary", {
            creatures: combatant.actor.name,
          }),
        );
      else
        ui.notifications.info(
          game.i18n.format(
            "PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary",
            { creatures: combatant.actor.name },
          ),
        );
    }
  }
});

Hooks.on("xdy-pf2e-workbench.tokenCreateMystification", (token) => {
  if (!game.user.isGM) return true;

  if (game.settings.get("pf2e-bestiary-tracking", "hide-token-names")) {
    const bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );
    const actor = token.baseActor ?? token.actor;
    if (actor.uuid) {
      const page = bestiary.pages.find((x) => x.system.uuid === actor.uuid);
      if (page && page.system.name.revealed) {
        return false;
      }
    }
  }

  return true;
});

Hooks.on("preCreateToken", async (token) => {
  if (
    !game.user.isGM ||
    (token.actor.type !== "npc" && token.actor.type !== "hazard") ||
    token.hasPlayerOwner
  )
    return;

  if (game.settings.get("pf2e-bestiary-tracking", "hide-token-names")) {
    const bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );
    const page = bestiary.pages.find(
      (x) => x.system.uuid === token.baseActor.uuid,
    );
    if (page) {
      if (page.system.name.revealed) {
        await token.updateSource({
          name: page.system.name.custom
            ? page.system.name.custom
            : page.system.name.value,
        });
        return;
      }
    }

    var workBenchMystifierUsed =
      game.modules.get("xdy-pf2e-workbench")?.active &&
      game.settings.get("xdy-pf2e-workbench", "npcMystifier");

    if (!workBenchMystifierUsed)
      await token.updateSource({
        name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown"),
      });
  }
});

Hooks.on("renderActorDirectory", async (tab, html) => {
  if (tab.id === "actors") {
    if (!game.user.isGM) {
      // Hazards currently not sorted out of Actors tab when they have limited view. Remove this if the system starts to handle it.
      const actorElements = html.find(".document.actor");
      for (var element of actorElements) {
        var actor = game.actors.get(element.dataset.documentId);
        if (
          actor.type === "hazard" &&
          (actor.ownership.default === 1 || actor.ownership[game.user.id] === 1)
        ) {
          $(element).remove();
        }
      }
    }

    const buttons = $(tab.element).find(".directory-footer.action-buttons");
    buttons.prepend(`
            <button id="pf2e-bestiary-tracker">
                <i class="fa-solid fa-spaghetti-monster-flying" />
                <span style="font-size: var(--font-size-14); font-family: var(--font-primary); font-weight: 400;">${game.i18n.localize("PF2EBestiary.Name")}</span>
            </button>`);

    $(buttons).find("#pf2e-bestiary-tracker")[0].onclick = () => {
      new PF2EBestiary().render(true);
    };
  }
});

Hooks.on("createChatMessage", async (message) => {
  if (
    game.user.isGM &&
    message.flags.pf2e &&
    Object.keys(message.flags.pf2e).length > 0
  ) {
    const { automaticReveal } = game.settings.get(
      "pf2e-bestiary-tracking",
      "chat-message-handling",
    );
    if (automaticReveal) {
      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );

      var page = null;
      var update = null;
      if (message.flags.pf2e.origin) {
        // Attacks | Actions | Spells
        const actor = await fromUuid(message.flags.pf2e.origin.actor);
        if (!actor || !isValidEntityType(actor.type) || actor.hasPlayerOwner)
          return;

        const actorUuid = getBaseActor(actor).uuid;
        page = bestiary.pages.find((x) => x.system.uuid === actorUuid);

        const item = await fromUuid(message.flags.pf2e.origin.uuid);
        if (page && item) {
          if (message.flags.pf2e.modifierName && automaticReveal.attacks) {
            if (page.system.attacks[item._id]) {
              update = { [`system.attacks.${item._id}.revealed`]: true };
            }
          }

          if (
            message.flags.pf2e.origin.type === "action" &&
            automaticReveal.actions
          ) {
            if (item.system.actionType.value === "passive")
              update = { [`system.passives.${item._id}.revealed`]: true };
            else update = { [`system.actions.${item._id}.revealed`]: true };
          }

          if (
            ["spell", "spell-cast"].includes(message.flags.pf2e.origin.type) &&
            automaticReveal.spells
          ) {
            const spellLevel = getSpellLevel(item, page.system.level.value);
            update = {
              system: {
                spells: {
                  [`entries.${item.system.location.value}`]: {
                    revealed: true,
                    [`levels.${spellLevel}.spells.${item._id}.revealed`]: true,
                  },
                },
              },
            };
          }
        }
      } else {
        // Skills | Saving Throws
        const actor = await fromUuid(
          `Actor.${message.flags.pf2e.context.actor}`,
        );
        if (!actor || !isValidEntityType(actor.type) || actor.hasPlayerOwner)
          return;

        const actorUuid = getBaseActor(actor).uuid;
        page = bestiary.pages.find((x) => x.system.uuid === actorUuid);

        if (page) {
          if (
            message.flags.pf2e.context.type === "skill-check" &&
            automaticReveal.skills
          ) {
            if (page.system.skills[message.flags.pf2e.modifierName]) {
              update = {
                [`system.skills.${message.flags.pf2e.modifierName}.revealed`]: true,
              };
            }
          }
          if (
            message.flags.pf2e.context.type === "saving-throw" &&
            automaticReveal.saves
          ) {
            if (page.system.saves[message.flags.pf2e.modifierName]) {
              update = {
                [`system.saves.${message.flags.pf2e.modifierName}.revealed`]: true,
              };
            }
          }
        }
      }

      if (page && update) {
        await page.update(update);

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
      }
    }
  }
});

Hooks.on("getChatLogEntryContext", (_, options) => {
  options.push({
    name: game.i18n.localize("PF2EBestiary.Interactivity.RevealAbility"),
    icon: '<i class="fa-solid fa-eye"></i>',
    condition: (li) => {
      if (!game.user.isGM) return false;

      const message = game.messages.get(li.data().messageId);
      const actorUuid = message.flags.pf2e?.origin?.actor ?? null;
      const actorId = message.flags.pf2e?.context?.actor ?? null;

      if (actorUuid || actorId) {
        var actor = null;
        if (actorUuid) {
          actor =
            game.actors.find((x) => x.uuid === actorUuid) ??
            canvas.scene.tokens.find((x) => x.actor.uuid === actorUuid)
              .baseActor;
        } else actor = game.actors.find((x) => x.id === actorId);

        const bestiary = game.journal.get(
          game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
        );

        return Boolean(
          bestiary.pages.some((x) => x.system.uuid === actor.uuid),
        );
      }

      return false;
    },
    callback: async (li) => {
      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );
      const message = game.messages.get(li.data().messageId);
      const actorUuid = message.flags.pf2e?.origin?.actor ?? null;
      const actorId = message.flags.pf2e?.context?.actor ?? null;

      let update = null;
      let page = null;
      if (actorUuid) {
        const actor = getBaseActor(
          await fromUuid(message.flags.pf2e?.origin?.actor),
        );
        if (!actor || !isValidEntityType(actor.type) || actor.hasPlayerOwner)
          return;

        const rollOptions = message.flags.pf2e.origin.rollOptions;
        const itemIdSplit =
          rollOptions
            .find((option) => option.includes("item:id"))
            ?.split(":") ?? null;
        if (actor && itemIdSplit) {
          page = bestiary.pages.find((x) => x.system.uuid === actor.uuid);
          if (page) {
            const item = actor.items.get(itemIdSplit[itemIdSplit.length - 1]);
            if (message.flags.pf2e.modifierName) {
              if (page.system.attacks[item._id]) {
                update = { [`system.attacks.${item._id}.revealed`]: true };
              }
            } else {
              switch (item.type) {
                case "action":
                  if (
                    item.system.actionType.value === "passive" &&
                    actor.type !== "hazard"
                  )
                    update = { [`system.passives.${item._id}.revealed`]: true };
                  else
                    update = { [`system.actions.${item._id}.revealed`]: true };

                  break;
                case "spell":
                case "spell-cast":
                  const spellLevel = getSpellLevel(
                    item,
                    page.system.level.value,
                  );
                  update = {
                    system: {
                      spells: {
                        [`entries.${item.system.location.value}`]: {
                          revealed: true,
                          [`levels.${spellLevel}.spells.${item._id}.revealed`]: true,
                        },
                      },
                    },
                  };
                  break;
              }
            }
          }
        }
      } else if (actorId) {
        // Skills | Saving Throws
        const actor = game.actors.find((x) => x.id === actorId);
        if (!isValidEntityType(actor.type) || actor.hasPlayerOwner) return;

        const actorUuid = getBaseActor(actor).uuid;
        page = bestiary.pages.find((x) => x.system.uuid === actorUuid);
        if (page) {
          if (message.flags.pf2e.context.type === "skill-check") {
            if (page.system.skills[message.flags.pf2e.modifierName]) {
              update = {
                [`system.skills.${message.flags.pf2e.modifierName}.revealed`]: true,
              };
            }
          }
          if (message.flags.pf2e.context.type === "saving-throw") {
            update = {
              [`system.saves.${message.flags.pf2e.modifierName}.revealed`]: true,
            };
          }
        }
      }

      if (page && update) {
        await page.update(update);

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
      }
    },
  });
});

Hooks.on("getDirectoryApplicationEntryContext", (_, buttons) => {
  buttons.push({
    name: game.i18n.localize("PF2EBestiary.Interactivity.RegisterInBestiary"),
    icon: '<i class="fa-solid fa-spaghetti-monster-flying"></i>',
    condition: (li) => {
      if (!game.user.isGM) return false;

      const actor = game.actors.get(li.data().documentId);
      if (!actor || !isValidEntityType(actor.type) || actor.hasPlayerOwner)
        return false;

      return !Boolean(
        game.journal
          .get(game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"))
          .pages.find((page) => page.system.uuid === actor.uuid),
      );
    },
    callback: async (li) => {
      const actor = game.actors.get(li.data().documentId);
      const successfull = await PF2EBestiary.addMonster(actor);
      if (successfull) {
        ui.notifications.info(
          game.i18n.format("PF2EBestiary.Bestiary.Info.AddedToBestiary", {
            creatures: actor.name,
          }),
        );
      } else if (successfull === false) {
        ui.notifications.info(
          game.i18n.format(
            "PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary",
            { creatures: actor.name },
          ),
        );
      }
    },
  });
});

Hooks.on("renderJournalDirectory", (_, html) => {
  const folder = game.journal.directory.folders.find(
    (folder) => folder.name === bestiaryFolder,
  );
  if (folder) {
    const element = html.find(`.folder[data-folder-id="${folder.id}"]`);
    if (element) {
      element.remove();
    }
  }
});

Hooks.on("renderDependencyResolution", (dependencyResolution, html) => {
  if (dependencyResolution.object.id === "pf2e-bestiary-tracking") {
    const lastText = $(html).find("form p").last();
    lastText.after(`
                <h2 style="margin-bottom: 4px; border-bottom: 0;">${game.i18n.format("PF2EBestiary.Macros.DeactivateModule.DependencyResolutionWarning", { name: `<strong>${game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Name")}</strong>` })}</h2>  
        `);
  }
});

Hooks.on("renderImagePopout", (app, html) => {
  const bestiary = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );
  const existingPage = bestiary.pages.find(
    (x) => x.system.uuid === app.options.uuid,
  );
  if (existingPage) {
    const hideState = existingPage.system.imageState.hideState;
    const image = $(html).find("figure img");
    image.addClass(RegisterHandlebarsHelpers.imageState(game.user, hideState));

    if (existingPage.system.imageState.hideState === 2) {
      const imageSettings = game.settings.get(
        "pf2e-bestiary-tracking",
        "image-settings",
      );

      const hideImage =
        existingPage.type === "pf2e-bestiary-tracking.creature"
          ? imageSettings.creature.hideImage
          : existingPage.type === "pf2e-bestiary-tracking.npc"
            ? imageSettings.npc.hideImage
            : existingPage.type === "pf2e-bestiary-tracking.hazard"
              ? imageSettings.hazard.hideImage
              : image.currentSrc;
      image[0].currentSrc = `${image[0].baseURI.split("game")[0]}${hideImage}`;
    }
  }
});

Hooks.on("renderApplication", (_, htmlElements) => {
  for (var element of htmlElements) {
    const buttons = $(element).find(".pf2e-bestiary-link-button");
    for (var button of buttons) {
      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );
      const page = bestiary.pages.get(button.dataset.page);
      button.onclick = () => new PF2EBestiary(page).render(true);
    }
  }
});

Hooks.on("renderChatMessage", (_, htmlElements) => {
  for (var element of htmlElements) {
    const buttons = $(element).find(".pf2e-bestiary-link-button");
    for (var button of buttons) {
      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );
      const page = bestiary.pages.get(button.dataset.page);
      button.onclick = () => new PF2EBestiary(page).render(true);
    }
  }
});

Hooks.on("updateCombatant", async (combatant, changes) => {
  if (changes.hidden === false) {
    const page = game.journal
      .get(game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"))
      .pages.find((x) => x.system.uuid === combatant.token.baseActor.uuid);
    if (page) {
      await page.update({ "system.hidden": false });
      Hooks.callAll(socketEvent.UpdateBestiary, {});
    }
  }
});

Hooks.on("renderDialog", (dialog, html) => {
  if (
    dialog.data.title ===
    game.i18n.format("DOCUMENT.Create", {
      type: game.i18n.localize("DOCUMENT.JournalEntry"),
    })
  ) {
    const options = $(html).find("option");
    options.each((index) => {
      const option = options[index];
      if (option.innerText === "BestiaryTracking Bestiares") $(option).remove();
    });
  }
});

Hooks.on("getActorSheetHeaderButtons", (options, buttons) => {
  if (game.user.isGM && isValidEntityType(options.object.type)) {
    const { toBestiaryButton } = game.settings.get(
      "pf2e-bestiary-tracking",
      "sheet-settings",
    );
    if (toBestiaryButton > 0) {
      buttons.unshift({
        label: toBestiaryButton === 2 ? game.i18n.localize("To Bestiary") : "",
        class: "pf2e-bestiary-entry-button",
        icon: "fa-solid fa-spaghetti-monster-flying",
        onclick: () => {
          const bestiary = game.journal.get(
            game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
          );
          const page = bestiary?.pages?.find(
            (x) => x.system.uuid === options.object.uuid,
          );
          if (page) {
            new PF2EBestiary(page).render(true);
          } else {
            const dialog = new foundry.applications.api.DialogV2({
              buttons: [
                {
                  action: "ok",
                  label: "Yes",
                  icon: "fas fa-check",
                  default: true,
                  callback: () => {
                    PF2EBestiary.addMonster(
                      options.object.token?.baseActor ?? options.object,
                      true,
                      true,
                    );
                  },
                },
                {
                  action: "cancel",
                  label: "No",
                  icon: "fas fa-x",
                  default: true,
                },
              ],
              content: game.i18n.localize(
                "PF2EBestiary.Bestiary.Sheet.BestiaryAddText",
              ),
              rejectClose: false,
              modal: false,
              window: {
                title: game.i18n.localize(
                  "PF2EBestiary.Bestiary.Sheet.BestiaryAddTitle",
                ),
              },
              position: { width: 400 },
            });

            dialog.render(true);
          }
        },
      });
    }
  }
});
