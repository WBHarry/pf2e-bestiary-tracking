import VagueDescriptionsMenu from "../module/vagueDescriptionsMenu.js";

export const registerGameSettings = () => {
    game.settings.register('pf2e-bestiary-tracking', 'version', {
        name: game.i18n.localize('PF2EBestiary.Settings.Version.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.Version.Hint'),
        scope: 'world',
        config: false,
        type: String,
        default: '',
    });

    game.settings.register('pf2e-bestiary-tracking', 'automatic-combat-registration', {
        name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register('pf2e-bestiary-tracking', 'automatically-open-monster', {
        name: game.i18n.localize('PF2EBestiary.Settings.AutomaticallyOpenMonster.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AutomaticallyOpenMonster.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.registerMenu("pf2e-bestiary-tracking", "vague-descriptions", {
        name: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Hint'),
        icon: "fa-solid fa-eye-low-vision",
        type: VagueDescriptionsMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-tracking', {
        name: game.i18n.localize("PF2EBestiary.Menus.Data.Name"),
        hint: game.i18n.localize("PF2EBestiary.Menus.Data.Hint"),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            monster: Object.keys(CONFIG.PF2E.creatureTypes).reduce((acc, type) => {  
                acc[type] = {};

                return acc;
            }, {}),
            npc: {}
        },
    });

    game.settings.register('pf2e-bestiary-tracking', 'vague-descriptions', {
        name: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Name'),
        hint: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            playerBased: false,
            ac: false,
            hp: false,
            resistances: false,
            weaknesses: false,
            saves: false,
            perception: false,
            speed: false,
            attributes: false,
        },
    });
};