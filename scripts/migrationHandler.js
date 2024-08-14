import { slugify } from "./helpers.js";
import { attributeTable } from "./statisticsData.js";
import { getCategoryLabel } from "./statisticsHelper.js";

export const handleDataMigration = async () => {
    if(!game.user.isGM) return;
    
    var version = await game.settings.get('pf2e-bestiary-tracking', 'version');
    if(!version){
        version = '0.8.1';
    }

    if(version === '0.8.1'){
        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        Object.keys(bestiary.monster).forEach(type => {
            Object.keys(bestiary.monster[type]).forEach(monsterKey => {
                const monster = bestiary.monster[type][monsterKey];

                if(!monster.name.value){
                    bestiary.monster[type][monsterKey].name = { revealed: false, value: monster.name };
                }

                for(var inType of monster.inTypes){
                    if(type !== inType){
                        bestiary.monster[inType][monsterKey] = foundry.utils.deepClone(bestiary.monster[type][monsterKey]);
                    }
                }
            });
        });

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
        version = '0.8.2';
    }

    if(version === '0.8.2'){
        await migrateBestiary((bestiary, monster, type, monsterKey) => {
            const origin = game.actors.find(x => x.id === monster.id);

            // Attributes should now have Mod aswell as Category attributes. Can't cleanly update this but make best attempt, otherwise remove failing creatures.
            var toRemoveMonster = false;
            for(var ability of bestiary.monster[type][monsterKey].abilities.values){
                if(!origin){
                    toRemoveMonster = true;
                    continue;
                }

                ability.mod = ability.value.replace('+', '');
                ability.category = getCategoryLabel(attributeTable, origin.system.details.level.value, ability.mod);              
            }

            if(toRemoveMonster) {
                delete bestiary.monster[type][monsterKey];
                return;
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
        });

        version = '0.8.3';
    }

    await game.settings.set('pf2e-bestiary-tracking', 'version', version);
}

const migrateBestiary = async (update) => {
    const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    Object.keys(bestiary.monster).forEach(type => {
        Object.keys(bestiary.monster[type]).forEach(monsterKey => {
            const monster = bestiary.monster[type][monsterKey];

            update(bestiary, monster, type, monsterKey);

            for(var inType of monster.inTypes){
                if(type !== inType){
                    bestiary.monster[inType][monsterKey] = foundry.utils.deepClone(bestiary.monster[type][monsterKey]);
                }
            }
        });
    });
    
    await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
};