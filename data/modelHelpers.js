import { getIWRString, getSpellLevel, slugify } from "../scripts/helpers";
import { currentVersion } from "../scripts/setup";

const fields = foundry.data.fields;

export const toggleStringField = () =>
  new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.StringField({ required: true }),
    custom: new fields.StringField({ nullable: true }),
  });

export const toggleNumberField = () =>
  new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.NumberField({ required: true, integer: true }),
    custom: new fields.StringField({ nullable: true }),
  });

export const getCreatureData = (actor) => {
  const { creature: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );
  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Array.from(actor.items);

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
      hidden: game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
        .monster,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      name: { value: actor.name, revealed: defaultRevealed.name },
      hardness: { value: actor.system.attributes.hardness.value },
      allSaves: { value: actor.system.attributes.allSaves.value },
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
        : { empty: { empty: true, value: "PF2EBestiary.Miscellaneous.None" } },
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
                exceptions: immunity.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
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
                  isMelee: attack.weapon.isMelee,
                  additionalEffects: attack.additionalEffects.reduce(
                    (acc, effect) => {
                      acc[effect.tag] = {
                        label: effect.label,
                        tag: effect.tag,
                      };

                      return acc;
                    },
                    {},
                  ),
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

export const getNPCData = (actor) => {
  const { npc: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );
  const creatureData = getCreatureData(actor);

  return {
    ...creatureData,
    type: "pf2e-bestiary-tracking.npc",
    system: {
      ...creatureData.system,
      hidden: game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
        .npc,
      npcData: {
        categories: [],
        general: {
          background: { value: "", revealed: defaultRevealed.background },
          appearance: { value: "", revealed: defaultRevealed.appearance },
          personality: { value: "", revealed: defaultRevealed.personality },
          height: { value: "", revealed: defaultRevealed.height },
          weight: { value: "", revealed: defaultRevealed.weight },
          birthplace: { value: "", revealed: defaultRevealed.birthplace },
          disposition: {},
        },
      },
    },
  };
};

export class MappingField extends foundry.data.fields.ObjectField {
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
