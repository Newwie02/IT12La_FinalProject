// Runs the API and Expo together so `pnpm dev` starts everything.
// Output from both processes is prefixed, and Ctrl+C stops both.
//
//   pnpm dev
//
// The API can also be run on its own: `pnpm server`.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const children = [];
let shuttingDown = false;

// Fail fast with an explanation instead of letting Expo detect "another
// window" and quit right after startup.
function portFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen({ port, host: "0.0.0.0" }, () => probe.close(() => resolve(true)));
  });
}

function prefixWriter(prefix, stream) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += String(chunk);
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) process.stdout.write(`${prefix} ${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buffer.trim()) process.stdout.write(`${prefix} ${buffer}\n`);
  });
}

function start(name, color, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    // stdin inherited so Expo's interactive prompts/keys work in a terminal
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  });
  const prefix = `\u001b[${color}m[${name}]\u001b[0m`;
  prefixWriter(prefix, child.stdout);
  prefixWriter(prefix, child.stderr);

  child.on("error", (err) => {
    process.stdout.write(`${prefix} failed to start: ${err.message}\n`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    process.stdout.write(`${prefix} exited (${signal || code})\n`);
    if (!shuttingDown) shutdown(code || 0);
  });

  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 400).unref();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(0));
}

const expoBin = path.join(root, "node_modules", ".bin", "expo");
if (!existsSync(expoBin)) {
  console.error("expo binary not found — run `pnpm install` first.");
  process.exit(1);
}

const apiPort = process.env.API_PORT || process.env.PORT || "5000";
const metroPort = process.env.EXPO_PORT || "8081";

const busy = [];
if (!(await portFree(Number(apiPort)))) busy.push(`port ${apiPort} (API)`);
if (!(await portFree(Number(metroPort)))) busy.push(`port ${metroPort} (Metro/Expo)`);
if (busy.length) {
  console.error(
    `\n✗ ${busy.join(" and ")} already in use — another instance is probably ` +
      `running.\n  Stop it first (Ctrl+C in that terminal) and run \`pnpm dev\` again.`
  );
  process.exit(1);
}

start("api", "36", process.execPath, ["--env-file-if-exists=.env", "server/index.js"]);
start("expo", "35", expoBin, ["start"]);
