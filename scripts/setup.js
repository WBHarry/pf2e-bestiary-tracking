import { revealedState } from "../data/bestiaryAppearance.js";
import { getVagueDescriptionLabels } from "../data/bestiaryLabels.js";
import BestiaryAppearanceMenu from "../module/bestiaryAppearanceMenu.js";
import BestiaryLabelsMenu from "../module/bestiaryLabelsMenu.js";
import VagueDescriptionsMenu from "../module/vagueDescriptionsMenu.js";
import { newMigrateBestiary } from "./migrationHandler.js";
import { socketEvent } from "./socket.js";

export const registerGameSettings = () => {
    configSettings();
    generalNonConfigSettings();
    vagueDescriptions();
    bestiaryLabels();
    bestiaryAppearance();
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

    game.settings.register('pf2e-bestiary-tracking', 'automatically-open-monster', {
        name: game.i18n.localize('PF2EBestiary.Settings.AutomaticallyOpenMonster.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AutomaticallyOpenMonster.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register('pf2e-bestiary-tracking', 'show-monster-level', {
        name: game.i18n.localize('PF2EBestiary.Settings.ShowMonsterLevel.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.ShowMonsterLevel.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register('pf2e-bestiary-tracking', 'doubleClickOpen', {
        name: game.i18n.localize('PF2EBestiary.Settings.DoubleClickOpen.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.DoubleClickOpen.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        onChange: async value => {
            if(!value || !game.user.isGM) return;

            await newMigrateBestiary(async (_, monster) => {
                const origin = await fromUuid(monster.uuid);
                if(!origin) return;

                await origin.update({ "ownership.default": origin.ownership.default > 1 ? origin.ownership.default : 1 });
            });
        }
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
            monster: {},
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
                filter: {
                    type: 0,
                    direction: 0
                }
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
            vagueDescriptions: {
                ...getVagueDescriptionLabels()
            }
        },
    });
};

const bestiaryAppearance = () => {
    game.settings.register('pf2e-bestiary-tracking', 'use-token-art', {
        name: game.i18n.localize('PF2EBestiary.Settings.UseTokenArt.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.UseTokenArt.Hint'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
        onChange: async value => {
            if(!game.user.isGM) return;

            await newMigrateBestiary(async (bestiary, monster, monsterKey) => {
                const origin = await fromUuid(monster.uuid);
                if(!origin) return;

                bestiary.monster[monsterKey].img = value ? origin.prototypeToken.texture.src : origin.img;

                await game.socket.emit(`module.pf2e-bestiary-tracking`, {
                    action: socketEvent.UpdateBestiary,
                    data: { },
                });
        
                Hooks.callAll(socketEvent.UpdateBestiary, {});
            });
        }
    });

    game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-appearance", {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Hint'),
        icon: "fa-solid fa-tags",
        type: BestiaryAppearanceMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'contrast-revealed-state', {
        name: game.i18n.localize('PF2EBestiary.Settings.ContrastRevealState.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.ContrastRevealState.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            ...revealedState
        },
    });
};