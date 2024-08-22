import PF2EBestiary from "./module/bestiary.js";
import RegisterHandlebarsHelpers from "./scripts/handlebarHelpers.js";
import { registerGameSettings } from "./scripts/setup.js";
import { handleSocketEvent } from "./scripts/socket.js";
import * as macros from "./scripts/macros.js";
import { handleDataMigration } from "./scripts/migrationHandler.js";
import { slugify } from "./scripts/helpers.js";

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