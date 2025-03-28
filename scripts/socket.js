export function handleSocketEvent({ action = null, data = {} } = {}) {
  switch (action) {
    case socketEvent.UpdateBestiary:
      Hooks.callAll(socketEvent.UpdateBestiary, {
        monsterSlug: data.monsterSlug,
      });
      break;
  }
}

export const socketEvent = {
  UpdateBestiary: "UpdateBestiary",
};
