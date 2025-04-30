export const standardCreatureTypes = () =>
  Object.keys(CONFIG.PF2E.creatureTypes).map((type) => ({
    value: type,
    name: CONFIG.PF2E.creatureTypes[type],
    values: [],
  }));

export const dispositions = {
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

export const recallKnowledgeOutcomes = {
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

export const defaultRevealing = {
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

export const imageHideStates = {
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

export const imageSettings = {
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

export const toBestiaryOptions = {
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

export const npcCategorySortOptions = {
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
