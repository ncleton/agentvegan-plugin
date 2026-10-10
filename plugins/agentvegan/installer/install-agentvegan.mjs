#!/usr/bin/env node
// Installe AgentVegan sur cette machine (ordinateur ou VPS personnel).
//
// Tout le travail d'AgentVegan s'exécute ici : calcul des menus, connexion et
// courses Picnic, modes de décision. Le serveur AgentVegan ne garde que la base
// de données du compte. Ce script :
//   1. associe la machine au compte AgentVegan avec un code temporaire, obtenu
//      par l'agent grâce à l'outil create_decision_device_pairing_link ;
//   2. télécharge le paquet du service local réservé aux machines associées et
//      vérifie son empreinte SHA-256 ;
//   3. l'installe comme service permanent (launchd sur macOS, systemd sur Linux) ;
//   4. attend que la machine soit connectée au serveur.
//
// Utilisation : node install-agentvegan.mjs --pairing-code <code>
//               AGENTVEGAN_PAIRING_CODE=<code> node install-agentvegan.mjs
//               node install-agentvegan.mjs --update
//
// Une fois installé, le service se met à jour seul quand une nouvelle version
// est publiée (scripts/decision-models/self-update.mjs). --update ne sert
// qu'aux machines installées avant cette mise à jour automatique, ou pour
// réparer une installation.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir, hostname, platform } from "node:os";
import { join } from "node:path";
import expectedDrives from "../native-drive-connectors.json" with { type: "json" };

const SERVER = "https://mcp.agentvegan.org";
const LOCAL_PAGE = "http://127.0.0.1:43829/";
const os = platform();

function fail(message) {
  process.stderr.write(`${JSON.stringify({ ok: false, message })}\n`);
  process.exit(1);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : null;
}

function stateDirectory() {
  if (os === "darwin") return join(homedir(), "Library", "Application Support", "AgentVegan", "DecisionService");
  if (os === "linux") return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "AgentVegan", "DecisionService");
  return fail("AgentVegan s'installe pour l'instant sur macOS et Linux. L'installation Windows n'est pas encore disponible.");
}

async function api(path, { method = "GET", token = null, body = null } = {}) {
  const response = await fetch(`${SERVER}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120_000),
  });
  return response;
}

async function main() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) fail(`Node.js 22.13 ou plus récent est nécessaire (version actuelle : ${process.versions.node}).`);
  for (const binary of ["tar", "npm"]) {
    try { execFileSync(binary, ["--version"], { stdio: "ignore" }); } catch { fail(`L'outil « ${binary} » est introuvable sur cette machine.`); }
  }
  const stateDir = stateDirectory();
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  await chmod(stateDir, 0o700);
  const configPath = join(stateDir, "device.json");
  let config = {};
  try { config = JSON.parse(await readFile(configPath, "utf8")); } catch { config = {}; }

  // Le code peut aussi venir de l'environnement, pour ne pas apparaître dans
  // la liste des processus quand l'installation est lancée à distance.
  const pairingCode = argument("--pairing-code") ?? (process.env.AGENTVEGAN_PAIRING_CODE || null);
  if (pairingCode !== null) {
    if (!/^[-_A-Za-z0-9]{40,}$/u.test(pairingCode)) fail("Code d'association invalide ou incomplet. Demande un nouveau code à AgentVegan.");
    const response = await api("/api/decision/device/pair", { method: "POST", body: { token: pairingCode, platform: os, label: hostname().slice(0, 80) || "Machine AgentVegan" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.token) fail(`Association refusée par AgentVegan (${payload.error || response.status}). Le code est valable dix minutes et une seule fois : demande-en un nouveau.`);
    // Une machine exécute Picnic pour un seul compte : si elle était associée à
    // un autre compte, son état Picnic local (chiffré) est mis de côté et le
    // nouveau compte repart d'une connexion Picnic vierge.
    const picnicStatePath = join(stateDir, "picnic-state.json");
    try {
      const previous = JSON.parse(await readFile(picnicStatePath, "utf8"));
      if (previous?.values?.account_id && previous.values.account_id !== payload.account_id) {
        const archived = join(stateDir, `picnic-state.autre-compte-${Date.now()}.json`);
        await rename(picnicStatePath, archived);
        process.stderr.write(`${JSON.stringify({ ok: true, notice: "Cette machine était associée à un autre compte : son état Picnic a été mis de côté.", archived })}\n`);
      }
    } catch (error) {
      if (error.code !== "ENOENT") fail(`État Picnic local illisible : ${error.message}`);
    }
    config = { ...config, paused: false, device_id: payload.device_id, token: payload.token };
    await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
    await chmod(configPath, 0o600);
  } else if (process.argv.includes("--update")) {
    if (!config.token) fail("Cette machine n'est pas encore associée. Relance l'installation avec un code d'association.");
  } else {
    fail("Précise --pairing-code <code> pour une première installation, ou --update pour mettre à jour.");
  }

  const manifestResponse = await api("/api/decision/device/bundle/manifest", { token: config.token });
  const manifest = await manifestResponse.json().catch(() => ({}));
  if (!manifestResponse.ok || !manifest.version || !/^[0-9a-f]{64}$/u.test(String(manifest.sha256 || ""))) {
    fail(`Paquet du service local indisponible (${manifest.error || manifestResponse.status}).`);
  }
  if (manifest.native_drive_connectors?.contract_version !== expectedDrives.contract_version
      || expectedDrives.connectors.some((expected) => !manifest.native_drive_connectors.connectors?.some((actual) =>
        actual.id === expected.id && actual.kind === expected.kind
        && actual.package_spec === expected.package_spec
        && expected.capabilities.every((capability) => actual.capabilities?.includes(capability))))) {
    fail("Le service publié n'inclut pas tous les connecteurs Drive annoncés par le plugin. L'opérateur doit publier le paquet AgentVegan correspondant avant de relancer l'installation.");
  }
  const bundle = await api("/api/decision/device/bundle", { token: config.token });
  if (!bundle.ok) fail(`Téléchargement du service local refusé (${bundle.status}).`);
  const bytes = Buffer.from(await bundle.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== manifest.sha256) fail("Le paquet téléchargé ne correspond pas à son empreinte. Relance l'installation.");
  const archive = join(stateDir, `agentvegan-device-${manifest.version}.tar.gz`);
  await writeFile(archive, bytes, { mode: 0o600 });
  execFileSync("tar", ["-xzf", archive, "-C", stateDir], { stdio: ["ignore", "pipe", "pipe"] });
  const appDir = join(stateDir, `app-${manifest.version}`);
  try {
    execFileSync(process.execPath, ["--no-warnings", join(appDir, "scripts", "decision-models", "install-bundle.mjs")], { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  } catch (error) {
    fail(`Installation du service local impossible : ${String(error.stderr || error.message).trim().slice(-800)}`);
  }

  let connected = false;
  for (let attempt = 0; attempt < 90 && !connected; attempt += 1) {
    try {
      const page = await (await fetch(LOCAL_PAGE, { signal: AbortSignal.timeout(3000) })).text();
      connected = page.includes("Connecté : Picnic est exécuté sur cette machine.");
    } catch { /* démarrage en cours */ }
    if (!connected) await new Promise((done) => setTimeout(done, 1000));
  }
  if (!connected) fail("Le service local est installé mais ne s'est pas connecté au serveur AgentVegan. Vérifie la connexion Internet de cette machine, puis relance avec --update.");
  process.stdout.write(`${JSON.stringify({ ok: true, machine: hostname(), platform: os, version: manifest.version, connected: true })}\n`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
