import { build } from "esbuild";

await build({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "ES2022",
  logLevel: "info",
  sourcemap: true,
  minify: false,
  outfile: "main.js",
});
