import PF2EBestiary from "./module/bestiary.js";
import RegisterHandlebarsHelpers from "./scripts/handlebarHelpers.js";
import { bestiaryFolder, registerGameSettings, registerKeyBindings, setupCollaborativeWrtiting } from "./scripts/setup.js";
import { handleSocketEvent, socketEvent } from "./scripts/socket.js";
import * as macros from "./scripts/macros.js";
import { handleDataMigration } from "./scripts/migrationHandler.js";
import { getBaseActor } from "./scripts/helpers.js";

Hooks.once('init', () => {
    registerGameSettings();
    registerKeyBindings();
    RegisterHandlebarsHelpers.registerHelpers();
    game.socket.on(`module.pf2e-bestiary-tracking`, handleSocketEvent);

    loadTemplates([
        "modules/pf2e-bestiary-tracking/templates/partials/monsterView.hbs",
    ]);
});

Hooks.once("ready", async () => {
    game.modules.get('pf2e-bestiary-tracking').macros = macros;

    handleDataMigration();
});

Hooks.once("setup", () => {
    if(typeof libWrapper === 'function') {
        libWrapper.register('pf2e-bestiary-tracking', 'Token.prototype._onClickLeft2', function (wrapped, ...args) {
            const baseActor = args[0].currentTarget.document.baseActor;
            if(baseActor.type !== 'npc'){
                return wrapped(...args);
            }

            if(!game.user.isGM && (baseActor.ownership.default > 1 || (baseActor.ownership[game.user.id] && baseActor.ownership[game.user.id] > 1))){
                return wrapped(...args);
            }

            if(args[0].currentTarget.actor.isDead && !args[0].altKey){
                return wrapped(...args);
            }

            const openBestiary = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
            if(!openBestiary || (game.user.isGM && !args[0].altKey)) return wrapped(...args);
  
            const settings = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
            const monster = settings.monster[baseActor.uuid];

            if(!monster)
            {
                ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"));
                return;
            }

            new PF2EBestiary({ category: 'monster', monsterUuid: monster.uuid }).render(true);
        });
    }
});

Hooks.on("combatStart", async (encounter) => {
    if (game.user.isGM) {
        const added = [];
        const exists = [];
        const automaticCombatSetting = await game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration');

        if (automaticCombatSetting === 1) {
            for (var combatant of encounter.combatants.filter(combatant => combatant?.actor?.type === 'npc')) {
                const successful = await PF2EBestiary.addMonster(combatant.actor);
                if (successful && combatant?.actor?.name) {
                    added.push(combatant.actor.name);
                } 
                else if (successful === false && combatant?.actor?.name){
                    exists.push(combatant.actor.name);
                }
            }

            exists?.length && ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary', { creatures: exists.join(', ') }));
            added?.length && ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AddedToBestiary', { creatures: added.join(', ') }));
        }
    }

});

Hooks.on("updateCombatant", async (combatant, changes) => {
    if(game.user.isGM){
        const automaticCombatSetting = await game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration');
        if(automaticCombatSetting === 2 && changes.defeated){
            await PF2EBestiary.addMonster(combatant.actor);
        }
    }
});

Hooks.on("xdy-pf2e-workbench.tokenCreateMystification", token => { 
    if(!game.user.isGM) return true;

    if(game.settings.get('pf2e-bestiary-tracking', 'hide-token-names')){
        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    
        const uuid = token.baseActor?.uuid ?? token.actor.uuid;
        if(uuid){
            const monster = bestiary.monster[uuid];
            if(monster && (monster.name.revealed)){
                return false;
            }
        }
    }

    return true;
});

Hooks.on("preCreateToken", async token => {
    if(!game.user.isGM || token.actor.type !== 'npc' || token.hasPlayerOwner) return;

    if(game.settings.get('pf2e-bestiary-tracking', 'hide-token-names')){
        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        const monster = bestiary.monster[token.baseActor.uuid];
        if(monster){
            if(monster.name.revealed) {
                await token.updateSource({ name: monster.name.custom ? monster.name.custom : monster.name.value });
                return;
            }
        }

        var workBenchMystifierUsed = game.modules.get("xdy-pf2e-workbench")?.active && game.settings.get('xdy-pf2e-workbench', 'npcMystifier'); 

        if(!workBenchMystifierUsed) await token.updateSource({ name: game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown") });
    }
});

Hooks.on("renderActorDirectory", async tab => {
    if(tab.id === 'actors'){
        const buttons = $(tab.element).find('.directory-footer.action-buttons');

        buttons.prepend(`
            <button id="pf2e-bestiary-tracker">
                <i class="fa-solid fa-spaghetti-monster-flying" />
                <span style="font-size: var(--font-size-14); font-family: var(--font-primary); font-weight: 400;">${game.i18n.localize("PF2EBestiary.Name")}</span>
            </button>`
        );

        $(buttons).find('#pf2e-bestiary-tracker')[0].onclick = () => {
            new PF2EBestiary().render(true);
        };
    }
});

Hooks.on("createChatMessage", async (message) => {
    if(game.user.isGM && message.flags.pf2e && Object.keys(message.flags.pf2e).length > 0){
        const { automaticReveal } = game.settings.get('pf2e-bestiary-tracking', 'chat-message-handling');
        if(automaticReveal){
            const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

            if(message.flags.pf2e.origin){
                // Attacks | Actions | Spells
                const actor = await fromUuid(message.flags.pf2e.origin.actor);
                if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return;

                const actorUuid = getBaseActor(actor).uuid;
                const monster = bestiary.monster[actorUuid];

                const item = await fromUuid(message.flags.pf2e.origin.uuid);
                if(monster && item){
                    if(message.flags.pf2e.modifierName && automaticReveal.attacks){
                        const monsterItem = monster.system.actions[item.id];
                        if(monsterItem){
                            monsterItem.revealed = true;
                        }
                    }

                    if(message.flags.pf2e.origin.type === 'action' && automaticReveal.actions){
                        monster.items[item.id].revealed = true;
                    }

                    if(['spell', 'spell-cast'].includes(message.flags.pf2e.origin.type) && automaticReveal.spells){
                        monster.items[item.id].revealed = true;
                        monster.items[message.flags.pf2e.casting.id].revealed = true;
                    }
                }
            }
            else {
                 // Skills | Saving Throws
                 const actor = await fromUuid(`Actor.${message.flags.pf2e.context.actor}`);
                 if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return;

                 const actorUuid = getBaseActor(actor).uuid;
                 const monster = bestiary.monster[actorUuid];

                 if(monster){
                     if(message.flags.pf2e.context.type === 'skill-check' && automaticReveal.skills)
                     {
                         const skill = monster.system.skills[message.flags.pf2e.modifierName];
                         if(skill){
                             skill.revealed = true;
                         }
                         
                     }
                     if(message.flags.pf2e.context.type ==='saving-throw' && automaticReveal.saves){
                         const savingThrow = monster.system.saves[message.flags.pf2e.modifierName];
                         if(savingThrow){
                             savingThrow.revealed = true;
                         }
                     }
                 }
            }
            
            await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
            await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                action: socketEvent.UpdateBestiary,
                data: { },
            });
    
            Hooks.callAll(socketEvent.UpdateBestiary, {});
            
        }
    }
});

Hooks.on("getChatLogEntryContext", (_, options) => {
    options.push({
        name: game.i18n.localize("PF2EBestiary.Interactivity.RevealAbility"),
        icon: '<i class="fa-solid fa-eye"></i>',
        condition: li => {
            if(!game.user.isGM) return false;

            const message = game.messages.get(li.data().messageId);
            const actorUuid = message.flags.pf2e?.origin?.actor ?? null;
            const actorId = message.flags.pf2e?.context?.actor ?? null;
            if(actorUuid || actorId){
                const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
                const actor = game.actors.find(x => x.uuid === actorUuid || x.id === actorId);

                if(actor.type !== 'npc' || actor.hasPlayerOwner) return false;

                return Boolean(bestiary.monster[actor.uuid]);
            }

            return false;
        },
        callback: async li => {
            const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
            const message = game.messages.get(li.data().messageId);
            const actorUuid = message.flags.pf2e?.origin?.actor ?? null;
            const actorId = message.flags.pf2e?.context?.actor ?? null;
            if(actorUuid){
                const actor = getBaseActor(await fromUuid(message.flags.pf2e?.origin?.actor));
                if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return;

                const rollOptions = message.flags.pf2e.origin.rollOptions;
                const itemIdSplit = rollOptions.find(option => option.includes('item:id'))?.split(':') ?? null;
                if(actor && itemIdSplit){
                    const bestiaryEntry = bestiary.monster[actor.uuid];
                    if(bestiaryEntry){               
                        const item = actor.items.get(itemIdSplit[itemIdSplit.length-1]);

                        if(message.flags.pf2e.modifierName){
                            const monsterItem = bestiaryEntry.system.actions[item.id];
                            if(monsterItem){
                                monsterItem.revealed = true;
                            }
                        } else {
                            switch(item.type){
                                case 'action':
                                    bestiaryEntry.items[item.id].revealed = true;
                                    break;
                                case 'spell':
                                case 'spell-cast':
                                    bestiaryEntry.items[item.id].revealed = true;
                                    bestiaryEntry.items[item.system.location.value].revealed = true;
                                    break;
                            }
                        }
                    }
                }
            }
            else if (actorId){
                // Skills | Saving Throws
                const actor = game.actors.find(x => x.id === actorId);
                if(actor.type !== 'npc' || actor.hasPlayerOwner) return;

                const actorUuid = getBaseActor(actor).uuid;
                const monster = bestiary.monster[actorUuid];
                if(monster){
                    if(message.flags.pf2e.context.type === 'skill-check')
                    {
                        const skill = monster.system.skills[message.flags.pf2e.modifierName];
                        if(skill){
                            skill.revealed = true;
                        }
                        
                    }
                    if(message.flags.pf2e.context.type ==='saving-throw'){
                        const savingThrow = monster.system.saves[message.flags.pf2e.modifierName];
                        if(savingThrow){
                            savingThrow.revealed = true;
                        }
                    }
                }
            }

            if(actorUuid || actorId){
                await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
                await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                    action: socketEvent.UpdateBestiary,
                    data: { },
                });
        
                Hooks.callAll(socketEvent.UpdateBestiary, {});    
            }
        }
    })
});

Hooks.on('getDirectoryApplicationEntryContext', (_, buttons) => {
    buttons.push({
        name: game.i18n.localize("PF2EBestiary.Interactivity.RegisterInBestiary"),
        icon: '<i class="fa-solid fa-spaghetti-monster-flying"></i>',
        condition: li => {
            if(!game.user.isGM) return false;

            const actor = game.actors.get(li.data().documentId);
            if(!actor || actor.type !== 'npc' || actor.hasPlayerOwner) return false;

            const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
            return !Boolean(bestiary.monster[actor.uuid]);
        },
        callback: async li => {
            const actor = game.actors.get(li.data().documentId);  
            const successfull = await PF2EBestiary.addMonster(actor);
            if(successfull){
                ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AddedToBestiary', { creatures: actor.name }));
            }
            else if(successfull === false){
                ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary', { creatures: actor.name }));
            }    
        }
    });
});

Hooks.on('renderJournalDirectory', (_, html) => {   
    const folder = game.journal.directory.folders.find(folder => folder.name === bestiaryFolder);
    if (folder)
    {
        const element = html.find(`.folder[data-folder-id="${folder.id}"]`);
        if (element)
        {
            element.remove();
        }
    }
});