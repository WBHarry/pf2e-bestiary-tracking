A Foundry VTT module for the Pathfinder Second Edition (PF2E) system. It adds a bestiary where a GM can add creatures, npcs and hazards that the party have faced off against, heard off, or through some other means gained information about. Once added, the GM can choose which information about the monsters to reveal for players to be able to see within the bestiary. Notes can be kept on the bestiary entities and other information can be kept track of.

## Party knowledge API

Available after Foundry's `ready` hook:

```js
const bestiary = game.modules.get("pf2e-bestiary-tracking");
const knowledge = bestiary?.active
  ? bestiary.api?.getKnowledge(targetToken)
  : null;

const fortitude = knowledge?.saves.fortitude?.value;
```

Combater can use numeric facts such as `fortitude` to estimate outcomes when
`typeof fortitude === "number"`.

`getKnowledge(target)` is synchronous. Accepts Actor, Token, TokenDocument,
world actor ID or UUID (other UUIDs must resolve through `fromUuidSync`).
Synthetic token actors resolve to their base actor. Matches active bestiary by
actor UUID, registered duplicate UUID, then optional `sameNameDuplicates` setting.
Returns `null` for missing or hidden entries, unresolved actors, or missing bestiary.

Version 1 returns a detached JSON snapshot with `scope: "party"`, `pageUuid`,
`type`, `name`, `level`, `ac`, `hp`, `hardness`, `saves`, `perception`, `skills`,
`attributes`, `speeds`, `traits`, `immunities`, `weaknesses`, `resistances`,
`attacks`, `actions`, `passives`, and `spells`. Scalar facts are
`{ value, display }`, `{ display }` for vague/custom information, or `null` when
unknown. Maps omit unknown facts. Arrays contain revealed entries only.
IWR entries contain `type`, optional known magnitude, visible `exceptions` and
`doubleVs`; an explicitly revealed absence is `{ empty: true }`.

Queries use party visibility even for GMs. Detailed visibility toggles apply to
IWR magnitudes, exceptions, traits, and damage types. Attack numbers require
`damageStatsRevealed`; spells require both entry and spell visibility. GM spell
descriptions, rule elements, source actor data, and misinformation flags are omitted.
Revealed misinformation remains party knowledge; custom text never exposes its
underlying true numeric value. Knowledge is shared by party, not tracked per player.
Read again when building a plan: snapshots reflect current bestiary state, without
caching. Missing values mean unknown; an empty array does not prove absence.

This supplies the API for Combater integration; it does not change Combater's
autofill engine. Consumers must use these facts instead of consulting hidden actor
statistics and should preserve their existing fallback when the module is inactive.

Run API regressions with `node --test tests/knowledge-api.test.mjs`.

# [Wiki](https://github.com/WBHarry/pf2e-bestiary-tracking/wiki)

Here the useage of the module aswell as its module settings are explained 🤖
A common point of confusion is [adding NPCs to the bestiary](https://github.com/WBHarry/pf2e-bestiary-tracking/wiki/Basics#regarding-npcs).

# For users updating from an old version
Unfortunately there was a point in development where a bad data issue happened. It effected some users that were trying out module at the time, and wasn't something I could reasonable fix in a migration.
If you're getting errors in this kind of situation, there is a `Bestiary Reset` macro included in the compendium section from this modue. It will remove any existing Bestiary data and update the data structure so everything will work well again.
![image](https://github.com/user-attachments/assets/77b02c21-6e8a-4ef4-ab61-6bc01edf90a2)
