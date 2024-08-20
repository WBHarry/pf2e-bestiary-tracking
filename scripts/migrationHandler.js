import { getVagueDescriptionLabels } from "../data/bestiaryLabels.js";
import { slugify } from "./helpers.js";
import { acTable, attributeTable, savingThrowPerceptionTable, spellAttackTable, spellDCTable } from "./statisticsData.js";
import { getCategoryLabel, getRollAverage } from "./statisticsHelper.js";

export const handleDataMigration = async () => {
    if(!game.user.isGM) return;
    
    var version = await game.settings.get('pf2e-bestiary-tracking', 'version');
    if(!version){
        version = '0.8.1';
    }

    if(version === '0.8.1'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            if(!monster.name.value){
                bestiary.monster[type][monsterKey].name = { revealed: false, value: monster.name };
            }

            return null;
        });

        version = '0.8.2';
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
            bestiary.monster[type][monsterKey].abilities.values.forEach(ability => ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod));
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
    }

    if(version === '0.8.8'){
        await newMigrateBestiary(async (_, monster) => {
            const origin = await fromUuid(monster.uuid);
            if(!origin) return true;
            
            // Add Total Modifier to attacks.
            monster.attacks.values = Object.keys(monster.attacks.values).reduce((acc, attackKey) => {
                const originAttack = origin.system.actions.find(x => x.slug === attackKey);
                const base = originAttack.item;
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
        });

        version = '0.8.8.4';
    }

    if(version === '0.8.8.4'){
        await newMigrateBestiary(async (_, monster) => {
            const origin = await fromUuid(monster.uuid);
            if(!origin) return true;
        
            // Add Languages
            monster.languages = {
                values: origin.system.details.languages.value.reduce((acc, language) => {
                    acc[slugify(language)] = { revealed: false, value: language };
    
                    return acc;
                }, {})
            };
            if(origin.system.details.languages.details){
                monster.languages.values['details'] = { revealed: false, value: origin.system.details.languages.details };
            }
        });

        version = '0.8.8.5';
    }

    await game.settings.set('pf2e-bestiary-tracking', 'version', version);
}

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

export const newMigrateBestiary = async (update) => {
    const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
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
    
    await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
};