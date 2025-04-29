export const slugify = (name) => {
  return name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "");
};

export const getCreatureSize = (size) => {
  switch (size) {
    case "grg":
      return game.i18n.localize("PF2E.ActorSizeGargantuan");
    case "huge":
      return game.i18n.localize("PF2E.ActorSizeHuge");
    case "lg":
      return game.i18n.localize("PF2E.ActorSizeLarge");
    case "med":
      return game.i18n.localize("PF2E.ActorSizeMedium");
    case "sm":
      return game.i18n.localize("PF2E.ActorSizeSmall");
    case "tiny":
      return game.i18n.localize("PF2E.ActorSizeTiny");
  }
};

export const getMultiplesString = (mutliple) => {
  return mutliple.reduce(
    (acc, curr, index) =>
      acc.concat(
        `${index !== 0 ? (index === mutliple.length - 1 ? " or " : ", ") : ""}${curr}`,
      ),
    "",
  );
};

export const getIWRString = (base, isResistance) => {
  // Mangled. Wtf.
  const baseString = base.type;
  const doubleVsString =
    base.doubleVs?.length > 0
      ? `double ${isResistance ? "resistance" : "weakness"} ${getMultiplesString(base.doubleVs)}`
      : "";
  const exceptionsString =
    base.exceptions?.length > 0
      ? `except ${getMultiplesString(base.exceptions)}`
      : "";

  return `${baseString}${doubleVsString || exceptionsString ? ` (${exceptionsString}${doubleVsString ? ";" : ""}${doubleVsString})` : ""}`;
};

export const getCreaturesTypes = (traits, onlyActive) => {
  const creatureTypes = getExpandedCreatureTypes();
  const types = Object.values(traits).reduce((acc, trait) => {
    const typeMatch = creatureTypes.find((x) => x.value === trait.value);
    if (typeMatch)
      acc.push({
        key: typeMatch.value,
        revealed: trait.revealed,
        fake: trait.fake,
        name: typeMatch.name,
      });

    return acc;
  }, []);

  return onlyActive ? types.filter((x) => x.revealed) : types;
};

export const getHazardTypes = (traits, onlyActive) => {
  const hazardTypes = [
    { value: "environmental", name: CONFIG.PF2E.hazardTraits["environmental"] },
    { value: "haunt", name: CONFIG.PF2E.hazardTraits["haunt"] },
    { value: "trap", name: CONFIG.PF2E.hazardTraits["trap"] },
  ];

  const types = Object.values(traits).reduce((acc, trait) => {
    const typeMatch = hazardTypes.find((x) => x.value === trait.value);
    if (typeMatch) {
      acc.push({
        key: typeMatch.value,
        revealed: trait.revealed,
        fake: trait.fake,
        name: typeMatch.name,
      });
    }

    return acc;
  }, []);

  return onlyActive ? types.filter((x) => x.revealed) : types;
};

export const getExpandedCreatureTypes = () => {
  const allTypes = [
    ...Object.keys(CONFIG.PF2E.creatureTypes).map((type) => ({
      value: type,
      name: game.i18n.localize(CONFIG.PF2E.creatureTypes[type]),
      values: [],
    })),
    ...game.settings
      .get("pf2e-bestiary-tracking", "additional-creature-types")
      .map((type) => ({
        value: type.value,
        name: game.i18n.localize(type.name),
        values: [],
      })),
  ].sort((a, b) => {
    if (a.name < b.name) return -1;
    else if (a.name > b.name) return 1;
    else return 0;
  });

  const combat = game.combat
    ? [
        {
          value: "combat",
          name: game.i18n.localize(
            "PF2EBestiary.Bestiary.Miscellaneous.InCombat",
          ),
          values: [],
          startIcon: "fas fa-swords",
          endIcon: "fas fa-swords",
        },
      ]
    : [];

  return [
    ...combat,
    {
      value: "unknown",
      name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown"),
      values: [],
    },
    ...allTypes,
  ];
};

export const getNPCCategories = () => {
  const bestiary = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );
  const categories = bestiary
    .getFlag("pf2e-bestiary-tracking", "npcCategories")
    .sort((a, b) => a.position - b.position);
  const combat = game.combat
    ? [
        {
          value: "combat",
          name: game.i18n.localize(
            "PF2EBestiary.Bestiary.Miscellaneous.InCombat",
          ),
          values: [],
          startIcon: "fas fa-swords",
          endIcon: "fas fa-swords",
        },
      ]
    : [];

  return [
    ...combat,
    {
      value: "unaffiliated",
      name: game.i18n.localize(
        "PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated",
      ),
      values: [],
    },
    ...categories.reduce((acc, category) => {
      acc.push({
        value: category.value,
        name: category.name,
        description: category.description,
        hidden: category.hidden,
        position: category.position,
        values: [],
      });
      return acc;
    }, []),
  ];
};

export const getHazardCategories = () => {
  const combat = game.combat
    ? [
        {
          value: "combat",
          name: game.i18n.localize(
            "PF2EBestiary.Bestiary.Miscellaneous.InCombat",
          ),
          values: [],
          startIcon: "fas fa-swords",
          endIcon: "fas fa-swords",
        },
      ]
    : [];
  return [
    ...combat,
    {
      value: "unknown",
      name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown"),
      values: [],
    },
    {
      value: "environmental",
      name: game.i18n.localize("PF2E.TraitEnvironmental"),
      values: [],
    },
    { value: "haunt", name: game.i18n.localize("PF2E.TraitHaunt"), values: [] },
    { value: "trap", name: game.i18n.localize("PF2E.TraitTrap"), values: [] },
  ];
};

export const getEntityType = (data) => {
  if (data.type === "pf2e-bestiary-tracking.hazard" || data.type === "hazard")
    return "hazard";

  const usedSections = game.settings.get(
    "pf2e-bestiary-tracking",
    "used-sections",
  );
  if (data.type === "character")
    return usedSections.npc ? "character" : "creatureCharacter";

  if (data.type === "pf2e-bestiary-tracking.npc") return "npc";
  if (data.type === "pf2e-bestiary-tracking.creature") return "creature";

  const npcRegistration = game.settings.get(
    "pf2e-bestiary-tracking",
    "npc-registration",
  );

  const isUnique = data.system.traits.rarity === "unique";
  const npcTagged = Object.values(data.system.traits.value).find((x) =>
    x.value ? x.value === "npc" : x === "npc",
  );
  const isNPC =
    !usedSections.creature ||
    (usedSections.npc &&
      (npcRegistration === 0
        ? isUnique
        : npcRegistration === 1
          ? npcTagged
          : isUnique || npcTagged));

  return isNPC ? "npc" : "creature";
};

export const getSpellLevel = (spell, creatureLevel) => {
  return spell.system.traits.value.includes("cantrip")
    ? "Cantrips"
    : spell.system.cast.focusPoints
      ? Math.ceil(creatureLevel / 2)
      : (spell.system.location.heightenedLevel ?? spell.system.level.value);
};

export const chunkArray = (arr, size) => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );
};

export const alphaSort = (a, b, prop, desc) => {
  const compA = prop ? a[prop].toLowerCase() : a.toLowerCase();
  const compB = prop ? b[prop].toLowerCase() : b.toLowerCase();

  if (desc) {
    if (compA > compB) return -1;
    if (compA < compB) return 1;
  } else {
    if (compA < compB) return -1;
    if (compA > compB) return 1;
  }

  return 0;
};

export const versionCompare = (current, target) => {
  const currentSplit = current.split(".").map((x) => Number.parseInt(x));
  const targetSplit = target.split(".").map((x) => Number.parseInt(x));
  for (var i = 0; i < currentSplit.length; i++) {
    if (currentSplit[i] < targetSplit[i]) return true;
    if (currentSplit[i] > targetSplit[i]) return false;
  }

  return false;
};

export const parseDamageInstancesFromFormula = (formula) => {
  const damageMatch = formula.split(/ (?![^(]*\))[+-] /);
  if (!damageMatch)
    return { category: null, damage: { value: "" }, damageType: { value: "" } };

  return damageMatch.reduce((acc, match) => {
    let splitMatch = match.split(/(?<=\)) /);
    if (splitMatch.length < 2) splitMatch = match.split(" ");
    acc[foundry.utils.randomID()] = {
      category: null,
      damage: { value: splitMatch[0] },
      damageType: { value: splitMatch[1] },
    };

    return acc;
  }, {});
};

export const getUsedBestiaryTypes = () => {
  const usedSections = game.settings.get(
    "pf2e-bestiary-tracking",
    "used-sections",
  );
  return Object.keys(usedSections)
    .filter((x) => usedSections[x])
    .map((x) => `pf2e-bestiary-tracking.${x}`);
};

export const isValidEntityType = (type) => {
  const usedSections = game.settings.get(
    "pf2e-bestiary-tracking",
    "used-sections",
  );
  const types = new Set();
  for (var key of Object.keys(usedSections)) {
    if (!usedSections[key]) continue;
    switch (key) {
      case "creature":
      case "npc":
        types.add("npc");
        types.add("character");
        break;
      case "hazard":
        types.add("hazard");
        break;
    }
  }

  return types.has(type);
};

export const saveDataToFile = (data, type, filename) => {
  const blob = new Blob([data], { type: type });

  // Create an element to trigger the download
  let a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = filename;

  // Dispatch a click event to the element
  a.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, view: window }),
  );
  setTimeout(() => window.URL.revokeObjectURL(a.href), 100);
};

export const readTextFromFile = (file) => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = (ev) => {
      resolve(reader.result);
    };
    reader.onerror = (ev) => {
      reader.abort();
      reject();
    };
    reader.readAsText(file);
  });
};

export const valueFromRollOption = (rollOptions, option) => {
  let rollOption = rollOptions.find((x) => x.startsWith(option));
  if (!rollOption)
    rollOption = rollOptions.find((x) => x.startsWith(`origin:${option}`));

  const optionSplit = rollOption.split(":");
  return optionSplit[optionSplit.length - 1];
};

export const getBestiarySpellLevel = (spells, maxLevel, id) => {
  if (spells.levels[maxLevel] && spells.levels[maxLevel].spells[id])
    return maxLevel;

  let level = Number.parseInt(maxLevel);
  while (level) {
    if (spells.levels[level] && spells.levels[level].spells[id]) {
      break;
    }
    var nextLevel = Number.isNaN(level) ? null : level - 1;
    level = nextLevel === 0 ? "Cantrips" : nextLevel ? nextLevel : null;
  }

  return level;
};

export const shouldAutomaticReveal = (type) => {
  const { automaticReveal } = game.settings.get(
    "pf2e-bestiary-tracking",
    "chat-message-handling",
  );

  if (!type || !automaticReveal) return false;

  switch (type) {
    case "saving-throw":
      return automaticReveal.saves;
    case "skill-check":
      return automaticReveal.skills;
    case "attack-roll":
      return automaticReveal.attacks;
    case "action":
      return automaticReveal.actions;
    case "spell":
    case "spell-cast":
      return automaticReveal.spells;
  }
};

export const getAllFolderEntries = (folder) => {
  return [...folder.contents, ...getFolderChildren(folder)];
};

const getFolderChildren = (folder) => {
  const children = [];
  for (var child of folder.children) {
    if (child.entries.length > 0) {
      children.push(
        ...[...Array.from(child.entries), ...getFolderChildren(child)],
      );
    }
  }

  return children;
};

export async function copyToClipboard(textToCopy) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(textToCopy);
  } else {
    return new Promise(async function (resolve, reject) {
      // Use the 'out of viewport hidden text area' trick
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;

      // Move textarea out of the viewport so it's not visible
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";

      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (error) {
        reject();
      } finally {
        textArea.remove();
        resolve();
      }
    });
  }
}
