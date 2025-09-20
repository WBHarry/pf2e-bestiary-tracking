import {
  getIWRString,
  getSpellLevel,
  parseDamageInstancesFromFormula,
  slugify,
} from "../scripts/helpers";
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

export const getCreatureData = async (actor, pcBase) => {
  if (pcBase) return await getPCCreatureData(actor);

  const { creature: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { creature: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Array.from(actor.items);

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

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
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
          .monster || combatant?.token?.hidden,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      imageState: { hideState: imageSettings.hideState },
      actorState: {
        actorLinks: actor.actorLinks ?? [],
      },
      name: { value: actor.name, revealed: defaultRevealed.name },
      blurb: {
        value: actor.system.details.blurb ? actor.system.details.blurb : null,
        revealed: defaultRevealed.nameInfo,
      },
      hardness: { value: actor.system.attributes.hardness },
      allSaves: { value: actor.system.attributes.allSaves?.value },
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
        : {
            revealed: defaultRevealed.skills,
            empty: { empty: true, value: "PF2EBestiary.Miscellaneous.None" },
          },
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
            acc[speed.type] = {
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
                  revealed: defaultRevealed.languages,
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
                source: immunity.source,
                customLabel: immunity["#customLabel"],
                exceptions: immunity.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
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
                source: weakness.source,
                customLabel: weakness["#customLabel"],
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
                revealed: defaultRevealed.iwr,
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
                source: resistance.source,
                customLabel: resistance["#customLabel"],
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
                revealed: defaultRevealed.iwr,
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
              const item = attack.item;

              acc[attack.item.id] = {
                revealed: defaultRevealed.attacks,
                label: attack.label,
                actions: attack.glyph,
                totalModifier: attack.totalModifier,
                isMelee: attack.weapon?.isMelee ?? attack.item.isMelee,
                additionalEffects:
                  attack.additionalEffects?.reduce((acc, effect) => {
                    acc[effect.tag] = {
                      label: effect.label,
                      tag: effect.tag,
                    };

                    return acc;
                  }, {}) ?? {},
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

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.attacks,
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
                revealed: defaultRevealed.abilities,
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
                revealed: defaultRevealed.abilities,
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

const getPCCreatureData = async (actor) => {
  const { creature: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { creature: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Array.from(actor.items);

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

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
        dc: { value: actor.classDC.dc.value },
        mod: { value: actor.classDC.mod },
        attack: { value: actor.classDC.mod },
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

  const attacks = {};
  for (var i = 0; i < attackKeys.length; i++) {
    var attack = actor.system.actions[attackKeys[i]];

    if (attack.slug === "basic-unarmed") continue;

    const item = attack.item;

    const damage = await attack.damage({ getFormula: true });
    const damageInstances = parseDamageInstancesFromFormula(damage);
    attacks[attack.item.id] = {
      revealed: defaultRevealed.attacks,
      label: attack.label,
      actions: attack.glyph,
      totalModifier: attack.totalModifier,
      isMelee: item.isMelee,
      additionalEffects:
        attack.additionalEffects?.reduce((acc, effect) => {
          acc[effect.tag] = {
            label: effect.label,
            tag: effect.tag,
          };

          return acc;
        }, {}) ?? {},
      damageInstances: damageInstances,
      bonuses: {
        bonus: item.system.damage.bonus?.value,
        bonusDamage: item.system.damage.bonusDamage?.value,
        splashDamage: item.system.splashDamage.value,
        property: item.system.damage.property1,
        runes: {
          potency: item.system.runes.potency,
          striking: item.system.runes.striking,
          property: item.system.runes.property,
        },
      },
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
  if (Object.keys(attacks).length === 0) {
    attacks.empty = {
      revealed: defaultRevealed.attacks,
      empty: true,
      label: "PF2EBestiary.Miscellaneous.None",
      totalModifier: 0,
      isMelee: false,
      damageInstances: {},
      traits: {},
      variants: {},
      rules: {},
    };
  }

  return {
    type: "pf2e-bestiary-tracking.creature",
    name: actor.name,
    ownership: { default: 3 },
    system: {
      isFromPC: true,
      pcData: {
        classDC: {
          label: CONFIG.PF2E.classTraits[actor.classDC.slug],
          dc: { value: actor.classDC.dc.value },
          mod: { value: actor.classDC.mod },
        },
      },
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
          .monster || combatant?.token?.hidden,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      imageState: { hideState: imageSettings.hideState },
      name: { value: actor.name, revealed: defaultRevealed.name },
      blurb: {
        value: actor.system.details.blurb ? actor.system.details.blurb : null,
        revealed: defaultRevealed.nameInfo,
      },
      hardness: { value: actor.system.attributes.hardness },
      allSaves: { value: actor.system.attributes.allSaves?.value },
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
      skills: Object.values(actor.system.skills).some(
        (x) => x.totalModifier > 0,
      )
        ? Object.keys(actor.system.skills).reduce((acc, key) => {
            const skill = actor.system.skills[key];
            acc[key] = {
              value: Number.parseInt(skill.totalModifier),
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
        : {
            revealed: defaultRevealed.skills,
            empty: { empty: true, value: "PF2EBestiary.Miscellaneous.None" },
          },
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
                  revealed: defaultRevealed.languages,
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
                source: immunity.source,
                customLabel: immunity["#customLabel"],
                exceptions: immunity.exceptions.reduce((acc, exception) => {
                  acc[exception] = { type: exception.label ?? exception };
                  return acc;
                }, {}),
              };

              return acc;
            }, {})
          : {
              empty: {
                revealed: defaultRevealed.iwr,
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
                source: weakness.source,
                customLabel: weakness["#customLabel"],
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
                revealed: defaultRevealed.iwr,
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
                source: resistance.source,
                customLabel: resistance["#customLabel"],
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
                revealed: defaultRevealed.iwr,
                empty: true,
                type: "PF2EBestiary.Miscellaneous.None",
                exceptions: {},
                doubleVs: {},
              },
            },
      attacks: attacks,
      actions:
        itemKeys.filter(
          (action) =>
            (action.type === "action" || action.type === "feat") &&
            action.system.actionType.value !== "passive",
        ).length > 0
          ? itemKeys.reduce((acc, action) => {
              if (
                (action.type === "action" || action.type === "feat") &&
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
                revealed: defaultRevealed.abilities,
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
            (action.type === "action" || action.type === "feat") &&
            action.system.actionType.value === "passive",
        ).length > 0
          ? itemKeys.reduce((acc, action) => {
              if (
                (action.type === "action" || action.type === "feat") &&
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
                revealed: defaultRevealed.abilities,
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

export const getNPCData = async (actor, pcBase) => {
  const { npc: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { npc: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

  const isSimple = actor.sheet.options.classes.includes("simple");

  const creatureData = await getCreatureData(actor, pcBase);
  const personalityData = pcBase
    ? {
        attitude: {
          value: actor.system.details.biography.attitude
            ? actor.system.details.biography.attitude
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.attitude),
        },
        beliefs: {
          value: actor.system.details.biography.beliefs
            ? actor.system.details.biography.beliefs
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.beliefs),
        },
        likes: {
          value: actor.system.details.biography.likes
            ? actor.system.details.biography.likes
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.likes),
        },
        dislikes: {
          value: actor.system.details.biography.dislikes
            ? actor.system.details.biography.dislikes
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.dislikes),
        },
        catchphrases: {
          value: actor.system.details.biography.catchphrases
            ? actor.system.details.biography.catchphrases
            : "PF2EBestiary.Miscellaneous.None",
          empty: Boolean(actor.system.details.biography.catchphrases),
        },
        edicts:
          actor.system.details.biography.edicts.length > 0
            ? actor.system.details.biography.edicts.reduce((acc, edict) => {
                acc[foundry.utils.randomID()] = { value: edict };

                return acc;
              }, {})
            : {
                empty: {
                  value: "PF2EBestiary.Miscellaneous.None",
                  empty: true,
                },
              },
        anathema:
          actor.system.details.biography.anathema.length > 0
            ? actor.system.details.biography.anathema.reduce(
                (acc, anathema) => {
                  acc[foundry.utils.randomID()] = { value: anathema };

                  return acc;
                },
                {},
              )
            : {
                empty: {
                  value: "PF2EBestiary.Miscellaneous.None",
                  empty: true,
                },
              },
      }
    : null;

  return {
    ...creatureData,
    type: "pf2e-bestiary-tracking.npc",
    system: {
      ...creatureData.system,
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings").npc ||
        combatant?.token?.hidden,
      imageState: {
        hideState: imageSettings.hideState,
      },
      npcData: {
        simple: isSimple,
        categories: [],
        general: {
          background: {
            value: pcBase ? actor.system.details.biography.backstory : "",
            revealed: defaultRevealed.background,
          },
          appearance: {
            value: pcBase ? actor.system.details.biography.appearance : "",
            revealed: defaultRevealed.appearance,
          },
          personality: {
            value: "",
            revealed: defaultRevealed.personality,
            data: personalityData,
          },
          height: {
            value: pcBase ? actor.system.details.height.value : "",
            revealed: defaultRevealed.height,
          },
          weight: {
            value: pcBase ? actor.system.details.weight.value : "",
            revealed: defaultRevealed.weight,
          },
          birthplace: {
            value: pcBase ? actor.system.details.biography.birthPlace : "",
            revealed: defaultRevealed.birthplace,
          },
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
  };
};

export const getHazardData = (actor) => {
  const { hazard: defaultRevealed } = game.settings.get(
    "pf2e-bestiary-tracking",
    "default-revealed",
  );

  const { hazard: imageSettings } = game.settings.get(
    "pf2e-bestiary-tracking",
    "image-settings",
  );

  const combatant = game.combat?.combatants?.find(
    (x) => (x.token?.baseActor?.uuid ?? x.actor?.uuid) === actor.uuid,
  );

  const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
  const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
  const resistancesKeys = Object.keys(actor.system.attributes.resistances);
  const attackKeys = Object.keys(actor.system.actions);
  const itemKeys = Array.from(actor.items);

  return {
    type: "pf2e-bestiary-tracking.hazard",
    name: actor.name,
    ownership: { default: 3 },
    system: {
      hidden:
        game.settings.get("pf2e-bestiary-tracking", "hidden-settings").hazard ||
        combatant?.token?.hidden,
      uuid: actor.uuid,
      version: currentVersion,
      img: actor.img,
      texture: actor.prototypeToken.texture.src,
      imageState: { hideState: imageSettings.hideState },
      name: { value: actor.name, revealed: defaultRevealed.name },
      publication: actor.system.details.publication,
      hasHealth: actor.system.attributes.hasHealth,
      isComplex: actor.system.details.isComplex,
      disable: {
        value: actor.system.details.disable,
        revealed: defaultRevealed.disable,
      },
      routine: {
        value: actor.system.details.routine,
        revealed: defaultRevealed.routine,
      },
      reset: {
        value: actor.system.details.reset,
        revealed: defaultRevealed.reset,
      },
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
      hardness: {
        value: actor.system.attributes.hardness,
        revealed: defaultRevealed.hardness,
      },
      level: {
        value: Number.parseInt(actor.system.details.level.value),
        revealed: defaultRevealed.level,
      },
      stealth: {
        value: actor.system.attributes.stealth.value,
        dc: actor.system.attributes.stealth.dc,
        modifiers: actor.system.attributes.stealth.modifiers
          .filter((x) => x.slug !== "base")
          .map((x) => ({
            kind: x.kind,
            label: x.label,
            modifier: x.modifier,
          })),
        totalModifier: Number.parseInt(
          actor.system.attributes.stealth.totalModifier,
        ),
        details: {
          value: actor.system.attributes.stealth.details,
          revealed: defaultRevealed.stealth,
        },
        revealed: defaultRevealed.stealth,
      },
      initiative: actor.system.initiative
        ? {
            value: actor.system.initiative.value,
            modifiers: actor.system.initiative.modifiers
              .filter((x) => x.slug !== "base")
              .map((x) => ({
                kind: x.kind,
                label: x.label,
                modifier: x.modifier,
              })),
            totalModifier: Number.parseInt(
              actor.system.initiative.totalModifier,
            ),
            revealed: defaultRevealed.initiative,
          }
        : null,
      rarity: { value: actor.system.traits.rarity },
      traits: actor.system.traits.value.reduce((acc, trait) => {
        acc[trait] = { value: trait, revealed: defaultRevealed.traits };
        return acc;
      }, {}),
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
                revealed: defaultRevealed.iwr,
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
                revealed: defaultRevealed.iwr,
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
                revealed: defaultRevealed.iwr,
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
                  isMelee: attack.weapon?.isMelee ?? attack.item.isMelee,
                  additionalEffects:
                    attack.additionalEffects?.reduce((acc, effect) => {
                      acc[effect.tag] = {
                        label: effect.label,
                        tag: effect.tag,
                      };

                      return acc;
                    }, {}) ?? {},
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
                revealed: defaultRevealed.attacks,
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
        itemKeys.filter((action) => action.type === "action").length > 0
          ? itemKeys.reduce((acc, action) => {
              if (action.type === "action") {
                acc[action.id] = {
                  revealed: defaultRevealed.abilities,
                  label: action.name,
                  category: action.system.category,
                  deathNote: action.system.deathNote,
                  actions:
                    action.system.actionType.value === "reaction"
                      ? "R"
                      : action.system.actionType.value === "passive"
                        ? ""
                        : (action.system.actions.value ?? "R"),
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
                revealed: defaultRevealed.abilities,
                label: "PF2EBestiary.Miscellaneous.None",
                actions: "",
                traits: {},
                description: "",
              },
            },
      notes: {
        description: {
          value: actor.system.details.description,
          revealed: defaultRevealed.description,
        },
      },
    },
  };
};
