import PF2EBestiary from "./module/bestiary.js";
import RegisterHandlebarsHelpers from "./scripts/handlebarHelpers.js";
import { registerGameSettings } from "./scripts/setup.js";

Hooks.once('init', () => {
    registerGameSettings();
    RegisterHandlebarsHelpers.registerHelpers();
    // Hooks.on('renderJournalDirectory', (_, html) => {
    //     const button = $(`
    //         <button class="bestiary-button">
    //             ${game.i18n.localize('ForienQuestLog.QuestLog.Title')}
    //         </button>`
    //     );

    //     let footer = html.find('.directory-footer');
    //     if (footer.length === 0)
    //     {
    //         footer = $(`<footer class="directory-footer"></footer>`);
    //         html.append(footer);
    //     }
    //     footer.append(button);

    //     button.click(() =>
    //     {
    //         console.log('Test');
    //     });
    // });

    loadTemplates([
        "modules/pf2e-bestiary-tracking/templates/partials/monsterView.hbs",
    ]);
});

Hooks.on('getSceneControlButtons', (controls) => {
    const notes = controls.find((c) => c.name === 'notes');
    if (notes) { notes.tools.push(...[
        {
            name: 'bestiary-tracking',
            title: 'Bestiary Tracking',
            icon: 'fa-solid fa-spaghetti-monster-flying',
            visible: true,
            onClick: () => new PF2EBestiary().render(true),
            button: true
         }
    ]); }
});