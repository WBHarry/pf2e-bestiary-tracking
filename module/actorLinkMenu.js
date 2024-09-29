import { ExpandedDragDrop } from "../scripts/expandedDragDrop";
import { getEntityType } from "../scripts/helpers";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class AvatarLinkMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(entity, resolve, reject) {
    super({});

    this.resolve = resolve;
    this.reject = reject;

    this.entityType = getEntityType(entity);

    const useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );

    const baseActorExists = Boolean(
      game.actors.find((x) => x.uuid === entity.system.uuid),
    );
    this.actorLinks = entity.system.actorState.actorLinks
      .reduce(
        (acc, link) => {
          const page = entity.parent.pages.get(link);
          if (page) {
            const image = useTokenArt ? page.system.texture : page.system.img;
            acc.push({
              page: page.id,
              actor: page.system.uuid,
              img: image,
              name: page.system.name.value,
              level: page.system.level.value,
            });
          }

          return acc;
        },
        [
          {
            page: entity.id,
            actor: entity.system.uuid,
            img: useTokenArt ? entity.system.texture : entity.system.img,
            name: entity.system.name.value,
            level: entity.system.level.value,
            current: true,
            active: entity.system.active,
            unlinked: !baseActorExists,
          },
        ],
      )
      .sort((a, b) => {
        if (a.level === b.level) {
          if (a.name < b.name) return -1;
          else if (a.name > b.name) return 1;
          else return 0;
        }

        return a.level - b.level;
      });

    this.duplicates = entity.system.actorState.actorDuplicates.reduce(
      (acc, duplicate) => {
        const actor = game.actors.find((x) => x.uuid === duplicate);
        if (actor) {
          acc.set(actor.uuid, {
            name: actor.name,
            folderPath: this.getFolderPath(actor.folder),
          });
        }

        return acc;
      },
      new Map(),
    );

    this.duplicateListOpen = false;
    this._dragDrop = this._createDragDropHandlers();
  }

  get title() {
    return game.i18n.localize("PF2EBestiary.LinkMenu.Title");
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "pf2e-bestiary-tracking-link-menu",
    classes: ["bestiary-link-menu"],
    position: { width: 400, height: "auto" },
    actions: {
      importDuplicates: this.importDuplicates,
      toggleDuplicateList: this.toggleDuplicateList,
      removeDuplicate: this.removeDuplicate,
      selectActorLink: this.selectActorLink,
      removeActorLink: this.removeActorLink,
      save: this.save,
    },
    form: { handler: this.updateData, submitOnChange: true },
    dragDrop: [
      { dragSelector: null, dropSelector: ".duplicate-section" },
      { dragSelector: null, dropSelector: ".actor-link-container.new" },
      { dragSelector: null, dropSelector: ".actor-link-container.unlinked" },
    ],
  };

  static PARTS = {
    application: {
      id: "bestiary-link-menu",
      template: "modules/pf2e-bestiary-tracking/templates/linkMenu.hbs",
    },
  };

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    this._dragDrop.forEach((d) => d.bind(htmlElement));
  }

  async _prepareContext(_options) {
    const context = await super._prepareContext(_options);
    context.actorLinks = this.actorLinks.filter((x) => !x.removed);
    context.duplicates = Object.fromEntries(this.duplicates);
    context.actors = game.actors.filter(
      (x) => !this.actorLinks.every((link) => link.uuid !== x.actor),
    );
    context.duplicateListOpen = this.duplicateListOpen;

    return context;
  }

  getFolderPath(folder) {
    if (!folder) return "";
    if (folder.folder)
      return `${folder.name}/${this.getFolderPath(folder.folder)}`;

    return folder.name;
  }

  static async updateData(event, element, formData) {
    const updateData = foundry.utils.expandObject(formData.object);

    this.render();
  }

  static importDuplicates() {
    const current = this.actorLinks.find((x) => x.active);
    const potentialDuplicates = game.actors.filter(
      (x) => x.name === current.name && x.uuid !== current.actor,
    );
    ui.notifications.info(
      game.i18n.format(
        "PF2EBestiary.LinkMenu.Notifications.DuplicatesImported",
        { nr: potentialDuplicates.length },
      ),
    );
    for (var duplicate of potentialDuplicates) {
      this.duplicates.set(duplicate.uuid, {
        name: duplicate.name,
        folderPath: this.getFolderPath(duplicate.folder),
      });
    }

    this.render();
  }

  static toggleDuplicateList(_, button) {
    this.duplicateListOpen = !this.duplicateListOpen;
    $(button).toggleClass("fa-chevron-down");
    $(button).toggleClass("fa-chevron-up");
    $(this.element).find(".duplicate-list").toggleClass("expanded");
  }

  static removeDuplicate(_, button) {
    this.duplicates.delete(button.dataset.duplicate);
    this.render();
  }

  static selectActorLink(_, button) {
    this.actorLinks = this.actorLinks.map((x) => ({
      ...x,
      active: x.actor === button.dataset.actor,
    }));
    this.render();
  }

  static removeActorLink(_, button) {
    const link = this.actorLinks.find((x) => x.actor === button.dataset.actor);
    if (link.current) {
      link.actor = null;
      link.unlinked = true;
    } else {
      link.removed = true;
    }

    this.render();
  }

  static close(options) {
    this.reject();
    super.close(options);
  }

  static async save() {
    const potentialDuplicates = Object.fromEntries(this.duplicates);
    const usedDuplicates = [];
    for (var key in potentialDuplicates) {
      const duplicate = potentialDuplicates[key];
      if (duplicate.pack) {
        const actor = await fromUuid(key);
        const newActor = await Actor.implementation.create(actor.toObject());
        usedDuplicates.push(newActor.uuid);
      } else {
        usedDuplicates.push(key);
      }
    }

    this.resolve({
      actorLinks: this.actorLinks,
      duplicates: usedDuplicates,
    });
    this.close({});
  }

  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        drop: () => game.user.isGM,
      };
      d.callbacks = {
        drop: this._onDrop.bind(this),
      };
      return new ExpandedDragDrop(d);
    });
  }

  async _onDrop(event) {
    if (!game.user.isGM) return;

    const data = TextEditor.getDragEventData(event);
    const baseItem = await fromUuid(data.uuid);

    const itemEntityType = getEntityType(baseItem);
    if (itemEntityType !== this.entityType) {
      ui.notifications.error(
        game.i18n.format(
          "PF2EBestiary.LinkMenu.Notifications.MissmatchedType",
          { new: itemEntityType, current: this.entityType },
        ),
      );
      return;
    }

    const useTokenArt = game.settings.get(
      "pf2e-bestiary-tracking",
      "use-token-art",
    );

    if (event.currentTarget.classList.contains("duplicate-container")) {
      this.duplicates.set(baseItem.uuid, {
        name: baseItem.name,
        folderPath: this.getFolderPath(baseItem.folder),
        pack: baseItem.pack,
      });
      this.render();
    }

    if (event.currentTarget.classList.contains("actor-link-container")) {
      if (
        this.actorLinks.some((x) => x.actor === baseItem.uuid && !x.removed)
      ) {
        ui.notifications.error(
          game.i18n.localize(
            "PF2EBestiary.LinkMenu.Notifications.ActorAlreadyLinked",
          ),
        );
        return;
      }
      if (event.currentTarget.classList.contains("new")) {
        this.actorLinks.push({
          actor: baseItem.uuid,
          img: useTokenArt ? baseItem.prototypeToken.texture.src : baseItem.img,
          name: baseItem.name,
          level: baseItem.system.details.level.value,
          new: true,
        });
      } else if (event.currentTarget.classList.contains("unlinked")) {
        const currentLink = this.actorLinks.find((x) => x.current);
        currentLink.unlinked = false;
        currentLink.actor = baseItem.uuid;
        currentLink.img = useTokenArt
          ? baseItem.prototypeToken.texture.src
          : baseItem.img;
        currentLink.name = baseItem.name;
        currentLink.level = baseItem.system.details.level.value;
      }

      this.render();
    }
  }
}
