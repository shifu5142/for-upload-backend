const { accessSync, copyFileSync, mkdirSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const compiledEntry = "dist/main.js";

try {
  accessSync(compiledEntry);
} catch {
  const result = spawnSync(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "-p", "tsconfig.build.json"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

mkdirSync("dist/lib", { recursive: true });
copyFileSync("src/lib/prompts.json", "dist/lib/prompts.json");
