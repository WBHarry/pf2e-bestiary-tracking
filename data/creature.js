import { alphaSort, getCreaturesTypes } from "../scripts/helpers";
import {
  acTable,
  attackTable,
  attributeTable,
  damageTable,
  dcModificationTable,
  hpTable,
  identificationSkills,
  levelDCTable,
  rarityModificationTable,
  savingThrowPerceptionTable,
  skillTable,
  spellAttackTable,
  spellDCTable,
  weaknessTable,
} from "../scripts/statisticsData";
import {
  getCategoryFromIntervals,
  getCategoryLabel,
  getMixedCategoryLabel,
  getRollAverage,
  setSimpleCategoryLabels,
} from "../scripts/statisticsHelper";
import { recallKnowledgeOutcomes } from "./constants";
import {
  getCreatureData,
  MappingField,
  toggleNumberField,
  toggleStringField,
} from "./modelHelpers";

export class Creature extends foundry.abstract.TypeDataModel {
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

    const levelUsedForLevel =
      gmLevel && !Number.isNaN(gmLevel) && game.user.isGM
        ? gmLevel
        : (playerLevel ?? this.level.value);

    this.level.category =
      this.level.value < levelUsedForLevel
        ? "PF2EBestiary.Miscellaneous.Lower"
        : this.level.value === levelUsedForLevel
          ? "PF2EBestiary.Miscellaneous.Similar"
          : "PF2EBestiary.Miscellaneous.Higher";

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
