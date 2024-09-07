import {
  MappingField,
  toggleNumberField,
  toggleStringField,
} from "./modelHelpers";

export class Hazard extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      hidden: new fields.BooleanField({ required: true, initial: false }),
      uuid: new fields.StringField({ required: true }),
      version: new fields.StringField({ required: true }),
      img: new fields.StringField({ required: true }),
      texture: new fields.StringField({ required: true }),
      name: toggleStringField(),
      publication: new fields.SchemaField({
        authors: new fields.StringField({}),
        license: new fields.StringField({}),
        remaster: new fields.BooleanField({}),
        title: new fields.StringField({}),
      }),
      isComplex: new fields.BooleanField({ required: true }),
      hasHealth: new fields.BooleanField({ required: true }),
      ac: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.NumberField({ required: true, integer: true }),
        custom: new fields.StringField({ nullable: true }),
        details: new fields.StringField({}),
      }),
      hp: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.NumberField({
          required: true,
          integer: true,
          nullable: true,
        }),
        custom: new fields.StringField({ nullable: true }),
        temp: new fields.NumberField({ integer: true }),
        details: new fields.StringField({}),
        negativeHealing: new fields.BooleanField({}),
      }),
      hardness: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        value: new fields.StringField({}),
      }),
      level: toggleNumberField(),
      stealth: new fields.SchemaField({
        revealed: new fields.BooleanField({ required: true, initial: false }),
        empty: new fields.BooleanField({ initial: false }),
        lore: new fields.BooleanField({}),
        note: new fields.StringField({}),
        modifiers: new fields.ArrayField(
          new fields.SchemaField({
            kind: new fields.StringField({}),
            label: new fields.StringField({}),
            modifier: new fields.NumberField({ integer: true }),
          }),
          { initial: [] },
        ),
        label: new fields.StringField({}),
        value: new fields.StringField({ required: true }),
        totalModifier: new fields.NumberField({
          required: false,
          integer: true,
        }),
      }),
      saves: new fields.SchemaField({
        fortitude: toggleNumberField(),
        reflex: toggleNumberField(),
        will: toggleNumberField(),
      }),
      attacks: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({}),
          damageStatsRevealed: new fields.BooleanField({
            required: true,
            initial: false,
          }),
          label: new fields.StringField({ required: true }),
          actions: new fields.StringField({ required: true }),
          totalModifier: new fields.NumberField({ required: true }),
          isMelee: new fields.BooleanField({ required: true }),
          additionalEffects: new MappingField(
            new fields.SchemaField({
              label: new fields.StringField({ required: true }),
              tag: new fields.StringField({ required: true }),
            }),
          ),
          traits: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.StringField({ required: true }),
              description: new fields.StringField({ required: true }),
            }),
          ),
          variants: new MappingField(
            new fields.SchemaField({
              label: new fields.StringField({}),
            }),
          ),
          damageInstances: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({}),
              category: new fields.StringField({ nullable: true }),
              damage: new fields.SchemaField({
                value: new fields.StringField({ nullable: true }),
              }),
              damageType: new fields.SchemaField({
                revealed: new fields.BooleanField({
                  required: true,
                  initial: false,
                }),
                value: new fields.StringField({ required: true }),
              }),
            }),
          ),
          rules: new fields.ObjectField({}),
        }),
      ),
      actions: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({}),
          label: new fields.StringField({ required: true }),
          category: new fields.StringField({}),
          deathNote: new fields.BooleanField({}),
          actions: new fields.StringField({ required: true }),
          traits: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              value: new fields.StringField({ required: true }),
            }),
          ),
          description: new fields.HTMLField({ required: true, initial: "" }),
        }),
      ),
      immunities: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      weaknesses: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          value: new fields.NumberField({ required: true, integer: true }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      resistances: new MappingField(
        new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          fake: new fields.BooleanField({}),
          empty: new fields.BooleanField({ initial: false }),
          type: new fields.StringField({ required: true }),
          value: new fields.NumberField({ required: true, integer: true }),
          exceptions: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
          doubleVs: new MappingField(
            new fields.SchemaField({
              revealed: new fields.BooleanField({
                required: true,
                initial: false,
              }),
              type: new fields.StringField({ required: true }),
            }),
          ),
        }),
      ),
      traits: new MappingField(new fields.SchemaField({})),
      notes: new fields.SchemaField({
        description: new fields.SchemaField({
          revealed: new fields.BooleanField({ required: true, initial: false }),
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
        player: new fields.SchemaField({
          value: new fields.HTMLField({ required: true, initial: "" }),
        }),
      }),
    };
  }

  //   _getRefreshData(actor) {

  //   }

  //   _getToggleUpdate(state, npcView) {

  //   }

  //   get initialType() {

  //   }

  prepareDerivedData() {}
}
