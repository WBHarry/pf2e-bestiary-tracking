import PF2EBestiary from "./module/bestiary.js";
import RegisterHandlebarsHelpers from "./scripts/handlebarHelpers.js";
import { registerGameSettings } from "./scripts/setup.js";
import { handleSocketEvent, socketEvent } from "./scripts/socket.js";
import * as macros from "./scripts/macros.js";

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
});

Hooks.on("combatStart", async (encounter) => {
    if(game.user.isGM){
        const autoAddMonsters = await game.settings.get('pf2e-bestiary-tracking', 'automatic-combat-registration');
        if(!autoAddMonsters) return;
    
        for(var combatant of encounter.combatants){
            await PF2EBestiary.addMonster(combatant.actor);
        } 
    
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: {},
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
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