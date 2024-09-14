import coreDark from "./coreDark";
import coreLight from "./coreLight";
import nebula from "./nebula";
import parchment from "./parchment";
import viscera from "./viscera";
import water from "./water";

const bestiaryThemes = {
  coreLight: coreLight,
  coreDark: coreDark,
  nebula: nebula,
  viscera: viscera,
  water: water,
  // parchment: parchment,
};

export const bestiaryThemeChoices = {
  coreLight: "Core Light",
  coreDark: "Core Dark",
  nebula: "Nebula",
  viscera: "Viscera",
  water: "Water",
  // parchment: 'Parchment',
};

export default bestiaryThemes;
