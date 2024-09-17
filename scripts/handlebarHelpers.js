export default class RegisterHandlebarsHelpers {
  static registerHelpers() {
    Handlebars.registerHelper({
      PF2EBTNrKeys: this.nrKeys,
      PF2EBTMonsterValue: this.monsterValue,
      PF2EBTSlice: this.slice,
      PF2EBTToggleContainer: this.toggleContainer,
      PF2EBTToggleContainerOverride: this.toggleContainerOverride,
      PF2EBTEach: this.each,
      PF2EBTFilter: this.filter,
      PF2EBTImageState: this.imageState,
      PF2EBTTertiary: this.tertiary,
      PF2EBTCaptialize: this.capitalize,
      PF2EBTSub: this.sub,
      PF2EBTEven: this.even,
    });
  }

  static nrKeys(obj, prop, context) {
    return obj
      ? prop && context
        ? Object.keys(obj).filter((x) => obj[x][prop]).length
        : Object.keys(obj).length
      : 0;
  }

  static monsterValue(prop, flag, ignoreLabel, context) {
    return (
      prop.custom ??
      (flag &&
      (!game.user.isGM ||
        !game.settings.get("pf2e-bestiary-tracking", "vague-descriptions")
          .settings.gmNumeric) &&
      prop.category
        ? game.i18n.localize(prop.category)
        : ignoreLabel && context
          ? prop.value
          : (game.i18n.localize(prop.label) ?? prop.value))
    );
  }

  static slice(value, length) {
    return value.slice(0, length);
  }

  static toggleContainer(user, property) {
    var containerClass = " data-container";

    if (property.revealed || !user.isGM)
      containerClass = containerClass.concat(" revealed ");
    if (user.isGM) {
      containerClass = containerClass.concat(" toggle-container");
      if (property.custom || property.fake)
        containerClass = containerClass.concat(" misinformation");
    }

    return containerClass;
  }

  static toggleContainerOverride(contrastRevealedState, property) {
    if (!game.user.isGM || !contrastRevealedState.enabled) return "";

    if (property.revealed)
      return `background: ${contrastRevealedState.revealed}`;
    else return `background: ${contrastRevealedState.hidden}`;
  }

  static each(context, options) {
    var ret = "";
    const keys = Object.keys(context);
    for (var i = 0; i < keys.length; i++) {
      ret =
        ret +
        options.fn({
          ...context[keys[i]],
          key: keys[i],
          index: i,
          length: keys.length,
        });
    }

    return ret;
  }

  static filter(prop, fallback, leftMargin, context, use, op) {
    const options = op ?? use;
    var ret = "";
    var keys = Object.keys(context);

    if (op && !use) {
      for (var i = 0; i < keys.length; i++) {
        ret =
          ret +
          options.fn({
            ...context[keys[i]],
            key: keys[i],
            last: i === keys.length - 1,
            index: i,
            length: keys.length,
          });
      }

      return ret;
    }

    var filteredContext = {};
    for (var i = 0; i < keys.length; i++) {
      if (!prop || foundry.utils.getProperty(context[keys[i]], prop)) {
        filteredContext[keys[i]] = context[keys[i]];
      }
    }

    keys = Object.keys(filteredContext);
    if (keys.length === 0)
      return `<div style="margin-left: ${leftMargin}px;">${fallback}</div>`;

    for (var i = 0; i < keys.length; i++) {
      ret =
        ret +
        options.fn({
          ...context[keys[i]],
          key: keys[i],
          last: i === keys.length - 1,
          index: i,
          length: keys.length,
        });
    }

    return ret;
  }

  static imageState(user, state) {
    switch (state) {
      case 1:
        return "outline";
      case 3:
        return "sepia";
      default:
        return "";
    }
  }

  static tertiary(a, b) {
    return a ?? b;
  }

  static capitalize(text) {
    return text.capitalize();
  }

  static sub(a, b) {
    return a - b;
  }

  static even(a) {
    return a % 2;
  }
}
