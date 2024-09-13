import { getHazardTypes } from "../scripts/helpers";
import {
  acTable,
  attackTable,
  attributeTable,
  damageTable,
  hardnessTable,
  hpTable,
  savingThrowPerceptionTable,
  stealthDisableTable,
  weaknessTable,
} from "../scripts/statisticsData";
import {
  getCategoryFromIntervals,
  getCategoryLabel,
  getMixedCategoryLabel,
  getRollAverage,
} from "../scripts/statisticsHelper";
import {
  getHazardData,
  MappingField,
  toggleNumberField,
  toggleStringField,
} from "./modelHelpers";

export class Hazard extends foundry.abstract.TypeDataModel {
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
      }),
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

  _getRefreshData(hazard, hazardData) {
    const data = hazardData ?? getHazardData(hazard);

    return {
      name: data.name,
      system: {
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
        initiative: {
          ...data.system.initiative,
          revealed: this.initiative.revealed,
          custom: this.initiative.custom,
        },
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
    if (!actor) return;

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

    this.hasSaves =
      this.saves.fortitude.value ||
      this.saves.reflex.value ||
      this.saves.will.value;

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
        category: getCategoryLabel(
          savingThrowPerceptionTable,
          contextLevel,
          this.saves.fortitude.value,
          true,
        ),
      },
      reflex: {
        ...this.saves.reflex,
        label: `${this.saves.reflex.value > 0 ? "+" : ""}${this.saves.reflex.value}`,
        category: getCategoryLabel(
          savingThrowPerceptionTable,
          contextLevel,
          this.saves.reflex.value,
          true,
        ),
      },
      will: {
        ...this.saves.will,
        label: `${this.saves.will.value > 0 ? "+" : ""}${this.saves.will.value}`,
        category: getCategoryLabel(
          savingThrowPerceptionTable,
          contextLevel,
          this.saves.will.value,
          true,
        ),
      },
    };

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
