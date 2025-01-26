import {
  getCreaturesTypes,
  getExpandedCreatureTypes,
  getHazardCategories,
  getHazardTypes,
  getNPCCategories,
  getEntityType,
  slugify,
  isValidEntityType,
  getUsedBestiaryTypes,
  saveDataToFile,
  getAllFolderEntries,
  alphaSort,
} from "../scripts/helpers.js";
import { resetBestiary } from "../scripts/macros.js";
import { socketEvent } from "../scripts/socket.js";
import { getCategoryRange } from "../scripts/statisticsHelper.js";
import {
  dispositions,
  npcCategorySortOptions,
  recallKnowledgeOutcomes,
} from "../data/constants.js";
import Tagify from "@yaireo/tagify";
import {
  getCreatureData,
  getHazardData,
  getNPCData,
} from "../data/modelHelpers.js";
import BestiarySelection from "./bestiarySelection.js";
import { ExpandedDragDrop } from "../scripts/expandedDragDrop.js";
import AvatarMenu from "./avatarMenu.js";
import AvatarLinkMenu from "./actorLinkMenu.js";
import ImportDialog from "./importDialog.js";
import {
  acTable,
  attributeTable,
  hpTable,
  savingThrowPerceptionTable,
  skillTable,
  weaknessTable,
} from "../scripts/statisticsData.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const defaultSelectedAbilities = () => ({
  actions: new Set(),
  passives: new Set(),
  spells: new Set(),
});

export default class PF2EBestiary extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(page, options) {
    super({});

    this.bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );

    var monsterCreatureType = null;
    if (page) {
      monsterCreatureType = page.system.initialType;
    }

    const { active: bestiaryJournalActive } = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-journal-settings",
    );
    const usedBestiaryTypes = getUsedBestiaryTypes();
    const defaultCategory =
      usedBestiaryTypes.length > 1 &&
      (bestiaryJournalActive ||
        !game.settings.get("pf2e-bestiary-tracking", "hide-tips"))
        ? null
        : getUsedBestiaryTypes()[0];

    this.selected = {
      category: options?.category ?? page?.type ?? defaultCategory,
      type: options?.type ?? monsterCreatureType,
      monster: page,
      abilities: defaultSelectedAbilities(),
    };

    // Filter 0 = Alphebetic, 1 = by level
    // Direction 0 = Ascending, 1 = Descending
    this.search = {
      name: "",
    };

    this.npcData = {
      editMode: false,
      npcView: page?.type === "pf2e-bestiary-tracking.npc" ? true : false,
      newCategory: {
        text: null,
        description: null,
      },
    };

    this.dragData = {
      bookmarkActive: false,
    };

    this.gmView = game.user.isGM;

    this._dragDrop = this._createDragDropHandlers();

    document.addEventListener("keydown", this.switchPlayerMode);
    document.addEventListener("keyup", this.resetPlayerMode);

    this.onUpdateBestiaryId = Hooks.on(
      socketEvent.UpdateBestiary,
      this.onBestiaryUpdate.bind(this),
    );
    this.onDeleteCombatId = Hooks.on(
      "deleteCombat",
      this.onDeleteCombat.bind(this),
    );
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.Bestiary.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-bestiary",
    classes: [
      "pf2e-bestiary-tracking",
      "bestiary",
      "application-border-container",
    ],
    position: { width: 800, height: 800 },
    actions: {
      selectCategory: this.selectCategory,
      selectBookmark: this.selectBookmark,
      selectMonster: this.selectMonster,
      removeMonster: this.removeMonster,
      toggleHideMonster: this.toggleHideMonster,
      toggleStatistics: this.toggleStatistics,
      returnButton: this.returnButton,
      toggleAbility: this.toggleAbility,
      toggleRevealed: this.toggleRevealed,
      toggleAllRevealed: this.toggleAllRevealed,
      revealEverything: this.revealEverything,
      hideEverything: this.hideEverything,
      toggleActorSheet: this.toggleActorSheet,
      openActorLinkMenu: this.openActorLinkMenu,
      refreshBestiary: this.refreshBestiary,
      handleSaveSlots: this.handleSaveSlots,
      resetBestiary: this.resetBestiary,
      clearSearch: this.clearSearch,
      toggleFilterDirection: this.toggleFilterDirection,
      createMisinformation: this.createMisinformation,
      imagePopout: this.imagePopout,
      setCategoriesLayout: this.setCategoriesLayout,
      addNpcCategory: this.addNpcCategory,
      toggleHideNPCCategory: this.toggleHideNPCCategory,
      addInfluence: this.addInfluence,
      increaseInfluence: this.increaseInfluence,
      decreaseInfluence: this.decreaseInfluence,
      removeProperty: this.removeProperty,
      exportEntity: this.exportEntity,
      importEntity: this.importEntity,
      transformNPC: this.transformNPC,
      transformCreature: this.transformCreature,
      openDocument: this.openDocument,
      removeRecallKnowledgeJournal: this.removeRecallKnowledgeJournal,
      imageMenu: this.imageMenu,
      copyEntityLink: this.copyEntityLink,
      toggleRecallAttempt: this.toggleRecallAttempt,
      resetRecallAttempts: this.resetRecallAttempts,
      displayRecallKnowledgePopup: this.displayRecallKnowledgePopup,
    },
    form: { handler: this.updateData, submitOnChange: true },
    window: {
      resizable: true,
      controls: [
        {
          icon: "fa-solid fa-arrow-rotate-left",
          label: "PF2EBestiary.Bestiary.WindowControls.RefreshBestiary",
          action: "refreshBestiary",
        },
        {
          icon: "fa-solid fa-right-left",
          label: "PF2EBestiary.Bestiary.WindowControls.BestiarySelection",
          action: "handleSaveSlots",
        },
        {
          icon: "fa-solid fa-link-slash",
          label: "PF2EBestiary.Bestiary.WindowControls.ResetBestiary",
          action: "resetBestiary",
        },
        {
          icon: "fa-solid fa-eye",
          label: "PF2EBestiary.Bestiary.WindowControls.RevealAll",
          action: "revealEverything",
        },
        {
          icon: "fa-solid fa-eye-slash",
          label: "PF2EBestiary.Bestiary.WindowControls.HideAll",
          action: "hideEverything",
        },
        {
          icon: "fas fa-file-export fa-fw",
          label: "PF2EBestiary.Bestiary.WindowControls.ExportEntity",
          action: "exportEntity",
        },
        {
          icon: "fas fa-file-import fa-fw",
          label: "PF2EBestiary.Bestiary.WindowControls.ImportEntity",
          action: "importEntity",
        },
        {
          icon: "fa-solid fa-toggle-on",
          label: "PF2EBestiary.Bestiary.WindowControls.TransformNPC",
          action: "transformNPC",
        },
        {
          icon: "fa-solid fa-toggle-on",
          label: "PF2EBestiary.Bestiary.WindowControls.TransformCreature",
          action: "transformCreature",
        },
      ],
    },
    dragDrop: [
      { dragSelector: null, dropSelector: ".recall-knowledge-container" },
      { dragSelector: ".bookmark-container.draggable", dropSelector: null },
      { dragSelector: null, dropSelector: ".npc-players-inner-container" },
    ],
  };

  static PARTS = {
    application: {
      id: "bestiary",
      template: "modules/pf2e-bestiary-tracking/templates/bestiary.hbs",
      scrollable: [
        ".left-monster-container",
        ".right-monster-container-data",
        ".right-npc-container-data",
        ".type-overview-container",
        ".spells-tab",
      ],
    },
  };

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    $(htmlElement)
      .find(".toggle-container:not(.misinformation)")
      .on("contextmenu", this.obscureData.bind(this));
    $(htmlElement)
      .find(".misinformation")
      .on("contextmenu", this.unObscureData.bind(this));
    $(htmlElement)
      .find(".bookmark.npc")
      .on("contextmenu", this.removeBookmark.bind(this));
    $(htmlElement)
      .find(".bestiary-tab.hideable")
      .on("contextmenu", this.hideTab.bind(this));
    $(htmlElement)
      .find(".npcCategorySortSelect")
      .on("change", this.updateNPCCategorySort.bind(this));

    this._dragDrop.forEach((d) => d.bind(htmlElement));

    const npcCategoryInput = $(htmlElement).find(".npc-category-input")[0];
    if (npcCategoryInput) {
      const tagFunc = (tagData) => {
        const hidden = this.selected.monster.system.npcData.categories.find(
          (x) => x.value === tagData.value,
        )?.hidden;
        return `
                <tag
                    contenteditable='false'
                    spellcheck='false'
                    tabIndex="-1"
                    class="tagify__tag tagify--noAnim tagify-hover-parent"
                >
                    <x title='' class='tagify__tag__removeBtn' role='button' aria-label='remove tag'></x>
                    <i class="tagify-hidden-button primary-container ${hidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}"></i>
                    <div>
                        <span class="tagify__tag-text">${tagData.name}</span>
                    </div>
                </tag>
            `;
      };

      const suggestionClick = this.clickTraitSuggestion.bind(this);
      const beforeRemoveTag = this.removeTraitTag.bind(this);

      const traitsTagify = new Tagify(npcCategoryInput, {
        tagTextProp: "name",
        enforceWhitelist: true,
        whitelist: this.bestiary
          .getFlag("pf2e-bestiary-tracking", "npcCategories")
          .map((x) => ({ value: x.value, name: x.name })),
        placeholder: game.i18n.localize(
          "PF2EBestiary.Bestiary.Miscellaneous.CategoryPlaceholder",
        ),
        dropdown: {
          mapValueTo: "name",
          searchKeys: ["name"],
          enabled: 0,
          maxItems: 20,
          closeOnSelect: true,
          highlightFirst: false,
        },
        hooks: {
          suggestionClick,
          beforeRemoveTag,
        },
        templates: {
          tag: tagFunc.bind(this),
        },
      });

      traitsTagify.on("click", this.updateNpcCategoryHidden.bind(this));
    }
  }

  clickTraitSuggestion = (e) => {
    const value = e.target
      .closest(".tagify__dropdown__item")
      .getAttribute("value");

    const data = this.bestiary
      .getFlag("pf2e-bestiary-tracking", "npcCategories")
      .find((x) => x.value === value);
    const currentCategories = this.selected.monster.system.npcData.categories;
    const newCategories = currentCategories.some((x) => x.value === data.value)
      ? currentCategories
      : [...currentCategories, data];
    const entity = this.selected.monster;

    return new Promise(async function (resolve, reject) {
      await entity.update({ "system.npcData.categories": newCategories });

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });

      Hooks.callAll(socketEvent.UpdateBestiary, {});

      resolve();
    });
  };

  removeTraitTag = (e) => {
    const currentCategories = this.selected.monster.system.npcData.categories;
    const newCategories = currentCategories.filter(
      (x) => x.value !== e[0].data.value,
    );
    const entity = this.selected.monster;

    return new Promise(async function (resolve, reject) {
      await entity.update({ "system.npcData.categories": newCategories });

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });

      Hooks.callAll(socketEvent.UpdateBestiary, {});

      resolve();
    });
  };

  changeTab(
    tab,
    group,
    { event, navElement, force = false, updatePosition = true } = {},
  ) {
    if (!tab || !group)
      throw new Error("You must pass both the tab and tab group identifier");
    if (this.tabGroups[group] === tab && !force) return;

    const tabElement = this.element.querySelector(
      `.tabs > [data-group="${group}"][data-tab="${tab}"]`,
    );
    if (!tabElement)
      throw new Error(
        `No matching tab element found for group "${group}" and tab "${tab}"`,
      );

    const generalSidebarActive =
      group === "creature" && ["statistics", "spells", "lore"].includes(tab);

    for (const t of this.element.querySelectorAll(
      `.tabs > [data-group="${group}"]`,
    )) {
      t.classList.toggle("active", t.dataset.tab === tab);
    }

    for (const section of this.element.querySelectorAll(
      `.tab[data-group="${group}"]`,
    )) {
      section.classList.toggle(
        "active",
        section.dataset.tab === tab ||
          (generalSidebarActive && section.dataset.tab === "generalSidebar"),
      );
    }
    this.tabGroups[group] = tab;

    if (!updatePosition) return;
    const positionUpdate = {};
    if (this.options.position.width === "auto") positionUpdate.width = "auto";
    if (this.options.position.height === "auto") positionUpdate.height = "auto";
    if (!foundry.utils.isEmpty(positionUpdate))
      this.setPosition(positionUpdate);
  }

  _updateFrame(options) {
    if (this.selected.monster) {
      super._updateFrame({ window: { controls: true } });
    } else {
      super._updateFrame(options);
    }
  }

  _getHeaderControls() {
    return (
      this.options.window.controls?.filter(
        this.filterHeaderControls.bind(this),
      ) || []
    );
  }

  filterHeaderControls(control) {
    switch (control.action) {
      case "importEntity":
        return game.user.isGM && !this.selected.monster;
      case "transformNPC":
        return (
          game.user.isGM &&
          Boolean(
            this.selected.monster &&
              this.selected.monster.type === "pf2e-bestiary-tracking.npc",
          )
        );
      case "transformCreature":
        return (
          game.user.isGM &&
          Boolean(
            this.selected.monster &&
              this.selected.monster.type === "pf2e-bestiary-tracking.creature",
          )
        );
      case "exportEntity":
      case "revealEverything":
      case "hideEverything":
        return game.user.isGM && Boolean(this.selected.monster);
      default:
        return game.user.isGM;
    }
  }

  getMonsterTabs(npc) {
    const tabs = {
      statistics: {
        active: true,
        cssClass: "",
        group: "creature",
        id: "statistics",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Statistics"),
      },
      generalSidebar: {
        active: true,
        sidebar: true,
        cssClass: "",
        group: "creature",
        id: "generalSidebar",
        icon: null,
      },
      spells: {
        active: false,
        cssClass: "",
        group: "creature",
        id: "spells",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Spells"),
      },
      lore: {
        active: false,
        cssClass: "",
        group: "creature",
        id: "lore",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Lore"),
      },
    };

    tabs["notes"] = {
      active: false,
      cssClass: "",
      group: "creature",
      id: "notes",
      icon: null,
      label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes"),
    };

    for (const v of Object.values(tabs)) {
      if (v.id === "generalSidebar") {
        v.active = this.tabGroups[v.group]
          ? ["statistics", "spells", "lore"].includes(this.tabGroups[v.group])
          : v.active;
      } else {
        v.active = this.tabGroups[v.group]
          ? this.tabGroups[v.group] === v.id
          : v.active;
      }

      v.cssClass = v.active ? "active" : "";
    }

    return tabs;
  }

  getNPCTabs() {
    const tabStates = this.selected.monster?.system?.tabStates;
    const tabs = {
      general: {
        active: true,
        cssClass: "",
        group: "npc",
        id: "general",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.General"),
      },
      influence: {
        active: false,
        cssClass: "",
        group: "npc",
        id: "influence",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.Influence"),
        hideable: true,
        hidden: tabStates?.influence?.hidden,
      },
      notes: {
        active: false,
        cssClass: "",
        group: "npc",
        id: "notes",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes"),
      },
    };

    if (this.gmView) {
      tabs.gm = {
        active: false,
        cssClass: "",
        group: "npc",
        id: "gm",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.NPCTabs.GM"),
      };
    }

    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group]
        ? this.tabGroups[v.group] === v.id
        : v.active;
      v.cssClass = v.active ? "active" : "";
    }

    return tabs;
  }

  getHazardTabs() {
    const tabs = {
      statistics: {
        active: true,
        cssClass: "",
        group: "hazard",
        id: "statistics",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Statistics"),
      },
      notes: {
        active: false,
        cssClass: "",
        group: "hazard",
        id: "notes",
        icon: null,
        label: game.i18n.localize("PF2EBestiary.Bestiary.Tabs.Notes"),
      },
    };

    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group]
        ? this.tabGroups[v.group] === v.id
        : v.active;
      v.cssClass = v.active ? "active" : "";
    }

    return tabs;
  }

  _onRender(context, options) {
    this._dragDrop = this._createDragDropHandlers.bind(this)();
  }

  async enrichTexts(selected) {
    if (!selected.monster) return;

    selected.monster.system.notes.player.enriched = await TextEditor.enrichHTML(
      selected.monster.system.notes.player.value,
    );

    if (!this.npcData.npcView) {
      for (var actionKey of Object.keys(selected.monster.system.actions)) {
        if (this.selected.abilities.actions.has(actionKey)) {
          const description = await TextEditor.enrichHTML(
            selected.monster.system.actions[actionKey].description,
          );

          selected.monster.system.actions[actionKey].enrichedDescription =
            description;
        } else
          selected.monster.system.actions[actionKey].enrichedDescription =
            selected.monster.system.actions[actionKey].description;
      }

      if (selected.monster.type !== "pf2e-bestiary-tracking.hazard") {
        selected.monster.system.notes.public.value =
          await TextEditor.enrichHTML(
            selected.monster.system.notes.public.value,
          );
        selected.monster.system.notes.private.value =
          await TextEditor.enrichHTML(
            selected.monster.system.notes.private.value,
          );

        for (var passiveKey of Object.keys(selected.monster.system.passives)) {
          if (this.selected.abilities.passives.has(passiveKey)) {
            const description = await TextEditor.enrichHTML(
              selected.monster.system.passives[passiveKey].description,
            );

            selected.monster.system.passives[passiveKey].enrichedDescription =
              description;
          } else
            selected.monster.system.passives[passiveKey].enrichedDescription =
              selected.monster.system.passives[passiveKey].description;
        }

        for (var entryKey in selected.monster.system.spells.entries) {
          const entry = selected.monster.system.spells.entries[entryKey];
          for (var levelKey in entry.levels) {
            for (var spellKey in entry.levels[levelKey].spells) {
              const spell = entry.levels[levelKey].spells[spellKey];
              if (this.selected.abilities.spells.has(spellKey)) {
                spell.enrichedDescription = await TextEditor.enrichHTML(
                  spell.description.value,
                );
              } else spell.enrichedDescription = spell.description.value;
            }
          }
        }
      }

      if (selected.monster.type === "pf2e-bestiary-tracking.hazard") {
        selected.monster.system.notes.description.value =
          await TextEditor.enrichHTML(
            selected.monster.system.notes.description.value,
          );

        selected.monster.system.stealth.details.value =
          await TextEditor.enrichHTML(
            selected.monster.system.stealth.details.value,
          );

        selected.monster.system.disable.value = await TextEditor.enrichHTML(
          selected.monster.system.disable.value,
        );

        selected.monster.system.reset.value = await TextEditor.enrichHTML(
          selected.monster.system.reset.value,
        );

        selected.monster.system.routine.value = await TextEditor.enrichHTML(
          selected.monster.system.routine.value,
        );
      }
    } else {
      if (selected.monster.type === "pf2e-bestiary-tracking.npc") {
        selected.monster.system.npcData.general.appearance.enrichedValue =
          await TextEditor.enrichHTML(
            selected.monster.system.npcData.general.appearance.value,
          );

        selected.monster.system.npcData.general.personality.enrichedValue =
          await TextEditor.enrichHTML(
            selected.monster.system.npcData.general.personality.value,
          );

        selected.monster.system.npcData.general.background.enrichedValue =
          await TextEditor.enrichHTML(
            selected.monster.system.npcData.general.background.value,
          );

        selected.monster.system.notes.gm.enriched = await TextEditor.enrichHTML(
          selected.monster.system.notes.gm.value,
        );

        for (var key of Object.keys(
          selected.monster.system.npcData.influence.discovery,
        )) {
          selected.monster.system.npcData.influence.discovery[key].label =
            await TextEditor.enrichHTML(
              selected.monster.system.npcData.influence.discovery[key].label,
            );
        }

        for (var key of Object.keys(
          selected.monster.system.npcData.influence.influenceSkills,
        )) {
          const influence =
            selected.monster.system.npcData.influence.influenceSkills[key];
          influence.label = await TextEditor.enrichHTML(influence.label);
        }
      }
    }
  }

  getBookmarks(layout) {
    const bookmarks =
      this.selected.category === "pf2e-bestiary-tracking.creature"
        ? getExpandedCreatureTypes()
        : this.selected.category === "pf2e-bestiary-tracking.npc"
          ? getNPCCategories().filter((x) => this.gmView || !x.hidden)
          : getHazardCategories();

    const creatureReduce = (acc, creature) => {
      if (!creature.system.active) return acc;

      const types = getCreaturesTypes(creature.system.traits);

      var usedTypes = types.map((x) => x.key);
      if (this.gmView) {
        usedTypes = types.filter((x) => !x.fake).map((x) => x.key);
      } else {
        usedTypes = types.filter((x) => x.revealed).map((x) => x.key);
      }

      if (usedTypes.length === 0) usedTypes = ["unknown"];

      for (var type of usedTypes) {
        acc
          .find((x) => x.value === type)
          ?.values?.push({
            id: creature.id,
            name: creature.system.name,
            hidden: creature.system.hidden,
            hideState: creature.system.imageState.hideState,
            img: creature.system.displayImage,
          });
      }

      return acc;
    };

    const npcReduce = (npcCategories) => (acc, npc) => {
      if (!npc.system.active) return acc;

      const categories = npc.system.npcData.categories.filter((x) => {
        const npcCategory = npcCategories.find(
          (category) => category.value === x.value,
        );
        return this.gmView || (!x.hidden && npcCategory && !npcCategory.hidden);
      });
      var usedCategories =
        categories.length > 0
          ? categories.map((x) => x.value)
          : ["unaffiliated"];

      for (var category of usedCategories) {
        acc
          .find((x) => x.value === category)
          ?.values?.push({
            id: npc.id,
            name: npc.system.name,
            hidden: npc.system.hidden,
            hideState: npc.system.imageState.hideState,
            img: npc.system.displayImage,
          });
      }

      return acc;
    };

    const hazardReduce = (acc, hazard) => {
      if (!hazard.system.active) return acc;

      const types = getHazardTypes(hazard.system.traits);

      var usedTypes = types.map((x) => x.key);
      if (this.gmView) {
        usedTypes = types.filter((x) => !x.fake).map((x) => x.key);
      } else {
        usedTypes = types.filter((x) => x.revealed).map((x) => x.key);
      }

      if (usedTypes.length === 0) usedTypes = ["unknown"];

      for (var type of usedTypes) {
        acc
          .find((x) => x.value === type)
          ?.values?.push({
            id: hazard.id,
            name: hazard.system.name,
            hidden: hazard.system.hidden,
            hideState: hazard.system.imageState.hideState,
            img: hazard.system.displayImage,
          });
      }

      return acc;
    };

    const reduceFunc = (npcCategories, combatants) => (acc, entity) => {
      combatants?.forEach((x) => x.token === null);
      const inCombatType =
        combatants &&
        combatants.find((x) => {
          const token =
            x.token ??
            game.combat.scene.tokens.find(
              (token) => token.actorId === x.actorId,
            );

          return (
            token?.baseActor?.uuid === entity.system.uuid ||
            x.actorId === entity.system.id
          );
        });
      if (inCombatType) {
        acc
          .find((x) => x.value === "combat")
          ?.values?.push({
            id: entity.id,
            name: entity.system.name,
            hidden: entity.system.hidden,
            hideState: entity.system.imageState.hideState,
            img: entity.system.displayImage,
          });
      }

      if (entity.type === this.selected.category) {
        switch (entity.type) {
          case "pf2e-bestiary-tracking.creature":
            acc = creatureReduce(acc, entity);
            break;
          case "pf2e-bestiary-tracking.npc":
            acc = npcReduce(npcCategories)(acc, entity);
            break;
          case "pf2e-bestiary-tracking.hazard":
            acc = hazardReduce(acc, entity);
            break;
        }
      }

      return acc;
    };

    const searchFilter = (entity) => {
      const unknownLabel =
        this.selected.category === "pf2e-bestiary-tracking.creature"
          ? "PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature"
          : this.selected.category === "pf2e-bestiary-tracking.npc"
            ? "PF2EBestiary.Bestiary.Miscellaneous.Unaffiliated"
            : "PF2EBestiary.Bestiary.Miscellaneous.UnknownHazard";
      const match = entity.system.name.value
        .toLowerCase()
        .match(this.search.name.toLowerCase());
      const unrevealedMatch = game.i18n
        .localize(unknownLabel)
        .toLowerCase()
        .match(this.search.name.toLowerCase());
      if (
        !this.search.name ||
        ((entity.system.name.revealed || this.gmView) && match) ||
        (!entity.system.name.revealed && !this.gmView && unrevealedMatch)
      ) {
        return true;
      }

      return false;
    };

    const sortFunc = (a, b) => {
      if (
        !layout?.categories?.filter?.type ||
        layout.categories.filter.type === 0
      ) {
        var comparison =
          a.system.name.value < b.system.name.value
            ? -1
            : a.system.name.value > b.system.name.value
              ? 1
              : 0;
        if (!this.gmView) {
          comparison =
            a.system.name.revealed && b.system.name.revealed
              ? a.system.name.value < b.system.name.value
                ? -1
                : a.system.name.value > b.system.name.value
                  ? 1
                  : 0
              : a.system.name.revealed && !b.system.name.revealed
                ? 1
                : !a.system.name.revealed && b.system.name.revealed
                  ? -1
                  : 0;
        }

        return layout?.categories?.filter?.direction === 0
          ? comparison
          : comparison * -1;
      } else {
        var comparison = a.system.level.value - b.system.level.value;
        if (!this.gmView) {
          comparison =
            a.system.level.revealed && b.system.level.revealed
              ? a.system.level.value - b.system.level.value
              : a.system.level.revealed && !b.system.level.revealed
                ? 1
                : !a.system.level.revealed && b.system.level.revealed
                  ? -1
                  : 0;
        }

        return layout.categories.filter.direction === 0
          ? comparison
          : comparison * -1;
      }
    };

    return !this.selected.category
      ? []
      : this.bestiary.pages
          .filter((entity) => {
            if (
              (!game.combat && entity.type !== this.selected.category) ||
              (!this.gmView && entity.system.hidden)
            )
              return false;

            return searchFilter(entity);
          })
          .sort(sortFunc)
          .reduce(
            reduceFunc(
              this.bestiary.getFlag("pf2e-bestiary-tracking", "npcCategories"),
              game.combat?.combatants,
            ),
            bookmarks,
          );
  }

  async _prepareContext(_options) {
    var context = await super._prepareContext(_options);

    context = await this.sharedPreparation(context);
    context.bookmarks = this.getBookmarks(context.layout);

    const activeBookmark = context.bookmarks.find(
      (x) => x.value === this.selected.type,
    );
    context.bookmarkEntities = this.selected.type ? activeBookmark.values : [];
    context.bookmarkDescription = activeBookmark?.description;
    context.returnLabel = !this.selected.monster
      ? game.i18n.localize(
          "PF2EBestiary.Bestiary.ReturnMessages.ReturnToWelcome",
        )
      : game.i18n.format(
          "PF2EBestiary.Bestiary.ReturnMessages.ReturnToCategory",
          { type: activeBookmark.name },
        );

    if (this.selected.category === "pf2e-bestiary-tracking.npc") {
      context = await this.npcPreparation(context);
    } else if (this.selected.category === "pf2e-bestiary-tracking.creature") {
      context = await this.monsterPreparation(context);
    } else if (this.selected.category === "pf2e-bestiary-tracking.hazard") {
      context = await this.hazardPreparation(context);
    }

    return context;
  }

  sharedPreparation = async (context) => {
    context.gmView = this.gmView;
    context.dispositionIcons = game.settings.get(
      "pf2e-bestiary-tracking",
      "disposition-icons",
    );
    context.layout = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-layout",
    );
    context.settings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-settings",
    );
    context.npcCategorySortOptions = npcCategorySortOptions;
    context.optionalFields = game.settings.get(
      "pf2e-bestiary-tracking",
      "optional-fields",
    );
    context.detailedInformation = game.settings.get(
      "pf2e-bestiary-tracking",
      "detailed-information-toggles",
    );
    context.useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );
    context.hideTips = game.settings.get("pf2e-bestiary-tracking", "hide-tips");
    context.hideWelcome = game.settings.get(
      "pf2e-bestiary-tracking",
      "hide-welcome",
    );
    context.sectionsPositioning = game.settings.get(
      "pf2e-bestiary-tracking",
      "sections-position",
    );
    context.hideAbilityDescriptions = game.settings.get(
      "pf2e-bestiary-tracking",
      "hide-ability-descriptions",
    );
    context.contrastRevealedState = game.settings.get(
      "pf2e-bestiary-tracking",
      "contrast-revealed-state",
    );
    context.vagueDescriptions = foundry.utils.deepClone(
      game.settings.get("pf2e-bestiary-tracking", "vague-descriptions"),
    );
    context.categorySettings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-category-settings",
    );
    context.usedSections = game.settings.get(
      "pf2e-bestiary-tracking",
      "used-sections",
    );
    context.showCategories =
      Object.values(context.usedSections).filter((x) => x).length > 1;

    context.recallKnowledgeJournal = this.bestiary.getFlag(
      "pf2e-bestiary-tracking",
      "recall-knowledge-journal",
    );
    context.journalSettings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-journal-settings",
    );
    context.actorSheetApp = this.actorSheetApp;

    context.vagueDescriptions.settings.playerBased = this.gmView
      ? false
      : context.vagueDescriptions.settings.playerBased;
    context.user = game.user;
    context.playerLevel = game.user.character
      ? game.user.character.system.details.level.value
      : null;
    context.search = this.search;
    context.npcState = this.npcData;
    context.selected = foundry.utils.deepClone(this.selected);
    await this.enrichTexts(context.selected);

    context.players = [];
    for (var data of game.actors.find((x) => x.type === "party" && x.active)
      ?.system?.details?.members ?? []) {
      const actor = await fromUuid(data.uuid);
      if (actor) {
        context.players.push({
          id: actor.id,
          name: actor.name,
          img: actor.img,
        });
      }
    }

    context.typeTitle = this.selected.type
      ? this.selected.category === "pf2e-bestiary-tracking.creature"
        ? game.i18n.format("PF2EBestiary.Bestiary.CategoryView.EmptyText", {
            category: getExpandedCreatureTypes().find(
              (x) => x.value === this.selected.type,
            ).name,
          })
        : this.selected.category === "pf2e-bestiary-tracking.npc"
          ? game.i18n.format(
              "PF2EBestiary.Bestiary.CategoryView.EmptyCategoryText",
              {
                category: getNPCCategories().find(
                  (x) => x.value === this.selected.type,
                ).name,
              },
            )
          : this.selected.category === "pf2e-bestiary-tracking.hazard"
            ? game.i18n.format(
                "PF2EBestiary.Bestiary.CategoryView.EmptyHazardText",
                {
                  category: getHazardCategories().find(
                    (x) => x.value === this.selected.type,
                  ).name,
                },
              )
            : ""
      : "";

    context.bookmarks = [];

    return context;
  };

  monsterPreparation = async (context) => {
    context.tabs = this.getMonsterTabs();

    return context;
  };

  npcPreparation = async (context) => {
    context.tabs = this.getMonsterTabs(true);
    context.npcTabs = this.getNPCTabs();
    context.dispositions = Object.keys(dispositions).map(
      (x) => dispositions[x],
    );
    context.npcCategories =
      this.bestiary.flags["pf2e-bestiary-tracking"].npcCategories;
    context.inputCategories = this.selected.monster
      ? this.selected.monster.system.npcData.categories.map((x) => x.name)
      : [];

    context.skillTypes = [
      ...Object.keys(CONFIG.PF2E.skills).map((skill) => ({
        value: skill,
        name: CONFIG.PF2E.skills[skill].label,
      })),
      { value: "perception", name: "PF2EBestiary.Miscellaneous.Perception" },
    ];

    return context;
  };

  hazardPreparation = async (context) => {
    context.tabs = this.getHazardTabs();

    return context;
  };

  static selectCategory(_, button) {
    this.selected.category =
      this.selected.category === button.dataset.category
        ? null
        : button.dataset.category;
    this.selected.type = null;
    this.selected.monster = null;

    this._updateFrame({ window: { controls: true } });

    this.render();
  }

  static selectBookmark(_, button) {
    this.selected.type = button.dataset.bookmark;
    this.selected.monster = null;
    this.search.name = "";

    this._updateFrame({ window: { controls: true } });

    this.render();
  }

  async removeBookmark(event) {
    if (
      event.currentTarget.dataset.bookmark === "unaffiliated" ||
      event.currentTarget.dataset.bookmark === "combat"
    )
      return;

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("PF2EBestiary.Bestiary.RemoveBookmarkTitle"),
      content: game.i18n.format("PF2EBestiary.Bestiary.RemoveBookmarkText", {
        category: event.currentTarget.dataset.bookmarkName,
      }),
      yes: () => true,
      no: () => false,
    });

    if (!confirmed) return null;

    for (var npc of this.bestiary.pages.filter((page) => {
      return page.system.npcData?.categories.some(
        (x) => x.value === event.currentTarget.dataset.bookmark,
      );
    })) {
      await npc.update({
        "system.npcData.categories": npc.system.npcData.categories.filter(
          (x) => x.value !== event.currentTarget.dataset.bookmark,
        ),
      });
    }

    this.selected.type =
      this.selected.type === event.currentTarget.dataset.bookmark
        ? null
        : this.selected.type;

    await this.bestiary.setFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
      this.bestiary
        .getFlag("pf2e-bestiary-tracking", "npcCategories")
        .filter((x) => x.value !== event.currentTarget.dataset.bookmark)
        .map((x, index) => ({ ...x, position: index })),
    );

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static selectMonster(_, button) {
    this.selected.monster = this.bestiary.pages.get(button.dataset.monster);
    this.selected.category = this.selected.monster.type;
    this.selected.abilities = defaultSelectedAbilities();
    this.npcData.npcView =
      this.selected.monster.type === "pf2e-bestiary-tracking.npc" &&
      (this.selected.monster.system.npcData.simple ||
        this.selected.type !== "combat")
        ? true
        : false;
    this.tabGroups = { creature: "statistics", secondary: "general" };
    this.render();
  }

  static async removeMonster(_, button) {
    const confirmed = await Dialog.confirm({
      title: "Delete Monster",
      content:
        "Are you sure you want to remove the creature from the Bestiary?",
      yes: () => true,
      no: () => false,
    });

    if (!confirmed) return;

    await this.bestiary.pages.get(button.dataset.monster).delete();

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async toggleHideMonster(_, button) {
    const entity = this.bestiary.pages.get(button.dataset.id);
    await entity.update({ "system.hidden": !entity.system.hidden });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static toggleStatistics() {
    this.statistics.expanded = !this.statistics.expanded;
    this.render();
  }

  static async returnButton(_, button) {
    this.selected = this.selected.monster
      ? { ...this.selected, type: button.dataset.contextType, monster: null }
      : this.selected.type
        ? { ...this.selected, type: null }
        : {};
    await this.removeActorSheet();
    this._updateFrame({ window: { controls: true } });
    this.render();
  }

  static toggleAbility(_, button) {
    const category = this.selected.abilities[button.dataset.category];
    if (category.has(button.dataset.ability))
      category.delete(button.dataset.ability);
    else category.add(button.dataset.ability);
    this.render();
  }

  async updateNpcCategoryHidden(event) {
    await this.selected.monster.update({
      "system.npcData.categories":
        this.selected.monster.system.npcData.categories.map((x) => ({
          ...x,
          hidden: x.value === event.detail.data.value ? !x.hidden : x.hidden,
        })),
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async handleTokenNames(monster) {
    if (game.settings.get("pf2e-bestiary-tracking", "hide-token-names")) {
      var workBenchMystifierUsed =
        game.modules.get("xdy-pf2e-workbench")?.active &&
        game.settings.get("xdy-pf2e-workbench", "npcMystifier");

      let name =
        monster.system.name.revealed && monster.system.name.custom
          ? monster.system.name.custom
          : monster.system.name.revealed && !monster.system.name.custom
            ? monster.system.name.value
            : !monster.system.name.revealed
              ? "unknown"
              : null;

      if (name) {
        for (var token of canvas.tokens.placeables.filter(
          (x) => x.document?.baseActor?.uuid === monster.system.uuid,
        )) {
          if (workBenchMystifierUsed && name === "unknown") {
            await game.PF2eWorkbench.doMystificationFromToken(token.id); // Await does nothing atm. Needs change in workbench to be able to remove timeout.

            if (game.combat) {
              setTimeout(() => {
                game.combat.combatants
                  .find((x) => x.token.baseActor.uuid === monster.system.uuid)
                  ?.update({ name: token.name });
              }, 50);
            }
          } else {
            name =
              name === "unknown"
                ? game.i18n.localize(
                    "PF2EBestiary.Bestiary.Miscellaneous.Unknown",
                  )
                : name;
            await token.document.update({ name });

            if (game.combat) {
              await game.combat.combatants
                .find((x) => x.token.baseActor.uuid === monster.system.uuid)
                ?.update({ name: token.name });
            }
          }
        }
      }
    }
  }

  static async toggleRevealed(event, button) {
    if (!game.user.isGM) return;

    event.stopPropagation();
    const path = button.dataset.path.startsWith("npc.")
      ? button.dataset.path.slice(4)
      : button.dataset.path;

    const newValue = !foundry.utils.getProperty(
      this.selected.monster,
      `${path}.${button.dataset.key ?? "revealed"}`,
    );
    await this.selected.monster.update({
      [`${path}.${button.dataset.key ?? "revealed"}`]: newValue,
    });

    if (path === "system.name") {
      await PF2EBestiary.handleTokenNames(this.selected.monster);
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async toggleAllRevealed(_, button) {
    if (!game.user.isGM) return;

    const property = button.dataset.path
      ? foundry.utils.getProperty(this.selected.monster, button.dataset.path)
      : {};
    const keys = Object.keys(property);
    var allRevealed = false;
    switch (button.dataset.type) {
      case "attacks":
        allRevealed = Object.values(this.selected.monster.system.attacks).every(
          (x) => x.revealed,
        );
        await this.selected.monster.update({
          system: {
            attacks: Object.keys(this.selected.monster.system.attacks).reduce(
              (acc, key) => {
                acc[key] = { revealed: !allRevealed };
                return acc;
              },
              {},
            ),
          },
        });
        break;
      case "defenses":
        allRevealed = !(
          this.selected.monster.system.hp.revealed &&
          this.selected.monster.system.hardness.revealed &&
          this.selected.monster.system.ac.revealed
        );
        await this.selected.monster.update({
          system: {
            hp: { revealed: allRevealed },
            hardness: { revealed: allRevealed },
            ac: { revealed: allRevealed },
          },
        });
        break;
      case "senses":
        allRevealed =
          Object.values(this.selected.monster.system.senses.senses).every(
            (x) => x.revealed,
          ) &&
          this.selected.monster.system.senses.perception.revealed &&
          this.selected.monster.system.senses.details.revealed;
        await this.selected.monster.update({
          system: {
            senses: {
              perception: { revealed: !allRevealed },
              details: { revealed: !allRevealed },
              senses: Object.keys(
                this.selected.monster.system.senses.senses,
              ).reduce((acc, key) => {
                acc[key] = { revealed: !allRevealed };
                return acc;
              }, {}),
            },
          },
        });
        break;
      case "speed":
        allRevealed =
          Object.values(this.selected.monster.system.speeds.values).every(
            (x) => x.revealed,
          ) && this.selected.monster.system.speeds.details.revealed;
        await this.selected.monster.update({
          system: {
            speeds: {
              details: { revealed: !allRevealed },
              values: Object.keys(
                this.selected.monster.system.speeds.values,
              ).reduce((acc, key) => {
                acc[key] = { revealed: !allRevealed };
                return acc;
              }, {}),
            },
          },
        });
        break;
      case "spell-level":
        allRevealed = Object.values(
          this.selected.monster.system.spells.entries[button.dataset.entryValue]
            .levels[button.dataset.spellLevel].spells,
        ).every((x) => x.revealed);
        const update = {
          system: {
            spells: {
              entries: Object.keys(
                this.selected.monster.system.spells.entries,
              ).reduce((acc, entryKey) => {
                const entry =
                  this.selected.monster.system.spells.entries[entryKey];
                if (button.dataset.entryValue) {
                  acc[entryKey] = {
                    levels: Object.keys(entry.levels).reduce((acc, level) => {
                      if (level === button.dataset.spellLevel) {
                        acc[level] = {
                          spells: Object.keys(
                            entry.levels[level].spells,
                          ).reduce((acc, spell) => {
                            acc[spell] = { revealed: !allRevealed };
                            return acc;
                          }, {}),
                        };
                      }
                      return acc;
                    }, {}),
                  };
                }

                return acc;
              }, {}),
            },
          },
        };
        await this.selected.monster.update(update, { diff: true });
        break;
      case "personality":
        const baseProp =
          this.selected.monster.system.npcData.general.personality.data;
        allRevealed =
          baseProp.attitude.revealed &&
          baseProp.beliefs.revealed &&
          baseProp.likes.revealed &&
          baseProp.dislikes.revealed &&
          baseProp.catchphrases.revealed &&
          Object.values(baseProp.edicts).every((x) => x.revealed) &&
          Object.values(baseProp.anathema).every((x) => x.revealed);
        await this.selected.monster.update({
          "system.npcData.general.personality.data": {
            attitude: { revealed: !allRevealed },
            beliefs: { revealed: !allRevealed },
            likes: { revealed: !allRevealed },
            dislikes: { revealed: !allRevealed },
            catchphrases: { revealed: !allRevealed },
            edicts: Object.keys(baseProp.edicts).reduce((acc, key) => {
              acc[key] = { revealed: !allRevealed };
              return acc;
            }, {}),
            anathema: Object.keys(baseProp.anathema).reduce((acc, key) => {
              acc[key] = { revealed: !allRevealed };
              return acc;
            }, {}),
          },
        });
      default:
        allRevealed = keys.every((key) => property[key].revealed);
        await this.selected.monster.update({
          [button.dataset.path]: keys.reduce((acc, key) => {
            acc[key] = { revealed: !allRevealed };
            return acc;
          }, {}),
        });
        break;
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async revealEverything() {
    await this.toggleEverythingRevealed(true);
  }

  static async hideEverything() {
    await this.toggleEverythingRevealed(false);
  }

  static async toggleActorSheet() {
    if (this.actorSheetApp) {
      await this.selected.monster.system.refreshData();

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });

      await this.removeActorSheet();
      Hooks.callAll(socketEvent.UpdateBestiary, {});
    } else {
      const actor = game.actors.find(
        (x) => x.uuid === this.selected.monster.system.uuid,
      );
      if (!actor) {
        ui.notifications.error("PF2EBestiary.Bestiary.Errors.ActorMissing");
        return;
      }

      this.actorSheetApp = await actor.sheet.render(true);
    }
  }

  static async openActorLinkMenu() {
    new Promise((resolve, reject) => {
      new AvatarLinkMenu(this.selected.monster, resolve, reject).render(true);
    }).then(
      async ({ actorLinks, duplicates }) => {
        for (var link of actorLinks.filter((x) => x.removed)) {
          const page = this.bestiary.pages.get(link.page);
          await page.delete();
        }

        for (var link of actorLinks.filter((x) => x.new)) {
          const newEntity = await fromUuid(link.actor);
          const page = await PF2EBestiary.addMonster(
            newEntity,
            null,
            link.active,
          );
          link.page = page.id;
        }

        const currentPage = this.bestiary.pages.get(
          actorLinks.find((x) => x.active).page,
        );
        for (var link of actorLinks.filter((x) => !x.removed)) {
          const page = this.bestiary.pages.get(link.page);
          const newLinks = actorLinks
            .filter((x) => x.actor !== link.actor && !x.removed)
            .map((x) => x.page);
          if (link.actor !== page.system.uuid) {
            await page.update({
              system: {
                active: Boolean(link.active),
                uuid: link.actor,
                actorState: {
                  actorLinks: newLinks,
                  actorDuplicates: duplicates,
                },
              },
            });
            if (link.actor) await page.system.refreshData();
          } else {
            await page.update({
              system: {
                active: Boolean(link.active),
                actorState: {
                  actorLinks: newLinks,
                  actorDuplicates: duplicates,
                },
              },
            });

            if (link.new) {
              await page.system.importData(currentPage, link.importSections);
            }
          }

          if (link.active) {
            this.selected.monster = page;
          }
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });
        Hooks.callAll(socketEvent.UpdateBestiary, {});
      },
      () => {
        return;
      },
    );
  }

  removeActorSheet = async () => {
    if (!this.actorSheetApp) return;

    const monsterContainer = $(this.element).find(".monster-container");
    monsterContainer.removeClass("closed");
    const actorContainer = $(this.element).find(".bestiary-actor-sheet");
    actorContainer.removeClass("expanded");

    delete ui.windows[this.actorSheetApp.appId];
    await this.actorSheetApp.close({ force: true });
    this.actorSheetApp = null;
  };

  async toggleEverythingRevealed(revealed) {
    if (!game.user.isGM || !this.selected.monster) return;

    await this.selected.monster.system.toggleEverything(
      revealed,
      this.npcData.npcView,
    );

    await PF2EBestiary.handleTokenNames(this.selected.monster);

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.toggleControls(false);
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async refreshBestiary() {
    if (!game.user.isGM) return;
    this.toggleControls(false);

    ui.notifications.info(
      game.i18n.localize("PF2EBestiary.Bestiary.Info.RefreshStarted"),
    );

    const failedActors = [];
    for (var bestiaryPage of this.bestiary.pages) {
      const succeeded = await bestiaryPage.system.refreshData();
      if (!succeeded) failedActors.push(bestiaryPage.system.name.value);
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});

    if (failedActors.length === 0)
      ui.notifications.info(
        game.i18n.localize("PF2EBestiary.Bestiary.Info.RefreshFinished"),
      );
    else
      ui.notifications.info(
        game.i18n.format("PF2EBestiary.Bestiary.Info.RefreshFinishedPartial", {
          entities: failedActors.join(", "),
        }),
      );
  }

  static async handleSaveSlots() {
    if (!game.user.isGM) return;
    this.toggleControls(false);

    await new BestiarySelection().render(true);
  }

  static async resetBestiary() {
    const successfull = await resetBestiary();
    if (successfull) {
      this.toggleControls(false);
      this.render();
    }
  }

  static clearSearch() {
    this.search.name = "";
    this.render();
  }

  static async toggleFilterDirection() {
    const settings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-layout",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-layout", {
      ...settings,
      categories: {
        ...settings.categories,
        filter: {
          ...settings.categories.filter,
          direction: settings.categories.filter.direction === 0 ? 1 : 0,
        },
      },
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  getMisinformationDialogData(name) {
    switch (name) {
      case "Immunity":
      case "Weakness":
      case "Resistance":
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            required: true,
          }).toFormGroup({}, { name: "misinformation" }).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  type: elements.misinformation.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Trait":
        const allTypes = [
          ...Object.keys(CONFIG.PF2E.creatureTraits).map((type) => ({
            value: type,
            label: CONFIG.PF2E.creatureTraits[type],
          })),
          ...game.settings
            .get("pf2e-bestiary-tracking", "additional-creature-types")
            .map((type) => ({
              value: type.value,
              label: type.name,
            })),
        ].sort((a, b) => {
          if (a.label < b.label) return -1;
          else if (a.label > b.label) return 1;
          else return 0;
        });
        return {
          width: 400,
          content: `<div class="flexrow">
          ${
            new foundry.data.fields.StringField({
              label: game.i18n.format(
                "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
                { property: name },
              ),
              choices: allTypes,
              required: true,
            }).toFormGroup(
              {},
              {
                name: "misinformation",
                localize: true,
                nameAttr: "value",
                labelAttr: "label",
              },
            ).outerHTML
          }
          <button class="flex0 misinformation-randomise"><i class="fa-solid fa-arrows-rotate" style="margin: 0;" title="${game.i18n.localize("PF2EBestiary.Miscellaneous.Randomise")}"></i></button>
          </div>`,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            const type =
              allTypes[Number.parseInt(elements.misinformation.value)];
            return {
              value: {
                slug: slugify(type.value),
                value: {
                  revealed: false,
                  label: type.label,
                  value: type.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
          functions: [
            {
              selector: "misinformation-randomise",
              onClick: (event) => {
                event.preventDefault();
                const randomTrait = allTypes
                  .indexOf(
                    allTypes[Math.floor(Math.random() * allTypes.length)],
                  )
                  .toString();
                const input = event.currentTarget.parentElement.querySelector(
                  '[name="misinformation"]',
                );
                input.value = randomTrait;
              },
            },
          ],
        };
      case "HazardTrait":
        const allHazardTypes = Object.keys(CONFIG.PF2E.hazardTraits)
          .map((type) => ({
            value: type,
            label: CONFIG.PF2E.hazardTraits[type],
          }))
          .sort((a, b) => {
            if (a.label < b.label) return -1;
            else if (a.label > b.label) return 1;
            else return 0;
          });
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            choices: allHazardTypes,
            required: true,
          }).toFormGroup(
            {},
            {
              name: "misinformation",
              localize: true,
              nameAttr: "value",
              labelAttr: "label",
            },
          ).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            const type =
              allHazardTypes[Number.parseInt(elements.misinformation.value)];
            return {
              value: {
                slug: slugify(type.value),
                value: {
                  revealed: false,
                  label: type.label,
                  value: type.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Languages":
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            required: true,
          }).toFormGroup({}, { name: "misinformation" }).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  value: elements.misinformation.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Sense":
        return {
          width: 400,
          content: new foundry.data.fields.StringField({
            label: game.i18n.format(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
              { property: name },
            ),
            required: true,
          }).toFormGroup({}, { name: "misinformation" }).outerHTML,
          getValue: (elements) => {
            if (!elements.misinformation?.value)
              return { value: null, errors: [`Fake ${name}`] };

            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  type: elements.misinformation.value,
                  fake: true,
                },
              },
              errors: [],
            };
          },
        };
      case "Attack":
        const rangeOptions = ["Melee", "Ranged"];
        return {
          width: 400,
          content: `
                        <div>
                            ${
                              new foundry.data.fields.StringField({
                                label: game.i18n.format(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
                                  { property: name },
                                ),
                                required: true,
                              }).toFormGroup({}, { name: "misinformation" })
                                .outerHTML
                            }
                            ${
                              new foundry.data.fields.StringField({
                                choices: rangeOptions,
                                label: game.i18n.localize(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.Attack.Range",
                                ),
                                required: true,
                              }).toFormGroup({}, { name: "range" }).outerHTML
                            }
                    </div>`,
          getValue: (elements) => {
            const errors = [];
            if (!elements.misinformation?.value) errors.push(`Fake ${name}`);
            if (!elements.range?.value) errors.push("Range");

            if (errors.length > 0) return { value: null, errors };

            const range = rangeOptions[Number.parseInt(elements.range.value)];
            return {
              value: {
                slug: slugify(elements.misinformation.value),
                value: {
                  revealed: false,
                  label: elements.misinformation.value,
                  fake: true,
                  item: {
                    system: {
                      damageRolls: {},
                    },
                    _id: slugify(elements.misinformation.value),
                  },
                  weapon: {
                    system: {
                      traits: {
                        value: [],
                      },
                    },
                  },
                  variants: [],
                  traits: [],
                  totalModifier: 0,
                },
              },
              errors: [],
            };
          },
        };
      case "Action":
      case "Passive":
        const actionOptions =
          name === "Action"
            ? [
                { value: "F", label: "Free Action" },
                { value: "1", label: "1 Action" },
                { value: "2", label: "2 Actions" },
                { value: "3", label: "3 Actions" },
                { value: "R", label: "Reaction" },
              ]
            : [];
        return {
          width: 600,
          content: `
                        <div class="pf2e-bestiary-misinformation-dialog">
                            ${
                              new foundry.data.fields.StringField({
                                label: game.i18n.format(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
                                  { property: name },
                                ),
                                required: true,
                              }).toFormGroup({}, { name: "misinformation" })
                                .outerHTML
                            }
                            ${
                              actionOptions.length > 0
                                ? new foundry.data.fields.StringField({
                                    choices: actionOptions.map((x) => x.label),
                                    label: game.i18n.localize(
                                      "PF2EBestiary.Bestiary.Misinformation.Dialog.Attack.Actions",
                                    ),
                                    required: true,
                                  }).toFormGroup({}, { name: "actions" })
                                    .outerHTML
                                : ""
                            }
                            ${
                              new foundry.data.fields.StringField({
                                label: game.i18n.localize(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.Traitlabel",
                                ),
                                required: false,
                              }).toFormGroup({}, { name: "traits" }).outerHTML
                            }
                            ${
                              new foundry.data.fields.HTMLField({
                                label: game.i18n.localize(
                                  "PF2EBestiary.Bestiary.Misinformation.Dialog.Ability.Description",
                                ),
                                required: false,
                              }).toFormGroup(
                                {},
                                { value: "", name: "description" },
                              ).outerHTML
                            }
                    </div>`,
          getValue: (elements) => {
            const errors = [];
            if (!elements.misinformation?.value) errors.push(`Fake ${name}`);
            if (name === "Action" && !elements.actions?.value)
              errors.push("Actions Value");

            if (errors.length > 0) return { value: null, errors };

            const id = `FakeUuid-${name}-${foundry.utils.randomID()}`;
            const base = {
              slug: id,
              value: {
                revealed: false,
                _id: id,
                label: elements.misinformation.value,
                type: "action",
                description: elements.description?.value,
                traits: elements.traits.value
                  ? JSON.parse(elements.traits.value).map((x) => ({
                      revealed: false,
                      value: x.value,
                    }))
                  : [],
                fake: true,
              },
            };

            if (name === "Action") {
              base.value.actions =
                actionOptions[Number.parseInt(elements.actions.value)]?.value;
            }

            return { value: base, errors: [] };
          },
          tagify: [
            {
              element: "traits",
              options: {
                whitelist: Object.keys(CONFIG.PF2E.actionTraits).map((key) => {
                  const label = CONFIG.PF2E.actionTraits[key];
                  return { value: key, name: game.i18n.localize(label) };
                }),
                dropdown: {
                  mapValueTo: "name",
                  searchKeys: ["name"],
                  enabled: 0,
                  maxItems: 20,
                  closeOnSelect: true,
                  highlightFirst: false,
                },
              },
            },
          ],
        };
    }
  }

  static async createMisinformation(_, button) {
    if (!game.user.isGM) return;

    const addValue = async ({ value, errors }) => {
      if (errors.length > 0)
        ui.notifications.error(
          game.i18n.format(
            "PF2EBestiary.Bestiary.Misinformation.Dialog.Errors.RequiredFields",
            {
              fields: errors.map(
                (x, index) => `${x}${index !== errors.length - 1 ? ", " : ""}`,
              ),
            },
          ),
        );

      const newValues = foundry.utils.getProperty(
        this.selected.monster,
        `${button.dataset.path}`,
      );
      if (Array.isArray(newValues)) newValues.push(value.value);
      else newValues[value.slug] = value.value;

      await this.selected.monster.update({
        [`${button.dataset.path}`]: newValues,
      });

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: { monsterSlug: this.selected.monster.slug },
      });

      this.render();
    };

    const {
      content,
      getValue,
      functions,
      width,
      tagify = [],
    } = this.getMisinformationDialogData(button.dataset.name);

    async function callback(_, button) {
      await addValue(getValue(button.form.elements));
    }

    const dialog = new foundry.applications.api.DialogV2({
      buttons: [
        foundry.utils.mergeObject(
          {
            action: "ok",
            label: "Confirm",
            icon: "fas fa-check",
            default: true,
          },
          { callback: callback },
        ),
      ],
      content: content,
      rejectClose: false,
      modal: false,
      window: {
        title: game.i18n.localize(
          "PF2EBestiary.Bestiary.Misinformation.Dialog.Title",
        ),
      },
      position: { width },
    });

    await dialog.render(true);

    for (var func of functions) {
      const functionElement = dialog.element.getElementsByClassName(
        func.selector,
      )[0];
      functionElement.onclick = func.onClick;
    }

    for (var tag of tagify) {
      const element = $(dialog.element).find(`input[name="${tag.element}"]`);
      var ta = new Tagify(element[0], tag.options);
    }
  }

  static async imagePopout() {
    const title = this.selected.monster.system.name.revealed
      ? this.selected.monster.system.name.custom
        ? this.selected.monster.system.name.custom
        : this.selected.monster.system.name.value
      : this.selected.monster.type === "pf2e-bestiary-tracking.creature"
        ? game.i18n.localize(
            "PF2EBestiary.Bestiary.Miscellaneous.UnknownCreature",
          )
        : this.selected.monster.type === "pf2e-bestiary-tracking.npc"
          ? game.i18n.localize("PF2EBestiary.Bestiary.Miscellaneous.UnknownNPC")
          : game.i18n.localize(
              "PF2EBestiary.Bestiary.Miscellaneous.UnknownHazard",
            );

    new ImagePopout(this.selected.monster.system.displayImage, {
      title: title,
      uuid: this.selected.monster.system.uuid,
      showTitle: !this.gmView
        ? true
        : this.selected.monster.system.name.revealed
          ? true
          : undefined,
      hideState: this.selected.monster.system.imageState.hideState,
    }).render(true);
  }

  static async setCategoriesLayout(_, button) {
    const settings = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-layout",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-layout", {
      ...settings,
      categories: {
        ...settings.categories,
        layout: Number.parseInt(button.dataset.option),
      },
    });
    this.render();
  }

  static async addNpcCategory() {
    if (game.user.isGM && this.npcData.newCategory.text) {
      const categoryKey = `${slugify(this.npcData.newCategory.text)}-${foundry.utils.randomID()}`;

      const categories = this.bestiary.getFlag(
        "pf2e-bestiary-tracking",
        "npcCategories",
      );
      let newCategories = [
        ...categories,
        {
          value: categoryKey,
          name: this.npcData.newCategory.text,
          description: this.npcData.newCategory.description,
          position: categories.length,
          hidden: game.settings.get("pf2e-bestiary-tracking", "hidden-settings")
            .npcCategories,
        },
      ];
      const bestiarySettings = game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-settings",
      );

      switch (bestiarySettings.npc.categorySort) {
        case 1:
          newCategories = newCategories
            .sort((a, b) => alphaSort(a, b, "name"))
            .map((x, index) => ({ ...x, position: index }));
          break;
        case 2:
          newCategories = newCategories
            .sort((a, b) => alphaSort(a, b, "name", true))
            .map((x, index) => ({ ...x, position: index }));
          break;
      }

      await this.bestiary.setFlag(
        "pf2e-bestiary-tracking",
        "npcCategories",
        newCategories,
      );
      this.npcData.newCategory.text = null;
      this.npcData.newCategory.description = null;

      await game.socket.emit(`module.pf2e-bestiary-tracking`, {
        action: socketEvent.UpdateBestiary,
        data: {},
      });
      Hooks.callAll(socketEvent.UpdateBestiary, {});
    }
  }

  static async toggleHideNPCCategory(_, button) {
    const categories = this.bestiary.getFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
    );
    const toggleCategory = categories.find(
      (x) => x.value === button.dataset.category,
    );
    toggleCategory.hidden = !toggleCategory.hidden;
    await this.bestiary.setFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
      categories,
    );

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    $(button).toggleClass("fa-eye-slash");
    $(button).toggleClass("fa-eye");
    // Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async addInfluence(_, button) {
    var update = null;
    switch (button.dataset.type) {
      case "discovery":
        update = {
          [`system.npcData.influence.discovery.${foundry.utils.randomID()}`]: {
            dc: 10,
            type: "acrobatics",
            lore: false,
          },
        };
        break;
      case "influenceSkills":
        update = {
          [`system.npcData.influence.influenceSkills.${foundry.utils.randomID()}`]:
            { dc: 10, type: "acrobatics", lore: false, description: "" },
        };
        break;
      case "influence":
        update = {
          [`system.npcData.influence.influence.${foundry.utils.randomID()}`]: {
            points: 1,
            description: "",
          },
        };
        break;
      case "weakness":
        update = {
          [`system.npcData.influence.weaknesses.${foundry.utils.randomID()}`]: {
            description: "",
          },
        };
        break;
      case "resistance":
        update = {
          [`system.npcData.influence.resistances.${foundry.utils.randomID()}`]:
            { description: "" },
        };
        break;
      case "penalty":
        update = {
          [`system.npcData.influence.penalties.${foundry.utils.randomID()}`]: {
            description: "",
          },
        };
        break;
    }

    if (!update) return;
    await this.selected.monster.update(update);

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async increaseInfluence() {
    await this.selected.monster.update({
      "system.npcData.influence.influencePoints":
        this.selected.monster.system.npcData.influence.influencePoints + 1,
    });
    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async decreaseInfluence() {
    await this.selected.monster.update({
      "system.npcData.influence.influencePoints":
        this.selected.monster.system.npcData.influence.influencePoints - 1,
    });
    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async removeProperty(_, button) {
    await this.selected.monster.update({ [button.dataset.path]: null });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static exportEntity() {
    saveDataToFile(
      JSON.stringify(this.selected.monster.toObject(), null, 2),
      "text/json",
      `${slugify(this.selected.monster.system.name.value)}.json`,
    );
    this.toggleControls(false);
  }

  static async importEntity() {
    new Promise((resolve, reject) => {
      new ImportDialog(
        "PF2EBestiary.ImportDialog.EntryTitle",
        (jsonObject) => {
          if (!jsonObject || !jsonObject.type) {
            return game.i18n.localize("PF2EBestiary.ImportDialog.FaultyImport");
          }

          if (!getUsedBestiaryTypes().includes(jsonObject.type)) {
            return game.i18n.localize(
              "PF2EBestiary.ImportDialog.UnusedBestiaryType",
            );
          }
          return null;
        },
        resolve,
        reject,
      ).render(true);
    }).then(this.importFromJSONData.bind(this));
    this.toggleControls(false);
  }

  async importFromJSONData(data) {
    await this.bestiary.createEmbeddedDocuments("JournalEntryPage", [data]);

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async transformNPC() {
    await this.toggleIsNPC();
  }

  static async transformCreature() {
    await this.toggleIsNPC();
  }

  static async openDocument(_, button) {
    const document = await fromUuid(button.dataset.uuid);
    await document.sheet.render(true);
  }

  static async removeRecallKnowledgeJournal(event) {
    event.stopPropagation();
    await this.bestiary.unsetFlag(
      "pf2e-bestiary-tracking",
      "recall-knowledge-journal",
    );

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async imageMenu() {
    new Promise((resolve, reject) => {
      new AvatarMenu(this.selected.monster, resolve, reject).render(true);
    }).then(
      async (update) => {
        await this.selected.monster.update(update);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });
        Hooks.callAll(socketEvent.UpdateBestiary, {});
      },
      () => {
        return;
      },
    );
  }

  static async copyEntityLink(event) {
    const bestiaryLink = `@Bestiary[${this.bestiary.id}|${this.selected.monster.system.uuid}]`;
    if (event.altKey) {
      const cls = getDocumentClass("ChatMessage");
      const msg = new cls({
        user: game.user.id,
        content: bestiaryLink,
      });

      cls.create(msg.toObject());
    } else {
      navigator.clipboard.writeText(bestiaryLink).then(() => {
        ui.notifications.info(
          game.i18n.format("PF2EBestiary.Bestiary.Info.BestiaryEntryLink", {
            entity: this.gmView
              ? this.selected.monster.system.name.value
              : this.selected.monster.system.displayedName,
          }),
        );
      });
    }
  }

  static async toggleRecallAttempt(_, button) {
    const oldValue = this.selected.monster.system.recallKnowledge[
      button.dataset.character
    ]?.attempts
      ? this.selected.monster.system.recallKnowledge[button.dataset.character]
          ?.attempts[button.dataset.attempt]
      : null;
    await this.selected.monster.update({
      [`system.recallKnowledge.${button.dataset.character}.attempts.${button.dataset.attempt}`]:
        oldValue
          ? Object.values(recallKnowledgeOutcomes).find(
              (x) =>
                x.order === (recallKnowledgeOutcomes[oldValue].order + 1) % 5,
            ).value
          : recallKnowledgeOutcomes.criticalSuccess.value,
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async resetRecallAttempts(event, button) {
    if (!event.altKey) {
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize(
          "PF2EBestiary.Bestiary.ResetRecallAttemptsTitle",
        ),
        content: game.i18n.format(
          "PF2EBestiary.Bestiary.ResetRecallAttemptsText",
          { character: game.actors.get(button.dataset.character).name },
        ),
        yes: () => true,
        no: () => false,
      });

      if (!confirmed) return;
    }

    const attempts =
      this.selected.monster.system.recallKnowledge[button.dataset.character]
        ?.attempts;
    if (!attempts) return;

    await this.selected.monster.update({
      [`system.recallKnowledge.-=${button.dataset.character}`]: null,
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  static async displayRecallKnowledgePopup() {}

  async hideTab(event) {
    event.stopPropagation();
    event.preventDefault();

    if (!game.user.isGM) return;

    const tab = event.currentTarget.dataset.tab;
    await this.selected.monster.update({
      [`system.tabStates.${tab}.hidden`]:
        !this.selected.monster.system.tabStates[tab].hidden,
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async updateNPCCategorySort(event) {
    const value = Number.parseInt(event.currentTarget.value);
    const currentCategories = this.bestiary.getFlag(
      "pf2e-bestiary-tracking",
      "npcCategories",
    );
    switch (value) {
      case 1:
        await this.bestiary.setFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
          currentCategories
            .sort((a, b) => alphaSort(a, b, "name"))
            .map((category, index) => ({ ...category, position: index })),
        );
        break;
      case 2:
        await this.bestiary.setFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
          currentCategories
            .sort((a, b) => alphaSort(a, b, "name", true))
            .map((category, index) => ({ ...category, position: index })),
        );
        break;
    }

    const current = game.settings.get(
      "pf2e-bestiary-tracking",
      "bestiary-settings",
    );
    await game.settings.set("pf2e-bestiary-tracking", "bestiary-settings", {
      ...current,
      npc: {
        ...current.npc,
        categorySort: value,
      },
    });

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async toggleIsNPC() {
    if (!this.selected.monster) return;

    if (this.selected.monster.type === "pf2e-bestiary-tracking.creature") {
      const newEntity = await this.selected.monster.system.transformToNPC();
      this.selected.monster = newEntity;
      this.selected.category = "pf2e-bestiary-tracking.npc";
      this.selected.type = this.selected.monster.system.initialType;
      this.npcData.npcView = true;
      this.npcData.editMode = false;
    } else {
      const newEntity =
        await this.selected.monster.system.transformToCreature();
      if (!newEntity) return;

      this.selected.monster = newEntity;
      this.selected.category = "pf2e-bestiary-tracking.creature";
      this.selected.type = this.selected.monster.system.initialType;
      this.npcData.npcView = false;
      this.npcData.editMode = false;
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async obscureData(event) {
    if (!game.user.isGM || !event.currentTarget.dataset.name) return;

    const setValue = async (value) => {
      if (value) {
        await this.selected.monster.update({
          [`${event.currentTarget.dataset.path}.custom`]: value,
        });

        if (
          event.currentTarget.dataset.path === "system.name" &&
          this.selected.monster.system.name.revealed
        ) {
          await PF2EBestiary.handleTokenNames(this.selected.monster);
        }

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });

        this.render();
      }
    };

    const vagueDescriptions = await game.settings.get(
      "pf2e-bestiary-tracking",
      "vague-descriptions",
    );
    const vagueProperty = event.currentTarget.dataset.vagueProperty;

    if (event.altKey && vagueDescriptions.properties[vagueProperty]) {
      const { vagueDescriptions } = game.settings.get(
        "pf2e-bestiary-tracking",
        "bestiary-labels",
      );

      const currentValue = foundry.utils.getProperty(
        this.selected.monster,
        event.currentTarget.dataset.path,
      ).category;
      const getRandomValue = (table, short) => {
        const choices = table.range.reduce((acc, x) => {
          const label = ["saves", "attributes"].includes(vagueProperty)
            ? vagueDescriptions.short[x]
            : vagueDescriptions.full[x];
          if (label !== currentValue) {
            acc.push(label);
          }

          return acc;
        }, []);

        return choices[Math.floor(Math.random() * choices.length)];
      };

      switch (vagueProperty) {
        case "saves":
          setValue(getRandomValue(savingThrowPerceptionTable, true));
          break;
        case "skills":
          setValue(getRandomValue(skillTable));
          break;
        case "attributes":
          setValue(getRandomValue(attributeTable, true));
          break;
        case "ac":
          setValue(getRandomValue(acTable));
          break;
        case "hp":
          setValue(getRandomValue(hpTable));
          break;
        case "perception":
          setValue(getRandomValue(savingThrowPerceptionTable));
          break;
      }
    } else {
      if (
        vagueDescriptions.settings.misinformationOptions &&
        vagueDescriptions.properties[vagueProperty]
      ) {
        const choices = await getCategoryRange(vagueProperty);
        const content = new foundry.data.fields.StringField({
          label: game.i18n.format(
            "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
            { property: event.currentTarget.dataset.name },
          ),
          choices: choices,
          required: true,
        }).toFormGroup(
          {},
          { name: "misinformation", localize: true },
        ).outerHTML;

        async function callback(_, button) {
          const choice =
            choices[Number.parseInt(button.form.elements.misinformation.value)];
          await setValue(choice);
        }

        await foundry.applications.api.DialogV2.prompt({
          content: content,
          rejectClose: false,
          modal: true,
          ok: { callback: callback },
          window: {
            title: game.i18n.localize(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.Title",
            ),
          },
          position: { width: 400 },
        });
      } else {
        const content = new foundry.data.fields.StringField({
          label: game.i18n.format(
            "PF2EBestiary.Bestiary.Misinformation.Dialog.SelectLabel",
            { property: event.currentTarget.dataset.name },
          ),
          required: true,
        }).toFormGroup({}, { name: "misinformation" }).outerHTML;

        async function callback(_, button) {
          const choice = button.form.elements.misinformation.value;
          await setValue(choice);
        }

        await foundry.applications.api.DialogV2.prompt({
          content: content,
          rejectClose: false,
          modal: true,
          ok: { callback: callback },
          window: {
            title: game.i18n.localize(
              "PF2EBestiary.Bestiary.Misinformation.Dialog.Title",
            ),
          },
          position: { width: 400 },
        });
      }
    }
  }

  async unObscureData(event) {
    if (!game.user.isGM) return;

    if (event.currentTarget.dataset.fake) {
      const pathSplit = event.currentTarget.dataset.path.split(".");
      var deletePath = pathSplit.slice(0, pathSplit.length - 1).join(".");
      const newValues = foundry.utils.getProperty(
        this.selected.monster,
        deletePath,
      );
      if (Array.isArray(newValues)) {
        await this.selected.monster.update({
          [deletePath]: Object.keys(newValues).reduce((acc, key) => {
            if (key !== pathSplit[pathSplit.length - 1]) {
              acc.push(newValues[key]);
            }

            return acc;
          }, []),
        });
      } else {
        deletePath = pathSplit
          .slice(0, pathSplit.length - 1)
          .join(".")
          .concat(`.-=${pathSplit[pathSplit.length - 1]}`);
        await this.selected.monster.update({ [deletePath]: null });
      }
    } else {
      await this.selected.monster.update({
        [`${event.currentTarget.dataset.path}.custom`]: null,
      });

      if (
        event.currentTarget.dataset.path === "system.name" &&
        this.selected.monster.system.name.revealed
      ) {
        await PF2EBestiary.handleTokenNames(this.selected.monster);
      }
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    this.render();
  }

  static async updateData(event, element, formData) {
    const { system, ...rest } = foundry.utils.expandObject(formData.object);
    const simpleFields = foundry.utils.flattenObject(rest);

    if (system && this.selected.monster) {
      await this.selected.monster.update({ system: system });
    }

    for (var property in simpleFields) {
      await foundry.utils.setProperty(this, property, simpleFields[property]);
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });
    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.callbacks = {
        drop: this._onDrop.bind(this),
      };

      const newHandler = new DragDrop(d);
      newHandler.bind(this.element);

      return newHandler;
    });
  }

  static async addMonster(item, acceptPlayerCharacters, openAfter) {
    const bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );

    // We do not currently refresh already present creatures in the Bestiary.
    if (bestiary.pages.some((x) => x.system.actorBelongs(item))) return null;

    if (item.hasPlayerOwner && !acceptPlayerCharacters) return null;

    const itemRules = {};
    for (var subItem of item.items) {
      if (subItem.type === "effect") {
        itemRules[subItem.id] = subItem.system.rules;
        await subItem.update({ "system.rules": [] });
      }
    }

    var data = null;
    switch (getEntityType(item)) {
      case "creature":
        data = await getCreatureData(item);
        break;
      case "creatureCharacter":
        data = await getCreatureData(item, true);
        break;
      case "character":
        data = await getNPCData(item, true);
        break;
      case "npc":
        data = await getNPCData(item);
        break;
      case "hazard":
        data = getHazardData(item);
        break;
    }

    const pages = await bestiary.createEmbeddedDocuments("JournalEntryPage", [
      data,
    ]);
    for (var key in itemRules) {
      await item.items.get(key).update({ "system.rules": itemRules[key] });
    }

    const doubleClickOpenActivated = game.settings.get(
      "pf2e-bestiary-tracking",
      "doubleClickOpen",
    );
    if (doubleClickOpenActivated && item.ownership.default < 1) {
      await item.update({ "ownership.default": 1 });
    }

    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});

    if (openAfter) {
      new PF2EBestiary(pages[0]).render(true);
    }

    return pages[0];
  }

  async _onDragStart(event) {
    const target = event.currentTarget;
    const bookmark = $(target).find(".bookmark")[0];
    if (!bookmark) return;

    event.dataTransfer.setData("text/plain", JSON.stringify(bookmark.dataset));
    event.dataTransfer.setDragImage(bookmark, 60, 0);

    this.dragData.bookmarkActive = true;
  }

  async _onDragOver(event) {
    if (!this.dragData.bookmarkActive) return;

    let self = $(event.target)[0];
    let dropTarget = self.matches(".bookmark-container.draggable")
      ? $(self).find(".bookmark")[0]
      : self.closest(".bookmark");

    if (!dropTarget || dropTarget.classList.contains("drop-hover")) {
      return;
    }

    $(dropTarget).addClass("drop-hover");
    return false;
  }

  async _onDragLeave(event) {
    if (!this.dragData.bookmarkActive) return;

    let self = $(event.target)[0];
    let dropTarget = self.matches(".bookmark-container.draggable")
      ? $(self).find(".bookmark")[0]
      : self.closest(".bookmark");
    $(dropTarget).removeClass("drop-hover");
  }

  async _onDrop(event) {
    if (!game.user.isGM) return;

    const data = TextEditor.getDragEventData(event);
    const dataItem = await fromUuid(data.uuid);

    const items = !dataItem
      ? [data]
      : dataItem.collectionName === "folders"
        ? getAllFolderEntries(dataItem)
        : [dataItem];

    for (var baseItem of items) {
      if (!data.type) {
        this.dragData.bookmarkActive = false;
        let categories = this.bestiary.getFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
        );
        let self = $(event.target)[0];
        let dropTarget = self.matches(".bookmark-container")
          ? self
          : self.closest(".bookmark-container");
        let bookmarkTarget = $(dropTarget).find(".bookmark")[0];
        $(bookmarkTarget).removeClass("drop-hover");

        if (
          !bookmarkTarget ||
          bookmarkTarget.dataset.bookmark === data.bookmark
        )
          return;

        bookmarkTarget = $(dropTarget).find(".bookmark")[0];
        const bookmark = categories.find(
          (x) => x.value === bookmarkTarget.dataset.bookmark,
        );
        const position = bookmark
          ? bookmark.position < Number.parseInt(data.position)
            ? bookmark.position + 1
            : bookmark.position
          : 0;

        if (position === Number.parseInt(data.position)) return;

        const orig = categories.splice(
          categories.indexOf(categories.find((x) => x.value === data.bookmark)),
          1,
        )[0];

        categories = categories.map((x, index) => ({ ...x, position: index }));
        categories.splice(position, 0, orig);

        await this.bestiary.setFlag(
          "pf2e-bestiary-tracking",
          "npcCategories",
          categories.map((x, index) => ({ ...x, position: index })),
        );

        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
          action: socketEvent.UpdateBestiary,
          data: {},
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});
        return;
      }

      if (
        event.currentTarget?.classList?.contains("npc-players-inner-container")
      ) {
        const playerCharacter = game.actors.get(event.currentTarget.id);
        const newDropEvent = new DragEvent("drop", {
          altKey: game.keyboard.isModifierActive("Alt"),
        });
        playerCharacter.sheet._onDropItem(newDropEvent, {
          type: "item",
          data: baseItem,
        });
        event.stopPropagation();
        return;
      }

      if (data.type === "JournalEntry") {
        if (
          event.currentTarget.classList.contains("recall-knowledge-container")
        ) {
          await this.bestiary.setFlag(
            "pf2e-bestiary-tracking",
            "recall-knowledge-journal",
            baseItem.uuid,
          );
          ui.notifications.info(
            game.i18n.localize(
              "PF2EBestiary.Bestiary.Welcome.GMsSection.RecallKnowledgeAttachedNotification",
            ),
          );

          await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: {},
          });

          Hooks.callAll(socketEvent.UpdateBestiary, {});
        }

        const gmEditor = event.target.parentElement.parentElement;
        if (gmEditor.classList.contains("gm-notes")) {
          const dialog = new foundry.applications.api.DialogV2({
            buttons: [
              foundry.utils.mergeObject(
                {
                  action: "ok",
                  label: "Confirm",
                  icon: "fas fa-check",
                  default: true,
                },
                {
                  callback: async (_, button) => {
                    const page = Array.from(baseItem.pages)[
                      Number.parseInt(button.form.elements.page.value)
                    ];
                    await this.selected.monster.update({
                      "system.notes.gm.value": page.text.content,
                    });

                    Hooks.callAll(socketEvent.UpdateBestiary, {});
                  },
                },
              ),
            ],
            content: `
              <div style="display: flex; flex-direction: column; gap:8px;">
                <div>${game.i18n.localize("PF2EBestiary.Bestiary.NPC.GMNotesImportText")}</div>
                ${
                  new foundry.data.fields.StringField({
                    choices: baseItem.pages.map((x) => ({
                      id: x.id,
                      name: x.name,
                    })),
                    label: game.i18n.localize(
                      "PF2EBestiary.Bestiary.NPC.GMNotesPageTitle",
                    ),
                    required: true,
                  }).toFormGroup(
                    {},
                    { name: "page", nameAttr: "id", labelAttr: "name" },
                  ).outerHTML
                }
              </div>
            `,
            rejectClose: false,
            modal: false,
            window: {
              title: game.i18n.localize(
                "PF2EBestiary.Bestiary.NPC.GMNotesImportTitle",
              ),
            },
            position: { width: 400 },
          });

          await dialog.render(true);
        }

        return;
      }

      if (!baseItem || !isValidEntityType(baseItem.type)) {
        ui.notifications.error(
          game.i18n.localize("PF2EBestiary.Bestiary.Errors.UnsupportedType"),
        );
        return;
      }

      const item = baseItem.pack
        ? await Actor.implementation.create(baseItem.toObject())
        : baseItem;

      const bestiary = game.journal.get(
        game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
      );
      const existingPage = bestiary.pages.find((x) =>
        x.system.actorBelongs(item),
      );
      if (existingPage) {
        await existingPage.system.refreshData(item);
      } else {
        const itemRules = {};
        for (var subItem of item.items) {
          if (subItem.type === "effect") {
            itemRules[subItem.id] = subItem.system.rules;
            await subItem.update({ "system.rules": [] });
          }
        }

        var pageData = null;
        switch (getEntityType(item)) {
          case "creature":
            pageData = await getCreatureData(item);
            break;
          case "creatureCharacter":
            pageData = await getCreatureData(item, true);
            break;
          case "character":
            pageData = await getNPCData(item, true);
            break;
          case "npc":
            pageData = await getNPCData(item);
            break;
          case "hazard":
            pageData = getHazardData(item);
            break;
        }

        await bestiary.createEmbeddedDocuments("JournalEntryPage", [pageData]);
        for (var key in itemRules) {
          await item.items.get(key).update({ "system.rules": itemRules[key] });
        }
      }

      const doubleClickOpenActivated = game.settings.get(
        "pf2e-bestiary-tracking",
        "doubleClickOpen",
      );
      if (doubleClickOpenActivated) {
        const ownership =
          item.ownership.default > 1 ? item.ownership.default : 1;
        await item.update({ "ownership.default": ownership });
      }
    }
    await game.socket.emit(`module.pf2e-bestiary-tracking`, {
      action: socketEvent.UpdateBestiary,
      data: {},
    });

    Hooks.callAll(socketEvent.UpdateBestiary, {});
  }

  async maximize() {
    super.maximize();
    this.render();
  }

  onBestiaryUpdate = async () => {
    if (this.actorSheetApp) return;
    this.bestiary = game.journal.get(
      game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
    );
    const existingEntity = this.selected.monster
      ? (this.bestiary.pages.get(this.selected.monster.id) ??
        this.bestiary.pages.find(
          (x) => x.system.uuid === this.selected.monster.system.uuid,
        ) ??
        null)
      : null;
    if (!existingEntity) this.selected.monster = null;

    const initialActiveType = this.selected.monster?.system?.initialActiveType;
    const unknown =
      initialActiveType &&
      (initialActiveType === "unknown" || initialActiveType === "unaffiliated");
    if (
      !game.user.isGM &&
      this.selected.monster &&
      this.selected.type !== "combat" &&
      (unknown ||
        this.selected.type === "unknown" ||
        this.selected.type === "unaffiliated")
    ) {
      this.selected.type = initialActiveType;
    }

    const saveButton = $(this.element).find(
      '.prosemirror[collaborate="true"] *[data-action="save"]',
    );
    if (saveButton.length === 0 && !this.minimized) {
      this.render(true);
    }
  };

  onDeleteCombat = () => {
    if (this.selected.type === "combat") {
      this.selected.type = null;
      this.selected.monster = null;
    }

    this.render(true);
  };

  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: () => game.user.isGM,
        drop: () => game.user.isGM,
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        dragleave: this._onDragLeave.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new ExpandedDragDrop(d);
    });
  }

  switchPlayerMode = (e) => {
    if (!game.user.isGM) return;

    if (
      game.keybindings
        .get("pf2e-bestiary-tracking", "view-as-player")
        .some((binding) => binding.key === e.code)
    ) {
      this.gmView = false;
      this.render();
    }
  };

  resetPlayerMode = (e) => {
    if (!game.user.isGM) return;

    if (
      game.keybindings
        .get("pf2e-bestiary-tracking", "view-as-player")
        .some((binding) => binding.key === e.code)
    ) {
      this.gmView = true;
      this.render();
    }
  };

  close = async (options) => {
    Hooks.off(socketEvent.UpdateBestiary, this.onUpdateBestiaryId);
    Hooks.off("deleteCombat", this.onDeleteCombatId);
    document.removeEventListener("keydown", this.switchPlayerMode);
    document.removeEventListener("keyup", this.resetPlayerMode);
    await this.removeActorSheet();

    return super.close(options);
  };
}
