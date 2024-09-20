import { slugify } from "../scripts/helpers";
import { attackTable } from "../scripts/statisticsData";
import { getCategoryLabel } from "../scripts/statisticsHelper";
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
