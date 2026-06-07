import nextPlugin from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettierConfig from "eslint-config-prettier";

const config = [
  {
    ignores: [".next/**", "node_modules/**", "db/migrations/**"],
  },
  ...nextPlugin,
  ...nextCoreWebVitals,
  prettierConfig,
];

export default config;
