const slugify = (name) => {
  return name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "");
};

const getMultiplesString$1 = (mutliple) => {
  return mutliple.reduce(
    (acc, curr, index) =>
      acc.concat(
        `${index !== 0 ? (index === mutliple.length - 1 ? " or " : ", ") : ""}${curr}`,
      ),
    "",
  );
};

const getIWRString = (base, isResistance) => {
  // Mangled. Wtf.
  const baseString = base.type;
  const doubleVsString =
    base.doubleVs?.length > 0
      ? `double ${isResistance ? "resistance" : "weakness"} ${getMultiplesString$1(base.doubleVs)}`
      : "";
  const exceptionsString =
    base.exceptions?.length > 0
      ? `except ${getMultiplesString$1(base.exceptions)}`
      : "";

  return `${baseString}${doubleVsString || exceptionsString ? ` (${exceptionsString}${doubleVsString ? ";" : ""}${doubleVsString})` : ""}`;
};

const getCreaturesTypes = (traits, onlyActive) => {
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

const getHazardTypes = (traits, onlyActive) => {
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

const getExpandedCreatureTypes = () => {
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

const getNPCCategories = () => {
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

const getHazardCategories = () => {
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

const getEntityType = (data) => {
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

const getSpellLevel = (spell, creatureLevel) => {
  return spell.system.traits.value.includes("cantrip")
    ? "Cantrips"
    : spell.system.cast.focusPoints
      ? Math.ceil(creatureLevel / 2)
      : (spell.system.location.heightenedLevel ?? spell.system.level.value);
};

const chunkArray = (arr, size) => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );
};

const alphaSort = (a, b, prop, desc) => {
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

const versionCompare = (current, target) => {
  const currentSplit = current.split(".").map((x) => Number.parseInt(x));
  const targetSplit = target.split(".").map((x) => Number.parseInt(x));
  for (var i = 0; i < currentSplit.length; i++) {
    if (currentSplit[i] < targetSplit[i]) return true;
    if (currentSplit[i] > targetSplit[i]) return false;
  }

  return false;
};

const parseDamageInstancesFromFormula = (formula) => {
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

const getUsedBestiaryTypes = () => {
  const usedSections = game.settings.get(
    "pf2e-bestiary-tracking",
    "used-sections",
  );
  return Object.keys(usedSections)
    .filter((x) => usedSections[x])
    .map((x) => `pf2e-bestiary-tracking.${x}`);
};

const isValidEntityType = (type) => {
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

const saveDataToFile$1 = (data, type, filename) => {
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

const readTextFromFile = (file) => {
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

const valueFromRollOption = (rollOptions, option) => {
  let rollOption = rollOptions.find((x) => x.startsWith(option));
  if (!rollOption)
    rollOption = rollOptions.find((x) => x.startsWith(`origin:${option}`));

  const optionSplit = rollOption.split(":");
  return optionSplit[optionSplit.length - 1];
};

const getBestiarySpellLevel = (spells, maxLevel, id) => {
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

const shouldAutomaticReveal = (type) => {
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

const getAllFolderEntries = (folder) => {
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

const getVagueDescriptionLabels = () => ({
  full: {
    extreme: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Extreme",
    ),
    high: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.High",
    ),
    moderate: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Moderate",
    ),
    low: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Low",
    ),
    terrible: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.FullOptions.Terrible",
    ),
  },
  short: {
    extreme: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Extreme",
    ),
    high: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.High",
    ),
    moderate: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Moderate",
    ),
    low: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Low",
    ),
    terrible: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryLabels.VagueDescriptions.ShortOptions.Terrible",
    ),
  },
});

const revealedState = {
  enabled: false,
  revealed: "#008000",
  hidden: "#ff0000",
};

const optionalFields = {
  level: false,
  languages: false,
  height: false,
  weight: false,
  birthplace: false,
};

const bestiaryCategorySettings = {
  creature: {
    name: "PF2EBestiary.Bestiary.Category.Creatures",
    image: "icons/creatures/magical/humanoid-silhouette-green.webp",
  },
  npc: {
    name: "PF2EBestiary.Bestiary.Category.NPC",
    image: "icons/environment/people/group.webp",
  },
  hazard: {
    name: "PF2EBestiary.Bestiary.Category.Hazards",
    image: "icons/environment/traps/trap-jaw-steel.webp",
  },
};

const rangeOptions = ["extreme", "high", "moderate", "low", "terrible"];

const savingThrowPerceptionTable = {
  range: ["extreme", "high", "moderate", "low", "terrible"],
  values: {
    "-2": {
      extreme: 8,
      high: 7,
      moderate: 4,
      low: 1,
      terrible: -1,
    },
    "-1": {
      extreme: 9,
      high: 8,
      moderate: 5,
      low: 2,
      terrible: 0,
    },
    0: {
      extreme: 10,
      high: 9,
      moderate: 6,
      low: 3,
      terrible: 1,
    },
    1: {
      extreme: 11,
      high: 10,
      moderate: 7,
      low: 4,
      terrible: 2,
    },
    2: {
      extreme: 12,
      high: 11,
      moderate: 8,
      low: 5,
      terrible: 3,
    },
    3: {
      extreme: 14,
      high: 12,
      moderate: 9,
      low: 6,
      terrible: 4,
    },
    4: {
      extreme: 15,
      high: 14,
      moderate: 11,
      low: 8,
      terrible: 6,
    },
    5: {
      extreme: 17,
      high: 15,
      moderate: 12,
      low: 9,
      terrible: 7,
    },
    6: {
      extreme: 18,
      high: 17,
      moderate: 14,
      low: 11,
      terrible: 8,
    },
    7: {
      extreme: 20,
      high: 18,
      moderate: 15,
      low: 12,
      terrible: 10,
    },
    8: {
      extreme: 21,
      high: 19,
      moderate: 16,
      low: 13,
      terrible: 11,
    },
    9: {
      extreme: 23,
      high: 21,
      moderate: 18,
      low: 15,
      terrible: 12,
    },
    10: {
      extreme: 24,
      high: 22,
      moderate: 19,
      low: 16,
      terrible: 14,
    },
    11: {
      extreme: 26,
      high: 24,
      moderate: 21,
      low: 18,
      terrible: 15,
    },
    12: {
      extreme: 27,
      high: 25,
      moderate: 22,
      low: 19,
      terrible: 16,
    },
    13: {
      extreme: 29,
      high: 26,
      moderate: 23,
      low: 20,
      terrible: 18,
    },
    14: {
      extreme: 30,
      high: 28,
      moderate: 25,
      low: 22,
      terrible: 19,
    },
    15: {
      extreme: 32,
      high: 29,
      moderate: 26,
      low: 23,
      terrible: 20,
    },
    16: {
      extreme: 33,
      high: 30,
      moderate: 28,
      low: 26,
      terrible: 22,
    },
    17: {
      extreme: 35,
      high: 32,
      moderate: 29,
      low: 26,
      terrible: 23,
    },
    18: {
      extreme: 36,
      high: 33,
      moderate: 30,
      low: 27,
      terrible: 24,
    },
    19: {
      extreme: 38,
      high: 35,
      moderate: 32,
      low: 29,
      terrible: 26,
    },
    20: {
      extreme: 39,
      high: 36,
      moderate: 33,
      low: 30,
      terrible: 27,
    },
    21: {
      extreme: 41,
      high: 38,
      moderate: 35,
      low: 32,
      terrible: 28,
    },
    22: {
      extreme: 43,
      high: 39,
      moderate: 36,
      low: 33,
      terrible: 30,
    },
    23: {
      extreme: 44,
      high: 40,
      moderate: 37,
      low: 34,
      terrible: 31,
    },
    24: {
      extreme: 46,
      high: 42,
      moderate: 38,
      low: 36,
      terrible: 32,
    },
    24: {
      extreme: 48,
      high: 44,
      moderate: 40,
      low: 38,
      terrible: 34,
    },
  },
};

const acTable = {
  range: ["extreme", "high", "moderate", "low"],
  values: {
    "-2": {
      extreme: 17,
      high: 14,
      moderate: 13,
      low: 11,
    },
    "-1": {
      extreme: 18,
      high: 15,
      moderate: 14,
      low: 12,
    },
    0: {
      extreme: 19,
      high: 16,
      moderate: 15,
      low: 13,
    },
    1: {
      extreme: 19,
      high: 16,
      moderate: 15,
      low: 13,
    },
    2: {
      extreme: 21,
      high: 18,
      moderate: 17,
      low: 15,
    },
    3: {
      extreme: 22,
      high: 19,
      moderate: 18,
      low: 16,
    },
    4: {
      extreme: 24,
      high: 21,
      moderate: 20,
      low: 18,
    },
    5: {
      extreme: 25,
      high: 25,
      moderate: 21,
      low: 19,
    },
    6: {
      extreme: 27,
      high: 24,
      moderate: 23,
      low: 21,
    },
    7: {
      extreme: 28,
      high: 25,
      moderate: 24,
      low: 22,
    },
    8: {
      extreme: 30,
      high: 27,
      moderate: 26,
      low: 24,
    },
    9: {
      extreme: 31,
      high: 28,
      moderate: 27,
      low: 25,
    },
    10: {
      extreme: 33,
      high: 30,
      moderate: 29,
      low: 27,
    },
    11: {
      extreme: 34,
      high: 31,
      moderate: 30,
      low: 28,
    },
    12: {
      extreme: 36,
      high: 33,
      moderate: 32,
      low: 30,
    },
    13: {
      extreme: 37,
      high: 34,
      moderate: 33,
      low: 31,
    },
    14: {
      extreme: 39,
      high: 36,
      moderate: 35,
      low: 33,
    },
    15: {
      extreme: 40,
      high: 37,
      moderate: 36,
      low: 34,
    },
    16: {
      extreme: 43,
      high: 40,
      moderate: 39,
      low: 37,
    },
    17: {
      extreme: 43,
      high: 40,
      moderate: 39,
      low: 37,
    },
    18: {
      extreme: 45,
      high: 42,
      moderate: 41,
      low: 39,
    },
    19: {
      extreme: 46,
      high: 43,
      moderate: 42,
      low: 40,
    },
    20: {
      extreme: 48,
      high: 45,
      moderate: 44,
      low: 42,
    },
    21: {
      extreme: 49,
      high: 46,
      moderate: 45,
      low: 43,
    },
    22: {
      extreme: 51,
      high: 48,
      moderate: 47,
      low: 45,
    },
    23: {
      extreme: 52,
      high: 49,
      moderate: 48,
      low: 46,
    },
    24: {
      extreme: 54,
      high: 51,
      moderate: 50,
      low: 48,
    },
    25: {
      extreme: 56,
      high: 53,
      moderate: 52,
      low: 50,
    },
  },
};

const hpTable = {
  range: ["high", "moderate", "low"],
  values: {
    "-2": {
      high: { high: 9, low: 9 },
      moderate: { high: 8, low: 7 },
      low: { high: 6, low: 5 },
    },
    "-1": {
      high: { high: 9, low: 9 },
      moderate: { high: 8, low: 7 },
      low: { high: 6, low: 5 },
    },
    0: {
      high: { high: 20, low: 17 },
      moderate: { high: 16, low: 14 },
      low: { high: 13, low: 11 },
    },
    1: {
      high: { high: 26, low: 24 },
      moderate: { high: 21, low: 19 },
      low: { high: 16, low: 14 },
    },
    2: {
      high: { high: 40, low: 36 },
      moderate: { high: 32, low: 28 },
      low: { high: 25, low: 21 },
    },
    3: {
      high: { high: 59, low: 53 },
      moderate: { high: 48, low: 42 },
      low: { high: 37, low: 31 },
    },
    4: {
      high: { high: 78, low: 72 },
      moderate: { high: 63, low: 57 },
      low: { high: 48, low: 42 },
    },
    5: {
      high: { high: 97, low: 91 },
      moderate: { high: 78, low: 72 },
      low: { high: 59, low: 53 },
    },
    6: {
      high: { high: 123, low: 115 },
      moderate: { high: 99, low: 91 },
      low: { high: 75, low: 67 },
    },
    7: {
      high: { high: 148, low: 140 },
      moderate: { high: 119, low: 111 },
      low: { high: 90, low: 82 },
    },
    8: {
      high: { high: 173, low: 165 },
      moderate: { high: 139, low: 131 },
      low: { high: 105, low: 97 },
    },
    9: {
      high: { high: 198, low: 190 },
      moderate: { high: 159, low: 151 },
      low: { high: 120, low: 112 },
    },
    10: {
      high: { high: 223, low: 215 },
      moderate: { high: 179, low: 171 },
      low: { high: 135, low: 127 },
    },
    11: {
      high: { high: 248, low: 240 },
      moderate: { high: 199, low: 191 },
      low: { high: 150, low: 142 },
    },
    12: {
      high: { high: 273, low: 265 },
      moderate: { high: 219, low: 211 },
      low: { high: 165, low: 157 },
    },
    13: {
      high: { high: 298, low: 290 },
      moderate: { high: 239, low: 231 },
      low: { high: 180, low: 172 },
    },
    14: {
      high: { high: 323, low: 315 },
      moderate: { high: 259, low: 251 },
      low: { high: 195, low: 187 },
    },
    15: {
      high: { high: 348, low: 340 },
      moderate: { high: 279, low: 271 },
      low: { high: 210, low: 202 },
    },
    16: {
      high: { high: 373, low: 365 },
      moderate: { high: 299, low: 291 },
      low: { high: 225, low: 217 },
    },
    17: {
      high: { high: 398, low: 390 },
      moderate: { high: 319, low: 311 },
      low: { high: 240, low: 232 },
    },
    18: {
      high: { high: 423, low: 415 },
      moderate: { high: 339, low: 331 },
      low: { high: 255, low: 247 },
    },
    19: {
      high: { high: 448, low: 440 },
      moderate: { high: 359, low: 351 },
      low: { high: 270, low: 262 },
    },
    20: {
      high: { high: 473, low: 465 },
      moderate: { high: 379, low: 371 },
      low: { high: 285, low: 277 },
    },
    21: {
      high: { high: 505, low: 495 },
      moderate: { high: 405, low: 395 },
      low: { high: 305, low: 295 },
    },
    22: {
      high: { high: 544, low: 532 },
      moderate: { high: 436, low: 424 },
      low: { high: 329, low: 317 },
    },
    23: {
      high: { high: 581, low: 569 },
      moderate: { high: 466, low: 454 },
      low: { high: 351, low: 339 },
    },
    24: {
      high: { high: 633, low: 617 },
      moderate: { high: 508, low: 492 },
      low: { high: 383, low: 367 },
    },
    25: {
      high: { high: 633, low: 617 },
      moderate: { high: 508, low: 492 },
      low: { high: 383, low: 367 },
    },
  },
};

const attributeTable = {
  range: ["extreme", "high", "moderate", "low"],
  values: {
    "-2": {
      extreme: null,
      high: 3,
      moderate: 2,
      low: 0,
    },
    "-1": {
      extreme: null,
      high: 3,
      moderate: 2,
      low: 0,
    },
    0: {
      extreme: null,
      high: 3,
      moderate: 2,
      low: 0,
    },
    1: {
      extreme: 5,
      high: 4,
      moderate: 3,
      low: 1,
    },
    2: {
      extreme: 5,
      high: 4,
      moderate: 3,
      low: 1,
    },
    3: {
      extreme: 5,
      high: 4,
      moderate: 3,
      low: 1,
    },
    4: {
      extreme: 6,
      high: 5,
      moderate: 3,
      low: 2,
    },
    5: {
      extreme: 6,
      high: 5,
      moderate: 4,
      low: 2,
    },
    6: {
      extreme: 7,
      high: 5,
      moderate: 4,
      low: 2,
    },
    7: {
      extreme: 7,
      high: 6,
      moderate: 4,
      low: 2,
    },
    8: {
      extreme: 7,
      high: 6,
      moderate: 4,
      low: 3,
    },
    9: {
      extreme: 7,
      high: 6,
      moderate: 4,
      low: 3,
    },
    10: {
      extreme: 8,
      high: 7,
      moderate: 5,
      low: 3,
    },
    11: {
      extreme: 8,
      high: 7,
      moderate: 5,
      low: 3,
    },
    12: {
      extreme: 8,
      high: 7,
      moderate: 5,
      low: 3,
    },
    13: {
      extreme: 9,
      high: 8,
      moderate: 5,
      low: 4,
    },
    14: {
      extreme: 9,
      high: 8,
      moderate: 5,
      low: 4,
    },
    15: {
      extreme: 9,
      high: 8,
      moderate: 6,
      low: 4,
    },
    16: {
      extreme: 10,
      high: 9,
      moderate: 6,
      low: 5,
    },
    17: {
      extreme: 10,
      high: 9,
      moderate: 6,
      low: 5,
    },
    18: {
      extreme: 10,
      high: 9,
      moderate: 6,
      low: 5,
    },
    19: {
      extreme: 11,
      high: 10,
      moderate: 6,
      low: 5,
    },
    20: {
      extreme: 11,
      high: 10,
      moderate: 7,
      low: 6,
    },
    21: {
      extreme: 11,
      high: 10,
      moderate: 7,
      low: 6,
    },
    22: {
      extreme: 11,
      high: 10,
      moderate: 8,
      low: 6,
    },
    23: {
      extreme: 11,
      high: 10,
      moderate: 8,
      low: 6,
    },
    24: {
      extreme: 13,
      high: 12,
      moderate: 9,
      low: 7,
    },
    25: {
      extreme: 13,
      high: 12,
      moderate: 9,
      low: 7,
    },
  },
};

const skillTable = {
  range: ["extreme", "high", "moderate", "low"],
  values: {
    "-2": {
      extreme: 6,
      high: 3,
      moderate: 2,
      low: {
        high: 0,
        low: -1,
      },
    },
    "-1": {
      extreme: 8,
      high: 5,
      moderate: 4,
      low: {
        high: 2,
        low: 1,
      },
    },
    0: {
      extreme: 9,
      high: 6,
      moderate: 5,
      low: {
        high: 3,
        low: 2,
      },
    },
    1: {
      extreme: 10,
      high: 7,
      moderate: 6,
      low: {
        high: 4,
        low: 3,
      },
    },
    2: {
      extreme: 11,
      high: 8,
      moderate: 7,
      low: {
        high: 5,
        low: 4,
      },
    },
    3: {
      extreme: 13,
      high: 10,
      moderate: 9,
      low: {
        high: 7,
        low: 5,
      },
    },
    4: {
      extreme: 15,
      high: 12,
      moderate: 10,
      low: {
        high: 8,
        low: 7,
      },
    },
    5: {
      extreme: 16,
      high: 13,
      moderate: 12,
      low: {
        high: 10,
        low: 8,
      },
    },
    6: {
      extreme: 18,
      high: 15,
      moderate: 13,
      low: {
        high: 11,
        low: 9,
      },
    },
    7: {
      extreme: 20,
      high: 17,
      moderate: 15,
      low: {
        high: 13,
        low: 11,
      },
    },
    8: {
      extreme: 21,
      high: 18,
      moderate: 16,
      low: {
        high: 14,
        low: 12,
      },
    },
    9: {
      extreme: 23,
      high: 20,
      moderate: 18,
      low: {
        high: 16,
        low: 13,
      },
    },
    10: {
      extreme: 25,
      high: 22,
      moderate: 19,
      low: {
        high: 17,
        low: 15,
      },
    },
    11: {
      extreme: 26,
      high: 23,
      moderate: 21,
      low: {
        high: 19,
        low: 16,
      },
    },
    12: {
      extreme: 28,
      high: 25,
      moderate: 22,
      low: {
        high: 20,
        low: 17,
      },
    },
    13: {
      extreme: 30,
      high: 27,
      moderate: 24,
      low: {
        high: 22,
        low: 19,
      },
    },
    14: {
      extreme: 31,
      high: 28,
      moderate: 25,
      low: {
        high: 23,
        low: 20,
      },
    },
    15: {
      extreme: 33,
      high: 30,
      moderate: 27,
      low: {
        high: 25,
        low: 21,
      },
    },
    16: {
      extreme: 35,
      high: 32,
      moderate: 28,
      low: {
        high: 26,
        low: 23,
      },
    },
    17: {
      extreme: 36,
      high: 33,
      moderate: 30,
      low: {
        high: 28,
        low: 24,
      },
    },
    18: {
      extreme: 38,
      high: 35,
      moderate: 31,
      low: {
        high: 29,
        low: 25,
      },
    },
    19: {
      extreme: 40,
      high: 37,
      moderate: 33,
      low: {
        high: 31,
        low: 27,
      },
    },
    20: {
      extreme: 41,
      high: 38,
      moderate: 34,
      low: {
        high: 32,
        low: 28,
      },
    },
    21: {
      extreme: 43,
      high: 40,
      moderate: 36,
      low: {
        high: 34,
        low: 29,
      },
    },
    22: {
      extreme: 45,
      high: 42,
      moderate: 37,
      low: {
        high: 35,
        low: 31,
      },
    },
    23: {
      extreme: 46,
      high: 43,
      moderate: 38,
      low: {
        high: 36,
        low: 32,
      },
    },
    24: {
      extreme: 48,
      high: 45,
      moderate: 40,
      low: {
        high: 38,
        low: 33,
      },
    },
    24: {
      extreme: 50,
      high: 47,
      moderate: 42,
      low: {
        high: 40,
        low: 35,
      },
    },
  },
};

const weaknessTable = {
  range: ["high", "low"],
  values: {
    "-2": {
      high: 1,
      low: 1,
    },
    "-1": {
      high: 1,
      low: 1,
    },
    0: {
      high: 3,
      low: 1,
    },
    1: {
      high: 3,
      low: 2,
    },
    2: {
      high: 5,
      low: 2,
    },
    3: {
      high: 6,
      low: 3,
    },
    4: {
      high: 7,
      low: 4,
    },
    5: {
      high: 8,
      low: 4,
    },
    6: {
      high: 9,
      low: 5,
    },
    7: {
      high: 10,
      low: 5,
    },
    8: {
      high: 11,
      low: 6,
    },
    9: {
      high: 12,
      low: 6,
    },
    10: {
      high: 13,
      low: 7,
    },
    11: {
      high: 14,
      low: 7,
    },
    12: {
      high: 15,
      low: 8,
    },
    13: {
      high: 16,
      low: 8,
    },
    14: {
      high: 17,
      low: 9,
    },
    15: {
      high: 18,
      low: 9,
    },
    16: {
      high: 19,
      low: 9,
    },
    17: {
      high: 19,
      low: 10,
    },
    18: {
      high: 20,
      low: 10,
    },
    19: {
      high: 21,
      low: 11,
    },
    20: {
      high: 22,
      low: 11,
    },
    21: {
      high: 23,
      low: 12,
    },
    22: {
      high: 24,
      low: 12,
    },
    23: {
      high: 25,
      low: 13,
    },
    24: {
      high: 26,
      low: 13,
    },
    25: {
      high: 26,
      low: 13,
    },
  },
};

const attackTable = {
  range: ["extreme", "high", "moderate", "low"],
  values: {
    "-2": {
      extreme: 8,
      high: 6,
      moderate: 4,
      low: 2,
    },
    "-1": {
      extreme: 10,
      high: 8,
      moderate: 6,
      low: 4,
    },
    0: {
      extreme: 10,
      high: 8,
      moderate: 6,
      low: 4,
    },
    1: {
      extreme: 11,
      high: 9,
      moderate: 7,
      low: 5,
    },
    2: {
      extreme: 13,
      high: 11,
      moderate: 9,
      low: 7,
    },
    3: {
      extreme: 14,
      high: 12,
      moderate: 10,
      low: 8,
    },
    4: {
      extreme: 16,
      high: 14,
      moderate: 12,
      low: 9,
    },
    5: {
      extreme: 17,
      high: 15,
      moderate: 13,
      low: 11,
    },
    6: {
      extreme: 19,
      high: 17,
      moderate: 15,
      low: 12,
    },
    7: {
      extreme: 20,
      high: 18,
      moderate: 16,
      low: 13,
    },
    8: {
      extreme: 22,
      high: 20,
      moderate: 18,
      low: 15,
    },
    9: {
      extreme: 23,
      high: 21,
      moderate: 19,
      low: 16,
    },
    10: {
      extreme: 25,
      high: 23,
      moderate: 21,
      low: 17,
    },
    11: {
      extreme: 27,
      high: 24,
      moderate: 22,
      low: 19,
    },
    12: {
      extreme: 28,
      high: 26,
      moderate: 24,
      low: 20,
    },
    13: {
      extreme: 29,
      high: 27,
      moderate: 25,
      low: 21,
    },
    14: {
      extreme: 31,
      high: 29,
      moderate: 27,
      low: 23,
    },
    15: {
      extreme: 32,
      high: 30,
      moderate: 28,
      low: 24,
    },
    16: {
      extreme: 34,
      high: 32,
      moderate: 30,
      low: 25,
    },
    17: {
      extreme: 35,
      high: 33,
      moderate: 31,
      low: 27,
    },
    18: {
      extreme: 37,
      high: 35,
      moderate: 33,
      low: 28,
    },
    19: {
      extreme: 38,
      high: 36,
      moderate: 34,
      low: 29,
    },
    20: {
      extreme: 40,
      high: 38,
      moderate: 36,
      low: 31,
    },
    21: {
      extreme: 41,
      high: 39,
      moderate: 37,
      low: 32,
    },
    22: {
      extreme: 43,
      high: 41,
      moderate: 39,
      low: 33,
    },
    23: {
      extreme: 44,
      high: 42,
      moderate: 40,
      low: 35,
    },
    24: {
      extreme: 46,
      high: 44,
      moderate: 42,
      low: 36,
    },
    25: {
      extreme: 48,
      high: 46,
      moderate: 44,
      low: 38,
    },
  },
};

const damageTable = {
  range: ["extreme", "high", "moderate", "low"],
  values: {
    "-2": {
      extreme: 2,
      high: 1,
      moderate: 1,
      low: 0,
    },
    "-1": {
      extreme: 4,
      high: 3,
      moderate: 3,
      low: 2,
    },
    0: {
      extreme: 6,
      high: 5,
      moderate: 4,
      low: 3,
    },
    1: {
      extreme: 8,
      high: 6,
      moderate: 5,
      low: 4,
    },
    2: {
      extreme: 11,
      high: 9,
      moderate: 8,
      low: 6,
    },
    3: {
      extreme: 15,
      high: 12,
      moderate: 10,
      low: 8,
    },
    4: {
      extreme: 18,
      high: 14,
      moderate: 12,
      low: 9,
    },
    5: {
      extreme: 20,
      high: 16,
      moderate: 13,
      low: 11,
    },
    6: {
      extreme: 23,
      high: 18,
      moderate: 15,
      low: 12,
    },
    7: {
      extreme: 25,
      high: 20,
      moderate: 17,
      low: 13,
    },
    8: {
      extreme: 28,
      high: 22,
      moderate: 18,
      low: 15,
    },
    9: {
      extreme: 30,
      high: 24,
      moderate: 20,
      low: 16,
    },
    10: {
      extreme: 33,
      high: 26,
      moderate: 22,
      low: 17,
    },
    11: {
      extreme: 35,
      high: 28,
      moderate: 23,
      low: 19,
    },
    12: {
      extreme: 38,
      high: 30,
      moderate: 25,
      low: 20,
    },
    13: {
      extreme: 40,
      high: 32,
      moderate: 27,
      low: 21,
    },
    14: {
      extreme: 43,
      high: 34,
      moderate: 28,
      low: 23,
    },
    15: {
      extreme: 45,
      high: 36,
      moderate: 30,
      low: 24,
    },
    16: {
      extreme: 48,
      high: 37,
      moderate: 31,
      low: 25,
    },
    17: {
      extreme: 50,
      high: 38,
      moderate: 32,
      low: 26,
    },
    18: {
      extreme: 53,
      high: 40,
      moderate: 33,
      low: 27,
    },
    19: {
      extreme: 55,
      high: 42,
      moderate: 35,
      low: 28,
    },
    20: {
      extreme: 58,
      high: 44,
      moderate: 37,
      low: 29,
    },
    21: {
      extreme: 60,
      high: 46,
      moderate: 38,
      low: 31,
    },
    22: {
      extreme: 63,
      high: 48,
      moderate: 40,
      low: 32,
    },
    23: {
      extreme: 65,
      high: 50,
      moderate: 42,
      low: 33,
    },
    24: {
      extreme: 68,
      high: 52,
      moderate: 44,
      low: 35,
    },
    25: {
      extreme: 70,
      high: 54,
      moderate: 46,
      low: 37,
    },
  },
};

const spellDCTable = {
  range: ["extreme", "high", "moderate"],
  values: {
    "-2": {
      extreme: 17,
      high: 14,
      moderate: 11,
    },
    "-1": {
      extreme: 19,
      high: 16,
      moderate: 13,
    },
    0: {
      extreme: 19,
      high: 16,
      moderate: 13,
    },
    1: {
      extreme: 29,
      high: 17,
      moderate: 14,
    },
    2: {
      extreme: 22,
      high: 18,
      moderate: 15,
    },
    3: {
      extreme: 23,
      high: 20,
      moderate: 17,
    },
    4: {
      extreme: 25,
      high: 21,
      moderate: 18,
    },
    5: {
      extreme: 26,
      high: 22,
      moderate: 19,
    },
    6: {
      extreme: 27,
      high: 24,
      moderate: 21,
    },
    7: {
      extreme: 29,
      high: 25,
      moderate: 22,
    },
    8: {
      extreme: 30,
      high: 26,
      moderate: 23,
    },
    9: {
      extreme: 32,
      high: 28,
      moderate: 25,
    },
    10: {
      extreme: 33,
      high: 29,
      moderate: 26,
    },
    11: {
      extreme: 34,
      high: 30,
      moderate: 27,
    },
    12: {
      extreme: 36,
      high: 32,
      moderate: 29,
    },
    13: {
      extreme: 37,
      high: 33,
      moderate: 30,
    },
    14: {
      extreme: 39,
      high: 34,
      moderate: 31,
    },
    15: {
      extreme: 40,
      high: 36,
      moderate: 33,
    },
    16: {
      extreme: 41,
      high: 37,
      moderate: 34,
    },
    17: {
      extreme: 43,
      high: 38,
      moderate: 35,
    },
    18: {
      extreme: 44,
      high: 40,
      moderate: 37,
    },
    19: {
      extreme: 46,
      high: 41,
      moderate: 38,
    },
    20: {
      extreme: 47,
      high: 42,
      moderate: 39,
    },
    21: {
      extreme: 48,
      high: 44,
      moderate: 41,
    },
    22: {
      extreme: 50,
      high: 45,
      moderate: 42,
    },
    23: {
      extreme: 51,
      high: 46,
      moderate: 43,
    },
    24: {
      extreme: 52,
      high: 48,
      moderate: 45,
    },
    24: {
      extreme: 54,
      high: 50,
      moderate: 47,
    },
  },
};

const spellAttackTable = {
  range: ["extreme", "high", "moderate"],
  values: {
    "-2": {
      extreme: 9,
      high: 6,
      moderate: 3,
    },
    "-1": {
      extreme: 11,
      high: 8,
      moderate: 5,
    },
    0: {
      extreme: 11,
      high: 8,
      moderate: 5,
    },
    1: {
      extreme: 12,
      high: 9,
      moderate: 6,
    },
    2: {
      extreme: 14,
      high: 10,
      moderate: 7,
    },
    3: {
      extreme: 15,
      high: 12,
      moderate: 9,
    },
    4: {
      extreme: 17,
      high: 13,
      moderate: 10,
    },
    5: {
      extreme: 18,
      high: 14,
      moderate: 11,
    },
    6: {
      extreme: 19,
      high: 16,
      moderate: 13,
    },
    7: {
      extreme: 21,
      high: 17,
      moderate: 14,
    },
    8: {
      extreme: 22,
      high: 18,
      moderate: 15,
    },
    9: {
      extreme: 24,
      high: 29,
      moderate: 17,
    },
    10: {
      extreme: 25,
      high: 21,
      moderate: 18,
    },
    11: {
      extreme: 26,
      high: 22,
      moderate: 19,
    },
    12: {
      extreme: 28,
      high: 24,
      moderate: 21,
    },
    13: {
      extreme: 29,
      high: 25,
      moderate: 22,
    },
    14: {
      extreme: 31,
      high: 26,
      moderate: 23,
    },
    15: {
      extreme: 32,
      high: 28,
      moderate: 25,
    },
    16: {
      extreme: 33,
      high: 29,
      moderate: 26,
    },
    17: {
      extreme: 43,
      high: 30,
      moderate: 27,
    },
    18: {
      extreme: 44,
      high: 32,
      moderate: 29,
    },
    19: {
      extreme: 46,
      high: 33,
      moderate: 30,
    },
    20: {
      extreme: 47,
      high: 34,
      moderate: 31,
    },
    21: {
      extreme: 48,
      high: 36,
      moderate: 33,
    },
    22: {
      extreme: 50,
      high: 37,
      moderate: 34,
    },
    23: {
      extreme: 51,
      high: 38,
      moderate: 35,
    },
    24: {
      extreme: 52,
      high: 40,
      moderate: 37,
    },
    25: {
      extreme: 54,
      high: 42,
      moderate: 39,
    },
  },
};

const stealthDisableTable = {
  range: ["extreme", "high", "low"],
  values: {
    "-2": {
      extreme: 16,
      high: 13,
      low: { high: 10, low: 9 },
    },
    "-1": {
      extreme: 18,
      high: 15,
      low: { high: 12, low: 11 },
    },
    0: {
      extreme: 19,
      high: 16,
      low: { high: 13, low: 12 },
    },
    1: {
      extreme: 20,
      high: 17,
      low: { high: 14, low: 13 },
    },
    2: {
      extreme: 21,
      high: 18,
      low: { high: 15, low: 14 },
    },
    3: {
      extreme: 23,
      high: 20,
      low: { high: 17, low: 15 },
    },
    4: {
      extreme: 25,
      high: 22,
      low: { high: 18, low: 17 },
    },
    5: {
      extreme: 26,
      high: 23,
      low: { high: 20, low: 18 },
    },
    6: {
      extreme: 28,
      high: 25,
      low: { high: 21, low: 19 },
    },
    7: {
      extreme: 30,
      high: 27,
      low: { high: 23, low: 21 },
    },
    8: {
      extreme: 31,
      high: 28,
      low: { high: 24, low: 22 },
    },
    9: {
      extreme: 33,
      high: 30,
      low: { high: 26, low: 23 },
    },
    10: {
      extreme: 35,
      high: 32,
      low: { high: 27, low: 25 },
    },
    11: {
      extreme: 36,
      high: 33,
      low: { high: 29, low: 26 },
    },
    12: {
      extreme: 38,
      high: 35,
      low: { high: 30, low: 27 },
    },
    13: {
      extreme: 40,
      high: 37,
      low: { high: 32, low: 29 },
    },
    14: {
      extreme: 41,
      high: 38,
      low: { high: 33, low: 30 },
    },
    15: {
      extreme: 43,
      high: 40,
      low: { high: 35, low: 31 },
    },
    16: {
      extreme: 45,
      high: 42,
      low: { high: 36, low: 33 },
    },
    17: {
      extreme: 46,
      high: 43,
      low: { high: 38, low: 34 },
    },
    18: {
      extreme: 48,
      high: 45,
      low: { high: 39, low: 35 },
    },
    19: {
      extreme: 50,
      high: 47,
      low: { high: 41, low: 37 },
    },
    20: {
      extreme: 51,
      high: 48,
      low: { high: 42, low: 38 },
    },
    21: {
      extreme: 53,
      high: 50,
      low: { high: 44, low: 39 },
    },
    22: {
      extreme: 55,
      high: 52,
      low: { high: 45, low: 41 },
    },
    23: {
      extreme: 56,
      high: 53,
      low: { high: 46, low: 42 },
    },
    24: {
      extreme: 58,
      high: 55,
      low: { high: 48, low: 43 },
    },
    25: {
      extreme: 60,
      high: 57,
      low: { high: 50, low: 45 },
    },
  },
};

const hardnessTable = {
  range: ["high", "low"],
  values: {
    "-2": {
      high: 2,
      low: 1,
    },
    "-1": {
      high: 4,
      low: 2,
    },
    0: {
      high: 5,
      low: 3,
    },
    1: {
      high: 7,
      low: 5,
    },
    2: {
      high: 9,
      low: 7,
    },
    3: {
      high: 12,
      low: 10,
    },
    4: {
      high: 13,
      low: 11,
    },
    5: {
      high: 14,
      low: 12,
    },
    6: {
      high: 15,
      low: 13,
    },
    7: {
      high: 16,
      low: 14,
    },
    8: {
      high: 17,
      low: 15,
    },
    9: {
      high: 18,
      low: 16,
    },
    10: {
      high: 19,
      low: 17,
    },
    11: {
      high: 21,
      low: 19,
    },
    12: {
      high: 22,
      low: 20,
    },
    13: {
      high: 23,
      low: 21,
    },
    14: {
      high: 24,
      low: 22,
    },
    15: {
      high: 25,
      low: 23,
    },
    16: {
      high: 27,
      low: 25,
    },
    17: {
      high: 29,
      low: 27,
    },
    18: {
      high: 31,
      low: 29,
    },
    19: {
      high: 33,
      low: 31,
    },
    20: {
      high: 35,
      low: 33,
    },
    21: {
      high: 38,
      low: 36,
    },
    22: {
      high: 41,
      low: 39,
    },
    23: {
      high: 46,
      low: 44,
    },
    24: {
      high: 50,
      low: 46,
    },
    25: {
      high: 54,
      low: 50,
    },
  },
};

const levelDCTable = {
  "-2": 12,
  "-1": 13,
  0: 14,
  1: 15,
  2: 16,
  3: 18,
  4: 19,
  5: 20,
  6: 22,
  7: 23,
  8: 24,
  9: 26,
  10: 27,
  11: 28,
  12: 30,
  13: 31,
  14: 32,
  15: 34,
  16: 35,
  17: 36,
  18: 38,
  19: 39,
  20: 40,
  21: 42,
  22: 44,
  23: 46,
  24: 48,
  25: 50,
  26: 52,
};

const dcModificationTable = {
  incrediblyEasy: {
    order: 0,
    value: "-10",
    label: "PF2E.DCAdjustmentIncrediblyEasy",
  },
  veryEasy: { order: 1, value: "-5", label: "PF2E.DCAdjustmentVeryEasy" },
  easy: { order: 2, value: "-2", label: "PF2E.DCAdjustmentEasy" },
  normal: { order: 3, value: "0", label: "PF2E.DCAdjustmentNormal" },
  hard: { order: 4, value: "2", label: "PF2E.DCAdjustmentHard" },
  veryHard: { order: 5, value: "5", label: "PF2E.DCAdjustmentVeryHard" },
  incrediblyHard: {
    order: 6,
    value: "10",
    label: "PF2E.DCAdjustmentIncrediblyHard",
  },
};

const rarityModificationTable = {
  common: dcModificationTable.normal,
  uncommon: dcModificationTable.hard,
  rare: dcModificationTable.veryHard,
  unique: dcModificationTable.incrediblyHard,
};

const identificationSkills = {
  aberration: ["occultism"],
  animal: ["nature"],
  astral: ["occultism"],
  beast: ["arcana", "nature"],
  celestial: ["religion"],
  construct: ["arcana", "crafting"],
  dragon: ["arcana"],
  dream: ["occultism"],
  elemental: ["arcana", "nature"],
  ethereal: ["occultism"],
  fey: ["nature"],
  fiend: ["religion"],
  fungus: ["nature"],
  humanoid: ["society"],
  monitor: ["society"],
  ooze: ["occultism"],
  plant: ["nature"],
  shade: ["religion"],
  spirit: ["occultism"],
  time: ["occultism"],
  undead: ["religion"],
};

const getCategoryLabel = (statisticsTable, level, save, short) => {
  if (save === undefined || save === null) return save;

  const { range, values } = statisticsTable;
  const tableRow = values[level];

  if (save > tableRow[range[0]])
    return getCategoryLabelValue(range, "extreme", short);
  if (save < tableRow[range[range.length - 1]])
    return getCategoryLabelValue(range, "terrible", short);

  var value = null;
  for (var category in tableRow) {
    const rowValue = tableRow[category];
    if (!value || Math.abs(rowValue - save) < value.diff) {
      value = {
        category: category,
        diff: Math.abs(rowValue - save),
      };
    }
  }

  return getCategoryLabelValue(range, value.category, short);
};

const setSimpleCategoryLabels = (saves) => {
  const range = ["high", "moderate", "low"];
  const workingSaves = Object.keys(saves)
    .map((key) => ({ key: key, value: saves[key].value }))
    .sort((a, b) => b.value - a.value);
  for (var i = 0; i < workingSaves.length; i++) {
    const baseCategory = i === 0 ? "high" : i === 1 ? "moderate" : "low";
    const save = workingSaves[i];
    if (i !== 0 && workingSaves[i - 1].value === save.value) {
      saves[save.key].category = saves[workingSaves[i - 1].key].category;
    } else {
      saves[save.key].category = getCategoryLabelValue(
        range,
        baseCategory,
        true,
      );
    }
  }
};

const getMixedCategoryLabel = (statisticsTable, level, save, short) => {
  const { range, values } = statisticsTable;
  const tableRow = values[level];

  const maxCategory = tableRow[range[0]];
  const minCategory = tableRow[range[range.length - 1]];
  if (value > (maxCategory.high ?? maxCategory))
    return getCategoryLabelValue(range, "extreme");
  if (value < (minCategory.low ?? minCategory))
    return getCategoryLabelValue(range, "terrible");

  var value = null;
  for (var category in tableRow) {
    const rowValue = tableRow[category]?.high
      ? Math.min(
          Math.abs(tableRow[category].high - save),
          Math.abs(tableRow[category].low - save),
        )
      : Math.abs(tableRow[category] - save);
    if (!value || rowValue < value.diff) {
      value = {
        category: category,
        diff: rowValue,
      };
    }
  }

  return getCategoryLabelValue(range, value.category, short);
};

const getCategoryFromIntervals = (intervalTable, level, value) => {
  const { range, values } = intervalTable;
  const tableRow = values[level];

  if (value > tableRow[range[0]].high)
    return getCategoryLabelValue(range, "extreme");
  if (value < tableRow[range[range.length - 1]].low)
    return getCategoryLabelValue(range, "terrible");

  return getCategoryLabelValue(
    range,
    Object.keys(tableRow).find(
      (x) => value <= tableRow[x].high && value >= tableRow[x].low,
    ),
  );
};

Object.keys(weaknessTable).reduce((acc, key) => {
  const baseValues = weaknessTable[key];
  acc[key] = {
    ...baseValues,
    moderate: Math.floor(
      baseValues.low + (baseValues.high - baseValues.low) / 2,
    ),
  };

  return acc;
}, {});

const getCategoryLabelValue = (range, category, short) => {
  while (!range.find((x) => x === category)) {
    const currentIndex = rangeOptions.indexOf(category);

    if (currentIndex > range.length - 1)
      category = rangeOptions[currentIndex - 1];
    else category = rangeOptions[currentIndex + 1];
  }

  const { vagueDescriptions } = game.settings.get(
    "pf2e-bestiary-tracking",
    "bestiary-labels",
  );
  switch (category) {
    case "extreme":
      return short
        ? vagueDescriptions.short.extreme
        : vagueDescriptions.full.extreme;
    case "high":
      return short ? vagueDescriptions.short.high : vagueDescriptions.full.high;
    case "moderate":
      return short
        ? vagueDescriptions.short.moderate
        : vagueDescriptions.full.moderate;
    case "low":
      return short ? vagueDescriptions.short.low : vagueDescriptions.full.low;
    case "terrible":
      return short
        ? vagueDescriptions.short.terrible
        : vagueDescriptions.full.terrible;
  }
};

const getCategoryRange = async (name) => {
  const { vagueDescriptions } = await game.settings.get(
    "pf2e-bestiary-tracking",
    "bestiary-labels",
  );

  switch (name) {
    case "ac":
      return acTable.range.map((category) =>
        game.i18n.localize(vagueDescriptions.full[category]),
      );
    case "hp":
      return hpTable.range.map((category) =>
        game.i18n.localize(vagueDescriptions.full[category]),
      );
    case "attributes":
      return attributeTable.range.map((category) =>
        game.i18n.localize(vagueDescriptions.short[category]),
      );
    case "saves":
      return savingThrowPerceptionTable.range.map((category) =>
        game.i18n.localize(vagueDescriptions.short[category]),
      );
    case "perception":
      return savingThrowPerceptionTable.range.map((category) =>
        game.i18n.localize(vagueDescriptions.full[category]),
      );
    case "skills":
      return skillTable.range.map((category) =>
        game.i18n.localize(vagueDescriptions.full[category]),
      );
  }
};

const getRollAverage = (terms) => {
  var total = 0;
  var currentOperator = null;
  for (var i = 0; i < terms.length; i++) {
    var term = terms[i];

    //Pool, string and function terms should not be applicable to damage rolls in pf2e
    if (term.operator) {
      currentOperator = term.operator;
    } else if (term.faces) {
      total = applyRollOperator(
        total,
        currentOperator,
        getDiceAverage(term.faces, term.number),
      );
    } else if (term.number) {
      total = applyRollOperator(total, currentOperator, term.number);
    } else if (term.terms) {
      total = applyRollOperator(
        total,
        currentOperator,
        getRollAverage(term.terms),
      );
    }
  }

  return total;
};

const applyRollOperator = (total, operator, value) => {
  switch (operator) {
    case "+":
      return total + value;
    case "-":
      return total - value;
    case "/":
      return total / value;
    case "*":
      return total * value;
    default:
      return value;
  }
};

const getDiceAverage = (faces, number) => {
  var oddDice = 0,
    pairs = 0;
  switch (faces) {
    case 10:
      if (number === 1) return 6;
    case 12:
      if (number === 1) return 7;
    default:
      oddDice = number % 2;
      pairs = (number - oddDice) / 2;
      return pairs * (faces / 2 + (faces / 2 + 1)) + (oddDice ? faces / 2 : 0);
  }
};

const dispositions = {
  helpful: {
    value: "helpful",
    name: "PF2EBestiary.Bestiary.NPC.Disposition.Helpful",
  },
  friendly: {
    value: "friendly",
    name: "PF2EBestiary.Bestiary.NPC.Disposition.Friendly",
  },
  indifferent: {
    value: "indifferent",
    name: "PF2EBestiary.Bestiary.NPC.Disposition.Indifferent",
  },
  unfriendly: {
    value: "unfriendly",
    name: "PF2EBestiary.Bestiary.NPC.Disposition.Unfriendly",
  },
  hostile: {
    value: "hostile",
    name: "PF2EBestiary.Bestiary.NPC.Disposition.Hostile",
  },
};

const recallKnowledgeOutcomes = {
  none: {
    value: "none",
    order: 0,
    name: "PF2EBestiary.Miscellaneous.None",
    icon: null,
  },
  criticalSuccess: {
    value: "criticalSuccess",
    order: 1,
    name: "PF2EBestiary.DegreeOfSuccess.CriticalSuccess",
    icon: "fa-solid fa-star",
  },
  success: {
    value: "success",
    order: 2,
    name: "PF2EBestiary.DegreeOfSuccess.Success",
    icon: "fa-solid fa-check",
  },
  failure: {
    value: "failure",
    order: 3,
    name: "PF2EBestiary.DegreeOfSuccess.Failure",
    icon: "fa-solid fa-x",
  },
  criticalFailure: {
    value: "criticalFailure",
    order: 4,
    name: "PF2EBestiary.DegreeOfSuccess.CriticalFailure",
    icon: "fa-solid fa-skull",
  },
};

const defaultRevealing = {
  creature: {
    name: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Name",
    nameInfo: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.NameInfo",
    traits: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Traits",
    attributes:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Attributes",
    description:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Description",
    level: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Level",
    ac: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.AC",
    hp: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.HP",
    saves: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Saves",
    iwr: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.IWR",
    speeds: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Speeds",
    perception:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Perception",
    senses: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Senses",
    skills: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Skills",
    languages:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Languages",
    attacks: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Attacks",
    abilities:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Abilities",
    spells: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Spells",
  },
  npc: {
    appearance:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Appearance",
    personality:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Personality",
    background:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Background",
    height: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Height",
    weight: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Weight",
    // birthplace: 'PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Birthplace',
    premise: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Premise",
  },
  hazard: {
    attacks: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Attacks",
    abilities:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Abilities",
    name: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Name",
    traits: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Traits",
    description:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Description",
    level: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Level",
    ac: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.AC",
    hp: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.HP",
    hardness: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Hardness",
    disable: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Disable",
    routine: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Routine",
    reset: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Reset",
    saves: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Saves",
    iwr: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.IWR",
    initiative:
      "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Initiative",
    stealth: "PF2EBestiary.Menus.BestiaryIntegration.DefaultRevealed.Stealth",
  },
};

const imageHideStates = {
  revealed: {
    value: 0,
    name: "PF2EBestiary.Menus.BestiaryIntegration.HiddenSettings.ImageHideState.Revealed",
  },
  outline: {
    value: 1,
    name: "PF2EBestiary.Menus.BestiaryIntegration.HiddenSettings.ImageHideState.Outline",
  },
  hidden: {
    value: 2,
    name: "PF2EBestiary.Menus.BestiaryIntegration.HiddenSettings.ImageHideState.Hidden",
  },
  sepia: {
    value: 3,
    name: "PF2EBestiary.Menus.BestiaryIntegration.HiddenSettings.ImageHideState.Sepia",
  },
};

const imageSettings = {
  creature: {
    hideState: 0,
    hideImage: "systems/pf2e/icons/default-icons/npc.svg",
  },
  npc: {
    hideState: 0,
    hideImage: "systems/pf2e/icons/default-icons/npc.svg",
  },
  hazard: {
    hideState: 0,
    hideImage: "systems/pf2e/icons/default-icons/npc.svg",
  },
};

const toBestiaryOptions = {
  no: {
    name: "PF2EBestiary.Bestiary.Sheet.BestiaryOptions.No",
    value: 0,
  },
  icon: {
    name: "PF2EBestiary.Bestiary.Sheet.BestiaryOptions.Icon",
    value: 1,
  },
  iconAndText: {
    name: "PF2EBestiary.Bestiary.Sheet.BestiaryOptions.IconAndText",
    value: 2,
  },
};

const npcCategorySortOptions = {
  manual: {
    name: "PF2EBestiary.Bestiary.NPC.CategorySortOptions.Manual",
    value: 0,
  },
  ascAlpha: {
    name: "PF2EBestiary.Bestiary.NPC.CategorySortOptions.AscAlpha",
    value: 1,
  },
  descAlpha: {
    name: "PF2EBestiary.Bestiary.NPC.CategorySortOptions.DescAlpha",
    value: 2,
  },
};

const fields = foundry.data.fields;

const toggleStringField = () =>
  new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.StringField({ required: true }),
    custom: new fields.StringField({ nullable: true }),
  });

const toggleNumberField = () =>
  new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.NumberField({ required: true, integer: true }),
    custom: new fields.StringField({ nullable: true }),
  });

const getCreatureData = async (actor, pcBase) => {
  if (pcBase) return await getPCCreatureData(actor);

  const { creature: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { creature: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Array.from(actor.items);

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

  const spellEntries = itemKeys.reduce((acc, entry) => {
    if (entry.type === "spellcastingEntry") {
      const levels = {};
      actor.items.forEach((spell) => {
        if (
          spell.type === "spell" &&
          spell.system.location.value === entry.id
        ) {
          const levelValue = getSpellLevel(
            spell,
            actor.system.details.level.value,
          );

          var level = Object.values(levels).find((x) => x.value === levelValue);
          if (!level) {
            level = { value: levelValue, spells: {} };
          }

          level.spells[spell._id] = {
            revealed: defaultRevealed.spells,
            label: spell.name,
            img: spell.img,
            actions: spell.actionGlyph,
            defense: spell.system.defense?.save?.statistic
              ? {
                  statistic: spell.system.defense.save.statistic,
                  basic: spell.system.defense.save.basic,
                }
              : null,
            range: spell.system.range.value,
            traits: {
              rarity: spell.system.traits.rarity,
              traditions: spell.system.traits.traditions,
              values: spell.system.traits.value.reduce((acc, trait) => {
                acc[trait] = { value: trait };
                return acc;
              }, {}),
            },
            description: {
              gm: spell.system.description.gm,
              value: spell.system.description.value,
            },
          };

          levels[levelValue] = level;
        }
      });

      acc[entry.id] = {
        revealed: defaultRevealed.spells,
        tradition: entry.system.tradition.value,
        category: entry.category,
        dc: { value: entry.system.spelldc.dc },
        mod: { value: entry.system.spelldc.mod },
        attack: { value: entry.system.spelldc.value },
        levels: levels,
      };
    }

    return acc;
  }, {});

  const hasSpells = Object.keys(spellEntries).length > 0;
  const spells = {
    ...(hasSpells ? {} : { fake: { revealed: false } }),
    entries: hasSpells ? spellEntries : {},
  };

  return {
    type: "pf2e-bestiary-tracking.creature",
    name: actor.name,
    ownership: { default: 3 },
    system: {
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
          .monster || combatant?.token?.hidden,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      imageState: { hideState: imageSettings.hideState },
      actorState: {
        actorLinks: actor.actorLinks ?? [],
      },
      name: { value: actor.name, revealed: defaultRevealed.name },
      blurb: {
        value: actor.system.details.blurb ? actor.system.details.blurb : null,
        revealed: defaultRevealed.nameInfo,
      },
      hardness: { value: actor.system.attributes.hardness },
      allSaves: { value: actor.system.attributes.allSaves?.value },
      publication: actor.system.details.publication,
      ac: {
        value: Number.parseInt(actor.system.attributes.ac.value),
        details: actor.system.attributes.ac.details,
        revealed: defaultRevealed.ac,
      },
      hp: {
        value: Number.parseInt(actor.system.attributes.hp.max),
        temp: Number.parseInt(actor.system.attributes.hp.temp),
        details: actor.system.attributes.hp.details,
        negativeHealing: actor.system.attributes.hp.negativeHealing,
        revealed: defaultRevealed.hp,
      },
      level: {
        value: Number.parseInt(actor.system.details.level.value),
        revealed: defaultRevealed.level,
      },
      size: actor.system.traits.size.value,
      rarity: { value: actor.system.traits.rarity },
      traits: actor.system.traits.value.reduce((acc, trait) => {
        acc[trait] = { value: trait, revealed: defaultRevealed.traits };
        return acc;
      }, {}),
      skills: Object.values(actor.system.skills).some((x) => x.base > 0)
        ? Object.keys(actor.system.skills).reduce((acc, key) => {
            const skill = actor.system.skills[key];
            acc[key] = {
              value: skill.base,
              revealed: defaultRevealed.skills,
              lore: skill.lore,
              note: skill.note,
              modifiers: skill.modifiers
                .filter((x) => x.slug !== "base")
                .map((x) => ({
                  kind: x.kind,
                  label: x.label,
                  modifier: x.modifier,
                })),
              label: skill.label,
              totalModifier: Number.parseInt(skill.totalModifier),
            };
            return acc;
          }, {})
        : {
            revealed: defaultRevealed.skills,
            empty: { empty: true, value: "PF2EBestiary.Miscellaneous.None" },
          },
      saves: {
        fortitude: {
          value: actor.system.saves.fortitude.value,
          revealed: defaultRevealed.saves,
        },
        reflex: {
          value: actor.system.saves.reflex.value,
          revealed: defaultRevealed.saves,
        },
        will: {
          value: actor.system.saves.will.value,
          revealed: defaultRevealed.saves,
        },
      },
      speeds: {
        details: {
          name: actor.system.attributes.speed.details,
          revealed: defaultRevealed.speeds,
        },
        values: {
          land: {
            type: "land",
            value: actor.system.attributes.speed.value,
            revealed: defaultRevealed.speeds,
          },
          ...actor.system.attributes.speed.otherSpeeds.reduce((acc, speed) => {
            acc[speed.label] = {
              type: speed.type,
              value: speed.value,
              revealed: defaultRevealed.speeds,
            };
            return acc;
          }, {}),
        },
      },
      abilities: Object.keys(actor.system.abilities).reduce((acc, key) => {
        acc[key] = {
          key: key,
          mod: actor.system.abilities[key].mod,
          revealed: defaultRevealed.abilities,
        };
        return acc;
      }, {}),
      senses: {
        perception: {
          value: actor.system.perception.value,
          revealed: defaultRevealed.perception,
        },
        details: {
          value: actor.system.perception.details,
          revealed: defaultRevealed.senses,
        },
        senses: actor.system.perception.senses.reduce((acc, sense) => {
          acc[sense.type] = {
            type: sense.type,
            revealed: defaultRevealed.senses,
          };
          return acc;
        }, {}),
      },
      languages: {
        details: {
          value: actor.system.details.languages.details,
          revealed: defaultRevealed.languages,
        },
        values:
          actor.system.details.languages.value.length > 0 ||
          actor.system.details.languages.details
            ? actor.system.details.languages.value.reduce((acc, language) => {
                acc[language] = {
                  value: language,
                  revealed: defaultRevealed.languages,
                };
                return acc;
              }, {})
            : {
                empty: {
                  revealed: defaultRevealed.languages,
                  empty: true,
                  value: "PF2EBestiary.Miscellaneous.None",
                  exceptions: {},
                },
              },
      },
      immunities:
        immunitiesKeys.length > 0
          ? immunitiesKeys.reduce((acc, key) => {
              const immunity = actor.system.attributes.immunities[key];
              acc[getIWRString(immunity)] = {
                revealed: defaultRevealed.iwr,
                type: immunity.type,
                source: immunity.source,
                customLabel: immunity["#customLabel"],
                exceptions: immunity.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
              },
            },
      weaknesses:
        weaknessesKeys.length > 0
          ? weaknessesKeys.reduce((acc, key) => {
              const weakness = actor.system.attributes.weaknesses[key];
              acc[getIWRString(weakness)] = {
                revealed: defaultRevealed.iwr,
                type: weakness.type,
                source: weakness.source,
                customLabel: weakness["#customLabel"],
                value: weakness.value,
                exceptions: weakness.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
              },
            },
      resistances:
        resistancesKeys.length > 0
          ? resistancesKeys.reduce((acc, key) => {
              const resistance = actor.system.attributes.resistances[key];
              acc[getIWRString(resistance)] = {
                revealed: defaultRevealed.iwr,
                type: resistance.type,
                source: resistance.source,
                customLabel: resistance["#customLabel"],
                value: resistance.value,
                exceptions: resistance.exceptions.reduce((acc, exception) => {
                  const type = exception.label ?? exception;
                  acc[slugify(type)] = { type: type };
                  return acc;
                }, {}),
                doubleVs: resistance.doubleVs.reduce((acc, doubleVs) => {
                  acc[doubleVs] = { type: doubleVs.label ?? doubleVs };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
                doubleVs: {},
              },
            },
      attacks:
        attackKeys.length > 0
          ? attackKeys.reduce((acc, actionKey) => {
              const attack = actor.system.actions[actionKey];
              const item = attack.item;

              acc[attack.item.id] = {
                revealed: defaultRevealed.attacks,
                label: attack.label,
                actions: attack.glyph,
                totalModifier: attack.totalModifier,
                isMelee: attack.weapon?.isMelee ?? attack.item.isMelee,
                additionalEffects:
                  attack.additionalEffects?.reduce((acc, effect) => {
                    acc[effect.tag] = {
                      label: effect.label,
                      tag: effect.tag,
                    };

                    return acc;
                  }, {}) ?? {},
                damageInstances: Object.keys(item.system.damageRolls).reduce(
                  (acc, damage) => {
                    acc[damage] = {
                      category: item.system.damageRolls[damage].category,
                      damage: {
                        value: item.system.damageRolls[damage].damage,
                      },
                      damageType: {
                        value: item.system.damageRolls[damage].damageType,
                      },
                    };

                    return acc;
                  },
                  {},
                ),
                traits: item.system.traits.value.reduce((acc, trait) => {
                  acc[trait] = { value: trait, description: trait };
                  return acc;
                }, {}),
                variants: attack.variants.reduce((acc, variant) => {
                  acc[slugify(variant.label)] = { label: variant.label };

                  return acc;
                }, {}),
                rules: item.system.rules,
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.attacks,
                empty: true,
                label: "PF2EBestiary.Miscellaneous.None",
                totalModifier: 0,
                isMelee: false,
                damageInstances: {},
                traits: {},
                variants: {},
                rules: {},
              },
            },
      actions:
        itemKeys.filter(
          (action) =>
            action.type === "action" &&
            action.system.actionType.value !== "passive",
        ).length > 0
          ? itemKeys.reduce((acc, action) => {
              if (
                action.type === "action" &&
                action.system.actionType.value !== "passive"
              ) {
                acc[action.id] = {
                  revealed: defaultRevealed.abilities,
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  actions: action.system.actions.value ?? "R",
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {}),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.abilities,
                empty: true,
                label: "PF2EBestiary.Miscellaneous.None",
                actions: "",
                traits: {},
                description: "",
              },
            },
      passives:
        itemKeys.filter(
          (action) =>
            action.type === "action" &&
            action.system.actionType.value === "passive",
        ).length > 0
          ? itemKeys.reduce((acc, action) => {
              if (
                action.type === "action" &&
                action.system.actionType.value === "passive"
              ) {
                acc[action.id] = {
                  revealed: defaultRevealed.abilities,
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {}),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.abilities,
                empty: true,
                label: "PF2EBestiary.Miscellaneous.None",
                traits: {},
                description: "",
              },
            },
      spells: spells,
      notes: {
        public: {
          value: actor.system.details.publicNotes,
          revealed: defaultRevealed.description,
        },
        private: { value: actor.system.details.privateNotes },
      },
    },
  };
};

const getPCCreatureData = async (actor) => {
  const { creature: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { creature: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Array.from(actor.items);

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

  const spellEntries = itemKeys.reduce((acc, entry) => {
    if (entry.type === "spellcastingEntry") {
      const levels = {};
      actor.items.forEach((spell) => {
        if (
          spell.type === "spell" &&
          spell.system.location.value === entry.id
        ) {
          const levelValue = getSpellLevel(
            spell,
            actor.system.details.level.value,
          );

          var level = Object.values(levels).find((x) => x.value === levelValue);
          if (!level) {
            level = { value: levelValue, spells: {} };
          }

          level.spells[spell._id] = {
            revealed: defaultRevealed.spells,
            label: spell.name,
            img: spell.img,
            actions: spell.actionGlyph,
            defense: spell.system.defense?.save?.statistic
              ? {
                  statistic: spell.system.defense.save.statistic,
                  basic: spell.system.defense.save.basic,
                }
              : null,
            range: spell.system.range.value,
            traits: {
              rarity: spell.system.traits.rarity,
              traditions: spell.system.traits.traditions,
              values: spell.system.traits.value.reduce((acc, trait) => {
                acc[trait] = { value: trait };
                return acc;
              }, {}),
            },
            description: {
              gm: spell.system.description.gm,
              value: spell.system.description.value,
            },
          };

          levels[levelValue] = level;
        }
      });

      acc[entry.id] = {
        revealed: defaultRevealed.spells,
        tradition: entry.system.tradition.value,
        category: entry.category,
        dc: { value: actor.classDC.dc.value },
        mod: { value: actor.classDC.mod },
        attack: { value: actor.classDC.mod },
        levels: levels,
      };
    }

    return acc;
  }, {});

  const hasSpells = Object.keys(spellEntries).length > 0;
  const spells = {
    ...(hasSpells ? {} : { fake: { revealed: false } }),
    entries: hasSpells ? spellEntries : {},
  };

  const attacks = {};
  for (var i = 0; i < attackKeys.length; i++) {
    var attack = actor.system.actions[attackKeys[i]];

    if (attack.slug === "basic-unarmed") continue;

    const item = attack.item;

    const damage = await attack.damage({ getFormula: true });
    const damageInstances = parseDamageInstancesFromFormula(damage);
    attacks[attack.item.id] = {
      revealed: defaultRevealed.attacks,
      label: attack.label,
      actions: attack.glyph,
      totalModifier: attack.totalModifier,
      isMelee: item.isMelee,
      additionalEffects:
        attack.additionalEffects?.reduce((acc, effect) => {
          acc[effect.tag] = {
            label: effect.label,
            tag: effect.tag,
          };

          return acc;
        }, {}) ?? {},
      damageInstances: damageInstances,
      bonuses: {
        bonus: item.system.damage.bonus?.value,
        bonusDamage: item.system.damage.bonusDamage?.value,
        splashDamage: item.system.splashDamage.value,
        property: item.system.damage.property1,
        runes: {
          potency: item.system.runes.potency,
          striking: item.system.runes.striking,
          property: item.system.runes.property,
        },
      },
      traits: item.system.traits.value.reduce((acc, trait) => {
        acc[trait] = { value: trait, description: trait };
        return acc;
      }, {}),
      variants: attack.variants.reduce((acc, variant) => {
        acc[slugify(variant.label)] = { label: variant.label };

        return acc;
      }, {}),
      rules: item.system.rules,
    };
  }
  if (Object.keys(attacks).length === 0) {
    attacks.empty = {
      revealed: defaultRevealed.attacks,
      empty: true,
      label: "PF2EBestiary.Miscellaneous.None",
      totalModifier: 0,
      isMelee: false,
      damageInstances: {},
      traits: {},
      variants: {},
      rules: {},
    };
  }

  return {
    type: "pf2e-bestiary-tracking.creature",
    name: actor.name,
    ownership: { default: 3 },
    system: {
      isFromPC: true,
      pcData: {
        classDC: {
          label: CONFIG.PF2E.classTraits[actor.classDC.slug],
          dc: { value: actor.classDC.dc.value },
          mod: { value: actor.classDC.mod },
        },
      },
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
          .monster || combatant?.token?.hidden,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      imageState: { hideState: imageSettings.hideState },
      name: { value: actor.name, revealed: defaultRevealed.name },
      blurb: {
        value: actor.system.details.blurb ? actor.system.details.blurb : null,
        revealed: defaultRevealed.nameInfo,
      },
      hardness: { value: actor.system.attributes.hardness },
      allSaves: { value: actor.system.attributes.allSaves?.value },
      publication: actor.system.details.publication,
      ac: {
        value: Number.parseInt(actor.system.attributes.ac.value),
        details: actor.system.attributes.ac.details,
        revealed: defaultRevealed.ac,
      },
      hp: {
        value: Number.parseInt(actor.system.attributes.hp.max),
        temp: Number.parseInt(actor.system.attributes.hp.temp),
        details: actor.system.attributes.hp.details,
        negativeHealing: actor.system.attributes.hp.negativeHealing,
        revealed: defaultRevealed.hp,
      },
      level: {
        value: Number.parseInt(actor.system.details.level.value),
        revealed: defaultRevealed.level,
      },
      size: actor.system.traits.size.value,
      rarity: { value: actor.system.traits.rarity },
      traits: actor.system.traits.value.reduce((acc, trait) => {
        acc[trait] = { value: trait, revealed: defaultRevealed.traits };
        return acc;
      }, {}),
      skills: Object.values(actor.system.skills).some(
        (x) => x.totalModifier > 0,
      )
        ? Object.keys(actor.system.skills).reduce((acc, key) => {
            const skill = actor.system.skills[key];
            acc[key] = {
              value: Number.parseInt(skill.totalModifier),
              revealed: defaultRevealed.skills,
              lore: skill.lore,
              note: skill.note,
              modifiers: skill.modifiers
                .filter((x) => x.slug !== "base")
                .map((x) => ({
                  kind: x.kind,
                  label: x.label,
                  modifier: x.modifier,
                })),
              label: skill.label,
              totalModifier: Number.parseInt(skill.totalModifier),
            };
            return acc;
          }, {})
        : {
            revealed: defaultRevealed.skills,
            empty: { empty: true, value: "PF2EBestiary.Miscellaneous.None" },
          },
      saves: {
        fortitude: {
          value: actor.system.saves.fortitude.value,
          revealed: defaultRevealed.saves,
        },
        reflex: {
          value: actor.system.saves.reflex.value,
          revealed: defaultRevealed.saves,
        },
        will: {
          value: actor.system.saves.will.value,
          revealed: defaultRevealed.saves,
        },
      },
      speeds: {
        details: {
          name: actor.system.attributes.speed.details,
          revealed: defaultRevealed.speeds,
        },
        values: {
          land: {
            type: "land",
            value: actor.system.attributes.speed.value,
            revealed: defaultRevealed.speeds,
          },
          ...actor.system.attributes.speed.otherSpeeds.reduce((acc, speed) => {
            acc[speed.label] = {
              type: speed.type,
              value: speed.value,
              revealed: defaultRevealed.speeds,
            };
            return acc;
          }, {}),
        },
      },
      abilities: Object.keys(actor.system.abilities).reduce((acc, key) => {
        acc[key] = {
          key: key,
          mod: actor.system.abilities[key].mod,
          revealed: defaultRevealed.abilities,
        };
        return acc;
      }, {}),
      senses: {
        perception: {
          value: actor.system.perception.value,
          revealed: defaultRevealed.perception,
        },
        details: {
          value: actor.system.perception.details,
          revealed: defaultRevealed.senses,
        },
        senses: actor.system.perception.senses.reduce((acc, sense) => {
          acc[sense.type] = {
            type: sense.type,
            revealed: defaultRevealed.senses,
          };
          return acc;
        }, {}),
      },
      languages: {
        details: {
          value: actor.system.details.languages.details,
          revealed: defaultRevealed.languages,
        },
        values:
          actor.system.details.languages.value.length > 0 ||
          actor.system.details.languages.details
            ? actor.system.details.languages.value.reduce((acc, language) => {
                acc[language] = {
                  value: language,
                  revealed: defaultRevealed.languages,
                };
                return acc;
              }, {})
            : {
                empty: {
                  revealed: defaultRevealed.languages,
                  empty: true,
                  value: "PF2EBestiary.Miscellaneous.None",
                  exceptions: {},
                },
              },
      },
      immunities:
        immunitiesKeys.length > 0
          ? immunitiesKeys.reduce((acc, key) => {
              const immunity = actor.system.attributes.immunities[key];
              acc[getIWRString(immunity)] = {
                revealed: defaultRevealed.iwr,
                type: immunity.type,
                source: immunity.source,
                customLabel: immunity["#customLabel"],
                exceptions: immunity.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
              },
            },
      weaknesses:
        weaknessesKeys.length > 0
          ? weaknessesKeys.reduce((acc, key) => {
              const weakness = actor.system.attributes.weaknesses[key];
              acc[getIWRString(weakness)] = {
                revealed: defaultRevealed.iwr,
                type: weakness.type,
                source: weakness.source,
                customLabel: weakness["#customLabel"],
                value: weakness.value,
                exceptions: weakness.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
              },
            },
      resistances:
        resistancesKeys.length > 0
          ? resistancesKeys.reduce((acc, key) => {
              const resistance = actor.system.attributes.resistances[key];
              acc[getIWRString(resistance)] = {
                revealed: defaultRevealed.iwr,
                type: resistance.type,
                source: resistance.source,
                customLabel: resistance["#customLabel"],
                value: resistance.value,
                exceptions: resistance.exceptions.reduce((acc, exception) => {
                  const type = exception.label ?? exception;
                  acc[slugify(type)] = { type: type };
                  return acc;
                }, {}),
                doubleVs: resistance.doubleVs.reduce((acc, doubleVs) => {
                  acc[doubleVs] = { type: doubleVs.label ?? doubleVs };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
                doubleVs: {},
              },
            },
      attacks: attacks,
      actions:
        itemKeys.filter(
          (action) =>
            (action.type === "action" || action.type === "feat") &&
            action.system.actionType.value !== "passive",
        ).length > 0
          ? itemKeys.reduce((acc, action) => {
              if (
                (action.type === "action" || action.type === "feat") &&
                action.system.actionType.value !== "passive"
              ) {
                acc[action.id] = {
                  revealed: defaultRevealed.abilities,
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  actions: action.system.actions.value ?? "R",
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {}),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.abilities,
                empty: true,
                label: "PF2EBestiary.Miscellaneous.None",
                actions: "",
                traits: {},
                description: "",
              },
            },
      passives:
        itemKeys.filter(
          (action) =>
            (action.type === "action" || action.type === "feat") &&
            action.system.actionType.value === "passive",
        ).length > 0
          ? itemKeys.reduce((acc, action) => {
              if (
                (action.type === "action" || action.type === "feat") &&
                action.system.actionType.value === "passive"
              ) {
                acc[action.id] = {
                  revealed: defaultRevealed.abilities,
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {}),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.abilities,
                empty: true,
                label: "PF2EBestiary.Miscellaneous.None",
                traits: {},
                description: "",
              },
            },
      spells: spells,
      notes: {
        public: {
          value: actor.system.details.publicNotes,
          revealed: defaultRevealed.description,
        },
        private: { value: actor.system.details.privateNotes },
      },
    },
  };
};

const getNPCData = async (actor, pcBase) => {
  const { npc: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { npc: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

  const isSimple = actor.sheet.options.classes.includes("simple");

  const creatureData = await getCreatureData(actor, pcBase);
  const personalityData = pcBase
    ? {
        attitude: {
          value: actor.system.details.biography.attitude
            ? actor.system.details.biography.attitude
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.attitude),
        },
        beliefs: {
          value: actor.system.details.biography.beliefs
            ? actor.system.details.biography.beliefs
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.beliefs),
        },
        likes: {
          value: actor.system.details.biography.likes
            ? actor.system.details.biography.likes
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.likes),
        },
        dislikes: {
          value: actor.system.details.biography.dislikes
            ? actor.system.details.biography.dislikes
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.dislikes),
        },
        catchphrases: {
          value: actor.system.details.biography.catchphrases
            ? actor.system.details.biography.catchphrases
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.catchphrases),
        },
        edicts:
          actor.system.details.biography.edicts.length > 0
            ? actor.system.details.biography.edicts.reduce((acc, edict) => {
                acc[foundry.utils.randomID()] = { value: edict };

                return acc;
              }, {})
            : {
                empty: {
                  value: "PF2EBestiary.Miscellaneous.None",
                  empty: true,
                },
              },
        anathema:
          actor.system.details.biography.anathema.length > 0
            ? actor.system.details.biography.anathema.reduce(
                (acc, anathema) => {
                  acc[foundry.utils.randomID()] = { value: anathema };

                  return acc;
                },
                {},
              )
            : {
                empty: {
                  value: "PF2EBestiary.Miscellaneous.None",
                  empty: true,
                },
              },
      }
    : null;

  return {
    ...creatureData,
    type: "pf2e-bestiary-tracking.npc",
    system: {
      ...creatureData.system,
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings").npc ||
        combatant?.token?.hidden,
      imageState: {
        hideState: imageSettings.hideState,
      },
      npcData: {
        simple: isSimple,
        categories: [],
        general: {
          background: {
            value: pcBase ? actor.system.details.biography.backstory : "",
            revealed: defaultRevealed.background,
          },
          appearance: {
            value: pcBase ? actor.system.details.biography.appearance : "",
            revealed: defaultRevealed.appearance,
          },
          personality: {
            value: "",
            revealed: defaultRevealed.personality,
            data: personalityData,
          },
          height: {
            value: pcBase ? actor.system.details.height.value : "",
            revealed: defaultRevealed.height,
          },
          weight: {
            value: pcBase ? actor.system.details.weight.value : "",
            revealed: defaultRevealed.weight,
          },
          birthplace: {
            value: pcBase ? actor.system.details.biography.birthPlace : "",
            revealed: defaultRevealed.birthplace,
          },
          disposition: {},
        },
        influence: {
          premise: { value: "", revealed: defaultRevealed.premise },
          influencePoints: 0,
          discovery: {},
          influenceSkils: {},
          influence: {},
          resistances: {},
          weaknesses: {},
          penalties: {},
        },
      },
    },
  };
};

const getHazardData = (actor) => {
  const { hazard: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { hazard: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Array.from(actor.items);

  return {
    type: "pf2e-bestiary-tracking.hazard",
    name: actor.name,
    ownership: { default: 3 },
    system: {
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings").hazard ||
        combatant?.token?.hidden,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      imageState: { hideState: imageSettings.hideState },
      name: { value: actor.name, revealed: defaultRevealed.name },
      publication: actor.system.details.publication,
      hasHealth: actor.system.attributes.hasHealth,
      isComplex: actor.system.details.isComplex,
      disable: {
        value: actor.system.details.disable,
        revealed: defaultRevealed.disable,
      },
      routine: {
        value: actor.system.details.routine,
        revealed: defaultRevealed.routine,
      },
      reset: {
        value: actor.system.details.reset,
        revealed: defaultRevealed.reset,
      },
      ac: {
        value: Number.parseInt(actor.system.attributes.ac.value),
        details: actor.system.attributes.ac.details,
        revealed: defaultRevealed.ac,
      },
      hp: {
        value: Number.parseInt(actor.system.attributes.hp.max),
        temp: Number.parseInt(actor.system.attributes.hp.temp),
        details: actor.system.attributes.hp.details,
        negativeHealing: actor.system.attributes.hp.negativeHealing,
        revealed: defaultRevealed.hp,
      },
      hardness: {
        value: actor.system.attributes.hardness,
        revealed: defaultRevealed.hardness,
      },
      level: {
        value: Number.parseInt(actor.system.details.level.value),
        revealed: defaultRevealed.level,
      },
      stealth: {
        value: actor.system.attributes.stealth.value,
        dc: actor.system.attributes.stealth.dc,
        modifiers: actor.system.attributes.stealth.modifiers
          .filter((x) => x.slug !== "base")
          .map((x) => ({
            kind: x.kind,
            label: x.label,
            modifier: x.modifier,
          })),
        totalModifier: Number.parseInt(
          actor.system.attributes.stealth.totalModifier,
        ),
        details: {
          value: actor.system.attributes.stealth.details,
          revealed: defaultRevealed.stealth,
        },
        revealed: defaultRevealed.stealth,
      },
      initiative: actor.system.initiative
        ? {
            value: actor.system.initiative.value,
            modifiers: actor.system.initiative.modifiers
              .filter((x) => x.slug !== "base")
              .map((x) => ({
                kind: x.kind,
                label: x.label,
                modifier: x.modifier,
              })),
            totalModifier: Number.parseInt(
              actor.system.initiative.totalModifier,
            ),
            revealed: defaultRevealed.initiative,
          }
        : null,
      rarity: { value: actor.system.traits.rarity },
      traits: actor.system.traits.value.reduce((acc, trait) => {
        acc[trait] = { value: trait, revealed: defaultRevealed.traits };
        return acc;
      }, {}),
      saves: {
        fortitude: {
          value: actor.system.saves.fortitude.value,
          revealed: defaultRevealed.saves,
        },
        reflex: {
          value: actor.system.saves.reflex.value,
          revealed: defaultRevealed.saves,
        },
        will: {
          value: actor.system.saves.will.value,
          revealed: defaultRevealed.saves,
        },
      },
      immunities:
        immunitiesKeys.length > 0
          ? immunitiesKeys.reduce((acc, key) => {
              const immunity = actor.system.attributes.immunities[key];
              acc[getIWRString(immunity)] = {
                revealed: defaultRevealed.iwr,
                type: immunity.type,
                exceptions: immunity.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
              },
            },
      weaknesses:
        weaknessesKeys.length > 0
          ? weaknessesKeys.reduce((acc, key) => {
              const weakness = actor.system.attributes.weaknesses[key];
              acc[getIWRString(weakness)] = {
                revealed: defaultRevealed.iwr,
                type: weakness.type,
                value: weakness.value,
                exceptions: weakness.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
              },
            },
      resistances:
        resistancesKeys.length > 0
          ? resistancesKeys.reduce((acc, key) => {
              const resistance = actor.system.attributes.resistances[key];
              acc[getIWRString(resistance)] = {
                revealed: defaultRevealed.iwr,
                type: resistance.type,
                value: resistance.value,
                exceptions: resistance.exceptions.reduce((acc, exception) => {
                  const type = exception.label ?? exception;
                  acc[slugify(type)] = { type: type };
                  return acc;
                }, {}),
                doubleVs: resistance.doubleVs.reduce((acc, doubleVs) => {
                  acc[doubleVs] = { type: doubleVs.label ?? doubleVs };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                empty: true,
                revealed: defaultRevealed.iwr,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
                doubleVs: {},
              },
            },
      attacks:
        attackKeys.length > 0
          ? attackKeys.reduce((acc, actionKey) => {
              const attack = actor.system.actions[actionKey];
              const item = actor.items.get(attack.item.id);

              if (item.type === "melee" || item.type === "equipment") {
                acc[attack.item.id] = {
                  revealed: defaultRevealed.attacks,
                  label: attack.label,
                  actions: attack.glyph,
                  totalModifier: attack.totalModifier,
                  isMelee: attack.weapon?.isMelee ?? attack.item.isMelee,
                  additionalEffects:
                    attack.additionalEffects?.reduce((acc, effect) => {
                      acc[effect.tag] = {
                        label: effect.label,
                        tag: effect.tag,
                      };

                      return acc;
                    }, {}) ?? {},
                  damageInstances: Object.keys(item.system.damageRolls).reduce(
                    (acc, damage) => {
                      acc[damage] = {
                        category: item.system.damageRolls[damage].category,
                        damage: {
                          value: item.system.damageRolls[damage].damage,
                        },
                        damageType: {
                          value: item.system.damageRolls[damage].damageType,
                        },
                      };

                      return acc;
                    },
                    {},
                  ),
                  traits: item.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait, description: trait };
                    return acc;
                  }, {}),
                  variants: attack.variants.reduce((acc, variant) => {
                    acc[slugify(variant.label)] = { label: variant.label };

                    return acc;
                  }, {}),
                  rules: item.system.rules,
                };
              }

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.attacks,
                empty: true,
                label: "PF2EBestiary.Miscellaneous.None",
                totalModifier: 0,
                isMelee: false,
                damageInstances: {},
                traits: {},
                variants: {},
                rules: {},
              },
            },
      actions:
        itemKeys.filter((action) => action.type === "action").length > 0
          ? itemKeys.reduce((acc, action) => {
              if (action.type === "action") {
                acc[action.id] = {
                  revealed: defaultRevealed.abilities,
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  actions:
                    action.system.actionType.value === "reaction"
                      ? "R"
                      : action.system.actionType.value === "passive"
                        ? ""
                        : (action.system.actions.value ?? "R"),
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait] = { value: trait };
                    return acc;
                  }, {}),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {})
          : {
              empty: {
                empty: true,
                revealed: defaultRevealed.abilities,
                label: "PF2EBestiary.Miscellaneous.None",
                actions: "",
                traits: {},
                description: "",
              },
            },
      notes: {
        description: {
          value: actor.system.details.description,
          revealed: defaultRevealed.description,
        },
      },
    },
  };
};

class MappingField extends foundry.data.fields.ObjectField {
  constructor(model, options) {
    if (!(model instanceof foundry.data.fields.DataField)) {
      throw new Error(
        "MappingField must have a DataField as its contained element",
      );
    }
    super(options);

    /**
     * The embedded DataField definition which is contained in this field.
     * @type {DataField}
     */
    this.model = model;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initialKeys: null,
      initialValue: null,
      initialKeysOnly: false,
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _cleanType(value, options) {
    Object.entries(value).forEach(
      ([k, v]) => (value[k] = this.model.clean(v, options)),
    );
    return value;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getInitialValue(data) {
    let keys = this.initialKeys;
    const initial = super.getInitialValue(data);
    if (!keys || !foundry.utils.isEmpty(initial)) return initial;
    if (!(keys instanceof Array)) keys = Object.keys(keys);
    for (const key of keys) initial[key] = this._getInitialValueForKey(key);
    return initial;
  }

  /* -------------------------------------------- */

  /**
   * Get the initial value for the provided key.
   * @param {string} key       Key within the object being built.
   * @param {object} [object]  Any existing mapping data.
   * @returns {*}              Initial value based on provided field type.
   */
  _getInitialValueForKey(key, object) {
    const initial = this.model.getInitialValue();
    return this.initialValue?.(key, initial, object) ?? initial;
  }

  /* -------------------------------------------- */

  /** @override */
  _validateType(value, options = {}) {
    if (foundry.utils.getType(value) !== "Object")
      throw new Error("must be an Object");
    const errors = this._validateValues(value, options);
    if (!foundry.utils.isEmpty(errors))
      throw new foundry.data.fields.ModelValidationError(errors);
  }

  /* -------------------------------------------- */

  /**
   * Validate each value of the object.
   * @param {object} value     The object to validate.
   * @param {object} options   Validation options.
   * @returns {Object<Error>}  An object of value-specific errors by key.
   */
  _validateValues(value, options) {
    const errors = {};
    for (const [k, v] of Object.entries(value)) {
      const error = this.model.validate(v, options);
      if (error) errors[k] = error;
    }
    return errors;
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options = {}) {
    if (!value) return value;
    const obj = {};
    const initialKeys =
      this.initialKeys instanceof Array
        ? this.initialKeys
        : Object.keys(this.initialKeys ?? {});
    const keys = this.initialKeysOnly ? initialKeys : Object.keys(value);
    for (const key of keys) {
      const data = value[key] ?? this._getInitialValueForKey(key, value);
      obj[key] = this.model.initialize(data, model, options);
    }
    return obj;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getField(path) {
    if (path.length === 0) return this;
    else if (path.length === 1) return this.model;
    path.shift();
    return this.model._getField(path);
  }
}

class Creature extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      hidden: new fields.BooleanField({ required: true, initial: false }),
      uuid: new fields.StringField({ required: false, nullable: true }),
      version: new fields.StringField({ required: true }),
      img: new fields.StringField({ required: true }),
      texture: new fields.StringField({ required: true }),
      imageState: new fields.SchemaField({
        hideState: new fields.NumberField({
          required: true,
          integer: true,
          initial: 0,
        }),
        hideImage: new fields.StringField({ nullable: true, initial: null }),
      }),
      actorState: new fields.SchemaField({
        actorLinks: new fields.ArrayField(
          new fields.StringField({ required: true }),
        ),
        actorDuplicates: new fields.ArrayField(
          new fields.StringField({ required: true }),
        ),
      }),
      active: new fields.BooleanField({ required: true, initial: true }),
      isFromPC: new fields.BooleanField({}),
      pcData: new fields.SchemaField(
        {
          classDC: new fields.SchemaField({
            label: new fields.StringField({ required: true }),
            dc: new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.NumberField({ required: true, integer: true }),
            }),
            mod: new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.NumberField({ required: true, integer: true }),
            }),
          }),
        },
        { nullable: true, initial: null },
      ),
      recallKnowledge: new MappingField(
        new fields.SchemaField({
          attempts: new MappingField(new fields.StringField({})),
        }),
      ),
      name: toggleStringField(),
      blurb: new fields.SchemaField({
        value: new fields.StringField({ nullable: true, initial: null }),
        custom: new fields.StringField({ nullable: true }),
        revealed: new fields.BooleanField({ initial: false }),
      }),
      publication: new fields.SchemaField({
        authors: new fields.StringField({}),
        license: new fields.StringField({}),
        remaster: new fields.BooleanField({}),
        title: new fields.StringField({}),
      }),
      hardness: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.StringField({}),
      }),
      allSaves: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.StringField({}),
      }),
      ac: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.NumberField({ required: true, integer: true }),
        custom: new fields.StringField({ nullable: true }),
        details: new fields.StringField({}),
      }),
      hp: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.NumberField({ required: true, integer: true }),
        custom: new fields.StringField({ nullable: true }),
        temp: new fields.NumberField({ integer: true }),
        details: new fields.StringField({}),
        negativeHealing: new fields.BooleanField({}),
      }),
      level: toggleNumberField(),
      size: new fields.StringField({ required: true }),
      skills: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          empty: new fields.BooleanField({ initial: false }),
          lore: new fields.BooleanField({}),
          note: new fields.StringField({}),
          modifiers: new fields.ArrayField(
            new fields.SchemaField({
              kind: new fields.StringField({}),
              label: new fields.StringField({}),
              modifier: new fields.NumberField({ integer: true }),
            }),
            { initial: [] },
          ),
          label: new fields.StringField({}),
          value: new fields.StringField({ required: true }),
          custom: new fields.StringField({ nullable: true }),
          totalModifier: new fields.NumberField({
            required: false,
            integer: true,
          }),
        }),
      ),
      abilities: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          custom: new fields.StringField({ nullable: true }),
          mod: new fields.NumberField({ required: true, integer: true }),
          key: new fields.StringField({ required: true }),
        }),
      ),
      saves: new fields.SchemaField({
        fortitude: toggleNumberField(),
        reflex: toggleNumberField(),
        will: toggleNumberField(),
      }),
      speeds: new fields.SchemaField({
        details: new fields.SchemaField(
          {
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            name: new fields.StringField({ required: true }),
          },
          { required: false },
        ),
        values: new MappingField(
          new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            type: new fields.StringField({ required: true }),
            value: new fields.NumberField({ required: true, integer: true }),
          }),
        ),
      }),
      immunities: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          source: new fields.StringField({}),
          customLabel: new fields.StringField({}),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      weaknesses: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          source: new fields.StringField({}),
          customLabel: new fields.StringField({}),
          value: new fields.NumberField({ required: true, integer: true }),
          valueRevealed: new fields.BooleanField({ initial: false }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      resistances: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          source: new fields.StringField({}),
          customLabel: new fields.StringField({}),
          value: new fields.NumberField({ required: true, integer: true }),
          valueRevealed: new fields.BooleanField({ initial: false }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
          doubleVs: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      rarity: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.StringField({ required: true }),
      }),
      traits: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({ intitial: false }),
          value: new fields.StringField({ required: true }),
        }),
      ),
      attacks: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({}),
          damageStatsRevealed: new fields.BooleanField({
            required: true,
            initial: false,
          }),
          label: new fields.StringField({ required: true }),
          actions: new fields.StringField({ required: true }),
          totalModifier: new fields.NumberField({ required: true }),
          isMelee: new fields.BooleanField({ required: true }),
          additionalEffects: new MappingField(
            new fields.SchemaField({
              label: new fields.StringField({ required: true }),
              tag: new fields.StringField({ required: true }),
            }),
          ),
          traits: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.StringField({ required: true }),
              description: new fields.StringField({ required: true }),
            }),
          ),
          variants: new MappingField(
            new fields.SchemaField({
              label: new fields.StringField({}),
            }),
          ),
          damageInstances: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({}),
              category: new fields.StringField({ nullable: true }),
              damage: new fields.SchemaField({
                value: new fields.StringField({ nullable: true }),
              }),
              damageType: new fields.SchemaField({
                revealed: new fields.BooleanField({
                  required: true,
                  initial: false,
                }),
                value: new fields.StringField({ required: true }),
              }),
              persistent: new fields.StringField({ nullable: true }),
            }),
          ),
          bonuses: new fields.SchemaField({
            bonus: new fields.NumberField({ integer: true, initial: 0 }),
            bonusDamage: new fields.NumberField({ integer: true, initial: 0 }),
            splashDamage: new fields.NumberField({ integer: true, initial: 0 }),
            property: new fields.ObjectField({}),
          }),
          rules: new fields.ObjectField({}),
        }),
      ),
      actions: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({}),
          label: new fields.StringField({ required: true }),
          category: new fields.StringField({}),
          deathNote: new fields.BooleanField({}),
          actions: new fields.StringField({ required: true }),
          traits: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.StringField({ required: true }),
            }),
          ),
          description: new fields.HTMLField({ required: true, initial: "" }),
        }),
      ),
      passives: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({}),
          label: new fields.StringField({ required: true }),
          category: new fields.StringField({}),
          deathNote: new fields.BooleanField({}),
          traits: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.StringField({ required: true }),
            }),
          ),
          description: new fields.HTMLField({ required: true, initial: "" }),
        }),
      ),
      spells: new fields.SchemaField({
        fake: new fields.SchemaField(
          {
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
          },
          { nullable: true, initial: null },
        ),
        entries: new MappingField(
          new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            tradition: new fields.StringField({ required: true }),
            category: new fields.StringField({ required: true }),
            dc: new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.NumberField({ required: true, integer: true }),
            }),
            attack: new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.NumberField({ required: true, integer: true }),
            }),
            mod: new fields.SchemaField({
              value: new fields.NumberField({ required: true, integer: true }),
            }),
            levels: new MappingField(
              new fields.SchemaField({
                value: new fields.StringField({ required: true }),
                spells: new MappingField(
                  new fields.SchemaField({
                    revealed: new fields.BooleanField({
                      required: true,
                      initial: false,
                    }),
                    label: new fields.StringField({ required: true }),
                    img: new fields.StringField({ required: true }),
                    actions: new fields.StringField({ required: true }),
                    defense: new fields.SchemaField(
                      {
                        statistic: new fields.StringField({}),
                        basic: new fields.BooleanField({}),
                      },
                      { required: false, nullable: true, initial: null },
                    ),
                    range: new fields.StringField({}),
                    traits: new fields.SchemaField({
                      rarity: new fields.StringField({ required: true }),
                      traditions: new fields.ArrayField(
                        new fields.StringField({}),
                      ),
                      values: new MappingField(
                        new fields.SchemaField({
                          value: new fields.StringField({ required: true }),
                        }),
                      ),
                    }),
                    description: new fields.SchemaField({
                      gm: new fields.HTMLField({ required: true }),
                      value: new fields.HTMLField({ required: true }),
                    }),
                  }),
                ),
              }),
            ),
          }),
        ),
      }),
      senses: new fields.SchemaField({
        perception: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          custom: new fields.StringField({ nullable: true }),
          value: new fields.NumberField({ required: true, integer: true }),
        }),
        details: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          value: new fields.StringField({ required: true }),
        }),
        senses: new MappingField(
          new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            fake: new fields.BooleanField({}),
            type: new fields.StringField({ required: true }),
            acuity: new fields.StringField({ required: true }),
            range: new fields.NumberField({ required: true, integer: true }),
          }),
        ),
      }),
      languages: new fields.SchemaField({
        details: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          value: new fields.StringField({ required: true }),
        }),
        values: new MappingField(
          new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            fake: new fields.BooleanField({}),
            empty: new fields.BooleanField({ initial: false }),
            value: new fields.StringField({ required: true }),
          }),
        ),
      }),
      notes: new fields.SchemaField({
        public: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
        private: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
        player: new fields.SchemaField({
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
        gm: new fields.SchemaField({
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
      }),
    };
  }

  get id() {
    if (!this.uuid) return null;
    const split = this.uuid.split(".");
    return split[split.length - 1];
  }

  actorBelongs = (actor) => {
    const sameNameDuplicates = game.settings.get(
      "pf2e-bestiary-tracking",
      "sameNameDuplicates",
    );
    return (
      this.uuid === actor.uuid ||
      this.actorState.actorDuplicates.some((x) => x === actor.uuid) ||
      (sameNameDuplicates && this.name.value === actor.name)
    );
  };

  get actorLinkOptions() {
    const useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );
    return this.actorLinks
      .reduce(
        (acc, link) => {
          const page = this.parent.parent.pages(link.pageId);
          if (page) {
            const image = useTokenArt ? page.system.texture : page.system.img;
            acc.push({
              page: page.uuid,
              actor: page.system.uuid,
              img: image,
              name: page.system.name.value,
              level: page.system.level.value,
            });
          }

          return acc;
        },
        [
          {
            page: this.parent.uuid,
            actor: this.uuid,
            img: useTokenArt ? this.texture : this.img,
            name: this.name.value,
            level: this.level.value,
            current: true,
            active: true,
          },
        ],
      )
      .sort((a, b) => {
        if (a.level === b.level) {
          if (a.name < b.name) return -1;
          else if (a.name > b.name) return 1;
          else return 0;
        }

        return a.level - b.level;
      });
  }

  get displayImage() {
    const { creature: imageSettings } = game.settings.get(
      "pf2e-bestiary-tracking",
      "image-settings",
    );

    return this.imageState.hideState === 2
      ? (this.imageState.hideImage ?? imageSettings.hideImage)
      : game.settings.get("pf2e-bestiary-tracking", "use-token-art")
        ? this.texture
        : this.img;
  }

  get sizeLabel() {
    return game.i18n.localize(CONFIG.PF2E.actorSizes[this.size]);
  }

  get allSenses() {
    const sensesDetails = this.senses.details.value
      ? {
          details: {
            ...this.senses.details,
            label: this.senses.details.value,
            isDetails: true,
          },
        }
      : {};
    return {
      perception: {
        ...this.senses.perception,
        value: `${this.senses.perception.value >= 0 ? "+" : "-"}${this.senses.perception.value}`,
        label: "PF2E.PerceptionLabel",
        isPerception: true,
      },
      ...sensesDetails,
      ...Object.keys(this.senses.senses).reduce((acc, sense) => {
        acc[sense] = {
          ...this.senses.senses[sense],
          label:
            CONFIG.PF2E.senses[this.senses.senses[sense].type] ??
            this.senses.senses[sense].type,
        };
        return acc;
      }, {}),
    };
  }

  get allLanguages() {
    const languageDetails = this.languages.details.value
      ? {
          details: {
            ...this.languages.details,
            label: this.languages.details.value,
            isDetails: true,
          },
        }
      : {};
    return {
      ...Object.keys(this.languages.values).reduce((acc, key) => {
        acc[`values.${key}`] = {
          ...this.languages.values[key],
          label:
            CONFIG.PF2E.languages[this.languages.values[key].value] ??
            this.languages.values[key].value,
        };

        return acc;
      }, {}),
      ...languageDetails,
    };
  }

  get allSpeeds() {
    const speedDetails = this.speeds.details.value
      ? { details: this.speeds.details }
      : {};
    return {
      ...Object.keys(this.speeds.values).reduce((acc, speed) => {
        acc[`values.${speed}`] = {
          ...this.speeds.values[speed],
          name: CONFIG.PF2E.speedTypes[this.speeds.values[speed].type],
        };

        return acc;
      }, {}),
      ...speedDetails,
    };
  }

  get sortedSpells() {
    return {
      fake: this.spells.fake,
      entries: Object.keys(this.spells.entries).reduce((acc, entry) => {
        acc[entry] = {
          ...this.spells.entries[entry],
          label: `${game.i18n.localize(CONFIG.PF2E.magicTraditions[this.spells.entries[entry].tradition])} ${game.i18n.localize(CONFIG.PF2E.preparationType[this.spells.entries[entry].category])} ${game.i18n.localize("PF2E.Item.Spell.Plural")}`,
          levels: Object.keys(this.spells.entries[entry].levels)
            .reduce((acc, levelKey) => {
              const level = this.spells.entries[entry].levels[levelKey];
              acc.push({
                ...level,
                key: levelKey,
                revealed: Object.values(level.spells).some((x) => x.revealed),
                label:
                  levelKey === "Cantrips"
                    ? game.i18n.localize(
                        "PF2E.Actor.Creature.Spellcasting.Cantrips",
                      )
                    : game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", {
                        rank: game.i18n.format("PF2E.OrdinalNumber", {
                          value: level.value,
                          suffix:
                            levelKey === "1"
                              ? "st"
                              : levelKey === "2"
                                ? "nd"
                                : levelKey === "3"
                                  ? "rd"
                                  : "th",
                        }),
                      }),
                spells: Object.keys(level.spells).reduce((acc, spell) => {
                  acc[spell] = {
                    ...level.spells[spell],
                    defense: !level.spells[spell].defense
                      ? null
                      : {
                          ...level.spells[spell].defense,
                          label: level.spells[spell].defense.basic
                            ? game.i18n.format(
                                "PF2E.InlineCheck.BasicWithSave",
                                {
                                  save: game.i18n.localize(
                                    CONFIG.PF2E.saves[
                                      level.spells[spell].defense.statistic
                                    ],
                                  ),
                                },
                              )
                            : game.i18n.localize(
                                CONFIG.PF2E.saves[
                                  level.spells[spell].defense.statistic
                                ],
                              ),
                        },
                  };

                  return acc;
                }, {}),
              });

              return acc;
            }, [])
            .sort((a, b) => {
              if (a.key === "Cantrips" && b.key !== "Cantrips") return -1;
              else if (a.key !== "Cantrips" && b.key === "Cantrips") return 1;
              else if (a.key === "Cantrips" && b.key === "Cantrips") return 0;

              return a.key - b.key;
            }),
        };

        return acc;
      }, {}),
    };
  }

  get displayedName() {
    return !this.name.revealed
      ? game.i18n.localize(
          "PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature",
        )
      : (this.name.custom ?? this.name.value);
  }

  get recallKnowledgeAttempts() {
    const partyCharacters =
      game.actors
        .find((x) => x.type === "party" && x.active)
        ?.system?.details?.members?.reduce((acc, x) => {
          const actor = game.actors.find((actor) => actor.uuid === x.uuid);
          if (
            actor.type !== "character" ||
            actor.system.traits.value.some(
              (x) => x === "eidolon" || x === "minion" || x === "npc",
            )
          )
            return acc;

          let nrValues = 4;
          if (
            this.recallKnowledge[actor.id] &&
            Object.keys(this.recallKnowledge[actor.id].attempts).length > 0
          ) {
            const filteredAttempts = Object.keys(
              this.recallKnowledge[actor.id].attempts,
            ).filter(
              (x) => this.recallKnowledge[actor.id].attempts[x] !== "none",
            );
            if (filteredAttempts.length > 0) {
              const highestIndex = Number.parseInt(
                filteredAttempts.sort(
                  (b, a) => Number.parseInt(a) - Number.parseInt(b),
                )[0],
              );
              const exactBase = Math.max(
                filteredAttempts.length / 4,
                highestIndex / 4,
              );
              const baseNr =
                Math.ceil(exactBase) === exactBase
                  ? exactBase + 1
                  : Math.ceil(exactBase);
              nrValues = baseNr * 4;
            }
          }

          acc.push({
            values: Array.from(Array(nrValues)).reduce((acc, key, index) => {
              acc[index] = recallKnowledgeOutcomes.none;
              return acc;
            }, {}),
            id: actor.id,
            name: actor.name,
          });

          return acc;
        }, []) ?? [];

    return partyCharacters.reduce((acc, character) => {
      const attempts = this.recallKnowledge[character.id]?.attempts ?? {};

      acc.push({
        values: Object.keys(character.values).reduce((acc, key) => {
          acc[key] = attempts[key]
            ? recallKnowledgeOutcomes[attempts[key]]
            : character.values[key];

          return acc;
        }, {}),
        id: character.id,
        name: character.name,
      });

      return acc;
    }, []);
  }

  get recallKnowledgeGeneral() {
    const skills = new Set([]);
    getCreaturesTypes(this.traits).forEach((type) => {
      const skillValues = identificationSkills[type.key];
      if (skillValues) {
        skillValues.forEach((skill) => {
          skills.add(game.i18n.localize(CONFIG.PF2E.skills[skill].label));
        });
      }
    });
    const label = Array.from(skills)
      .sort(alphaSort)
      .reduce((acc, skill, index) => {
        if (skills.length > 0 && index === skills.length - 1)
          acc = `${acc} or ${skill}`;
        else if (index > 0) acc = `${acc}, ${skill}`;
        else acc = acc.concat(skill);

        return acc;
      }, "");

    if (!label) return null;

    const rarityModifier = rarityModificationTable[this.rarity.value];
    const dc =
      levelDCTable[this.level.value] + Number.parseInt(rarityModifier.value);
    return `${label}: DC ${dc} (${game.i18n.localize(rarityModifier.label)})`;
  }

  get recallKnowledgeSpecific() {
    const rarityModifier = rarityModificationTable[this.rarity.value];
    const baseDC =
      levelDCTable[this.level.value] + Number.parseInt(rarityModifier.value);

    const applicableModDC = Object.values(dcModificationTable).find(
      (x) => x.order === Math.max(rarityModifier.order - 1, 0),
    );
    const baselineModDC = Object.values(dcModificationTable).find(
      (x) => x.order === Math.max(applicableModDC.order - 1, 0),
    );
    const applicableDC =
      baseDC +
      (Number.parseInt(applicableModDC.value) -
        Number.parseInt(rarityModifier.value));
    const baselineDC =
      applicableDC +
      (Number.parseInt(baselineModDC.value) -
        Number.parseInt(applicableModDC.value));

    return `Applicable Lore: DC ${applicableDC} (${game.i18n.localize(applicableModDC.label)}) or DC ${baselineDC} (${game.i18n.localize(baselineModDC.label)})`;
  }

  async importData(creaturePage) {
    await this.parent.update({
      system: {
        notes: creaturePage.system.notes,
        recallKnowledge: creaturePage.system.recallKnowledge,
      },
    });
  }

  async _getRefreshData(actor, creatureData) {
    const data = creatureData ?? (await getCreatureData(actor, this.isFromPC));

    const spells = data.system.spells.fake
      ? {
          fake: {
            ...data.system.spells.fake,
            revealed:
              this.spells.fake?.revealed ?? data.system.spells.fake.revealed,
          },
          entries: {},
        }
      : {
          entries: Object.keys(data.system.spells.entries).reduce(
            (acc, key) => {
              const entry = data.system.spells.entries[key];
              const oldEntry = this.spells.entries[key];
              acc[key] = {
                ...entry,
                revealed: oldEntry?.revealed ?? entry.revealed,
                dc: {
                  ...entry.dc,
                  revealed: oldEntry?.dc?.revealed ?? entry.dc.revealed,
                },
                attack: {
                  ...entry.attack,
                  revealed: oldEntry?.attack?.revealed ?? entry.attack.revealed,
                },
                levels: Object.keys(entry.levels).reduce((acc, key) => {
                  const { spells, ...rest } = entry.levels[key];
                  acc[key] = {
                    ...rest,
                    spells: Object.keys(entry.levels[key].spells).reduce(
                      (acc, spell) => {
                        const oldSpell =
                          oldEntry && oldEntry.levels[key]
                            ? oldEntry.levels[key].spells[spell]
                            : null;
                        acc[spell] = {
                          ...entry.levels[key].spells[spell],
                          revealed:
                            oldSpell?.revealed ??
                            entry.levels[key].spells[spell].revealed,
                        };

                        return acc;
                      },
                      {},
                    ),
                  };

                  return acc;
                }, {}),
              };

              return acc;
            },
            {},
          ),
        };

    return {
      name: data.name,
      system: {
        ...this,
        pcData: data.system.isFromPC
          ? {
              ...data.system.pcData,
              classDC: {
                ...data.system.pcData.classDC,
                dc: {
                  ...data.system.pcData.classDC.dc,
                  revealed: this.pcData.classDC.dc.revealed,
                },
                mod: {
                  ...data.system.pcData.classDC.mod,
                  revealed: this.pcData.classDC.mod.revealed,
                },
              },
            }
          : null,
        hidden: this.hidden,
        uuid: data.system.uuid,
        version: data.system.version,
        img: data.system.img,
        texture: data.system.texture,
        size: data.system.size,
        name: {
          ...data.system.name,
          revealed: this.name.revealed,
          custom: this.name.custom,
        },
        blurb: {
          ...data.system.blurb,
          revealed: this.blurb.revealed,
        },
        ac: {
          ...data.system.ac,
          revealed: this.ac.revealed,
          custom: this.ac.custom,
        },
        hp: {
          ...data.system.hp,
          revealed: this.hp.revealed,
          custom: this.hp.custom,
        },
        level: {
          ...data.system.level,
          revealed: this.level.revealed,
          custom: this.level.custom,
        },
        skills: Object.keys(data.system.skills).reduce((acc, key) => {
          acc[key] = {
            ...data.system.skills[key],
            revealed: this.skills[key]
              ? this.skills[key].revealed
              : data.system.skills[key].revealed,
          };
          return acc;
        }, {}),
        abilities: Object.keys(data.system.abilities).reduce((acc, key) => {
          acc[key] = {
            ...data.system.abilities[key],
            revealed: this.abilities[key]
              ? this.abilities[key].revealed
              : data.system.abilities[key].revealed,
          };
          return acc;
        }, {}),
        saves: Object.keys(data.system.saves).reduce((acc, key) => {
          acc[key] = {
            ...data.system.saves[key],
            revealed: this.saves[key]
              ? this.saves[key].revealed
              : data.system.saves[key].revealed,
          };
          return acc;
        }, {}),
        speeds: {
          details: {
            ...data.system.speeds.details,
            revealed: this.speeds.details.revealed,
          },
          values: Object.keys(data.system.speeds.values).reduce((acc, key) => {
            acc[key] = {
              ...data.system.speeds.values[key],
              revealed: this.speeds.values[key]
                ? this.speeds.values[key].revealed
                : data.system.speeds.values[key].revealed,
            };
            return acc;
          }, {}),
        },
        immunities: Object.keys(data.system.immunities).reduce(
          (acc, key) => {
            const immunity = data.system.immunities[key];
            const oldImmunity = this.immunities[key];
            acc[key] = {
              ...immunity,
              revealed: oldImmunity ? oldImmunity.revealed : immunity.revealed,
              exceptions: Object.keys(immunity.exceptions).reduce((acc, ex) => {
                acc[ex] = {
                  ...immunity.exceptions[ex],
                  revealed: oldImmunity?.exceptions[ex]
                    ? oldImmunity.exceptions[ex].revealed
                    : immunity.exceptions[ex].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.immunities).reduce((acc, key) => {
            if (this.immunities[key].fake) acc[key] = this.immunities[key];
            return acc;
          }, {}),
        ),
        weaknesses: Object.keys(data.system.weaknesses).reduce(
          (acc, key) => {
            const weakness = data.system.weaknesses[key];
            const oldWeakness = this.weaknesses[key];
            acc[key] = {
              ...weakness,
              revealed: oldWeakness ? oldWeakness.revealed : weakness.revealed,
              exceptions: Object.keys(weakness.exceptions).reduce((acc, ex) => {
                acc[ex] = {
                  ...weakness.exceptions[ex],
                  revealed: oldWeakness?.exceptions[ex]
                    ? oldWeakness.exceptions[ex].revealed
                    : weakness.exceptions[ex].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.weaknesses).reduce((acc, key) => {
            if (this.weaknesses[key].fake) acc[key] = this.weaknesses[key];
            return acc;
          }, {}),
        ),
        resistances: Object.keys(data.system.resistances).reduce(
          (acc, key) => {
            const resistance = data.system.resistances[key];
            const oldResistance = this.resistances[key];
            acc[key] = {
              ...resistance,
              revealed: oldResistance
                ? oldResistance.revealed
                : resistance.revealed,
              exceptions: Object.keys(resistance.exceptions).reduce(
                (acc, ex) => {
                  acc[ex] = {
                    ...resistance.exceptions[ex],
                    revealed: oldResistance?.exceptions[ex]
                      ? oldResistance.exceptions[ex].revealed
                      : resistance.exceptions[ex].revealed,
                  };
                  return acc;
                },
                {},
              ),
              doubleVs: Object.keys(resistance.doubleVs).reduce((acc, ex) => {
                acc[ex] = {
                  ...resistance.doubleVs[ex],
                  revealed: oldResistance?.doubleVs[ex]
                    ? oldResistance.doubleVs[ex].revealed
                    : resistance.doubleVs[ex].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.resistances).reduce((acc, key) => {
            if (this.resistances[key].fake) acc[key] = this.resistances[key];
            return acc;
          }, {}),
        ),
        rarity: { ...data.system.rarity, revealed: this.rarity.revealed },
        traits: Object.keys(data.system.traits).reduce((acc, key) => {
          acc[key] = {
            ...data.system.traits[key],
            revealed: this.traits[key]
              ? this.traits[key].revealed
              : data.system.traits[key].revealed,
          };
          return acc;
        }, {}),
        attacks: Object.keys(data.system.attacks).reduce(
          (acc, key) => {
            const attack = data.system.attacks[key];
            const oldAttack = this.attacks[key];
            acc[key] = {
              ...attack,
              revealed: oldAttack?.revealed ?? attack.revealed,
              damageStatsRevealed:
                oldAttack?.damageStatsRevealed ?? attack.damageStatsRevealed,
              traits: Object.keys(attack.traits).reduce((acc, trait) => {
                acc[trait] = {
                  ...attack.traits[trait],
                  revealed: oldAttack?.traits
                    ? (oldAttack.traits[trait]?.revealed ??
                      attack.traits[trait].revealed)
                    : attack.traits[trait].revealed,
                };
                return acc;
              }, {}),
              damageInstances: Object.keys(attack.damageInstances).reduce(
                (acc, damage) => {
                  acc[damage] = {
                    ...attack.damageInstances[damage],
                    revealed: oldAttack
                      ? (oldAttack.damageInstances[damage]?.revealed ??
                        attack.damageInstances[damage].revealed)
                      : attack.damageInstances[damage].revealed,
                    damageType: {
                      ...attack.damageInstances[damage].damageType,
                      revealed: oldAttack
                        ? (oldAttack.damageInstances[damage]?.damageType
                            ?.revealed ??
                          attack.damageInstances[damage].damageType.revealed)
                        : attack.damageInstances[damage].damageType.revealed,
                    },
                  };
                  return acc;
                },
                {},
              ),
            };

            return acc;
          },
          Object.keys(this.attacks).reduce((acc, key) => {
            if (this.attacks[key].fake) acc[key] = this.attacks[key];
            return acc;
          }, {}),
        ),
        actions: Object.keys(data.system.actions).reduce(
          (acc, key) => {
            const action = data.system.actions[key];
            const oldAction = this.actions[key];
            acc[key] = {
              ...action,
              revealed: oldAction?.revealed ?? action.revealed,
              traits: Object.keys(action.traits).reduce((acc, trait) => {
                const oldTrait = oldAction ? oldAction.traits[trait] : null;
                acc[trait] = {
                  ...action.traits[trait],
                  revealed: oldTrait?.revealed ?? action.traits[trait].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.actions).reduce((acc, key) => {
            if (this.actions[key].fake) acc[key] = this.actions[key];
            return acc;
          }, {}),
        ),
        passives: Object.keys(data.system.passives).reduce(
          (acc, key) => {
            const passive = data.system.passives[key];
            const oldPassive = this.passives[key];
            acc[key] = {
              ...passive,
              revealed: oldPassive?.revealed ?? passive.revealed,
              traits: Object.keys(passive.traits).reduce((acc, trait) => {
                const oldTrait = oldPassive ? oldPassive.traits[trait] : null;
                acc[trait] = {
                  ...passive.traits[trait],
                  revealed:
                    oldTrait?.revealed ?? passive.traits[trait].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.passives).reduce((acc, key) => {
            if (this.passives[key].fake) acc[key] = this.passives[key];
            return acc;
          }, {}),
        ),
        spells: spells,
        senses: {
          perception: {
            ...data.system.senses.perception,
            revealed: this.senses.perception.revealed,
            custom: this.senses.perception.custom,
          },
          details: {
            ...data.system.senses.details,
            revealed: this.senses.details.revealed,
          },
          senses: Object.keys(data.system.senses.senses).reduce(
            (acc, key) => {
              const sense = data.system.senses.senses[key];
              const oldSense = this.senses.senses[key];
              acc[key] = {
                ...sense,
                revealed: oldSense?.revealed ?? sense.revealed,
              };

              return acc;
            },
            Object.keys(this.senses.senses).reduce((acc, key) => {
              if (this.senses.senses[key].fake)
                acc[key] = this.senses.senses[key];
              return acc;
            }, {}),
          ),
        },
        languages: {
          details: {
            ...data.system.languages.details,
            revealed: this.languages.details.revealed,
          },
          values: Object.keys(data.system.languages.values).reduce(
            (acc, key) => {
              const language = data.system.languages.values[key];
              const oldLanguage = this.languages.values[key];
              acc[key] = {
                ...language,
                revealed: oldLanguage?.revealed ?? language.revealed,
              };

              return acc;
            },
            Object.keys(this.languages.values).reduce((acc, key) => {
              if (this.languages.values[key].fake)
                acc[key] = this.languages.values[key];
              return acc;
            }, {}),
          ),
        },
        notes: {
          public: {
            ...data.system.notes.public,
            revealed: this.notes.public.revealed,
          },
          private: {
            ...data.system.notes.private,
            revealed: this.notes.private.revealed,
          },
          player: this.notes.player,
        },
      },
    };
  }

  async refreshData() {
    const actor = await fromUuid(this.uuid);
    if (!actor) return false;

    const itemRules = {};
    for (var subItem of actor.items) {
      if (subItem.type === "effect") {
        itemRules[subItem.id] = subItem.system.rules;
        await subItem.update({ "system.rules": [] });
      }
    }

    const data = await this._getRefreshData(actor);
    await this.parent.update(data, {
      diff: false,
      recursive: false,
    });

    for (var key in itemRules) {
      await actor.items.get(key).update({ "system.rules": itemRules[key] });
    }

    return true;
  }

  _getToggleUpdate(state) {
    const spells = this.spells.fake
      ? { "spells.fake.revealed": state }
      : {
          "spells.entries": Object.keys(this.spells.entries).reduce(
            (acc, key) => {
              const entry = this.spells.entries[key];
              acc[key] = {
                revealed: state,
                dc: { revealed: state },
                attack: { revealed: state },
                levels: Object.keys(entry.levels).reduce((acc, level) => {
                  acc[level] = {
                    spells: Object.keys(entry.levels[level].spells).reduce(
                      (acc, level) => {
                        acc[level] = { revealed: state };
                        return acc;
                      },
                      {},
                    ),
                  };
                  return acc;
                }, {}),
              };
              return acc;
            },
            {},
          ),
        };

    const pcData = this.isFromPC
      ? {
          "pcData.classDC": {
            "dc.revealed": state,
            "mod.revealed": state,
          },
        }
      : {};

    return {
      system: {
        ...pcData,
        "name.revealed": state,
        "ac.revealed": state,
        "hp.revealed": state,
        "level.revealed": state,
        skills: Object.keys(this.skills).reduce((acc, key) => {
          acc[key] = { revealed: state };
          return acc;
        }, {}),
        abilities: Object.keys(this.abilities).reduce((acc, key) => {
          acc[key] = { revealed: state };
          return acc;
        }, {}),
        saves: {
          "fortitude.revealed": state,
          "reflex.revealed": state,
          "will.revealed": state,
        },
        speeds: {
          "details.revealed": state,
          values: Object.keys(this.speeds.values).reduce((acc, key) => {
            acc[key] = { revealed: state };
            return acc;
          }, {}),
        },
        immunities: Object.keys(this.immunities).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            exceptions: Object.keys(this.immunities[key].exceptions).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
          };

          return acc;
        }, {}),
        weaknesses: Object.keys(this.weaknesses).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            exceptions: Object.keys(this.weaknesses[key].exceptions).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
          };

          return acc;
        }, {}),
        resistances: Object.keys(this.resistances).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            exceptions: Object.keys(this.resistances[key].exceptions).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
            doubleVs: Object.keys(this.resistances[key].doubleVs).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
          };

          return acc;
        }, {}),
        "rarity.revealed": state,
        traits: Object.keys(this.traits).reduce((acc, key) => {
          acc[key] = { revealed: state };
          return acc;
        }, {}),
        attacks: Object.keys(this.attacks).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            damageStatsRevealed: state,
            traits: Object.keys(this.attacks[key].traits).reduce(
              (acc, trait) => {
                acc[trait] = { revealed: state };
                return acc;
              },
              {},
            ),
            damageInstances: Object.keys(
              this.attacks[key].damageInstances,
            ).reduce((acc, damage) => {
              acc[damage] = { damageType: { revealed: state } };
              return acc;
            }, {}),
          };
          return acc;
        }, {}),
        actions: Object.keys(this.actions).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            traits: Object.keys(this.actions[key].traits).reduce(
              (acc, trait) => {
                acc[trait] = { revealed: state };
                return acc;
              },
              {},
            ),
          };
          return acc;
        }, {}),
        passives: Object.keys(this.passives).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            traits: Object.keys(this.passives[key].traits).reduce(
              (acc, trait) => {
                acc[trait] = { revealed: state };
                return acc;
              },
              {},
            ),
          };
          return acc;
        }, {}),
        ...spells,
        senses: {
          "perception.revealed": state,
          "details.revealed": state,
          senses: Object.keys(this.senses.senses).reduce((acc, key) => {
            acc[key] = { revealed: state };
            return acc;
          }, {}),
        },
        languages: {
          "details.revealed": state,
          values: Object.keys(this.languages.values).reduce((acc, key) => {
            acc[key] = { revealed: state };
            return acc;
          }, {}),
        },
        notes: {
          "public.revealed": state,
          "private.revealed": state,
        },
      },
    };
  }

  async toggleEverything(state, npcView) {
    await this.parent.update(this._getToggleUpdate(state, npcView));
  }

  async transformToNPC() {
    const bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );
    if (!bestiary) return;

    const { npc: defaultRevealed } = game.settings.get(
      "pf2e-bestiary-tracking",
      "default-revealed",
    );

    const newEntity = await bestiary.createEmbeddedDocuments(
      "JournalEntryPage",
      [
        {
          name: this.parent.name,
          type: "pf2e-bestiary-tracking.npc",
          system: {
            ...this.parent.system,
            npcData: {
              categories: [],
              general: {
                background: { value: "", revealed: defaultRevealed.background },
                appearance: { value: "", revealed: defaultRevealed.appearance },
                personality: {
                  value: "",
                  revealed: defaultRevealed.personality,
                },
                height: { value: "", revealed: defaultRevealed.height },
                weight: { value: "", revealed: defaultRevealed.weight },
                birthplace: { value: "", revealed: defaultRevealed.birthplace },
                disposition: {},
              },
              influence: {
                premise: { value: "", revealed: defaultRevealed.premise },
                influencePoints: 0,
                discovery: {},
                influenceSkils: {},
                influence: {},
                resistances: {},
                weaknesses: {},
                penalties: {},
              },
            },
          },
        },
      ],
    );
    await this.parent.delete();

    return newEntity[0];
  }

  get initialType() {
    const types = getCreaturesTypes(this.traits).map((x) => x.key);
    return types.length > 0 ? types[0] : "unknown";
  }

  get initialActiveType() {
    const types = getCreaturesTypes(this.traits, true).map((x) => x.key);
    return types.length > 0 ? types[0] : "unknown";
  }

  prepareDerivedData() {
    const vagueDescriptions = game.settings.get(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
    );
    const activePartyMembers = game.actors.find(
      (x) => x.type === "party" && x.active,
    )?.system?.details?.members;
    const gmLevel =
      game.user.isGM && activePartyMembers
        ? Math.floor(
            activePartyMembers.reduce((acc, { uuid }) => {
              const actor = game.actors.find((x) => x.uuid === uuid);
              if (actor?.system?.details?.level?.value) {
                acc += actor.system.details.level.value;
              }

              return acc;
            }, 0) / activePartyMembers.length,
          )
        : null;
    const playerLevel = game.user.character
      ? game.user.character.system.details.level.value
      : null;
    const contextLevel = vagueDescriptions.settings.playerBased
      ? gmLevel && !Number.isNaN(gmLevel) && game.user.isGM
        ? gmLevel
        : (playerLevel ?? this.level.value)
      : this.level.value;

    this.ac.category = getCategoryLabel(acTable, contextLevel, this.ac.value);
    this.hp.category = getCategoryFromIntervals(
      hpTable,
      contextLevel,
      this.hp.value,
    );

    this.saves = {
      fortitude: {
        ...this.saves.fortitude,
        label: `${this.saves.fortitude.value > 0 ? "+" : ""}${this.saves.fortitude.value}`,
      },
      reflex: {
        ...this.saves.reflex,
        label: `${this.saves.reflex.value > 0 ? "+" : ""}${this.saves.reflex.value}`,
      },
      will: {
        ...this.saves.will,
        label: `${this.saves.will.value > 0 ? "+" : ""}${this.saves.will.value}`,
      },
    };
    if (vagueDescriptions.settings.simpleSaves) {
      setSimpleCategoryLabels(this.saves);
    } else {
      this.saves.fortitude.category = getCategoryLabel(
        savingThrowPerceptionTable,
        contextLevel,
        this.saves.fortitude.value,
        true,
      );
      this.saves.reflex.category = getCategoryLabel(
        savingThrowPerceptionTable,
        contextLevel,
        this.saves.reflex.value,
        true,
      );
      this.saves.will.category = getCategoryLabel(
        savingThrowPerceptionTable,
        contextLevel,
        this.saves.will.value,
        true,
      );
    }

    this.immunities = Object.keys(this.immunities).reduce((acc, key) => {
      const exceptionKeys = Object.keys(this.immunities[key].exceptions);
      const translatedLabel =
        CONFIG.PF2E.immunityTypes[this.immunities[key].type];
      acc[key] = {
        ...this.immunities[key],
        label: translatedLabel
          ? translatedLabel
          : (this.immunities[key].custom ?? this.immunities[key].type),
        exceptions: exceptionKeys.reduce((acc, exKey, index) => {
          const label =
            CONFIG.PF2E.immunityTypes[
              this.immunities[key].exceptions[exKey].type
            ];
          const suffix =
            index === exceptionKeys.length - 2
              ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or")
              : index < exceptionKeys.length - 1
                ? ","
                : index === exceptionKeys.length - 1
                  ? ")"
                  : "";

          acc[exKey] = {
            ...this.immunities[key].exceptions[exKey],
            label: label ?? this.immunities[key].exceptions[exKey].type,
            suffix: suffix,
          };
          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.weaknesses = Object.keys(this.weaknesses).reduce((acc, key) => {
      const exceptionKeys = Object.keys(this.weaknesses[key].exceptions);
      const translatedLabel =
        CONFIG.PF2E.weaknessTypes[this.weaknesses[key].type];

      acc[key] = {
        ...this.weaknesses[key],
        label: translatedLabel
          ? translatedLabel
          : (this.weaknesses[key].source ?? this.weaknesses[key].type),
        category: getCategoryLabel(
          weaknessTable,
          contextLevel,
          this.weaknesses[key].value,
          true,
        ),
        exceptions: exceptionKeys.reduce((acc, exKey, index) => {
          const label =
            CONFIG.PF2E.weaknessTypes[
              this.weaknesses[key].exceptions[exKey].type
            ];
          const suffix =
            index === exceptionKeys.length - 2
              ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or")
              : index < exceptionKeys.length - 1
                ? ","
                : index === exceptionKeys.length - 1
                  ? ")"
                  : "";

          acc[exKey] = {
            ...this.weaknesses[key].exceptions[exKey],
            label: label ?? this.weaknesses[key].exceptions[exKey].type,
            suffix: suffix,
          };
          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.resistances = Object.keys(this.resistances).reduce((acc, key) => {
      const exceptionKeys = Object.keys(this.resistances[key].exceptions);
      const doubleKeys = Object.keys(this.resistances[key].doubleVs);
      const translatedLabel =
        CONFIG.PF2E.resistanceTypes[this.resistances[key].type];

      acc[key] = {
        ...this.resistances[key],
        label: translatedLabel
          ? translatedLabel
          : (this.resistances[key].custom ?? this.resistances[key].type),
        category: getCategoryLabel(
          weaknessTable,
          contextLevel,
          this.resistances[key].value,
          true,
        ),
        exceptions: exceptionKeys.reduce((acc, exKey) => {
          const label =
            CONFIG.PF2E.resistanceTypes[
              this.resistances[key].exceptions[exKey].type
            ];

          acc[exKey] = {
            ...this.resistances[key].exceptions[exKey],
            label: label ?? this.resistances[key].exceptions[exKey].type,
          };
          return acc;
        }, {}),
        doubleVs: doubleKeys.reduce((acc, doubleKey) => {
          const label =
            CONFIG.PF2E.resistanceTypes[
              this.resistances[key].doubleVs[doubleKey].type
            ];

          acc[doubleKey] = {
            ...this.resistances[key].doubleVs[doubleKey],
            label: label ?? this.resistances[key].doubleVs[doubleKey].type,
          };
          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.traits = Object.keys(this.traits).reduce((acc, key) => {
      const label = CONFIG.PF2E.creatureTraits[this.traits[key].value];
      if (label) {
        acc[key] = {
          ...this.traits[key],
          label: CONFIG.PF2E.creatureTraits[this.traits[key].value],
        };
      }

      return acc;
    }, {});

    this.abilities = Object.keys(this.abilities).reduce((acc, key) => {
      acc[key] = {
        ...this.abilities[key],
        value: `${this.abilities[key].mod >= 0 ? "+" : ""}${this.abilities[key].mod}`,
        label: CONFIG.PF2E.abilities[this.abilities[key].key],
        category: getCategoryLabel(
          attributeTable,
          contextLevel,
          this.abilities[key].mod,
          true,
        ),
      };

      return acc;
    }, {});

    this.skills = Object.keys(this.skills).reduce((acc, key) => {
      const skill = this.skills[key];
      if (key === "empty" || skill.value > 0) {
        acc[key] = {
          ...skill,
          label: skill.lore
            ? skill.label
            : (CONFIG.PF2E.skills[key]?.label ??
              (key === "empty" ? skill.value : key)),
          category: getMixedCategoryLabel(
            skillTable,
            contextLevel,
            skill.totalModifier,
          ),
        };
      }

      return acc;
    }, {});

    this.attacks = Object.keys(this.attacks).reduce((acc, key) => {
      const traitKeys = Object.keys(this.attacks[key].traits);
      acc[key] = {
        ...this.attacks[key],
        category: getCategoryLabel(
          attackTable,
          contextLevel,
          this.attacks[key].totalModifier,
        ),
        range: this.attacks[key].isMelee
          ? "PF2E.NPCAttackMelee"
          : "PF2E.NPCAttackRanged",
        traits: traitKeys.reduce((acc, trait, index) => {
          acc[trait] = {
            ...this.attacks[key].traits[trait],
            label:
              CONFIG.PF2E.npcAttackTraits[
                this.attacks[key].traits[trait].value
              ] ?? this.attacks[key].traits[trait].value,
            description:
              CONFIG.PF2E.traitsDescriptions[
                this.attacks[key].traits[trait].description
              ] ?? this.attacks[key].traits[trait].description,
            suffix: index !== traitKeys.length - 1 ? ",&nbsp;" : ")",
          };
          return acc;
        }, {}),
        damageInstances: Object.keys(this.attacks[key].damageInstances).reduce(
          (acc, damage) => {
            const instance = this.attacks[key].damageInstances[damage];
            const average = getRollAverage(
              new Roll(instance.damage.value).terms,
            );
            acc[damage] = {
              ...instance,
              damage: {
                ...instance.damage,
                category: getCategoryLabel(damageTable, contextLevel, average),
              },
            };

            return acc;
          },
          {},
        ),
      };

      return acc;
    }, {});

    this.actions = Object.keys(this.actions).reduce((acc, key) => {
      const traitKeys = Object.keys(this.actions[key].traits);
      acc[key] = {
        ...this.actions[key],
        traits: traitKeys.reduce((acc, trait, index) => {
          acc[trait] = {
            ...this.actions[key].traits[trait],
            label:
              CONFIG.PF2E.actionTraits[this.actions[key].traits[trait].value] ??
              this.actions[key].traits[trait].value,
            description:
              CONFIG.PF2E.traitsDescriptions[
                this.actions[key].traits[trait].value
              ] ?? "",
            suffix: index !== traitKeys.length - 1 ? ",&nbsp;" : "",
          };

          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.passives = Object.keys(this.passives).reduce((acc, key) => {
      const traitKeys = Object.keys(this.passives[key].traits);
      acc[key] = {
        ...this.passives[key],
        traits: traitKeys.reduce((acc, trait, index) => {
          acc[trait] = {
            ...this.passives[key].traits[trait],
            label:
              CONFIG.PF2E.actionTraits[
                this.passives[key].traits[trait].value
              ] ?? this.passives[key].traits[trait].value,
            description:
              CONFIG.PF2E.traitsDescriptions[
                this.passives[key].traits[trait].value
              ] ?? "",
            suffix: index !== traitKeys.length - 1 ? ",&nbsp;" : "",
          };

          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.senses.perception.category = getCategoryLabel(
      savingThrowPerceptionTable,
      contextLevel,
      this.senses.perception.value,
    );

    this.spells.entries = Object.keys(this.spells.entries).reduce(
      (acc, key) => {
        acc[key] = {
          ...this.spells.entries[key],
          dc: {
            ...this.spells.entries[key].dc,
            category: getCategoryLabel(
              spellDCTable,
              contextLevel,
              this.spells.entries[key].dc.value,
            ),
          },
          attack: {
            ...this.spells.entries[key].attack,
            category: getCategoryLabel(
              spellAttackTable,
              contextLevel,
              this.spells.entries[key].attack.value,
            ),
          },
        };
        return acc;
      },
      {},
    );

    if (this.pcData) {
      const playerLevel = game.user.character
        ? game.user.character.system.details.level.value
        : null;
      const contextLevel = vagueDescriptions.settings.playerBased
        ? !Number.isNaN(gmLevel) && game.user.isGM
          ? gmLevel
          : (playerLevel ?? this.level.value)
        : this.level.value;

      this.pcData.classDC.mod.category = getCategoryLabel(
        attackTable,
        contextLevel,
        this.pcData.classDC.mod.value,
      );
      this.pcData.classDC.dc.category = this.pcData.classDC.mod.category;
    }
  }
}

class NPC extends Creature {
  static defineSchema() {
    const fields = foundry.data.fields;
    const creatureFields = super.defineSchema();
    return {
      ...creatureFields,
      tabStates: new fields.SchemaField({
        influence: new fields.SchemaField({
          hidden: new fields.BooleanField({ required: true, initial: true }),
        }),
      }),
      npcData: new fields.SchemaField({
        simple: new fields.BooleanField({ initial: false }),
        categories: new fields.ArrayField(
          new fields.SchemaField({
            hidden: new fields.BooleanField({}),
            value: new fields.StringField({ required: true }),
            name: new fields.StringField({ required: true }),
          }),
        ),
        general: new fields.SchemaField({
          background: new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            value: new fields.HTMLField({}),
          }),
          appearance: new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            value: new fields.StringField({}),
          }),
          personality: new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            value: new fields.StringField({}),
            data: new fields.SchemaField(
              {
                attitude: new fields.SchemaField({
                  revealed: new fields.BooleanField({
                    required: true,
                    initial: false,
                  }),
                  value: new fields.StringField({}),
                }),
                beliefs: new fields.SchemaField({
                  revealed: new fields.BooleanField({
                    required: true,
                    initial: false,
                  }),
                  value: new fields.StringField({}),
                }),
                edicts: new MappingField(
                  new fields.SchemaField({
                    revealed: new fields.BooleanField({
                      required: true,
                      initial: false,
                    }),
                    empty: new fields.BooleanField({ initial: false }),
                    value: new fields.StringField({}),
                  }),
                  { initial: [] },
                ),
                anathema: new MappingField(
                  new fields.SchemaField({
                    revealed: new fields.BooleanField({
                      required: true,
                      initial: false,
                    }),
                    empty: new fields.BooleanField({ initial: false }),
                    value: new fields.StringField({}),
                  }),
                  { initial: [] },
                ),
                likes: new fields.SchemaField({
                  revealed: new fields.BooleanField({
                    required: true,
                    initial: false,
                  }),
                  value: new fields.StringField({}),
                }),
                dislikes: new fields.SchemaField({
                  revealed: new fields.BooleanField({
                    required: true,
                    initial: false,
                  }),
                  value: new fields.StringField({}),
                }),
                catchphrases: new fields.SchemaField({
                  revealed: new fields.BooleanField({
                    required: true,
                    initial: false,
                  }),
                  value: new fields.StringField({}),
                }),
              },
              { nullable: true, initial: null },
            ),
          }),
          height: new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            value: new fields.StringField({}),
          }),
          weight: new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            value: new fields.StringField({}),
          }),
          birthplace: new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            value: new fields.StringField({}),
          }),
          disposition: new MappingField(
            new fields.StringField({
              required: true,
              choices: dispositions,
              initial: dispositions.indifferent.value,
            }),
          ),
        }),
        influence: new fields.SchemaField({
          premise: new fields.SchemaField({
            revealed: new fields.BooleanField({
              required: true,
              initial: false,
            }),
            value: new fields.HTMLField({}),
          }),
          influencePoints: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          discovery: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
              lore: new fields.BooleanField({ required: true, initial: false }),
              dc: new fields.NumberField({ required: true, integer: true }),
            }),
          ),
          influenceSkills: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
              lore: new fields.BooleanField({ required: true, initial: false }),
              dc: new fields.NumberField({ required: true, integer: true }),
              description: new fields.SchemaField({
                revealed: new fields.BooleanField({
                  required: true,
                  initial: false,
                }),
                value: new fields.StringField({ required: true }),
              }),
            }),
          ),
          influence: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              points: new fields.NumberField({ required: true, integer: true }),
              description: new fields.StringField({ required: true }),
            }),
          ),
          resistances: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              description: new fields.StringField({}),
              modifier: new fields.SchemaField({
                revealed: new fields.BooleanField({ initial: false }),
                value: new fields.NumberField({
                  integer: true,
                  nullable: true,
                  initial: null,
                }),
              }),
            }),
          ),
          weaknesses: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              description: new fields.StringField({}),
              modifier: new fields.SchemaField({
                revealed: new fields.BooleanField({ initial: false }),
                value: new fields.NumberField({
                  integer: true,
                  nullable: true,
                  initial: null,
                }),
              }),
            }),
          ),
          penalties: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              description: new fields.StringField({}),
              modifier: new fields.SchemaField({
                revealed: new fields.BooleanField({ initial: false }),
                value: new fields.NumberField({
                  integer: true,
                  nullable: true,
                  initial: null,
                }),
              }),
            }),
          ),
        }),
      }),
    };
  }

  get displayImage() {
    const { npc: imageSettings } = game.settings.get(
      "pf2e-bestiary-tracking",
      "image-settings",
    );

    return this.imageState.hideState === 2
      ? imageSettings.hideImage
      : game.settings.get("pf2e-bestiary-tracking", "use-token-art")
        ? this.texture
        : this.img;
  }

  get displayedName() {
    return !this.name.revealed
      ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.UnknownNPC")
      : (this.name.custom ?? this.name.value);
  }

  async importData(npcPage, settings) {
    await this.parent.update({
      system: {
        npcData: {
          general: settings.general
            ? npcPage.system.npcData.general
            : this.npcData.general,
          influence: settings.influence
            ? npcPage.system.npcData.influence
            : this.npcData.influence,
        },
        notes:
          settings.notes || settings.gm
            ? {
                public: settings.notes
                  ? npcPage.system.notes.public
                  : this.notes.public,
                private: settings.notes
                  ? npcPage.system.notes.private
                  : this.notes.private,
                player: settings.notes
                  ? npcPage.system.notes.player
                  : this.notes.player,
                gm: settings.gm ? npcPage.system.notes.gm : this.notes.gm,
              }
            : this.notes,
        recallKnowledge: settings.notes
          ? npcPage.system.recallKnowledge
          : this.recallKnowledge,
      },
    });
  }

  async _getRefreshData(actor) {
    const data = await getNPCData(actor, this.isFromPC);
    const creatureData = await super._getRefreshData(actor, data);
    return {
      ...creatureData,
      system: {
        ...creatureData.system,
        npcData: !this.isFromPC
          ? this.npcData
          : {
              ...this.npcData,
              general: {
                ...this.npcData.general,
                background: {
                  ...data.system.npcData.general.background,
                  revealed: this.npcData.general.background.revealed,
                },
                appearance: {
                  ...data.system.npcData.general.appearance,
                  revealed: this.npcData.general.appearance.revealed,
                },
                height: {
                  ...data.system.npcData.general.height,
                  revealed: this.npcData.general.height.revealed,
                },
                weight: {
                  ...data.system.npcData.general.weight,
                  revealed: this.npcData.general.weight.revealed,
                },
                personality: {
                  ...this.npcData.general.personality,
                  data: {
                    attitude: {
                      ...data.system.npcData.general.personality.data.attitude,
                      revealed:
                        this.npcData.general.personality.data.attitude.revealed,
                    },
                    beliefs: {
                      ...data.system.npcData.general.personality.data.beliefs,
                      revealed:
                        this.npcData.general.personality.data.beliefs.revealed,
                    },
                    likes: {
                      ...data.system.npcData.general.personality.data.likes,
                      revealed:
                        this.npcData.general.personality.data.likes.revealed,
                    },
                    dislikes: {
                      ...data.system.npcData.general.personality.data.dislikes,
                      revealed:
                        this.npcData.general.personality.data.dislikes.revealed,
                    },
                    catchphrases: {
                      ...data.system.npcData.general.personality.data
                        .catchphrases,
                      revealed:
                        this.npcData.general.personality.data.catchphrases
                          .revealed,
                    },
                    edicts: Object.keys(
                      data.system.npcData.general.personality.data.edicts,
                    ).reduce((acc, key) => {
                      const edict =
                        data.system.npcData.general.personality.data.edicts[
                          key
                        ];
                      acc[key] = {
                        ...edict,
                        revealed:
                          Object.values(
                            this.npcData.general.personality.data.edicts,
                          ).find((x) => x.value === edict.value)?.revealed ??
                          edict.revealed,
                      };
                      return acc;
                    }, {}),
                    anathema: Object.keys(
                      data.system.npcData.general.personality.data.anathema,
                    ).reduce((acc, key) => {
                      const anathema =
                        data.system.npcData.general.personality.data.anathema[
                          key
                        ];
                      acc[key] = {
                        ...anathema,
                        revealed:
                          Object.values(
                            this.npcData.general.personality.data.anathema,
                          ).find((x) => x.value === anathema.value)?.revealed ??
                          anathema.revealed,
                      };
                      return acc;
                    }, {}),
                  },
                },
                birthplace: {
                  ...data.system.npcData.general.birthplace,
                  revealed: this.npcData.general.birthplace.revealed,
                },
              },
            },
      },
    };
  }

  _getToggleUpdate(state, npcView) {
    if (npcView) {
      const personalityData = this.isFromPC
        ? {
            "personality.data": {
              "attitude.revealed": state,
              "beliefs.revealed": state,
              "likes.revealed": state,
              "dislikes.revealed": state,
              "catchphrases.revealed": state,
              edicts: Object.keys(
                this.npcData.general.personality.data.edicts,
              ).reduce((acc, key) => {
                acc[key] = { revealed: state };
                return acc;
              }, {}),
              anathema: Object.keys(
                this.npcData.general.personality.data.anathema,
              ).reduce((acc, key) => {
                acc[key] = { revealed: state };
                return acc;
              }, {}),
            },
          }
        : {};

      return {
        system: {
          npcData: {
            general: {
              "background.revealed": state,
              "appearance.revealed": state,
              "personality.revealed": state,
              ...personalityData,
              "height.revealed": state,
              "weight.revealed": state,
              "birthplace.revealed": state,
            },
            influence: {
              "premise.revealed": state,
              discovery: Object.keys(this.npcData.influence.discovery).reduce(
                (acc, key) => {
                  acc[key] = { revealed: state };
                  return acc;
                },
                {},
              ),
              influenceSkills: Object.keys(
                this.npcData.influence.influenceSkills,
              ).reduce((acc, key) => {
                acc[key] = { revealed: state };
                return acc;
              }, {}),
              influence: Object.keys(this.npcData.influence.influence).reduce(
                (acc, key) => {
                  acc[key] = { revealed: state };
                  return acc;
                },
                {},
              ),
              resistances: Object.keys(
                this.npcData.influence.resistances,
              ).reduce((acc, key) => {
                acc[key] = { revealed: state };
                return acc;
              }, {}),
              weaknesses: Object.keys(this.npcData.influence.weaknesses).reduce(
                (acc, key) => {
                  acc[key] = { revealed: state };
                  return acc;
                },
                {},
              ),
              penalties: Object.keys(this.npcData.influence.penalties).reduce(
                (acc, key) => {
                  acc[key] = { revealed: state };
                  return acc;
                },
                {},
              ),
            },
          },
        },
      };
    } else {
      return super._getToggleUpdate(state);
    }
  }

  get partyDispositions() {
    const partyCharacters =
      game.actors
        .find((x) => x.type === "party" && x.active)
        ?.system?.details?.members?.reduce((acc, x) => {
          const actor = game.actors.find((actor) => actor.uuid === x.uuid);
          if (
            actor.type !== "character" ||
            actor.system.traits.value.some(
              (x) => x === "eidolon" || x === "minion" || x === "npc",
            )
          )
            return acc;

          acc.push({
            value: dispositions.indifferent.value,
            id: actor.id,
            name: actor.name,
          });

          return acc;
        }, []) ?? [];
    return partyCharacters.reduce((acc, character) => {
      const disposition = this.npcData.general.disposition[character.id];
      acc.push({
        value: disposition ?? dispositions.indifferent.value,
        label: disposition
          ? dispositions[disposition].name
          : dispositions.indifferent.name,
        id: character.id,
        name: character.name,
      });

      return acc;
    }, []);
  }

  async transformToCreature() {
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("PF2EBestiary.Bestiary.NPC.TransformNPCTitle"),
      content: game.i18n.localize("PF2EBestiary.Bestiary.NPC.TransformNPCText"),
      yes: () => true,
      no: () => false,
    });

    if (!confirmed) return null;

    const bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );
    if (!bestiary) return;

    const { npcData, ...rest } = this.parent.system;
    const newEntity = await bestiary.createEmbeddedDocuments(
      "JournalEntryPage",
      [
        {
          name: this.parent.name,
          type: "pf2e-bestiary-tracking.creature",
          system: rest,
        },
      ],
    );
    await this.parent.delete();

    return newEntity[0];
  }

  get initialType() {
    const filteredCategories = game.user.isGM
      ? this.npcData.categories
      : this.npcData.categories.filter((x) => !x.hidden);
    return filteredCategories.length > 0
      ? filteredCategories[0].value
      : "unaffiliated";
  }

  get initialActiveType() {
    return this.initialType;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    this.npcData.influence.discovery = Object.keys(
      this.npcData.influence.discovery,
    ).reduce((acc, key) => {
      const discovery = this.npcData.influence.discovery[key];
      var type = discovery.type;
      if (discovery.lore) {
        type = slugify(type);
        if (!type.endsWith("-lore")) type = type.concat("-lore");
      }

      acc[key] = {
        ...discovery,
        label: `@Check[type:${type}|dc:${discovery.dc}|showDC:gm]`,
      };
      return acc;
    }, {});

    const resistanceModifier = Object.values(
      this.npcData.influence.resistances,
    ).reduce((acc, resistance) => {
      return resistance.modifier.value && resistance.modifier.revealed
        ? acc + resistance.modifier.value
        : acc;
    }, 0);
    const weaknessModifier = Object.values(
      this.npcData.influence.weaknesses,
    ).reduce((acc, weakness) => {
      return weakness.modifier.value && weakness.modifier.revealed
        ? acc + weakness.modifier.value
        : acc;
    }, 0);
    const penaltyModifier = Object.values(
      this.npcData.influence.penalties,
    ).reduce((acc, penalty) => {
      return penalty.modifier.value && penalty.modifier.revealed
        ? acc + penalty.modifier.value
        : acc;
    }, 0);
    const influenceModifier =
      resistanceModifier + weaknessModifier + penaltyModifier;

    this.npcData.influence.influenceSkills = Object.keys(
      this.npcData.influence.influenceSkills,
    ).reduce((acc, key) => {
      const influence = this.npcData.influence.influenceSkills[key];
      var type = influence.type;
      if (influence.lore) {
        type = slugify(type);
        if (!type.endsWith("-lore")) type = type.concat("-lore");
      }

      acc[key] = {
        ...influence,
        label: `@Check[type:${type}|dc:${influence.dc}|adjustment:${influenceModifier}|showDC:gm]`,
      };
      return acc;
    }, {});
  }
}

class Hazard extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      hidden: new fields.BooleanField({ required: true, initial: false }),
      uuid: new fields.StringField({ required: true }),
      version: new fields.StringField({ required: true }),
      img: new fields.StringField({ required: true }),
      texture: new fields.StringField({ required: true }),
      imageState: new fields.SchemaField({
        hideState: new fields.NumberField({
          required: true,
          integer: true,
          initial: 0,
        }),
        hideImage: new fields.StringField({ nullable: true, initial: null }),
      }),
      actorState: new fields.SchemaField({
        actorLinks: new fields.ArrayField(
          new fields.StringField({ required: true }),
        ),
        actorDuplicates: new fields.ArrayField(
          new fields.StringField({ required: true }),
        ),
      }),
      active: new fields.BooleanField({ required: true, initial: true }),
      recallKnowledge: new MappingField(
        new fields.SchemaField({
          attempts: new MappingField(new fields.StringField({})),
        }),
      ),
      name: toggleStringField(),
      publication: new fields.SchemaField({
        authors: new fields.StringField({}),
        license: new fields.StringField({}),
        remaster: new fields.BooleanField({}),
        title: new fields.StringField({}),
      }),
      isComplex: new fields.BooleanField({ required: true }),
      hasHealth: new fields.BooleanField({ required: true }),
      disable: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.HTMLField({}),
      }),
      routine: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.HTMLField({}),
      }),
      reset: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.HTMLField({}),
      }),
      ac: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.NumberField({
          required: true,
          integer: true,
          initial: 0,
        }),
        custom: new fields.StringField({ nullable: true }),
        details: new fields.StringField({}),
      }),
      hp: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.NumberField({
          required: true,
          integer: true,
          initial: 0,
        }),
        custom: new fields.StringField({ nullable: true }),
        temp: new fields.NumberField({ integer: true }),
        details: new fields.StringField({}),
        negativeHealing: new fields.BooleanField({}),
      }),
      hardness: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        custom: new fields.StringField({ nullable: true }),
        value: new fields.NumberField({
          required: true,
          integer: true,
          initial: 0,
        }),
      }),
      level: toggleNumberField(),
      stealth: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        custom: new fields.StringField({ nullable: true }),
        value: new fields.StringField({ required: true }),
        dc: new fields.StringField({ required: true }),
        modifiers: new fields.ArrayField(
          new fields.SchemaField({
            kind: new fields.StringField({}),
            label: new fields.StringField({}),
            modifier: new fields.NumberField({ integer: true }),
          }),
          { initial: [] },
        ),
        totalModifier: new fields.NumberField({
          required: false,
          integer: true,
        }),
        details: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          value: new fields.HTMLField({}),
        }),
      }),
      initiative: new fields.SchemaField(
        {
          revealed: new fields.BooleanField({ required: true, initial: false }),
          custom: new fields.StringField({ nullable: true }),
          value: new fields.StringField({ required: true }),
          modifiers: new fields.ArrayField(
            new fields.SchemaField({
              kind: new fields.StringField({}),
              label: new fields.StringField({}),
              modifier: new fields.NumberField({ integer: true }),
            }),
            { initial: [] },
          ),
          totalModifier: new fields.NumberField({
            required: false,
            integer: true,
          }),
        },
        { nullable: true },
      ),
      saves: new fields.SchemaField({
        fortitude: toggleNumberField(),
        reflex: toggleNumberField(),
        will: toggleNumberField(),
      }),
      attacks: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({}),
          damageStatsRevealed: new fields.BooleanField({
            required: true,
            initial: false,
          }),
          label: new fields.StringField({ required: true }),
          actions: new fields.StringField({ required: true }),
          totalModifier: new fields.NumberField({ required: true }),
          isMelee: new fields.BooleanField({ required: true }),
          additionalEffects: new MappingField(
            new fields.SchemaField({
              label: new fields.StringField({ required: true }),
              tag: new fields.StringField({ required: true }),
            }),
          ),
          traits: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.StringField({ required: true }),
              description: new fields.StringField({ required: true }),
            }),
          ),
          variants: new MappingField(
            new fields.SchemaField({
              label: new fields.StringField({}),
            }),
          ),
          damageInstances: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({}),
              category: new fields.StringField({ nullable: true }),
              damage: new fields.SchemaField({
                value: new fields.StringField({ nullable: true }),
              }),
              damageType: new fields.SchemaField({
                revealed: new fields.BooleanField({
                  required: true,
                  initial: false,
                }),
                value: new fields.StringField({ required: true }),
              }),
            }),
          ),
          rules: new fields.ObjectField({}),
        }),
      ),
      actions: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({}),
          label: new fields.StringField({ required: true }),
          category: new fields.StringField({}),
          deathNote: new fields.BooleanField({}),
          actions: new fields.StringField({ required: true }),
          traits: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.StringField({ required: true }),
            }),
          ),
          description: new fields.HTMLField({ required: true, initial: "" }),
        }),
      ),
      immunities: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      weaknesses: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          value: new fields.NumberField({ required: true, integer: true }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      resistances: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          value: new fields.NumberField({ required: true, integer: true }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
          doubleVs: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      rarity: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.StringField({ required: true }),
      }),
      traits: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({ intitial: false }),
          value: new fields.StringField({ required: true }),
        }),
      ),
      notes: new fields.SchemaField({
        description: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
        player: new fields.SchemaField({
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
      }),
    };
  }

  actorBelongs = (actor) => {
    const sameNameDuplicates = game.settings.get(
      "pf2e-bestiary-tracking",
      "sameNameDuplicates",
    );
    return (
      this.uuid === actor.uuid ||
      this.actorState.actorDuplicates.some((x) => x === actor.uuid) ||
      (sameNameDuplicates && this.name.value === actor.name)
    );
  };

  get actorLinkOptions() {
    const useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );
    return this.actorLinks
      .reduce(
        (acc, link) => {
          const page = this.parent.parent.pages(link.pageId);
          if (page) {
            const image = useTokenArt ? page.system.texture : page.system.img;
            acc.push({
              page: page.uuid,
              actor: page.system.uuid,
              img: image,
              name: page.system.name.value,
              level: page.system.level.value,
            });
          }

          return acc;
        },
        [
          {
            page: this.parent.uuid,
            actor: this.uuid,
            img: useTokenArt ? this.texture : this.img,
            name: this.name.value,
            level: this.level.value,
            current: true,
            active: true,
          },
        ],
      )
      .sort((a, b) => {
        if (a.level === b.level) {
          if (a.name < b.name) return -1;
          else if (a.name > b.name) return 1;
          else return 0;
        }

        return a.level - b.level;
      });
  }

  get displayImage() {
    const { hazard: imageSettings } = game.settings.get(
      "pf2e-bestiary-tracking",
      "image-settings",
    );

    return this.imageState.hideState === 2
      ? imageSettings.hideImage
      : game.settings.get("pf2e-bestiary-tracking", "use-token-art")
        ? this.texture
        : this.img;
  }

  get initialType() {
    const types = getHazardTypes(this.traits).map((x) => x.key);
    return types.length > 0 ? types[0] : "unknown";
  }

  get initialActiveType() {
    const types = getHazardTypes(this.traits, true).map((x) => x.key);
    return types.length > 0 ? types[0] : "unknown";
  }

  get displayedName() {
    return !this.name.revealed
      ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.UnknownHazard")
      : (this.name.custom ?? this.name.value);
  }

  get recallKnowledgeAttempts() {
    const partyCharacters =
      game.actors
        .find((x) => x.type === "party" && x.active)
        ?.system?.details?.members?.reduce((acc, x) => {
          const actor = game.actors.find((actor) => actor.uuid === x.uuid);
          if (
            actor.type !== "character" ||
            actor.system.traits.value.some(
              (x) => x === "eidolon" || x === "minion" || x === "npc",
            )
          )
            return acc;

          let nrValues = 4;
          if (
            this.recallKnowledge[actor.id] &&
            Object.keys(this.recallKnowledge[actor.id].attempts).length > 0
          ) {
            const filteredAttempts = Object.keys(
              this.recallKnowledge[actor.id].attempts,
            ).filter(
              (x) => this.recallKnowledge[actor.id].attempts[x] !== "none",
            );
            if (filteredAttempts.length > 0) {
              const highestIndex = Number.parseInt(
                filteredAttempts.sort(
                  (b, a) => Number.parseInt(a) - Number.parseInt(b),
                )[0],
              );
              const exactBase = Math.max(
                filteredAttempts.length / 4,
                highestIndex / 4,
              );
              const baseNr =
                Math.ceil(exactBase) === exactBase
                  ? exactBase + 1
                  : Math.ceil(exactBase);
              nrValues = baseNr * 4;
            }
          }

          acc.push({
            values: Array.from(Array(nrValues)).reduce((acc, key, index) => {
              acc[index] = recallKnowledgeOutcomes.none;
              return acc;
            }, {}),
            id: actor.id,
            name: actor.name,
          });

          return acc;
        }, []) ?? [];

    return partyCharacters.reduce((acc, character) => {
      const attempts = this.recallKnowledge[character.id]?.attempts ?? {};

      acc.push({
        values: Object.keys(character.values).reduce((acc, key) => {
          acc[key] = attempts[key]
            ? recallKnowledgeOutcomes[attempts[key]]
            : character.values[key];

          return acc;
        }, {}),
        id: character.id,
        name: character.name,
      });

      return acc;
    }, []);
  }

  get hasSaves() {
    return (
      this.saves.fortitude.value ||
      this.saves.reflex.value ||
      this.saves.will.value
    );
  }

  get hasAllSaves() {
    return (
      this.saves.fortitude.value &&
      this.saves.reflex.value &&
      this.saves.will.value
    );
  }

  async importData(hazardPage) {
    await this.parent.update({
      system: {
        notes: hazardPage.system.notes,
        recallKnowledge: hazardPage.system.recallKnowledge,
      },
    });
  }

  _getRefreshData(hazard, hazardData) {
    const data = hazardData ?? getHazardData(hazard);

    return {
      name: data.name,
      system: {
        ...this,
        hidden: this.hidden,
        uuid: data.system.uuid,
        version: data.system.version,
        img: data.system.img,
        texture: data.system.texture,
        name: {
          ...data.system.name,
          revealed: this.name.revealed,
          custom: this.name.custom,
        },
        hasHealth: data.system.hasHealth,
        isComplex: data.system.isComplex,
        disable: { ...data.system.disable, revealed: this.disable.revealed },
        routine: { ...data.system.routine, revealed: this.routine.revealed },
        reset: { ...data.system.reset, revealed: this.reset.revealed },
        ac: {
          ...data.system.ac,
          revealed: this.ac.revealed,
          custom: this.ac.custom,
        },
        hp: {
          ...data.system.hp,
          revealed: this.hp.revealed,
          custom: this.hp.custom,
        },
        hardness: {
          ...data.system.hardness,
          revealed: this.hardness.revealed,
          custom: this.hardness.custom,
        },
        level: {
          ...data.system.level,
          revealed: this.level.revealed,
          custom: this.level.custom,
        },
        stealth: {
          ...data.system.stealth,
          revealed: this.stealth.revealed,
          custom: this.stealth.custom,
          details: {
            ...data.system.stealth.details,
            revealed: this.stealth.details.revealed,
          },
        },
        initiative:
          data.system.initiative && !this.initiative
            ? data.system.initiative
            : data.system.initiative && this.initiative
              ? {
                  ...data.system.initiative,
                  revealed: this.initiative.revealed,
                  custom: this.initiative.custom,
                }
              : null,
        saves: Object.keys(data.system.saves).reduce((acc, key) => {
          acc[key] = {
            ...data.system.saves[key],
            revealed: this.saves[key]
              ? this.saves[key].revealed
              : data.system.saves[key].revealed,
          };
          return acc;
        }, {}),
        immunities: Object.keys(data.system.immunities).reduce(
          (acc, key) => {
            const immunity = data.system.immunities[key];
            const oldImmunity = this.immunities[key];
            acc[key] = {
              ...immunity,
              revealed: oldImmunity ? oldImmunity.revealed : immunity.revealed,
              exceptions: Object.keys(immunity.exceptions).reduce((acc, ex) => {
                acc[ex] = {
                  ...immunity.exceptions[ex],
                  revealed: oldImmunity?.exceptions[ex]
                    ? oldImmunity.exceptions[ex].revealed
                    : immunity.exceptions[ex].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.immunities).reduce((acc, key) => {
            if (this.immunities[key].fake) acc[key] = this.immunities[key];
            return acc;
          }, {}),
        ),
        weaknesses: Object.keys(data.system.weaknesses).reduce(
          (acc, key) => {
            const weakness = data.system.weaknesses[key];
            const oldWeakness = this.weaknesses[key];
            acc[key] = {
              ...weakness,
              revealed: oldWeakness ? oldWeakness.revealed : weakness.revealed,
              exceptions: Object.keys(weakness.exceptions).reduce((acc, ex) => {
                acc[ex] = {
                  ...weakness.exceptions[ex],
                  revealed: oldWeakness?.exceptions[ex]
                    ? oldWeakness.exceptions[ex].revealed
                    : weakness.exceptions[ex].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.weaknesses).reduce((acc, key) => {
            if (this.weaknesses[key].fake) acc[key] = this.weaknesses[key];
            return acc;
          }, {}),
        ),
        resistances: Object.keys(data.system.resistances).reduce(
          (acc, key) => {
            const resistance = data.system.resistances[key];
            const oldResistance = this.resistances[key];
            acc[key] = {
              ...resistance,
              revealed: oldResistance
                ? oldResistance.revealed
                : resistance.revealed,
              exceptions: Object.keys(resistance.exceptions).reduce(
                (acc, ex) => {
                  acc[ex] = {
                    ...resistance.exceptions[ex],
                    revealed: oldResistance?.exceptions[ex]
                      ? oldResistance.exceptions[ex].revealed
                      : resistance.exceptions[ex].revealed,
                  };
                  return acc;
                },
                {},
              ),
              doubleVs: Object.keys(resistance.doubleVs).reduce((acc, ex) => {
                acc[ex] = {
                  ...resistance.doubleVs[ex],
                  revealed: oldResistance?.doubleVs[ex]
                    ? oldResistance.doubleVs[ex].revealed
                    : resistance.doubleVs[ex].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.resistances).reduce((acc, key) => {
            if (this.resistances[key].fake) acc[key] = this.resistances[key];
            return acc;
          }, {}),
        ),
        rarity: { ...data.system.rarity, revealed: this.rarity.revealed },
        traits: Object.keys(data.system.traits).reduce((acc, key) => {
          acc[key] = {
            ...data.system.traits[key],
            revealed: this.traits[key]
              ? this.traits[key].revealed
              : data.system.traits[key].revealed,
          };
          return acc;
        }, {}),
        attacks: Object.keys(data.system.attacks).reduce(
          (acc, key) => {
            const attack = data.system.attacks[key];
            const oldAttack = this.attacks[key];
            acc[key] = {
              ...attack,
              revealed: oldAttack?.revealed ?? attack.revealed,
              damageStatsRevealed:
                oldAttack?.damageStatsRevealed ?? attack.damageStatsRevealed,
              traits: Object.keys(attack.traits).reduce((acc, trait) => {
                acc[trait] = {
                  ...attack.traits[trait],
                  revealed:
                    oldAttack.traits[trait]?.revealed ??
                    attack.traits[trait].revealed,
                };
                return acc;
              }, {}),
              damageInstances: Object.keys(attack.damageInstances).reduce(
                (acc, damage) => {
                  acc[damage] = {
                    ...attack.damageInstances[damage],
                    revealed: oldAttack
                      ? (oldAttack.damageInstances[damage]?.revealed ??
                        attack.damageInstances[damage].revealed)
                      : attack.damageInstances[damage].revealed,
                    damageType: {
                      ...attack.damageInstances[damage].damageType,
                      revealed: oldAttack
                        ? (oldAttack.damageInstances[damage]?.damageType
                            ?.revealed ??
                          attack.damageInstances[damage].damageType.revealed)
                        : attack.damageInstances[damage].damageType.revealed,
                    },
                  };
                  return acc;
                },
                {},
              ),
            };

            return acc;
          },
          Object.keys(this.attacks).reduce((acc, key) => {
            if (this.attacks[key].fake) acc[key] = this.attacks[key];
            return acc;
          }, {}),
        ),
        actions: Object.keys(data.system.actions).reduce(
          (acc, key) => {
            const action = data.system.actions[key];
            const oldAction = this.actions[key];
            acc[key] = {
              ...action,
              revealed: oldAction?.revealed ?? action.revealed,
              traits: Object.keys(action.traits).reduce((acc, trait) => {
                const oldTrait = oldAction ? oldAction.traits[trait] : null;
                acc[trait] = {
                  ...action.traits[trait],
                  revealed: oldTrait?.revealed ?? action.traits[trait].revealed,
                };
                return acc;
              }, {}),
            };

            return acc;
          },
          Object.keys(this.actions).reduce((acc, key) => {
            if (this.actions[key].fake) acc[key] = this.actions[key];
            return acc;
          }, {}),
        ),
        notes: {
          description: {
            ...data.system.notes.description,
            revealed: this.notes.description.revealed,
          },
          player: this.notes.player,
        },
      },
    };
  }

  async refreshData() {
    const actor = await fromUuid(this.uuid);
    if (!actor) return false;

    const itemRules = {};
    for (var subItem of actor.items) {
      if (subItem.type === "effect") {
        itemRules[subItem.id] = subItem.system.rules;
        await subItem.update({ "system.rules": [] });
      }
    }

    await this.parent.update(this._getRefreshData(actor), {
      diff: false,
      recursive: false,
    });

    for (var key in itemRules) {
      await actor.items.get(key).update({ "system.rules": itemRules[key] });
    }

    return true;
  }

  _getToggleUpdate(state) {
    return {
      system: {
        "name.revealed": state,
        "ac.revealed": state,
        "hp.revealed": state,
        "hardness.revealed": state,
        "level.revealed": state,
        "disable.revealed": state,
        "routine.revealed": state,
        "reset.revealed": state,
        "stealth.revealed": state,
        "stealth.details.revealed": state,
        initiative: this.initiative
          ? {
              revealed: state,
            }
          : null,
        saves: {
          "fortitude.revealed": state,
          "reflex.revealed": state,
          "will.revealed": state,
        },
        immunities: Object.keys(this.immunities).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            exceptions: Object.keys(this.immunities[key].exceptions).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
          };

          return acc;
        }, {}),
        weaknesses: Object.keys(this.weaknesses).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            exceptions: Object.keys(this.weaknesses[key].exceptions).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
          };

          return acc;
        }, {}),
        resistances: Object.keys(this.resistances).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            exceptions: Object.keys(this.resistances[key].exceptions).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
            doubleVs: Object.keys(this.resistances[key].doubleVs).reduce(
              (acc, ex) => {
                acc[ex] = { revealed: state };
                return acc;
              },
              {},
            ),
          };

          return acc;
        }, {}),
        "rarity.revealed": state,
        traits: Object.keys(this.traits).reduce((acc, key) => {
          acc[key] = { revealed: state };
          return acc;
        }, {}),
        attacks: Object.keys(this.attacks).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            damageStatsRevealed: state,
            traits: Object.keys(this.attacks[key].traits).reduce(
              (acc, trait) => {
                acc[trait] = { revealed: state };
                return acc;
              },
              {},
            ),
            damageInstances: Object.keys(
              this.attacks[key].damageInstances,
            ).reduce((acc, damage) => {
              acc[damage] = { damageType: { revealed: state } };
              return acc;
            }, {}),
          };
          return acc;
        }, {}),
        actions: Object.keys(this.actions).reduce((acc, key) => {
          acc[key] = {
            revealed: state,
            traits: Object.keys(this.actions[key].traits).reduce(
              (acc, trait) => {
                acc[trait] = { revealed: state };
                return acc;
              },
              {},
            ),
          };
          return acc;
        }, {}),
        notes: {
          "description.revealed": state,
        },
      },
    };
  }

  async toggleEverything(state, npcView) {
    await this.parent.update(this._getToggleUpdate(state, npcView));
  }

  prepareDerivedData() {
    const vagueDescriptions = game.settings.get(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
    );
    const activePartyMembers = game.actors.find(
      (x) => x.type === "party" && x.active,
    )?.system?.details?.members;
    const gmLevel =
      game.user.isGM && activePartyMembers
        ? Math.floor(
            activePartyMembers.reduce((acc, { uuid }) => {
              const actor = game.actors.find((x) => x.uuid === uuid);
              if (actor?.system?.details?.level?.value) {
                acc += actor.system.details.level.value;
              }

              return acc;
            }, 0) / activePartyMembers.length,
          )
        : null;
    const playerLevel = game.user.character
      ? game.user.character.system.details.level.value
      : null;
    const contextLevel = vagueDescriptions.settings.playerBased
      ? !Number.isNaN(gmLevel) && game.user.isGM
        ? gmLevel
        : (playerLevel ?? this.level.value)
      : this.level.value;

    this.ac.category = getCategoryLabel(acTable, contextLevel, this.ac.value);
    this.hp.category = getCategoryFromIntervals(
      hpTable,
      contextLevel,
      this.hp.value,
    );

    this.hardness.category = getMixedCategoryLabel(
      hardnessTable,
      contextLevel,
      this.hardness.value,
    );

    this.saves = {
      fortitude: {
        ...this.saves.fortitude,
        label: `${this.saves.fortitude.value > 0 ? "+" : ""}${this.saves.fortitude.value}`,
      },
      reflex: {
        ...this.saves.reflex,
        label: `${this.saves.reflex.value > 0 ? "+" : ""}${this.saves.reflex.value}`,
      },
      will: {
        ...this.saves.will,
        label: `${this.saves.will.value > 0 ? "+" : ""}${this.saves.will.value}`,
      },
    };
    if (vagueDescriptions.settings.simpleSaves) {
      setSimpleCategoryLabels(this.saves);
    } else {
      this.saves.fortitude.category = getCategoryLabel(
        savingThrowPerceptionTable,
        contextLevel,
        this.saves.fortitude.value,
        true,
      );
      this.saves.reflex.category = getCategoryLabel(
        savingThrowPerceptionTable,
        contextLevel,
        this.saves.reflex.value,
        true,
      );
      this.saves.will.category = getCategoryLabel(
        savingThrowPerceptionTable,
        contextLevel,
        this.saves.will.value,
        true,
      );
    }

    this.stealth.category = getMixedCategoryLabel(
      stealthDisableTable,
      contextLevel,
      Number.parseInt(this.stealth.dc),
    );
    if (this.initiative) {
      this.initiative.category = getMixedCategoryLabel(
        stealthDisableTable,
        contextLevel,
        Number.parseInt(this.initiative.dc),
      );
    }

    this.immunities = Object.keys(this.immunities).reduce((acc, key) => {
      const exceptionKeys = Object.keys(this.immunities[key].exceptions);
      const translatedLabel =
        CONFIG.PF2E.immunityTypes[this.immunities[key].type];
      acc[key] = {
        ...this.immunities[key],
        label: translatedLabel
          ? translatedLabel
          : (this.immunities[key].custom ?? this.immunities[key].type),
        exceptions: exceptionKeys.reduce((acc, exKey, index) => {
          const label =
            CONFIG.PF2E.immunityTypes[
              this.immunities[key].exceptions[exKey].type
            ];
          const suffix =
            index === exceptionKeys.length - 2
              ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or")
              : index < exceptionKeys.length - 1
                ? ","
                : index === exceptionKeys.length - 1
                  ? ")"
                  : "";

          acc[exKey] = {
            ...this.immunities[key].exceptions[exKey],
            label: label ?? this.immunities[key].exceptions[exKey].type,
            suffix: suffix,
          };
          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.weaknesses = Object.keys(this.weaknesses).reduce((acc, key) => {
      const exceptionKeys = Object.keys(this.weaknesses[key].exceptions);
      const translatedLabel =
        CONFIG.PF2E.weaknessTypes[this.weaknesses[key].type];

      acc[key] = {
        ...this.weaknesses[key],
        label: translatedLabel
          ? translatedLabel
          : (this.weaknesses[key].source ?? this.weaknesses[key].type),
        category: getCategoryLabel(
          weaknessTable,
          contextLevel,
          this.weaknesses[key].value,
          true,
        ),
        exceptions: exceptionKeys.reduce((acc, exKey, index) => {
          const label =
            CONFIG.PF2E.weaknessTypes[
              this.weaknesses[key].exceptions[exKey].type
            ];
          const suffix =
            index === exceptionKeys.length - 2
              ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or")
              : index < exceptionKeys.length - 1
                ? ","
                : index === exceptionKeys.length - 1
                  ? ")"
                  : "";

          acc[exKey] = {
            ...this.weaknesses[key].exceptions[exKey],
            label: label ?? this.weaknesses[key].exceptions[exKey].type,
            suffix: suffix,
          };
          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.resistances = Object.keys(this.resistances).reduce((acc, key) => {
      const exceptionKeys = Object.keys(this.resistances[key].exceptions);
      const doubleKeys = Object.keys(this.resistances[key].doubleVs);
      const translatedLabel =
        CONFIG.PF2E.resistanceTypes[this.resistances[key].type];

      acc[key] = {
        ...this.resistances[key],
        label: translatedLabel
          ? translatedLabel
          : (this.resistances[key].custom ?? this.resistances[key].type),
        category: getCategoryLabel(
          weaknessTable,
          contextLevel,
          this.resistances[key].value,
          true,
        ),
        exceptions: exceptionKeys.reduce((acc, exKey) => {
          const label =
            CONFIG.PF2E.resistanceTypes[
              this.resistances[key].exceptions[exKey].type
            ];

          acc[exKey] = {
            ...this.resistances[key].exceptions[exKey],
            label: label ?? this.resistances[key].exceptions[exKey].type,
          };
          return acc;
        }, {}),
        doubleVs: doubleKeys.reduce((acc, doubleKey) => {
          const label =
            CONFIG.PF2E.resistanceTypes[
              this.resistances[key].doubleVs[doubleKey].type
            ];

          acc[doubleKey] = {
            ...this.resistances[key].doubleVs[doubleKey],
            label: label ?? this.resistances[key].doubleVs[doubleKey].type,
          };
          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.traits = Object.keys(this.traits).reduce((acc, key) => {
      const label = CONFIG.PF2E.hazardTraits[this.traits[key].value];
      if (label) {
        acc[key] = {
          ...this.traits[key],
          label: CONFIG.PF2E.hazardTraits[this.traits[key].value],
        };
      }

      return acc;
    }, {});

    this.attacks = Object.keys(this.attacks).reduce((acc, key) => {
      const traitKeys = Object.keys(this.attacks[key].traits);
      acc[key] = {
        ...this.attacks[key],
        category: getCategoryLabel(
          attackTable,
          contextLevel,
          this.attacks[key].totalModifier,
        ),
        range: this.attacks[key].isMelee
          ? "PF2E.NPCAttackMelee"
          : "PF2E.NPCAttackRanged",
        traits: traitKeys.reduce((acc, trait, index) => {
          acc[trait] = {
            ...this.attacks[key].traits[trait],
            label:
              CONFIG.PF2E.npcAttackTraits[
                this.attacks[key].traits[trait].value
              ] ?? this.attacks[key].traits[trait].value,
            description:
              CONFIG.PF2E.traitsDescriptions[
                this.attacks[key].traits[trait].description
              ] ?? this.attacks[key].traits[trait].description,
            suffix: index !== traitKeys.length - 1 ? ",&nbsp;" : ")",
          };
          return acc;
        }, {}),
        damageInstances: Object.keys(this.attacks[key].damageInstances).reduce(
          (acc, damage) => {
            const instance = this.attacks[key].damageInstances[damage];
            const average = getRollAverage(
              new Roll(instance.damage.value).terms,
            );
            acc[damage] = {
              ...instance,
              damage: {
                ...instance.damage,
                category: getCategoryLabel(damageTable, contextLevel, average),
              },
            };

            return acc;
          },
          {},
        ),
      };

      return acc;
    }, {});

    this.actions = Object.keys(this.actions).reduce((acc, key) => {
      const traitKeys = Object.keys(this.actions[key].traits);
      acc[key] = {
        ...this.actions[key],
        traits: traitKeys.reduce((acc, trait, index) => {
          acc[trait] = {
            ...this.actions[key].traits[trait],
            label:
              CONFIG.PF2E.actionTraits[this.actions[key].traits[trait].value] ??
              this.actions[key].traits[trait].value,
            description:
              CONFIG.PF2E.traitsDescriptions[
                this.actions[key].traits[trait].value
              ] ?? "",
            suffix: index !== traitKeys.length - 1 ? ",&nbsp;" : "",
          };

          return acc;
        }, {}),
      };

      return acc;
    }, {});

    this.stealth.value = this.stealth.dc;
  }
}

/*
Tagify v4.27.0 - tags input component
By: Yair Even-Or <vsync.design@gmail.com>
https://github.com/yairEO/tagify

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

This Software may not be rebranded and sold as a library under any other name
other than "Tagify" (by owner) or as part of another library.
*/

var t="&#8203;";function e(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function i(t){return function(t){if(Array.isArray(t))return e(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,i){if(!t)return;if("string"==typeof t)return e(t,i);var n=Object.prototype.toString.call(t).slice(8,-1);"Object"===n&&t.constructor&&(n=t.constructor.name);if("Map"===n||"Set"===n)return Array.from(n);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return e(t,i)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}var n={isEnabled:function(){var t;return null===(t=window.TAGIFY_DEBUG)||void 0===t||t},log:function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];var s;this.isEnabled()&&(s=console).log.apply(s,["[Tagify]:"].concat(i(e)));},warn:function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];var s;this.isEnabled()&&(s=console).warn.apply(s,["[Tagify]:"].concat(i(e)));}},s=function(t,e,i,n){return t=""+t,e=""+e,n&&(t=t.trim(),e=e.trim()),i?t==e:t.toLowerCase()==e.toLowerCase()},a=function(t,e){return t&&Array.isArray(t)&&t.map((function(t){return o(t,e)}))};function o(t,e){var i,n={};for(i in t)e.indexOf(i)<0&&(n[i]=t[i]);return n}function r(t){var e=document.createElement("div");return t.replace(/\&#?[0-9a-z]+;/gi,(function(t){return e.innerHTML=t,e.innerText}))}function l(t){return (new DOMParser).parseFromString(t.trim(),"text/html").body.firstElementChild}function d(t,e){for(e=e||"previous";t=t[e+"Sibling"];)if(3==t.nodeType)return t}function c(t){return "string"==typeof t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/`|'/g,"&#039;"):t}function u(t){var e=Object.prototype.toString.call(t).split(" ")[1].slice(0,-1);return t===Object(t)&&"Array"!=e&&"Function"!=e&&"RegExp"!=e&&"HTMLUnknownElement"!=e}function g(t,e,i){var n,s;function a(t,e){for(var i in e)if(e.hasOwnProperty(i)){if(u(e[i])){u(t[i])?a(t[i],e[i]):t[i]=Object.assign({},e[i]);continue}if(Array.isArray(e[i])){t[i]=Object.assign([],e[i]);continue}t[i]=e[i];}}return n=t,(null!=(s=Object)&&"undefined"!=typeof Symbol&&s[Symbol.hasInstance]?s[Symbol.hasInstance](n):n instanceof s)||(t={}),a(t,e),i&&a(t,i),t}function h(){var t=[],e={},i=!0,n=!1,s=void 0;try{for(var a,o=arguments[Symbol.iterator]();!(i=(a=o.next()).done);i=!0){var r=a.value,l=!0,d=!1,c=void 0;try{for(var g,h=r[Symbol.iterator]();!(l=(g=h.next()).done);l=!0){var p=g.value;u(p)?e[p.value]||(t.push(p),e[p.value]=1):t.includes(p)||t.push(p);}}catch(t){d=!0,c=t;}finally{try{l||null==h.return||h.return();}finally{if(d)throw c}}}}catch(t){n=!0,s=t;}finally{try{i||null==o.return||o.return();}finally{if(n)throw s}}return t}function p(t){return String.prototype.normalize?"string"==typeof t?t.normalize("NFD").replace(/[\u0300-\u036f]/g,""):void 0:t}var f=function(){return /(?=.*chrome)(?=.*android)/i.test(navigator.userAgent)};function m(){return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,(function(t){return (t^crypto.getRandomValues(new Uint8Array(1))[0]&15>>t/4).toString(16)}))}function v(t){return t&&t.classList&&t.classList.contains(this.settings.classNames.tag)}function b(t){return t&&t.closest(this.settings.classNames.tagSelector)}function w(t,e){var i=window.getSelection();return e=e||i.getRangeAt(0),"string"==typeof t&&(t=document.createTextNode(t)),e&&(e.deleteContents(),e.insertNode(t)),t}function y(t,e,i){return t?(e&&(t.__tagifyTagData=i?e:g({},t.__tagifyTagData||{},e)),t.__tagifyTagData):(n.warn("tag element doesn't exist",{tagElm:t,data:e}),e)}function T(t){if(t&&t.parentNode){var e=t,i=window.getSelection(),n=i.getRangeAt(0);i.rangeCount&&(n.setStartAfter(e),n.collapse(!0),i.removeAllRanges(),i.addRange(n));}}function O(t,e){t.forEach((function(t){if(y(t.previousSibling)||!t.previousSibling){var i=document.createTextNode("​");t.before(i),e&&T(i);}}));}var x$1={delimiters:",",pattern:null,tagTextProp:"value",maxTags:1/0,callbacks:{},addTagOnBlur:!0,addTagOn:["blur","tab","enter"],onChangeAfterBlur:!0,duplicates:!1,whitelist:[],blacklist:[],enforceWhitelist:!1,userInput:!0,focusable:!0,keepInvalidTags:!1,createInvalidTags:!0,mixTagsAllowedAfter:/,|\.|\:|\s/,mixTagsInterpolator:["[[","]]"],backspace:!0,skipInvalid:!1,pasteAsTags:!0,editTags:{clicks:2,keepInvalid:!0},transformTag:function(){},trim:!0,a11y:{focusableTags:!1},mixMode:{insertAfterTag:" "},autoComplete:{enabled:!0,rightKey:!1,tabKey:!1},classNames:{namespace:"tagify",mixMode:"tagify--mix",selectMode:"tagify--select",input:"tagify__input",focus:"tagify--focus",tagNoAnimation:"tagify--noAnim",tagInvalid:"tagify--invalid",tagNotAllowed:"tagify--notAllowed",scopeLoading:"tagify--loading",hasMaxTags:"tagify--hasMaxTags",hasNoTags:"tagify--noTags",empty:"tagify--empty",inputInvalid:"tagify__input--invalid",dropdown:"tagify__dropdown",dropdownWrapper:"tagify__dropdown__wrapper",dropdownHeader:"tagify__dropdown__header",dropdownFooter:"tagify__dropdown__footer",dropdownItem:"tagify__dropdown__item",dropdownItemActive:"tagify__dropdown__item--active",dropdownItemHidden:"tagify__dropdown__item--hidden",dropdownItemSelected:"tagify__dropdown__item--selected",dropdownInital:"tagify__dropdown--initial",tag:"tagify__tag",tagText:"tagify__tag-text",tagX:"tagify__tag__removeBtn",tagLoading:"tagify__tag--loading",tagEditing:"tagify__tag--editable",tagFlash:"tagify__tag--flash",tagHide:"tagify__tag--hide"},dropdown:{classname:"",enabled:2,maxItems:10,searchKeys:["value","searchBy"],fuzzySearch:!0,caseSensitive:!1,accentedSearch:!0,includeSelectedTags:!1,escapeHTML:!0,highlightFirst:!0,closeOnSelect:!0,clearOnSelect:!0,position:"all",appendTarget:null},hooks:{beforeRemoveTag:function(){return Promise.resolve()},beforePaste:function(){return Promise.resolve()},suggestionClick:function(){return Promise.resolve()},beforeKeyDown:function(){return Promise.resolve()}}};function D(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function S(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){D(t,e,i[e]);}));}return t}function I(t,e){return e=null!=e?e:{},Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),i.push.apply(i,n);}return i}(Object(e)).forEach((function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i));})),t}function M(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function E(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function N(t){return function(t){if(Array.isArray(t))return M(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return M(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return M(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function _(){for(var t in this.dropdown={},this._dropdown)this.dropdown[t]="function"==typeof this._dropdown[t]?this._dropdown[t].bind(this):this._dropdown[t];this.dropdown.refs(),this.DOM.dropdown.__tagify=this;}var A,C,k,L=(A=function(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){E(t,e,i[e]);}));}return t}({},{events:{binding:function(){var t=!(arguments.length>0&&void 0!==arguments[0])||arguments[0],e=this.dropdown.events.callbacks,i=this.listeners.dropdown=this.listeners.dropdown||{position:this.dropdown.position.bind(this,null),onKeyDown:e.onKeyDown.bind(this),onMouseOver:e.onMouseOver.bind(this),onMouseLeave:e.onMouseLeave.bind(this),onClick:e.onClick.bind(this),onScroll:e.onScroll.bind(this)},n=t?"addEventListener":"removeEventListener";"manual"!=this.settings.dropdown.position&&(document[n]("scroll",i.position,!0),window[n]("resize",i.position),window[n]("keydown",i.onKeyDown)),this.DOM.dropdown[n]("mouseover",i.onMouseOver),this.DOM.dropdown[n]("mouseleave",i.onMouseLeave),this.DOM.dropdown[n]("mousedown",i.onClick),this.DOM.dropdown.content[n]("scroll",i.onScroll);},callbacks:{onKeyDown:function(t){var e=this;if(this.state.hasFocus&&!this.state.composing){var i=this.settings,s=this.DOM.dropdown.querySelector(i.classNames.dropdownItemActiveSelector),a=this.dropdown.getSuggestionDataByNode(s),o="mix"==i.mode,r="select"==i.mode;i.hooks.beforeKeyDown(t,{tagify:this}).then((function(l){switch(t.key){case"ArrowDown":case"ArrowUp":case"Down":case"Up":t.preventDefault();var d=e.dropdown.getAllSuggestionsRefs(),c="ArrowUp"==t.key||"Up"==t.key;s&&(s=e.dropdown.getNextOrPrevOption(s,!c)),s&&s.matches(i.classNames.dropdownItemSelector)||(s=d[c?d.length-1:0]),e.dropdown.highlightOption(s,!0);break;case"Escape":case"Esc":e.dropdown.hide();break;case"ArrowRight":if(e.state.actions.ArrowLeft||i.autoComplete.rightKey)return;case"Tab":var u=!i.autoComplete.rightKey||!i.autoComplete.tabKey;if(!o&&!r&&s&&u&&!e.state.editing&&a){t.preventDefault();var g=e.dropdown.getMappedValue(a);return e.input.autocomplete.set.call(e,g),!1}return !0;case"Enter":t.preventDefault(),i.hooks.suggestionClick(t,{tagify:e,tagData:a,suggestionElm:s}).then((function(){if(s)return e.dropdown.selectOption(s),s=e.dropdown.getNextOrPrevOption(s,!c),void e.dropdown.highlightOption(s);e.dropdown.hide(),o||e.addTags(e.state.inputText.trim(),!0);})).catch((function(t){return n.warn(t)}));break;case"Backspace":if(o||e.state.editing.scope)return;var h=e.input.raw.call(e);""!=h&&8203!=h.charCodeAt(0)||(!0===i.backspace?e.removeTags():"edit"==i.backspace&&setTimeout(e.editTag.bind(e),0));}}));}},onMouseOver:function(t){var e=t.target.closest(this.settings.classNames.dropdownItemSelector);this.dropdown.highlightOption(e);},onMouseLeave:function(t){this.dropdown.highlightOption();},onClick:function(t){var e=this;if(0==t.button&&t.target!=this.DOM.dropdown&&t.target!=this.DOM.dropdown.content){var i=t.target.closest(this.settings.classNames.dropdownItemSelector),s=this.dropdown.getSuggestionDataByNode(i);this.state.actions.selectOption=!0,setTimeout((function(){return e.state.actions.selectOption=!1}),50),this.settings.hooks.suggestionClick(t,{tagify:this,tagData:s,suggestionElm:i}).then((function(){i?e.dropdown.selectOption(i,t):e.dropdown.hide();})).catch((function(t){return n.warn(t)}));}},onScroll:function(t){var e=t.target,i=e.scrollTop/(e.scrollHeight-e.parentNode.clientHeight)*100;this.trigger("dropdown:scroll",{percentage:Math.round(i)});}}},refilter:function(t){t=t||this.state.dropdown.query||"",this.suggestedListItems=this.dropdown.filterListItems(t),this.dropdown.fill(),this.suggestedListItems.length||this.dropdown.hide(),this.trigger("dropdown:updated",this.DOM.dropdown);},getSuggestionDataByNode:function(t){for(var e,i=t&&t.getAttribute("value"),n=this.suggestedListItems.length;n--;){if(u(e=this.suggestedListItems[n])&&e.value==i)return e;if(e==i)return {value:e}}},getNextOrPrevOption:function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],i=this.dropdown.getAllSuggestionsRefs(),n=i.findIndex((function(e){return e===t}));return e?i[n+1]:i[n-1]},highlightOption:function(t,e){var i,n=this.settings.classNames.dropdownItemActive;if(this.state.ddItemElm&&(this.state.ddItemElm.classList.remove(n),this.state.ddItemElm.removeAttribute("aria-selected")),!t)return this.state.ddItemData=null,this.state.ddItemElm=null,void this.input.autocomplete.suggest.call(this);i=this.dropdown.getSuggestionDataByNode(t),this.state.ddItemData=i,this.state.ddItemElm=t,t.classList.add(n),t.setAttribute("aria-selected",!0),e&&(t.parentNode.scrollTop=t.clientHeight+t.offsetTop-t.parentNode.clientHeight),this.settings.autoComplete&&(this.input.autocomplete.suggest.call(this,i),this.dropdown.position());},selectOption:function(t,e){var i=this,n=this.settings,s=n.dropdown,a=s.clearOnSelect,o=s.closeOnSelect;if(!t)return this.addTags(this.state.inputText,!0),void(o&&this.dropdown.hide());e=e||{};var r=t.getAttribute("value"),l="noMatch"==r,d="mix"==n.mode,c=this.suggestedListItems.find((function(t){var e;return (null!==(e=t.value)&&void 0!==e?e:t)==r}));if(this.trigger("dropdown:select",{data:c,elm:t,event:e}),r&&(c||l)){if(this.state.editing){var u=this.normalizeTags([c])[0];c=n.transformTag.call(this,u)||u,this.onEditTagDone(null,g({__isValid:!0},c));}else this[d?"addMixTags":"addTags"]([c||this.input.raw.call(this)],a);(d||this.DOM.input.parentNode)&&(setTimeout((function(){i.DOM.input.focus(),i.toggleFocusClass(!0);})),o&&setTimeout(this.dropdown.hide.bind(this)),t.addEventListener("transitionend",(function(){i.dropdown.fillHeaderFooter(),setTimeout((function(){t.remove(),i.dropdown.refilter();}),100);}),{once:!0}),t.classList.add(this.settings.classNames.dropdownItemHidden));}else o&&setTimeout(this.dropdown.hide.bind(this));},selectAll:function(t){this.suggestedListItems.length=0,this.dropdown.hide(),this.dropdown.filterListItems("");var e=this.dropdown.filterListItems("");return t||(e=this.state.dropdown.suggestions),this.addTags(e,!0),this},filterListItems:function(t,e){var i,n,s,a,o,r,l=function(){var t,l,d=void 0,c=void 0;t=m[y],n=(null!=(l=Object)&&"undefined"!=typeof Symbol&&l[Symbol.hasInstance]?l[Symbol.hasInstance](t):t instanceof l)?m[y]:{value:m[y]};var v,b=!Object.keys(n).some((function(t){return w.includes(t)}))?["value"]:w;g.fuzzySearch&&!e.exact?(a=b.reduce((function(t,e){return t+" "+(n[e]||"")}),"").toLowerCase().trim(),g.accentedSearch&&(a=p(a),r=p(r)),d=0==a.indexOf(r),c=a===r,v=a,s=r.toLowerCase().split(" ").every((function(t){return v.includes(t.toLowerCase())}))):(d=!0,s=b.some((function(t){var i=""+(n[t]||"");return g.accentedSearch&&(i=p(i),r=p(r)),g.caseSensitive||(i=i.toLowerCase()),c=i===r,e.exact?i===r:0==i.indexOf(r)}))),o=!g.includeSelectedTags&&i.isTagDuplicate(u(n)?n.value:n),s&&!o&&(c&&d?f.push(n):"startsWith"==g.sortby&&d?h.unshift(n):h.push(n));},d=this,c=this.settings,g=c.dropdown,h=(e=e||{},[]),f=[],m=c.whitelist,v=g.maxItems>=0?g.maxItems:1/0,b=g.includeSelectedTags||"select"==c.mode,w=g.searchKeys,y=0;if(!(t="select"==c.mode&&this.value.length&&this.value[0][c.tagTextProp]==t?"":t)||!w.length)return h=b?m:m.filter((function(t){return !d.isTagDuplicate(u(t)?t.value:t)})),this.state.dropdown.suggestions=h,h.slice(0,v);for(r=g.caseSensitive?""+t:(""+t).toLowerCase();y<m.length;y++)i=this,l();return this.state.dropdown.suggestions=f.concat(h),"function"==typeof g.sortby?g.sortby(f.concat(h),r):f.concat(h).slice(0,v)},getMappedValue:function(t){var e=this.settings.dropdown.mapValueTo;return e?"function"==typeof e?e(t):t[e]||t.value:t.value},createListHTML:function(t){var e=this;return g([],t).map((function(t,i){"string"!=typeof t&&"number"!=typeof t||(t={value:t});var n=e.dropdown.getMappedValue(t);return n="string"==typeof n&&e.settings.dropdown.escapeHTML?c(n):n,e.settings.templates.dropdownItem.apply(e,[I(S({},t),{mappedValue:n}),e])})).join("")}}),C=null!=(C={refs:function(){this.DOM.dropdown=this.parseTemplate("dropdown",[this.settings]),this.DOM.dropdown.content=this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-wrapper']");},getHeaderRef:function(){return this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-header']")},getFooterRef:function(){return this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-footer']")},getAllSuggestionsRefs:function(){return N(this.DOM.dropdown.content.querySelectorAll(this.settings.classNames.dropdownItemSelector))},show:function(t){var e,i,n,a=this,o=this.settings,r="mix"==o.mode&&!o.enforceWhitelist,l=!o.whitelist||!o.whitelist.length,d="manual"==o.dropdown.position;if(t=void 0===t?this.state.inputText:t,!(l&&!r&&!o.templates.dropdownItemNoMatch||!1===o.dropdown.enable||this.state.isLoading||this.settings.readonly)){if(clearTimeout(this.dropdownHide__bindEventsTimeout),this.suggestedListItems=this.dropdown.filterListItems(t),t&&!this.suggestedListItems.length&&(this.trigger("dropdown:noMatch",t),o.templates.dropdownItemNoMatch&&(n=o.templates.dropdownItemNoMatch.call(this,{value:t}))),!n){if(this.suggestedListItems.length)t&&r&&!this.state.editing.scope&&!s(this.suggestedListItems[0].value,t)&&this.suggestedListItems.unshift({value:t});else {if(!t||!r||this.state.editing.scope)return this.input.autocomplete.suggest.call(this),void this.dropdown.hide();this.suggestedListItems=[{value:t}];}i=""+(u(e=this.suggestedListItems[0])?e.value:e),o.autoComplete&&i&&0==i.indexOf(t)&&this.input.autocomplete.suggest.call(this,e);}this.dropdown.fill(n),o.dropdown.highlightFirst&&this.dropdown.highlightOption(this.DOM.dropdown.content.querySelector(o.classNames.dropdownItemSelector)),this.state.dropdown.visible||setTimeout(this.dropdown.events.binding.bind(this)),this.state.dropdown.visible=t||!0,this.state.dropdown.query=t,this.setStateSelection(),d||setTimeout((function(){a.dropdown.position(),a.dropdown.render();})),setTimeout((function(){a.trigger("dropdown:show",a.DOM.dropdown);}));}},hide:function(t){var e=this,i=this.DOM,n=i.scope,s=i.dropdown,a="manual"==this.settings.dropdown.position&&!t;if(s&&document.body.contains(s)&&!a)return window.removeEventListener("resize",this.dropdown.position),this.dropdown.events.binding.call(this,!1),n.setAttribute("aria-expanded",!1),s.parentNode.removeChild(s),setTimeout((function(){e.state.dropdown.visible=!1;}),100),this.state.dropdown.query=this.state.ddItemData=this.state.ddItemElm=this.state.selection=null,this.state.tag&&this.state.tag.value.length&&(this.state.flaggedTags[this.state.tag.baseOffset]=this.state.tag),this.trigger("dropdown:hide",s),this},toggle:function(t){this.dropdown[this.state.dropdown.visible&&!t?"hide":"show"]();},getAppendTarget:function(){var t=this.settings.dropdown;return "function"==typeof t.appendTarget?t.appendTarget():t.appendTarget},render:function(){var t,e,i,n=this,s=(t=this.DOM.dropdown,(i=t.cloneNode(!0)).style.cssText="position:fixed; top:-9999px; opacity:0",document.body.appendChild(i),e=i.clientHeight,i.parentNode.removeChild(i),e),a=this.settings,o="number"==typeof a.dropdown.enabled&&a.dropdown.enabled>=0,r=this.dropdown.getAppendTarget();return o?(this.DOM.scope.setAttribute("aria-expanded",!0),document.body.contains(this.DOM.dropdown)||(this.DOM.dropdown.classList.add(a.classNames.dropdownInital),this.dropdown.position(s),r.appendChild(this.DOM.dropdown),setTimeout((function(){return n.DOM.dropdown.classList.remove(a.classNames.dropdownInital)}))),this):this},fill:function(t){t="string"==typeof t?t:this.dropdown.createListHTML(t||this.suggestedListItems);var e,i=this.settings.templates.dropdownContent.call(this,t);this.DOM.dropdown.content.innerHTML=(e=i)?e.replace(/\>[\r\n ]+\</g,"><").split(/>\s+</).join("><").trim():"";},fillHeaderFooter:function(){var t=this.dropdown.filterListItems(this.state.dropdown.query),e=this.parseTemplate("dropdownHeader",[t]),i=this.parseTemplate("dropdownFooter",[t]),n=this.dropdown.getHeaderRef(),s=this.dropdown.getFooterRef();e&&(null==n||n.parentNode.replaceChild(e,n)),i&&(null==s||s.parentNode.replaceChild(i,s));},position:function(t){var e=this.settings.dropdown,i=this.dropdown.getAppendTarget();if("manual"!=e.position&&i){var n,s,a,o,r,l,d,c,u,g=this.DOM.dropdown,h=e.RTL,p=i===document.body,f=i===this.DOM.scope,m=p?window.pageYOffset:i.scrollTop,v=document.fullscreenElement||document.webkitFullscreenElement||document.documentElement,b=v.clientHeight,w=Math.max(v.clientWidth||0,window.innerWidth||0)>480?e.position:"all",y=this.DOM["input"==w?"input":"scope"];if(t=t||g.clientHeight,this.state.dropdown.visible){if("text"==w?(a=(n=function(){var t=document.getSelection();if(t.rangeCount){var e,i,n=t.getRangeAt(0),s=n.startContainer,a=n.startOffset;if(a>0)return (i=document.createRange()).setStart(s,a-1),i.setEnd(s,a),{left:(e=i.getBoundingClientRect()).right,top:e.top,bottom:e.bottom};if(s.getBoundingClientRect)return s.getBoundingClientRect()}return {left:-9999,top:-9999}}()).bottom,s=n.top,o=n.left,r="auto"):(l=function(t){var e=0,i=0;for(t=t.parentNode;t&&t!=v;)e+=t.offsetTop||0,i+=t.offsetLeft||0,t=t.parentNode;return {top:e,left:i}}(i),n=y.getBoundingClientRect(),s=f?-1:n.top-l.top,a=(f?n.height:n.bottom-l.top)-1,o=f?-1:n.left-l.left,r=n.width+"px"),!p){var T=function(){for(var t=0,i=e.appendTarget.parentNode;i;)t+=i.scrollTop||0,i=i.parentNode;return t}();s+=T,a+=T;}var O;s=Math.floor(s),a=Math.ceil(a),c=((d=null!==(O=e.placeAbove)&&void 0!==O?O:b-n.bottom<t)?s:a)+m,u="left: ".concat(o+(h&&n.width||0)+window.pageXOffset,"px;"),g.style.cssText="".concat(u,"; top: ").concat(c,"px; min-width: ").concat(r,"; max-width: ").concat(r),g.setAttribute("placement",d?"top":"bottom"),g.setAttribute("position",w);}}}})?C:{},Object.getOwnPropertyDescriptors?Object.defineProperties(A,Object.getOwnPropertyDescriptors(C)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),i.push.apply(i,n);}return i}(Object(C)).forEach((function(t){Object.defineProperty(A,t,Object.getOwnPropertyDescriptor(C,t));})),A),j="@yaireo/tagify/",P={empty:"empty",exceed:"number of tags exceeded",pattern:"pattern mismatch",duplicate:"already exists",notAllowed:"not allowed"},V={wrapper:function(e,i){return '<tags class="'.concat(i.classNames.namespace," ").concat(i.mode?"".concat(i.classNames[i.mode+"Mode"]):""," ").concat(e.className,'"\n                    ').concat(i.readonly?"readonly":"","\n                    ").concat(i.disabled?"disabled":"","\n                    ").concat(i.required?"required":"","\n                    ").concat("select"===i.mode?"spellcheck='false'":"",'\n                    tabIndex="-1">\n                    ').concat(this.settings.templates.input.call(this),"\n                ").concat(t,"\n        </tags>")},input:function(){var e=this.settings,i=e.placeholder||t;return "<span ".concat(!e.readonly&&e.userInput?"contenteditable":"",' tabIndex="0" data-placeholder="').concat(i,'" aria-placeholder="').concat(e.placeholder||"",'"\n                    class="').concat(e.classNames.input,'"\n                    role="textbox"\n                    autocapitalize="false"\n                    autocorrect="off"\n                    spellcheck="false"\n                    aria-autocomplete="both"\n                    aria-multiline="').concat("mix"==e.mode,'"></span>')},tag:function(t,e){var i=e.settings;return '<tag title="'.concat(t.title||t.value,"\"\n                    contenteditable='false'\n                    tabIndex=\"").concat(i.a11y.focusableTags?0:-1,'"\n                    class="').concat(i.classNames.tag," ").concat(t.class||"",'"\n                    ').concat(this.getAttributes(t),">\n            <x title='' tabIndex=\"").concat(i.a11y.focusableTags?0:-1,'" class="').concat(i.classNames.tagX,"\" role='button' aria-label='remove tag'></x>\n            <div>\n                <span ").concat("select"===i.mode&&i.userInput?"contenteditable='true'":"",' autocapitalize="false" autocorrect="off" spellcheck=\'false\' class="').concat(i.classNames.tagText,'">').concat(t[i.tagTextProp]||t.value,"</span>\n            </div>\n        </tag>")},dropdown:function(t){var e=t.dropdown,i="manual"==e.position;return '<div class="'.concat(i?"":t.classNames.dropdown," ").concat(e.classname,'" role="listbox" aria-labelledby="dropdown" dir="').concat(e.RTL?"rtl":"","\">\n                    <div data-selector='tagify-suggestions-wrapper' class=\"").concat(t.classNames.dropdownWrapper,'"></div>\n                </div>')},dropdownContent:function(t){var e=this.settings.templates,i=this.state.dropdown.suggestions;return "\n            ".concat(e.dropdownHeader.call(this,i),"\n            ").concat(t,"\n            ").concat(e.dropdownFooter.call(this,i),"\n        ")},dropdownItem:function(t){return "<div ".concat(this.getAttributes(t),"\n                    class='").concat(this.settings.classNames.dropdownItem," ").concat(this.isTagDuplicate(t.value)?this.settings.classNames.dropdownItemSelected:""," ").concat(t.class||"",'\'\n                    tabindex="0"\n                    role="option">').concat(t.mappedValue||t.value,"</div>")},dropdownHeader:function(t){return "<header data-selector='tagify-suggestions-header' class=\"".concat(this.settings.classNames.dropdownHeader,'"></header>')},dropdownFooter:function(t){var e=t.length-this.settings.dropdown.maxItems;return e>0?"<footer data-selector='tagify-suggestions-footer' class=\"".concat(this.settings.classNames.dropdownFooter,'">\n                ').concat(e," more items. Refine your search.\n            </footer>"):""},dropdownItemNoMatch:null};function F(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function R(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function H(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){var i=null==t?null:"undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(null!=i){var n,s,a=[],o=!0,r=!1;try{for(i=i.call(t);!(o=(n=i.next()).done)&&(a.push(n.value),!e||a.length!==e);o=!0);}catch(t){r=!0,s=t;}finally{try{o||null==i.return||i.return();}finally{if(r)throw s}}return a}}(t,e)||function(t,e){if(!t)return;if("string"==typeof t)return F(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return F(t,e)}(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function B(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function W(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function K(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function U(t,e){return e=null!=e?e:{},Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),i.push.apply(i,n);}return i}(Object(e)).forEach((function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i));})),t}function q(t){return function(t){if(Array.isArray(t))return B(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return B(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return B(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}var z={customBinding:function(){var t=this;this.customEventsList.forEach((function(e){t.on(e,t.settings.callbacks[e]);}));},binding:function(){var t,e=!(arguments.length>0&&void 0!==arguments[0])||arguments[0],i=this.settings,n=this.events.callbacks,s=e?"addEventListener":"removeEventListener";if(!this.state.mainEvents||!e){for(var a in this.state.mainEvents=e,e&&!this.listeners.main&&(this.events.bindGlobal.call(this),this.settings.isJQueryPlugin&&jQuery(this.DOM.originalInput).on("tagify.removeAllTags",this.removeAllTags.bind(this))),t=this.listeners.main=this.listeners.main||{keydown:["input",n.onKeydown.bind(this)],click:["scope",n.onClickScope.bind(this)],dblclick:"select"!=i.mode&&["scope",n.onDoubleClickScope.bind(this)],paste:["input",n.onPaste.bind(this)],drop:["input",n.onDrop.bind(this)],compositionstart:["input",n.onCompositionStart.bind(this)],compositionend:["input",n.onCompositionEnd.bind(this)]})t[a]&&this.DOM[t[a][0]][s](a,t[a][1]);var o=this.listeners.main.inputMutationObserver||new MutationObserver(n.onInputDOMChange.bind(this));o.disconnect(),"mix"==i.mode&&o.observe(this.DOM.input,{childList:!0}),this.events.bindOriginaInputListener.call(this);}},bindOriginaInputListener:function(t){var e=(t||0)+500;this.listeners.main&&(clearInterval(this.listeners.main.originalInputValueObserverInterval),this.listeners.main.originalInputValueObserverInterval=setInterval(this.events.callbacks.observeOriginalInputValue.bind(this),e));},bindGlobal:function(t){var e,i=this.events.callbacks,n=t?"removeEventListener":"addEventListener";if(this.listeners&&(t||!this.listeners.global)){this.listeners.global=this.listeners.global||[{type:this.isIE?"keydown":"input",target:this.DOM.input,cb:i[this.isIE?"onInputIE":"onInput"].bind(this)},{type:"keydown",target:window,cb:i.onWindowKeyDown.bind(this)},{type:"focusin",target:this.DOM.scope,cb:i.onFocusBlur.bind(this)},{type:"focusout",target:this.DOM.scope,cb:i.onFocusBlur.bind(this)},{type:"click",target:document,cb:i.onClickAnywhere.bind(this),useCapture:!0}];var s=!0,a=!1,o=void 0;try{for(var r,l=this.listeners.global[Symbol.iterator]();!(s=(r=l.next()).done);s=!0)(e=r.value).target[n](e.type,e.cb,!!e.useCapture);}catch(t){a=!0,o=t;}finally{try{s||null==l.return||l.return();}finally{if(a)throw o}}}},unbindGlobal:function(){this.events.bindGlobal.call(this,!0);},callbacks:{onFocusBlur:function(t){var e,i,n=this.settings,s=b.call(this,t.target),a=v.call(this,t.target),o=t.target.classList.contains(n.classNames.tagX),r="focusin"==t.type,l="focusout"==t.type;s&&r&&!a&&!o&&this.toggleFocusClass(this.state.hasFocus=+new Date);var d=t.target?this.trim(this.DOM.input.textContent):"",c=null===(i=this.value)||void 0===i||null===(e=i[0])||void 0===e?void 0:e[n.tagTextProp],u=n.dropdown.enabled>=0,g={relatedTarget:t.relatedTarget},h=this.state.actions.selectOption&&(u||!n.dropdown.closeOnSelect),p=this.state.actions.addNew&&u;if(l){if(t.relatedTarget===this.DOM.scope)return this.dropdown.hide(),void this.DOM.input.focus();this.postUpdate(),n.onChangeAfterBlur&&this.triggerChangeEvent();}if(!(h||p||o))if(r||s?(this.state.hasFocus=+new Date,this.toggleFocusClass(this.state.hasFocus)):this.state.hasFocus=!1,"mix"!=n.mode){if(r){if(!n.focusable)return;var f=0===n.dropdown.enabled&&!this.state.dropdown.visible;return this.toggleFocusClass(!0),this.trigger("focus",g),void(!f||a&&"select"!==n.mode||this.dropdown.show(this.value.length?"":void 0))}if(l){if(this.trigger("blur",g),this.loading(!1),"select"==n.mode){if(this.value.length){var m=this.getTagElms()[0];d=this.trim(m.textContent);}c===d&&(d="");}d&&!this.state.actions.selectOption&&n.addTagOnBlur&&n.addTagOn.includes("blur")&&this.addTags(d,!0);}s||(this.DOM.input.removeAttribute("style"),this.dropdown.hide());}else r?this.trigger("focus",g):l&&(this.trigger("blur",g),this.loading(!1),this.dropdown.hide(),this.state.dropdown.visible=void 0,this.setStateSelection());},onCompositionStart:function(t){this.state.composing=!0;},onCompositionEnd:function(t){this.state.composing=!1;},onWindowKeyDown:function(t){var e,i=this.settings,n=document.activeElement,s=b.call(this,n)&&this.DOM.scope.contains(document.activeElement),a=s&&n.hasAttribute("readonly");if(this.state.hasFocus||s&&!a){e=n.nextElementSibling;var o=t.target.classList.contains(i.classNames.tagX);switch(t.key){case"Backspace":i.readonly||this.state.editing||(this.removeTags(n),(e||this.DOM.input).focus());break;case"Enter":if(o)return void this.removeTags(t.target.parentNode);i.a11y.focusableTags&&v.call(this,n)&&setTimeout(this.editTag.bind(this),0,n);break;case"ArrowDown":this.state.dropdown.visible||"mix"==i.mode||this.dropdown.show();}}},onKeydown:function(t){var e=this,i=this.settings;if(!this.state.composing&&i.userInput){"select"==i.mode&&i.enforceWhitelist&&this.value.length&&"Tab"!=t.key&&t.preventDefault();var n=this.trim(t.target.textContent);this.trigger("keydown",{event:t}),i.hooks.beforeKeyDown(t,{tagify:this}).then((function(s){if("mix"==i.mode){switch(t.key){case"Left":case"ArrowLeft":e.state.actions.ArrowLeft=!0;break;case"Delete":case"Backspace":if(e.state.editing)return;var a=document.getSelection(),o="Delete"==t.key&&a.anchorOffset==(a.anchorNode.length||0),l=a.anchorNode.previousSibling,c=1==a.anchorNode.nodeType||!a.anchorOffset&&l&&1==l.nodeType&&a.anchorNode.previousSibling;r(e.DOM.input.innerHTML);var u,g,h,p=e.getTagElms(),m=1===a.anchorNode.length&&a.anchorNode.nodeValue==String.fromCharCode(8203);if("edit"==i.backspace&&c)return u=1==a.anchorNode.nodeType?null:a.anchorNode.previousElementSibling,setTimeout(e.editTag.bind(e),0,u),void t.preventDefault();if(f()&&K(c,Element))return h=d(c),c.hasAttribute("readonly")||c.remove(),e.DOM.input.focus(),void setTimeout((function(){T(h),e.DOM.input.click();}));if("BR"==a.anchorNode.nodeName)return;if((o||c)&&1==a.anchorNode.nodeType?g=0==a.anchorOffset?o?p[0]:null:p[Math.min(p.length,a.anchorOffset)-1]:o?g=a.anchorNode.nextElementSibling:K(c,Element)&&(g=c),3==a.anchorNode.nodeType&&!a.anchorNode.nodeValue&&a.anchorNode.previousElementSibling&&t.preventDefault(),(c||o)&&!i.backspace)return void t.preventDefault();if("Range"!=a.type&&!a.anchorOffset&&a.anchorNode==e.DOM.input&&"Delete"!=t.key)return void t.preventDefault();if("Range"!=a.type&&g&&g.hasAttribute("readonly"))return void T(d(g));"Delete"==t.key&&m&&y(a.anchorNode.nextSibling)&&e.removeTags(a.anchorNode.nextSibling),clearTimeout(k),k=setTimeout((function(){var t=document.getSelection();r(e.DOM.input.innerHTML),!o&&t.anchorNode.previousSibling,e.value=[].map.call(p,(function(t,i){var n=y(t);if(t.parentNode||n.readonly)return n;e.trigger("remove",{tag:t,index:i,data:n});})).filter((function(t){return t}));}),20);}return !0}var v="manual"==i.dropdown.position;switch(t.key){case"Backspace":"select"==i.mode&&i.enforceWhitelist&&e.value.length?e.removeTags():e.state.dropdown.visible&&"manual"!=i.dropdown.position||""!=t.target.textContent&&8203!=n.charCodeAt(0)||(!0===i.backspace?e.removeTags():"edit"==i.backspace&&setTimeout(e.editTag.bind(e),0));break;case"Esc":case"Escape":if(e.state.dropdown.visible)return;t.target.blur();break;case"Down":case"ArrowDown":e.state.dropdown.visible||e.dropdown.show();break;case"ArrowRight":var b=e.state.inputSuggestion||e.state.ddItemData;if(b&&i.autoComplete.rightKey)return void e.addTags([b],!0);break;case"Tab":var w="select"==i.mode;if(!n||w)return !0;t.preventDefault();case"Enter":if(e.state.dropdown.visible&&!v)return;t.preventDefault(),setTimeout((function(){e.state.dropdown.visible&&!v||e.state.actions.selectOption||!i.addTagOn.includes(t.key.toLowerCase())||e.addTags(n,!0);}));}})).catch((function(t){return t}));}},onInput:function(t){this.postUpdate();var e=this.settings;if("mix"==e.mode)return this.events.callbacks.onMixTagsInput.call(this,t);var i=this.input.normalize.call(this,void 0,{trim:!1}),n=i.length>=e.dropdown.enabled,s={value:i,inputElm:this.DOM.input},a=this.validateTag({value:i});"select"==e.mode&&this.toggleScopeValidation(a),s.isValid=a,this.state.inputText!=i&&(this.input.set.call(this,i,!1),-1!=i.search(e.delimiters)?this.addTags(i)&&this.input.set.call(this):e.dropdown.enabled>=0&&this.dropdown[n?"show":"hide"](i),this.trigger("input",s));},onMixTagsInput:function(t){var e,i,n,s,a,o,r,l,d=this,c=this.settings,u=this.value.length,h=this.getTagElms(),p=document.createDocumentFragment(),m=window.getSelection().getRangeAt(0),v=[].map.call(h,(function(t){return y(t).value}));if("deleteContentBackward"==t.inputType&&f()&&this.events.callbacks.onKeydown.call(this,{target:t.target,key:"Backspace"}),O(this.getTagElms()),this.value.slice().forEach((function(t){t.readonly&&!v.includes(t.value)&&p.appendChild(d.createTagElem(t));})),p.childNodes.length&&(m.insertNode(p),this.setRangeAtStartEnd(!1,p.lastChild)),h.length!=u)return this.value=[].map.call(this.getTagElms(),(function(t){return y(t)})),void this.update({withoutChangeEvent:!0});if(this.hasMaxTags())return !0;if(window.getSelection&&(o=window.getSelection()).rangeCount>0&&3==o.anchorNode.nodeType){if((m=o.getRangeAt(0).cloneRange()).collapse(!0),m.setStart(o.focusNode,0),n=(e=m.toString().slice(0,m.endOffset)).split(c.pattern).length-1,(i=e.match(c.pattern))&&(s=e.slice(e.lastIndexOf(i[i.length-1]))),s){if(this.state.actions.ArrowLeft=!1,this.state.tag={prefix:s.match(c.pattern)[0],value:s.replace(c.pattern,"")},this.state.tag.baseOffset=o.baseOffset-this.state.tag.value.length,l=this.state.tag.value.match(c.delimiters))return this.state.tag.value=this.state.tag.value.replace(c.delimiters,""),this.state.tag.delimiters=l[0],this.addTags(this.state.tag.value,c.dropdown.clearOnSelect),void this.dropdown.hide();a=this.state.tag.value.length>=c.dropdown.enabled;try{r=(r=this.state.flaggedTags[this.state.tag.baseOffset]).prefix==this.state.tag.prefix&&r.value[0]==this.state.tag.value[0],this.state.flaggedTags[this.state.tag.baseOffset]&&!this.state.tag.value&&delete this.state.flaggedTags[this.state.tag.baseOffset];}catch(t){}(r||n<this.state.mixMode.matchedPatternCount)&&(a=!1);}else this.state.flaggedTags={};this.state.mixMode.matchedPatternCount=n;}setTimeout((function(){d.update({withoutChangeEvent:!0}),d.trigger("input",g({},d.state.tag,{textContent:d.DOM.input.textContent})),d.state.tag&&d.dropdown[a?"show":"hide"](d.state.tag.value);}),10);},onInputIE:function(t){var e=this;setTimeout((function(){e.events.callbacks.onInput.call(e,t);}));},observeOriginalInputValue:function(){this.DOM.originalInput.parentNode||this.destroy(),this.DOM.originalInput.value!=this.DOM.originalInput.tagifyValue&&this.loadOriginalValues();},onClickAnywhere:function(t){t.target==this.DOM.scope||this.DOM.scope.contains(t.target)||(this.toggleFocusClass(!1),this.state.hasFocus=!1,t.target.closest(".tagify__dropdown")&&t.target.closest(".tagify__dropdown").__tagify!=this&&this.dropdown.hide());},onClickScope:function(t){var e=this.settings,i=t.target.closest("."+e.classNames.tag),n=t.target===this.DOM.scope,s=+new Date-this.state.hasFocus;if(n&&"select"!=e.mode)this.DOM.input.focus();else {if(!t.target.classList.contains(e.classNames.tagX))return i&&!this.state.editing?(this.trigger("click",{tag:i,index:this.getNodeIndex(i),data:y(i),event:t}),void(1!==e.editTags&&1!==e.editTags.clicks&&"select"!=e.mode||this.events.callbacks.onDoubleClickScope.call(this,t))):void(t.target==this.DOM.input&&("mix"==e.mode&&this.fixFirefoxLastTagNoCaret(),s>500||!e.focusable)?this.state.dropdown.visible?this.dropdown.hide():0===e.dropdown.enabled&&"mix"!=e.mode&&this.dropdown.show(this.value.length?"":void 0):"select"!=e.mode||0!==e.dropdown.enabled||this.state.dropdown.visible||(this.events.callbacks.onDoubleClickScope.call(this,U(function(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){W(t,e,i[e]);}));}return t}({},t),{target:this.getTagElms()[0]})),!e.userInput&&this.dropdown.show()));this.removeTags(t.target.parentNode);}},onPaste:function(t){var e=this;t.preventDefault();var i,n,s,a=this.settings;if("select"==a.mode&&a.enforceWhitelist||!a.userInput)return !1;a.readonly||(n=t.clipboardData||window.clipboardData,s=n.getData("Text"),a.hooks.beforePaste(t,{tagify:this,pastedText:s,clipboardData:n}).then((function(a){void 0===a&&(a=s),a&&(e.injectAtCaret(a,window.getSelection().getRangeAt(0)),"mix"==e.settings.mode?e.events.callbacks.onMixTagsInput.call(e,t):e.settings.pasteAsTags?i=e.addTags(e.state.inputText+a,!0):(e.state.inputText=a,e.dropdown.show(a))),e.trigger("paste",{event:t,pastedText:s,clipboardData:n,tagsElems:i});})).catch((function(t){return t})));},onDrop:function(t){t.preventDefault();},onEditTagInput:function(t,e){var i,n=t.closest("."+this.settings.classNames.tag),s=this.getNodeIndex(n),a=y(n),o=this.input.normalize.call(this,t),r=(W(i={},this.settings.tagTextProp,o),W(i,"__tagId",a.__tagId),i),l=this.validateTag(r);this.editTagChangeDetected(g(a,r))||!0!==t.originalIsValid||(l=!0),n.classList.toggle(this.settings.classNames.tagInvalid,!0!==l),a.__isValid=l,n.title=!0===l?a.title||a.value:l,o.length>=this.settings.dropdown.enabled&&(this.state.editing&&(this.state.editing.value=o),this.dropdown.show(o)),this.trigger("edit:input",{tag:n,index:s,data:g({},this.value[s],{newValue:o}),event:e});},onEditTagPaste:function(t,e){var i=(e.clipboardData||window.clipboardData).getData("Text");e.preventDefault();var n=w(i);this.setRangeAtStartEnd(!1,n);},onEditTagClick:function(t,e){this.events.callbacks.onClickScope.call(this,e);},onEditTagFocus:function(t){this.state.editing={scope:t,input:t.querySelector("[contenteditable]")};},onEditTagBlur:function(t,e){var i=v.call(this,e.relatedTarget);if("select"==this.settings.mode&&i&&e.relatedTarget.contains(e.target))this.dropdown.hide();else if(this.state.editing&&(this.state.hasFocus||this.toggleFocusClass(),this.DOM.scope.contains(t))){var n,s,a,o=this.settings,r=t.closest("."+o.classNames.tag),l=y(r),d=this.input.normalize.call(this,t),c=(W(n={},o.tagTextProp,d),W(n,"__tagId",l.__tagId),n),u=l.__originalData,h=this.editTagChangeDetected(g(l,c)),p=this.validateTag(c);if(d)if(h){var f;if(s=this.hasMaxTags(),a=g({},u,(W(f={},o.tagTextProp,this.trim(d)),W(f,"__isValid",p),f)),o.transformTag.call(this,a,u),!0!==(p=(!s||!0===u.__isValid)&&this.validateTag(a))){if(this.trigger("invalid",{data:a,tag:r,message:p}),o.editTags.keepInvalid)return;o.keepInvalidTags?a.__isValid=p:a=u;}else o.keepInvalidTags&&(delete a.title,delete a["aria-invalid"],delete a.class);this.onEditTagDone(r,a);}else this.onEditTagDone(r,u);else this.onEditTagDone(r);}},onEditTagkeydown:function(t,e){if(!this.state.composing)switch(this.trigger("edit:keydown",{event:t}),t.key){case"Esc":case"Escape":this.state.editing=!1,!!e.__tagifyTagData.__originalData.value?e.parentNode.replaceChild(e.__tagifyTagData.__originalHTML,e):e.remove();break;case"Enter":case"Tab":t.preventDefault();setTimeout((function(){return t.target.blur()}),0);}},onDoubleClickScope:function(t){var e,i,n=t.target.closest("."+this.settings.classNames.tag),s=y(n),a=this.settings;n&&!1!==s.editable&&(e=n.classList.contains(this.settings.classNames.tagEditing),i=n.hasAttribute("readonly"),a.readonly||e||i||!this.settings.editTags||!a.userInput||(this.events.callbacks.onEditTagFocus.call(this,n),this.editTag(n)),this.toggleFocusClass(!0),"select"!=a.mode&&this.trigger("dblclick",{tag:n,index:this.getNodeIndex(n),data:y(n)}));},onInputDOMChange:function(t){var e=this;t.forEach((function(t){t.addedNodes.forEach((function(t){if("<div><br></div>"==t.outerHTML)t.replaceWith(document.createElement("br"));else if(1==t.nodeType&&t.querySelector(e.settings.classNames.tagSelector)){var i,n=document.createTextNode("");3==t.childNodes[0].nodeType&&"BR"!=t.previousSibling.nodeName&&(n=document.createTextNode("\n")),(i=t).replaceWith.apply(i,q([n].concat(q(q(t.childNodes).slice(0,-1))))),T(n);}else if(v.call(e,t)){var s;if(3!=(null===(s=t.previousSibling)||void 0===s?void 0:s.nodeType)||t.previousSibling.textContent||t.previousSibling.remove(),t.previousSibling&&"BR"==t.previousSibling.nodeName){t.previousSibling.replaceWith("\n​");for(var a=t.nextSibling,o="";a;)o+=a.textContent,a=a.nextSibling;o.trim()&&T(t.previousSibling);}else t.previousSibling&&!y(t.previousSibling)||t.before("​");}})),t.removedNodes.forEach((function(t){t&&"BR"==t.nodeName&&v.call(e,i)&&(e.removeTags(i),e.fixFirefoxLastTagNoCaret());}));}));var i=this.DOM.input.lastChild;i&&""==i.nodeValue&&i.remove(),i&&"BR"==i.nodeName||this.DOM.input.appendChild(document.createElement("br"));}}};function X(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function J(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function G(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function $$1(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){J(t,e,i[e]);}));}return t}function Q(t){return function(t){if(Array.isArray(t))return X(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return X(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return X(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function Y(t,e){if(!t){n.warn("input element not found",t);var i=new Proxy(this,{get:function(){return function(){return i}}});return i}if(t.__tagify)return n.warn("input element is already Tagified - Same instance is returned.",t),t.__tagify;var s;g(this,function(t){var e=document.createTextNode(""),i={};function s(t,i,n){n&&i.split(/\s+/g).forEach((function(i){return e[t+"EventListener"].call(e,i,n)}));}return {removeAllCustomListeners:function(){Object.entries(i).forEach((function(t){var e=H(t,2),i=e[0];e[1].forEach((function(t){return s("remove",i,t)}));})),i={};},off:function(t,e){return t&&(e?s("remove",t,e):t.split(/\s+/g).forEach((function(t){var e;null===(e=i[t])||void 0===e||e.forEach((function(e){return s("remove",t,e)})),delete i[t];}))),this},on:function(t,e){return e&&"function"==typeof e&&(t.split(/\s+/g).forEach((function(t){Array.isArray(i[t])?i[t].push(e):i[t]=[e];})),s("add",t,e)),this},trigger:function(i,s,a){var o;if(a=a||{cloneData:!0},i)if(t.settings.isJQueryPlugin)"remove"==i&&(i="removeTag"),jQuery(t.DOM.originalInput).triggerHandler(i,[s]);else {try{var r="object"==typeof s?s:{value:s};if((r=a.cloneData?g({},r):r).tagify=this,s.event&&(r.event=this.cloneEvent(s.event)),R(s,Object))for(var l in s)R(s[l],HTMLElement)&&(r[l]=s[l]);o=new CustomEvent(i,{detail:r});}catch(t){n.warn(t);}e.dispatchEvent(o);}}}}(this)),this.isFirefox=/firefox|fxios/i.test(navigator.userAgent)&&!/seamonkey/i.test(navigator.userAgent),this.isIE=window.document.documentMode,e=e||{},this.getPersistedData=(s=e.id,function(t){var e,i="/"+t;if(1==localStorage.getItem(j+s+"/v",1))try{e=JSON.parse(localStorage[j+s+i]);}catch(t){}return e}),this.setPersistedData=function(t){return t?(localStorage.setItem(j+t+"/v",1),function(e,i){var n="/"+i,s=JSON.stringify(e);e&&i&&(localStorage.setItem(j+t+n,s),dispatchEvent(new Event("storage")));}):function(){}}(e.id),this.clearPersistedData=function(t){return function(e){var i=j+"/"+t+"/";if(e)localStorage.removeItem(i+e);else for(var n in localStorage)n.includes(i)&&localStorage.removeItem(n);}}(e.id),this.applySettings(t,e),this.state={inputText:"",editing:!1,composing:!1,actions:{},mixMode:{},dropdown:{},flaggedTags:{}},this.value=[],this.listeners={},this.DOM={},this.build(t),_.call(this),this.getCSSVars(),this.loadOriginalValues(),this.events.customBinding.call(this),this.events.binding.call(this),t.autofocus&&this.DOM.input.focus(),t.__tagify=this;}Y.prototype={_dropdown:L,placeCaretAfterNode:T,getSetTagData:y,helpers:{sameStr:s,removeCollectionProp:a,omit:o,isObject:u,parseHTML:l,escapeHTML:c,extend:g,concatWithoutDups:h,getUID:m,isNodeTag:v},customEventsList:["change","add","remove","invalid","input","paste","click","keydown","focus","blur","edit:input","edit:beforeUpdate","edit:updated","edit:start","edit:keydown","dropdown:show","dropdown:hide","dropdown:select","dropdown:updated","dropdown:noMatch","dropdown:scroll"],dataProps:["__isValid","__removed","__originalData","__originalHTML","__tagId"],trim:function(t){return this.settings.trim&&t&&"string"==typeof t?t.trim():t},parseHTML:l,templates:V,parseTemplate:function(t,e){return l((t=this.settings.templates[t]||t).apply(this,e))},set whitelist(t){var e=t&&Array.isArray(t);this.settings.whitelist=e?t:[],this.setPersistedData(e?t:[],"whitelist");},get whitelist(){return this.settings.whitelist},set userInput(t){this.settings.userInput=!!t,this.setContentEditable(!!t);},get userInput(){return this.settings.userInput},generateClassSelectors:function(t){var e=function(e){var i=e;Object.defineProperty(t,i+"Selector",{get:function(){return "."+this[i].split(" ")[0]}});};for(var i in t)e(i);},applySettings:function(t,e){var i,n;x$1.templates=this.templates;var s=g({},x$1,"mix"==e.mode?{dropdown:{position:"text"}}:{}),a=this.settings=g({},s,e);if(a.disabled=t.hasAttribute("disabled"),a.readonly=a.readonly||t.hasAttribute("readonly"),a.placeholder=c(t.getAttribute("placeholder")||a.placeholder||""),a.required=t.hasAttribute("required"),this.generateClassSelectors(a.classNames),void 0===a.dropdown.includeSelectedTags&&(a.dropdown.includeSelectedTags=a.duplicates),this.isIE&&(a.autoComplete=!1),["whitelist","blacklist"].forEach((function(e){var i=t.getAttribute("data-"+e);i&&G(i=i.split(a.delimiters),Array)&&(a[e]=i);})),"autoComplete"in e&&!u(e.autoComplete)&&(a.autoComplete=x$1.autoComplete,a.autoComplete.enabled=e.autoComplete),"mix"==a.mode&&(a.pattern=a.pattern||/@/,a.autoComplete.rightKey=!0,a.delimiters=e.delimiters||null,a.tagTextProp&&!a.dropdown.searchKeys.includes(a.tagTextProp)&&a.dropdown.searchKeys.push(a.tagTextProp)),t.pattern)try{a.pattern=new RegExp(t.pattern);}catch(t){}if(a.delimiters){a._delimiters=a.delimiters;try{a.delimiters=new RegExp(this.settings.delimiters,"g");}catch(t){}}a.disabled&&(a.userInput=!1),this.TEXTS=$$1({},P,a.texts||{}),("select"!=a.mode||(null===(i=e.dropdown)||void 0===i?void 0:i.enabled))&&a.userInput||(a.dropdown.enabled=0),a.dropdown.appendTarget=(null===(n=e.dropdown)||void 0===n?void 0:n.appendTarget)||document.body;var o=this.getPersistedData("whitelist");Array.isArray(o)&&(this.whitelist=Array.isArray(a.whitelist)?h(a.whitelist,o):o);},getAttributes:function(t){var e,i=this.getCustomAttributes(t),n="";for(e in i)n+=" "+e+(void 0!==t[e]?'="'.concat(i[e],'"'):"");return n},getCustomAttributes:function(t){if(!u(t))return "";var e,i={};for(e in t)"__"!=e.slice(0,2)&&"class"!=e&&t.hasOwnProperty(e)&&void 0!==t[e]&&(i[e]=c(t[e]));return i},setStateSelection:function(){var t=window.getSelection(),e={anchorOffset:t.anchorOffset,anchorNode:t.anchorNode,range:t.getRangeAt&&t.rangeCount&&t.getRangeAt(0)};return this.state.selection=e,e},getCSSVars:function(){var t,e,i,n=getComputedStyle(this.DOM.scope,null);this.CSSVars={tagHideTransition:(t=function(t){if(!t)return {};var e=(t=t.trim().split(" ")[0]).split(/\d+/g).filter((function(t){return t})).pop().trim();return {value:+t.split(e).filter((function(t){return t}))[0].trim(),unit:e}}((i="tag-hide-transition",n.getPropertyValue("--"+i))),e=t.value,"s"==t.unit?1e3*e:e)};},build:function(t){var e=this.DOM,i=t.closest("label");this.settings.mixMode.integrated?(e.originalInput=null,e.scope=t,e.input=t):(e.originalInput=t,e.originalInput_tabIndex=t.tabIndex,e.scope=this.parseTemplate("wrapper",[t,this.settings]),e.input=e.scope.querySelector(this.settings.classNames.inputSelector),t.parentNode.insertBefore(e.scope,t),t.tabIndex=-1),i&&i.setAttribute("for","");},destroy:function(){this.events.unbindGlobal.call(this),this.DOM.scope.parentNode.removeChild(this.DOM.scope),this.DOM.originalInput.tabIndex=this.DOM.originalInput_tabIndex,delete this.DOM.originalInput.__tagify,this.dropdown.hide(!0),this.removeAllCustomListeners(),clearTimeout(this.dropdownHide__bindEventsTimeout),clearInterval(this.listeners.main.originalInputValueObserverInterval);},loadOriginalValues:function(t){var e,i=this.settings;if(this.state.blockChangeEvent=!0,void 0===t){var n=this.getPersistedData("value");t=n&&!this.DOM.originalInput.value?n:i.mixMode.integrated?this.DOM.input.textContent:this.DOM.originalInput.value;}if(this.removeAllTags(),t)if("mix"==i.mode)this.parseMixTags(t),(e=this.DOM.input.lastChild)&&"BR"==e.tagName||this.DOM.input.insertAdjacentHTML("beforeend","<br>");else {try{G(JSON.parse(t),Array)&&(t=JSON.parse(t));}catch(t){}this.addTags(t,!0).forEach((function(t){return t&&t.classList.add(i.classNames.tagNoAnimation)}));}else this.postUpdate();this.state.lastOriginalValueReported=i.mixMode.integrated?"":this.DOM.originalInput.value;},cloneEvent:function(t){var e={};for(var i in t)"path"!=i&&(e[i]=t[i]);return e},loading:function(t){return this.state.isLoading=t,this.DOM.scope.classList[t?"add":"remove"](this.settings.classNames.scopeLoading),this},tagLoading:function(t,e){return t&&t.classList[e?"add":"remove"](this.settings.classNames.tagLoading),this},toggleClass:function(t,e){"string"==typeof t&&this.DOM.scope.classList.toggle(t,e);},toggleScopeValidation:function(t){var e=!0===t||void 0===t;!this.settings.required&&t&&t===this.TEXTS.empty&&(e=!0),this.toggleClass(this.settings.classNames.tagInvalid,!e),this.DOM.scope.title=e?"":t;},toggleFocusClass:function(t){this.toggleClass(this.settings.classNames.focus,!!t);},setPlaceholder:function(t){var e=this;["data","aria"].forEach((function(i){return e.DOM.input.setAttribute("".concat(i,"-placeholder"),t)}));},triggerChangeEvent:function(){if(!this.settings.mixMode.integrated){var t=this.DOM.originalInput,e=this.state.lastOriginalValueReported!==t.value,i=new CustomEvent("change",{bubbles:!0});e&&(this.state.lastOriginalValueReported=t.value,i.simulated=!0,t._valueTracker&&t._valueTracker.setValue(Math.random()),t.dispatchEvent(i),this.trigger("change",this.state.lastOriginalValueReported),t.value=this.state.lastOriginalValueReported);}},events:z,fixFirefoxLastTagNoCaret:function(){},setRangeAtStartEnd:function(t,e){if(e){t="number"==typeof t?t:!!t,e=e.lastChild||e;var i=document.getSelection();if(G(i.focusNode,Element)&&!this.DOM.input.contains(i.focusNode))return !0;try{i.rangeCount>=1&&["Start","End"].forEach((function(n){return i.getRangeAt(0)["set"+n](e,t||e.length)}));}catch(t){console.warn(t);}}},insertAfterTag:function(t,e){if(e=e||this.settings.mixMode.insertAfterTag,t&&t.parentNode&&e)return e="string"==typeof e?document.createTextNode(e):e,t.parentNode.insertBefore(e,t.nextSibling),e},editTagChangeDetected:function(t){var e=t.__originalData;for(var i in e)if(!this.dataProps.includes(i)&&t[i]!=e[i])return !0;return !1},getTagTextNode:function(t){return t.querySelector(this.settings.classNames.tagTextSelector)},setTagTextNode:function(t,e){this.getTagTextNode(t).innerHTML=c(e);},editTag:function(t,e){var i=this;t=t||this.getLastTag(),e=e||{};var s=this.settings,a=this.getTagTextNode(t),o=this.getNodeIndex(t),r=y(t),l=this.events.callbacks,d=!0,c="select"==s.mode;if(!c&&this.dropdown.hide(),a){if(!G(r,Object)||!("editable"in r)||r.editable)return r=y(t,{__originalData:g({},r),__originalHTML:t.cloneNode(!0)}),y(r.__originalHTML,r.__originalData),a.setAttribute("contenteditable",!0),t.classList.add(s.classNames.tagEditing),a.addEventListener("click",l.onEditTagClick.bind(this,t)),a.addEventListener("blur",l.onEditTagBlur.bind(this,this.getTagTextNode(t))),a.addEventListener("input",l.onEditTagInput.bind(this,a)),a.addEventListener("paste",l.onEditTagPaste.bind(this,a)),a.addEventListener("keydown",(function(e){return l.onEditTagkeydown.call(i,e,t)})),a.addEventListener("compositionstart",l.onCompositionStart.bind(this)),a.addEventListener("compositionend",l.onCompositionEnd.bind(this)),e.skipValidation||(d=this.editTagToggleValidity(t)),a.originalIsValid=d,this.trigger("edit:start",{tag:t,index:o,data:r,isValid:d}),a.focus(),!c&&this.setRangeAtStartEnd(!1,a),0===s.dropdown.enabled&&!c&&this.dropdown.show(),this.state.hasFocus=!0,this}else n.warn("Cannot find element in Tag template: .",s.classNames.tagTextSelector);},editTagToggleValidity:function(t,e){var i;if(e=e||y(t))return (i=!("__isValid"in e)||!0===e.__isValid)||this.removeTagsFromValue(t),this.update(),t.classList.toggle(this.settings.classNames.tagNotAllowed,!i),e.__isValid=i,e.__isValid;n.warn("tag has no data: ",t,e);},onEditTagDone:function(t,e){t=t||this.state.editing.scope,e=e||{};var i,n,s={tag:t,index:this.getNodeIndex(t),previousData:y(t),data:e},a=this.settings;this.trigger("edit:beforeUpdate",s,{cloneData:!1}),this.state.editing=!1,delete e.__originalData,delete e.__originalHTML,t&&(void 0!==(n=e[a.tagTextProp])?null===(i=(n+="").trim)||void 0===i?void 0:i.call(n):a.tagTextProp in e?void 0:e.value)?(t=this.replaceTag(t,e),this.editTagToggleValidity(t,e),a.a11y.focusableTags?t.focus():"select"!=a.mode&&T(t)):t&&this.removeTags(t),this.trigger("edit:updated",s),this.dropdown.hide(),this.settings.keepInvalidTags&&this.reCheckInvalidTags();},replaceTag:function(t,e){e&&""!==e.value&&void 0!==e.value||(e=t.__tagifyTagData),e.__isValid&&1!=e.__isValid&&g(e,this.getInvalidTagAttrs(e,e.__isValid));var i=this.createTagElem(e);return t.parentNode.replaceChild(i,t),this.updateValueByDOMTags(),i},updateValueByDOMTags:function(){var t=this;this.value.length=0;var e=this.settings.classNames,i=[e.tagNotAllowed.split(" ")[0],e.tagHide];[].forEach.call(this.getTagElms(),(function(e){Q(e.classList).some((function(t){return i.includes(t)}))||t.value.push(y(e));})),this.update();},injectAtCaret:function(t,e){var i;if(!(e=e||(null===(i=this.state.selection)||void 0===i?void 0:i.range))&&t)return this.appendMixTags(t),this;var n=w(t,e);return this.setRangeAtStartEnd(!1,n),this.updateValueByDOMTags(),this.update(),this},input:{set:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],i=this.settings,n=i.dropdown.closeOnSelect;this.state.inputText=t,e&&(this.DOM.input.innerHTML=c(""+t),t&&this.toggleClass(i.classNames.empty,!this.DOM.input.innerHTML)),!t&&n&&this.dropdown.hide.bind(this),this.input.autocomplete.suggest.call(this),this.input.validate.call(this);},raw:function(){return this.DOM.input.textContent},validate:function(){var t=!this.state.inputText||!0===this.validateTag({value:this.state.inputText});return this.DOM.input.classList.toggle(this.settings.classNames.inputInvalid,!t),t},normalize:function(t,e){var i=t||this.DOM.input,n=[];i.childNodes.forEach((function(t){return 3==t.nodeType&&n.push(t.nodeValue)})),n=n.join("\n");try{n=n.replace(/(?:\r\n|\r|\n)/g,this.settings.delimiters.source.charAt(0));}catch(t){}return n=n.replace(/\s/g," "),(null==e?void 0:e.trim)?this.trim(n):n},autocomplete:{suggest:function(t){if(this.settings.autoComplete.enabled){"object"!=typeof(t=t||{value:""})&&(t={value:t});var e=this.dropdown.getMappedValue(t);if("number"!=typeof e){var i=this.state.inputText.toLowerCase(),n=e.substr(0,this.state.inputText.length).toLowerCase(),s=e.substring(this.state.inputText.length);e&&this.state.inputText&&n==i?(this.DOM.input.setAttribute("data-suggest",s),this.state.inputSuggestion=t):(this.DOM.input.removeAttribute("data-suggest"),delete this.state.inputSuggestion);}}},set:function(t){var e=this.DOM.input.getAttribute("data-suggest"),i=t||(e?this.state.inputText+e:null);return !!i&&("mix"==this.settings.mode?this.replaceTextWithNode(document.createTextNode(this.state.tag.prefix+i)):(this.input.set.call(this,i),this.setRangeAtStartEnd(!1,this.DOM.input)),this.input.autocomplete.suggest.call(this),this.dropdown.hide(),!0)}}},getTagIdx:function(t){return this.value.findIndex((function(e){return e.__tagId==(t||{}).__tagId}))},getNodeIndex:function(t){var e=0;if(t)for(;t=t.previousElementSibling;)e++;return e},getTagElms:function(){for(var t=arguments.length,e=new Array(t),i=0;i<t;i++)e[i]=arguments[i];var n="."+Q(this.settings.classNames.tag.split(" ")).concat(Q(e)).join(".");return [].slice.call(this.DOM.scope.querySelectorAll(n))},getLastTag:function(){var t=this.settings.classNames,e=this.DOM.scope.querySelectorAll("".concat(t.tagSelector,":not(.").concat(t.tagHide,"):not([readonly])"));return e[e.length-1]},isTagDuplicate:function(t,e,i){var n=0,a=!0,o=!1,r=void 0;try{for(var l,d=this.value[Symbol.iterator]();!(a=(l=d.next()).done);a=!0){var c=l.value;s(this.trim(""+t),c.value,e)&&i!=c.__tagId&&n++;}}catch(t){o=!0,r=t;}finally{try{a||null==d.return||d.return();}finally{if(o)throw r}}return n},getTagIndexByValue:function(t){var e=this,i=[],n=this.settings.dropdown.caseSensitive;return this.getTagElms().forEach((function(a,o){a.__tagifyTagData&&s(e.trim(a.__tagifyTagData.value),t,n)&&i.push(o);})),i},getTagElmByValue:function(t){var e=this.getTagIndexByValue(t)[0];return this.getTagElms()[e]},flashTag:function(t){var e=this;t&&(t.classList.add(this.settings.classNames.tagFlash),setTimeout((function(){t.classList.remove(e.settings.classNames.tagFlash);}),100));},isTagBlacklisted:function(t){return t=this.trim(t.toLowerCase()),this.settings.blacklist.filter((function(e){return (""+e).toLowerCase()==t})).length},isTagWhitelisted:function(t){return !!this.getWhitelistItem(t)},getWhitelistItem:function(t,e,i){e=e||"value";var n,a=this.settings;return (i=i||a.whitelist).some((function(i){var o="object"==typeof i?i[e]||i.value:i;if(s(o,t,a.dropdown.caseSensitive,a.trim))return n="object"==typeof i?i:{value:i},!0})),n||"value"!=e||"value"==a.tagTextProp||(n=this.getWhitelistItem(t,a.tagTextProp,i)),n},validateTag:function(t){var e=this.settings,i="value"in t?"value":e.tagTextProp,n=this.trim(t[i]+"");return (t[i]+"").trim()?"mix"!=e.mode&&e.pattern&&G(e.pattern,RegExp)&&!e.pattern.test(n)?this.TEXTS.pattern:!e.duplicates&&this.isTagDuplicate(n,e.dropdown.caseSensitive,t.__tagId)?this.TEXTS.duplicate:this.isTagBlacklisted(n)||e.enforceWhitelist&&!this.isTagWhitelisted(n)?this.TEXTS.notAllowed:!e.validate||e.validate(t):this.TEXTS.empty},getInvalidTagAttrs:function(t,e){return {"aria-invalid":!0,class:"".concat(t.class||""," ").concat(this.settings.classNames.tagNotAllowed).trim(),title:e}},hasMaxTags:function(){return this.value.length>=this.settings.maxTags&&this.TEXTS.exceed},setReadonly:function(t,e){var i=this.settings;this.DOM.scope.contains(document.activeElement)&&document.activeElement.blur(),i[e||"readonly"]=t,this.DOM.scope[(t?"set":"remove")+"Attribute"](e||"readonly",!0),this.settings.userInput=!0,this.setContentEditable(!t);},setContentEditable:function(t){this.DOM.input.contentEditable=t,this.DOM.input.tabIndex=t?0:-1;},setDisabled:function(t){this.setReadonly(t,"disabled");},normalizeTags:function(t){var e=this,i=this.settings,n=i.whitelist,s=i.delimiters,a=i.mode,o=i.tagTextProp,r=[],l=!!n&&G(n[0],Object),d=Array.isArray(t),c=d&&t[0].value,h=function(t){return (t+"").split(s).reduce((function(t,i){var n,s=e.trim(i);return s&&t.push((J(n={},o,s),J(n,"value",s),n)),t}),[])};if("number"==typeof t&&(t=t.toString()),"string"==typeof t){if(!t.trim())return [];t=h(t);}else d&&(t=t.reduce((function(t,i){if(u(i)){var n=g({},i);o in n||(o="value"),n[o]=e.trim(n[o]),n[o]&&t.push(n);}else if(i){var s;(s=t).push.apply(s,Q(h(i)));}return t}),[]));return l&&!c&&(t.forEach((function(t){var i=r.map((function(t){return t.value})),n=e.dropdown.filterListItems.call(e,t[o],{exact:!0});e.settings.duplicates||(n=n.filter((function(t){return !i.includes(t.value)})));var s=n.length>1?e.getWhitelistItem(t[o],o,n):n[0];s&&G(s,Object)?r.push(s):"mix"!=a&&(null==t.value&&(t.value=t[o]),r.push(t));})),r.length&&(t=r)),t},parseMixTags:function(t){var e=this,i=this.settings,n=i.mixTagsInterpolator,s=i.duplicates,a=i.transformTag,o=i.enforceWhitelist,r=i.maxTags,l=i.tagTextProp,d=[];t=t.split(n[0]).map((function(t,i){var c,u,g,h=t.split(n[1]),p=h[0],f=d.length==r;try{if(p==+p)throw Error;u=JSON.parse(p);}catch(t){u=e.normalizeTags(p)[0]||{value:p};}if(a.call(e,u),f||!(h.length>1)||o&&!e.isTagWhitelisted(u.value)||!s&&e.isTagDuplicate(u.value)){if(t)return i?n[0]+t:t}else u[c=u[l]?l:"value"]=e.trim(u[c]),g=e.createTagElem(u),d.push(u),g.classList.add(e.settings.classNames.tagNoAnimation),h[0]=g.outerHTML,e.value.push(u);return h.join("")})).join(""),this.DOM.input.innerHTML=t,this.DOM.input.appendChild(document.createTextNode("")),this.DOM.input.normalize();var c=this.getTagElms();return c.forEach((function(t,e){return y(t,d[e])})),this.update({withoutChangeEvent:!0}),O(c,this.state.hasFocus),t},replaceTextWithNode:function(t,e){if(this.state.tag||e){e=e||this.state.tag.prefix+this.state.tag.value;var i,n,s=this.state.selection||window.getSelection(),a=s.anchorNode,o=this.state.tag.delimiters?this.state.tag.delimiters.length:0;return a.splitText(s.anchorOffset-o),-1==(i=a.nodeValue.lastIndexOf(e))?!0:(n=a.splitText(i),t&&a.parentNode.replaceChild(t,n),!0)}},prepareNewTagNode:function(t,e){e=e||{};var i=this.settings,n=[],s={},a=Object.assign({},t,{value:t.value+""});if(t=Object.assign({},a),i.transformTag.call(this,t),t.__isValid=this.hasMaxTags()||this.validateTag(t),!0!==t.__isValid){if(e.skipInvalid)return;if(g(s,this.getInvalidTagAttrs(t,t.__isValid),{__preInvalidData:a}),t.__isValid==this.TEXTS.duplicate&&this.flashTag(this.getTagElmByValue(t.value)),!i.createInvalidTags)return void n.push(t.value)}return "readonly"in t&&(t.readonly?s["aria-readonly"]=!0:delete t.readonly),{tagElm:this.createTagElem(t,s),tagData:t,aggregatedInvalidInput:n}},postProcessNewTagNode:function(t,e){var i=this,n=this.settings,s=e.__isValid;s&&!0===s?(this.value.push(e),setTimeout((function(){i.trigger("add",{tag:t,index:i.value.length-1,data:e});}))):(this.trigger("invalid",{data:e,index:this.value.length,tag:t,message:s}),n.keepInvalidTags||setTimeout((function(){return i.removeTags(t,!0)}),1e3)),this.dropdown.position();},selectTag:function(t,e){var i=this;if(!this.settings.enforceWhitelist||this.isTagWhitelisted(e.value)){this.state.actions.selectOption&&setTimeout((function(){return i.setRangeAtStartEnd(!1,i.DOM.input)}));var n=this.getLastTag();return n?this.replaceTag(n,e):this.appendTag(t),this.value[0]=e,this.update(),this.trigger("add",{tag:t,data:e}),[t]}},addEmptyTag:function(t){var e=g({value:""},t||{}),i=this.createTagElem(e);y(i,e),this.appendTag(i),this.editTag(i,{skipValidation:!0}),this.toggleFocusClass(!0);},addTags:function(t,e,i){var n=this,s=[],a=this.settings,o=[],r=document.createDocumentFragment();if(!t||0==t.length)return s;switch(t=this.normalizeTags(t),a.mode){case"mix":return this.addMixTags(t);case"select":e=!1,this.removeAllTags();}return this.DOM.input.removeAttribute("style"),t.forEach((function(t){var e=n.prepareNewTagNode(t,{skipInvalid:i||a.skipInvalid});if(e){var l=e.tagElm;if(t=e.tagData,o=e.aggregatedInvalidInput,s.push(l),"select"==a.mode)return n.selectTag(l,t);r.appendChild(l),n.postProcessNewTagNode(l,t);}})),this.appendTag(r),this.update(),t.length&&e&&(this.input.set.call(this,a.createInvalidTags?"":o.join(a._delimiters)),this.setRangeAtStartEnd(!1,this.DOM.input)),this.dropdown.refilter(),s},addMixTags:function(t){var e=this;if((t=this.normalizeTags(t))[0].prefix||this.state.tag)return this.prefixedTextToTag(t[0]);var i=document.createDocumentFragment();return t.forEach((function(t){var n=e.prepareNewTagNode(t);i.appendChild(n.tagElm),e.insertAfterTag(n.tagElm),e.postProcessNewTagNode(n.tagElm,n.tagData);})),this.appendMixTags(i),i.children},appendMixTags:function(t){var e=!!this.state.selection;e?this.injectAtCaret(t):(this.DOM.input.focus(),(e=this.setStateSelection()).range.setStart(this.DOM.input,e.range.endOffset),e.range.setEnd(this.DOM.input,e.range.endOffset),this.DOM.input.appendChild(t),this.updateValueByDOMTags(),this.update());},prefixedTextToTag:function(t){var e,i,n,s=this,a=this.settings,o=null===(e=this.state.tag)||void 0===e?void 0:e.delimiters;if(t.prefix=t.prefix||this.state.tag?this.state.tag.prefix:(a.pattern.source||a.pattern)[0],n=this.prepareNewTagNode(t),i=n.tagElm,this.replaceTextWithNode(i)||this.DOM.input.appendChild(i),setTimeout((function(){return i.classList.add(s.settings.classNames.tagNoAnimation)}),300),this.value.push(n.tagData),this.update(),!o){var r=this.insertAfterTag(i)||i;setTimeout(T,0,r);}return this.state.tag=null,this.postProcessNewTagNode(i,n.tagData),i},appendTag:function(t){var e=this.DOM,i=e.input;e.scope.insertBefore(t,i);},createTagElem:function(t,e){t.__tagId=m();var i,n=g({},t,$$1({value:c(t.value+"")},e));return function(t){for(var e,i=document.createNodeIterator(t,NodeFilter.SHOW_TEXT,null,!1);e=i.nextNode();)e.textContent.trim()||e.parentNode.removeChild(e);}(i=this.parseTemplate("tag",[n,this])),y(i,t),i},reCheckInvalidTags:function(){var t=this,e=this.settings;this.getTagElms(e.classNames.tagNotAllowed).forEach((function(i,n){var s=y(i),a=t.hasMaxTags(),o=t.validateTag(s),r=!0===o&&!a;if("select"==e.mode&&t.toggleScopeValidation(o),r)return s=s.__preInvalidData?s.__preInvalidData:{value:s.value},t.replaceTag(i,s);i.title=a||o;}));},removeTags:function(t,e,i){var n,s=this,a=this.settings;if(t=t&&G(t,HTMLElement)?[t]:G(t,Array)?t:t?[t]:[this.getLastTag()].filter((function(t){return t})),n=t.reduce((function(t,e){e&&"string"==typeof e&&(e=s.getTagElmByValue(e));var i=y(e);return e&&i&&!i.readonly&&t.push({node:e,idx:s.getTagIdx(i),data:y(e,{__removed:!0})}),t}),[]),i="number"==typeof i?i:this.CSSVars.tagHideTransition,"select"==a.mode&&(i=0,this.input.set.call(this)),1==n.length&&"select"!=a.mode&&n[0].node.classList.contains(a.classNames.tagNotAllowed)&&(e=!0),n.length)return a.hooks.beforeRemoveTag(n,{tagify:this}).then((function(){var t=function(t){t.node.parentNode&&(t.node.parentNode.removeChild(t.node),e?a.keepInvalidTags&&this.trigger("remove",{tag:t.node,index:t.idx}):(this.trigger("remove",{tag:t.node,index:t.idx,data:t.data}),this.dropdown.refilter(),this.dropdown.position(),this.DOM.input.normalize(),a.keepInvalidTags&&this.reCheckInvalidTags()));};i&&i>10&&1==n.length?function(e){e.node.style.width=parseFloat(window.getComputedStyle(e.node).width)+"px",document.body.clientTop,e.node.classList.add(a.classNames.tagHide),setTimeout(t.bind(this),i,e);}.call(s,n[0]):n.forEach(t.bind(s)),e||(s.removeTagsFromValue(n.map((function(t){return t.node}))),s.update(),"select"==a.mode&&a.userInput&&s.setContentEditable(!0));})).catch((function(t){}))},removeTagsFromDOM:function(){this.getTagElms().forEach((function(t){return t.remove()}));},removeTagsFromValue:function(t){var e=this;(t=Array.isArray(t)?t:[t]).forEach((function(t){var i=y(t),n=e.getTagIdx(i);n>-1&&e.value.splice(n,1);}));},removeAllTags:function(t){var e=this;t=t||{},this.value=[],"mix"==this.settings.mode?this.DOM.input.innerHTML="":this.removeTagsFromDOM(),this.dropdown.refilter(),this.dropdown.position(),this.state.dropdown.visible&&setTimeout((function(){e.DOM.input.focus();})),"select"==this.settings.mode&&(this.input.set.call(this),this.settings.userInput&&this.setContentEditable(!0)),this.update(t);},postUpdate:function(){this.state.blockChangeEvent=!1;var t,e,i=this.settings,n=i.classNames,s="mix"==i.mode?i.mixMode.integrated?this.DOM.input.textContent:this.DOM.originalInput.value.trim():this.value.length+this.input.raw.call(this).length;(this.toggleClass(n.hasMaxTags,this.value.length>=i.maxTags),this.toggleClass(n.hasNoTags,!this.value.length),this.toggleClass(n.empty,!s),"select"==i.mode)&&this.toggleScopeValidation(null===(e=this.value)||void 0===e||null===(t=e[0])||void 0===t?void 0:t.__isValid);},setOriginalInputValue:function(t){var e=this.DOM.originalInput;this.settings.mixMode.integrated||(e.value=t,e.tagifyValue=e.value,this.setPersistedData(t,"value"));},update:function(t){clearTimeout(this.debouncedUpdateTimeout),this.debouncedUpdateTimeout=setTimeout(function(){var e=this.getInputValue();this.setOriginalInputValue(e),this.settings.onChangeAfterBlur&&(t||{}).withoutChangeEvent||this.state.blockChangeEvent||this.triggerChangeEvent();this.postUpdate();}.bind(this),100),this.events.bindOriginaInputListener.call(this,100);},getInputValue:function(){var t=this.getCleanValue();return "mix"==this.settings.mode?this.getMixedTagsAsString(t):t.length?this.settings.originalInputValueFormat?this.settings.originalInputValueFormat(t):JSON.stringify(t):""},getCleanValue:function(t){return a(t||this.value,this.dataProps)},getMixedTagsAsString:function(){var t="",e=this,i=this.settings,n=i.originalInputValueFormat||JSON.stringify,s=i.mixTagsInterpolator;return function i(a){a.childNodes.forEach((function(a){if(1==a.nodeType){var r=y(a);if("BR"==a.tagName&&(t+="\r\n"),r&&v.call(e,a)){if(r.__removed)return;t+=s[0]+n(o(r,e.dataProps))+s[1];}else a.getAttribute("style")||["B","I","U"].includes(a.tagName)?t+=a.textContent:"DIV"!=a.tagName&&"P"!=a.tagName||(t+="\r\n",i(a));}else t+=a.textContent;}));}(this.DOM.input),t}},Y.prototype.removeTag=Y.prototype.removeTags;

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$b, ApplicationV2: ApplicationV2$b } = foundry.applications.api;

class BestiaryAppearanceMenu extends HandlebarsApplicationMixin$b(
  ApplicationV2$b,
) {
  constructor() {
    super({});

    this.settings = {
      useTokenArt: game.settings.get("pf2e-bestiary-tracking", "use-token-art"),
      contrastRevealedState: game.settings.get(
        "pf2e-bestiary-tracking",
        "contrast-revealed-state",
      ),
      imageSettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "image-settings",
      ),
      categorySettings: game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-category-settings",
      ),
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Menus.BestiaryAppearance.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-appearance-menu",
    classes: ["bestiary-settings-menu"],
    position: { width: 680, height: "auto" },
    actions: {
      resetContrastRevealedState: this.resetContrastRevealedState,
      resetCategorySettings: this.resetCategorySettings,
      resetImageSettings: this.resetImageSettings,
      filePicker: this.filePicker,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-appearance-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/bestiaryAppearanceMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = this.settings;
    context.imageHideStates = imageHideStates;

    return context;
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.settings = {
      useTokenArt: data.useTokenArt,
      contrastRevealedState: data.contrastRevealedState,
      categorySettings: {
        creature: {
          ...data.categorySettings.creature,
          image: this.settings.categorySettings.creature.image,
        },
        npc: {
          ...data.categorySettings.npc,
          image: this.settings.categorySettings.npc.image,
        },
        hazard: {
          ...data.categorySettings.hazard,
          image: this.settings.categorySettings.hazard.image,
        },
      },
      imageSettings: {
        creature: {
          ...data.imageSettings.creature,
          hideImage: this.settings.imageSettings.creature.hideImage,
        },
        npc: {
          ...data.imageSettings.npc,
          hideImage: this.settings.imageSettings.npc.hideImage,
        },
        hazard: {
          ...data.imageSettings.hazard,
          hideImage: this.settings.imageSettings.hazard.hideImage,
        },
      },
    };
    this.render();
  }

  static async resetContrastRevealedState() {
    this.settings.contrastRevealedState = { ...revealedState };
    this.render();
  }

  static async resetCategorySettings() {
    this.settings.categorySettings = { ...bestiaryCategorySettings };
    this.render();
  }

  static async resetImageSettings() {
    this.settings.imageSettings = { ...imageSettings };
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

  static async save(_) {
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "contrast-revealed-state",
      this.settings.contrastRevealedState,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "use-token-art",
      this.settings.useTokenArt,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "image-settings",
      this.settings.imageSettings,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-category-settings",
      this.settings.categorySettings,
    );
    this.close();
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$a, ApplicationV2: ApplicationV2$a } = foundry.applications.api;

class BestiaryIntegrationMenu extends HandlebarsApplicationMixin$a(
  ApplicationV2$a,
) {
  constructor() {
    super({});

    this.settings = {
      creatureRegistration: {
        automaticCombatRegistration: game.settings.get(
          "pf2e-bestiary-tracking",
          "automatic-combat-registration",
        ),
        sameNameDuplicates: game.settings.get(
          "pf2e-bestiary-tracking",
          "sameNameDuplicates",
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
      {
        name: game.i18n.localize(
          "PF2EBestiary.Settings.NPCRegistation.Choices.UniqueTag",
        ),
        value: 2,
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
    const requireReload =
      this.settings.chatMessageHandling.automaticReveal.iwr !==
      game.settings.get("pf2e-bestiary-tracking", "chat-message-handling")
        .automaticReveal.iwr;

    await game.settings.set(
      "pf2e-bestiary-tracking",
      "automatic-combat-registration",
      this.settings.creatureRegistration.automaticCombatRegistration,
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "sameNameDuplicates",
      this.settings.creatureRegistration.sameNameDuplicates,
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

    if (requireReload) {
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
    }

    this.close();
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$9, ApplicationV2: ApplicationV2$9 } = foundry.applications.api;

class BestiaryLabelsMenu extends HandlebarsApplicationMixin$9(
  ApplicationV2$9,
) {
  constructor() {
    super({});

    this.settings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-labels",
    );
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Menus.BestiaryLabels.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-labels-menu",
    classes: ["bestiary-settings-menu"],
    position: { width: "auto", height: "auto" },
    actions: {
      resetSection: this.resetSection,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-labels-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/bestiaryLabelsMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = this.settings;

    return context;
  }

  static async updateData(event, element, formData) {
    this.settings = foundry.utils.expandObject(formData.object);
    this.render();
  }

  static async resetSection(_, button) {
    await foundry.utils.setProperty(
      this.settings,
      button.dataset.path,
      getVagueDescriptionLabels()[button.dataset.property],
    );
    this.render();
  }

  static async save(options) {
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-labels",
      this.settings,
    );
    this.close();
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$8, ApplicationV2: ApplicationV2$8 } = foundry.applications.api;

class VagueDescriptionsMenu extends HandlebarsApplicationMixin$8(
  ApplicationV2$8,
) {
  constructor() {
    super({});

    this.settings = foundry.utils.deepClone(
      game.settings.get("pf2e-bestiary-tracking", "vague-descriptions"),
    );
    this.helperSettings = {
      properties: {
        all: Object.keys(this.settings.properties).every(
          (key) => this.settings.properties[key],
        ),
      },
      settings: {
        all: Object.keys(this.settings.settings).every(
          (key) => this.settings.settings[key],
        ),
      },
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Menus.VagueDescriptions.Name");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-vague-descriptions-menu",
    classes: ["bestiary-settings-menu"],
    position: { width: "auto", height: "auto" },
    actions: {
      toggleSection: this.toggleSection,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "vague-descriptions-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/vagueDescriptionsMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = this.settings;
    context.helperSettings = this.helperSettings;

    return context;
  }

  static async updateData(event, element, formData) {
    const { settings } = foundry.utils.expandObject(formData.object);
    this.settings = foundry.utils.mergeObject(this.settings, settings);

    this.helperSettings = {
      properties: {
        all: Object.keys(this.settings.properties).every(
          (key) => this.settings.properties[key],
        ),
      },
      settings: {
        all: Object.keys(this.settings.settings).every(
          (key) => this.settings.settings[key],
        ),
      },
    };

    this.render();
  }

  static toggleSection(_, button) {
    this.helperSettings[button.dataset.section].all =
      !this.helperSettings[button.dataset.section].all;

    for (var key in this.settings[button.dataset.section]) {
      this.settings[button.dataset.section][key] =
        this.helperSettings[button.dataset.section].all;
    }

    this.render();
  }

  static async save() {
    const requireReload =
      this.settings.settings.simpleSaves !==
      game.settings.get("pf2e-bestiary-tracking", "vague-descriptions").settings
        .simpleSaves;

    await game.settings.set(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
      this.settings,
    );

    if (requireReload) {
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
    }

    this.close();
  }
}

const coreDark = {
  "--pf2e-bestiary-tracking-application-image": "ignore",
  "--pf2e-bestiary-tracking-application": "#12101fe6",
  "--pf2e-bestiary-tracking-application-header": "transparent",
  "--pf2e-bestiary-tracking-application-header-image": "ignore",
  "--pf2e-bestiary-tracking-application-header-image-size": "cover",
  "--pf2e-bestiary-tracking-application-header-image-repeat": "initial",
  "--pf2e-bestiary-tracking-application-header-image-position": "left",
  "--pf2e-bestiary-tracking-primary": "#5e0000",
  "--pf2e-bestiary-tracking-primary-faded": "#5e000080",
  "--pf2e-bestiary-tracking-secondary": "#4b4b8c",
  "--pf2e-bestiary-tracking-tertiary": "#007149",
  "--pf2e-bestiary-tracking-primary-accent": "#ad0303",
  "--pf2e-bestiary-tracking-tertiary-accent": "#76963f",
  "--pf2e-bestiary-tracking-primary-color": "#FFFFFF",
  "--pf2e-bestiary-tracking-text-shadow": "#000000",
  "--pf2e-bestiary-tracking-main-hover": "#FFFFFF",
  "--pf2e-bestiary-tracking-border": "#ababab",
  "--pf2e-bestiary-tracking-secondary-border": "#ffd700",
  "--pf2e-bestiary-tracking-application-border": "#f5deb3",
  "--pf2e-bestiary-tracking-icon": "#f7f3e8",
  "--pf2e-bestiary-tracking-secondary-icon": "#FFFFFF",
};

const coreLight = {
  "--pf2e-bestiary-tracking-application-image": "../../../ui/parchment.jpg",
  "--pf2e-bestiary-tracking-application-header": "#444444",
  "--pf2e-bestiary-tracking-application-header-image": "ignore",
  "--pf2e-bestiary-tracking-application-header-image-size": "cover",
  "--pf2e-bestiary-tracking-application-header-image-repeat": "initial",
  "--pf2e-bestiary-tracking-application-header-image-position": "left",
  "--pf2e-bestiary-tracking-application-image-repeat": "repeat",
  "--pf2e-bestiary-tracking-application-image-position": "left",
  "--pf2e-bestiary-tracking-application": "initial",
  "--pf2e-bestiary-tracking-primary": "#d4bdac",
  "--pf2e-bestiary-tracking-primary-faded": "#d4bdac40",
  "--pf2e-bestiary-tracking-secondary": "#62b356",
  "--pf2e-bestiary-tracking-tertiary": "#62acce",
  "--pf2e-bestiary-tracking-primary-accent": "#fff1db",
  "--pf2e-bestiary-tracking-tertiary-accent": "#9de0ff",
  "--pf2e-bestiary-tracking-primary-color": "#000000",
  "--pf2e-bestiary-tracking-text-shadow": "none",
  "--pf2e-bestiary-tracking-main-hover": "#1c8efe",
  "--pf2e-bestiary-tracking-border": "#000000",
  "--pf2e-bestiary-tracking-secondary-border": "#82acff",
  "--pf2e-bestiary-tracking-application-border": "initial",
  "--pf2e-bestiary-tracking-icon": "#000000",
  "--pf2e-bestiary-tracking-secondary-icon": "#000000",
};

const nebula = {
  "--pf2e-bestiary-tracking-application-image":
    "../../../modules/pf2e-bestiary-tracking/assets/Space.webp",
  "--pf2e-bestiary-tracking-application-header": "transparent",
  "--pf2e-bestiary-tracking-application-header-image": "ignore",
  "--pf2e-bestiary-tracking-application-header-image-size": "cover",
  "--pf2e-bestiary-tracking-application-header-image-repeat": "initial",
  "--pf2e-bestiary-tracking-application-header-image-position": "left",
  "--pf2e-bestiary-tracking-application-image-size": "cover",
  "--pf2e-bestiary-tracking-application-image-repeat": "round",
  "--pf2e-bestiary-tracking-application-image-position": "left",
  "--pf2e-bestiary-tracking-application-secondary-image":
    "linear-gradient(#8a549c, #9198e5)",
  "--pf2e-bestiary-tracking-application": "",
  "--pf2e-bestiary-tracking-primary-outline": "drop-shadow(0 0 3px #808080)",
  "--pf2e-bestiary-tracking-primary": "#73a9bc",
  "--pf2e-bestiary-tracking-primary-faded": "#73a9bc80",
  "--pf2e-bestiary-tracking-secondary": "#cd7e23",
  "--pf2e-bestiary-tracking-tertiary": "#7476a6",
  "--pf2e-bestiary-tracking-primary-accent": "#0888b5",
  "--pf2e-bestiary-tracking-tertiary-accent": "#888bc0",
  "--pf2e-bestiary-tracking-primary-color": "#f7f3e8",
  "--pf2e-bestiary-tracking-text-shadow": "#000000",
  "--pf2e-bestiary-tracking-main-hover": "",
  "--pf2e-bestiary-tracking-border": "#e4e41e",
  "--pf2e-bestiary-tracking-secondary-border": "#ffd700",
  "--pf2e-bestiary-tracking-application-border": "#e4e41e",
  "--pf2e-bestiary-tracking-icon": "#FFFFFF",
  "--pf2e-bestiary-tracking-secondary-icon": "#f7f3e8",
};

const viscera = {
  "--pf2e-bestiary-tracking-application-image":
    "../../../modules/pf2e-bestiary-tracking/assets/Viscera.webp",
  "--pf2e-bestiary-tracking-application-header": "transparent",
  "--pf2e-bestiary-tracking-application-header-image": "ignore",
  "--pf2e-bestiary-tracking-application-header-image-size": "cover",
  "--pf2e-bestiary-tracking-application-header-image-repeat": "initial",
  "--pf2e-bestiary-tracking-application-header-image-position": "left",
  "--pf2e-bestiary-tracking-application-image-size": "cover",
  "--pf2e-bestiary-tracking-application-image-repeat": "initial",
  "--pf2e-bestiary-tracking-application-image-position": "left",
  "--pf2e-bestiary-tracking-application-secondary-image": "",
  "--pf2e-bestiary-tracking-application": "",
  "--pf2e-bestiary-tracking-primary-outline": "drop-shadow(0 0 3px #808080)",
  "--pf2e-bestiary-tracking-primary": "#813f3f",
  "--pf2e-bestiary-tracking-primary-faded": "#813f3f80",
  "--pf2e-bestiary-tracking-secondary": "#483c70",
  "--pf2e-bestiary-tracking-tertiary": "#ed143d",
  "--pf2e-bestiary-tracking-primary-accent": "#9f2828",
  "--pf2e-bestiary-tracking-tertiary-accent": "#c12c2c",
  "--pf2e-bestiary-tracking-primary-color": "#FFFFFF",
  "--pf2e-bestiary-tracking-text-shadow": "#000000",
  "--pf2e-bestiary-tracking-main-hover": "#ff0000",
  "--pf2e-bestiary-tracking-border": "#ffa500",
  "--pf2e-bestiary-tracking-secondary-border": "#ffd700",
  "--pf2e-bestiary-tracking-application-border": "#ffa500",
  "--pf2e-bestiary-tracking-icon": "#FFFFFF",
  "--pf2e-bestiary-tracking-secondary-icon": "#FFFFFF",
};

const water = {
  "--pf2e-bestiary-tracking-application-image":
    "../../../modules/pf2e-bestiary-tracking/assets/Water.webp",
  "--pf2e-bestiary-tracking-application-image-size": "cover",
  "--pf2e-bestiary-tracking-application-image-repeat": "initial",
  "--pf2e-bestiary-tracking-application-image-position": "left",
  "--pf2e-bestiary-tracking-application-header": "transparent",
  "--pf2e-bestiary-tracking-application-header-image": "ignore",
  "--pf2e-bestiary-tracking-application-header-image-size": "cover",
  "--pf2e-bestiary-tracking-application-header-image-repeat": "initial",
  "--pf2e-bestiary-tracking-application-header-image-position": "left",
  "--pf2e-bestiary-tracking-application-secondary-image": "",
  "--pf2e-bestiary-tracking-application": "",
  "--pf2e-bestiary-tracking-primary-outline": "drop-shadow(0 0 3px #808080)",
  "--pf2e-bestiary-tracking-primary": "#1ca671",
  "--pf2e-bestiary-tracking-primary-faded": "#1ca67180",
  "--pf2e-bestiary-tracking-secondary": "#8b0d8b",
  "--pf2e-bestiary-tracking-tertiary": "#602fa1",
  "--pf2e-bestiary-tracking-primary-accent": "#0f7e2fbf",
  "--pf2e-bestiary-tracking-tertiary-accent": "#681ad1",
  "--pf2e-bestiary-tracking-primary-color": "#f7f3e8",
  "--pf2e-bestiary-tracking-text-shadow": "#000000",
  "--pf2e-bestiary-tracking-main-hover": "#FFFFFF",
  "--pf2e-bestiary-tracking-border": "#c7ffed",
  "--pf2e-bestiary-tracking-secondary-border": "#ffd700",
  "--pf2e-bestiary-tracking-application-border": "#c7ffed",
  "--pf2e-bestiary-tracking-icon": "#FFFFFF",
  "--pf2e-bestiary-tracking-secondary-icon": "#f7f3e8",
};

const bestiaryThemes = {
  coreLight: {
    name: "PF2EBestiary.Themes.CoreLight",
    props: coreLight,
  },
  coreDark: {
    name: "PF2EBestiary.Themes.CoreDark",
    props: coreDark,
  },
  nebula: {
    name: "PF2EBestiary.Themes.Nebula",
    props: nebula,
  },
  viscera: {
    name: "PF2EBestiary.Themes.Viscera",
    props: viscera,
  },
  water: {
    name: "PF2EBestiary.Themes.Water",
    props: water,
  },
  // parchment: parchment,
};

const extendedBestiaryThemes = () => {
  const customThemes = game.settings.get(
    "pf2e-bestiary-tracking",
    "custom-themes",
  );
  return { ...bestiaryThemes, ...customThemes };
};

const bestiaryThemeChoices = {
  coreLight: "PF2EBestiary.Themes.CoreLight",
  coreDark: "PF2EBestiary.Themes.CoreDark",
  nebula: "PF2EBestiary.Themes.Nebula",
  viscera: "PF2EBestiary.Themes.Viscera",
  water: "PF2EBestiary.Themes.Water",
  // parchment: 'Parchment',
};

const defaultThemeChoices = () => {
  const customThemes = game.settings.get(
    "pf2e-bestiary-tracking",
    "custom-themes",
  );
  return {
    ...bestiaryThemeChoices,
    ...Object.keys(customThemes).reduce((acc, x) => {
      acc[x] = customThemes[x].name;
      return acc;
    }, {}),
  };
};

const extendedBestiaryThemeChoices = () => {
  const customThemes = game.settings.get(
    "pf2e-bestiary-tracking",
    "custom-themes",
  );
  return {
    default: "PF2EBestiary.Themes.Default",
    ...bestiaryThemeChoices,
    ...Object.keys(customThemes).reduce((acc, x) => {
      acc[x] = customThemes[x].name;
      return acc;
    }, {}),
  };
};

const dispositionIconModes = {
  TextOnly: {
    value: 0,
    label: "PF2EBestiary.Menus.BestiaryDisplay.DispositionIcons.TextOnly",
  },
  TextAndIcon: {
    value: 1,
    label: "PF2EBestiary.Menus.BestiaryDisplay.DispositionIcons.TextAndIcons",
  },
  IconOnly: {
    value: 2,
    label: "PF2EBestiary.Menus.BestiaryDisplay.DispositionIcons.IconsOnly",
  },
};

const dispositionIconSize = {
  normal: {
    value: "normal",
    label: "PF2EBestiary.Menus.BestiaryDisplay.DispositionIcons.SizeNormal",
  },
  large: {
    value: "large",
    label: "PF2EBestiary.Menus.BestiaryDisplay.DispositionIcons.SizeLarge",
  },
  huge: {
    value: "huge",
    label: "PF2EBestiary.Menus.BestiaryDisplay.DispositionIcons.SizeHuge",
  },
};

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$7, ApplicationV2: ApplicationV2$7 } = foundry.applications.api;

class BestiaryDisplayMenu extends HandlebarsApplicationMixin$7(
  ApplicationV2$7,
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
      additionalCreatureTypes: game.settings
        .get("pf2e-bestiary-tracking", "additional-creature-types")
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

    $(htmlElement)
      .find(".disposition-mode-select")
      .on("change", async (event) => {
        this.settings.dispositionIcons.mode = Number.parseInt(
          event.currentTarget.value,
        );
        this.render();
      });

    $(htmlElement)
      .find(".disposition-icon-size-select")
      .on("change", async (event) => {
        this.settings.dispositionIcons.iconSize = event.currentTarget.value;
        this.render();
      });

    $(htmlElement)
      .find(".disposition-image-input")
      .on("change", async (event) => {
        this.settings.dispositionIcons.icons[event.currentTarget.dataset.key] =
          {
            isIcon: true,
            image: event.currentTarget.value,
          };
        this.render();
      });

    const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);
    const creatureTraits = Object.keys(CONFIG.PF2E.creatureTraits).filter(
      (x) => !creatureTypes.includes(x),
    );

    const traitsInput = $(htmlElement).find(".traits-input")[0];
    const traitsTagify = new Y(traitsInput, {
      tagTextProp: "name",
      enforceWhitelist: true,
      whitelist: creatureTraits.map((key) => {
        const label = CONFIG.PF2E.creatureTraits[key];
        return { value: key, name: game.i18n.localize(label) };
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

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = {
      ...this.settings,
      additionalCreatureTypes: this.settings.additionalCreatureTypes?.length
        ? this.settings.additionalCreatureTypes.map((x) => x.name)
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

    return context;
  }

  static async updateData(event, element, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.settings = {
      additionalCreatureTypes: this.settings.additionalCreatureTypes,
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
    };
    this.render();
  }

  async creatureTraitSelect(event) {
    this.settings.additionalCreatureTypes = event.detail?.value
      ? JSON.parse(event.detail.value)
      : [];
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
      "additional-creature-types",
      this.settings.additionalCreatureTypes.map((x) => ({
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
    this.close();
  }
}

function handleSocketEvent({ action = null, data = {} } = {}) {
  switch (action) {
    case socketEvent.UpdateBestiary:
      Hooks.callAll(socketEvent.UpdateBestiary, {
        monsterSlug: data.monsterSlug,
      });
      break;
    case socketEvent.ResetBestiaryTheme:
      Hooks.callAll(socketEvent.ResetBestiaryTheme, {});
  }
}

const socketEvent = {
  UpdateBestiary: "UpdateBestiary",
  ResetBestiaryTheme: "ResetBestiaryTheme",
};

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$6, ApplicationV2: ApplicationV2$6 } = foundry.applications.api;

class ImportDialog extends HandlebarsApplicationMixin$6(
  ApplicationV2$6,
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
    $(htmlElement)
      .find(".file-path")
      .on("change", async (event) => {
        const nameElement = $(this.element).find(".name-field")[0];
        const importButton = $(this.element).find(
          'button[data-action="importFile"]',
        )[0];
        if (!event.currentTarget.value) {
          $(importButton).prop("disabled", true);
          $(nameElement).prop("disabled", true);
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

          $(importButton).prop("disabled", false);
          $(nameElement).prop("disabled", false);
          nameElement.value = jsonObject.system?.name?.value ?? jsonObject.name;
        }
      });
  }

  close(options) {
    this.reject();
    super.close(options);
  }

  static async importFile() {
    const files = $(this.element).find(".file-path")[0].files;
    const name = $(this.element).find(".name-field")[0].value;

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

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$5, ApplicationV2: ApplicationV2$5 } = foundry.applications.api;

class BestiaryThemesMenu extends HandlebarsApplicationMixin$5(
  ApplicationV2$5,
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
      const headerBackgroundImage =
        theme.props["--pf2e-bestiary-tracking-application-header-image"];
      acc[key] = {
        ...theme,
        props: {
          ...theme.props,
          ["--pf2e-bestiary-tracking-application-image"]:
            backgroundImage === "ignore"
              ? "ignore"
              : backgroundImage.split("../../../")[1],
          ["--pf2e-bestiary-tracking-application-header-image"]:
            headerBackgroundImage === "ignore"
              ? "ignore"
              : headerBackgroundImage.split("../../../")[1],
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
            [event.currentTarget.dataset.theme]: event.currentTarget.value,
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
            [event.currentTarget.dataset.theme]: event.currentTarget.value,
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
            [event.currentTarget.dataset.theme]: event.currentTarget.value,
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
    context.backgroundSizeOptions = [
      { value: "initial", name: "initial" },
      { value: "cover", name: "cover" },
    ];
    context.backgroundRepeatOptions = [
      { value: "no-repeat", name: "no-repeat" },
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
    copyProps["--pf2e-bestiary-tracking-application-header-image"] =
      copyProps["--pf2e-bestiary-tracking-application-header-image"] ===
      "ignore"
        ? ""
        : copyProps["--pf2e-bestiary-tracking-application-header-image"].split(
            "../../../",
          )[1];
    return copyProps;
  }

  static getNextName = (customThemes) => {
    const unnamedNr = Object.values(customThemes).reduce((acc, x) => {
      const match = x.name.match(/^(?:NewTheme)(.*)$/);
      if (match?.length > 1 && !Number.isNaN(match[1])) {
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
        "--pf2e-bestiary-tracking-application-image": "ignore",
        "--pf2e-bestiary-tracking-application-image-size": "cover",
        "--pf2e-bestiary-tracking-application-image-repeat": "round",
        "--pf2e-bestiary-tracking-application-image-position": "top",
        "--pf2e-bestiary-tracking-application-header": "transparent",
        "--pf2e-bestiary-tracking-application-header-image": "ignore",
        "--pf2e-bestiary-tracking-application-header-image-size": "cover",
        "--pf2e-bestiary-tracking-application-header-image-repeat": "round",
        "--pf2e-bestiary-tracking-application-header-image-position": "top",
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
    saveDataToFile$1(
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

    updateTheme["--pf2e-bestiary-tracking-application-header-image"] =
      updateTheme["--pf2e-bestiary-tracking-application-header-image"]
        ? `../../../${updateTheme["--pf2e-bestiary-tracking-application-header-image"]}`
        : "ignore";

    setupTheme(updateTheme);
  }

  static clearBackgroundImage(_, button) {
    this.customThemes[this.selectedTheme].props[button.dataset.theme] =
      "ignore";
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
        const headerBackgroundImage =
          this.customThemes[key].props[
            "--pf2e-bestiary-tracking-application-header-image"
          ];
        acc[key] = {
          ...this.customThemes[key],
          props: {
            ...this.customThemes[key].props,
            ["--pf2e-bestiary-tracking-application-image"]: backgroundImage
              ? `../../../${backgroundImage}`
              : "ignore",
            ["--pf2e-bestiary-tracking-application-header-image"]:
              headerBackgroundImage
                ? `../../../${headerBackgroundImage}`
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

const currentVersion = "1.1.29";
const bestiaryFolder = "BestiaryTracking Bestiares";

const dataTypeSetup = () => {
  CONFIG.JournalEntryPage.dataModels = {
    ...CONFIG.JournalEntryPage.dataModels,
    "pf2e-bestiary-tracking.creature": Creature,
    "pf2e-bestiary-tracking.npc": NPC,
    "pf2e-bestiary-tracking.hazard": Hazard,
  };
};

const setupTheme = (theme) => {
  const root = document.querySelector(":root");
  for (var property of Object.keys(theme)) {
    if (
      [
        "--pf2e-bestiary-tracking-application-image",
        "--pf2e-bestiary-tracking-application-header-image",
      ].includes(property) &&
      theme[property] !== "ignore"
    ) {
      root.style.setProperty(property, `url("${theme[property]}")`);
    } else {
      root.style.setProperty(property, theme[property]);
    }
  }
};

const registerKeyBindings = () => {
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

  game.keybindings.register("pf2e-bestiary-tracking", "open-bestiary-combat", {
    name: game.i18n.localize(
      "PF2EBestiary.KeyBindings.OpenBestiaryCombat.Name",
    ),
    hint: game.i18n.localize(
      "PF2EBestiary.KeyBindings.OpenBestiaryCombat.Hint",
    ),
    uneditable: [],
    editable: [],
    onDown: () =>
      game.modules.get("pf2e-bestiary-tracking").macros.openBestiaryCombat(),
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

  game.keybindings.register("pf2e-bestiary-tracking", "view-as-player", {
    name: game.i18n.localize("PF2EBestiary.KeyBindings.ViewAsPlayer.Name"),
    hint: game.i18n.localize("PF2EBestiary.KeyBindings.ViewAsPlayer.Hint"),
    uneditable: [],
    editable: [
      {
        key: "ControlLeft",
        modifiers: [],
      },
    ],
    restricted: true,
    reservedModifiers: [],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
};

const registerGameSettings = () => {
  configSettings();
  generalNonConfigSettings();
  vagueDescriptions();
  bestiaryLabels();
  bestiaryDisplay();
  bestiaryAppearance();
  bestiaryIntegration();
  bestiaryThemesMenu();
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

  game.settings.register("pf2e-bestiary-tracking", "bestiary-default-theme", {
    name: game.i18n.localize("PF2EBestiary.Settings.BestiaryDefaultTheme.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.BestiaryDefaultTheme.Hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      choices: defaultThemeChoices,
      required: true,
    }),
    requiresReload: true,
    default: "coreLight",
  });

  game.settings.register("pf2e-bestiary-tracking", "bestiary-theme", {
    name: game.i18n.localize("PF2EBestiary.Settings.BestiaryTheme.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.BestiaryTheme.Hint"),
    scope: "client",
    config: true,
    type: new foundry.data.fields.StringField({
      choices: extendedBestiaryThemeChoices,
      required: true,
    }),
    requiresReload: true,
    onChange: async (value) => {
      if (!value) return;

      game.user.setFlag("pf2e-bestiary-tracking", "bestiary-theme", value);
    },
    default: "default",
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

  game.settings.register("pf2e-bestiary-tracking", "bestiary-settings", {
    name: "",
    hint: "",
    scope: "world",
    config: false,
    type: Object,
    default: {
      npc: {
        categorySort: npcCategorySortOptions.manual.value,
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
        simpleSaves: false,
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

const bestiaryDisplay = () => {
  game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-display", {
    name: game.i18n.localize("PF2EBestiary.Menus.BestiaryDisplay.Menu.Name"),
    label: game.i18n.localize("PF2EBestiary.Menus.BestiaryDisplay.Menu.Label"),
    hint: game.i18n.localize("PF2EBestiary.Menus.BestiaryDisplay.Menu.Hint"),
    icon: "fa-solid fa-sitemap",
    type: BestiaryDisplayMenu,
    restricted: true,
  });

  game.settings.register("pf2e-bestiary-tracking", "used-sections", {
    name: game.i18n.localize("PF2EBestiary.Settings.UsedSections.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.UsedSections.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      creature: true,
      npc: true,
      hazard: true,
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

  game.settings.register(
    "pf2e-bestiary-tracking",
    "bestiary-journal-settings",
    {
      name: game.i18n.localize(
        "PF2EBestiary.Settings.BestiaryJournalSettings.Name",
      ),
      hint: game.i18n.localize(
        "PF2EBestiary.Settings.BestiaryJournalSettings.Hint",
      ),
      scope: "world",
      config: false,
      type: Object,
      default: {
        active: true,
        name: "PF2EBestiary.Bestiary.Welcome.GMsSection.RecallKnowledgeRulesTitle",
        image: "icons/sundries/books/book-embossed-bound-brown.webp",
      },
    },
  );

  game.settings.register("pf2e-bestiary-tracking", "hide-welcome", {
    name: game.i18n.localize("PF2EBestiary.Settings.HideWelcome.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.HideWelcome.Hint"),
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("pf2e-bestiary-tracking", "hide-tips", {
    name: game.i18n.localize("PF2EBestiary.Settings.HideTips.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.HideTips.Hint"),
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("pf2e-bestiary-tracking", "sections-position", {
    name: game.i18n.localize("PF2EBestiary.Settings.SectionsPosition.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.SectionsPosition.Hint"),
    scope: "world",
    config: false,
    type: String,
    default: "top",
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
        iwr: true,
      },
    },
  );

  game.settings.register("pf2e-bestiary-tracking", "sheet-settings", {
    name: game.i18n.localize("PF2EBestiary.Settings.SheetSettings.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.SheetSettings.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      toBestiaryButton: toBestiaryOptions.no.value,
    },
  });

  game.settings.register("pf2e-bestiary-tracking", "disposition-icons", {
    name: game.i18n.localize("PF2EBestiary.Settings.DispositionIcons.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.DispositionIcons.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      mode: dispositionIconModes.TextOnly.value,
      iconSize: dispositionIconSize.normal.value,
      icons: {
        helpful: { isIcon: true, image: "fa-regular fa-face-smile-beam" },
        friendly: { isIcon: true, image: "fa-regular fa-face-smile" },
        indifferent: { isIcon: true, image: "fa-regular fa-face-meh" },
        unfriendly: { isIcon: true, image: "fa-regular fa-face-frown-open" },
        hostile: { isIcon: true, image: "fa-regular fa-face-angry" },
      },
    },
  });
};

const bestiaryAppearance = () => {
  game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-appearance", {
    name: game.i18n.localize("PF2EBestiary.Menus.BestiaryAppearance.Menu.Name"),
    label: game.i18n.localize(
      "PF2EBestiary.Menus.BestiaryAppearance.Menu.Label",
    ),
    hint: game.i18n.localize("PF2EBestiary.Menus.BestiaryAppearance.Menu.Hint"),
    icon: "fa-solid fa-palette",
    type: BestiaryAppearanceMenu,
    restricted: true,
  });

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

  game.settings.register("pf2e-bestiary-tracking", "sameNameDuplicates", {
    name: game.i18n.localize("PF2EBestiary.Settings.SameNameDuplicates.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.SameNameDuplicates.Hint"),
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
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
        iwr: false,
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
      2: game.i18n.localize(
        "PF2EBestiary.Settings.NPCRegistation.Choices.UniqueTag",
      ),
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
        nameInfo: false,
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

const bestiaryThemesMenu = () => {
  game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-themes", {
    name: game.i18n.localize("PF2EBestiary.Menus.BestiaryThemes.Menu.Name"),
    label: game.i18n.localize("PF2EBestiary.Menus.BestiaryThemes.Menu.Label"),
    hint: game.i18n.localize("PF2EBestiary.Menus.BestiaryThemes.Menu.Hint"),
    icon: "fa-solid fa-brush",
    type: BestiaryThemesMenu,
    restricted: true,
  });

  game.settings.register("pf2e-bestiary-tracking", "custom-themes", {
    name: game.i18n.localize("PF2EBestiary.Settings.DefaultRevealed.Name"),
    hint: game.i18n.localize("PF2EBestiary.Settings.DefaultReaveled.Hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });
};

const getCreatureDataFromOld = (actor) => {
  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Object.values(actor.items);

  const spells = !itemKeys.some((x) => x._id === "Spell-None")
    ? {
        fake: null,
        entries: itemKeys.reduce((acc, entry) => {
          if (entry.type === "spellcastingEntry") {
            const levels = {};
            Object.values(actor.items).forEach((spell) => {
              if (
                spell.type === "spell" &&
                spell.system.location.value === entry._id
              ) {
                const levelValue = getSpellLevel(
                  spell,
                  actor.system.details.level.value,
                );

                var level = Object.values(levels).find(
                  (x) => x.value === levelValue,
                );
                if (!level) {
                  level = { value: levelValue, spells: {} };
                }

                const showActions = !spell.system.traits.value.some(
                  (x) => x === "exploration" || x === "downtime",
                );
                level.spells[spell._id] = {
                  revealed: spell.revealed,
                  label: spell.name,
                  img: spell.img,
                  actions: showActions
                    ? spell.system.time.value.replace("to", "-")
                    : "",
                  defense: spell.system.defense?.save?.statistic
                    ? {
                        statistic: spell.system.defense.save.statistic,
                        basic: spell.system.defense.save.basic,
                      }
                    : null,
                  range: spell.system.range.value,
                  traits: {
                    rarity: spell.system.traits.rarity,
                    traditions: spell.system.traits.traditions,
                    values: spell.system.traits.value.reduce((acc, trait) => {
                      acc[trait] = { value: trait };
                      return acc;
                    }, {}),
                  },
                  description: {
                    gm: spell.system.description.gm,
                    value: spell.system.description.value,
                  },
                };

                levels[levelValue] = level;
              }
            });

            acc[entry._id] = {
              revealed: entry.revealed,
              tradition: entry.system.tradition.value,
              category: entry.system.prepared.value,
              dc: entry.system.spelldc.dc,
              mod: {
                value: actor.system.abilities[entry.system.ability.value].mod,
              },
              attack: entry.system.spelldc.value,
              levels: levels,
            };
          }

          return acc;
        }, {}),
      }
    : {
        fake: { revealed: actor.items["Spells-None"].revealed },
        entries: {},
      };

  return {
    type: "pf2e-bestiary-tracking.creature",
    name: actor.name.value,
    ownership: { default: 3 },
    system: {
      hidden: actor.hidden,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      name: actor.name,
      hardness: { value: actor.system.attributes.hardness.value },
      allSaves: { value: actor.system.attributes.allSaves.value },
      publication: actor.system.details.publication,
      ac: {
        value: Number.parseInt(actor.system.attributes.ac.value),
        revealed: Boolean(actor.system.attributes.ac),
        custom: actor.system.attributes.ac.custom,
        details: actor.system.attributes.ac.details,
      },
      hp: {
        value: Number.parseInt(actor.system.attributes.hp.max),
        revealed: Boolean(actor.system.attributes.hp.revealed),
        custom: actor.system.attributes.hp.custom,
        temp: Number.parseInt(actor.system.attributes.hp.temp),
        details: actor.system.attributes.hp.details,
        negativeHealing: actor.system.attributes.hp.negativeHealing,
      },
      level: {
        value: Number.parseInt(actor.system.details.level.value),
        revealed: actor.system.details.level.revealed,
        custom: actor.system.details.level.custom,
      },
      size: actor.system.traits.size.value,
      rarity: { value: actor.system.traits.rarity },
      traits: actor.system.traits.value,
      skills: Object.values(actor.system.skills).some((x) => x.base > 0)
        ? Object.keys(actor.system.skills).reduce((acc, key) => {
            const skill = actor.system.skills[key];
            acc[key] = {
              value: skill.base,
              revealed: skill.revealed,
              lore: skill.lore,
              note: skill.note,
              modifiers: skill.modifiers
                .filter((x) => x.slug !== "base")
                .map((x) => ({
                  kind: x.kind,
                  label: x.label,
                  modifier: x.modifier,
                })),
              label: skill.label,
              totalModifier: Number.parseInt(skill.totalModifier),
            };
            return acc;
          }, {})
        : { empty: { empty: true, value: "PF2EBestiary.Miscellaneous.None" } },
      saves: {
        fortitude: {
          value: actor.system.saves.fortitude.value,
          revealed: actor.system.saves.fortitude.revealed,
          custom: actor.system.saves.fortitude.custom,
        },
        reflex: {
          value: actor.system.saves.reflex.value,
          revealed: actor.system.saves.reflex.revealed,
          custom: actor.system.saves.reflex.custom,
        },
        will: {
          value: actor.system.saves.will.value,
          revealed: actor.system.saves.will.revealed,
          custom: actor.system.saves.will.custom,
        },
      },
      speeds: {
        details: { name: actor.system.attributes.speed.details },
        values: {
          land: {
            type: "land",
            value: actor.system.attributes.speed.value,
            revealed: actor.system.attributes.speed.revealed,
          },
          ...actor.system.attributes.speed.otherSpeeds.reduce((acc, speed) => {
            acc[speed.label] = {
              type: speed.type,
              value: speed.value,
              revealed: speed.revealed,
            };
            return acc;
          }, {}),
        },
      },
      abilities: Object.keys(actor.system.abilities).reduce((acc, key) => {
        acc[key] = {
          key: key,
          revealed: actor.system.abilities[key].revealed,
          mod: actor.system.abilities[key].mod,
          custom: actor.system.abilities[key].custom,
        };
        return acc;
      }, {}),
      senses: {
        perception: {
          value: actor.system.perception.value,
          revealed: actor.system.perception.revealed,
          custom: actor.system.perception.custom,
        },
        details: actor.system.perception.details,
        senses: actor.system.perception.senses.reduce((acc, sense) => {
          acc[sense.type] = {
            type: sense.type,
            revealed: sense.revealed,
            acuity: sense.acuity,
            range: sense.range,
          };
          return acc;
        }, {}),
      },
      languages: {
        details: actor.system.details.languages.details,
        values:
          actor.system.details.languages.value.length > 0
            ? actor.system.details.languages.value.reduce((acc, language) => {
                acc[language.value] = language;
                return acc;
              }, {})
            : {
                empty: {
                  empty: true,
                  value: "PF2EBestiary.Miscellaneous.None",
                  exceptions: {},
                },
              },
      },
      immunities: immunitiesKeys.reduce((acc, key) => {
        const immunity = actor.system.attributes.immunities[key];
        acc[key] = {
          empty: Boolean(immunity.empty),
          fake: Boolean(immunity.fake),
          revealed: immunity.revealed,
          type: immunity.empty
            ? "PF2EBestiary.Miscellaneous.None"
            : immunity.type,
          exceptions:
            immunity.exceptions?.reduce((acc, exception) => {
              const type = exception.value.label ?? exception.value;
              acc[slugify(type)] = { revealed: exception.revealed, type: type };
              return acc;
            }, {}) ?? {},
        };

        return acc;
      }, {}),
      weaknesses: weaknessesKeys.reduce((acc, key) => {
        const weakness = actor.system.attributes.weaknesses[key];
        acc[key] = {
          empty: Boolean(weakness.empty),
          fake: Boolean(weakness.fake),
          revealed: weakness.revealed,
          type: weakness.empty
            ? "PF2EBestiary.Miscellaneous.None"
            : weakness.type,
          value: weakness.value,
          exceptions:
            weakness.exceptions?.reduce((acc, exception) => {
              const type = exception.value.label ?? exception.value;
              acc[slugify(type)] = { revealed: exception.revealed, type: type };
              return acc;
            }, {}) ?? {},
        };

        return acc;
      }, {}),
      resistances: resistancesKeys.reduce((acc, key) => {
        const resistance = actor.system.attributes.resistances[key];
        acc[key] = {
          empty: Boolean(resistance.empty),
          fake: Boolean(resistance.fake),
          revealed: resistance.revealed,
          type: resistance.empty
            ? "PF2EBestiary.Miscellaneous.None"
            : resistance.type,
          value: resistance.value,
          exceptions:
            resistance.exceptions?.reduce((acc, exception) => {
              const type = exception.value.label ?? exception.value;
              acc[slugify(type)] = { revealed: exception.revealed, type: type };
              return acc;
            }, {}) ?? {},
          doubleVs:
            resistance.doubleVs?.reduce((acc, doubleVs) => {
              const type = doubleVs.value.label ?? doubleVs.value;
              acc[slugify(type)] = { revealed: doubleVs.revealed, type: type };
              return acc;
            }, {}) ?? {},
        };

        return acc;
      }, {}),
      attacks: attackKeys.reduce((acc, actionKey) => {
        const attack = actor.system.actions[actionKey];
        const item = actor.items[actionKey];

        if (attack.fake) {
          acc[actionKey] = {
            revealed: attack.revealed,
            fake: true,
            label: attack.label,
            actions: "1",
            totalModifier: 0,
            isMelee: true,
            additionalEffects: [],
            damageInstances: attack.item.system.damageRolls,
            traits: attack.traits,
            variants: attack.variants,
            rules: {},
          };
        } else if (item.type === "melee" || item.type === "equipment") {
          acc[attack.empty ? "empty" : attack.item._id] = {
            revealed: attack.revealed,
            empty: Boolean(attack.empty),
            label: attack.empty
              ? "PF2EBestiary.Miscellaneous.None"
              : attack.label,
            actions: attack.glyph,
            totalModifier: attack.totalModifier,
            isMelee: attack.weapon.system.traits.value.find(
              (x) => x.startsWith("range-increment") || x.startsWith("range"),
            )
              ? false
              : true,
            additionalEffects:
              attack.additionalEffects?.reduce((acc, effect) => {
                acc[effect.tag] = { label: effect.label, tag: effect.tag };

                return acc;
              }, {}) ?? {},
            damageInstances: Object.keys(item.system.damageRolls).reduce(
              (acc, damage) => {
                acc[damage] = {
                  category: item.system.damageRolls[damage].category,
                  damage: { value: item.system.damageRolls[damage].damage },
                  damageType: item.system.damageRolls[damage].damageType,
                };

                return acc;
              },
              {},
            ),
            traits: item.system.traits?.value?.reduce((acc, trait) => {
              acc[trait.value] = {
                revealed: trait.revealed,
                value: trait.value,
                description: trait.value,
              };
              return acc;
            }, {}),
            variants: attack.variants.reduce((acc, variant) => {
              acc[slugify(variant.label)] = { label: variant.label };

              return acc;
            }, {}),
            rules: item.system.rules ?? {},
          };
        }

        return acc;
      }, {}),
      actions: itemKeys.reduce((acc, action) => {
        if (
          action.type === "action" &&
          action.system.actionType.value !== "passive"
        ) {
          acc[action.empty ? "empty" : action._id] = {
            revealed: action.revealed,
            empty: Boolean(action.empty),
            fake: Boolean(action.fake),
            label: action.empty
              ? "PF2EBestiary.Miscellaneous.None"
              : action.name,
            category: action.system.category ?? "",
            deathNote: action.system.deathNote ?? false,
            actions: action.system.actions
              ? (action.system.actions.value ?? "R")
              : "1",
            traits: action.system.traits?.value?.reduce((acc, trait) => {
              acc[trait.value] = trait;
              return acc;
            }, {}),
            description: action.system.description.value ?? "",
          };
        }

        return acc;
      }, {}),
      passives: itemKeys.reduce((acc, action) => {
        if (
          action.type === "action" &&
          action.system.actionType.value === "passive"
        ) {
          acc[action.empty ? "empty" : action._id] = {
            revealed: action.revealed,
            empty: Boolean(action.empty),
            fake: Boolean(action.fake),
            label: action.empty
              ? "PF2EBestiary.Miscellaneous.None"
              : action.name,
            category: action.system.category ?? "",
            deathNote: action.system.deathNote ?? false,
            traits: action.system.traits?.value?.reduce((acc, trait) => {
              acc[trait.value] = trait;
              return acc;
            }, {}),
            description: action.system.description.value ?? "",
          };
        }

        return acc;
      }, {}),
      spells: spells,
      notes: {
        public: {
          value: actor.system.details.publicNotes.text,
          revealed: actor.system.details.publicNotes.revealed,
        },
        private: {
          value: actor.system.details.privateNotes.text,
          revealed: actor.system.details.privateNotes.revealed,
        },
        player: {
          value:
            game.journal
              .getName("pf2e-bestiary-tracking-journal-entry")
              ?.pages?.get(actor.system.details.playerNotes.document)?.text
              ?.content ?? "",
        },
      },
    },
  };
};

const getNPCDataFromOld = (actor, wrongCategory) => {
  const creatureData = getCreatureDataFromOld(actor);

  if (wrongCategory) {
    return {
      ...creatureData,
      type: "pf2e-bestiary-tracking.npc",
      system: {
        ...creatureData.system,
        hidden: actor.hidden,
        npcData: {
          categories: [],
          general: {
            background: { value: "" },
            appearance: { value: "" },
            personality: { value: "" },
            height: { value: "" },
            weight: { value: "" },
            birthplace: { value: "" },
            disposition: {},
          },
        },
      },
    };
  }

  return {
    ...creatureData,
    type: "pf2e-bestiary-tracking.npc",
    system: {
      ...creatureData.system,
      hidden: actor.hidden,
      npcData: {
        categories: actor.npcData.categories.map((category) => ({
          name: category.name,
          value: category.key,
        })),
        general: {
          background: actor.npcData.general.background,
          appearance: actor.npcData.general.appearance,
          personality: actor.npcData.general.personality,
          height: actor.npcData.general.height,
          weight: actor.npcData.general.weight,
          birthplace: actor.npcData.general.birthplace,
          disposition: Object.keys(actor.npcData.general.disposition).reduce(
            (acc, key) => {
              const character = game.actors.get(key);
              const characterId =
                character?.id ?? game.users.get(key).character?.id;
              if (!characterId) return acc;

              acc[characterId] = actor.npcData.general.disposition[key].value;
              return acc;
            },
            {},
          ),
        },
      },
    },
  };
};

const getOldMonsterData = async (item) => {
  const oldIsNPC = (data) => {
    const npcRegistration = game.settings.get(
      "pf2e-bestiary-tracking",
      "npc-registration",
    );
    return npcRegistration === 0
      ? data.system.traits.rarity === "unique"
      : Object.values(data.system.traits.value).find((x) =>
          x.value ? x.value === "npc" : x === "npc",
        );
  };

  const getIWRString = (base, isResistance) => {
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

  if (!item || item.hasPlayerOwner || item.type !== "npc") return null;

  const dataObject = item.toObject(false);
  dataObject.uuid = item.uuid;
  dataObject.name = { revealed: false, value: dataObject.name };

  const immunityKeys = Object.keys(dataObject.system.attributes.immunities);
  dataObject.system.attributes.immunities =
    immunityKeys.length > 0
      ? immunityKeys.reduce((acc, key) => {
          const immunity = dataObject.system.attributes.immunities[key];
          acc[getIWRString(immunity)] = {
            ...immunity,
            exceptions: immunity.exceptions.map((x) => ({
              revealed: false,
              value: x,
            })),
          };

          return acc;
        }, {})
      : {
          none: {
            revealed: false,
            empty: true,
            type: game.i18n.localize("PF2EBestiary.Miscellaneous.None"),
          },
        };

  const weaknessKeys = Object.keys(dataObject.system.attributes.weaknesses);
  dataObject.system.attributes.weaknesses =
    weaknessKeys.length > 0
      ? weaknessKeys.reduce((acc, key) => {
          const weakness = dataObject.system.attributes.weaknesses[key];
          acc[getIWRString(weakness, false)] = {
            ...weakness,
            exceptions: weakness.exceptions.map((x) => ({
              revealed: false,
              value: x,
            })),
          };

          return acc;
        }, {})
      : {
          none: {
            revealed: false,
            empty: true,
            type: game.i18n.localize("PF2EBestiary.Miscellaneous.None"),
          },
        };

  const resistanceKeys = Object.keys(dataObject.system.attributes.resistances);
  dataObject.system.attributes.resistances =
    resistanceKeys.length > 0
      ? resistanceKeys.reduce((acc, key) => {
          const resistance = dataObject.system.attributes.resistances[key];
          acc[getIWRString(resistance, true)] = {
            ...resistance,
            exceptions: resistance.exceptions.map((x) => ({
              revealed: false,
              value: x,
            })),
            doubleVs: resistance.doubleVs.map((x) => ({
              revealed: false,
              value: x,
            })),
          };

          return acc;
        }, {})
      : {
          none: {
            revealed: false,
            empty: true,
            type: game.i18n.localize("PF2EBestiary.Miscellaneous.None"),
          },
        };

  dataObject.system.traits.value = dataObject.system.traits.value.reduce(
    (acc, traitKey) => {
      acc[traitKey] = { revealed: false, value: traitKey };

      return acc;
    },
    {},
  );

  dataObject.system.actions = Object.keys(dataObject.system.actions).reduce(
    (acc, index) => {
      const action = dataObject.system.actions[index];
      acc[action.item._id] = {
        ...action,
        damageStatsRevealed: false,
      };

      Object.values(dataObject.items)
        .filter((x) => x._id === action.item._id)
        .forEach((item) => {
          if (item.type === "melee") {
            Object.keys(item.system.damageRolls).forEach((key) => {
              item.system.damageRolls[key].damageType = {
                revealed: false,
                value: item.system.damageRolls[key].damageType,
              };
            });

            item.system.traits.value = item.system.traits.value.map(
              (trait) => ({ revealed: false, value: trait }),
            );
          } else if (item.type === "equipment") {
            item.system.damageRolls = Object.keys(
              action.weapon.system.damageRolls,
            ).reduce((acc, damageKey) => {
              acc[damageKey] = {
                ...action.weapon.system.damageRolls[damageKey],
                damageType: {
                  revealed: false,
                  value: action.weapon.system.damageRolls[damageKey].damageType,
                },
              };

              return acc;
            }, {});

            // If this crops up more, make a general helper method to extract all types of rules.
            item.system.rules.forEach((rule) => {
              if (rule.key === "FlatModifier") {
                item.system.damageRolls[
                  `${rule.damageType}-${foundry.utils.randomID()}`
                ] = {
                  damageType: { revealed: false, value: rule.damageType },
                  damage: rule.value.toString(),
                  isFromRule: true,
                };
              }
            });

            item.system.traits.value = item.system.traits.value.map(
              (trait) => ({ revealed: false, value: trait }),
            );
          }
        });

      return acc;
    },
    {},
  );

  dataObject.system.perception.details = {
    revealed: false,
    value: dataObject.system.perception.details,
  };

  dataObject.system.details.languages.value =
    dataObject.system.details.languages.value.map((x) => ({
      revealed: false,
      value: x,
    }));
  dataObject.system.details.languages.details = {
    revealed: false,
    value: dataObject.system.details.languages.details,
  };

  dataObject.items = Object.keys(dataObject.items).reduce((acc, key) => {
    const item = dataObject.items[key];
    if (item.type === "spellcastingEntry") {
      item.system.spelldc.dc = {
        revealed: false,
        value: item.system.spelldc.dc,
      };
      item.system.spelldc.value = {
        revealed: false,
        value: item.system.spelldc.value,
      };
    }

    acc[item._id] = { revealed: false, ...item };

    return acc;
  }, {});

  const noSpells = !Object.keys(dataObject.items).find((x) => {
    const item = dataObject.items[x];
    return item.type === "spellcastingEntry";
  });
  if (noSpells) {
    dataObject.items["Spells-None"] = {
      type: "spellcastingEntry",
      _id: "Spell-None",
      revealed: false,
      system: {
        spelldc: {
          dc: { value: 0 },
          value: { value: 0 },
        },
      },
    };
  }

  if (Object.keys(dataObject.system.actions).length === 0) {
    dataObject.system.actions["Attack-None"] = {
      revealed: false,
      label: "None",
      empty: true,
      item: {
        system: {
          damageRolls: {},
        },
        _id: "Attack-None",
      },
      weapon: {
        system: {
          traits: {
            value: [],
          },
        },
      },
      variants: [],
      traits: [],
      totalModifier: 0,
    };

    dataObject.items["Attack-None"] = {
      _id: "Attack-None",
      empty: true,
      type: "melee",
      Name: "None",
      value: "PF2E.Miscellaneous.None",
      system: {
        damageRolls: [],
        traits: {
          value: [],
        },
      },
    };
  }

  var hasActions = false;
  var hasPassives = false;
  for (var item of Object.values(dataObject.items)) {
    if (item.type === "action") {
      item.system.traits.value = item.system.traits.value.map((trait) => ({
        revealed: false,
        value: trait,
      }));

      if (item.system.actionType.value !== "passive") hasActions = true;
      if (item.system.actionType.value === "passive") hasPassives = true;
    }
  }

  if (!hasActions) {
    dataObject.items["Action-None"] = {
      _id: "Action-None",
      empty: true,
      type: "action",
      name: "None",
      value: "PF2E.Miscellaneous.None",
      system: {
        actionType: { value: "action" },
        description: {
          value: null,
        },
        traits: {
          value: [],
        },
      },
    };
  }
  if (!hasPassives) {
    dataObject.items["Passive-None"] = {
      _id: "Passive-None",
      empty: true,
      type: "action",
      name: "None",
      value: "PF2E.Miscellaneous.None",
      system: {
        actionType: { value: "passive" },
        description: {
          value: null,
        },
        traits: {
          value: [],
        },
      },
    };
  }

  dataObject.system.details.publicNotes = {
    revealed: false,
    text: dataObject.system.details.publicNotes,
  };
  dataObject.system.details.privateNotes = {
    revealed: false,
    text: dataObject.system.details.privateNotes,
  };

  const hiddenSettings = game.settings.get(
    "pf2e-bestiary-tracking",
    "hidden-settings",
  );
  if (oldIsNPC(dataObject)) {
    dataObject.hidden = hiddenSettings.npc;
    dataObject.npcData = {
      categories: [],
      general: {
        background: { value: "", revealed: false },
        appearance: { value: "", revealed: false },
        personality: { value: "", revealed: false },
        height: { value: "", revealed: false },
        weight: { value: "", revealed: false },
        birthplace: { value: "", revealed: false },
        disposition: {},
      },
      influence: {},
    };
  } else {
    dataObject.hidden = hiddenSettings.monster;
  }

  return dataObject;
};

const handleDataMigration = async () => {
  if (!game.user.isGM) return;

  await handleDeactivatedPages();
  await handleJournalPermissions();

  var version = game.settings.get("pf2e-bestiary-tracking", "version");
  if (!version) {
    version = currentVersion;
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.1") {
    await migrateBestiary((bestiary, monster, type, monsterKey) => {
      if (!monster.name.value) {
        bestiary.monster[type][monsterKey].name = {
          revealed: false,
          value: monster.name,
        };
      }

      return null;
    });

    version = "0.8.2";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.2") {
    await migrateBestiary((bestiary, monster, type, monsterKey) => {
      const origin = game.actors.find((x) => x.id === monster?.id);
      if (!origin) {
        return { type, monsterKey };
      }

      // Attributes should now have Mod aswell as Category attributes. Can't cleanly update this but make best attempt, otherwise remove failing creatures.
      for (var ability of bestiary.monster[type][monsterKey].abilities.values) {
        ability.mod = ability.value.replace("+", "");
        ability.category = getCategoryLabel(
          attributeTable,
          origin.system.details.level.value,
          ability.mod,
        );
      }

      //Actions and passives and attacks should never be empty. Add a 'None' option.
      const actionKeys = Object.keys(monster.actions.values);
      if (actionKeys.length === 0) {
        bestiary.monster[type][monsterKey].actions.values["None"] = {
          revealed: false,
          name: "None",
        };
      }

      const passivesKeys = Object.keys(monster.passives.values);
      if (passivesKeys.length === 0) {
        bestiary.monster[type][monsterKey].passives.values["None"] = {
          revealed: false,
          name: "None",
        };
      }

      const attackKeys = Object.keys(monster.attacks.values);
      if (attackKeys.length === 0) {
        bestiary.monster[type][monsterKey].attacks.values["None"] = {
          revealed: false,
          label: "None",
        };
      }

      //Weaknesses and Resistances should use applicationLabel for type rather than the type property to include exceptions.
      Object.keys(bestiary.monster[type][monsterKey].weaknesses.values).forEach(
        (weaknessKey) => {
          const originWeakness = origin.system.attributes.weaknesses.find(
            (x) =>
              x.label ===
              bestiary.monster[type][monsterKey].weaknesses.values[weaknessKey]
                .value,
          );
          if (originWeakness) {
            bestiary.monster[type][monsterKey].weaknesses.values[
              weaknessKey
            ].category = originWeakness.applicationLabel;
          }
        },
      );

      Object.keys(
        bestiary.monster[type][monsterKey].resistances.values,
      ).forEach((resistanceKey) => {
        const originResistance = origin.system.attributes.resistances.find(
          (x) =>
            x.label ===
            bestiary.monster[type][monsterKey].resistances.values[resistanceKey]
              .value,
        );
        if (originResistance) {
          bestiary.monster[type][monsterKey].resistances.values[
            resistanceKey
          ].category = originResistance.applicationLabel;
        }
      });

      return null;
    });

    version = "0.8.4";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.4") {
    await migrateBestiary((bestiary, monster, type, monsterKey) => {
      const origin = game.actors.find((x) => x.id === monster?.id);
      if (!origin) {
        return { type, monsterKey };
      }

      // Creatures should have notes available to be revealed.
      bestiary.monster[type][monsterKey].notes = {
        public: { revealed: false, text: origin.system.details.publicNotes },
        private: { revealed: false, text: origin.system.details.privateNotes },
      };

      return null;
    });

    version = "0.8.6";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.6") {
    await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
      const origin = monster?.uuid
        ? await fromUuid(monster.uuid)
        : game.actors.find((x) => x.id === monster?.id);
      if (!origin) {
        return { type, monsterKey };
      }

      // All categories now use module settings values ranging from Extreme to Terrible
      bestiary.monster[type][monsterKey].ac.category = getCategoryLabel(
        acTable,
        origin.system.details.level.value,
        bestiary.monster[type][monsterKey].ac.value,
      );
      bestiary.monster[type][monsterKey].hp.category = getCategoryLabel(
        acTable,
        origin.system.details.level.value,
        bestiary.monster[type][monsterKey].hp.value,
      );
      bestiary.monster[type][monsterKey].saves.fortitude.category =
        getCategoryLabel(
          savingThrowPerceptionTable,
          origin.system.details.level.value,
          bestiary.monster[type][monsterKey].saves.fortitude.value,
        );
      bestiary.monster[type][monsterKey].saves.reflex.category =
        getCategoryLabel(
          savingThrowPerceptionTable,
          origin.system.details.level.value,
          bestiary.monster[type][monsterKey].saves.reflex.value,
        );
      bestiary.monster[type][monsterKey].saves.will.category = getCategoryLabel(
        savingThrowPerceptionTable,
        origin.system.details.level.value,
        bestiary.monster[type][monsterKey].saves.will.value,
      );
      bestiary.monster[type][monsterKey].abilities.values.forEach((ability) => {
        // Weird error that occured here. Safety addition.
        if (typeof x === "object") {
          ability.category = getCategoryLabel(
            attributeTable,
            origin.system.details.level.value,
            ability.mod,
          );
        }
      });
      bestiary.monster[type][monsterKey].senses.values.perception.category =
        getCategoryLabel(
          savingThrowPerceptionTable,
          origin.system.details.level.value,
          bestiary.monster[type][monsterKey].senses.values.perception.value,
        );

      // All spellcasting creatures should have spell data
      const spellcastingEntries = {};
      for (var subItem of origin.items) {
        if (subItem.type !== "spellcastingEntry") {
          continue;
        }

        const levels = {};
        for (var spell of subItem.spells) {
          const level = spell.isCantrip ? "Cantrips" : spell.level;
          if (!levels[level]) levels[level] = {};

          levels[level][spell.id] = {
            revealed: false,
            id: spell.id,
            uuid: spell.uuid,
            name: spell.name,
            img: spell.img,
            actions: spell.actionGlyph,
            defense: spell.system.defense?.save?.statistic
              ? `${spell.system.defense.save.basic ? "basic " : ""} ${spell.system.defense.save.statistic}`
              : null,
            range: spell.system.range.value,
            traits: spell.system.traits,
            description: {
              gm: spell.system.description.gm,
              value: spell.system.description.value,
            },
          };
        }

        spellcastingEntries[subItem.id] = {
          revealed: false,
          name: subItem.name,
          dc: {
            revealed: false,
            value: subItem.system.spelldc.dc,
            category: getCategoryLabel(
              spellDCTable,
              origin.system.details.level.value,
              subItem.system.spelldc.dc,
            ),
          },
          attack: {
            revealed: false,
            value: subItem.system.spelldc.value,
            category: getCategoryLabel(
              spellAttackTable,
              origin.system.details.level.value,
              subItem.system.spelldc.value,
            ),
          },
          levels: levels,
        };
      }

      bestiary.monster[type][monsterKey].spells = {
        fake:
          Object.keys(spellcastingEntries).length > 0
            ? null
            : { revealed: false },
        entries: spellcastingEntries,
      };

      return null;
    });

    //VagueDescriptions Module Settings now has 'Properties' and 'Settings' subobjects
    const vagueDescriptions = await game.settings.get(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
    );
    await game.settings.set("pf2e-bestiary-tracking", "vague-descriptions", {
      properties: {
        ac: vagueDescriptions.ac,
        hp: vagueDescriptions.hp,
        resistances: vagueDescriptions.resistances,
        weaknesses: vagueDescriptions.weaknesses,
        saves: vagueDescriptions.saves,
        perception: vagueDescriptions.perception,
        speed: vagueDescriptions.speed,
        attributes: vagueDescriptions.attributes,
      },
      settings: {
        playerBased: vagueDescriptions.playerBased,
        misinformationOptions: vagueDescriptions.misinformationOptions,
      },
    });

    version = "0.8.7";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.7") {
    await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
      if (type && monsterKey && bestiary.monster[type][monsterKey]) {
        //Yes, this is very silly, but it's an attempt to save some data after a bad previous migration tactic.
        const value =
          bestiary.monster[type][monsterKey].level?.value?.value?.value?.value
            ?.value ??
          bestiary.monster[type][monsterKey].level?.value?.value?.value
            ?.value ??
          bestiary.monster[type][monsterKey].level?.value?.value?.value ??
          bestiary.monster[type][monsterKey].level?.value?.value ??
          bestiary.monster[type][monsterKey].level;

        if (!value || value.value) {
          return { type, monsterKey };
        }

        bestiary.monster[type][monsterKey].level = {
          revealed: false,
          value: value,
        };
        return null;
      } else {
        return { type, monsterKey };
      }
    });

    version = "0.8.7.1";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.7.1") {
    //VagueDescriptions was poorly migrated last version. If the setting is now faulty --> set it to standard values.
    const vagueDescriptions = game.settings.get(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
    );
    if (!vagueDescriptions.settings) {
      await game.settings.set("pf2e-bestiary-tracking", "vague-descriptions", {
        properties: {
          ac: false,
          hp: false,
          resistances: false,
          weaknesses: false,
          saves: false,
          perception: false,
          speed: false,
          attributes: false,
        },
        settings: {
          playerBased: false,
          misinformationOptions: false,
        },
      });
    }

    // Bestiary Labels had poorly labeled settings that actually have more to do with Vague Descriptions.
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-labels", {
      vagueDescriptions: {
        ...getVagueDescriptionLabels(),
      },
    });

    await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
      const origin = monster?.uuid ? await fromUuid(monster.uuid) : null;
      if (!origin) {
        return { type, monsterKey };
      }

      // Attributes need to have shortform category names
      bestiary.monster[type][monsterKey].abilities.values.forEach((ability) => {
        ability.category = getCategoryLabel(
          attributeTable,
          origin.system.details.level.value,
          ability.mod,
          true,
        );
      });

      return null;
    });

    // Add filter to bestiary-layout setting
    const layoutSetting = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-layout",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-layout", {
      categories: {
        layout: layoutSetting.categories.layout,
        filter: { type: 0, direction: 0 },
      },
    });

    // Drop the Type portion of the Bestiary data. The information already exists in monster.inTypes
    const bestiary = await game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-tracking",
    );
    const monsterMap = Object.keys(bestiary.monster).reduce((acc, typeKey) => {
      Object.keys(bestiary.monster[typeKey]).forEach((monsterKey) => {
        const monster = bestiary.monster[typeKey][monsterKey];
        if (monster?.uuid) {
          acc.set(monster.uuid, monster);
        }
      });

      return acc;
    }, new Map());

    const newBestiary = Array.from(monsterMap.values()).reduce(
      (acc, monster) => {
        acc.monster[monster.uuid] = monster;

        return acc;
      },
      { monster: {}, npc: {} },
    );

    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-tracking",
      newBestiary,
    );

    version = "0.8.8";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.8") {
    version = "0.8.8.4";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.8.4") {
    version = "0.8.9";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9") {
    version = "0.8.9.2";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9.2") {
    // Still some users with the old version of vague descriptions. Just a safety migration
    const vagueDescriptions = game.settings.get(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
    );
    if (!vagueDescriptions.properties) {
      game.settings.set("pf2e-bestiary-tracking", "vague-descriptions", {
        properties: {
          ac: false,
          hp: false,
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
        },
        settings: {
          playerBased: false,
          misinformationOptions: false,
        },
      });
    }

    version = "0.8.9.7";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9.7") {
    const bestiary = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-tracking",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-tracking", {
      ...bestiary,
      metadata: { ...bestiary.metadata, version: "0.8.9" },
    });

    version = "0.8.9.8";
    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9.8") {
    version = "0.8.9.8.1";

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9.8.1") {
    version = "0.8.9.8.2";

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9.8.2") {
    version = "0.8.9.9";

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9.8.2") {
    version = "0.8.9.9.6";

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.9.9.6") {
    version = "0.8.12";

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.8.12") {
    version = "0.9.4";

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (version === "0.9.3" || version === "0.9.4") {
    version = "0.9.5";

    const defaultRevealed = game.settings.get(
      "pf2e-bestiary-tracking",
      "default-revealed",
    );
    await game.settings.set("pf2e-bestiary-tracking", "default-revealed", {
      ...defaultRevealed,
      npc: {
        ...defaultRevealed.npc,
        premise: false,
      },
    });

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (versionCompare(version, "1.0.0")) {
    version = "1.0.0";
    await game.settings.set("pf2e-bestiary-tracking", "default-revealed", {
      ...game.settings.get("pf2e-bestiary-tracking", "default-revealed"),
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
    });

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (versionCompare(version, "1.1.20")) {
    version = "1.1.20";
    const defaultRevealed = game.settings.get(
      "pf2e-bestiary-tracking",
      "default-revealed",
    );
    await game.settings.set("pf2e-bestiary-tracking", "default-revealed", {
      ...defaultRevealed,
      creature: {
        ...defaultRevealed.creature,
        nameInfo: false,
      },
    });

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (versionCompare(version, "1.1.22")) {
    version = "1.1.22";

    const customThemes = game.settings.get(
      "pf2e-bestiary-tracking",
      "custom-themes",
    );
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "custom-themes",
      Object.keys(customThemes).reduce((acc, key) => {
        const theme = customThemes[key];
        acc[key] = {
          ...theme,
          props: {
            ...theme.props,
            ["--pf2e-bestiary-tracking-application-image"]: theme.props[
              "--pf2e-bestiary-tracking-application-image"
            ]
              ? theme.props["--pf2e-bestiary-tracking-application-image"]
              : "ignore",
            ["--pf2e-bestiary-tracking-application-header-image"]:
              theme.props[
                "--pf2e-bestiary-tracking-application-header-image"
              ] ?? "ignore",
            ["--pf2e-bestiary-tracking-application-header"]:
              theme.props["--pf2e-bestiary-tracking-application-header"] ??
              "transparent",
            ["--pf2e-bestiary-tracking-application-header-image-size"]:
              theme.props[
                "--pf2e-bestiary-tracking-application-header-image-size"
              ] ?? "cover",
            ["--pf2e-bestiary-tracking-application-header-image-repeat"]:
              theme.props[
                "--pf2e-bestiary-tracking-application-header-image-repeat"
              ] ?? "round",
            ["--pf2e-bestiary-tracking-application-header-image-position"]:
              theme.props[
                "--pf2e-bestiary-tracking-application-header-image-position"
              ] ?? "top",
            ["--pf2e-bestiary-tracking-application-image-position"]:
              theme.props[
                "--pf2e-bestiary-tracking-application-image-position"
              ] ?? "top",
          },
        };
        return acc;
      }, {}),
    );

    await game.settings.set("pf2e-bestiary-tracking", "version", version);
  }

  if (versionCompare(version, "1.1.27")) {
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "detailed-information-toggles",
      {
        ...game.settings.get(
          "pf2e-bestiary-tracking",
          "detailed-information-toggles",
        ),
        iwr: true,
      },
    );
  }

  await handleBestiaryMigration(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );
};

const handleBestiaryMigration = async (bestiary, isSave) => {
  var bestiaryObject = null;
  try {
    bestiaryObject = JSON.parse(bestiary);
  } catch {}

  if (bestiaryObject) {
    let dataBestiary = bestiaryObject?.monster ? bestiaryObject : bestiary;

    const oldMonsterData =
      Object.keys(dataBestiary.monster).length > 0 &&
      Object.keys(dataBestiary.monster).some(
        (key) => !dataBestiary.monster[key].system,
      );
    dataBestiary.metadata.version = oldMonsterData
      ? "0.8.8.4"
      : !dataBestiary.metadata.version
        ? "0.8.8.4"
        : dataBestiary.metadata.version;

    if (dataBestiary.metadata.version === "0.8.8") {
      dataBestiary = await newMigrateBestiary(async (_, monster) => {
        const origin = await fromUuid(monster.uuid);
        if (!origin) return true;

        // Add Total Modifier to attacks.
        monster.attacks.values = Object.keys(monster.attacks.values).reduce(
          (acc, attackKey) => {
            const originAttack = origin.system.actions.find(
              (x) => x.weapon._id === attackKey,
            );
            const base = originAttack?.item;
            if (base) {
              const damageInstances = [];
              var damageLabel = "";
              for (var damageKey of Object.keys(base.system.damageRolls)) {
                const damage = base.system.damageRolls[damageKey];
                damageLabel = damageLabel.concat(
                  `${damageLabel ? " + " : ""}${damage.damage} ${damage.damageType}`,
                );
                const damageRollHelper = new Roll(damage.damage);

                damageInstances.push({
                  label: damage.damage,
                  average: getRollAverage(damageRollHelper.terms),
                  type: damage.damageType,
                  quality: damage.category,
                });
              }

              acc[base.id] = {
                ...monster.attacks.values[attackKey],
                range: base.isMelee ? "Melee" : "Ranged",
                value: base.system.bonus.value,
                damage: {
                  instances: damageInstances,
                  label: damageLabel,
                  average: damageInstances.reduce(
                    (acc, instance) => acc + instance.average,
                    0,
                  ),
                },
              };
            }

            return acc;
          },
          {},
        );
      }, dataBestiary);

      dataBestiary.metadata.version = "0.8.8.4";
    }

    if (dataBestiary.metadata.version === "0.8.8.4") {
      // Change to storing all of actor.toObject. Lots of improvement in data retention, shouldn't be too much data.
      const uuids = Object.values(dataBestiary.monster).reduce(
        (acc, monster) => {
          if (monster.uuid && !monster.system) acc.push(monster.uuid);

          return acc;
        },
        [],
      );
      const newBestiary = {
        monster: Object.keys(dataBestiary.monster).reduce((acc, key) => {
          if (Boolean(dataBestiary.monster[key].system)) {
            acc[key] = dataBestiary.monster[key];
          }

          return acc;
        }, {}),
        npc: {},
        metadata: {},
      };
      for (var uuid of uuids) {
        const orig = await fromUuid(uuid);
        const data = await getOldMonsterData(orig);
        const oldCreature = dataBestiary.monster[uuid];

        if (!data) {
          continue;
        }

        /* Big Migration Block Oh-hoy */
        data.name = {
          ...data.name,
          revealed: oldCreature.name.revealed,
          custom: oldCreature.name.custom,
        };
        data.system.details.level = {
          ...data.system.details.level,
          revealed: oldCreature.level.revealed,
          custom: oldCreature.level.custom,
        };
        data.system.attributes.ac = {
          ...data.system.attributes.ac,
          revealed: oldCreature.ac.revealed,
          custom: oldCreature.ac.custom,
        };
        data.system.attributes.hp = {
          ...data.system.attributes.hp,
          revealed: oldCreature.hp.revealed,
          custom: oldCreature.hp.custom,
        };

        Object.keys(data.system.attributes.immunities).forEach(
          (immunityKey) => {
            const oldImmunityKey = Object.keys(oldCreature.immunities).find(
              (x) => x === immunityKey,
            );
            if (oldImmunityKey)
              data.system.attributes.immunities[immunityKey].revealed =
                oldCreature.immunities[oldImmunityKey].revealed;
          },
        );

        Object.keys(data.system.attributes.weaknesses).forEach(
          (weaknessKey) => {
            const oldWeaknessKey = Object.keys(oldCreature.weaknesses).find(
              (x) => x === weaknessKey,
            );
            if (oldWeaknessKey)
              data.system.attributes.weaknesses[weaknessKey].revealed =
                oldCreature.weaknesses[oldWeaknessKey].revealed;
          },
        );

        Object.keys(data.system.attributes.resistances).forEach(
          (resistanceKey) => {
            const oldResistanceKey = Object.keys(oldCreature.resistances).find(
              (x) => x === resistanceKey,
            );
            if (oldResistanceKey)
              data.system.attributes.resistances[resistanceKey].revealed =
                oldCreature.resistances[oldResistanceKey].revealed;
          },
        );

        data.system.saves.fortitude = {
          ...data.system.saves.fortitude,
          revealed: oldCreature.saves.fortitude.revealed,
          custom: oldCreature.saves.fortitude.custom,
        };
        data.system.saves.reflex = {
          ...data.system.saves.reflex,
          revealed: oldCreature.saves.reflex.revealed,
          custom: oldCreature.saves.reflex.custom,
        };
        data.system.saves.will = {
          ...data.system.saves.will,
          revealed: oldCreature.saves.will.revealed,
          custom: oldCreature.saves.will.custom,
        };

        data.system.attributes.speed.revealed =
          oldCreature.speeds.values.land.revealed;
        data.system.attributes.speed.otherSpeeds.forEach((speed) => {
          const oldSpeedKey = Object.keys(oldCreature.speeds.values).find(
            (x) => speed.label === x,
          );
          speed.revealed = oldSpeedKey
            ? oldCreature.speeds.values[oldSpeedKey].revealed
            : false;
        });

        Object.keys(data.system.traits.value).forEach(
          (traitKey) =>
            (data.system.traits.value[traitKey].revealed =
              oldCreature.traits.values[traitKey]?.revealed),
        );
        Object.keys(data.system.abilities).forEach((abilityKey) => {
          const oldAbility = Object.values(oldCreature.abilities.values).find(
            (x) => x.label.toLowerCase() === abilityKey,
          );
          data.system.abilities[abilityKey] = {
            ...data.system.abilities[abilityKey],
            revealed: oldAbility.revealed,
            custom: oldAbility.custom,
          };
        });

        data.system.perception = {
          ...data.system.perception,
          revealed: oldCreature.senses.values.perception.revealed,
          custom: oldCreature.senses.values.perception.custom,
        };
        data.system.perception.senses.forEach((sense) => {
          const oldKey = Object.keys(oldCreature.senses.values).find(
            (x) => x === sense.type,
          );
          const oldSense = oldKey ? oldCreature.senses.values[oldKey] : null;
          if (oldSense) {
            sense.revealed = oldSense.revealed;
          }
        });
        data.system.perception.details = {
          ...data.system.perception.details,
          revealed: oldCreature.senses.values.other?.revealed ?? false,
          custom: oldCreature.senses.values.other?.custom ?? null,
        };

        Object.keys(data.system.actions).forEach((actionKey) => {
          const creatureKey = Object.keys(oldCreature.attacks.values).find(
            (key) => key === actionKey,
          );
          const creatureAction = creatureKey
            ? oldCreature.attacks.values[creatureKey]
            : null;
          if (creatureAction) {
            const action = data.system.actions[actionKey];
            action.revealed = creatureAction.revealed;
            action.damageStatsRevealed = creatureAction.damageStatsRevealed;
          }
        });

        Object.keys(data.items).forEach((itemKey) => {
          const item = data.items[itemKey];
          if (item.type === "action") {
            if (["action", "reaction"].includes(item.system.actionType.value)) {
              const oldKey = Object.keys(oldCreature.actions.values).find(
                (key) => key === item._id,
              );
              item.revealed = oldKey
                ? oldCreature.actions.values[oldKey].revealed
                : false;
            } else {
              const oldKey = Object.keys(oldCreature.passives.values).find(
                (key) => key === item._id,
              );
              item.revealed = oldKey
                ? oldCreature.passives.values[oldKey].revealed
                : false;
            }
          }

          if (item.type === "spell") {
            const entry =
              oldCreature.spells.entries[item.system.location.value];
            if (entry) {
              const levels =
                oldCreature.spells.entries[item.system.location.value].levels;
              const levelKeys = Object.keys(levels);
              const level = item.system.traits.value.includes("cantrip")
                ? "Cantrips"
                : (item.system.location.heightenedLevel ??
                  (levelKeys.length === 1
                    ? levelKeys[0]
                    : item.system.level.value));
              if (oldCreature.spells.entries[item.system.location.value]) {
                const oldSpell = levels[level][item._id];

                item.revealed = oldSpell.revealed;
              }
            }
          } else if (item.type === "spellcastingEntry") {
            const oldEntryKey = Object.keys(oldCreature.spells.entries).find(
              (key) => key === item._id,
            );
            const entry = oldEntryKey
              ? oldCreature.spells.entries[oldEntryKey]
              : null;
            if (entry) {
              item.revealed = entry.revealed;
              item.system.spelldc.dc.revealed = entry.dc.revealed;
              item.system.spelldc.value.revealed = entry.attack.revealed;
            }
          }
        });

        data.system.details.publicNotes.revealed =
          oldCreature.notes.public.revealed;
        data.system.details.privateNotes.revealed =
          oldCreature.notes.private.revealed;
        /* Big Migration Block Oh-hoy */

        newBestiary.monster[uuid] = data;
      }

      dataBestiary = newBestiary;
      dataBestiary.metadata.version = "0.8.9";
    }

    if (dataBestiary.metadata.version === "0.8.9") {
      // Some creatures are missing None options for IWR and Actions/Passives/Attacks/Spells
      dataBestiary = await newMigrateBestiary((_, monster) => {
        const immunitiesKeys = Object.keys(
          monster.system.attributes.immunities,
        );
        const weaknessesKeys = Object.keys(
          monster.system.attributes.weaknesses,
        );
        const resistancesKeys = Object.keys(
          monster.system.attributes.resistances,
        );

        if (immunitiesKeys.length === 0) {
          monster.system.attributes.immunities["none"] = {
            revealed: false,
            empty: true,
            type: game.i18n.localize("PF2EBestiary.Miscellaneous.None"),
          };
        }
        if (weaknessesKeys.length === 0) {
          monster.system.attributes.weaknesses["none"] = {
            revealed: false,
            empty: true,
            type: game.i18n.localize("PF2EBestiary.Miscellaneous.None"),
          };
        }
        if (resistancesKeys.length === 0) {
          monster.system.attributes.resistances["none"] = {
            revealed: false,
            empty: true,
            type: game.i18n.localize("PF2EBestiary.Miscellaneous.None"),
          };
        }

        if (Object.keys(monster.system.actions).length === 0) {
          monster.system.actions["Attack-None"] = {
            revealed: false,
            label: "None",
            empty: true,
            item: {
              system: {
                damageRolls: {},
              },
              _id: "Attack-None",
            },
            weapon: {
              system: {
                traits: {
                  value: [],
                },
              },
            },
            variants: [],
            traits: [],
            totalModifier: 0,
          };
        }

        var hasActions = false;
        var hasPassives = false;
        for (var item of Object.values(monster.items)) {
          if (item.type === "action") {
            if (
              item.system.actionType.value === "action" ||
              item.system.actionType.value === "reaction"
            )
              hasActions = true;
            if (item.system.actionType.value === "passive") hasPassives = true;
          }
        }

        if (!hasActions) {
          monster.items["Action-None"] = {
            _id: "Action-None",
            empty: true,
            type: "action",
            name: "None",
            value: "PF2E.Miscellaneous.None",
            system: {
              actionType: { value: "action" },
              description: {
                value: null,
              },
            },
          };
        }
        if (!hasPassives) {
          monster.items["Passive-None"] = {
            _id: "Passive-None",
            empty: true,
            type: "action",
            name: "None",
            value: "PF2E.Miscellaneous.None",
            system: {
              actionType: { value: "passive" },
              description: {
                value: null,
              },
            },
          };
        }

        const noSpells = !Object.keys(monster.items).find((x) => {
          const item = monster.items[x];
          return item.type === "spellcastingEntry";
        });
        if (noSpells) {
          monster.items["Spells-None"] = {
            type: "spellcastingEntry",
            _id: "Spell-None",
            revealed: false,
            system: {
              spelldc: {
                dc: { value: 0 },
                value: { value: 0 },
              },
            },
          };
        }
      }, dataBestiary);

      dataBestiary.metadata.version = "0.8.9.2";
    }

    if (dataBestiary.metadata.version === "0.8.9.2") {
      //Insert reveal properties on ability traits, and attack damage types
      dataBestiary = await newMigrateBestiary((_, monster) => {
        for (var actionKey of Object.keys(monster.items)) {
          const action = monster.items[actionKey];
          if (action.type === "action") {
            // None-Actions
            if (!action.system.traits) {
              action.system.traits = { value: [] };
            } else if (
              action.system.traits.value.length > 0 &&
              !action.system.traits.value[0].value
            ) {
              action.system.traits.value = action.system.traits.value.map(
                (trait) => ({ revealed: false, value: trait }),
              );
            }
          }
        }

        Object.keys(monster.system.actions).forEach((attackKey) => {
          // Missing Attack-None item
          if (attackKey === "Attack-None") {
            monster.items["Attack-None"] = {
              _id: "Attack-None",
              empty: true,
              type: "melee",
              Name: "None",
              value: "PF2E.Miscellaneous.None",
              system: {
                damageRolls: [],
                traits: {
                  value: [],
                },
              },
            };
          } else if (monster.items[attackKey].system.damageRolls) {
            Object.values(monster.items[attackKey].system.damageRolls).forEach(
              (damageRoll) => {
                if (!damageRoll.damageType.value) {
                  damageRoll.damageType = {
                    revealed: false,
                    value: damageRoll.damageType,
                  };
                }
              },
            );
          }

          monster.items[attackKey].system.traits.value = Object.keys(
            monster.items[attackKey].system.traits.value,
          ).map((traitKey) => {
            if (!monster.items[attackKey].system.traits.value[traitKey].value) {
              const traitsWithoutAttack = Object.keys(
                monster.system.actions[attackKey].traits,
              ).reduce((acc, traitKey) => {
                if (
                  monster.system.actions[attackKey].traits[traitKey].name !==
                  "attack"
                ) {
                  acc.push(monster.system.actions[attackKey].traits[traitKey]);
                }

                return acc;
              }, []);
              return {
                revealed: traitsWithoutAttack[traitKey].revealed,
                value: monster.items[attackKey].system.traits.value[traitKey],
              };
            } else {
              return {
                ...monster.items[attackKey].system.traits.value[traitKey],
              };
            }
          });
        });
      }, dataBestiary);

      dataBestiary.metadata.version = "0.8.9.7";
    }

    if (dataBestiary.metadata.version === "0.8.9.7") {
      dataBestiary = await newMigrateBestiary((_, monster) => {
        const infiniteGrabber = (object, property) => {
          if (object[property]) {
            if (object[property][property]) {
              return infiniteGrabber(object[property], property);
            }

            return object;
          }
        };

        Object.values(monster.items).forEach((item) => {
          if (item.type === "melee" || item.type === "action") {
            Object.keys(item.system.traits.value).forEach((traitKey) => {
              item.system.traits.value[traitKey] = infiniteGrabber(
                item.system.traits.value[traitKey],
                "value",
              );
            });
          }

          if (item.type === "melee") {
            Object.values(item.system.damageRolls).forEach((damage) => {
              damage.damageType = infiniteGrabber(damage.damageType, "value");
            });
          }
        });
      }, dataBestiary);

      dataBestiary.metadata.version = "0.8.9.8.1";
    }

    if (dataBestiary.metadata.version === "0.8.9.8.1") {
      dataBestiary = await newMigrateBestiary(async (_, monster) => {
        Object.keys(monster.system.actions).forEach((actionKey) => {
          const item = monster.items[actionKey];
          if (item.type === "equipment") {
            item.system.damageRolls = Object.keys(
              monster.system.actions[actionKey].weapon.system.damageRolls,
            ).reduce((acc, damageKey) => {
              const damage =
                monster.system.actions[actionKey].weapon.system.damageRolls[
                  damageKey
                ];
              acc[damageKey] = {
                ...damage,
                damageType: { revealed: false, value: damage.damageType },
              };

              return acc;
            }, {});

            // If this crops up more, make a general helper method to extract all types of rules.
            item.system.rules.forEach((rule) => {
              if (rule.key === "FlatModifier") {
                item.system.damageRolls[
                  `${rule.damageType}-${foundry.utils.randomID()}`
                ] = {
                  damageType: { revealed: false, value: rule.damageType },
                  damage: rule.value.toString(),
                  isFromRule: true,
                };
              }
            });
          }
        });
      }, dataBestiary);

      dataBestiary.metadata.version = "0.8.9.8.2";
    }

    if (dataBestiary.metadata.version === "0.8.9.8.2") {
      const journalEntry = game.journal.getName(
        "pf2e-bestiary-tracking-journal-entry",
      );
      if (journalEntry) {
        dataBestiary = await newMigrateBestiary(async (_, monster) => {
          if (!monster.system.details.playerNotes?.document) {
            const existingPage = journalEntry.pages.find(
              (x) => x.name === monster.name.value,
            );
            if (existingPage) {
              await existingPage.delete();
            }

            const page = await journalEntry.createEmbeddedDocuments(
              "JournalEntryPage",
              [
                {
                  name: monster.name.value,
                  text: {
                    content: "",
                  },
                },
              ],
            );

            monster.system.details.playerNotes = { document: page[0].id };
          }
        }, dataBestiary);
      }

      dataBestiary.metadata.version = "0.8.9.9";
    }

    if (dataBestiary.metadata.version === "0.8.9.9") {
      dataBestiary = await newMigrateBestiary(async (_, monster) => {
        const itemKeys = Object.keys(monster.items);
        const actionKeys = itemKeys.filter(
          (key) =>
            monster.items[key].type === "action" &&
            monster.items[key].system.actionType.value !== "passive",
        );
        if (
          actionKeys.length > 1 &&
          actionKeys.find((key) => monster.items[key]._id === "Action-None")
        ) {
          monster.items = itemKeys.reduce((acc, key) => {
            if (monster.items[key]._id !== "Action-None") {
              acc[key] = monster.items[key];
            }

            return acc;
          }, {});
        }
      }, dataBestiary);

      dataBestiary.metadata.version = "0.8.9.9.6";
    }

    if (dataBestiary.metadata.version === "0.8.9.9.6") {
      const journalEntry = game.journal.getName(
        "pf2e-bestiary-tracking-journal-entry",
      );
      if (journalEntry) {
        dataBestiary = await newMigrateBestiary(async (_, monster) => {
          if (!monster.system.details.playerNotes?.document) {
            const existingPage = journalEntry.pages.find(
              (x) => x.name === monster.name.value,
            );
            if (existingPage) {
              await existingPage.delete();
            }

            const page = await journalEntry.createEmbeddedDocuments(
              "JournalEntryPage",
              [
                {
                  name: monster.name.value,
                  text: {
                    content: "",
                  },
                },
              ],
            );

            monster.system.details.playerNotes = { document: page[0].id };
          }
        }, dataBestiary);
      }

      dataBestiary.metadata.version = "0.8.11";
    }

    if (dataBestiary.metadata.version === "0.8.11") {
      const journalEntry = game.journal.getName(
        "pf2e-bestiary-tracking-journal-entry",
      );
      if (journalEntry) {
        dataBestiary = await newMigrateBestiary(async (_, monster) => {
          if (!monster.system.details.playerNotes?.document) {
            const page = journalEntry.pages.find(
              (x) => x.name === monster.name.value,
            );
            if (page) {
              monster.system.details.playerNotes = { document: page.id };
            }
          }
        }, dataBestiary);
      }

      dataBestiary.metadata.version = "0.8.12";
    }

    if (dataBestiary.metadata.version < "0.9.0") {
      dataBestiary.npcCategories = {};

      dataBestiary.metadata.version = "0.9.0";
    }

    if (dataBestiary.metadata.version === "0.9.0") {
      if (!dataBestiary.npcCategories) {
        dataBestiary.npcCategories = {};
      }

      dataBestiary.metadata.version = "0.9.1";
    }

    if (dataBestiary.metadata.version === "0.9.1") {
      for (var npcKey in dataBestiary.npc) {
        var npc = dataBestiary.npc[npcKey];

        for (var category of npc.npcData.categories) {
          if (!dataBestiary.npcCategories[category.key]) {
            dataBestiary.npcCategories[category.key] = category.name;
          }
        }
      }

      dataBestiary.metadata.version = "0.9.2";
    }

    if (
      dataBestiary.metadata.version === "0.9.2" ||
      dataBestiary.metadata.version === "0.9.3"
    ) {
      var folderId = game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-tracking-folder",
      );
      var journal = isSave
        ? null
        : game.journal.getName(game.i18n.localize("PF2EBestiary.BestiaryName"));
      if (!journal) {
        journal = await JournalEntry.create({
          name:
            dataBestiary.metadata?.save?.name ??
            game.i18n.localize("PF2EBestiary.BestiaryName"),
          folder: folderId,
        });
        await journal.setFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
          !bestiary
            ? []
            : Object.keys(bestiaryObject.npcCategories).reduce((acc, key) => {
                acc.push({
                  name: bestiaryObject.npcCategories[key],
                  value: key,
                });

                return acc;
              }, []),
        );
        await journal.setFlag(
          "pf2e-bestiary-tracking",
          "image",
          "systems/pf2e/assets/compendium-banner/green.webp",
        );
      }

      for (var monsterKey of Object.keys(bestiaryObject.monster)) {
        const monster = bestiaryObject.monster[monsterKey];
        const data =
          monster.system.traits.rarity === "unique" ||
          Boolean(monster.system.traits.value["npc"])
            ? getNPCDataFromOld(monster, true)
            : getCreatureDataFromOld(monster);
        await journal.createEmbeddedDocuments("JournalEntryPage", [data]);
      }

      for (var npcKey of Object.keys(bestiaryObject.npc)) {
        const npc = bestiaryObject.npc[npcKey];
        await journal.createEmbeddedDocuments("JournalEntryPage", [
          getNPCDataFromOld(npc),
        ]);
      }

      const oldJournalEntry = game.journal.getName(
        "pf2e-bestiary-tracking-journal-entry",
      );
      await oldJournalEntry?.delete();
      await game.folders.getName("pf2e-bestiary-tracking-folder")?.delete();

      if (!isSave) {
        await game.settings.set(
          "pf2e-bestiary-tracking",
          "bestiary-tracking",
          journal.id,
        );
      }

      await journal.setFlag("pf2e-bestiary-tracking", "version", "0.9.4");
    }
  }

  const bestiaryJournal = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );
  if (!bestiaryJournal) return bestiary;

  if (
    versionCompare(
      bestiaryJournal.getFlag("pf2e-bestiary-tracking", "version"),
      "0.9.5",
    )
  ) {
    await bestiaryJournal.setFlag("pf2e-bestiary-tracking", "version", "0.9.5");
  }
  if (
    versionCompare(
      bestiaryJournal.getFlag("pf2e-bestiary-tracking", "version"),
      "0.9.6",
    )
  ) {
    await bestiaryJournal.setFlag("pf2e-bestiary-tracking", "version", "0.9.6");
  }
  if (
    versionCompare(
      bestiaryJournal.getFlag("pf2e-bestiary-tracking", "version"),
      "0.9.9",
    )
  ) {
    const newCategories = bestiaryJournal.getFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
    );
    await bestiaryJournal.setFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
      newCategories
        ? newCategories
            .sort((a, b) => alphaSort(a, b, "name"))
            .map((x, index) => ({ ...x, position: index }))
        : [],
    );

    await bestiaryJournal.setFlag("pf2e-bestiary-tracking", "version", "0.9.9");
  }
  if (
    versionCompare(
      bestiaryJournal.getFlag("pf2e-bestiary-tracking", "version"),
      "1.1.28",
    )
  ) {
    const newCategories = bestiaryJournal.getFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
    );
    await bestiaryJournal.setFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
      newCategories
        ? newCategories.map((x, index) => ({ ...x, description: null }))
        : [],
    );

    await bestiaryJournal.setFlag(
      "pf2e-bestiary-tracking",
      "version",
      "1.1.29",
    );
  }

  await migrateBestiaryPages(bestiaryJournal);
};

const migrateBestiaryPages = async (bestiary) => {
  for (var page of Array.from(bestiary.pages)) {
    if (versionCompare(page.system.version, "0.9.5")) {
      await page.update({ "system.version": "0.9.5" });
    }

    if (versionCompare(page.system.version, "0.9.6")) {
      if (page.type === "pf2e-bestiary-tracking.npc") {
        const availableCategories = await bestiary.getFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
        );
        await page.update({
          system: {
            version: "0.9.6",
            "npcData.categories": page.system.npcData.categories.filter((x) =>
              availableCategories.find(
                (category) => category.value === x.value,
              ),
            ),
          },
        });
      } else {
        await page.update({ "system.version": "0.9.6" });
      }
    }
    if (versionCompare(page.system.version, "0.9.13")) {
      if (page.type === "pf2e-bestiary-tracking.npc") {
        const availableCategories = await bestiary.getFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
        );
        await page.update({
          system: {
            version: "0.9.13",
            "npcData.categories": page.system.npcData.categories.filter((x) =>
              availableCategories.find(
                (category) => category.value === x.value,
              ),
            ),
          },
        });
      } else {
        await page.update({ "system.version": "0.9.13" });
      }
    }
    if (versionCompare(page.system.version, "1.0.1")) {
      if (page.type === "pf2e-bestiary-tracking.npc") {
        await page.update({
          "system.version": "1.0.1",
          "system.npcData.influence.influence": Object.keys(
            page.system.npcData.influence.influence,
          ).reduce((acc, key) => {
            acc[key] = {
              revealed:
                page.system.npcData.influence.influencePoints >=
                page.system.npcData.influence.influence[key].points,
            };
            return acc;
          }, {}),
        });
      } else {
        await page.update({ "system.version": "1.0.1" });
      }
    }
    if (versionCompare(page.system.version, "1.1.14")) {
      await page.update({
        system: {
          version: "1.1.14",
          isFromPC: Boolean(page.system.pcData),
        },
      });
    }
  }
};

const migrateBestiary = async (update) => {
  const bestiary = await game.settings.get(
    "pf2e-bestiary-tracking",
    "bestiary-tracking",
  );

  var toRemove = [];
  for (var typeKey in bestiary.monster) {
    for (var monsterKey in bestiary.monster[typeKey]) {
      const monster = bestiary.monster[typeKey][monsterKey];

      const result = await update(bestiary, monster, typeKey, monsterKey);
      if (result) {
        toRemove.push(result);
      } else {
        for (var inType of monster.inTypes) {
          if (typeKey !== inType) {
            bestiary.monster[inType][monsterKey] = foundry.utils.deepClone(
              bestiary.monster[typeKey][monsterKey],
            );
          }
        }
      }
    }
  }

  for (var remove of toRemove) {
    delete bestiary.monster[remove.type][remove.monsterKey];
  }

  await game.settings.set(
    "pf2e-bestiary-tracking",
    "bestiary-tracking",
    bestiary,
  );
};

const newMigrateBestiary = async (update, bestiary) => {
  const toRemoveSadly = [];
  for (var npcKey in bestiary.monster) {
    const monster = bestiary.monster[npcKey];

    const failure = await update(bestiary, monster, npcKey, "monster");

    // Only send back a value from update when it's a critical update. Otherwise allow unlinked actors to stay.
    if (failure) {
      toRemoveSadly.push(npcKey);
    }

    bestiary.monster[npcKey] = foundry.utils.deepClone(
      bestiary.monster[npcKey],
    );
  }

  for (var toRemove of toRemoveSadly) {
    delete bestiary.monster[toRemove];
  }

  const toRemoveNPC = [];
  for (var npcKey in bestiary.npc) {
    const monster = bestiary.npc[npcKey];

    const failure = await update(bestiary, monster, npcKey, "npc");

    // Only send back a value from update when it's a critical update. Otherwise allow unlinked actors to stay.
    if (failure) {
      toRemoveNPC.push(npcKey);
    }

    bestiary.npc[npcKey] = foundry.utils.deepClone(bestiary.monster[npcKey]);
  }

  for (var toRemove of toRemoveNPC) {
    delete bestiary.npc[toRemove];
  }

  return bestiary;
};

const handleDeactivatedPages = async () => {
  var folder = game.folders.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking-folder"),
  );
  if (!folder) {
    folder = await Folder.create({
      name: bestiaryFolder,
      type: "JournalEntry",
    });
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-tracking-folder",
      folder.id,
    );
  }

  const bestiary = game.settings.get(
    "pf2e-bestiary-tracking",
    "bestiary-tracking",
  );
  var bestiaryId = null;
  try {
    bestiaryId = JSON.parse(bestiary);
  } catch {
    bestiaryId = bestiary;
  }

  if (typeof bestiaryId === "object") return;

  var journal = game.journal.get(bestiaryId);
  if (!journal) {
    journal = await JournalEntry.create({
      name: game.i18n.localize("PF2EBestiary.BestiaryName"),
      folder: folder.id,
    });
    await journal.setFlag("pf2e-bestiary-tracking", "npcCategories", []);
    await journal.setFlag("pf2e-bestiary-tracking", "version", "0.9.5");
    await journal.setFlag(
      "pf2e-bestiary-tracking",
      "image",
      "systems/pf2e/assets/compendium-banner/green.webp",
    );

    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-tracking",
      journal.id,
    );
  }

  const deactivatedArray = Array.from(game.journal).reduce((acc, journal) => {
    journal.pages.forEach((page) => {
      const deactivatedData = page.getFlag(
        "pf2e-bestiary-tracking",
        "deactivated-data",
      );
      if (deactivatedData) {
        acc.push({ page: page, data: JSON.parse(deactivatedData) });
      }
    });

    return acc;
  }, []);

  for (var deactivated of deactivatedArray) {
    await deactivated.page.update(deactivated.data);
    await deactivated.page.unsetFlag(
      "pf2e-bestiary-tracking",
      "deactivated-data",
    );
  }
};

const handleJournalPermissions = () => {
  game.journal
    .filter((x) =>
      x.pages.some((x) =>
        [
          "pf2e-bestiary-tracking.creature",
          "pf2e-bestiary-tracking.npc",
          "pf2e-bestiary-tracking.hazard",
        ].includes(x.type),
      ),
    )
    .forEach((journal) => journal.update({ ownership: { default: 3 } }));
};

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$4, ApplicationV2: ApplicationV2$4 } = foundry.applications.api;

class BestiarySelection extends HandlebarsApplicationMixin$4(
  ApplicationV2$4,
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
      exportBestiary: this.exportBestiary,
      importBestiary: this.importBestiary,
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

  static async exportBestiary(event, button) {
    event.stopPropagation();

    const bestiary = game.journal.get(button.dataset.bestiary);
    if (!bestiary) return;

    saveDataToFile(
      JSON.stringify(bestiary.toObject(), null, 2),
      "text/json",
      `${slugify(bestiary.name)}.json`,
    );
  }

  static async importBestiary() {
    new Promise((resolve, reject) => {
      new ImportDialog(
        "PF2EBestiary.ImportDialog.JournalTitle",
        (jsonObject) => {
          if (!jsonObject) {
            return game.i18n.localize("PF2EBestiary.ImportDialog.FaultyImport");
          }

          return null;
        },
        resolve,
        reject,
      ).render(true);
    }).then(async (data) => {
      var folder = game.folders.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking-folder"),
      );
      if (!folder) {
        folder = await Folder.create({
          name: bestiaryFolder,
          type: "JournalEntry",
        });
        await game.settings.set(
          "pf2e-bestiary-tracking",
          "bestiary-tracking-folder",
          folder.id,
        );
      }

      await JournalEntry.create({
        ...data,
        folder: folder.id,
      });
      this.render();
    });
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

const openBestiary = async () => {
  new PF2EBestiary().render(true);
};

const swapBestiary = async () => {
  new BestiarySelection().render(true);
};

const openBestiaryCombat = async () => {
  if (!game.combat) {
    ui.notifications.info(
      game.i18n.localize(
        "PF2EBestiary.Macros.OpenBestiaryCombat.NoActiveCombat",
      ),
    );
    return;
  }

  new PF2EBestiary(null, {
    category: "pf2e-bestiary-tracking.creature",
    type: "combat",
  }).render(true);
};

const showMonster = () => {
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
    !isValidEntityType(selectedMonster.actor.type) ||
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

  if (!page || (page.system.hidden && !game.user.isGM)) {
    ui.notifications.info(
      game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"),
    );
    return;
  }

  new PF2EBestiary(page).render(true);
};

const addMonster = async () => {
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
    !isValidEntityType(selectedMonster.actor.type) ||
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

const resetBestiary = async () => {
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

  var folder = game.folders.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking-folder"),
  );
  if (!folder) {
    folder = await Folder.create({
      name: bestiaryFolder,
      type: "JournalEntry",
    });
    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-tracking-folder",
      folder.id,
    );
  }

  const bestiaryTracking = game.settings.get(
    "pf2e-bestiary-tracking",
    "bestiary-tracking",
  );
  var bestiaryObject = null;
  try {
    bestiaryObject = JSON.parse(bestiaryTracking);
  } catch {}

  const existingJournal =
    !bestiaryObject && Boolean(game.journal.get(bestiaryTracking));
  if (bestiaryObject || !existingJournal) {
    const journal = await JournalEntry.create({
      name: game.i18n.localize("PF2EBestiary.BestiaryName"),
      folder: folder.id,
    });
    await journal.setFlag("pf2e-bestiary-tracking", "npcCategories", []);
    await journal.setFlag("pf2e-bestiary-tracking", "version", currentVersion);
    await journal.setFlag(
      "pf2e-bestiary-tracking",
      "image",
      "systems/pf2e/assets/compendium-banner/green.webp",
    );

    await game.settings.set(
      "pf2e-bestiary-tracking",
      "bestiary-tracking",
      journal.id,
    );
  } else {
    const journal = game.journal.get(bestiaryTracking);
    for (var page of Array.from(journal.pages)) {
      await page.delete();
    }

    await journal.setFlag("pf2e-bestiary-tracking", "npcCategories", []);
  }

  await game.socket.emit(`module.pf2e-bestiary-tracking`, {
    action: socketEvent.UpdateBestiary,
    data: {},
  });
  Hooks.callAll(socketEvent.UpdateBestiary, {});

  return true;
};

const deactivateModule = async () => {
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

var macros = /*#__PURE__*/Object.freeze({
  __proto__: null,
  addMonster: addMonster,
  deactivateModule: deactivateModule,
  openBestiary: openBestiary,
  openBestiaryCombat: openBestiaryCombat,
  resetBestiary: resetBestiary,
  showMonster: showMonster,
  swapBestiary: swapBestiary
});

class ExpandedDragDrop extends DragDrop {
  bind(html) {
    // Identify and activate draggable targets
    if (this.can("dragstart", this.dragSelector)) {
      const draggables = html.querySelectorAll(this.dragSelector);
      for (let el of draggables) {
        el.setAttribute("draggable", true);
        el.ondragstart = this._handleDragStart.bind(this);
      }
    }

    // Identify and activate drop targets
    if (this.can("drop", this.dropSelector)) {
      const droppables =
        !this.dropSelector || html.matches(this.dropSelector)
          ? [html]
          : html.querySelectorAll(this.dropSelector);
      for (let el of droppables) {
        el.ondragover = this._handleDragOver.bind(this);
        el.ondragleave = this._handleDragLeave.bind(this);
        el.ondrop = this._handleDrop.bind(this);
      }
    }
    return this;
  }

  _handleDragLeave(event) {
    event.preventDefault();
    this.callback(event, "dragleave");
    return false;
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$3, ApplicationV2: ApplicationV2$3 } = foundry.applications.api;

class AvatarMenu extends HandlebarsApplicationMixin$3(
  ApplicationV2$3,
) {
  constructor(entity, resolve, reject) {
    super({});

    this.resolve = resolve;
    this.reject = reject;
    this.update = {
      system: {
        imageState: {
          hideState: entity.system.imageState.hideState,
          hideImage: entity.system.imageState.hideImage,
        },
      },
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Bestiary.AvatarMenu.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-avatar-menu",
    classes: ["avatar-menu"],
    position: { width: 400, height: "auto" },
    actions: {
      filePicker: this.filePicker,
      clearHideImage: this.clearHideImage,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-avatar-menu",
      template: "modules/pf2e-bestiary-tracking/templates/avatarMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.update = this.update;
    context.hideStates = imageHideStates;

    return context;
  }

  static async updateData(event, element, formData) {
    const updateData = foundry.utils.expandObject(formData.object);
    this.update = {
      ...updateData,
      system: {
        ...updateData.system,
        imageState: {
          ...updateData.system.imageState,
          hideImage: this.update.system.imageState.hideImage,
        },
      },
    };
    this.render();
  }

  static async filePicker(_, button) {
    new FilePicker({
      type: "image",
      title: "Image Select",
      callback: async (path) => {
        foundry.utils.setProperty(this.update, button.dataset.path, path);
        this.render();
      },
    }).render(true);
  }

  static clearHideImage() {
    this.update.system.imageState.hideImage = null;
    this.render();
  }

  close(options) {
    this.reject();
    super.close(options);
  }

  static async save() {
    this.resolve(this.update);
    this.close({});
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$2, ApplicationV2: ApplicationV2$2 } = foundry.applications.api;

class ActorLinkSettingsMenu extends HandlebarsApplicationMixin$2(
  ApplicationV2$2,
) {
  constructor(resolve, reject) {
    super({});

    this.resolve = resolve;
    this.reject = reject;

    this.settings = {
      general: true,
      influence: true,
      notes: true,
      gm: true,
    };
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.ActorLinkSettingsMenu.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-actor-link-settings-menu",
    classes: ["actor-link-settings-menu"],
    position: { width: 400, height: "auto" },
    actions: {
      toggleSettings: this.toggleSettings,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
  };

  static PARTS = {
    application: {
      id: "bestiary-actor-link-settings-menu",
      template:
        "modules/pf2e-bestiary-tracking/templates/actorLinkSettingsMenu.hbs",
    },
  };

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.settings = this.settings;

    return context;
  }

  static async updateData(event, element, formData) {
    const updateData = foundry.utils.expandObject(formData.object);
    this.settings = updateData.settings;

    this.render();
  }

  close(options) {
    this.reject();
    super.close(options);
  }

  static toggleSettings() {
    const allToggled = Object.values(this.settings).every((x) => x);
    this.settings = Object.keys(this.settings).reduce((acc, key) => {
      acc[key] = !allToggled;
      return acc;
    }, {});

    this.render();
  }

  static async save() {
    this.resolve(this.settings);
    this.close({});
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$1, ApplicationV2: ApplicationV2$1 } = foundry.applications.api;

class AvatarLinkMenu extends HandlebarsApplicationMixin$1(
  ApplicationV2$1,
) {
  constructor(entity, resolve, reject) {
    super({});

    this.resolve = resolve;
    this.reject = reject;

    this.entityType = getEntityType(entity);

    const useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );

    const baseActorExists = Boolean(
      game.actors.find((x) => x.uuid === entity.system.uuid),
    );
    this.actorLinks = entity.system.actorState.actorLinks
      .reduce(
        (acc, link) => {
          const page = entity.parent.pages.get(link);
          if (page) {
            const actorExists = Boolean(
              game.actors.find((x) => x.uuid === page.system.uuid),
            );
            const image = useTokenArt ? page.system.texture : page.system.img;
            acc.push({
              page: page.id,
              actor: page.system.uuid,
              img: image,
              name: page.system.name.value,
              level: page.system.level.value,
              unlinked: !actorExists,
            });
          }

          return acc;
        },
        [
          {
            page: entity.id,
            actor: entity.system.uuid,
            img: useTokenArt ? entity.system.texture : entity.system.img,
            name: entity.system.name.value,
            level: entity.system.level.value,
            current: true,
            active: entity.system.active,
            unlinked: !baseActorExists,
          },
        ],
      )
      .sort((a, b) => {
        if (a.level === b.level) {
          if (a.name < b.name) return -1;
          else if (a.name > b.name) return 1;
          else return 0;
        }

        return a.level - b.level;
      });

    this.duplicates = entity.system.actorState.actorDuplicates.reduce(
      (acc, duplicate) => {
        const actor = game.actors.find((x) => x.uuid === duplicate);
        if (actor) {
          acc.set(actor.uuid, {
            name: actor.name,
            folderPath: this.getFolderPath(actor.folder),
          });
        }

        return acc;
      },
      new Map(),
    );

    this.duplicateListOpen = false;
    this._dragDrop = this._createDragDropHandlers();
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.LinkMenu.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-link-menu",
    classes: ["bestiary-link-menu"],
    position: { width: 400, height: "auto" },
    actions: {
      importDuplicates: this.importDuplicates,
      toggleDuplicateList: this.toggleDuplicateList,
      removeDuplicate: this.removeDuplicate,
      selectActorLink: this.selectActorLink,
      removeActorLink: this.removeActorLink,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
    dragDrop: [
      { dragSelector: null, dropSelector: ".duplicate-section" },
      { dragSelector: null, dropSelector: ".actor-link-container.new" },
      { dragSelector: null, dropSelector: ".actor-link-container.unlinked" },
    ],
  };

  static PARTS = {
    application: {
      id: "bestiary-link-menu",
      template: "modules/pf2e-bestiary-tracking/templates/linkMenu.hbs",
    },
  };

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    this._dragDrop.forEach((d) => d.bind(htmlElement));
  }

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.actorLinks = this.actorLinks.filter((x) => !x.removed);
    context.duplicates = Object.fromEntries(this.duplicates);
    context.actors = game.actors.filter(
      (x) => !this.actorLinks.every((link) => link.uuid !== x.actor),
    );
    context.duplicateListOpen = this.duplicateListOpen;

    return context;
  }

  getFolderPath(folder) {
    if (!folder) return "";
    if (folder.folder)
      return `${folder.name}/${this.getFolderPath(folder.folder)}`;

    return folder.name;
  }

  static async updateData(event, element, formData) {
    foundry.utils.expandObject(formData.object);

    this.render();
  }

  static importDuplicates() {
    const current = this.actorLinks.find((x) => x.active);
    const potentialDuplicates = game.actors.filter(
      (x) => x.name === current.name && x.uuid !== current.actor,
    );
    ui.notifications.info(
      game.i18n.format(
        "PF2EBestiary.LinkMenu.Notifications.DuplicatesImported",
        { nr: potentialDuplicates.length },
      ),
    );
    for (var duplicate of potentialDuplicates) {
      this.duplicates.set(duplicate.uuid, {
        name: duplicate.name,
        folderPath: this.getFolderPath(duplicate.folder),
      });
    }

    this.render();
  }

  static toggleDuplicateList(_, button) {
    this.duplicateListOpen = !this.duplicateListOpen;
    $(button).toggleClass("fa-chevron-down");
    $(button).toggleClass("fa-chevron-up");
    $(this.element).find(".duplicate-list").toggleClass("expanded");
  }

  static removeDuplicate(_, button) {
    this.duplicates.delete(button.dataset.duplicate);
    this.render();
  }

  static selectActorLink(_, button) {
    this.actorLinks = this.actorLinks.map((x) => ({
      ...x,
      active:
        x.page === button.dataset.page || x.actor === button.dataset.actor,
    }));
    this.render();
  }

  static removeActorLink(_, button) {
    const link = this.actorLinks.find(
      (x) => x.page === button.dataset.page || x.actor === button.dataset.actor,
    );
    if (link.current) {
      link.actor = null;
      link.unlinked = true;
    } else {
      if (link.active) this.actorLinks.find((x) => x.current).active = true;

      if (link.new) {
        this.actorLinks = this.actorLinks.filter(
          (x) => x.actor !== button.dataset.actor,
        );
      } else {
        link.removed = true;
      }
    }

    this.render();
  }

  static close(options) {
    this.reject();
    super.close(options);
  }

  static async save() {
    const potentialDuplicates = Object.fromEntries(this.duplicates);
    const usedDuplicates = [];
    for (var key in potentialDuplicates) {
      const duplicate = potentialDuplicates[key];
      if (duplicate.pack) {
        const actor = await fromUuid(key);
        const newActor = await Actor.implementation.create(actor.toObject());
        usedDuplicates.push(newActor.uuid);
      } else {
        usedDuplicates.push(key);
      }
    }

    this.resolve({
      actorLinks: this.actorLinks,
      duplicates: usedDuplicates,
    });
    this.close({});
  }

  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        drop: () => game.user.isGM,
      };
      d.callbacks = {
        drop: this._onDrop.bind(this),
      };
      return new ExpandedDragDrop(d);
    });
  }

  async _onDrop(event) {
    if (!game.user.isGM) return;

    const data = TextEditor.getDragEventData(event);
    const baseItem = await fromUuid(data.uuid);

    const itemEntityType = getEntityType(baseItem);
    if (itemEntityType !== this.entityType) {
      ui.notifications.error(
        game.i18n.format(
          "PF2EBestiary.LinkMenu.Notifications.MissmatchedType",
          { new: itemEntityType, current: this.entityType },
        ),
      );
      return;
    }

    const useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );

    if (event.currentTarget.classList.contains("duplicate-section")) {
      if (
        game.journal
          .get(game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"))
          .pages.find((x) => x.system.uuid === baseItem.uuid)
      ) {
        ui.notifications.error(
          game.i18n.localize(
            "PF2EBestiary.Macros.AddMonster.TargetAlreadyInBestiary",
          ),
        );

        return;
      }

      this.duplicates.set(baseItem.uuid, {
        name: baseItem.name,
        folderPath: this.getFolderPath(baseItem.folder),
        pack: baseItem.pack,
      });
      this.render();
    }

    if (event.currentTarget.classList.contains("actor-link-container")) {
      const existingLink = this.actorLinks.find(
        (x) => x.actor === baseItem.uuid,
      );
      if (existingLink && !existingLink.removed) {
        ui.notifications.error(
          game.i18n.localize(
            "PF2EBestiary.LinkMenu.Notifications.ActorAlreadyLinked",
          ),
        );
        return;
      }

      if (
        existingLink &&
        !existingLink.removed &&
        game.journal
          .get(game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"))
          .pages.find((x) => x.system.uuid === baseItem.uuid)
      ) {
        ui.notifications.error(
          game.i18n.localize(
            "PF2EBestiary.Macros.AddMonster.TargetAlreadyInBestiary",
          ),
        );

        return;
      }

      if (event.currentTarget.classList.contains("new")) {
        if (["npc", "character"].includes(itemEntityType)) {
          new Promise((resolve, reject) => {
            new ActorLinkSettingsMenu(resolve, reject).render(true);
          }).then((settings) => {
            this.actorLinks.push({
              actor: baseItem.uuid,
              img: useTokenArt
                ? baseItem.prototypeToken.texture.src
                : baseItem.img,
              name: baseItem.name,
              level: baseItem.system.details.level.value,
              importSections: settings,
              new: true,
            });

            this.render();
          });
        } else {
          this.actorLinks.push({
            actor: baseItem.uuid,
            img: useTokenArt
              ? baseItem.prototypeToken.texture.src
              : baseItem.img,
            name: baseItem.name,
            level: baseItem.system.details.level.value,
            new: true,
          });

          this.render();
        }
      } else if (event.currentTarget.classList.contains("unlinked")) {
        const currentLink = this.actorLinks.find(
          (x) =>
            x.page === event.currentTarget.dataset.page ||
            x.actor === event.currentTarget.dataset.actor,
        );
        currentLink.unlinked = false;
        currentLink.actor = baseItem.uuid;
        currentLink.img = useTokenArt
          ? baseItem.prototypeToken.texture.src
          : baseItem.img;
        currentLink.name = baseItem.name;
        currentLink.level = baseItem.system.details.level.value;

        this.render();
      }
    }
  }
}

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const defaultSelectedAbilities = () => ({
  actions: new Set(),
  passives: new Set(),
  spells: new Set(),
});

class PF2EBestiary extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(page, options) {
    super({});

    this.bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );

    var monsterCreatureType = null;
    if (page) {
      monsterCreatureType = page.system.initialType;
    }

    const { active: bestiaryJournalActive } = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-journal-settings",
    );
    const usedBestiaryTypes = getUsedBestiaryTypes();
    const defaultCategory =
      usedBestiaryTypes.length > 1 &&
      (bestiaryJournalActive ||
        !game.settings.get("pf2e-bestiary-tracking", "hide-tips"))
        ? null
        : getUsedBestiaryTypes()[0];

    this.selected = {
      category: options?.category ?? page?.type ?? defaultCategory,
      type: options?.type ?? monsterCreatureType,
      monster: page,
      abilities: defaultSelectedAbilities(),
    };

    // Filter 0 = Alphebetic, 1 = by level
    // Direction 0 = Ascending, 1 = Descending
    this.search = {
      name: "",
    };

    this.npcData = {
      editMode: false,
      npcView: page?.type === "pf2e-bestiary-tracking.npc" ? true : false,
      newCategory: {
        text: null,
        description: null,
      },
    };

    this.dragData = {
      bookmarkActive: false,
    };

    this.gmView = game.user.isGM;

    this._dragDrop = this._createDragDropHandlers();

    document.addEventListener("keydown", this.switchPlayerMode);
    document.addEventListener("keyup", this.resetPlayerMode);

    Hooks.on(socketEvent.UpdateBestiary, this.onBestiaryUpdate.bind(this));
    Hooks.on("deleteCombat", this.onDeleteCombat.bind(this));
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Bestiary.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-bestiary",
    classes: [
      "pf2e-bestiary-tracking",
      "bestiary",
      "application-border-container",
    ],
    position: { width: 800, height: 800 },
    actions: {
      selectCategory: this.selectCategory,
      selectBookmark: this.selectBookmark,
      selectMonster: this.selectMonster,
      removeMonster: this.removeMonster,
      toggleHideMonster: this.toggleHideMonster,
      toggleStatistics: this.toggleStatistics,
      returnButton: this.returnButton,
      toggleAbility: this.toggleAbility,
      toggleRevealed: this.toggleRevealed,
      toggleAllRevealed: this.toggleAllRevealed,
      revealEverything: this.revealEverything,
      hideEverything: this.hideEverything,
      toggleActorSheet: this.toggleActorSheet,
      openActorLinkMenu: this.openActorLinkMenu,
      refreshBestiary: this.refreshBestiary,
      handleSaveSlots: this.handleSaveSlots,
      resetBestiary: this.resetBestiary,
      clearSearch: this.clearSearch,
      toggleFilterDirection: this.toggleFilterDirection,
      createMisinformation: this.createMisinformation,
      imagePopout: this.imagePopout,
      setCategoriesLayout: this.setCategoriesLayout,
      addNpcCategory: this.addNpcCategory,
      toggleHideNPCCategory: this.toggleHideNPCCategory,
      addInfluence: this.addInfluence,
      increaseInfluence: this.increaseInfluence,
      decreaseInfluence: this.decreaseInfluence,
      removeProperty: this.removeProperty,
      exportEntity: this.exportEntity,
      importEntity: this.importEntity,
      transformNPC: this.transformNPC,
      transformCreature: this.transformCreature,
      openDocument: this.openDocument,
      removeRecallKnowledgeJournal: this.removeRecallKnowledgeJournal,
      imageMenu: this.imageMenu,
      copyEntityLink: this.copyEntityLink,
      toggleRecallAttempt: this.toggleRecallAttempt,
      resetRecallAttempts: this.resetRecallAttempts,
      displayRecallKnowledgePopup: this.displayRecallKnowledgePopup,
    },
    form: { handler: this.updateData, submitOnChange: true },
    window: {
      resizable: true,
      controls: [
        {
          icon: "fa-solid fa-arrow-rotate-left",
          label: "PF2EBestiary.Bestiary.WindowControls.RefreshBestiary",
          action: "refreshBestiary",
        },
        {
          icon: "fa-solid fa-right-left",
          label: "PF2EBestiary.Bestiary.WindowControls.BestiarySelection",
          action: "handleSaveSlots",
        },
        {
          icon: "fa-solid fa-link-slash",
          label: "PF2EBestiary.Bestiary.WindowControls.ResetBestiary",
          action: "resetBestiary",
        },
        {
          icon: "fa-solid fa-eye",
          label: "PF2EBestiary.Bestiary.WindowControls.RevealAll",
          action: "revealEverything",
        },
        {
          icon: "fa-solid fa-eye-slash",
          label: "PF2EBestiary.Bestiary.WindowControls.HideAll",
          action: "hideEverything",
        },
        {
          icon: "fas fa-file-export fa-fw",
          label: "PF2EBestiary.Bestiary.WindowControls.ExportEntity",
          action: "exportEntity",
        },
        {
          icon: "fas fa-file-import fa-fw",
          label: "PF2EBestiary.Bestiary.WindowControls.ImportEntity",
          action: "importEntity",
        },
        {
          icon: "fa-solid fa-toggle-on",
          label: "PF2EBestiary.Bestiary.WindowControls.TransformNPC",
          action: "transformNPC",
        },
        {
          icon: "fa-solid fa-toggle-on",
          label: "PF2EBestiary.Bestiary.WindowControls.TransformCreature",
          action: "transformCreature",
        },
      ],
    },
    dragDrop: [
      { dragSelector: null, dropSelector: ".recall-knowledge-container" },
      { dragSelector: ".bookmark-container.draggable", dropSelector: null },
      { dragSelector: null, dropSelector: ".npc-players-inner-container" },
    ],
  };

  static PARTS = {
    application: {
      id: "bestiary",
      template: "modules/pf2e-bestiary-tracking/templates/bestiary.hbs",
      scrollable: [
        ".left-monster-container",
        ".right-monster-container-data",
        ".right-npc-container-data",
        ".type-overview-container",
        ".spells-tab",
      ],
    },
  };

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    $(htmlElement)
      .find(".toggle-container:not(.misinformation)")
      .on("contextmenu", this.obscureData.bind(this));
    $(htmlElement)
      .find(".misinformation")
      .on("contextmenu", this.unObscureData.bind(this));
    $(htmlElement)
      .find(".bookmark.npc")
      .on("contextmenu", this.removeBookmark.bind(this));
    $(htmlElement)
      .find(".bestiary-tab.hideable")
      .on("contextmenu", this.hideTab.bind(this));
    $(htmlElement)
      .find(".npcCategorySortSelect")
      .on("change", this.updateNPCCategorySort.bind(this));

    this._dragDrop.forEach((d) => d.bind(htmlElement));

    const npcCategoryInput = $(htmlElement).find(".npc-category-input")[0];
    if (npcCategoryInput) {
      const tagFunc = (tagData) => {
        const hidden = this.selected.monster.system.npcData.categories.find(
          (x) => x.value === tagData.value,
        )?.hidden;
        return `
                <tag
                    contenteditable='false'
                    spellcheck='false'
                    tabIndex="-1"
                    class="tagify__tag tagify--noAnim tagify-hover-parent"
                >
                    <x title='' class='tagify__tag__removeBtn' role='button' aria-label='remove tag'></x>
                    <i class="tagify-hidden-button primary-container ${hidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}"></i>
                    <div>
                        <span class="tagify__tag-text">${tagData.name}</span>
                    </div>
                </tag>
            `;
      };

      const suggestionClick = this.clickTraitSuggestion.bind(this);
      const beforeRemoveTag = this.removeTraitTag.bind(this);

      const traitsTagify = new Y(npcCategoryInput, {
        tagTextProp: "name",
        enforceWhitelist: true,
        whitelist: this.bestiary
          .getFlag("pf2e-bestiary-tracking", "npcCategories")
          .map((x) => ({ value: x.value, name: x.name })),
        placeholder: game.i18n.localize(
          "PF2EBestiary.Bestiary.Miscellaneous.CategoryPlaceholder",
        ),
        dropdown: {
          mapValueTo: "name",
          searchKeys: ["name"],
          enabled: 0,
          maxItems: 20,
          closeOnSelect: true,
          highlightFirst: false,
        },
        hooks: {
          suggestionClick,
          beforeRemoveTag,
        },
        templates: {
          tag: tagFunc.bind(this),
        },
      });

      traitsTagify.on("click", this.updateNpcCategoryHidden.bind(this));
    }
  }

  clickTraitSuggestion = (e) => {
    const value = e.target
      .closest(".tagify__dropdown__item")
      .getAttribute("value");

    const data = this.bestiary
      .getFlag("pf2e-bestiary-tracking", "npcCategories")
      .find((x) => x.value === value);
    const currentCategories = this.selected.monster.system.npcData.categories;
    const newCategories = currentCategories.some((x) => x.value === data.value)
      ? currentCategories
      : [...currentCategories, data];
    const entity = this.selected.monster;

    return new Promise(async function (resolve, reject) {
      await entity.update({ "system.npcData.categories": newCategories });

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });

      Hooks.callAll(socketEvent.UpdateBestiary, {});

      resolve();
    });
  };

  removeTraitTag = (e) => {
    const currentCategories = this.selected.monster.system.npcData.categories;
    const newCategories = currentCategories.filter(
      (x) => x.value !== e[0].data.value,
    );
    const entity = this.selected.monster;

    return new Promise(async function (resolve, reject) {
      await entity.update({ "system.npcData.categories": newCategories });

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });

      Hooks.callAll(socketEvent.UpdateBestiary, {});

      resolve();
    });
  };

  changeTab(
    tab,
    group,
    { event, navElement, force = false, updatePosition = true } = {},
  ) {
    if (!tab || !group)
      throw new Error("You must pass both the tab and tab group identifier");
    if (this.tabGroups[group] === tab && !force) return;

    const tabElement = this.element.querySelector(
      `.tabs > [data-group="${group}"][data-tab="${tab}"]`,
    );
    if (!tabElement)
      throw new Error(
        `No matching tab element found for group "${group}" and tab "${tab}"`,
      );

    const generalSidebarActive =
      group === "creature" && ["statistics", "spells", "lore"].includes(tab);

    for (const t of this.element.querySelectorAll(
      `.tabs > [data-group="${group}"]`,
    )) {
      t.classList.toggle("active", t.dataset.tab === tab);
    }

    for (const section of this.element.querySelectorAll(
      `.tab[data-group="${group}"]`,
    )) {
      section.classList.toggle(
        "active",
        section.dataset.tab === tab ||
          (generalSidebarActive && section.dataset.tab === "generalSidebar"),
      );
    }
    this.tabGroups[group] = tab;

    if (!updatePosition) return;
    const positionUpdate = {};
    if (this.options.position.width === "auto") positionUpdate.width = "auto";
    if (this.options.position.height === "auto") positionUpdate.height = "auto";
    if (!foundry.utils.isEmpty(positionUpdate))
      this.setPosition(positionUpdate);
  }

  _updateFrame(options) {
    if (this.selected.monster) {
      super._updateFrame({ window: { controls: true } });
    } else {
      super._updateFrame(options);
    }
  }

  _getHeaderControls() {
    return (
      this.options.window.controls?.filter(
        this.filterHeaderControls.bind(this),
      ) || []
    );
  }

  filterHeaderControls(control) {
    switch (control.action) {
      case "importEntity":
        return game.user.isGM && !this.selected.monster;
      case "transformNPC":
        return (
          game.user.isGM &&
          Boolean(
            this.selected.monster &&
              this.selected.monster.type === "pf2e-bestiary-tracking.npc",
          )
        );
      case "transformCreature":
        return (
          game.user.isGM &&
          Boolean(
            this.selected.monster &&
              this.selected.monster.type === "pf2e-bestiary-tracking.creature",
          )
        );
      case "exportEntity":
      case "revealEverything":
      case "hideEverything":
        return game.user.isGM && Boolean(this.selected.monster);
      default:
        return game.user.isGM;
    }
  }

  getMonsterTabs(npc) {
    const tabs = {
      statistics: {
        active: true,
        cssClass: "",
        group: "creature",
        id: "statistics",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Statistics"),
      },
      generalSidebar: {
        active: true,
        sidebar: true,
        cssClass: "",
        group: "creature",
        id: "generalSidebar",
        icon: null,
      },
      spells: {
        active: false,
        cssClass: "",
        group: "creature",
        id: "spells",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Spells"),
      },
      lore: {
        active: false,
        cssClass: "",
        group: "creature",
        id: "lore",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Lore"),
      },
    };

    tabs["notes"] = {
      active: false,
      cssClass: "",
      group: "creature",
      id: "notes",
      icon: null,
      label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes"),
    };

    for (const v of Object.values(tabs)) {
      if (v.id === "generalSidebar") {
        v.active = this.tabGroups[v.group]
          ? ["statistics", "spells", "lore"].includes(this.tabGroups[v.group])
          : v.active;
      } else {
        v.active = this.tabGroups[v.group]
          ? this.tabGroups[v.group] === v.id
          : v.active;
      }

      v.cssClass = v.active ? "active" : "";
    }

    return tabs;
  }

  getNPCTabs() {
    const tabStates = this.selected.monster?.system?.tabStates;
    const tabs = {
      general: {
        active: true,
        cssClass: "",
        group: "npc",
        id: "general",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.General"),
      },
      influence: {
        active: false,
        cssClass: "",
        group: "npc",
        id: "influence",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.Influence"),
        hideable: true,
        hidden: tabStates?.influence?.hidden,
      },
      notes: {
        active: false,
        cssClass: "",
        group: "npc",
        id: "notes",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes"),
      },
    };

    if (this.gmView) {
      tabs.gm = {
        active: false,
        cssClass: "",
        group: "npc",
        id: "gm",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.GM"),
      };
    }

    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group]
        ? this.tabGroups[v.group] === v.id
        : v.active;
      v.cssClass = v.active ? "active" : "";
    }

    return tabs;
  }

  getHazardTabs() {
    const tabs = {
      statistics: {
        active: true,
        cssClass: "",
        group: "hazard",
        id: "statistics",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Statistics"),
      },
      notes: {
        active: false,
        cssClass: "",
        group: "hazard",
        id: "notes",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes"),
      },
    };

    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group]
        ? this.tabGroups[v.group] === v.id
        : v.active;
      v.cssClass = v.active ? "active" : "";
    }

    return tabs;
  }

  _onRender(context, options) {
    this._dragDrop = this._createDragDropHandlers.bind(this)();
  }

  async enrichTexts(selected) {
    if (!selected.monster) return;

    selected.monster.system.notes.player.enriched = await TextEditor.enrichHTML(
      selected.monster.system.notes.player.value,
    );

    if (!this.npcData.npcView) {
      for (var actionKey of Object.keys(selected.monster.system.actions)) {
        if (this.selected.abilities.actions.has(actionKey)) {
          const description = await TextEditor.enrichHTML(
            selected.monster.system.actions[actionKey].description,
          );

          selected.monster.system.actions[actionKey].enrichedDescription =
            description;
        } else
          selected.monster.system.actions[actionKey].enrichedDescription =
            selected.monster.system.actions[actionKey].description;
      }

      if (selected.monster.type !== "pf2e-bestiary-tracking.hazard") {
        selected.monster.system.notes.public.value =
          await TextEditor.enrichHTML(
            selected.monster.system.notes.public.value,
          );
        selected.monster.system.notes.private.value =
          await TextEditor.enrichHTML(
            selected.monster.system.notes.private.value,
          );

        for (var passiveKey of Object.keys(selected.monster.system.passives)) {
          if (this.selected.abilities.passives.has(passiveKey)) {
            const description = await TextEditor.enrichHTML(
              selected.monster.system.passives[passiveKey].description,
            );

            selected.monster.system.passives[passiveKey].enrichedDescription =
              description;
          } else
            selected.monster.system.passives[passiveKey].enrichedDescription =
              selected.monster.system.passives[passiveKey].description;
        }

        for (var entryKey in selected.monster.system.spells.entries) {
          const entry = selected.monster.system.spells.entries[entryKey];
          for (var levelKey in entry.levels) {
            for (var spellKey in entry.levels[levelKey].spells) {
              const spell = entry.levels[levelKey].spells[spellKey];
              if (this.selected.abilities.spells.has(spellKey)) {
                spell.enrichedDescription = await TextEditor.enrichHTML(
                  spell.description.value,
                );
              } else spell.enrichedDescription = spell.description.value;
            }
          }
        }
      }

      if (selected.monster.type === "pf2e-bestiary-tracking.hazard") {
        selected.monster.system.notes.description.value =
          await TextEditor.enrichHTML(
            selected.monster.system.notes.description.value,
          );

        selected.monster.system.stealth.details.value =
          await TextEditor.enrichHTML(
            selected.monster.system.stealth.details.value,
          );

        selected.monster.system.disable.value = await TextEditor.enrichHTML(
          selected.monster.system.disable.value,
        );

        selected.monster.system.reset.value = await TextEditor.enrichHTML(
          selected.monster.system.reset.value,
        );

        selected.monster.system.routine.value = await TextEditor.enrichHTML(
          selected.monster.system.routine.value,
        );
      }
    } else {
      if (selected.monster.type === "pf2e-bestiary-tracking.npc") {
        selected.monster.system.npcData.general.appearance.enrichedValue =
          await TextEditor.enrichHTML(
            selected.monster.system.npcData.general.appearance.value,
          );

        selected.monster.system.npcData.general.personality.enrichedValue =
          await TextEditor.enrichHTML(
            selected.monster.system.npcData.general.personality.value,
          );

        selected.monster.system.npcData.general.background.enrichedValue =
          await TextEditor.enrichHTML(
            selected.monster.system.npcData.general.background.value,
          );

        selected.monster.system.notes.gm.enriched = await TextEditor.enrichHTML(
          selected.monster.system.notes.gm.value,
        );

        for (var key of Object.keys(
          selected.monster.system.npcData.influence.discovery,
        )) {
          selected.monster.system.npcData.influence.discovery[key].label =
            await TextEditor.enrichHTML(
              selected.monster.system.npcData.influence.discovery[key].label,
            );
        }

        for (var key of Object.keys(
          selected.monster.system.npcData.influence.influenceSkills,
        )) {
          const influence =
            selected.monster.system.npcData.influence.influenceSkills[key];
          influence.label = await TextEditor.enrichHTML(influence.label);
        }
      }
    }
  }

  getBookmarks(layout) {
    const bookmarks =
      this.selected.category === "pf2e-bestiary-tracking.creature"
        ? getExpandedCreatureTypes()
        : this.selected.category === "pf2e-bestiary-tracking.npc"
          ? getNPCCategories().filter((x) => this.gmView || !x.hidden)
          : getHazardCategories();

    const creatureReduce = (acc, creature) => {
      if (!creature.system.active) return acc;

      const types = getCreaturesTypes(creature.system.traits);

      var usedTypes = types.map((x) => x.key);
      if (this.gmView) {
        usedTypes = types.filter((x) => !x.fake).map((x) => x.key);
      } else {
        usedTypes = types.filter((x) => x.revealed).map((x) => x.key);
      }

      if (usedTypes.length === 0) usedTypes = ["unknown"];

      for (var type of usedTypes) {
        acc
          .find((x) => x.value === type)
          ?.values?.push({
            id: creature.id,
            name: creature.system.name,
            hidden: creature.system.hidden,
            hideState: creature.system.imageState.hideState,
            img: creature.system.displayImage,
          });
      }

      return acc;
    };

    const npcReduce = (npcCategories) => (acc, npc) => {
      if (!npc.system.active) return acc;

      const categories = npc.system.npcData.categories.filter((x) => {
        const npcCategory = npcCategories.find(
          (category) => category.value === x.value,
        );
        return this.gmView || (!x.hidden && npcCategory && !npcCategory.hidden);
      });
      var usedCategories =
        categories.length > 0
          ? categories.map((x) => x.value)
          : ["unaffiliated"];

      for (var category of usedCategories) {
        acc
          .find((x) => x.value === category)
          ?.values?.push({
            id: npc.id,
            name: npc.system.name,
            hidden: npc.system.hidden,
            hideState: npc.system.imageState.hideState,
            img: npc.system.displayImage,
          });
      }

      return acc;
    };

    const hazardReduce = (acc, hazard) => {
      if (!hazard.system.active) return acc;

      const types = getHazardTypes(hazard.system.traits);

      var usedTypes = types.map((x) => x.key);
      if (this.gmView) {
        usedTypes = types.filter((x) => !x.fake).map((x) => x.key);
      } else {
        usedTypes = types.filter((x) => x.revealed).map((x) => x.key);
      }

      if (usedTypes.length === 0) usedTypes = ["unknown"];

      for (var type of usedTypes) {
        acc
          .find((x) => x.value === type)
          ?.values?.push({
            id: hazard.id,
            name: hazard.system.name,
            hidden: hazard.system.hidden,
            hideState: hazard.system.imageState.hideState,
            img: hazard.system.displayImage,
          });
      }

      return acc;
    };

    const reduceFunc = (npcCategories, combatants) => (acc, entity) => {
      combatants?.forEach((x) => x.token === null);
      const inCombatType =
        combatants &&
        combatants.find((x) => {
          const token =
            x.token ??
            game.combat.scene.tokens.find(
              (token) => token.actorId === x.actorId,
            );

          return (
            token?.baseActor?.uuid === entity.system.uuid ||
            x.actorId === entity.system.id
          );
        });
      if (inCombatType) {
        acc
          .find((x) => x.value === "combat")
          ?.values?.push({
            id: entity.id,
            name: entity.system.name,
            hidden: entity.system.hidden,
            hideState: entity.system.imageState.hideState,
            img: entity.system.displayImage,
          });
      }

      if (entity.type === this.selected.category) {
        switch (entity.type) {
          case "pf2e-bestiary-tracking.creature":
            acc = creatureReduce(acc, entity);
            break;
          case "pf2e-bestiary-tracking.npc":
            acc = npcReduce(npcCategories)(acc, entity);
            break;
          case "pf2e-bestiary-tracking.hazard":
            acc = hazardReduce(acc, entity);
            break;
        }
      }

      return acc;
    };

    const searchFilter = (entity) => {
      const unknownLabel =
        this.selected.category === "pf2e-bestiary-tracking.creature"
          ? "PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature"
          : this.selected.category === "pf2e-bestiary-tracking.npc"
            ? "PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated"
            : "PF2EBestiary.Bestiary.Miscellaneous.UnknownHazard";
      const match = entity.system.name.value
        .toLowerCase()
        .match(this.search.name.toLowerCase());
      const unrevealedMatch = game.i18n
        .localize(unknownLabel)
        .toLowerCase()
        .match(this.search.name.toLowerCase());
      if (
        !this.search.name ||
        ((entity.system.name.revealed || this.gmView) && match) ||
        (!entity.system.name.revealed && !this.gmView && unrevealedMatch)
      ) {
        return true;
      }

      return false;
    };

    const sortFunc = (a, b) => {
      if (
        !layout?.categories?.filter?.type ||
        layout.categories.filter.type === 0
      ) {
        var comparison =
          a.system.name.value < b.system.name.value
            ? -1
            : a.system.name.value > b.system.name.value
              ? 1
              : 0;
        if (!this.gmView) {
          comparison =
            a.system.name.revealed && b.system.name.revealed
              ? a.system.name.value < b.system.name.value
                ? -1
                : a.system.name.value > b.system.name.value
                  ? 1
                  : 0
              : a.system.name.revealed && !b.system.name.revealed
                ? 1
                : !a.system.name.revealed && b.system.name.revealed
                  ? -1
                  : 0;
        }

        return layout?.categories?.filter?.direction === 0
          ? comparison
          : comparison * -1;
      } else {
        var comparison = a.system.level.value - b.system.level.value;
        if (!this.gmView) {
          comparison =
            a.system.level.revealed && b.system.level.revealed
              ? a.system.level.value - b.system.level.value
              : a.system.level.revealed && !b.system.level.revealed
                ? 1
                : !a.system.level.revealed && b.system.level.revealed
                  ? -1
                  : 0;
        }

        return layout.categories.filter.direction === 0
          ? comparison
          : comparison * -1;
      }
    };

    return !this.selected.category
      ? []
      : this.bestiary.pages
          .filter((entity) => {
            if (
              (!game.combat && entity.type !== this.selected.category) ||
              (!this.gmView && entity.system.hidden)
            )
              return false;

            return searchFilter(entity);
          })
          .sort(sortFunc)
          .reduce(
            reduceFunc(
              this.bestiary.getFlag("pf2e-bestiary-tracking", "npcCategories"),
              game.combat?.combatants,
            ),
            bookmarks,
          );
  }

  async _prepareContext(_options) {
    var context = await super._prepareContext(_options);

    context = await this.sharedPreparation(context);
    context.bookmarks = this.getBookmarks(context.layout);

    const activeBookmark = context.bookmarks.find(
      (x) => x.value === this.selected.type,
    );
    context.bookmarkEntities = this.selected.type ? activeBookmark.values : [];
    context.bookmarkDescription = activeBookmark?.description;
    context.returnLabel = !this.selected.monster
      ? game.i18n.localize(
          "PF2EBestiary.Bestiary.ReturnMessages.ReturnToWelcome",
        )
      : game.i18n.format(
          "PF2EBestiary.Bestiary.ReturnMessages.ReturnToCategory",
          { type: activeBookmark.name },
        );

    if (this.selected.category === "pf2e-bestiary-tracking.npc") {
      context = await this.npcPreparation(context);
    } else if (this.selected.category === "pf2e-bestiary-tracking.creature") {
      context = await this.monsterPreparation(context);
    } else if (this.selected.category === "pf2e-bestiary-tracking.hazard") {
      context = await this.hazardPreparation(context);
    }

    return context;
  }

  sharedPreparation = async (context) => {
    context.gmView = this.gmView;
    context.dispositionIcons = game.settings.get(
      "pf2e-bestiary-tracking",
      "disposition-icons",
    );
    context.layout = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-layout",
    );
    context.settings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-settings",
    );
    context.npcCategorySortOptions = npcCategorySortOptions;
    context.optionalFields = game.settings.get(
      "pf2e-bestiary-tracking",
      "optional-fields",
    );
    context.detailedInformation = game.settings.get(
      "pf2e-bestiary-tracking",
      "detailed-information-toggles",
    );
    context.useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );
    context.hideTips = game.settings.get("pf2e-bestiary-tracking", "hide-tips");
    context.hideWelcome = game.settings.get(
      "pf2e-bestiary-tracking",
      "hide-welcome",
    );
    context.sectionsPositioning = game.settings.get(
      "pf2e-bestiary-tracking",
      "sections-position",
    );
    context.hideAbilityDescriptions = game.settings.get(
      "pf2e-bestiary-tracking",
      "hide-ability-descriptions",
    );
    context.contrastRevealedState = game.settings.get(
      "pf2e-bestiary-tracking",
      "contrast-revealed-state",
    );
    context.vagueDescriptions = foundry.utils.deepClone(
      game.settings.get("pf2e-bestiary-tracking", "vague-descriptions"),
    );
    context.categorySettings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-category-settings",
    );
    context.usedSections = game.settings.get(
      "pf2e-bestiary-tracking",
      "used-sections",
    );
    context.showCategories =
      Object.values(context.usedSections).filter((x) => x).length > 1;

    context.recallKnowledgeJournal = this.bestiary.getFlag(
      "pf2e-bestiary-tracking",
      "recall-knowledge-journal",
    );
    context.journalSettings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-journal-settings",
    );
    context.actorSheetApp = this.actorSheetApp;

    context.vagueDescriptions.settings.playerBased = this.gmView
      ? false
      : context.vagueDescriptions.settings.playerBased;
    context.user = game.user;
    context.playerLevel = game.user.character
      ? game.user.character.system.details.level.value
      : null;
    context.search = this.search;
    context.npcState = this.npcData;
    context.selected = foundry.utils.deepClone(this.selected);
    await this.enrichTexts(context.selected);

    context.players = [];
    for (var data of game.actors.find((x) => x.type === "party" && x.active)
      ?.system?.details?.members ?? []) {
      const actor = await fromUuid(data.uuid);
      if (actor) {
        context.players.push({
          id: actor.id,
          name: actor.name,
          img: actor.img,
        });
      }
    }

    context.typeTitle = this.selected.type
      ? this.selected.category === "pf2e-bestiary-tracking.creature"
        ? game.i18n.format("PF2EBestiary.Bestiary.CategoryView.EmptyText", {
            category: getExpandedCreatureTypes().find(
              (x) => x.value === this.selected.type,
            ).name,
          })
        : this.selected.category === "pf2e-bestiary-tracking.npc"
          ? game.i18n.format(
              "PF2EBestiary.Bestiary.CategoryView.EmptyCategoryText",
              {
                category: getNPCCategories().find(
                  (x) => x.value === this.selected.type,
                ).name,
              },
            )
          : this.selected.category === "pf2e-bestiary-tracking.hazard"
            ? game.i18n.format(
                "PF2EBestiary.Bestiary.CategoryView.EmptyHazardText",
                {
                  category: getHazardCategories().find(
                    (x) => x.value === this.selected.type,
                  ).name,
                },
              )
            : ""
      : "";

    context.bookmarks = [];

    return context;
  };

  monsterPreparation = async (context) => {
    context.tabs = this.getMonsterTabs();

    return context;
  };

  npcPreparation = async (context) => {
    context.tabs = this.getMonsterTabs(true);
    context.npcTabs = this.getNPCTabs();
    context.dispositions = Object.keys(dispositions).map(
      (x) => dispositions[x],
    );
    context.npcCategories =
      this.bestiary.flags["pf2e-bestiary-tracking"].npcCategories;
    context.inputCategories = this.selected.monster
      ? this.selected.monster.system.npcData.categories.map((x) => x.name)
      : [];

    context.skillTypes = [
      ...Object.keys(CONFIG.PF2E.skills).map((skill) => ({
        value: skill,
        name: CONFIG.PF2E.skills[skill].label,
      })),
      { value: "perception", name: "PF2EBestiary.Miscellaneous.Perception" },
    ];

    return context;
  };

  hazardPreparation = async (context) => {
    context.tabs = this.getHazardTabs();

    return context;
  };

  static selectCategory(_, button) {
    this.selected.category =
      this.selected.category === button.dataset.category
        ? null
        : button.dataset.category;
    this.selected.type = null;
    this.selected.monster = null;

    this._updateFrame({ window: { controls: true } });

    this.render();
  }

  static selectBookmark(_, button) {
    this.selected.type = button.dataset.bookmark;
    this.selected.monster = null;
    this.search.name = "";

    this._updateFrame({ window: { controls: true } });

    this.render();
  }

  async removeBookmark(event) {
    if (
      event.currentTarget.dataset.bookmark === "unaffiliated" ||
      event.currentTarget.dataset.bookmark === "combat"
    )
      return;

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("PF2EBestiary.Bestiary.RemoveBookmarkTitle"),
      content: game.i18n.format("PF2EBestiary.Bestiary.RemoveBookmarkText", {
        category: event.currentTarget.dataset.bookmarkName,
      }),
      yes: () => true,
      no: () => false,
    });

    if (!confirmed) return null;

    for (var npc of this.bestiary.pages.filter((page) => {
      return page.system.npcData?.categories.some(
        (x) => x.value === event.currentTarget.dataset.bookmark,
      );
    })) {
      await npc.update({
        "system.npcData.categories": npc.system.npcData.categories.filter(
          (x) => x.value !== event.currentTarget.dataset.bookmark,
        ),
      });
    }

    this.selected.type =
      this.selected.type === event.currentTarget.dataset.bookmark
        ? null
        : this.selected.type;

    await this.bestiary.setFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
      this.bestiary
        .getFlag("pf2e-bestiary-tracking", "npcCategories")
        .filter((x) => x.value !== event.currentTarget.dataset.bookmark)
        .map((x, index) => ({ ...x, position: index })),
    );

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static selectMonster(_, button) {
    this.selected.monster = this.bestiary.pages.get(button.dataset.monster);
    this.selected.category = this.selected.monster.type;
    this.selected.abilities = defaultSelectedAbilities();
    this.npcData.npcView =
      this.selected.monster.type === "pf2e-bestiary-tracking.npc" &&
      (this.selected.monster.system.npcData.simple ||
        this.selected.type !== "combat")
        ? true
        : false;
    this.tabGroups = { creature: "statistics", secondary: "general" };
    this.render();
  }

  static async removeMonster(_, button) {
    const confirmed = await Dialog.confirm({
      title: "Delete Monster",
      content:
        "Are you sure you want to remove the creature from the Bestiary?",
      yes: () => true,
      no: () => false,
    });

    if (!confirmed) return;

    await this.bestiary.pages.get(button.dataset.monster).delete();

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async toggleHideMonster(_, button) {
    const entity = this.bestiary.pages.get(button.dataset.id);
    await entity.update({ "system.hidden": !entity.system.hidden });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static toggleStatistics() {
    this.statistics.expanded = !this.statistics.expanded;
    this.render();
  }

  static async returnButton(_, button) {
    this.selected = this.selected.monster
      ? { ...this.selected, type: button.dataset.contextType, monster: null }
      : this.selected.type
        ? { ...this.selected, type: null }
        : {};
    await this.removeActorSheet();
    this._updateFrame({ window: { controls: true } });
    this.render();
  }

  static toggleAbility(_, button) {
    const category = this.selected.abilities[button.dataset.category];
    if (category.has(button.dataset.ability))
      category.delete(button.dataset.ability);
    else category.add(button.dataset.ability);
    this.render();
  }

  async updateNpcCategoryHidden(event) {
    await this.selected.monster.update({
      "system.npcData.categories":
        this.selected.monster.system.npcData.categories.map((x) => ({
          ...x,
          hidden: x.value === event.detail.data.value ? !x.hidden : x.hidden,
        })),
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async handleTokenNames(monster) {
    if (game.settings.get("pf2e-bestiary-tracking", "hide-token-names")) {
      var workBenchMystifierUsed =
        game.modules.get("xdy-pf2e-workbench")?.active &&
        game.settings.get("xdy-pf2e-workbench", "npcMystifier");

      let name =
        monster.system.name.revealed && monster.system.name.custom
          ? monster.system.name.custom
          : monster.system.name.revealed && !monster.system.name.custom
            ? monster.system.name.value
            : !monster.system.name.revealed
              ? "unknown"
              : null;

      if (name) {
        for (var token of canvas.tokens.placeables.filter(
          (x) => x.document?.baseActor?.uuid === monster.system.uuid,
        )) {
          if (workBenchMystifierUsed && name === "unknown") {
            await game.PF2eWorkbench.doMystificationFromToken(token.id); // Await does nothing atm. Needs change in workbench to be able to remove timeout.

            if (game.combat) {
              setTimeout(() => {
                game.combat.combatants
                  .find((x) => x.token.baseActor.uuid === monster.system.uuid)
                  ?.update({ name: token.name });
              }, 50);
            }
          } else {
            name =
              name === "unknown"
                ? game.i18n.localize(
                    "PF2EBestiary.Bestiary.Miscellaneous.Unknown",
                  )
                : name;
            await token.document.update({ name });

            if (game.combat) {
              await game.combat.combatants
                .find((x) => x.token.baseActor.uuid === monster.system.uuid)
                ?.update({ name: token.name });
            }
          }
        }
      }
    }
  }

  static async toggleRevealed(event, button) {
    if (!game.user.isGM) return;

    event.stopPropagation();
    const path = button.dataset.path.startsWith("npc.")
      ? button.dataset.path.slice(4)
      : button.dataset.path;

    const newValue = !foundry.utils.getProperty(
      this.selected.monster,
      `${path}.${button.dataset.key ?? "revealed"}`,
    );
    await this.selected.monster.update({
      [`${path}.${button.dataset.key ?? "revealed"}`]: newValue,
    });

    if (path === "system.name") {
      await PF2EBestiary.handleTokenNames(this.selected.monster);
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async toggleAllRevealed(_, button) {
    if (!game.user.isGM) return;

    const property = button.dataset.path
      ? foundry.utils.getProperty(this.selected.monster, button.dataset.path)
      : {};
    const keys = Object.keys(property);
    var allRevealed = false;
    switch (button.dataset.type) {
      case "attacks":
        allRevealed = Object.values(this.selected.monster.system.attacks).every(
          (x) => x.revealed,
        );
        await this.selected.monster.update({
          system: {
            attacks: Object.keys(this.selected.monster.system.attacks).reduce(
              (acc, key) => {
                acc[key] = { revealed: !allRevealed };
                return acc;
              },
              {},
            ),
          },
        });
        break;
      case "defenses":
        allRevealed = !(
          this.selected.monster.system.hp.revealed &&
          this.selected.monster.system.hardness.revealed &&
          this.selected.monster.system.ac.revealed
        );
        await this.selected.monster.update({
          system: {
            hp: { revealed: allRevealed },
            hardness: { revealed: allRevealed },
            ac: { revealed: allRevealed },
          },
        });
        break;
      case "senses":
        allRevealed =
          Object.values(this.selected.monster.system.senses.senses).every(
            (x) => x.revealed,
          ) &&
          this.selected.monster.system.senses.perception.revealed &&
          this.selected.monster.system.senses.details.revealed;
        await this.selected.monster.update({
          system: {
            senses: {
              perception: { revealed: !allRevealed },
              details: { revealed: !allRevealed },
              senses: Object.keys(
                this.selected.monster.system.senses.senses,
              ).reduce((acc, key) => {
                acc[key] = { revealed: !allRevealed };
                return acc;
              }, {}),
            },
          },
        });
        break;
      case "speed":
        allRevealed =
          Object.values(this.selected.monster.system.speeds.values).every(
            (x) => x.revealed,
          ) && this.selected.monster.system.speeds.details.revealed;
        await this.selected.monster.update({
          system: {
            speeds: {
              details: { revealed: !allRevealed },
              values: Object.keys(
                this.selected.monster.system.speeds.values,
              ).reduce((acc, key) => {
                acc[key] = { revealed: !allRevealed };
                return acc;
              }, {}),
            },
          },
        });
        break;
      case "spell-level":
        allRevealed = Object.values(
          this.selected.monster.system.spells.entries[button.dataset.entryValue]
            .levels[button.dataset.spellLevel].spells,
        ).every((x) => x.revealed);
        const update = {
          system: {
            spells: {
              entries: Object.keys(
                this.selected.monster.system.spells.entries,
              ).reduce((acc, entryKey) => {
                const entry =
                  this.selected.monster.system.spells.entries[entryKey];
                if (button.dataset.entryValue) {
                  acc[entryKey] = {
                    levels: Object.keys(entry.levels).reduce((acc, level) => {
                      if (level === button.dataset.spellLevel) {
                        acc[level] = {
                          spells: Object.keys(
                            entry.levels[level].spells,
                          ).reduce((acc, spell) => {
                            acc[spell] = { revealed: !allRevealed };
                            return acc;
                          }, {}),
                        };
                      }
                      return acc;
                    }, {}),
                  };
                }

                return acc;
              }, {}),
            },
          },
        };
        await this.selected.monster.update(update, { diff: true });
        break;
      case "personality":
        const baseProp =
          this.selected.monster.system.npcData.general.personality.data;
        allRevealed =
          baseProp.attitude.revealed &&
          baseProp.beliefs.revealed &&
          baseProp.likes.revealed &&
          baseProp.dislikes.revealed &&
          baseProp.catchphrases.revealed &&
          Object.values(baseProp.edicts).every((x) => x.revealed) &&
          Object.values(baseProp.anathema).every((x) => x.revealed);
        await this.selected.monster.update({
          "system.npcData.general.personality.data": {
            attitude: { revealed: !allRevealed },
            beliefs: { revealed: !allRevealed },
            likes: { revealed: !allRevealed },
            dislikes: { revealed: !allRevealed },
            catchphrases: { revealed: !allRevealed },
            edicts: Object.keys(baseProp.edicts).reduce((acc, key) => {
              acc[key] = { revealed: !allRevealed };
              return acc;
            }, {}),
            anathema: Object.keys(baseProp.anathema).reduce((acc, key) => {
              acc[key] = { revealed: !allRevealed };
              return acc;
            }, {}),
          },
        });
      default:
        allRevealed = keys.every((key) => property[key].revealed);
        await this.selected.monster.update({
          [button.dataset.path]: keys.reduce((acc, key) => {
            acc[key] = { revealed: !allRevealed };
            return acc;
          }, {}),
        });
        break;
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async revealEverything() {
    await this.toggleEverythingRevealed(true);
  }

  static async hideEverything() {
    await this.toggleEverythingRevealed(false);
  }

  static async toggleActorSheet() {
    if (this.actorSheetApp) {
      await this.selected.monster.system.refreshData();

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });

      await this.removeActorSheet();
      Hooks.callAll(socketEvent.UpdateBestiary, {});
    } else {
      const actor = game.actors.find(
        (x) => x.uuid === this.selected.monster.system.uuid,
      );
      if (!actor) {
        ui.notifications.error("PF2EBestiary.Bestiary.Errors.ActorMissing");
        return;
      }

      this.actorSheetApp = await actor.sheet.render(true);
    }
  }

  static async openActorLinkMenu() {
    new Promise((resolve, reject) => {
      new AvatarLinkMenu(this.selected.monster, resolve, reject).render(true);
    }).then(
      async ({ actorLinks, duplicates }) => {
        for (var link of actorLinks.filter((x) => x.removed)) {
          const page = this.bestiary.pages.get(link.page);
          await page.delete();
        }

        for (var link of actorLinks.filter((x) => x.new)) {
          const newEntity = await fromUuid(link.actor);
          const page = await PF2EBestiary.addMonster(
            newEntity,
            null,
            link.active,
          );
          link.page = page.id;
        }

        const currentPage = this.bestiary.pages.get(
          actorLinks.find((x) => x.active).page,
        );
        for (var link of actorLinks.filter((x) => !x.removed)) {
          const page = this.bestiary.pages.get(link.page);
          const newLinks = actorLinks
            .filter((x) => x.actor !== link.actor && !x.removed)
            .map((x) => x.page);
          if (link.actor !== page.system.uuid) {
            await page.update({
              system: {
                active: Boolean(link.active),
                uuid: link.actor,
                actorState: {
                  actorLinks: newLinks,
                  actorDuplicates: duplicates,
                },
              },
            });
            if (link.actor) await page.system.refreshData();
          } else {
            await page.update({
              system: {
                active: Boolean(link.active),
                actorState: {
                  actorLinks: newLinks,
                  actorDuplicates: duplicates,
                },
              },
            });

            if (link.new) {
              await page.system.importData(currentPage, link.importSections);
            }
          }

          if (link.active) {
            this.selected.monster = page;
          }
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });
        Hooks.callAll(socketEvent.UpdateBestiary, {});
      },
      () => {
        return;
      },
    );
  }

  removeActorSheet = async () => {
    if (!this.actorSheetApp) return;

    const monsterContainer = $(this.element).find(".monster-container");
    monsterContainer.removeClass("closed");
    const actorContainer = $(this.element).find(".bestiary-actor-sheet");
    actorContainer.removeClass("expanded");

    delete ui.windows[this.actorSheetApp.appId];
    await this.actorSheetApp.close({ force: true });
    this.actorSheetApp = null;
  };

  async toggleEverythingRevealed(revealed) {
    if (!game.user.isGM || !this.selected.monster) return;

    await this.selected.monster.system.toggleEverything(
      revealed,
      this.npcData.npcView,
    );

    await PF2EBestiary.handleTokenNames(this.selected.monster);

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.toggleControls(false);
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async refreshBestiary() {
    if (!game.user.isGM) return;
    this.toggleControls(false);

    ui.notifications.info(
      game.i18n.localize("PF2EBestiary.Bestiary.Info.RefreshStarted"),
    );

    const failedActors = [];
    for (var bestiaryPage of this.bestiary.pages) {
      const succeeded = await bestiaryPage.system.refreshData();
      if (!succeeded) failedActors.push(bestiaryPage.system.name.value);
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});

    if (failedActors.length === 0)
      ui.notifications.info(
        game.i18n.localize("PF2EBestiary.Bestiary.Info.RefreshFinished"),
      );
    else
      ui.notifications.info(
        game.i18n.format("PF2EBestiary.Bestiary.Info.RefreshFinishedPartial", {
          entities: failedActors.join(", "),
        }),
      );
  }

  static async handleSaveSlots() {
    if (!game.user.isGM) return;
    this.toggleControls(false);

    await new BestiarySelection().render(true);
  }

  static async resetBestiary() {
    const successfull = await resetBestiary();
    if (successfull) {
      this.toggleControls(false);
      this.render();
    }
  }

  static clearSearch() {
    this.search.name = "";
    this.render();
  }

  static async toggleFilterDirection() {
    const settings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-layout",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-layout", {
      ...settings,
      categories: {
        ...settings.categories,
        filter: {
          ...settings.categories.filter,
          direction: settings.categories.filter.direction === 0 ? 1 : 0,
        },
      },
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  getMisinformationDialogData(name) {
    switch (name) {
      case "Immunity":
      case "Weakness":
      case "Resistance":
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            required: true,
          }).toFormGroup({}, { name: "misinformation" }).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  type: elements.misinformation.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Trait":
        const allTypes = [
          ...Object.keys(CONFIG.PF2E.creatureTraits).map((type) => ({
            value: type,
            label: CONFIG.PF2E.creatureTraits[type],
          })),
          ...game.settings
            .get("pf2e-bestiary-tracking", "additional-creature-types")
            .map((type) => ({
              value: type.value,
              label: type.name,
            })),
        ].sort((a, b) => {
          if (a.label < b.label) return -1;
          else if (a.label > b.label) return 1;
          else return 0;
        });
        return {
          width: 400,
          content: `<div class="flexrow">
          ${
            new foundry.data.fields.StringField({
              label: game.i18n.format(
                "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
                { property: name },
              ),
              choices: allTypes,
              required: true,
            }).toFormGroup(
              {},
              {
                name: "misinformation",
                localize: true,
                nameAttr: "value",
                labelAttr: "label",
              },
            ).outerHTML
          }
          <button class="flex0 misinformation-randomise"><i class="fa-solid fa-arrows-rotate" style="margin: 0;" title="${game.i18n.localize("PF2EBestiary.Miscellaneous.Randomise")}"></i></button>
          </div>`,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            const type =
              allTypes[Number.parseInt(elements.misinformation.value)];
            return {
              value: {
                slug: slugify(type.value),
                value: {
                  revealed: false,
                  label: type.label,
                  value: type.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
          functions: [
            {
              selector: "misinformation-randomise",
              onClick: (event) => {
                event.preventDefault();
                const randomTrait = allTypes
                  .indexOf(
                    allTypes[Math.floor(Math.random() * allTypes.length)],
                  )
                  .toString();
                const input = event.currentTarget.parentElement.querySelector(
                  '[name="misinformation"]',
                );
                input.value = randomTrait;
              },
            },
          ],
        };
      case "HazardTrait":
        const allHazardTypes = Object.keys(CONFIG.PF2E.hazardTraits)
          .map((type) => ({
            value: type,
            label: CONFIG.PF2E.hazardTraits[type],
          }))
          .sort((a, b) => {
            if (a.label < b.label) return -1;
            else if (a.label > b.label) return 1;
            else return 0;
          });
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            choices: allHazardTypes,
            required: true,
          }).toFormGroup(
            {},
            {
              name: "misinformation",
              localize: true,
              nameAttr: "value",
              labelAttr: "label",
            },
          ).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            const type =
              allHazardTypes[Number.parseInt(elements.misinformation.value)];
            return {
              value: {
                slug: slugify(type.value),
                value: {
                  revealed: false,
                  label: type.label,
                  value: type.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Languages":
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            required: true,
          }).toFormGroup({}, { name: "misinformation" }).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  value: elements.misinformation.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Sense":
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            required: true,
          }).toFormGroup({}, { name: "misinformation" }).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  type: elements.misinformation.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Attack":
        const rangeOptions = ["Melee", "Ranged"];
        return {
          width: 400,
          content: `
                        <div>
                            ${
                              new foundry.data.fields.StringField({
                                label: game.i18n.format(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
                                  { property: name },
                                ),
                                required: true,
                              }).toFormGroup({}, { name: "misinformation" })
                                .outerHTML
                            }
                            ${
                              new foundry.data.fields.StringField({
                                choices: rangeOptions,
                                label: game.i18n.localize(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.Attack.Range",
                                ),
                                required: true,
                              }).toFormGroup({}, { name: "range" }).outerHTML
                            }
                    </div>`,
          getValue: (elements) => {
            const errors = [];
            if (!elements.misinformation?.value) errors.push(`Fake ${name}`);
            if (!elements.range?.value) errors.push("Range");

            if (errors.length > 0) return { value: null, errors };

            rangeOptions[Number.parseInt(elements.range.value)];
            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  label: elements.misinformation.value,
                  fake: true,
                  item: {
                    system: {
                      damageRolls: {},
                    },
                    _id: slugify(elements.misinformation.value),
                  },
                  weapon: {
                    system: {
                      traits: {
                        value: [],
                      },
                    },
                  },
                  variants: [],
                  traits: [],
                  totalModifier: 0,
                },
              },
              errors: [],
            };
          },
        };
      case "Action":
      case "Passive":
        const actionOptions =
          name === "Action"
            ? [
                { value: "F", label: "Free Action" },
                { value: "1", label: "1 Action" },
                { value: "2", label: "2 Actions" },
                { value: "3", label: "3 Actions" },
                { value: "R", label: "Reaction" },
              ]
            : [];
        return {
          width: 600,
          content: `
                        <div class="pf2e-bestiary-misinformation-dialog">
                            ${
                              new foundry.data.fields.StringField({
                                label: game.i18n.format(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
                                  { property: name },
                                ),
                                required: true,
                              }).toFormGroup({}, { name: "misinformation" })
                                .outerHTML
                            }
                            ${
                              actionOptions.length > 0
                                ? new foundry.data.fields.StringField({
                                    choices: actionOptions.map((x) => x.label),
                                    label: game.i18n.localize(
                                      "PF2EBestiary.Bestiary.Misinformation.Dialog.Attack.Actions",
                                    ),
                                    required: true,
                                  }).toFormGroup({}, { name: "actions" })
                                    .outerHTML
                                : ""
                            }
                            ${
                              new foundry.data.fields.StringField({
                                label: game.i18n.localize(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.Traitlabel",
                                ),
                                required: false,
                              }).toFormGroup({}, { name: "traits" }).outerHTML
                            }
                            ${
                              new foundry.data.fields.HTMLField({
                                label: game.i18n.localize(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.Ability.Description",
                                ),
                                required: false,
                              }).toFormGroup(
                                {},
                                { value: "", name: "description" },
                              ).outerHTML
                            }
                    </div>`,
          getValue: (elements) => {
            const errors = [];
            if (!elements.misinformation?.value) errors.push(`Fake ${name}`);
            if (name === "Action" && !elements.actions?.value)
              errors.push("Actions Value");

            if (errors.length > 0) return { value: null, errors };

            const id = `FakeUuid-${name}-${foundry.utils.randomID()}`;
            const base = {
              slug: id,
              value: {
                revealed: false,
                _id: id,
                label: elements.misinformation.value,
                type: "action",
                description: elements.description?.value,
                traits: elements.traits.value
                  ? JSON.parse(elements.traits.value).map((x) => ({
                      revealed: false,
                      value: x.value,
                    }))
                  : [],
                fake: true,
              },
            };

            if (name === "Action") {
              base.value.actions =
                actionOptions[Number.parseInt(elements.actions.value)]?.value;
            }

            return { value: base, errors: [] };
          },
          tagify: [
            {
              element: "traits",
              options: {
                whitelist: Object.keys(CONFIG.PF2E.actionTraits).map((key) => {
                  const label = CONFIG.PF2E.actionTraits[key];
                  return { value: key, name: game.i18n.localize(label) };
                }),
                dropdown: {
                  mapValueTo: "name",
                  searchKeys: ["name"],
                  enabled: 0,
                  maxItems: 20,
                  closeOnSelect: true,
                  highlightFirst: false,
                },
              },
            },
          ],
        };
    }
  }

  static async createMisinformation(_, button) {
    if (!game.user.isGM) return;

    const addValue = async ({ value, errors }) => {
      if (errors.length > 0)
        ui.notifications.error(
          game.i18n.format(
            "PF2EBestiary.Bestiary.Misinformation.Dialog.Errors.RequiredFields",
            {
              fields: errors.map(
                (x, index) => `${x}${index !== errors.length - 1 ? ", " : ""}`,
              ),
            },
          ),
        );

      const newValues = foundry.utils.getProperty(
        this.selected.monster,
        `${button.dataset.path}`,
      );
      if (Array.isArray(newValues)) newValues.push(value.value);
      else newValues[value.slug] = value.value;

      await this.selected.monster.update({
        [`${button.dataset.path}`]: newValues,
      });

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: { monsterSlug: this.selected.monster.slug },
      });

      this.render();
    };

    const {
      content,
      getValue,
      functions,
      width,
      tagify = [],
    } = this.getMisinformationDialogData(button.dataset.name);

    async function callback(_, button) {
      await addValue(getValue(button.form.elements));
    }

    const dialog = new foundry.applications.api.DialogV2({
      buttons: [
        foundry.utils.mergeObject(
          {
            action: "ok",
            label: "Confirm",
            icon: "fas fa-check",
            default: true,
          },
          { callback: callback },
        ),
      ],
      content: content,
      rejectClose: false,
      modal: false,
      window: {
        title: game.i18n.localize(
          "PF2EBestiary.Bestiary.Misinformation.Dialog.Title",
        ),
      },
      position: { width },
    });

    await dialog.render(true);

    for (var func of functions) {
      const functionElement = dialog.element.getElementsByClassName(
        func.selector,
      )[0];
      functionElement.onclick = func.onClick;
    }

    for (var tag of tagify) {
      const element = $(dialog.element).find(`input[name="${tag.element}"]`);
      new Y(element[0], tag.options);
    }
  }

  static async imagePopout() {
    const title = this.selected.monster.system.name.revealed
      ? this.selected.monster.system.name.custom
        ? this.selected.monster.system.name.custom
        : this.selected.monster.system.name.value
      : this.selected.monster.type === "pf2e-bestiary-tracking.creature"
        ? game.i18n.localize(
            "PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature",
          )
        : this.selected.monster.type === "pf2e-bestiary-tracking.npc"
          ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.UnknownNPC")
          : game.i18n.localize(
              "PF2EBestiary.Bestiary.Miscellaneous.UnknownHazard",
            );

    new ImagePopout(this.selected.monster.system.displayImage, {
      title: title,
      uuid: this.selected.monster.system.uuid,
      showTitle: !this.gmView
        ? true
        : this.selected.monster.system.name.revealed
          ? true
          : undefined,
      hideState: this.selected.monster.system.imageState.hideState,
    }).render(true);
  }

  static async setCategoriesLayout(_, button) {
    const settings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-layout",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-layout", {
      ...settings,
      categories: {
        ...settings.categories,
        layout: Number.parseInt(button.dataset.option),
      },
    });
    this.render();
  }

  static async addNpcCategory() {
    if (game.user.isGM && this.npcData.newCategory.text) {
      const categoryKey = `${slugify(this.npcData.newCategory.text)}-${foundry.utils.randomID()}`;

      const categories = this.bestiary.getFlag(
        "pf2e-bestiary-tracking",
        "npcCategories",
      );
      let newCategories = [
        ...categories,
        {
          value: categoryKey,
          name: this.npcData.newCategory.text,
          description: this.npcData.newCategory.description,
          position: categories.length,
          hidden: game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
            .npcCategories,
        },
      ];
      const bestiarySettings = game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-settings",
      );

      switch (bestiarySettings.npc.categorySort) {
        case 1:
          newCategories = newCategories
            .sort((a, b) => alphaSort(a, b, "name"))
            .map((x, index) => ({ ...x, position: index }));
          break;
        case 2:
          newCategories = newCategories
            .sort((a, b) => alphaSort(a, b, "name", true))
            .map((x, index) => ({ ...x, position: index }));
          break;
      }

      await this.bestiary.setFlag(
        "pf2e-bestiary-tracking",
        "npcCategories",
        newCategories,
      );
      this.npcData.newCategory.text = null;
      this.npcData.newCategory.description = null;

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });
      Hooks.callAll(socketEvent.UpdateBestiary, {});
    }
  }

  static async toggleHideNPCCategory(_, button) {
    const categories = this.bestiary.getFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
    );
    const toggleCategory = categories.find(
      (x) => x.value === button.dataset.category,
    );
    toggleCategory.hidden = !toggleCategory.hidden;
    await this.bestiary.setFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
      categories,
    );

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    $(button).toggleClass("fa-eye-slash");
    $(button).toggleClass("fa-eye");
    // Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async addInfluence(_, button) {
    var update = null;
    switch (button.dataset.type) {
      case "discovery":
        update = {
          [`system.npcData.influence.discovery.${foundry.utils.randomID()}`]: {
            dc: 10,
            type: "acrobatics",
            lore: false,
          },
        };
        break;
      case "influenceSkills":
        update = {
          [`system.npcData.influence.influenceSkills.${foundry.utils.randomID()}`]:
            { dc: 10, type: "acrobatics", lore: false, description: "" },
        };
        break;
      case "influence":
        update = {
          [`system.npcData.influence.influence.${foundry.utils.randomID()}`]: {
            points: 1,
            description: "",
          },
        };
        break;
      case "weakness":
        update = {
          [`system.npcData.influence.weaknesses.${foundry.utils.randomID()}`]: {
            description: "",
          },
        };
        break;
      case "resistance":
        update = {
          [`system.npcData.influence.resistances.${foundry.utils.randomID()}`]:
            { description: "" },
        };
        break;
      case "penalty":
        update = {
          [`system.npcData.influence.penalties.${foundry.utils.randomID()}`]: {
            description: "",
          },
        };
        break;
    }

    if (!update) return;
    await this.selected.monster.update(update);

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async increaseInfluence() {
    await this.selected.monster.update({
      "system.npcData.influence.influencePoints":
        this.selected.monster.system.npcData.influence.influencePoints + 1,
    });
    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async decreaseInfluence() {
    await this.selected.monster.update({
      "system.npcData.influence.influencePoints":
        this.selected.monster.system.npcData.influence.influencePoints - 1,
    });
    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async removeProperty(_, button) {
    await this.selected.monster.update({ [button.dataset.path]: null });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static exportEntity() {
    saveDataToFile$1(
      JSON.stringify(this.selected.monster.toObject(), null, 2),
      "text/json",
      `${slugify(this.selected.monster.system.name.value)}.json`,
    );
    this.toggleControls(false);
  }

  static async importEntity() {
    new Promise((resolve, reject) => {
      new ImportDialog(
        "PF2EBestiary.ImportDialog.EntryTitle",
        (jsonObject) => {
          if (!jsonObject || !jsonObject.type) {
            return game.i18n.localize("PF2EBestiary.ImportDialog.FaultyImport");
          }

          if (!getUsedBestiaryTypes().includes(jsonObject.type)) {
            return game.i18n.localize(
              "PF2EBestiary.ImportDialog.UnusedBestiaryType",
            );
          }
          return null;
        },
        resolve,
        reject,
      ).render(true);
    }).then(this.importFromJSONData.bind(this));
    this.toggleControls(false);
  }

  async importFromJSONData(data) {
    await this.bestiary.createEmbeddedDocuments("JournalEntryPage", [data]);

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async transformNPC() {
    await this.toggleIsNPC();
  }

  static async transformCreature() {
    await this.toggleIsNPC();
  }

  static async openDocument(_, button) {
    const document = await fromUuid(button.dataset.uuid);
    await document.sheet.render(true);
  }

  static async removeRecallKnowledgeJournal(event) {
    event.stopPropagation();
    await this.bestiary.unsetFlag(
      "pf2e-bestiary-tracking",
      "recall-knowledge-journal",
    );

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async imageMenu() {
    new Promise((resolve, reject) => {
      new AvatarMenu(this.selected.monster, resolve, reject).render(true);
    }).then(
      async (update) => {
        await this.selected.monster.update(update);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });
        Hooks.callAll(socketEvent.UpdateBestiary, {});
      },
      () => {
        return;
      },
    );
  }

  static async copyEntityLink(event) {
    const bestiaryLink = `@Bestiary[${this.bestiary.id}|${this.selected.monster.system.uuid}]`;
    if (event.altKey) {
      const cls = getDocumentClass("ChatMessage");
      const msg = new cls({
        user: game.user.id,
        content: bestiaryLink,
      });

      cls.create(msg.toObject());
    } else {
      navigator.clipboard.writeText(bestiaryLink).then(() => {
        ui.notifications.info(
          game.i18n.format("PF2EBestiary.Bestiary.Info.BestiaryEntryLink", {
            entity: this.gmView
              ? this.selected.monster.system.name.value
              : this.selected.monster.system.displayedName,
          }),
        );
      });
    }
  }

  static async toggleRecallAttempt(_, button) {
    const oldValue = this.selected.monster.system.recallKnowledge[
      button.dataset.character
    ]?.attempts
      ? this.selected.monster.system.recallKnowledge[button.dataset.character]
          ?.attempts[button.dataset.attempt]
      : null;
    await this.selected.monster.update({
      [`system.recallKnowledge.${button.dataset.character}.attempts.${button.dataset.attempt}`]:
        oldValue
          ? Object.values(recallKnowledgeOutcomes).find(
              (x) =>
                x.order === (recallKnowledgeOutcomes[oldValue].order + 1) % 5,
            ).value
          : recallKnowledgeOutcomes.criticalSuccess.value,
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async resetRecallAttempts(event, button) {
    if (!event.altKey) {
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize(
          "PF2EBestiary.Bestiary.ResetRecallAttemptsTitle",
        ),
        content: game.i18n.format(
          "PF2EBestiary.Bestiary.ResetRecallAttemptsText",
          { character: game.actors.get(button.dataset.character).name },
        ),
        yes: () => true,
        no: () => false,
      });

      if (!confirmed) return;
    }

    const attempts =
      this.selected.monster.system.recallKnowledge[button.dataset.character]
        ?.attempts;
    if (!attempts) return;

    await this.selected.monster.update({
      [`system.recallKnowledge.-=${button.dataset.character}`]: null,
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async displayRecallKnowledgePopup() {}

  async hideTab(event) {
    event.stopPropagation();
    event.preventDefault();

    if (!game.user.isGM) return;

    const tab = event.currentTarget.dataset.tab;
    await this.selected.monster.update({
      [`system.tabStates.${tab}.hidden`]:
        !this.selected.monster.system.tabStates[tab].hidden,
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async updateNPCCategorySort(event) {
    const value = Number.parseInt(event.currentTarget.value);
    const currentCategories = this.bestiary.getFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
    );
    switch (value) {
      case 1:
        await this.bestiary.setFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
          currentCategories
            .sort((a, b) => alphaSort(a, b, "name"))
            .map((category, index) => ({ ...category, position: index })),
        );
        break;
      case 2:
        await this.bestiary.setFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
          currentCategories
            .sort((a, b) => alphaSort(a, b, "name", true))
            .map((category, index) => ({ ...category, position: index })),
        );
        break;
    }

    const current = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-settings",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-settings", {
      ...current,
      npc: {
        ...current.npc,
        categorySort: value,
      },
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async toggleIsNPC() {
    if (!this.selected.monster) return;

    if (this.selected.monster.type === "pf2e-bestiary-tracking.creature") {
      const newEntity = await this.selected.monster.system.transformToNPC();
      this.selected.monster = newEntity;
      this.selected.category = "pf2e-bestiary-tracking.npc";
      this.selected.type = this.selected.monster.system.initialType;
      this.npcData.npcView = true;
      this.npcData.editMode = false;
    } else {
      const newEntity =
        await this.selected.monster.system.transformToCreature();
      if (!newEntity) return;

      this.selected.monster = newEntity;
      this.selected.category = "pf2e-bestiary-tracking.creature";
      this.selected.type = this.selected.monster.system.initialType;
      this.npcData.npcView = false;
      this.npcData.editMode = false;
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async obscureData(event) {
    if (!game.user.isGM || !event.currentTarget.dataset.name) return;

    const setValue = async (value) => {
      if (value) {
        await this.selected.monster.update({
          [`${event.currentTarget.dataset.path}.custom`]: value,
        });

        if (
          event.currentTarget.dataset.path === "system.name" &&
          this.selected.monster.system.name.revealed
        ) {
          await PF2EBestiary.handleTokenNames(this.selected.monster);
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });

        this.render();
      }
    };

    const vagueDescriptions = await game.settings.get(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
    );
    const vagueProperty = event.currentTarget.dataset.vagueProperty;

    if (event.altKey && vagueDescriptions.properties[vagueProperty]) {
      const { vagueDescriptions } = game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-labels",
      );

      const currentValue = foundry.utils.getProperty(
        this.selected.monster,
        event.currentTarget.dataset.path,
      ).category;
      const getRandomValue = (table, short) => {
        const choices = table.range.reduce((acc, x) => {
          const label = ["saves", "attributes"].includes(vagueProperty)
            ? vagueDescriptions.short[x]
            : vagueDescriptions.full[x];
          if (label !== currentValue) {
            acc.push(label);
          }

          return acc;
        }, []);

        return choices[Math.floor(Math.random() * choices.length)];
      };

      switch (vagueProperty) {
        case "saves":
          setValue(getRandomValue(savingThrowPerceptionTable));
          break;
        case "skills":
          setValue(getRandomValue(skillTable));
          break;
        case "attributes":
          setValue(getRandomValue(attributeTable));
          break;
        case "ac":
          setValue(getRandomValue(acTable));
          break;
        case "hp":
          setValue(getRandomValue(hpTable));
          break;
        case "perception":
          setValue(getRandomValue(savingThrowPerceptionTable));
          break;
      }
    } else {
      if (
        vagueDescriptions.settings.misinformationOptions &&
        vagueDescriptions.properties[vagueProperty]
      ) {
        const choices = await getCategoryRange(vagueProperty);
        const content = new foundry.data.fields.StringField({
          label: game.i18n.format(
            "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
            { property: event.currentTarget.dataset.name },
          ),
          choices: choices,
          required: true,
        }).toFormGroup(
          {},
          { name: "misinformation", localize: true },
        ).outerHTML;

        async function callback(_, button) {
          const choice =
            choices[Number.parseInt(button.form.elements.misinformation.value)];
          await setValue(choice);
        }

        await foundry.applications.api.DialogV2.prompt({
          content: content,
          rejectClose: false,
          modal: true,
          ok: { callback: callback },
          window: {
            title: game.i18n.localize(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.Title",
            ),
          },
          position: { width: 400 },
        });
      } else {
        const content = new foundry.data.fields.StringField({
          label: game.i18n.format(
            "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
            { property: event.currentTarget.dataset.name },
          ),
          required: true,
        }).toFormGroup({}, { name: "misinformation" }).outerHTML;

        async function callback(_, button) {
          const choice = button.form.elements.misinformation.value;
          await setValue(choice);
        }

        await foundry.applications.api.DialogV2.prompt({
          content: content,
          rejectClose: false,
          modal: true,
          ok: { callback: callback },
          window: {
            title: game.i18n.localize(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.Title",
            ),
          },
          position: { width: 400 },
        });
      }
    }
  }

  async unObscureData(event) {
    if (!game.user.isGM) return;

    if (event.currentTarget.dataset.fake) {
      const pathSplit = event.currentTarget.dataset.path.split(".");
      var deletePath = pathSplit.slice(0, pathSplit.length - 1).join(".");
      const newValues = foundry.utils.getProperty(
        this.selected.monster,
        deletePath,
      );
      if (Array.isArray(newValues)) {
        await this.selected.monster.update({
          [deletePath]: Object.keys(newValues).reduce((acc, key) => {
            if (key !== pathSplit[pathSplit.length - 1]) {
              acc.push(newValues[key]);
            }

            return acc;
          }, []),
        });
      } else {
        deletePath = pathSplit
          .slice(0, pathSplit.length - 1)
          .join(".")
          .concat(`.-=${pathSplit[pathSplit.length - 1]}`);
        await this.selected.monster.update({ [deletePath]: null });
      }
    } else {
      await this.selected.monster.update({
        [`${event.currentTarget.dataset.path}.custom`]: null,
      });

      if (
        event.currentTarget.dataset.path === "system.name" &&
        this.selected.monster.system.name.revealed
      ) {
        await PF2EBestiary.handleTokenNames(this.selected.monster);
      }
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async updateData(event, element, formData) {
    const { system, ...rest } = foundry.utils.expandObject(formData.object);
    const simpleFields = foundry.utils.flattenObject(rest);

    if (system && this.selected.monster) {
      await this.selected.monster.update({ system: system });
    }

    for (var property in simpleFields) {
      await foundry.utils.setProperty(this, property, simpleFields[property]);
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.callbacks = {
        drop: this._onDrop.bind(this),
      };

      const newHandler = new DragDrop(d);
      newHandler.bind(this.element);

      return newHandler;
    });
  }

  static async addMonster(item, acceptPlayerCharacters, openAfter) {
    const bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );

    // We do not currently refresh already present creatures in the Bestiary.
    if (bestiary.pages.some((x) => x.system.actorBelongs(item))) return null;

    if (item.hasPlayerOwner && !acceptPlayerCharacters) return null;

    const itemRules = {};
    for (var subItem of item.items) {
      if (subItem.type === "effect") {
        itemRules[subItem.id] = subItem.system.rules;
        await subItem.update({ "system.rules": [] });
      }
    }

    var data = null;
    switch (getEntityType(item)) {
      case "creature":
        data = await getCreatureData(item);
        break;
      case "creatureCharacter":
        data = await getCreatureData(item, true);
        break;
      case "character":
        data = await getNPCData(item, true);
        break;
      case "npc":
        data = await getNPCData(item);
        break;
      case "hazard":
        data = getHazardData(item);
        break;
    }

    const pages = await bestiary.createEmbeddedDocuments("JournalEntryPage", [
      data,
    ]);
    for (var key in itemRules) {
      await item.items.get(key).update({ "system.rules": itemRules[key] });
    }

    const doubleClickOpenActivated = game.settings.get(
      "pf2e-bestiary-tracking",
      "doubleClickOpen",
    );
    if (doubleClickOpenActivated && item.ownership.default < 1) {
      await item.update({ "ownership.default": 1 });
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});

    if (openAfter) {
      new PF2EBestiary(pages[0]).render(true);
    }

    return pages[0];
  }

  async _onDragStart(event) {
    const target = event.currentTarget;
    const bookmark = $(target).find(".bookmark")[0];
    if (!bookmark) return;

    event.dataTransfer.setData("text/plain", JSON.stringify(bookmark.dataset));
    event.dataTransfer.setDragImage(bookmark, 60, 0);

    this.dragData.bookmarkActive = true;
  }

  async _onDragOver(event) {
    if (!this.dragData.bookmarkActive) return;

    let self = $(event.target)[0];
    let dropTarget = self.matches(".bookmark-container.draggable")
      ? $(self).find(".bookmark")[0]
      : self.closest(".bookmark");

    if (!dropTarget || dropTarget.classList.contains("drop-hover")) {
      return;
    }

    $(dropTarget).addClass("drop-hover");
    return false;
  }

  async _onDragLeave(event) {
    if (!this.dragData.bookmarkActive) return;

    let self = $(event.target)[0];
    let dropTarget = self.matches(".bookmark-container.draggable")
      ? $(self).find(".bookmark")[0]
      : self.closest(".bookmark");
    $(dropTarget).removeClass("drop-hover");
  }

  async _onDrop(event) {
    if (!game.user.isGM) return;

    const data = TextEditor.getDragEventData(event);
    const dataItem = await fromUuid(data.uuid);

    const items = !dataItem
      ? [data]
      : dataItem.collectionName === "folders"
        ? getAllFolderEntries(dataItem)
        : [dataItem];

    for (var baseItem of items) {
      if (!data.type) {
        this.dragData.bookmarkActive = false;
        let categories = this.bestiary.getFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
        );
        let self = $(event.target)[0];
        let dropTarget = self.matches(".bookmark-container")
          ? self
          : self.closest(".bookmark-container");
        let bookmarkTarget = $(dropTarget).find(".bookmark")[0];
        $(bookmarkTarget).removeClass("drop-hover");

        if (
          !bookmarkTarget ||
          bookmarkTarget.dataset.bookmark === data.bookmark
        )
          return;

        bookmarkTarget = $(dropTarget).find(".bookmark")[0];
        const bookmark = categories.find(
          (x) => x.value === bookmarkTarget.dataset.bookmark,
        );
        const position = bookmark
          ? bookmark.position < Number.parseInt(data.position)
            ? bookmark.position + 1
            : bookmark.position
          : 0;

        if (position === Number.parseInt(data.position)) return;

        const orig = categories.splice(
          categories.indexOf(categories.find((x) => x.value === data.bookmark)),
          1,
        )[0];

        categories = categories.map((x, index) => ({ ...x, position: index }));
        categories.splice(position, 0, orig);

        await this.bestiary.setFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
          categories.map((x, index) => ({ ...x, position: index })),
        );

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
        return;
      }

      if (
        event.currentTarget?.classList?.contains("npc-players-inner-container")
      ) {
        const playerCharacter = game.actors.get(event.currentTarget.id);
        const newDropEvent = new DragEvent("drop", {
          altKey: game.keyboard.isModifierActive("Alt"),
        });
        playerCharacter.sheet._onDropItem(newDropEvent, {
          type: "item",
          data: baseItem,
        });
        event.stopPropagation();
        return;
      }

      if (data.type === "JournalEntry") {
        if (
          event.currentTarget.classList.contains("recall-knowledge-container")
        ) {
          await this.bestiary.setFlag(
            "pf2e-bestiary-tracking",
            "recall-knowledge-journal",
            baseItem.uuid,
          );
          ui.notifications.info(
            game.i18n.localize(
              "PF2EBestiary.Bestiary.Welcome.GMsSection.RecallKnowledgeAttachedNotification",
            ),
          );

          await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: {},
          });

          Hooks.callAll(socketEvent.UpdateBestiary, {});
        }

        const gmEditor = event.target.parentElement.parentElement;
        if (gmEditor.classList.contains("gm-notes")) {
          const dialog = new foundry.applications.api.DialogV2({
            buttons: [
              foundry.utils.mergeObject(
                {
                  action: "ok",
                  label: "Confirm",
                  icon: "fas fa-check",
                  default: true,
                },
                {
                  callback: async (_, button) => {
                    const page = Array.from(baseItem.pages)[
                      Number.parseInt(button.form.elements.page.value)
                    ];
                    await this.selected.monster.update({
                      "system.notes.gm.value": page.text.content,
                    });

                    Hooks.callAll(socketEvent.UpdateBestiary, {});
                  },
                },
              ),
            ],
            content: `
              <div style="display: flex; flex-direction: column; gap:8px;">
                <div>${game.i18n.localize("PF2EBestiary.Bestiary.NPC.GMNotesImportText")}</div>
                ${
                  new foundry.data.fields.StringField({
                    choices: baseItem.pages.map((x) => ({
                      id: x.id,
                      name: x.name,
                    })),
                    label: game.i18n.localize(
                      "PF2EBestiary.Bestiary.NPC.GMNotesPageTitle",
                    ),
                    required: true,
                  }).toFormGroup(
                    {},
                    { name: "page", nameAttr: "id", labelAttr: "name" },
                  ).outerHTML
                }
              </div>
            `,
            rejectClose: false,
            modal: false,
            window: {
              title: game.i18n.localize(
                "PF2EBestiary.Bestiary.NPC.GMNotesImportTitle",
              ),
            },
            position: { width: 400 },
          });

          await dialog.render(true);
        }

        return;
      }

      if (!baseItem || !isValidEntityType(baseItem.type)) {
        ui.notifications.error(
          game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedType"),
        );
        return;
      }

      const item = baseItem.pack
        ? await Actor.implementation.create(baseItem.toObject())
        : baseItem;

      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );
      const existingPage = bestiary.pages.find((x) =>
        x.system.actorBelongs(item),
      );
      if (existingPage) {
        await existingPage.system.refreshData(item);
      } else {
        const itemRules = {};
        for (var subItem of item.items) {
          if (subItem.type === "effect") {
            itemRules[subItem.id] = subItem.system.rules;
            await subItem.update({ "system.rules": [] });
          }
        }

        var pageData = null;
        switch (getEntityType(item)) {
          case "creature":
            pageData = await getCreatureData(item);
            break;
          case "creatureCharacter":
            pageData = await getCreatureData(item, true);
            break;
          case "character":
            pageData = await getNPCData(item, true);
            break;
          case "npc":
            pageData = await getNPCData(item);
            break;
          case "hazard":
            pageData = getHazardData(item);
            break;
        }

        await bestiary.createEmbeddedDocuments("JournalEntryPage", [pageData]);
        for (var key in itemRules) {
          await item.items.get(key).update({ "system.rules": itemRules[key] });
        }
      }

      const doubleClickOpenActivated = game.settings.get(
        "pf2e-bestiary-tracking",
        "doubleClickOpen",
      );
      if (doubleClickOpenActivated) {
        const ownership =
          item.ownership.default > 1 ? item.ownership.default : 1;
        await item.update({ "ownership.default": ownership });
      }
    }
    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async maximize() {
    super.maximize();
    this.render();
  }

  onBestiaryUpdate = async () => {
    if (this.actorSheetApp) return;
    this.bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );
    const existingEntity = this.selected.monster
      ? (this.bestiary.pages.get(this.selected.monster.id) ??
        this.bestiary.pages.find(
          (x) => x.system.uuid === this.selected.monster.system.uuid,
        ) ??
        null)
      : null;
    if (!existingEntity) this.selected.monster = null;

    const initialActiveType = this.selected.monster?.system?.initialActiveType;
    const unknown =
      initialActiveType &&
      (initialActiveType === "unknown" || initialActiveType === "unaffiliated");
    if (
      !game.user.isGM &&
      this.selected.monster &&
      this.selected.type !== "combat" &&
      (unknown ||
        this.selected.type === "unknown" ||
        this.selected.type === "unaffiliated")
    ) {
      this.selected.type = initialActiveType;
    }

    const saveButton = $(this.element).find(
      '.prosemirror[collaborate="true"] *[data-action="save"]',
    );
    if (saveButton.length === 0 && !this.minimized) {
      this.render(true);
    }
  };

  onDeleteCombat = () => {
    if (this.selected.type === "combat") {
      this.selected.type = null;
      this.selected.monster = null;
    }

    this.render(true);
  };

  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: () => game.user.isGM,
        drop: () => game.user.isGM,
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        dragleave: this._onDragLeave.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new ExpandedDragDrop(d);
    });
  }

  switchPlayerMode = (e) => {
    if (!game.user.isGM) return;

    if (
      game.keybindings
        .get("pf2e-bestiary-tracking", "view-as-player")
        .some((binding) => binding.key === e.code)
    ) {
      this.gmView = false;
      this.render();
    }
  };

  resetPlayerMode = (e) => {
    if (!game.user.isGM) return;

    if (
      game.keybindings
        .get("pf2e-bestiary-tracking", "view-as-player")
        .some((binding) => binding.key === e.code)
    ) {
      this.gmView = true;
      this.render();
    }
  };

  close = async (options) => {
    Hooks.off(socketEvent.UpdateBestiary, this.onBestiaryUpdate);
    Hooks.off("deleteCombat", this.onDeleteCombat);
    document.removeEventListener("keydown", this.switchPlayerMode);
    document.removeEventListener("keyup", this.resetPlayerMode);
    await this.removeActorSheet();

    return super.close(options);
  };
}

class RegisterHandlebarsHelpers {
  static registerHelpers() {
    Handlebars.registerHelper({
      PF2EBTNrKeys: this.nrKeys,
      PF2EBTMonsterValue: this.monsterValue,
      PF2EBTSlice: this.slice,
      PF2EBTToggleContainer: this.toggleContainer,
      PF2EBTToggleContainerOverride: this.toggleContainerOverride,
      PF2EBTEach: this.each,
      PF2EBTFilter: this.filter,
      PF2EBTImageState: this.imageState,
      PF2EBTTertiary: this.tertiary,
      PF2EBTCaptialize: this.capitalize,
      PF2EBTSub: this.sub,
      PF2EBTEven: this.even,
      PF2EBTTest: this.test,
    });
  }

  static test(a) {
    console.log(a);
    return "a";
  }

  static nrKeys(obj, prop, context) {
    return obj
      ? prop && context
        ? Object.keys(obj).filter((x) => obj[x][prop]).length
        : Object.keys(obj).length
      : 0;
  }

  static monsterValue(gmView, prop, flag, ignoreLabel, context) {
    return (
      game.i18n.localize(prop.custom) ??
      (flag &&
      (!gmView ||
        !game.settings.get("pf2e-bestiary-tracking", "vague-descriptions")
          .settings.gmNumeric) &&
      prop.category
        ? game.i18n.localize(prop.category)
        : ignoreLabel && context
          ? prop.value
          : (game.i18n.localize(prop.label) ?? prop.value))
    );
  }

  static slice(value, length) {
    return value.slice(0, length);
  }

  static toggleContainer(gmView, property) {
    var containerClass = " data-container";

    if (property.revealed || !gmView)
      containerClass = containerClass.concat(" revealed ");
    if (gmView) {
      containerClass = containerClass.concat(" toggle-container");
      if (property.custom || property.fake)
        containerClass = containerClass.concat(" misinformation");
    }

    return containerClass;
  }

  static toggleContainerOverride(gmView, contrastRevealedState, property) {
    if (!gmView || !contrastRevealedState.enabled) return "";

    if (property.revealed)
      return `background: ${contrastRevealedState.revealed}`;
    else return `background: ${contrastRevealedState.hidden}`;
  }

  static each(context, options) {
    var ret = "";
    const keys = Object.keys(context);
    for (var i = 0; i < keys.length; i++) {
      ret =
        ret +
        options.fn({
          ...context[keys[i]],
          key: keys[i],
          index: i,
          length: keys.length,
        });
    }

    return ret;
  }

  static filter(prop, fallback, leftMargin, context, use, op) {
    const options = op ?? use;
    var ret = "";
    var keys = Object.keys(context);

    if (op && !use) {
      for (var i = 0; i < keys.length; i++) {
        ret =
          ret +
          options.fn({
            ...context[keys[i]],
            key: keys[i],
            last: i === keys.length - 1,
            index: i,
            length: keys.length,
          });
      }

      return ret;
    }

    var filteredContext = {};
    for (var i = 0; i < keys.length; i++) {
      if (!prop || foundry.utils.getProperty(context[keys[i]], prop)) {
        filteredContext[keys[i]] = context[keys[i]];
      }
    }

    keys = Object.keys(filteredContext);
    if (keys.length === 0)
      return `<div style="margin-left: ${leftMargin}px;">${fallback}</div>`;

    for (var i = 0; i < keys.length; i++) {
      ret =
        ret +
        options.fn({
          ...context[keys[i]],
          key: keys[i],
          last: i === keys.length - 1,
          index: i,
          length: keys.length,
        });
    }

    return ret;
  }

  static imageState(state) {
    switch (state) {
      case 1:
        return "outline";
      case 3:
        return "sepia";
      default:
        return "";
    }
  }

  static tertiary(a, b) {
    return a ?? b;
  }

  static capitalize(text) {
    return text.capitalize();
  }

  static sub(a, b) {
    return a - b;
  }

  static even(a) {
    return a % 2;
  }
}

// SPDX-License-Identifier: MIT
// Copyright © 2021 fvtt-lib-wrapper Rui Pinheiro


// A shim for the libWrapper library
let libWrapper = undefined;
const TGT_SPLIT_RE = new RegExp(
  "([^.[]+|\\[('([^'\\\\]|\\\\.)+?'|\"([^\"\\\\]|\\\\.)+?\")\\])",
  "g",
);
const TGT_CLEANUP_RE = new RegExp("(^\\['|'\\]$|^\\[\"|\"\\]$)", "g");

// Main shim code
Hooks.once("init", () => {
  // Check if the real module is already loaded - if so, use it
  if (globalThis.libWrapper && !(globalThis.libWrapper.is_fallback ?? true)) {
    libWrapper = globalThis.libWrapper;
    return;
  }

  // Fallback implementation
  libWrapper = class {
    static get is_fallback() {
      return true;
    }

    static get WRAPPER() {
      return "WRAPPER";
    }
    static get MIXED() {
      return "MIXED";
    }
    static get OVERRIDE() {
      return "OVERRIDE";
    }
    static get LISTENER() {
      return "LISTENER";
    }

    static register(
      package_id,
      target,
      fn,
      type = "MIXED",
      { chain = undefined, bind = [] } = {},
    ) {
      const is_setter = target.endsWith("#set");
      target = !is_setter ? target : target.slice(0, -4);
      const split = target
        .match(TGT_SPLIT_RE)
        .map((x) => x.replace(/\\(.)/g, "$1").replace(TGT_CLEANUP_RE, ""));
      const root_nm = split.splice(0, 1)[0];

      let obj, fn_name;
      if (split.length == 0) {
        obj = globalThis;
        fn_name = root_nm;
      } else {
        const _eval = eval;
        fn_name = split.pop();
        obj = split.reduce(
          (x, y) => x[y],
          globalThis[root_nm] ?? _eval(root_nm),
        );
      }

      let iObj = obj;
      let descriptor = null;
      while (iObj) {
        descriptor = Object.getOwnPropertyDescriptor(iObj, fn_name);
        if (descriptor) break;
        iObj = Object.getPrototypeOf(iObj);
      }
      if (!descriptor || descriptor?.configurable === false)
        throw new Error(
          `libWrapper Shim: '${target}' does not exist, could not be found, or has a non-configurable descriptor.`,
        );

      let original = null;
      const is_override =
        type == 3 || type.toUpperCase?.() == "OVERRIDE" || type == 3;
      const is_listener =
        type == 4 || type.toUpperCase?.() == "LISTENER" || type == 4;
      const wrapper = is_listener
        ? function (...args) {
            fn.call(this, ...bind, ...args);
            return original.call(this, ...args);
          }
        : (chain ?? !is_override)
          ? function (...args) {
              return fn.call(this, original.bind(this), ...bind, ...args);
            }
          : function (...args) {
              return fn.call(this, ...bind, ...args);
            };

      if (!is_setter) {
        if (descriptor.value) {
          original = descriptor.value;
          descriptor.value = wrapper;
        } else {
          original = descriptor.get;
          descriptor.get = wrapper;
        }
      } else {
        if (!descriptor.set)
          throw new Error(
            `libWrapper Shim: '${target}' does not have a setter`,
          );
        original = descriptor.set;
        descriptor.set = wrapper;
      }

      descriptor.configurable = true;
      Object.defineProperty(obj, fn_name, descriptor);
    }
  };
});

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
  const userTheme = game.user.getFlag(
    "pf2e-bestiary-tracking",
    "bestiary-theme",
  );
  if (userTheme) {
    game.settings.set("pf2e-bestiary-tracking", "bestiary-theme", userTheme);
  }

  const selectedTheme = game.settings.get(
    "pf2e-bestiary-tracking",
    "bestiary-theme",
  );
  const theme =
    selectedTheme === "default"
      ? game.settings.get("pf2e-bestiary-tracking", "bestiary-default-theme")
      : selectedTheme;
  setupTheme(extendedBestiaryThemes()[theme].props);

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

        var actorIsItemPile =
          game.modules.get("item-piles")?.active &&
          args[0].currentTarget.actor.flags["item-piles"] &&
          args[0].currentTarget.actor.flags["item-piles"].data?.enabled;
        if (actorIsItemPile && !args[0].altKey) {
          return wrapped(...args);
        }

        const bestiary = game.journal.get(
          game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
        );
        const page = bestiary.pages.find((page) =>
          page.system.actorBelongs(baseActor),
        );

        if (!page || (!game.user.isGM && page.system.hidden)) {
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
  const moduleSubTypes = [
    "pf2e-bestiary-tracking.creature",
    "pf2e-bestiary-tracking.npc",
    "pf2e-bestiary-tracking.hazard",
  ];
  const options = $(html).find("option");
  for (var option of options) {
    if (moduleSubTypes.includes(option.value)) {
      $(option).remove();
    }
  }
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
      const page = bestiary.pages.find((x) => x.system.actorBelongs(actor));
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
    const page = bestiary.pages.find((x) =>
      x.system.actorBelongs(token.baseActor),
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
    const base = message.flags.pf2e.context ?? message.flags.pf2e.origin;
    if (base?.type && shouldAutomaticReveal(base.type)) {
      updateBestiaryData(message);
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
      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );

      return Boolean(
        bestiary.pages.some((x) =>
          x.system.actorBelongs({
            uuid: `Actor.${message.speaker.actor}`,
            name: message.speaker.alias,
          }),
        ),
      );
    },
    callback: async (li) => {
      const message = game.messages.get(li.data().messageId);
      updateBestiaryData(message);
    },
  });
});

const updateBestiaryData = async (message) => {
  const bestiary = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );

  var page = bestiary.pages.find((x) =>
    x.system.actorBelongs({
      uuid: `Actor.${message.speaker.actor}`,
      name: message.speaker.alias,
    }),
  );
  if (!page) return;

  const base = message.flags.pf2e.context ?? message.flags.pf2e.origin;
  const options = base.rollOptions ?? base.options;
  var update = null;
  let id = null;
  if (message.flags.pf2e.origin?.uuid) {
    const uuidSplit = message.flags.pf2e.origin.uuid.split(".");
    id = uuidSplit[uuidSplit.length - 1];
  } else if (message.flags.pf2e?.context?.identifier) {
    id = message.flags.pf2e.context.identifier.split(".")[0];
  } else {
    id = message.flags.pf2e.modifierName ?? null;
  }

  if (id) {
    switch (base.type) {
      case "attack-roll":
        if (page.system.attacks[id])
          update = { [`system.attacks.${id}.revealed`]: true };
        break;
      case "action":
        const isAction = !options.some(
          (x) => x === "origin:item:action:type:passive",
        );
        if (isAction && page.system.actions[id])
          update = { [`system.actions.${id}.revealed`]: true };
        else if (page.system.passives[id])
          update = { [`system.passives.${id}.revealed`]: true };
        break;
      case "spell":
      case "spell-cast":
        const isCantrip = options.some((x) => x === "cantrip");
        const entry = message.flags.pf2e.casting.id;
        const spellLevel = isCantrip
          ? "Cantrips"
          : getBestiarySpellLevel(
              page.system.spells.entries[entry],
              valueFromRollOption(options, "item:level"),
              id,
            );
        update = {
          system: {
            spells: {
              [`entries.${entry}`]: {
                revealed: true,
                [`levels.${spellLevel}.spells.${id}.revealed`]: true,
              },
            },
          },
        };
        break;
      case "skill-check":
        update = {
          [`system.skills.${id}.revealed`]: true,
        };
        break;
      case "saving-throw":
        update = {
          [`system.saves.${id}.revealed`]: true,
        };
        break;
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
};

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
          .pages.find((page) => page.system.actorBelongs(actor)),
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

Hooks.on("getActorDirectoryFolderContext", (folder, buttons) => {
  buttons.push({
    name: game.i18n.localize("PF2EBestiary.Interactivity.RegisterInBestiary"),
    icon: '<i class="fa-solid fa-spaghetti-monster-flying"></i>',
    condition: (li) => {
      if (!game.user.isGM) return false;

      const folder = game.folders.get(li[0].parentElement.dataset.folderId);
      const bestiaryEntries = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      ).pages;
      const validActors = getAllFolderEntries(folder).reduce((acc, actor) => {
        if (!actor || !isValidEntityType(actor.type) || actor.hasPlayerOwner)
          return acc;

        return (
          acc ||
          !Boolean(
            bestiaryEntries.find((page) => page.system.actorBelongs(actor)),
          )
        );
      }, false);

      return validActors;
    },
    callback: async (li) => {
      const folderEntries = getAllFolderEntries(
        game.folders.get(li[0].parentElement.dataset.folderId),
      );
      const added = [];
      const exists = [];

      for (var actor of folderEntries) {
        if (!actor || !isValidEntityType(actor.type) || actor.hasPlayerOwner)
          continue;

        const successfull = await PF2EBestiary.addMonster(actor);
        if (successfull) {
          added.push(actor.name);
        } else {
          exists.push(actor.name);
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
    (x) =>
      x.system.uuid === app.options.uuid ||
      x.system.actorState.actorDuplicates.includes(app.options.uuid),
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

Hooks.on("updateChatMessage", async (message, { flags }) => {
  const { automaticReveal } = game.settings.get(
    "pf2e-bestiary-tracking",
    "chat-message-handling",
  );
  const appliedDamage = flags
    ? flags["pf2e-toolbelt"]?.targetHelper?.applied
    : null;
  if (appliedDamage && automaticReveal.iwr) {
    let damageTypes =
      message.rolls && message.rolls.length > 0
        ? Array.from(
            new Set(
              message.rolls.flatMap((roll) =>
                roll.instances.map((x) => x.type),
              ),
            ),
          )
        : [];

    for (var tokenId of Object.keys(appliedDamage)) {
      const token = canvas.scene.tokens.get(tokenId);
      await updateIWR(token, damageTypes);
    }
  }
});

Hooks.on("renderChatMessage", (message, htmlElements) => {
  const { automaticReveal } = game.settings.get(
    "pf2e-bestiary-tracking",
    "chat-message-handling",
  );
  const isDamageRoll = message.flags.pf2e?.context?.type === "damage-roll";
  for (var element of htmlElements) {
    const buttons = $(element).find(".pf2e-bestiary-link-button");
    for (var button of buttons) {
      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );
      const page = bestiary.pages.get(button.dataset.page);
      button.onclick = () => new PF2EBestiary(page).render(true);
    }

    if (isDamageRoll && automaticReveal.iwr) {
      const updateIWRFunc = async () => {
        const targets = canvas.tokens.controlled;
        if (targets.length === 0) return;

        let damageTypes =
          message.rolls && message.rolls.length > 0
            ? Array.from(
                new Set(
                  message.rolls.flatMap((roll) =>
                    roll.instances.map((x) => x.type),
                  ),
                ),
              )
            : [];

        for (var target of targets) {
          await updateIWR(target, damageTypes);
        }
      };

      const damageApplicationButtons = $(element).find(".damage-application");
      const damageButton = $(damageApplicationButtons).find(
        '[data-action="apply-damage"]',
      );
      if (damageButton && damageButton[0])
        damageButton[0].onclick = updateIWRFunc;
      const halfDamageButton = $(damageApplicationButtons).find(
        '[data-action="half-damage"]',
      );
      if (halfDamageButton && halfDamageButton[0])
        halfDamageButton[0].onclick = updateIWRFunc;
      const criticalDamageButton = $(damageApplicationButtons).find(
        '[data-action="double-damage"]',
      );
      if (criticalDamageButton && criticalDamageButton[0])
        criticalDamageButton[0].onclick = updateIWRFunc;
    }
  }
});

const updateIWR = async (target, damageTypes) => {
  const bestiary = game.journal.get(
    game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
  );
  const actor = target.baseActor ??
    target.document?.baseActor ?? {
      uuid: null,
      name: target.actor.name ?? target.name,
    };

  if (!bestiary || !actor) return;

  var page = bestiary.pages.find((x) => x.system.actorBelongs(actor));
  if (page) {
    var update = ["immunities", "resistances", "weaknesses"].reduce(
      (acc, prop) => {
        const partUpdate = Object.keys(page.system[prop]).reduce((acc, key) => {
          if (damageTypes.includes(page.system[prop][key].type)) {
            if (!acc) acc = {};
            acc[key] = { revealed: true };
          }

          return acc;
        }, null);
        if (partUpdate) {
          if (!acc) acc = { system: {} };
          acc.system[prop] = partUpdate;
        }

        return acc;
      },
      null,
    );

    if (update) {
      await page.update(update);
      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });

      Hooks.callAll(socketEvent.UpdateBestiary, {});
    }
  }
};

Hooks.on("updateCombatant", async (combatant, changes) => {
  if (changes.hidden === false) {
    const page = game.journal
      .get(game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"))
      .pages.find((x) => x.system.actorBelongs(combatant.token.baseActor));
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
          const item = options.object.token?.baseActor ?? options.object;
          const bestiary = game.journal.get(
            game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
          );
          const page = bestiary?.pages?.find((x) =>
            x.system.actorBelongs(item),
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
                  callback: async () => {
                    const usedItem = item.pack
                      ? await Actor.implementation.create(item.toObject())
                      : item;

                    PF2EBestiary.addMonster(
                      usedItem.token?.baseActor ?? usedItem,
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

Hooks.on("renderActorSheet", (sheet) => {
  const bestiaryApp = foundry.applications.instances.get(
    "pf2e-bestiary-tracking-bestiary",
  );
  if (bestiaryApp && bestiaryApp.actorSheetApp?.appId === sheet.appId) {
    const actorSheetContainer = $(bestiaryApp.element).find(
      ".bestiary-actor-sheet",
    );
    $(sheet.element[0])
      .children()
      .each((_, child) => {
        if (child.classList.contains("window-content")) {
          const tagify = child.querySelector("tagify-tags");
          if (tagify) {
            const input = $(tagify).find("> input");
            input.__tagify?.destroy();
            $(input).remove();
            $(tagify).remove();
          }
        } else if (!child.classList.contains("window-header")) {
          $(child).remove();
        }
      });
    $(actorSheetContainer).append(sheet.element[0]);
    $(actorSheetContainer).addClass("expanded");
    $(bestiaryApp.element).find(".monster-container").addClass("closed");
  }
});

Hooks.on(socketEvent.ResetBestiaryTheme, () => {
  const selectedTheme = game.settings.get(
    "pf2e-bestiary-tracking",
    "bestiary-theme",
  );
  const theme =
    selectedTheme === "default"
      ? game.settings.get("pf2e-bestiary-tracking", "bestiary-default-theme")
      : selectedTheme;
  const resetTheme = extendedBestiaryThemes()[theme];
  setupTheme(
    resetTheme ? resetTheme.props : extendedBestiaryThemes()["coreLight"].props,
  );
});
//# sourceMappingURL=BestiaryTracking.js.map
