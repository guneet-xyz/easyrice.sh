import { type Config } from "prettier"

const config: Config = {
  trailingComma: "none",
  semi: false,
  plugins: [
    "prettier-package-json",
    "prettier-plugin-tailwindcss",
    "@ianvs/prettier-plugin-sort-imports"
  ]
}

export default config
