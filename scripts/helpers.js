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

export const getBaseActor = (actor) => {
  return actor.token
    ? actor.token.document
      ? actor.token.document.baseActor
      : actor.token.baseActor
    : actor;
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

  const isNPC =
    !usedSections.creature ||
    (usedSections.npc &&
      (npcRegistration === 0
        ? data.system.traits.rarity === "unique"
        : Object.values(data.system.traits.value).find((x) =>
            x.value ? x.value === "npc" : x === "npc",
          )));

  return isNPC ? "npc" : "creature";
};

export const getSpellLevel = (spell, creatureLevel) => {
  return spell.system.traits.value.includes("cantrip")
    ? "Cantrips"
    : (spell.system.location.heightenedLevel ?? spell.system.cast.focusPoints)
      ? Math.ceil(creatureLevel / 2)
      : spell.system.level.value;
};

export const chunkArray = (arr, size) => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );
};

export const alphaSort = (a, b, prop) => {
  if (prop) {
    if (a[prop] < b[prop]) return -1;
    if (a[prop] > b[prop]) return 1;
    else return 0;
  }

  if (a < b) return -1;
  if (a > b) return 1;
  else return 0;
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
