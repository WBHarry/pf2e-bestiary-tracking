export function handleSocketEvent({ action = null, data = {} } = {}) {
  switch (action) {
    case socketEvent.UpdateBestiary:
      Hooks.callAll(socketEvent.UpdateBestiary, {
        monsterSlug: data.monsterSlug,
      });
      break;
    case socketEvent.ResetBestiaryTheme:
      Hooks.callAll(socketEvent.ResetBestiaryTheme, {});
  }
}

export const socketEvent = {
  UpdateBestiary: "UpdateBestiary",
  ResetBestiaryTheme: "ResetBestiaryTheme",
};
