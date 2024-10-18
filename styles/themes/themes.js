import coreDark from "./coreDark";
import coreLight from "./coreLight";
import nebula from "./nebula";
import viscera from "./viscera";
import water from "./water";

export const bestiaryThemes = {
  coreLight: {
    name: "PF2EBestiary.Themes.CoreLight",
    props: coreLight,
  },
  coreDark: {
    name: "PF2EBestiary.Themes.CoreDark",
    props: coreDark,
  },
  nebula: {
    name: "PF2EBestiary.Themes.Nebula",
    props: nebula,
  },
  viscera: {
    name: "PF2EBestiary.Themes.Viscera",
    props: viscera,
  },
  water: {
    name: "PF2EBestiary.Themes.Water",
    props: water,
  },
  // parchment: parchment,
};

export const extendedBestiaryThemes = () => {
  const customThemes = game.settings.get(
    "pf2e-bestiary-tracking",
    "custom-themes",
  );
  return { ...bestiaryThemes, ...customThemes };
};

export const bestiaryThemeChoices = {
  coreLight: "PF2EBestiary.Themes.CoreLight",
  coreDark: "PF2EBestiary.Themes.CoreDark",
  nebula: "PF2EBestiary.Themes.Nebula",
  viscera: "PF2EBestiary.Themes.Viscera",
  water: "PF2EBestiary.Themes.Water",
  // parchment: 'Parchment',
};

export const defaultThemeChoices = () => {
  const customThemes = game.settings.get(
    "pf2e-bestiary-tracking",
    "custom-themes",
  );
  return {
    ...bestiaryThemeChoices,
    ...Object.keys(customThemes).reduce((acc, x) => {
      acc[x] = customThemes[x].name;
      return acc;
    }, {}),
  };
};

export const extendedBestiaryThemeChoices = () => {
  const customThemes = game.settings.get(
    "pf2e-bestiary-tracking",
    "custom-themes",
  );
  return {
    default: "PF2EBestiary.Themes.Default",
    ...bestiaryThemeChoices,
    ...Object.keys(customThemes).reduce((acc, x) => {
      acc[x] = customThemes[x].name;
      return acc;
    }, {}),
  };
};
