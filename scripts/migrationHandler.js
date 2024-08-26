import { getVagueDescriptionLabels } from "../data/bestiaryLabels.js";
import PF2EBestiary from "../module/bestiary.js";
import { acTable, attributeTable, savingThrowPerceptionTable, spellAttackTable, spellDCTable } from "./statisticsData.js";
import { getCategoryLabel, getRollAverage } from "./statisticsHelper.js";

export const handleDataMigration = async () => {
    if(!game.user.isGM) return;
    
    var version = await game.settings.get('pf2e-bestiary-tracking', 'version');
    if(!version){
        version = '0.8.1';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.1'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            if(!monster.name.value){
                bestiary.monster[type][monsterKey].name = { revealed: false, value: monster.name };
            }

            return null;
        });

        version = '0.8.2';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.2'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            const origin = game.actors.find(x => x.id === monster?.id);
            if(!origin){
                return { type, monsterKey };
            }

            // Attributes should now have Mod aswell as Category attributes. Can't cleanly update this but make best attempt, otherwise remove failing creatures.
            for(var ability of bestiary.monster[type][monsterKey].abilities.values){
                ability.mod = ability.value.replace('+', '');
                ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod);              
            }

            //Actions and passives and attacks should never be empty. Add a 'None' option.
            const actionKeys = Object.keys(monster.actions.values);
            if(actionKeys.length === 0){
                bestiary.monster[type][monsterKey].actions.values['None'] = { revealed: false, name: 'None' };
            }

            const passivesKeys = Object.keys(monster.passives.values);
            if(passivesKeys.length === 0){
                bestiary.monster[type][monsterKey].passives.values['None'] = { revealed: false, name: 'None' };
            }

            const attackKeys = Object.keys(monster.attacks.values);
            if(attackKeys.length === 0){
                bestiary.monster[type][monsterKey].attacks.values['None'] = { revealed: false, label: 'None' };
            }

            //Weaknesses and Resistances should use applicationLabel for type rather than the type property to include exceptions.
            Object.keys(bestiary.monster[type][monsterKey].weaknesses.values).forEach(weaknessKey => {
                const originWeakness = origin.system.attributes.weaknesses.find(x => x.label === bestiary.monster[type][monsterKey].weaknesses.values[weaknessKey].value);
                if(originWeakness) 
                {
                    bestiary.monster[type][monsterKey].weaknesses.values[weaknessKey].category = originWeakness.applicationLabel;
                }
            });

            Object.keys(bestiary.monster[type][monsterKey].resistances.values).forEach(resistanceKey => {
                const originResistance = origin.system.attributes.resistances.find(x => x.label === bestiary.monster[type][monsterKey].resistances.values[resistanceKey].value);
                if(originResistance) 
                {
                    bestiary.monster[type][monsterKey].resistances.values[resistanceKey].category = originResistance.applicationLabel;
                }
            });

            return null;
        });

        version = '0.8.4';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.4'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            const origin = game.actors.find(x => x.id === monster?.id);
            if(!origin){
                return { type, monsterKey };
            }

            // Creatures should have notes available to be revealed.
            bestiary.monster[type][monsterKey].notes = {
                public: { revealed: false, text: origin.system.details.publicNotes },
                private: { revealed: false, text: origin.system.details.privateNotes },
            };

            return null;
        });

        version = '0.8.6';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.6'){
        await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
            const origin = monster?.uuid ? await fromUuid(monster.uuid) : game.actors.find(x => x.id === monster?.id);
            if(!origin){
                return { type, monsterKey };
            }

            // All categories now use module settings values ranging from Extreme to Terrible
            bestiary.monster[type][monsterKey].ac.category = getCategoryLabel(acTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].ac.value);
            bestiary.monster[type][monsterKey].hp.category = getCategoryLabel(acTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].hp.value);
            bestiary.monster[type][monsterKey].saves.fortitude.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].saves.fortitude.value);
            bestiary.monster[type][monsterKey].saves.reflex.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].saves.reflex.value);
            bestiary.monster[type][monsterKey].saves.will.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].saves.will.value);
            bestiary.monster[type][monsterKey].abilities.values.forEach(ability => {
                // Weird error that occured here. Safety addition.
                if(typeof x === 'object'){
                    ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod)}
                }
            );
            bestiary.monster[type][monsterKey].senses.values.perception.category = getCategoryLabel(savingThrowPerceptionTable, origin.system.details.level.value, bestiary.monster[type][monsterKey].senses.values.perception.value);

            // All spellcasting creatures should have spell data
            const spellcastingEntries = {};
            for(var subItem of origin.items){
                if(subItem.type !== 'spellcastingEntry') {
                    continue;
                }

                const levels = {};
                for(var spell of subItem.spells){
                    const level = spell.isCantrip ? 'Cantrips' : spell.level;
                    if(!levels[level]) levels[level] = {};

                    levels[level][spell.id] = {
                        revealed: false,
                        id: spell.id,
                        uuid: spell.uuid,
                        name: spell.name,
                        img: spell.img,
                        actions: spell.actionGlyph,
                        defense: spell.system.defense?.save?.statistic ? `${spell.system.defense.save.basic ? 'basic ' : ''} ${spell.system.defense.save.statistic}` : null,
                        range: spell.system.range.value,
                        traits: spell.system.traits,
                        description: {
                            gm: spell.system.description.gm,
                            value: spell.system.description.value,
                        }
                    };
                }

                spellcastingEntries[subItem.id] = {
                    revealed: false,
                    name: subItem.name,
                    dc: { revealed: false, value: subItem.system.spelldc.dc, category: getCategoryLabel(spellDCTable, origin.system.details.level.value, subItem.system.spelldc.dc) },
                    attack: { revealed: false, value: subItem.system.spelldc.value, category: getCategoryLabel(spellAttackTable, origin.system.details.level.value, subItem.system.spelldc.value) },
                    levels: levels,
                };
            }
            
            bestiary.monster[type][monsterKey].spells = {
                fake: Object.keys(spellcastingEntries).length > 0 ? null : { revealed: false },
                entries: spellcastingEntries,
            };

            return null;
        });

        //VagueDescriptions Module Settings now has 'Properties' and 'Settings' subobjects
        const vagueDescriptions = await game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        await game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', {
            properties: {
                ac: vagueDescriptions.ac,
                hp: vagueDescriptions.hp,
                resistances: vagueDescriptions.resistances,
                weaknesses: vagueDescriptions.weaknesses,
                saves: vagueDescriptions.saves,
                perception: vagueDescriptions.perception,
                speed: vagueDescriptions.speed,
                attributes: vagueDescriptions.attributes,
            },
            settings: {
                playerBased: vagueDescriptions.playerBased,
                misinformationOptions: vagueDescriptions.misinformationOptions,
            }
        });
        
        version = '0.8.7';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.7'){
        await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
            if(type && monsterKey && bestiary.monster[type][monsterKey]){
                //Yes, this is very silly, but it's an attempt to save some data after a bad previous migration tactic.
                const value = bestiary.monster[type][monsterKey].level?.value?.value?.value?.value?.value ?? 
                   bestiary.monster[type][monsterKey].level?.value?.value?.value?.value ?? 
                   bestiary.monster[type][monsterKey].level?.value?.value?.value ?? 
                   bestiary.monster[type][monsterKey].level?.value?.value ??
                   bestiary.monster[type][monsterKey].level;

                if(!value || value.value){
                    return { type, monsterKey };
                }

                bestiary.monster[type][monsterKey].level = { revealed: false, value: value };
                return null;
            } else {
                return { type, monsterKey };
            }
        });

        version = '0.8.7.1';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.7.1'){
        //VagueDescriptions was poorly migrated last version. If the setting is now faulty --> set it to standard values.
        const vagueDescriptions = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        if(!vagueDescriptions.settings){
            await game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', {
                properties: {
                    ac: false,
                    hp: false,
                    resistances: false,
                    weaknesses: false,
                    saves: false,
                    perception: false,
                    speed: false,
                    attributes: false,
                },
                settings: {
                    playerBased: false,
                    misinformationOptions: false,
                }
            });
        }

        // Bestiary Labels had poorly labeled settings that actually have more to do with Vague Descriptions.
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-labels', {
            vagueDescriptions: {
                ...getVagueDescriptionLabels()
            }
        });

        await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
            const origin = monster?.uuid ? await fromUuid(monster.uuid) : null;
            if(!origin){
                return { type, monsterKey };
            }

            // Attributes need to have shortform category names
            bestiary.monster[type][monsterKey].abilities.values.forEach(ability => {
                ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod, true);
            });

            return null;
        });

        // Add filter to bestiary-layout setting
        const layoutSetting = game.settings.get('pf2e-bestiary-tracking', 'bestiary-layout');
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-layout', { 
            categories: {
                layout: layoutSetting.categories.layout,
                filter: { type: 0, direction: 0 },
            },
         });

        // Drop the Type portion of the Bestiary data. The information already exists in monster.inTypes
        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        const monsterMap = Object.keys(bestiary.monster).reduce((acc, typeKey) => {
            Object.keys(bestiary.monster[typeKey]).forEach(monsterKey => {
                const monster = bestiary.monster[typeKey][monsterKey];
                if(monster?.uuid){
                    acc.set(monster.uuid, monster);   
                } 

            });

            return acc;
        }, new Map());

        const newBestiary = Array.from(monsterMap.values()).reduce((acc, monster) => {
            acc.monster[monster.uuid] = monster;

            return acc;
        }, { monster: {}, npc: {} });

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', newBestiary);

        version = '0.8.8';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.8'){
        version = '0.8.8.4';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.8.4'){
       version = '0.8.9';
       await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9'){
        version = '0.8.9.2';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.2'){
        // Still some users with the old version of vague descriptions. Just a safety migration
        const vagueDescriptions = game.settings.get('pf2e-bestiary-tracking', 'vague-descriptions');
        if(!vagueDescriptions.properties){
            game.settings.set('pf2e-bestiary-tracking', 'vague-descriptions', {
                properties: {
                    ac: false,
                    hp: false,
                    resistances: false,
                    weaknesses: false,
                    saves: false,
                    perception: false,
                    speed: false,
                    attributes: false,
                    skills: false,
                    attacks: false,
                    damage: false,
                    spells: false,
                },
                settings: {
                    playerBased: false,
                    misinformationOptions: false,
                }
            });
        }

        version = '0.8.9.7';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.7'){
        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', { ...bestiary, metadata: { ...bestiary.metadata, version: '0.8.9' } });
        
        version = '0.8.9.8';
        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.8'){
        version = '0.8.9.8.1';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    if(version === '0.8.9.8.1'){
        version = '0.8.9.8.2';

        await game.settings.set('pf2e-bestiary-tracking', 'version', version);
    }

    const updatedBestiary = await handleBestiaryMigration(game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));
    await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', updatedBestiary);
}

export const handleBestiaryMigration = async (bestiary) => {
    const oldMonsterData = Object.keys(bestiary.monster).length > 0 && Boolean(bestiary.monster[Object.keys(bestiary.monster)[0]].traits); 
    bestiary.metadata.version = oldMonsterData ? '0.8.8' : !bestiary.metadata.version ? '0.8.9' : bestiary.metadata.version; 

    if(bestiary.metadata.version === '0.8.8'){
        bestiary = await newMigrateBestiary(async (_, monster) => {
            const origin = await fromUuid(monster.uuid);
            if(!origin) return true;
            
            // Add Total Modifier to attacks.
            monster.attacks.values = Object.keys(monster.attacks.values).reduce((acc, attackKey) => {
                const originAttack = origin.system.actions.find(x => x.weapon._id === attackKey);
                const base = originAttack?.item;
                if(base){
                    const damageInstances = [];
                    var damageLabel = '';
                    for(var damageKey of Object.keys(base.system.damageRolls)){
                        const damage = base.system.damageRolls[damageKey];
                        damageLabel = damageLabel.concat(`${damageLabel ? ' + ' : ''}${damage.damage} ${damage.damageType}`);
                        const damageRollHelper = new Roll(damage.damage);
                        
                        damageInstances.push({ label: damage.damage, average: getRollAverage(damageRollHelper.terms), type: damage.damageType, quality: damage.category  });
                    }

                    acc[base.id] = { 
                        ...monster.attacks.values[attackKey], 
                        range: base.isMelee ? 'Melee' : 'Ranged',
                        value: base.system.bonus.value,
                        damage: {
                            instances: damageInstances,
                            label: damageLabel,
                            average: damageInstances.reduce((acc, instance) => acc+instance.average, 0),
                        }
                    };
                }

                return acc;
            }, {});
        }, bestiary);

        bestiary.metadata.version = '0.8.8.4';
    }

    if(bestiary.metadata.version === '0.8.8.4'){
        // Change to storing all of actor.toObject. Lots of improvement in data retention, shouldn't be too much data.
        const uuids = Object.values(bestiary.monster).reduce((acc, monster) => {
                if(monster.uuid) acc.push(monster.uuid);
            
                return acc;
            }, []);
        const newBestiary = { monster: {}, npc: {}, metadata: {} };
        for(var uuid of uuids){
            const orig = await fromUuid(uuid);
            const data = await PF2EBestiary.getMonsterData(orig);
            const oldCreature = bestiary.monster[uuid];

            if(!data){
                continue;
            }

            /* Big Migration Block Oh-hoy */
            data.name = { ...data.name, revealed: oldCreature.name.revealed, custom: oldCreature.name.custom };
            data.system.details.level = { ...data.system.details.level, revealed: oldCreature.level.revealed, custom: oldCreature.level.custom };
            data.system.attributes.ac = { ...data.system.attributes.ac, revealed: oldCreature.ac.revealed, custom: oldCreature.ac.custom };
            data.system.attributes.hp = { ...data.system.attributes.hp, revealed: oldCreature.hp.revealed, custom: oldCreature.hp.custom };  

            Object.keys(data.system.attributes.immunities).forEach(immunityKey => {
                const oldImmunityKey = Object.keys(oldCreature.immunities).find(x => x === immunityKey);
                if(oldImmunityKey) data.system.attributes.immunities[immunityKey].revealed = oldCreature.immunities[oldImmunityKey].revealed;
            });

            Object.keys(data.system.attributes.weaknesses).forEach(weaknessKey => {
                const oldWeaknessKey = Object.keys(oldCreature.weaknesses).find(x => x === weaknessKey);
                if(oldWeaknessKey) data.system.attributes.weaknesses[weaknessKey].revealed = oldCreature.weaknesses[oldWeaknessKey].revealed;
            });

            Object.keys(data.system.attributes.resistances).forEach(resistanceKey => {
                const oldResistanceKey = Object.keys(oldCreature.resistances).find(x => x === resistanceKey);
                if(oldResistanceKey) data.system.attributes.resistances[resistanceKey].revealed = oldCreature.resistances[oldResistanceKey].revealed;
            });

            data.system.saves.fortitude = { ...data.system.saves.fortitude, revealed: oldCreature.saves.fortitude.revealed, custom: oldCreature.saves.fortitude.custom };
            data.system.saves.reflex = { ...data.system.saves.reflex, revealed: oldCreature.saves.reflex.revealed, custom: oldCreature.saves.reflex.custom };
            data.system.saves.will = { ...data.system.saves.will, revealed: oldCreature.saves.will.revealed, custom: oldCreature.saves.will.custom };
            
            data.system.attributes.speed.revealed = oldCreature.speeds.values.land.revealed;
            data.system.attributes.speed.otherSpeeds.forEach(speed => {
                const oldSpeedKey = Object.keys(oldCreature.speeds.values).find(x => speed.label === x);
                    speed.revealed = oldSpeedKey ? oldCreature.speeds.values[oldSpeedKey].revealed : false;
            });
            
            Object.keys(data.system.traits.value).forEach(traitKey => data.system.traits.value[traitKey].revealed = oldCreature.traits.values[traitKey]?.revealed);
            Object.keys(data.system.abilities).forEach(abilityKey => {
                const oldAbility = Object.values(oldCreature.abilities.values).find(x => x.label.toLowerCase() === abilityKey);
                data.system.abilities[abilityKey] = { ...data.system.abilities[abilityKey], revealed: oldAbility.revealed, custom: oldAbility.custom };
            });
            
            data.system.perception = { ...data.system.perception, revealed: oldCreature.senses.values.perception.revealed, custom: oldCreature.senses.values.perception.custom };
            data.system.perception.senses.forEach(sense => {
                const oldKey = Object.keys(oldCreature.senses.values).find(x => x === sense.type);
                const oldSense = oldKey ? oldCreature.senses.values[oldKey] : null;
                if(oldSense){
                    sense.revealed = oldSense.revealed;
                }
            });
            data.system.perception.details = { ...data.system.perception.details, revealed: oldCreature.senses.values.other?.revealed ?? false, custom: oldCreature.senses.values.other?.custom ?? null };

            Object.keys(data.system.actions).forEach(actionKey => {
                const creatureKey = Object.keys(oldCreature.attacks.values).find(key => key === actionKey);
                const creatureAction = creatureKey ? oldCreature.attacks.values[creatureKey] : null;
                if(creatureAction){
                    const action = data.system.actions[actionKey];
                    action.revealed = creatureAction.revealed;
                    action.damageStatsRevealed = creatureAction.damageStatsRevealed;
                }
            });
            
            Object.keys(data.items).forEach(itemKey => {
                const item = data.items[itemKey];
                if(item.type === 'action'){
                    if(['action', 'reaction'].includes(item.system.actionType.value)){
                        const oldKey = Object.keys(oldCreature.actions.values).find(key => key === item._id);
                        item.revealed = oldKey ? oldCreature.actions.values[oldKey].revealed : false;
                    } else {
                        const oldKey = Object.keys(oldCreature.passives.values).find(key => key === item._id);
                        item.revealed = oldKey ? oldCreature.passives.values[oldKey].revealed : false;
                    }
                }

                if(item.type === 'spell') {
                        const entry = oldCreature.spells.entries[item.system.location.value];
                        if(entry){
                            const levels = oldCreature.spells.entries[item.system.location.value].levels;
                            const levelKeys = Object.keys(levels);
                            const level = item.system.traits.value.includes("cantrip") ? 'Cantrips' : item.system.location.heightenedLevel ?? (levelKeys.length === 1 ? levelKeys[0] : item.system.level.value);
                            if(oldCreature.spells.entries[item.system.location.value]){
                                const oldSpell = levels[level][item._id];

                                item.revealed = oldSpell.revealed;
                            }
                        }
                } else if(item.type === 'spellcastingEntry'){
                    const oldEntryKey = Object.keys(oldCreature.spells.entries).find(key => key === item._id);
                    const entry = oldEntryKey ? oldCreature.spells.entries[oldEntryKey] : null;
                    if(entry){
                        item.revealed = entry.revealed;
                        item.system.spelldc.dc.revealed =  entry.dc.revealed;
                        item.system.spelldc.value.revealed = entry.attack.revealed;
                    }
                }
            });

            data.system.details.publicNotes.revealed = oldCreature.notes.public.revealed;
            data.system.details.privateNotes.revealed = oldCreature.notes.private.revealed;
            /* Big Migration Block Oh-hoy */

            newBestiary.monster[uuid] = data;
        }

        bestiary = newBestiary;
        bestiary.metadata.version = '0.8.9';
    }

    if(bestiary.metadata.version === '0.8.9'){
        // Some creatures are missing None options for IWR and Actions/Passives/Attacks/Spells
        bestiary = await newMigrateBestiary((_, monster) => {
            const immunitiesKeys = Object.keys(monster.system.attributes.immunities);
            const weaknessesKeys = Object.keys(monster.system.attributes.weaknesses);
            const resistancesKeys = Object.keys(monster.system.attributes.resistances);

            if(immunitiesKeys.length === 0){
                monster.system.attributes.immunities['none'] = { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") };
            }
            if(weaknessesKeys.length === 0){
                monster.system.attributes.weaknesses['none'] = { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") };
            }
            if(resistancesKeys.length === 0){
                monster.system.attributes.resistances['none'] = { revealed: false, empty: true, type: game.i18n.localize("PF2EBestiary.Miscellaneous.None") };
            }

            if(Object.keys(monster.system.actions).length === 0){
                monster.system.actions['Attack-None'] = {
                    revealed: false, 
                    label: 'None', 
                    empty: true,
                    item: {
                        system: {
                            damageRolls: {}
                        },
                        _id: 'Attack-None',
                    },
                    weapon: {
                        system: {
                            traits: {
                                value: []
                            }
                        },
                    },
                    variants: [],
                    traits: [],
                    totalModifier: 0,
                };
            }

            var hasActions = false;
            var hasPassives = false;
            for(var item of Object.values(monster.items)){
                if(item.type === 'action'){
                    if(item.system.actionType.value === 'action' || item.system.actionType.value === 'reaction') hasActions = true;
                    if(item.system.actionType.value === 'passive') hasPassives = true;
                }
            }
    
            if(!hasActions) {
                monster.items['Action-None'] = {
                    _id: 'Action-None',
                    empty: true,
                    type: 'action',
                    name: 'None',
                    value: 'PF2E.Miscellaneous.None',
                    system: {
                        actionType: { value: 'action' },
                        description: {
                            value: null,
                        }
                    }
                };
            }
            if(!hasPassives) {
                monster.items['Passive-None'] = {
                    _id: 'Passive-None',
                    empty: true,
                    type: 'action',
                    name: 'None',
                    value: 'PF2E.Miscellaneous.None',
                    system: {
                        actionType: { value: 'passive' },
                        description: {
                            value: null,
                        }
                    }
                };
            }     

            const noSpells = !Object.keys(monster.items).find(x => {
                const item = monster.items[x];
                return item.type === 'spellcastingEntry'
            });
            if(noSpells) {
                monster.items['Spells-None'] = {
                    type: 'spellcastingEntry',
                    _id: 'Spell-None',
                    revealed: false,
                    system: {
                        spelldc: {
                            dc: { value: 0 },
                            value: { value: 0 },
                        }
                    }
                }
            }

        }, bestiary);

        bestiary.metadata.version = '0.8.9.2';
    }

    if(bestiary.metadata.version === '0.8.9.2'){
        //Insert reveal properties on ability traits, and attack damage types
        bestiary = await newMigrateBestiary((_, monster) => {
            for(var actionKey of Object.keys(monster.items)) {
                const action = monster.items[actionKey]
                if(action.type === 'action'){
                    // None-Actions
                    if(!action.system.traits){
                        action.system.traits = { value: [] };
                    }
                    else if (action.system.traits.value.length > 0 && !action.system.traits.value[0].value){
                        action.system.traits.value = action.system.traits.value.map(trait => ({ revealed: false, value: trait }));
                    }
                }
            };

            Object.keys(monster.system.actions).forEach(attackKey => {
                // Missing Attack-None item
                if(attackKey === 'Attack-None'){
                    monster.items['Attack-None'] = {
                        _id: 'Attack-None',
                        empty: true,
                        type: 'melee',
                        Name: 'None',
                        value: 'PF2E.Miscellaneous.None',
                        system: {
                            damageRolls: [],
                            traits: {
                                value: []
                            }
                        }
                    }
                }
                else if(monster.items[attackKey].system.damageRolls) {
                    Object.values(monster.items[attackKey].system.damageRolls).forEach(damageRoll => {
                        if(!damageRoll.damageType.value){
                            damageRoll.damageType = { revealed: false, value: damageRoll.damageType };
                        }
                    });
                }

                monster.items[attackKey].system.traits.value = Object.keys(monster.items[attackKey].system.traits.value).map(traitKey => { 
                    if(!monster.items[attackKey].system.traits.value[traitKey].value){
                        const traitsWithoutAttack = Object.keys(monster.system.actions[attackKey].traits).reduce((acc, traitKey) => {
                            if(monster.system.actions[attackKey].traits[traitKey].name !== 'attack'){
                                acc.push(monster.system.actions[attackKey].traits[traitKey]);
                            }
                            
                            return acc;
                        }, []);
                        return { revealed: traitsWithoutAttack[traitKey].revealed, value: monster.items[attackKey].system.traits.value[traitKey] };
                    } else {
                        return { ...monster.items[attackKey].system.traits.value[traitKey] };
                    }
                });
            });
        }, bestiary);

        bestiary.metadata.version = '0.8.9.7';
    }

    if(bestiary.metadata.version === '0.8.9.7'){
        bestiary = await newMigrateBestiary((_, monster) => {
            const infiniteGrabber = (object, property) => {
                if(object[property]){
                    if(object[property][property]){
                        return infiniteGrabber(object[property], property);
                    }

                    return object;
                }
            };

            Object.values(monster.items).forEach(item => {
                if(item.type === 'melee' || item.type === 'action'){
                    Object.keys(item.system.traits.value).forEach(traitKey => {
                        item.system.traits.value[traitKey] = infiniteGrabber(item.system.traits.value[traitKey], 'value'); 
                    });
                }

                if(item.type === 'melee'){
                    Object.values(item.system.damageRolls).forEach(damage => {
                        damage.damageType = infiniteGrabber(damage.damageType, 'value');
                    });
                }
            });

        }, bestiary);

        bestiary.metadata.version = '0.8.9.8.1';
    }

    if(bestiary.metadata.version === '0.8.9.8.1'){
        bestiary = await newMigrateBestiary((_, monster) => {
            Object.keys(monster.system.actions).forEach(actionKey => {
                const item = monster.items[actionKey];
                if(item.type === 'equipment'){
                    item.system.damageRolls = Object.keys(monster.system.actions[actionKey].weapon.system.damageRolls).reduce((acc, damageKey) => {
                        const damage = monster.system.actions[actionKey].weapon.system.damageRolls[damageKey];
                        acc[damageKey] = { ...damage, damageType: { revealed: false, value: damage.damageType } }

                        return acc;
                    }, {})
                    
                    // If this crops up more, make a general helper method to extract all types of rules.
                    item.system.rules.forEach(rule => {
                        if(rule.key === 'FlatModifier'){
                            item.system.damageRolls[`${rule.damageType}-${foundry.utils.randomID()}`] = {
                                damageType : { revealed: false, value: rule.damageType },
                                damage: rule.value.toString(),
                                isFromRule: true,
                            };
                        }
                    });
                }
            });
        }, bestiary);
        
        bestiary.metadata.version = '0.8.9.8.2';
    }   

    return bestiary;
};

export const migrateBestiary = async (update) => {
    const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    
    var toRemove = [];
    for(var typeKey in bestiary.monster){
        for(var monsterKey in bestiary.monster[typeKey]){
            const monster = bestiary.monster[typeKey][monsterKey];

            const result = await update(bestiary, monster, typeKey, monsterKey);
            if(result) {
                toRemove.push(result);
            } else {
                for(var inType of monster.inTypes){
                    if(typeKey !== inType){
                        bestiary.monster[inType][monsterKey] = foundry.utils.deepClone(bestiary.monster[typeKey][monsterKey]);
                    }
                }
            }
        }
    }

    for(var remove of toRemove){
        delete bestiary.monster[remove.type][remove.monsterKey];
    }
    
    await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
};

export const newMigrateBestiary = async (update, bestiary) => {
    const toRemoveSadly = [];
    for(var monsterKey in bestiary.monster){
        const monster = bestiary.monster[monsterKey];

        const failure = await update(bestiary, monster, monsterKey);
        
        // Only send back a value from update when it's a critical update. Otherwise allow unlinked actors to stay.
        if(failure){
            toRemoveSadly.push(monsterKey);
        }

        bestiary.monster[monsterKey] = foundry.utils.deepClone(bestiary.monster[monsterKey]);
    }

    for(var toRemove of toRemoveSadly){
        delete bestiary.monster[toRemove];
    }

    return bestiary;
};