import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  createKnowledgeAPI,
  registerKnowledgeAPI,
} from "../scripts/knowledge-api.mjs";

function fixture() {
  const actor = { uuid: "Actor.goblin", name: "Goblin" };
  const system = {
    uuid: actor.uuid,
    hidden: false,
    actorState: { actorDuplicates: ["Actor.copy"] },
    name: { value: "Goblin", revealed: false },
    ac: { value: 18, revealed: true },
    hp: { value: 99, revealed: false },
    saves: {
      fortitude: { value: 7, revealed: true },
      will: { value: 3, revealed: false },
    },
    abilities: { str: { mod: 2, revealed: true } },
    traits: {
      goblin: { value: "goblin", revealed: true },
      secret: { value: "secret", revealed: false },
    },
    weaknesses: {
      "fire except secret-material": {
        revealed: true,
        type: "fire",
        value: 5,
        valueRevealed: false,
        exceptions: { secret: { type: "secret-material", revealed: false } },
      },
    },
    actions: {
      reaction: {
        label: "Reactive Strike",
        revealed: true,
        description: "Public text",
        rules: { secret: true },
        traits: { attack: { value: "attack", revealed: false } },
      },
    },
    attacks: {
      sword: {
        revealed: true,
        label: "Sword",
        totalModifier: 12,
        damageStatsRevealed: false,
        damageInstances: {
          main: {
            damage: { value: "2d6" },
            damageType: { value: "slashing", revealed: false },
          },
        },
      },
    },
    spells: {
      entries: {
        caster: {
          revealed: true,
          tradition: "arcane",
          dc: { revealed: false, value: 25 },
          attack: { revealed: true, value: 15 },
          levels: {
            one: {
              value: "1",
              spells: {
                public: {
                  revealed: true,
                  label: "Public spell",
                  description: { value: "Public", gm: "GM secret" },
                },
                secret: { revealed: false, label: "Secret spell" },
              },
            },
          },
        },
      },
    },
  };
  const page = {
    uuid: "JournalEntry.book.JournalEntryPage.goblin",
    type: "pf2e-bestiary-tracking.creature",
    system,
  };
  const settings = {
    "bestiary-tracking": "book",
    sameNameDuplicates: false,
    "vague-descriptions": { properties: {} },
    "detailed-information-toggles": {
      iwr: true,
      exceptionsDouble: true,
      abilityTraits: true,
      damageTypes: true,
    },
    "hide-ability-descriptions": false,
  };
  const journal = { pages: [page] };
  const module = { macros: { existing: true }, api: { existing: true } };
  const game = {
    user: { isGM: false },
    settings: { get: (_id, key) => settings[key] },
    journal: new Map([["book", journal]]),
    actors: new Map([["goblin", actor]]),
    modules: new Map([["pf2e-bestiary-tracking", module]]),
    i18n: { localize: (value) => value },
  };
  return {
    actor,
    system,
    page,
    settings,
    journal,
    module,
    game,
    api: createKnowledgeAPI(game),
  };
}

test("revealed knowledge, hidden values, and GM behavior", () => {
  const { api, actor, game } = fixture();
  const known = api.getKnowledge(actor);
  assert.equal(known.name, null);
  assert.equal(known.hp, null);
  assert.equal(known.ac.value, 18);
  assert.deepEqual(known.saves, { fortitude: { value: 7, display: 7 } });
  assert.equal(known.attributes.str.value, 2);
  assert.deepEqual(known.traits, ["goblin"]);
  game.user.isGM = true;
  assert.deepEqual(api.getKnowledge(actor), known);
  assert.ok(!JSON.stringify(known).includes("secret"));
});

test("hidden entries, absent journal, missing actors, unrelated pages", () => {
  const { api, actor, system, journal, game } = fixture();
  system.hidden = true;
  assert.equal(api.getKnowledge(actor), null);
  system.hidden = false;
  journal.pages[0].type = "text";
  assert.equal(api.getKnowledge(actor), null);
  assert.equal(api.getKnowledge(null), null);
  assert.equal(api.getKnowledge("missing"), null);
  game.journal.clear();
  assert.equal(api.getKnowledge(actor), null);
});

test("Actor, Token, TokenDocument, synthetic Actor, ID, UUID, duplicate resolution", () => {
  const { api, actor } = fixture();
  const expected = api.getKnowledge(actor);
  for (const target of [
    "goblin",
    actor.uuid,
    { actor, baseActor: actor },
    { document: { baseActor: actor } },
    { uuid: "Scene.s.Token.t.Actor.goblin", token: { baseActor: actor } },
    { uuid: "Actor.copy" },
  ])
    assert.deepEqual(api.getKnowledge(target), expected);
});

test("exact identity wins over configured same-name grouping", () => {
  const { api, actor, journal, settings, page } = fixture();
  settings.sameNameDuplicates = true;
  journal.pages.unshift({
    ...page,
    uuid: "other",
    system: { ...page.system, uuid: "Actor.other" },
  });
  assert.equal(api.getKnowledge(actor).pageUuid, page.uuid);
  assert.equal(
    api.getKnowledge({ uuid: "Actor.new", name: actor.name }).pageUuid,
    "other",
  );
  settings.sameNameDuplicates = false;
  assert.equal(api.getKnowledge({ uuid: "Actor.new", name: actor.name }), null);
});

test("custom and vague fields expose display without real numeric value", () => {
  const { api, actor, system, settings } = fixture();
  system.ac.custom = "Very tough";
  assert.deepEqual(api.getKnowledge(actor).ac, { display: "Very tough" });
  delete system.ac.custom;
  system.ac.category = "high";
  settings["vague-descriptions"].properties.ac = true;
  assert.deepEqual(api.getKnowledge(actor).ac, { display: "high" });
});

test("detailed IWR values and exception toggles", () => {
  const { api, actor, system, settings } = fixture();
  assert.deepEqual(api.getKnowledge(actor).weaknesses, [
    { type: "fire", exceptions: [] },
  ]);
  const field = Object.values(system.weaknesses)[0];
  field.valueRevealed = true;
  assert.equal(api.getKnowledge(actor).weaknesses[0].value, 5);
  settings["detailed-information-toggles"].exceptionsDouble = false;
  assert.deepEqual(api.getKnowledge(actor).weaknesses[0].exceptions, [
    "secret-material",
  ]);
  field.category = "low";
  settings["vague-descriptions"].properties.weaknesses = true;
  assert.equal(api.getKnowledge(actor).weaknesses[0].value, undefined);
});

test("attacks and abilities exclude hidden subfields and raw rules", () => {
  const { api, actor, system, settings } = fixture();
  assert.equal(api.getKnowledge(actor).attacks[0].modifier, undefined);
  assert.deepEqual(api.getKnowledge(actor).actions[0].traits, []);
  system.attacks.sword.damageStatsRevealed = true;
  const known = api.getKnowledge(actor);
  assert.equal(known.attacks[0].modifier.value, 12);
  assert.equal(known.attacks[0].damage[0].amount.value, "2d6");
  assert.equal(known.attacks[0].damage[0].type, undefined);
  settings["hide-ability-descriptions"] = true;
  assert.equal(api.getKnowledge(actor).actions[0].description, undefined);
  assert.equal(known.actions[0].rules, undefined);
});

test("spell entry and spell visibility, no GM description", () => {
  const { api, actor, system } = fixture();
  const known = api.getKnowledge(actor).spells;
  assert.equal(known[0].dc, null);
  assert.equal(known[0].attack.value, 15);
  assert.equal(known[0].spells.length, 1);
  assert.ok(!JSON.stringify(known).includes("GM secret"));
  system.spells.entries.caster.revealed = false;
  assert.deepEqual(api.getKnowledge(actor).spells, []);
});

test("fresh snapshots reflect updates without mutating journal", () => {
  const { api, actor, system } = fixture();
  const known = api.getKnowledge(actor);
  known.ac.value = 0;
  known.traits.push("invented");
  assert.equal(system.ac.value, 18);
  system.ac.revealed = false;
  assert.equal(api.getKnowledge(actor).ac, null);
  assert.deepEqual(api.getKnowledge(actor).traits, ["goblin"]);
});

test("registration preserves existing API and macros", () => {
  const { game, module, actor } = fixture();
  registerKnowledgeAPI(game);
  assert.equal(module.api.version, 1);
  assert.equal(module.api.existing, true);
  assert.equal(module.macros.existing, true);
  assert.equal(module.api.getKnowledge(actor).scope, "party");
});

test("installed bundle and source register API; release includes imported module", () => {
  for (const file of ["BestiaryTracking.js", "pf2e-bestiary-tracking.js"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(
      source,
      /import \{ registerKnowledgeAPI \} from "\.\/scripts\/knowledge-api\.mjs"/,
    );
    assert.match(
      source,
      /Hooks.once\("ready", async \(\) => \{\s+registerKnowledgeAPI\(game\)/,
    );
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--check"],
      { input: source, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
  }
  const workflow = readFileSync(
    new URL("../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /zip -r[^\n]+scripts\/knowledge-api\.mjs/);
});
