export function handleSocketEvent({action=null, data={}}={}) {
    switch (action) {
        case socketEvent.UpdateBestiary:
            Hooks.callAll(socketEvent.UpdateBestiary, { monsterSlug: data.monsterSlug });
            break;
        case socketEvent.MonsterEditingUpdate:
            Hooks.callAll(socketEvent.MonsterEditingUpdate);
            break;
    }
}
  
export const socketEvent = {
    UpdateBestiary: "UpdateBestiary",
    MonsterEditingUpdate: "MonsterEditingUpdate",
};