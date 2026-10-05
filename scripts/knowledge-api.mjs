const MODULE_ID = "pf2e-bestiary-tracking";
const PAGE_TYPES = new Set(
  ["creature", "npc", "hazard"].map((type) => `${MODULE_ID}.${type}`),
);

export function createKnowledgeAPI(game) {
  const setting = (key) => game.settings.get(MODULE_ID, key);
  const localize = (value) =>
    typeof value === "string" ? game.i18n.localize(value) : value;
  const entries = (value) => Object.entries(value ?? {});

  function resolveActor(target) {
    if (typeof target === "string") {
      const worldActor = game.actors?.get(target.replace(/^Actor\./, ""));
      if (worldActor) return worldActor;
      try {
        target = globalThis.fromUuidSync?.(target);
      } catch {
        return null;
      }
    }
    const document = target?.document ?? target;
    return (
      document?.baseActor ??
      document?.actor?.token?.baseActor ??
      document?.actor ??
      document?.token?.baseActor ??
      document
    );
  }

  function getKnowledge(target) {
    const actor = resolveActor(target);
    if (!actor?.uuid) return null;
    const journal = game.journal.get(setting("bestiary-tracking"));
    if (!journal) return null;
    const pages = journal.pages.filter((page) => PAGE_TYPES.has(page.type));
    const page =
      pages.find((page) => page.system.uuid === actor.uuid) ??
      pages.find((page) =>
        page.system.actorState?.actorDuplicates?.includes(actor.uuid),
      ) ??
      (setting("sameNameDuplicates")
        ? pages.find((page) => page.system.name?.value === actor.name)
        : null);
    if (!page || page.system.hidden) return null;
    const system = page.system;
    const vague = setting("vague-descriptions")?.properties ?? {};
    const detailed = setting("detailed-information-toggles") ?? {};

    function fact(field, property, visible = field?.revealed === true) {
      if (!field || !visible) return null;
      if (field.custom) return { display: localize(field.custom) };
      if (vague[property] && field.category)
        return { display: localize(field.category) };
      const value = field.value ?? field.mod;
      if (value == null) return null;
      return { value, display: localize(value) };
    }
    function facts(fields, property) {
      return Object.fromEntries(
        entries(fields).flatMap(([key, field]) => {
          const known = fact(field, property);
          return known ? [[key, known]] : [];
        }),
      );
    }
    function types(fields, requireRevealed = true) {
      return entries(fields)
        .filter(([, field]) => !requireRevealed || field.revealed === true)
        .map(([, field]) => field.type ?? field.value)
        .filter((value) => value != null);
    }
    function iwr(property) {
      return entries(system[property])
        .filter(([, field]) => field.revealed === true)
        .map(([, field]) => {
          if (field.empty) return { empty: true };
          const result = { type: field.type };
          if (field.customLabel) result.display = localize(field.customLabel);
          const magnitude = fact(
            field,
            property,
            !detailed.iwr || field.valueRevealed === true,
          );
          if (magnitude) Object.assign(result, magnitude);
          result.exceptions = types(
            field.exceptions,
            detailed.exceptionsDouble === true,
          );
          if (property === "resistances")
            result.doubleVs = types(
              field.doubleVs,
              detailed.exceptionsDouble === true,
            );
          return result;
        });
    }
    function abilities(property) {
      return entries(system[property])
        .filter(([, field]) => field.revealed === true)
        .map(([, field]) => {
          if (field.empty) return { empty: true };
          const result = {
            name: localize(field.label),
            actions: field.actions,
            traits: types(field.traits, detailed.abilityTraits === true),
          };
          if (!setting("hide-ability-descriptions"))
            result.description = field.description;
          return result;
        });
    }
    const attacks = entries(system.attacks)
      .filter(([, field]) => field.revealed === true)
      .map(([, field]) => {
        if (field.empty) return { empty: true };
        const result = {
          name: localize(field.label),
          isMelee: field.isMelee,
          traits: types(field.traits, detailed.attackTraits === true),
        };
        if (field.damageStatsRevealed === true) {
          result.modifier = fact(
            { value: field.totalModifier, category: field.category },
            "attacks",
            true,
          );
          result.damage = entries(field.damageInstances).map(
            ([, instance]) => ({
              amount: fact(instance.damage, "damage", true),
              ...(instance.damageType?.revealed === true ||
              !detailed.damageTypes
                ? { type: instance.damageType?.value }
                : {}),
            }),
          );
        }
        return result;
      });

    const spells = system.spells?.fake
      ? []
      : entries(system.spells?.entries)
          .filter(([, entry]) => entry.revealed === true)
          .map(([, entry]) => ({
            tradition: entry.tradition,
            category: entry.category,
            dc: fact(entry.dc, "spells"),
            attack: fact(entry.attack, "spells"),
            spells: entries(entry.levels).flatMap(([, level]) =>
              entries(level.spells)
                .filter(([, spell]) => spell.revealed === true)
                .map(([, spell]) => ({
                  name: localize(spell.label),
                  rank: level.value,
                  actions: spell.actions,
                  range: spell.range,
                  description: spell.description?.value,
                })),
            ),
          }));

    return JSON.parse(
      JSON.stringify({
        version: 1,
        scope: "party",
        pageUuid: page.uuid,
        type: page.type.split(".").at(-1),
        name: fact(system.name),
        level: fact(system.level, "level"),
        ac: fact(system.ac, "ac"),
        hp: fact(system.hp, "hp"),
        hardness: fact(system.hardness, "hardness"),
        saves: facts(system.saves, "saves"),
        perception: fact(system.senses?.perception, "perception"),
        skills: facts(system.skills, "skills"),
        attributes: facts(system.abilities, "attributes"),
        speeds: facts(system.speeds?.values, "speed"),
        traits: types(system.traits),
        immunities: iwr("immunities"),
        weaknesses: iwr("weaknesses"),
        resistances: iwr("resistances"),
        attacks,
        actions: abilities("actions"),
        passives: abilities("passives"),
        spells,
      }),
    );
  }

  return Object.freeze({ version: 1, getKnowledge });
}

export function registerKnowledgeAPI(game) {
  const module = game.modules.get(MODULE_ID);
  module.api = Object.freeze({ ...module.api, ...createKnowledgeAPI(game) });
}
