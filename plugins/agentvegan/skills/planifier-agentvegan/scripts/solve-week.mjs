#!/usr/bin/env node
import fs from "node:fs";
import { solvePortableWeek } from "./portable-solver.mjs";

const [contextPath, outputPath, excludedPath] = process.argv.slice(2);
if (!contextPath || !outputPath) {
  process.stderr.write("Usage : node solve-week.mjs <contexte.json> <certificat.json> [recettes-exclues.json]\n");
  process.exit(2);
}

try {
  const context = JSON.parse(fs.readFileSync(contextPath, "utf8"));
  const excluded = excludedPath ? JSON.parse(fs.readFileSync(excludedPath, "utf8")) : [];
  const certificate = await solvePortableWeek(context, { excluded_recipe_ids: excluded });
  fs.writeFileSync(outputPath, `${JSON.stringify(certificate, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ ok: true, plan_id: certificate.plan_id, plan_hash: certificate.plan_hash, output: outputPath })}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
