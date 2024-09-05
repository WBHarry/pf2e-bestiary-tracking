import { getSpellLevel, slugify } from "../scripts/helpers";
import { currentVersion } from "../scripts/setup";

export const getCreatureDataFromOld = (actor) => {
    const immunitiesKeys = Object.keys(actor.system.attributes.immunities);
    const weaknessesKeys = Object.keys(actor.system.attributes.weaknesses);
    const resistancesKeys = Object.keys(actor.system.attributes.resistances);
    const attackKeys = Object.keys(actor.system.actions);
    const itemKeys = Object.values(actor.items);

    const spells = !itemKeys.some(x => x._id === 'Spell-None') ? {
        fake: null,
        entries: itemKeys.reduce((acc, entry) => {
            if(entry.type === 'spellcastingEntry'){
                const levels = {};
                Object.values(actor.items).forEach(spell => {
                if(spell.type === 'spell' && spell.system.location.value === entry._id){
                    const levelValue = getSpellLevel(spell, actor.system.details.level.value);

                    var level = Object.values(levels).find(x => x.value === levelValue);
                    if(!level) {
                        level = { value: levelValue, spells: {} };
                    }

                    const showActions = !spell.system.traits.value.some(x => x === 'exploration' || x === 'downtime');
                    level.spells[spell._id] = {
                        revealed: spell.revealed,
                        label: spell.name,
                        img: spell.img,
                        actions: showActions ? spell.system.time.value.replace('to', '-') : '',
                        defense: spell.system.defense?.save?.statistic ? {
                        statistic: spell.system.defense.save.statistic,
                        basic: spell.system.defense.save.basic,
                        } : null,
                        range: spell.system.range.value,
                        traits: {
                        rarity: spell.system.traits.rarity,
                        traditions: spell.system.traits.traditions,
                        values: spell.system.traits.value.reduce((acc, trait ) => {
                            acc[trait] = { value: trait };
                            return acc;
                        }, {})
                        },
                        description: {
                            gm: spell.system.description.gm,
                            value: spell.system.description.value,
                        }
                    };

                    levels[levelValue] = level;
                }
                }); 

                acc[entry._id] = {
                    revealed: entry.revealed,
                    tradition: entry.system.tradition.value,
                    category: entry.system.prepared.value,
                    dc: entry.system.spelldc.dc,
                    mod: { value: actor.system.abilities[entry.system.ability.value].mod },
                    attack: entry.system.spelldc.value,
                    levels: levels,
                };
            }

            return acc;
    }, {}) }: {
        fake: { revealed: actor.items['Spells-None'].revealed },
        entries: {},
    };
    
    return {
        type: 'pf2e-bestiary-tracking.creature',
        name: actor.name.value,
        ownership: { default: 3 },
        system: {
            hidden: actor.hidden,
            uuid: actor.uuid,
            version: currentVersion,
            img: actor.img,
            texture: actor.prototypeToken.texture.src,
            name: actor.name,
            hardness: { value: actor.system.attributes.hardness.value },
            allSaves: { value: actor.system.attributes.allSaves.value },
            publication: actor.system.details.publication,
            ac: { value: Number.parseInt(actor.system.attributes.ac.value), revealed: Boolean(actor.system.attributes.ac), custom: actor.system.attributes.ac.custom, details: actor.system.attributes.ac.details },
            hp: { value: Number.parseInt(actor.system.attributes.hp.max), revealed: Boolean(actor.system.attributes.hp.revealed), custom: actor.system.attributes.hp.custom, temp: Number.parseInt(actor.system.attributes.hp.temp), details: actor.system.attributes.hp.details, negativeHealing: actor.system.attributes.hp.negativeHealing },
            level: { value: Number.parseInt(actor.system.details.level.value), revealed: actor.system.details.level.revealed, custom: actor.system.details.level.custom },
            size: actor.system.traits.size.value,
            rarity: { value: actor.system.traits.rarity },
            traits: actor.system.traits.value,
            skills: Object.values(actor.system.skills).some(x => x.base > 0) ? Object.keys(actor.system.skills).reduce((acc, key) => {
              const skill = actor.system.skills[key];
              acc[key] = { 
                value: skill.base, 
                revealed: skill.revealed, 
                lore: skill.lore, 
                note: skill.note, 
                modifiers: skill.modifiers.filter(x => x.slug !== 'base').map(x => ({ kind: x.kind, label: x.label, modifier: x.modifier })), 
                label: skill.label, 
                totalModifier: Number.parseInt(skill.totalModifier)
              };
              return acc;
            }, {}) : { empty: { empty: true, value: 'PF2EBestiary.Miscellaneous.None' } },
            saves: {
              fortitude: { value: actor.system.saves.fortitude.value, revealed: actor.system.saves.fortitude.revealed, custom: actor.system.saves.fortitude.custom },
              reflex: { value: actor.system.saves.reflex.value, revealed: actor.system.saves.reflex.revealed, custom: actor.system.saves.reflex.custom },
              will: { value: actor.system.saves.will.value, revealed: actor.system.saves.will.revealed, custom: actor.system.saves.will.custom },
            },
            speeds: {
              details: { name: actor.system.attributes.speed.details },
              values: {
                land: { type: 'land', value: actor.system.attributes.speed.value, revealed: actor.system.attributes.speed.revealed },
                ...actor.system.attributes.speed.otherSpeeds.reduce((acc, speed) => {
                  acc[speed.label] = { type: speed.type, value: speed.value, revealed: speed.revealed }
                  return acc;
                }, {})
              },  
            },
            abilities: Object.keys(actor.system.abilities).reduce((acc, key) => {
              acc[key] = { key: key, revealed: actor.system.abilities[key].revealed, mod: actor.system.abilities[key].mod, custom: actor.system.abilities[key].custom, };
              return acc;
            }, {}),
            senses: {
              perception: { value: actor.system.perception.value, revealed: actor.system.perception.revealed, custom: actor.system.perception.custom },
              details: actor.system.perception.details,
              senses: actor.system.perception.senses.reduce((acc, sense) => {
                acc[sense.type] = { type: sense.type, revealed: sense.revealed, acuity: sense.acuity, range: sense.range };
                return acc;
              }, {})
            },
            languages: {
              details: actor.system.details.languages.details,
              values: actor.system.details.languages.value.length > 0 ? actor.system.details.languages.value.reduce((acc, language) => {
                acc[language.value] = language;
                return acc;
              }, {}) : { empty: { empty: true, value: 'PF2EBestiary.Miscellaneous.None', exceptions: {} }}
            },
            immunities: immunitiesKeys.reduce((acc, key) => {
                const immunity = actor.system.attributes.immunities[key];
                acc[key] = { 
                    empty: Boolean(immunity.empty),
                    fake: Boolean(immunity.fake),
                    revealed: immunity.revealed, 
                    type: immunity.empty ? 'PF2EBestiary.Miscellaneous.None' : immunity.type, 
                    exceptions:  immunity.exceptions?.reduce((acc, exception) => {  
                      const type = exception.value.label ?? exception.value;
                      acc[slugify(type)] = { revealed: exception.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                };

                return acc;
            }, {}),
            weaknesses: weaknessesKeys.reduce((acc, key) => {
                const weakness = actor.system.attributes.weaknesses[key];
                acc[key] = { 
                    empty: Boolean(weakness.empty),
                    fake: Boolean(weakness.fake),
                    revealed: weakness.revealed, 
                    type: weakness.empty ? 'PF2EBestiary.Miscellaneous.None' : weakness.type,
                    value: weakness.value, 
                    exceptions:  weakness.exceptions?.reduce((acc, exception) => { 
                      const type = exception.value.label ?? exception.value; 
                      acc[slugify(type)] = { revealed: exception.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                };

                return acc;
            }, {}),
            resistances: resistancesKeys.reduce((acc, key) => {
                const resistance = actor.system.attributes.resistances[key];
                acc[key] = { 
                    empty: Boolean(resistance.empty),
                    fake: Boolean(resistance.fake),
                    revealed: resistance.revealed, 
                    type: resistance.empty ? 'PF2EBestiary.Miscellaneous.None' : resistance.type,
                    value: resistance.value, 
                    exceptions:  resistance.exceptions?.reduce((acc, exception) => {  
                      const type = exception.value.label ?? exception.value;
                      acc[slugify(type)] = { revealed: exception.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                    doubleVs: resistance.doubleVs?.reduce((acc, doubleVs) => {  
                      const type = doubleVs.value.label ?? doubleVs.value;
                      acc[slugify(type)] = { revealed: doubleVs.revealed, type: type };
                      return acc;
                    }, {}) ?? {},
                };

                return acc;
            }, {}),
            attacks: attackKeys.reduce((acc, actionKey) => {
              const attack = actor.system.actions[actionKey];
              const item = actor.items[actionKey];
              
              if(attack.fake){
                acc[actionKey] = {
                    revealed: attack.revealed,
                    fake: true,
                    label: attack.label,
                    actions: '1',
                    totalModifier: 0,
                    isMelee: true,
                    additionalEffects: [],
                    damageInstances: attack.item.system.damageRolls,
                    traits: attack.traits,
                    variants: attack.variants,
                    rules: {}
                };
              }
              else if(item.type === 'melee' || item.type === 'equipment'){
                acc[attack.empty ? 'empty' : attack.item._id] = {
                  revealed: attack.revealed,
                  empty: Boolean(attack.empty),
                  label: attack.empty ? 'PF2EBestiary.Miscellaneous.None' : attack.label,
                  actions: attack.glyph,
                  totalModifier: attack.totalModifier,
                  isMelee: attack.weapon.system.traits.value.find(x => x.startsWith('range-increment') || x.startsWith('range')) ? false : true,
                  additionalEffects: attack.additionalEffects?.reduce((acc, effect) => {
                    acc[effect.tag] = { label: effect.label, tag: effect.tag };

                    return acc;
                  }, {}) ?? {},
                  damageInstances: Object.keys(item.system.damageRolls).reduce((acc, damage) => {
                    acc[damage] = { 
                      category: item.system.damageRolls[damage].category,
                      damage: { value: item.system.damageRolls[damage].damage },
                      damageType: item.system.damageRolls[damage].damageType, 
                    };

                    return acc;
                  }, {}),
                  traits: item.system.traits.value.reduce((acc, trait) => {
                    acc[trait.value] = { revealed: trait.revealed, value: trait.value, description: trait.value };
                    return acc;
                  }, {}),
                  variants: attack.variants.reduce((acc, variant) => {
                    acc[slugify(variant.label)] = { label: variant.label };

                    return acc;
                  }, {}),
                  rules: item.system.rules ?? {},
                };
              }

              return acc;
            }, {}),
            actions: itemKeys.reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value !== 'passive'){
                acc[action.empty ? 'empty' : action._id] = {
                  revealed: action.revealed,
                  empty: Boolean(action.empty),
                  fake: Boolean(action.fake),
                  label: action.empty ? 'PF2EBestiary.Miscellaneous.None' : action.name,
                  category: action.system.category ?? '',
                  deathNote: action.system.deathNote ?? false,
                  actions: action.system.actions ? action.system.actions.value ?? 'R' : '1',
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait.value] = trait;
                    return acc;
                  }, {}),
                  description: action.system.description.value ?? '',
                };
              }

              return acc;
            }, {}),
            passives: itemKeys.reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value === 'passive'){
                acc[action.empty ? 'empty' : action._id] = {
                  revealed: action.revealed,
                  empty: Boolean(action.empty),
                  fake: Boolean(action.fake),
                  label: action.empty ? 'PF2EBestiary.Miscellaneous.None' : action.name,
                  category: action.system.category ?? '',
                  deathNote: action.system.deathNote ?? false,
                  traits: action.system.traits.value.reduce((acc, trait) => {
                    acc[trait.value] = trait;
                    return acc;
                  }, {}),
                  description: action.system.description.value ?? '',
                };
              }

              return acc;
            }, {}),
            spells: spells,
            notes: {
              public: { value: actor.system.details.publicNotes.text, revealed: actor.system.details.publicNotes.revealed },
              private: { value: actor.system.details.privateNotes.text, revealed: actor.system.details.privateNotes.revealed },
              player: { value: game.journal.getName('pf2e-bestiary-tracking-journal-entry')?.pages?.get(actor.system.details.playerNotes.document)?.text?.content ?? '' },
            },
        }
    };
}

export const getNPCDataFromOld = (actor, wrongCategory) => {
    const creatureData = getCreatureDataFromOld(actor);

    if(wrongCategory){
      return {
        ...creatureData,
        type: 'pf2e-bestiary-tracking.npc',
        system: {
            ...creatureData.system,
            hidden: actor.hidden,
            npcData: {
                categories: [],
                general: {
                    background: { value: '' },
                    appearance: { value: '' },
                    personality: { value: '' },
                    height: { value: '' },
                    weight: { value: '' },
                    birthplace: { value: '' },
                    disposition: {},
                }
            }
        }
      }
    }

    return {
        ...creatureData,
        type: 'pf2e-bestiary-tracking.npc',
        system: {
            ...creatureData.system,
            hidden: actor.hidden,
            npcData: {
                categories: actor.npcData.categories.map(category => ({ name: category.name, value: category.key })),
                general: {
                    background: actor.npcData.general.background,
                    appearance: actor.npcData.general.appearance,
                    personality: actor.npcData.general.personality,
                    height: actor.npcData.general.height,
                    weight: actor.npcData.general.weight,
                    birthplace: actor.npcData.general.birthplace,
                    disposition: Object.keys(actor.npcData.general.disposition).reduce((acc, key) => {
                      const character = game.actors.get(key);
                      const characterId = character?.id ?? game.users.get(key).character?.id;
                      if(!characterId) return acc;

                      acc[characterId] = actor.npcData.general.disposition[key].value;
                      return acc;
                    }, {}),
                }
            }
        }
    }
}