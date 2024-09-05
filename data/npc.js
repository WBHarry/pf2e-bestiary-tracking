import { dispositions } from "./constants";
import { Creature } from "./creature";
import { getNPCData, MappingField } from "./modelHelpers";

export class NPC extends Creature {
    static defineSchema() {
        const fields = foundry.data.fields;
        const creatureFields = super.defineSchema();
        return {
           ...creatureFields,
           npcData: new fields.SchemaField({
                categories: new fields.ArrayField(new fields.SchemaField({
                    hidden: new fields.BooleanField({}),
                    value: new fields.StringField({ required: true }),
                    name: new fields.StringField({ required: true }),
                })),
                general: new fields.SchemaField({
                    background: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.HTMLField({}),
                    }),
                    appearance: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    personality: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    height: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    weight: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    birthplace: new fields.SchemaField({
                        revealed: new fields.BooleanField({ required: true, initial: false }),
                        value: new fields.StringField({}),
                    }),
                    disposition: new MappingField(new fields.StringField({ required: true, choices: dispositions, initial: dispositions.indifferent.value })),
                }),
           }),
        }
    }

    _getRefreshData(actor){
        const data = getNPCData(actor);
        const creatureData = super._getRefreshData(actor, data);
        return {
            ...creatureData,
            system: {
                ...creatureData.system,
                npcData: {
                    general: {
                        background: { ...data.system.npcData.background, revealed: this.npcData.general.background.revealed },
                        appearance: { ...data.system.npcData.appearance, revealed: this.npcData.general.appearance.revealed },
                        personality: { ...data.system.npcData.personality, revealed: this.npcData.general.personality.revealed },
                        height: { ...data.system.npcData.height, revealed: this.npcData.general.height.revealed },
                        weight: { ...data.system.npcData.weight, revealed: this.npcData.general.weight.revealed },
                        birthplace: { ...data.system.npcData.birthplace, revealed: this.npcData.general.birthplace.revealed }
                    }
                }
            }
        };
    }

    _getToggleUpdate(state){
        const creatureData = super._getToggleUpdate(state);
        return {
            ...creatureData,
            system: {
                ...creatureData.system,
                npcData: {
                    general: {
                        "background.revealed": state,
                        "appearance.revealed": state,
                        "personality.revealed": state,
                        "height.revealed": state,
                        "weight.revealed": state,
                        "birthplace.revealed": state,
                        disposition: Object.keys(this.disposition).reduce((acc, key) => {
                            acc[key] = { revealed: state };
                            return acc;
                        }, {}),
                    }
                }
            }
        };
    }

    get partyDispositions(){
        const partyCharacters = game.actors.find(x => x.type === 'party' && x.active)?.system?.details?.members?.map(x => {
            const actor = game.actors.find(actor => actor.uuid === x.uuid);
            return {
                value: dispositions.indifferent.value,
                id: actor.id,
                name: actor.name,
            };
        }) ?? [];
        return partyCharacters.reduce((acc, character) => {
            const disposition = this.npcData.general.disposition[character.id];
            acc.push({
                value: disposition ?? dispositions.indifferent.value,
                label: disposition ? dispositions[disposition].name : dispositions.indifferent.name,
                id: character.id,
                name: character.name,
            });

            return acc;
        }, []);
    }

    prepareDerivedData(){
        super.prepareDerivedData();
    }
}