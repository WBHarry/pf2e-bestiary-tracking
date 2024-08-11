export const registerGameSettings = () => {
    // game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-tracking-settings", {
    //     name: game.i18n.localize('pf2e-bestiary-tracking.bestiary-tracking-settings.label'),
    //     label: game.i18n.localize('pf2e-bestiary-tracking.bestiary-tracking-settings.title'),
    //     hint: "",
    //     icon: "fas fa-cog",
    //     type: DisplayBarSettingsMenu,
    //     restricted: true
    // });

    const monster = {
        aberration: {},
        animal: {},
        astral: {},
        beast: {},
        celestial: {},
        construct: {},
        dragon: {},
        elemental: {},
        ethereal: {},
        fey: {},
        fiend: {},
        fungus: {},
        giant: {},
        humanoid: {},
        kami: {},
        monitor: {},
        negative: {},
        ooze: {},
        petitioner: {},
        plant: {},
        positive: {},
        shadow: {},
        spirit: {},
        time: {},
    };

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-tracking', {
        name: game.i18n.localize("Bestiary"),
        hint: game.i18n.localize("Hint"),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            monster: monster,
            npc: {}
        },
    });
};