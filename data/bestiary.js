export class Bestiary extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      version: new fields.StringField({
        required: true,
        nullable: true,
        initial: null,
      }),
      npcCategories: new fields.ArrayField(
        new fields.SchemaField({
          key: new fields.StringField({ required: true }),
          name: new fields.StringField({ required: true }),
        }),
        { initial: [] },
      ),
    };
  }

  get creatures() {
    return this.pages.filter((page) => page.type === "creature");
  }

  get npcs() {
    return this.pages.filter((page) => page.type === "npc");
  }

  get hazards() {
    return this.pages.filter((page) => page.type === "hazard");
  }

  prepareDerivedData() {}
}
