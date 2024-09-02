import { currentVersion } from "../scripts/setup";
import { MappingField, toggleNumberField, toggleStringField } from "./modelHelpers";

export class Creature extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            hidden: new fields.BooleanField({ required: true, initial: false }),
            uuid: new fields.StringField({ required: true }),
            version: new fields.StringField({ required: true }),
            img: new fields.StringField({ required: true }),
            texture: new fields.StringField({ required: true }),
            name: toggleStringField(),
            ac: toggleNumberField(),
            hp: toggleNumberField(),
            level: toggleNumberField(),
            size: new fields.StringField({ required: true }),
            skills: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                empty: new fields.BooleanField({ initial: false }),
                lore: new fields.BooleanField({}),
                note: new fields.StringField({}),
                modifiers: new fields.ArrayField(new fields.SchemaField({
                    kind: new fields.StringField({}),
                    label: new fields.StringField({}),
                    modifier: new fields.NumberField({ integer: true }),
                }), { initial: []}),
                label: new fields.StringField({}),
                value: new fields.StringField({ required: true }),
                totalModifier: new fields.NumberField({ required: false, integer: true }),
            })),
            abilities: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                custom: new fields.StringField({ nullable: true }),
                mod: new fields.NumberField({ required: true, integer: true }),
                key: new fields.StringField({ required: true }),
            })),    
            saves: new fields.SchemaField({
                fortitude: toggleNumberField(),
                reflex: toggleNumberField(),
                will: toggleNumberField(),
            }),
            speeds: new fields.SchemaField({
                details: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    name: new fields.StringField({ required: true }),
                }, { required: false }),
                values: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    name: new fields.StringField({ required: true }),
                    value: new fields.NumberField({ required: true, integer: true })
                }))
            }),
            immunities: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({ initial: false }),
                type: new fields.StringField({ required: true }),
                exceptions: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
            })),
            weaknesses: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({ initial: false }),
                type: new fields.StringField({ required: true }),
                value: new fields.NumberField({ required: true, integer: true }),
                exceptions: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
            })),
            resistances: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({ initial: false }),
                type: new fields.StringField({ required: true }),
                value: new fields.NumberField({ required: true, integer: true }),
                exceptions: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
                doubleVs: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    type: new fields.StringField({ required: true }) 
                })),
            })),
            rarity: new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.StringField({ required: true }),
            }),
            traits: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                value: new fields.StringField({ required: true }) 
            })),
            attacks: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({}),
                damageStatsRevealed: new fields.BooleanField({ required: true, initial: false }),
                label: new fields.StringField({ required: true }),
                actions: new fields.StringField({ required: true }),
                totalModifier: new fields.NumberField({ required: true }),
                isMelee: new fields.BooleanField({ required: true }),
                traits: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true }),
                    description: new fields.StringField({ required: true }),
                })),
                variants: new MappingField(new fields.SchemaField({
                    label: new fields.StringField({}),
                })),
                damageInstances: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({  }),
                    category: new fields.StringField({ nullable: true }),
                    damage: new fields.SchemaField({
                        value: new fields.StringField({ nullable: true }),
                    }),
                    damageType: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({ required: true })
                    })
                })),
                rules: new fields.ObjectField({}),
            })),
            actions: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({}),
                label: new fields.StringField({ required: true }),
                actions: new fields.StringField({ required: true }),
                traits: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true })
                })),
                description: new fields.HTMLField({ required: true, initial: '' }),
            })),
            passives: new MappingField(new fields.SchemaField({
                revealed: new fields.BooleanField({ required: true, initial: false }),
                fake: new fields.BooleanField({}),
                empty: new fields.BooleanField({}),
                label: new fields.StringField({ required: true }),
                traits: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true })
                })),
                description: new fields.HTMLField({ required: true, initial: '' }),
            })),
            spells: new fields.SchemaField({
                fake: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                }, { nullable: true, initial: null }),
                entries: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    tradition: new fields.StringField({ required: true }),
                    category: new fields.StringField({ required: true }),
                    dc: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.NumberField({ required: true, integer: true }),
                    }),
                    attack: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.NumberField({ required: true, integer: true }),
                    }),
                    mod: new fields.SchemaField({
                        value: new fields.NumberField({ required: true, integer: true }),
                    }),
                    levels: new MappingField(new fields.SchemaField({
                        value: new fields.StringField({ required: true }),
                        spells: new MappingField(new fields.SchemaField({
                            revealed: new fields.BooleanField({ required: true, initial: false }),
                            label: new fields.StringField({ required: true }),
                            img: new fields.StringField({ required: true }),
                            actions: new fields.StringField({ required: true }),
                            defense: new fields.SchemaField({
                                statistic: new fields.StringField({}),
                                basic: new fields.BooleanField({}),
                            }, { required: false, nullable: true, initial: null }),
                            range: new fields.StringField({}),
                            traits: new fields.SchemaField({
                                rarity: new fields.StringField({ required: true }),
                                traditions: new fields.ArrayField(new fields.StringField({})),
                                values: new MappingField(new fields.SchemaField({
                                    value: new fields.StringField({ required: true }),
                                })),
                            }),
                            description: new fields.SchemaField({
                                gm: new fields.HTMLField({ required: true }),
                                value: new fields.HTMLField({ required: true }),
                            }),
                        })),
                    })),
                }))
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
                senses: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    fake: new fields.BooleanField({}),
                    type: new fields.StringField({ required: true }),
                })),
            }),
            languages: new fields.SchemaField({
                details: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.StringField({ required: true }),
                }),
                values: new MappingField(new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    fake: new fields.BooleanField({}),
                    empty: new fields.BooleanField({ initial: false }),
                    value: new fields.StringField({ required: true }),
                })),
            }),
            notes: new fields.SchemaField({
                public: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.HTMLField({ required: true, initial: '' }),
                }),
                private: new fields.SchemaField({
                    revealed: new fields.BooleanField({ required: true, initial: false }),
                    value: new fields.HTMLField({ required: true, initial: '' }),
                }),
                player: new fields.HTMLField({ required: true, initial: '' })
            }),
        };
    }

    get displayImage(){
        return game.settings.get('pf2e-bestiary-tracking', 'use-token-art') ? this.texture : this.img;
    }

    get sizeLabel(){
        return game.i18n.localize(CONFIG.PF2E.actorSizes[this.size]);
    }

    get allSenses(){
        const sensesDetails = this.senses.details.value ? { details: { ...this.senses.details, label: this.senses.details.value, isDetails: true }} : {};
        return {
            perception: { ...this.senses.perception, label: 'PF2E.PerceptionLabel', isPerception: true },
            ...sensesDetails,
            ...Object.keys(this.senses.senses).reduce((acc, sense) => {
                acc[sense] = { ...this.senses.senses[sense], label: CONFIG.PF2E.senses[this.senses.senses[sense].type] ?? this.senses.senses[sense].type };
                return acc;
            }, {}),
        };
    }

    get allLanguages(){
        const languageDetails = this.languages.details.value ? { details: { ...this.languages.details, label: this.languages.details.value, isDetails: true } } : {};
        return {
            ...Object.keys(this.languages.values).reduce((acc, key) => {
                acc[`values.${key}`] = { ...this.languages.values[key], label: CONFIG.PF2E.languages[this.languages.values[key].value] ?? this.languages.values[key].value };
    
                return acc;
            }, {}),
            ...languageDetails,
        };
    }

    get sortedSpells(){
        return {
            fake: this.spells.fake,
            entries: Object.keys(this.spells.entries).reduce((acc, entry) => {
                acc[entry] = { 
                    ...this.spells.entries[entry],
                    label: `${game.i18n.localize(CONFIG.PF2E.magicTraditions[this.spells.entries[entry].tradition])} ${game.i18n.localize(CONFIG.PF2E.preparationType[this.spells.entries[entry].category])} ${game.i18n.localize("PF2E.Item.Spell.Plural")}`,
                    levels: Object.keys(this.spells.entries[entry].levels).reduce((acc, levelKey) => {
                        const level = this.spells.entries[entry].levels[levelKey];
                        acc.push({
                            ...level,
                            key: levelKey,
                            revealed: Object.values(level.spells).some(x => x.revealed),
                            label: levelKey === 'Cantrips' ? 
                                game.i18n.localize('PF2E.Actor.Creature.Spellcasting.Cantrips') : 
                                game.i18n.format('PF2E.Item.Spell.Rank.Ordinal', { rank: game.i18n.format("PF2E.OrdinalNumber", { value: level.value, suffix: levelKey === '1' ? 'st' : levelKey === '2' ? 'nd' : levelKey === '3' ? 'rd' : 'th' }) }),
                            spells: Object.keys(level.spells).reduce((acc, spell) => {
                                acc[spell] = {
                                    ...level.spells[spell],
                                    defense: !level.spells[spell].defense ? null : 
                                        { ...level.spells[spell].defense, label: level.spells[spell].defense.basic ? 
                                            game.i18n.format('PF2E.InlineCheck.BasicWithSave', { save: game.i18n.localize(CONFIG.PF2E.saves[level.spells[spell].defense.statistic]) }) : 
                                            game.i18n.localize(CONFIG.PF2E.saves[level.spells[spell].defense.statistic]) 
                                        }
                                };
    
                                return acc;
                            }, {}),
                        });
    
                        return acc;
                    }, []).sort((a, b) => {
                        if(a.key === 'Cantrips' && b.key !== 'Cantrips') return -1;
                        else if(a.key !== 'Cantrips' && b.key === 'Cantrips') return 1;
                        else if(a.key === 'Cantrips' && b.key === 'Cantrips') return 0;
    
                        return a.key - b.key;
                    }), 
                };
    
                return acc;
            }, {})
        };
    }

    async toggleEverything(state){
        const spells = 
            this.spells.fake ? { "spells.fake.revealed": state } :
            { "spells.entries": Object.keys(this.spells.entries).reduce((acc, key) => {
                const entry = this.spells.entries[key];
                acc[key] = {
                    revealed: state,
                    dc: { revealed: state },
                    attack: { revealed: state },
                    levels: Object.keys(entry.levels).reduce((acc, level) => {
                        acc[level] = {
                            spells: Object.keys(entry.levels[level].spells).reduce((acc, level) => {
                                acc[level] = { revealed: state };
                                return acc;
                            }, {}),
                        }
                        return acc;
                    }, {})
                };
                return acc;
            }, {})}


        await this.parent.update({
            system: {
                "name.revealed": state,
                "ac.revealed": state,
                "hp.revealed": state,
                "level.revealed": state,
                "skills": Object.keys(this.skills).reduce((acc, key) => {
                    acc[key] = { revealed: state };
                    return acc;
                }, {}),
                "abilities": Object.keys(this.abilities).reduce((acc, key) => {
                    acc[key] = { revealed: state };
                    return acc;
                }, {}),
                "saves": {
                    "fortitude.revealed": state,
                    "reflex.revealed": state,
                    "will.revealed": state,
                },
                "speeds": {
                    "details.revealed": state,
                    "values": Object.keys(this.speeds.values).reduce((acc, key) => {
                        acc[key] = { revealed: state };
                        return acc;
                    }, {}),
                },
                "immunities": Object.keys(this.immunities).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        exceptions: Object.keys(this.immunities[key].exceptions).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                    }
                    
                    return acc;
                }, {}),
                "weaknesses": Object.keys(this.weaknesses).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        exceptions: Object.keys(this.weaknesses[key].exceptions).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                    }
                    
                    return acc;
                }, {}),
                "resistances": Object.keys(this.resistances).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        exceptions: Object.keys(this.resistances[key].exceptions).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                        doubleVs: Object.keys(this.resistances[key].doubleVs).reduce((acc, ex) => {
                            acc[ex] = { revealed: state };
                            return acc;
                        }, {}),
                    }
                    
                    return acc;
                }, {}),
                "rarity.revealed": state,
                "traits": Object.keys(this.traits).reduce((acc, key) => {
                    acc[key] = { revealed: state };
                    return acc;
                }, {}),
                "attacks": Object.keys(this.attacks).reduce((acc, key) => {
                    acc[key] = {
                        revealed: state,
                        damageStatsRevealed: state,
                        traits: Object.keys(this.attacks[key].traits).reduce((acc, trait) => {
                            acc[trait] = { revealed: state };
                            return acc;
                        }, {}),
                        damageInstances: Object.keys(this.attacks[key].damageInstances).reduce((acc, damage) => {
                            acc[damage] = { damageType: { revealed: state } };
                            return acc;
                        }, {}),
                    };
                    return acc;
                }, {}),
                "actions": Object.keys(this.actions).reduce((acc, key) => {
                    acc[key] = { 
                        revealed: state,
                        traits: Object.keys(this.actions[key].traits).reduce((acc, trait) => {
                            acc[trait] = { revealed: state };
                            return acc;
                        }, {}), 
                    };
                    return acc;
                }, {}),
                "passives": Object.keys(this.passives).reduce((acc, key) => {
                    acc[key] = { 
                        revealed: state,
                        traits: Object.keys(this.passives[key].traits).reduce((acc, trait) => {
                            acc[trait] = { revealed: state };
                            return acc;
                        }, {}), 
                    };
                    return acc;
                }, {}),
                ...spells,
                "senses": {
                    "perception.revealed": state,
                    "details.revealed": state,
                    "senses": Object.keys(this.senses.senses).reduce((acc, key) => {
                        acc[key] = { revealed: state };
                        return acc;
                    }, {}),
                },
                "languages": {
                    "details.revealed": state,
                    "values": Object.keys(this.languages.values).reduce((acc, key) => {
                        acc[key] = { revealed: state };
                        return acc;
                    }, {})
                },
                "notes": {
                    "public.revealed": state,
                    "private.revealed": state,
                }
            }
        });
    }

    prepareDerivedData() {
        this.saves = {
            fortitude: { ...this.saves.fortitude, label: `${this.saves.fortitude.value > 0 ? '+' : ''}${this.saves.fortitude.value}` },
            reflex: { ...this.saves.reflex, label: `${this.saves.reflex.value > 0 ? '+' : ''}${this.saves.reflex.value}` },
            will: { ...this.saves.will, label: `${this.saves.will.value > 0 ? '+' : ''}${this.saves.will.value}` },
        };

        this.immunities = Object.keys(this.immunities).reduce((acc, key) => {
            const exceptionKeys = Object.keys(this.immunities[key].exceptions);
            acc[key] = {
                ...this.immunities[key],
                label: CONFIG.PF2E.immunityTypes[this.immunities[key].type] ?? this.immunities[key].type,
                exceptions: exceptionKeys.reduce((acc, exKey, index) => {
                    const label = CONFIG.PF2E.immunityTypes[this.immunities[key].exceptions[exKey].type];
                    const suffix = 
                        index === exceptionKeys.length-2 ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or") : 
                        index < exceptionKeys.length-1 ? ',' : 
                        index === exceptionKeys.length-1 ? ')' : '';

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
            acc[key] = {
                ...this.weaknesses[key],
                label: CONFIG.PF2E.weaknessTypes[this.weaknesses[key].type] ?? this.weaknesses[key].type,
                exceptions: exceptionKeys.reduce((acc, exKey, index) => {
                    const label = CONFIG.PF2E.weaknessTypes[this.weaknesses[key].exceptions[exKey].type];
                    const suffix = 
                        index === exceptionKeys.length-2 ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or") : 
                        index < exceptionKeys.length-1 ? ',' : 
                        index === exceptionKeys.length-1 ? ')' : '';

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

        const detailedInformation = game.settings.get('pf2e-bestiary-tracking', 'detailed-information-toggles');
        this.resistances = Object.keys(this.resistances).reduce((acc, key) => {
            const exceptionKeys = Object.keys(this.resistances[key].exceptions);
            const doubleKeys = Object.keys(this.resistances[key].doubleVs);
            const revealedDoubleKeys = doubleKeys.filter(dbKey => detailedInformation.exceptionsDouble || this.resistances[key].doubleVs[dbKey].revealed);
            acc[key] = {
                ...this.resistances[key],
                label: CONFIG.PF2E.resistanceTypes[this.resistances[key].type] ?? this.resistances[key].type,
                exceptions: exceptionKeys.reduce((acc, exKey, index) => {
                    const label = CONFIG.PF2E.resistanceTypes[this.resistances[key].exceptions[exKey].type];
                    const suffix = 
                    index === exceptionKeys.length-2 ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or") : 
                    index < exceptionKeys.length-1 ? ',' : 
                    (index === exceptionKeys.length-1 && revealedDoubleKeys.length === 0) ? ')' : 
                    (index === exceptionKeys.length-1 && revealedDoubleKeys.length > 0) ? ';' : '';

                    acc[exKey] = { ...this.resistances[key].exceptions[exKey], label: label ?? this.resistances[key].exceptions[exKey].type, suffix: suffix };
                    return acc;
                }, {}),
                doubleVs: doubleKeys.reduce((acc, doubleKey, index) => {
                    const label = CONFIG.PF2E.resistanceTypes[this.resistances[key].doubleVs[doubleKey].type];
                    const suffix = 
                    index === doubleKeys.length-2 ? game.i18n.localize("PF2EBestiary.Miscellaneous.Or") : 
                    index < doubleKeys.length-1 ? ',' : 
                    index === doubleKeys.length-1 ? ')' : '';

                    acc[doubleKey] = { ...this.resistances[key].doubleVs[doubleKey], label: label ?? this.resistances[key].doubleVs[doubleKey].type, suffix: suffix };
                    return acc;
                }, {}),
            };

            return acc;
        }, {});

        const speedDetails = this.speeds.details.value ? { details: this.speeds.details } : {};
        this.speeds.values = { 
            ...this.speeds.values,
            ...speedDetails,
        };

        this.traits = Object.keys(this.traits).reduce((acc, key) => {
            const label = CONFIG.PF2E.creatureTraits[this.traits[key].value];
            if(label){
                acc[key] = { ...this.traits[key], label: CONFIG.PF2E.creatureTraits[this.traits[key].value] };
            }

            return acc;
        }, {});

        this.abilities = Object.keys(this.abilities).reduce((acc, key) => {
            acc[key] = { ...this.abilities[key], value: `${this.abilities[key].mod >= 0 ? '+' : ''}${this.abilities[key].mod}`, label: CONFIG.PF2E.abilities[this.abilities[key].key] };

            return acc;
        }, {});

        this.skills = Object.keys(this.skills).reduce((acc, key) => {
            const skill = this.skills[key];
            if(key === 'empty' || skill.value > 0){
                acc[key] = { 
                    ...skill, 
                    label: skill.lore ? skill.label : CONFIG.PF2E.skills[key]?.label ?? (key === 'empty' ? skill.value : key)
                };
            }

            return acc;
        }, {});

        this.attacks = Object.keys(this.attacks).reduce((acc, key) => {
            const traitKeys = Object.keys(this.attacks[key].traits);
            acc[key] = { 
                ...this.attacks[key], 
                range: this.attacks[key].isMelee ? 'PF2E.NPCAttackMelee' : 'PF2E.NPCAttackRanged',
                traits: traitKeys.reduce((acc, trait, index) => {
                    acc[trait] = { 
                        ...this.attacks[key].traits[trait], 
                        label: CONFIG.PF2E.npcAttackTraits[this.attacks[key].traits[trait].value] ?? this.attacks[key].traits[trait].value,
                        description: CONFIG.PF2E.traitsDescriptions[this.attacks[key].traits[trait].description] ?? this.attacks[key].traits[trait].description,
                        suffix: index !== traitKeys.length-1 ? ',&nbsp;' : ')',
                    };
                    return acc;
                }, {}),
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
                        label: CONFIG.PF2E.npcAttackTraits[this.actions[key].traits[trait].value] ?? this.actions[key].traits[trait].value,
                        description: CONFIG.PF2E.traitsDescriptions[this.actions[key].traits[trait].value] ?? '',
                        suffix: index !== traitKeys.length-1 ? ',&nbsp;' : ''
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
                        label: CONFIG.PF2E.npcAttackTraits[this.passives[key].traits[trait].value] ?? this.passives[key].traits[trait].value,
                        description: CONFIG.PF2E.traitsDescriptions[this.passives[key].traits[trait].value] ?? '',
                        suffix: index !== traitKeys.length-1 ? ',&nbsp;' : ''
                    };

                    return acc;
                }, {}),
            };

            return acc;
        }, {});
    }
}