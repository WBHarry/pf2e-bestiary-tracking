import PF2EBestiary from "../module/bestiary.js";

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

    if(selectedMonster.actor.type !== 'npc'){
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"))
        return;
    }

    const settings = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

    const category = 'monster'
    const monster = settings[category][selectedMonster.document ? selectedMonster.document.baseActor.uuid : selectedMonster.baseActor.uuid];

    if(!monster)
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"));
        return;
    }

    new PF2EBestiary({ category, monsterUuid: monster.uuid }).render(true)
};