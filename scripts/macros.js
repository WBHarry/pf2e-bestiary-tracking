import PF2EBestiary from "../module/bestiary.js";
import { slugify } from "./helpers.js";

export const showMonster = async () => {
    const selectedMonster = canvas.tokens.controlled.length > 0 ? canvas.tokens.controlled[0].actor : 
        game.user.targets.size > 0 ? 
        game.user.targets.values().next().value.actor : null;

    if(!selectedMonster) 
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.NoTarget"));
        return;
    }

    const settings = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
    const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);

    const category = 'monster'
    const type = selectedMonster.system.traits.value.find(x => creatureTypes.includes(x));
    const monsterSlug = slugify(selectedMonster.name);
    const monster = settings[category][type][monsterSlug];

    if(!monster)
    {
        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.TargetNotInBestiary"));
        return;
    }

    new PF2EBestiary({ category, type, monsterSlug }).render(true)
};