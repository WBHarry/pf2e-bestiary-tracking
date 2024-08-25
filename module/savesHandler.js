import { handleBestiaryMigration } from "../scripts/migrationHandler";
import { socketEvent } from "../scripts/socket";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PF2EBestiarySavesHandler extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(){
        super({});

        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        this.saveSlotDialog = {
            folder: bestiary.metadata?.save?.folder ?? '',
            name: '',
            img: '',
        }

        Hooks.on(socketEvent.UpdateBestiary, this.onBestiaryUpdate);
    }

    get title(){
        return game.i18n.localize('PF2EBestiary.SavesHandler.Name'); 
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pf2e-bestiary-tracking-save-handler',
        classes: ["pf2e-bestiary-tracking", "saves-handler"],
        position: { width: 800, height: 'auto' },
        actions: {
            createSaveSlot: this.createSaveSlot,
            loadSave: this.loadSave,
            saveActive: this.saveActive,
        },
        form: { handler: this.updateData, submitOnChange: true, submitOnClose: false },
    };
      
    static PARTS = {
        application: {
            id: "vague-descriptions-menu",
            template: "modules/pf2e-bestiary-tracking/templates/saveHandler.hbs"
        }
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);

        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        context.metadata = bestiary.metadata?.save;
        context.saveSlotDialog = this.saveSlotDialog;

        context.files = [];
        if(this.saveSlotDialog.folder){
            const folder = await FilePicker.browse('data', this.saveSlotDialog.folder);

            for(var file of folder.files){
                context.files.push(await fetch(file).then(response => response.json()));
            }
        }

        const activeFile = context.files.find(x => x.metadata.save.id === bestiary.metadata?.save?.id);
        context.saveFileOutOfDate = activeFile ? !foundry.utils.objectsEqual(bestiary, activeFile) : false;

        return context;
    }

    static async updateData(event, element, formData){
        const { saveSlotDialog } = foundry.utils.expandObject(formData.object);
        
        this.saveSlotDialog = { ...saveSlotDialog, open: this.saveSlotDialog.open };

        this.render();
    }

    static async createSaveSlot() {
        if(!this.saveSlotDialog.name){
            ui.notifications.error(game.i18n.localize("PF2EBestiary.SavesHandler.Errors.NeedName"));
            return;
        }

        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        bestiary.metadata = { 
            ...bestiary.metadata, 
            save: { folder: this.saveSlotDialog.folder, name: this.saveSlotDialog.name, id: `${this.saveSlotDialog.name}_${foundry.utils.randomID()}`, img: this.saveSlotDialog.img ? this.saveSlotDialog.img : null },
        };

        const file = new File([JSON.stringify(bestiary)], `${this.saveSlotDialog.name}.json`, { type: 'application/json' });
        await FilePicker.upload('data', this.saveSlotDialog.folder, file, {});
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);


        this.saveSlotDialog = { folder: this.saveSlotDialog.folder, name: '', img: '' };
        this.render();
    }

    static async loadSave(_, button){
        const confirmed = await Dialog.confirm({
            title: game.i18n.localize("PF2EBestiary.SavesHandler.LoadTitle"),
            content: game.i18n.localize("PF2EBestiary.SavesHandler.LoadText"),
            yes: () => true,
            no: () => false,
        });

        if(!confirmed) return;

        const folder = await FilePicker.browse('data', this.saveSlotDialog.folder);

        context.files = [];
        for(var file of folder.files){
            context.files.push(await fetch(file).then(response => response.json()));
        }

        const loadedBestiary = context.files.find(x => x.metadata.save.id === button.id);

        const migratedBestiary = await handleBestiaryMigration(loadedBestiary);

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', migratedBestiary);
        await game.socket.emit(`module.pf2e-bestiary-tracking`, {
            action: socketEvent.UpdateBestiary,
            data: { },
        });

        Hooks.callAll(socketEvent.UpdateBestiary, {});

        this.render();
    }

    static async saveActive(event){
        event.stopPropagation();
        const bestiary = game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');

        const file = new File([JSON.stringify(bestiary)], `${bestiary.metadata.save.name}.json`, { type: 'application/json' });
        await FilePicker.upload('data', this.saveSlotDialog.folder, file, {});
        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);

        this.render();
    }

    onBestiaryUpdate = async () => {
        this.render(true);
    };

    close = async (options) => {
        Hooks.off(socketEvent.UpdateBestiary, this.onBestiaryUpdate);

        return super.close(options);
    }
}