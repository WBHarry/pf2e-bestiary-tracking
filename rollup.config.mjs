import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "pf2e-bestiary-tracking.js",
  output: {
    file: "BestiaryTracking.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [resolve()],
};
