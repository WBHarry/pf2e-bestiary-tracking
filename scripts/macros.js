import PF2EBestiary from "../module/bestiary.js";
import { isNPC } from "./helpers.js";
import { bestiaryFolder, bestiaryJournalEntry, currentVersion } from "./setup.js";
import { socketEvent } from "./socket.js";

export const openBestiary = async () => {
    new PF2EBestiary().render(true);
};

export const showMonster = async () => {
    const selectedMonster = game.user.targets.size > 0 ? game.user.targets.values().next().value : 
        canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0]
         : null;

    if(!selectedMonster) 
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoTarget"));
        return;
    }

    if(!selectedMonster.actor){
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoActor"));
        return;
    }

    if(selectedMonster.actor.type !== 'npc' || selectedMonster.actor.hasPlayerOwner){
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"))
        return;
    }

    const settings = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

    const actor = selectedMonster.document ? selectedMonster.document.baseActor : selectedMonster.baseActor;

    const actorIsNPC = isNPC(actor);
    const category = actorIsNPC ? 'npc' : 'monster';
    const monster = settings[category][actor.uuid];

    if(!monster)
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"));
        return;
    }

    new PF2EBestiary({ category, monsterUuid: monster.uuid, actorIsNPC: actorIsNPC }).render(true)
};

export const addMonster = async () => {
    if(!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.AddMonster.GMOnly"));
        return;
    }

    const selectedMonster = game.user.targets.size > 0 ? game.user.targets.values().next().value : 
    canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0]
    : null;

    if(!selectedMonster) 
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoTarget"));
        return;
    }

    if(selectedMonster.actor.type !== 'npc' || selectedMonster.actor.hasPlayerOwner){
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"))
        return;
    }

    const settings = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

    const category = 'monster'
    const baseActor = selectedMonster.document ? selectedMonster.document.baseActor : selectedMonster.baseActor;
    const monster = settings[category][baseActor.uuid];

    if(monster)
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.AddMonster.TargetAlreadyInBestiary"));
        return;
    }

    const successfull = await PF2EBestiary.addMonster(selectedMonster.actor);
    if(successfull){
        ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AddedToBestiary', { creatures: selectedMonster.actor.name }));
    }
    else if(successfull === false){
        ui.notifications.info(game.i18n.format('PF2EBestiary.Bestiary.Info.AlreadyExistsInBestiary', { creatures: selectedMonster.actor.name }));
    }    
};

export const resetBestiary = async () => {
    if(!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.AddMonster.GMOnly"));
        return;
    }

    const confirmed = await Dialog.confirm({
        title: game.i18n.localize("PF2EBestiary.Macros.ResetBestiary.Title"),
        content: game.i18n.localize("PF2EBestiary.Macros.ResetBestiary.Text"),
        yes: () => true,
        no: () => false,
    });

    if(!confirmed) return;

    await game.journal.getName(bestiaryJournalEntry)?.delete();
    await game.folders.getName(bestiaryFolder)?.delete();
    
    await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', {
        monster: {},
        npc: {},
        npcCategories: {},
        metadata: {
            version: currentVersion
        }
    });
    
    const folder = await Folder.create(
    { 
       "name": bestiaryFolder, 
       "type": "JournalEntry" 
    });
            
    const journal = await JournalEntry.create({
                name: bestiaryJournalEntry,
                pages: [],
                folder: folder.id
    });
        
    await journal.update({ "ownership.default": 3 });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: { },
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});

    return true;
};