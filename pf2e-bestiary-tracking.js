import PF2EBestiary from "./module/bestiary.js";
import RegisterHandlebarsHelpers from "./scripts/handlebarHelpers.js";
import { registerGameSettings } from "./scripts/setup.js";
import { handleSocketEvent } from "./scripts/socket.js";
import * as macros from "./scripts/macros.js";
import { handleDataMigration } from "./scripts/migrationHandler.js";
import { slugify } from "./scripts/helpers.js";

CONFIG.PF2EBestiaryTracking = { tokenClickOpenState: {
    timer: null,
    count: 0,
} };

Hooks.once('init', () => {
    registerGameSettings();
    RegisterHandlebarsHelpers.registerHelpers();
    game.socket.on(`module.pf2e-bestiary-tracking`, handleSocketEvent);

    loadTemplates([
        "modules/pf2e-bestiary-tracking/templates/partials/monsterView.hbs",
    ]);
});


Hooks.once("ready", () => {
    game.modules.get('pf2e-bestiary-tracking').macros = macros;

    handleDataMigration();
});

Hooks.once("setup", () => {
    const openBestiary = game.settings.get('pf2e-bestiary-tracking', 'doubleClickOpen');
    if(openBestiary && !game.user.isGM){
        Token.prototype.onclick = event => {
            CONFIG.PF2EBestiaryTracking.tokenClickOpenState.count += 1;
            if(CONFIG.PF2EBestiaryTracking.tokenClickOpenState.count > 1){
                window.clearTimeout(CONFIG.PF2EBestiaryTracking.tokenClickOpenState.timer);
                CONFIG.PF2EBestiaryTracking.tokenClickOpenState.count = 0;

                const settings = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
                const creatureTypes = Object.keys(CONFIG.PF2E.creatureTypes);
                const creature = event.currentTarget.actor;
                
                const category = 'monster'
                const type = creature.system.traits.value.find(x => creatureTypes.includes(x));
                var monsterSlug = slugify(creature.name);
                const monster = settings[category][type] ? settings[category][type][monsterSlug] : null;
            
                if(!monster)
                {
                    const slugById = settings[category][type] ? Object.keys(settings[category][type]).find(key => settings[category][type][key].id === creature.id) : null;
                    if(!slugById){
                        ui.notifications.info(game.i18n.localize("PF2EBestiary.Macros.ShowMonster.TargetNotInBestiary"));
                        return;
                    }
            
                    monsterSlug = slugById;
                }

                new PF2EBestiary({ category, type, monsterSlug }).render(true)
            }

            CONFIG.PF2EBestiaryTracking.tokenClickOpenState.timer = window.setTimeout(() => {
                CONFIG.PF2EBestiaryTracking.tokenClickOpenState.count = 0;
            }, 500); 
        }
    }
});

Hooks.on("combatStart", async (encounter) => {
    if(game.user.isGM){
        const automaticCombatSetting = await game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration');
        if(automaticCombatSetting === 1){
            for(var combatant of encounter.combatants){
                await PF2EBestiary.addMonster(combatant.actor);
            } 
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

Hooks.on('getSceneControlButtons', (controls) => {
    const notes = controls.find((c) => c.name === 'notes');
    if (notes) { notes.tools.push(...[
        {
            name: 'bestiary-tracking',
            title: game.i18n.localize("PF2EBestiary.Menus.Title"),
            icon: 'fa-solid fa-spaghetti-monster-flying',
            visible: true,
            onClick: () => new PF2EBestiary().render(true),
            button: true
         }
    ]); }
});