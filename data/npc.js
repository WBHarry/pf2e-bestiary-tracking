import { slugify } from "../scripts/helpers";
import { dispositions } from "./constants";
import { Creature } from "./creature";
import { getNPCData, MappingField } from "./modelHelpers";

export class NPC extends Creature {
  static defineSchema() {
    const fields = foundry.data.fields;
    const creatureFields = super.defineSchema();
    return {
      ...creatureFields,
      tabStates: new fields.SchemaField({
        influence: new fields.SchemaField({
          hidden: new fields.BooleanField({ required: true, initial: false }),
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

  _getRefreshData(actor) {
    const data = getNPCData(actor);
    const creatureData = super._getRefreshData(actor, data);
    return {
      ...creatureData,
      system: {
        ...creatureData.system,
        npcData: this.npcData,
      },
    };
  }

  _getToggleUpdate(state, npcView) {
    if (npcView) {
      return {
        system: {
          npcData: {
            general: {
              "background.revealed": state,
              "appearance.revealed": state,
              "personality.revealed": state,
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
        ?.system?.details?.members?.map((x) => {
          const actor = game.actors.find((actor) => actor.uuid === x.uuid);
          return {
            value: dispositions.indifferent.value,
            id: actor.id,
            name: actor.name,
          };
        }) ?? [];
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
    return this.npcData.categories.length > 0
      ? this.npcData.categories[0].value
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

    this.npcData.influence.influence = Object.keys(
      this.npcData.influence.influence,
    ).reduce((acc, key) => {
      const influence = this.npcData.influence.influence[key];
      if (
        game.user.isGM ||
        this.npcData.influence.influencePoints >= influence.points
      ) {
        acc[key] = influence;
      }

      return acc;
    }, {});
  }
}
