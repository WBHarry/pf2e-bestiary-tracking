import PF2EBestiary from "../module/bestiary.js";
import { socketEvent } from "./socket.js";

export const openBestiary = async () => {
  new PF2EBestiary().render(true);
};

export const showMonster = () => {
  const selectedMonster =
    game.user.targets.size > 0
      ? game.user.targets.values().next().value
      : canvas.tokens.controlled.length > 0
        ? canvas.tokens.controlled[0]
        : null;

  if (!selectedMonster) {
    ui.notifications.info(
      game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoTarget"),
    );
    return;
  }

  if (!selectedMonster.actor) {
    ui.notifications.info(
      game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoActor"),
    );
    return;
  }

  if (
    selectedMonster.actor.type !== "npc" ||
    selectedMonster.actor.hasPlayerOwner
  ) {
    ui.notifications.error(
      game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"),
    );
    return;
  }

  const actor = selectedMonster.document
    ? selectedMonster.document.baseActor
    : selectedMonster.baseActor;
  const bestiary = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );
  const page = bestiary.pages.find((x) => x.system.uuid === actor.uuid);

  if (!page) {
    ui.notifications.info(
      game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"),
    );
    return;
  }

  new PF2EBestiary(page).render(true);
};

export const addMonster = async () => {
  if (!game.user.isGM) {
    ui.notifications.error(
      game.i18n.localize("PF2EBestiary.Macros.AddMonster.GMOnly"),
    );
    return;
  }

  const selectedMonster =
    game.user.targets.size > 0
      ? game.user.targets.values().next().value
      : canvas.tokens.controlled.length > 0
        ? canvas.tokens.controlled[0]
        : null;

  if (!selectedMonster) {
    ui.notifications.info(
      game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoTarget"),
    );
    return;
  }

  if (
    selectedMonster.actor.type !== "npc" ||
    selectedMonster.actor.hasPlayerOwner
  ) {
    ui.notifications.error(
      game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"),
    );
    return;
  }

  const baseActor = selectedMonster.document
    ? selectedMonster.document.baseActor
    : selectedMonster.baseActor;
  const bestiary = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );

  if (bestiary.pages.some((x) => x.system.uuid === baseActor.uuid)) {
    ui.notifications.info(
      game.i18n.localize(
        "PF2EBestiary.Macros.AddMonster.TargetAlreadyInBestiary",
      ),
    );
    return;
  }

  const successfull = await PF2EBestiary.addMonster(baseActor);
  if (successfull) {
    ui.notifications.info(
      game.i18n.format("PF2EBestiary.Bestiary.Info.AddedToBestiary", {
        creatures: selectedMonster.actor.name,
      }),
    );
  } else if (successfull === false) {
    ui.notifications.info(
      game.i18n.format("PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary", {
        creatures: selectedMonster.actor.name,
      }),
    );
  }
};

export const resetBestiary = async () => {
  if (!game.user.isGM) {
    ui.notifications.error(
      game.i18n.localize("PF2EBestiary.Macros.AddMonster.GMOnly"),
    );
    return;
  }

  const confirmed = await Dialog.confirm({
    title: game.i18n.localize("PF2EBestiary.Macros.ResetBestiary.Title"),
    content: game.i18n.localize("PF2EBestiary.Macros.ResetBestiary.Text"),
    yes: () => true,
    no: () => false,
  });

  if (!confirmed) return;

  for (var page of game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  ).pages) {
    await page.delete();
  }

  await game.socket.emit(`module.pf2e-bestiary-tracking`, {
    action: socketEvent.UpdateBestiary,
    data: {},
  });
  Hooks.callAll(socketEvent.UpdateBestiary, {});

  return true;
};

export const deactivateModule = async () => {
  if (!game.user.isGM) {
    ui.notifications.error(
      game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.GMOnly"),
    );
    return;
  }

  const link = await TextEditor.enrichHTML(
    game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Text.Link"),
  );
  const content = `
        <div>${game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Text.FirstPart")}</div>
        <hr />
        <div>${game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Text.SecondPart")}</div>
        <div style="margin-bottom: 8px;">(${link})</div>
    `;

  const confirmed = await Dialog.confirm({
    title: game.i18n.localize("PF2EBestiary.Macros.DeactivateModule.Title"),
    content: content,
    yes: () => true,
    no: () => false,
  });

  if (!confirmed) return;

  const bestiaries = game.journal.filter((x) =>
    x.pages.some((x) =>
      [
        "pf2e-bestiary-tracking.creature",
        "pf2e-bestiary-tracking.npc",
        "pf2e-bestiary-tracking.hazard",
      ].includes(x.type),
    ),
  );
  for (var bestiaryKey in bestiaries) {
    const pageArray = Array.from(bestiaries[bestiaryKey].pages);
    for (var pageKey in pageArray) {
      const page = pageArray[pageKey];
      await page.setFlag(
        "pf2e-bestiary-tracking",
        "deactivated-data",
        JSON.stringify({
          type: page.type,
          name: page.name,
          ownership: foundry.utils.deepClone(page.ownership),
          system: foundry.utils.deepClone(page.system),
        }),
      );
      await page.update(
        {
          type: "text",
          ownership: { default: 0 },
          system: {},
        },
        { diff: false, recursive: false },
      );
    }
  }

  await game.settings.set("core", "moduleConfiguration", {
    ...game.settings.get("core", "moduleConfiguration"),
    ["pf2e-bestiary-tracking"]: false,
  });

  await game.socket.emit("reload");
  foundry.utils.debouncedReload();
};
