import { getMisinformationLabels } from "../data/bestiaryLabels.js";
import BestiaryLabelsMenu from "../module/bestiaryLabelsMenu.js";
import VagueDescriptionsMenu from "../module/vagueDescriptionsMenu.js";
import { migrateBestiary } from "./migrationHandler.js";
import { socketEvent } from "./socket.js";

export const registerGameSettings = () => {
    configSettings();
    generalNonConfigSettings();
    vagueDescriptions();
    bestiaryLabels();
};

const configSettings = () => {
    game.settings.register('pf2e-bestiary-tracking', 'automatic-combat-registration', {
        name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Hint'),
        scope: 'world',
        config: true,
        type: Number,
        choices: {
            0: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.Never'),
            1: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.StartOfCombat'),
            2: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.CreatureDefeated'),
        },
        default: 0,
    });

    game.settings.register('pf2e-bestiary-tracking', 'use-token-art', {
        name: game.i18n.localize('PF2EBestiary.Settings.UseTokenArt.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.UseTokenArt.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        onChange: async value => {
            await migrateBestiary(async (bestiary, monster, type, monsterKey) => {
                const origin = monster.uuid ? await fromUuid(monster.uuid) : monster.id ? game.actors.find(x => x.id) : null;
                if(!origin) return;

                bestiary.monster[type][monsterKey].img = value ? origin.prototypeToken.texture.src : origin.img;

                await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                    action: socketEvent.UpdateBestiary,
                    data: { },
                });
        
                Hooks.callAll(socketEvent.UpdateBestiary, {});
            });
        }
    });

    game.settings.register('pf2e-bestiary-tracking', 'automatically-open-monster', {
        name: game.i18n.localize('PF2EBestiary.Settings.AutomaticallyOpenMonster.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AutomaticallyOpenMonster.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });
};

const generalNonConfigSettings = () => {
    game.settings.register('pf2e-bestiary-tracking', 'version', {
        name: game.i18n.localize('PF2EBestiary.Settings.Version.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.Version.Hint'),
        scope: 'world',
        config: false,
        type: String,
        default: '',
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

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-layout', {
        name: game.i18n.localize('PF2EBestiary.Settings.Version.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.Version.Hint'),
        scope: 'client',
        config: false,
        type: Object,
        default: {
            categories: {
                layout: 0,
            }
        },
    });
};

const vagueDescriptions = () => {
    game.settings.registerMenu("pf2e-bestiary-tracking", "vague-descriptions", {
        name: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Menu.Hint'),
        icon: "fa-solid fa-eye-low-vision",
        type: VagueDescriptionsMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'vague-descriptions', {
        name: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Name'),
        hint: game.i18n.localize('PF2EBestiary.Menus.VagueDescriptions.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            properties: {
                ac: false,
                hp: false,
                resistances: false,
                weaknesses: false,
                saves: false,
                perception: false,
                speed: false,
                attributes: false,
                spells: false,
            },
            settings: {
                playerBased: false,
                misinformationOptions: false,
            }
        },
    });
};

const bestiaryLabels = () => {
    game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-labels", {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Menu.Hint'),
        icon: "fa-solid fa-tags",
        type: BestiaryLabelsMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-labels', {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Name'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryLabels.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            misinformation: {
                ...getMisinformationLabels()
            }
        },
    });
};