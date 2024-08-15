import PF2EBestiary from "../module/bestiary.js";
import { slugify } from "./helpers.js";

export const openBestiary = async () => {
    new PF2EBestiary().render(true);
};

export const showMonster = async () => {
    const selectedMonster = game.user.targets.size > 0 ? game.user.targets.values().next().value.actor : 
        canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0].actor
         : null;

    if(!selectedMonster) 
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.NoTarget"));
        return;
    }

    if(selectedMonster.type !== 'npc'){
        ui.notifications.error(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.InvalidTarget"))
        return;
    }

    const settings = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);

    const category = 'monster'
    const type = selectedMonster.system.traits.value.find(x => creatureTypes.includes(x));
    var monsterSlug = slugify(selectedMonster.name);
    const monster = settings[category][type][monsterSlug];

    if(!monster)
    {
        const slugById = Object.keys(settings[category][type]).find(key => settings[category][type][key].id === selectedMonster.id);
        if(!slugById){
            ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"));
            return;
        }

        monsterSlug = slugById;
    }

    new PF2EBestiary({ category, type, monsterSlug }).render(true)
};