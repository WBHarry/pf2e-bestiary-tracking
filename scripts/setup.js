import { optionalFields, revealedState } from "../data/bestiaryAppearance.js";
import { getVagueDescriptionLabels } from "../data/bestiaryLabels.js";
import BestiaryAppearanceMenu from "../module/bestiaryAppearanceMenu.js";
import BestiaryIntegrationMenu from "../module/bestiaryIntegrationMenu.js";
import BestiaryLabelsMenu from "../module/bestiaryLabelsMenu.js";
import VagueDescriptionsMenu from "../module/vagueDescriptionsMenu.js";
import { newMigrateBestiary } from "./migrationHandler.js";

export const currentVersion = '0.8.13';
export const bestiaryFolder = "pf2e-bestiary-tracking-folder";
export const bestiaryJournalEntry = "pf2e-bestiary-tracking-journal-entry";

export const setupCollaborativeWrtiting = async () => {
    if(!game.folders.getName(bestiaryFolder)){
        const folder = await Folder.create({ "name": bestiaryFolder, "type": "JournalEntry" });
        const journal = await JournalEntry.create({
            name: bestiaryJournalEntry,
            pages: [],
            folder: folder.id
        });
    
        await journal.update({ "ownership.default": 3 });
    }
};

export const registerKeyBindings = () => {
    game.keybindings.register("pf2e-bestiary-tracking", "open-bestiary", {
        name: game.i18n.localize("PF2EBestiary.KeyBindings.OpenBestiary.Name"),
        hint: game.i18n.localize("PF2EBestiary.KeyBindings.OpenBestiary.Hint"),
        uneditable: [],
        editable: [],
        onDown: () => game.modules.get('pf2e-bestiary-tracking').macros.openBestiary(),
        onUp: () => {},
        restricted: false,
        reservedModifiers: [],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });

    game.keybindings.register("pf2e-bestiary-tracking", "show-monster", {
        name: game.i18n.localize("PF2EBestiary.KeyBindings.ShowMonster.Name"),
        hint: game.i18n.localize("PF2EBestiary.KeyBindings.ShowMonster.Hint"),
        uneditable: [],
        editable: [],
        onDown: () => game.modules.get('pf2e-bestiary-tracking').macros.showMonster(),
        onUp: () => {},
        restricted: false,
        reservedModifiers: [],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });

    game.keybindings.register("pf2e-bestiary-tracking", "add-monster", {
        name: game.i18n.localize("PF2EBestiary.KeyBindings.AddMonster.Name"),
        hint: game.i18n.localize("PF2EBestiary.KeyBindings.AddMonster.Hint"),
        uneditable: [],
        editable: [],
        onDown: () => game.modules.get('pf2e-bestiary-tracking').macros.addMonster(),
        onUp: () => {},
        restricted: true,
        reservedModifiers: [],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });
};

export const registerGameSettings = () => {
    configSettings();
    generalNonConfigSettings();
    vagueDescriptions();
    bestiaryLabels();
    bestiaryAppearance();
    bestiaryIntegration();
};

const configSettings = () => {
    game.settings.register('pf2e-bestiary-tracking', 'hide-token-names', {
        name: game.i18n.localize('PF2EBestiary.Settings.HideTokenNames.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.HideTokenNames.Hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        onChange: async value => {
            for(var token of canvas.tokens.placeables){
                var name = token.document.baseActor.name;
                if(value){
                    const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
                    const monster = bestiary.monster[token.document.baseActor.uuid];
                    if(monster){
                        name = monster.name.revealed && monster.name.custom ? monster.name.custom : 
                            monster.name.revealed && !monster.name.custom ? monster.name.value :
                            !monster.name.revealed ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.Unknown") : x.document.baseActor.name;
                    }
                }

                await token.document.update({ name });
            }
        },
    });
};

const generalNonConfigSettings = () => {
    game.settings.register('pf2e-bestiary-tracking', 'version', {
        name: game.i18n.localize('PF2EBestiary.Settings.Version.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.Version.Hint'),
        scope: 'world',
        config: false,
        type: String,
        default: currentVersion,
    });

    game.settings.register('pf2e-bestiary-tracking', 'bestiary-tracking', {
        name: game.i18n.localize("PF2EBestiary.Menus.Data.Name"),
        hint: game.i18n.localize("PF2EBestiary.Menus.Data.Hint"),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            monster: {},
            npc: {},
            metadata: {
                version: currentVersion
            }
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
                skills: false,
                attacks: false,
                damage: false,
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
    });

    game.settings.register('pf2e-bestiary-tracking', 'hide-ability-descriptions', {
        name: game.i18n.localize('PF2EBestiary.Settings.HideAbilityDescriptions.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.HideAbilityDescriptions.Hint'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
    });

    game.settings.register('pf2e-bestiary-tracking', 'detailed-information-toggles', {
        name: game.i18n.localize('PF2EBestiary.Settings.DetailedInformation.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.DetailedInformation.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            exceptionsDouble: false,
            attackTraits: false,
            damageTypes: false,
            abilityTraits: false,
        },
    });

    game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-appearance", {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryAppearance.Menu.Hint'),
        icon: "fa-solid fa-sitemap",
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

    game.settings.register('pf2e-bestiary-tracking', 'optional-fields', {
        name: game.i18n.localize('PF2EBestiary.Settings.OptionalFields.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.OptionalFields.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            ...optionalFields
        },
    });

    game.settings.register('pf2e-bestiary-tracking', 'additional-creature-types', {
        name: game.i18n.localize('PF2EBestiary.Settings.AdditionalCreatureTypes.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AdditionalCreatureTypes.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: [],
    });
};

const bestiaryIntegration = () => {
    game.settings.registerMenu("pf2e-bestiary-tracking", "bestiary-integration", {
        name: game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Menu.Name'),
        label: game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Menu.Label'),
        hint: game.i18n.localize('PF2EBestiary.Menus.BestiaryIntegration.Menu.Hint'),
        icon: "fa-solid fa-feather",
        type: BestiaryIntegrationMenu,
        restricted: true
    });

    game.settings.register('pf2e-bestiary-tracking', 'automatic-combat-registration', {
        name: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Hint'),
        scope: 'world',
        config: false,
        type: Number,
        choices: {
            0: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.Never'),
            1: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.StartOfCombat'),
            2: game.i18n.localize('PF2EBestiary.Settings.AutomaticCombatRegistration.Choices.CreatureDefeated'),
        },
        default: 0,
    });

    game.settings.register('pf2e-bestiary-tracking', 'doubleClickOpen', {
        name: game.i18n.localize('PF2EBestiary.Settings.DoubleClickOpen.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.DoubleClickOpen.Hint'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
        onChange: async value => {
            if(!value || !game.user.isGM) return;

            const bestiary = await newMigrateBestiary(async (_, monster) => {
                const origin = await fromUuid(monster.uuid);

                await origin?.update({ "ownership.default": origin.ownership.default > 1 ? origin.ownership.default : 1 });
            }, game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking'));

            await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary)
        }
    });

    game.settings.register('pf2e-bestiary-tracking', 'chat-message-handling', {
        name: game.i18n.localize('PF2EBestiary.Settings.ChatMessageHandling.Name'),
        hint: game.i18n.localize('PF2EBestiary.Settings.ChatMessageHandling.Hint'),
        scope: 'world',
        config: false,
        type: Object,
        default: {
            revealRightClick: false,
            automaticReveal: {
                saves: false,
                skills: false,
                attacks: false,
                actions: false,
                spells: false,
            }
        },
    });
};