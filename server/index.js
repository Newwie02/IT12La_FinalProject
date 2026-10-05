// GigMatch API — separate Node process.
//
//   pnpm server          start once
//   pnpm server:watch    restart on file changes
//   pnpm db:setup        create schema + seed demo data (run once)
//
// Listens on 0.0.0.0 so a phone running Expo Go on the same Wi-Fi can
// reach it; every reachable URL is printed on boot.

const os = require("os");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const { pool, friendlyDbError } = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const bandRoutes = require("./routes/bands");
const gigRoutes = require("./routes/gigs");
const messageRoutes = require("./routes/messages");

const app = express();

app.use(cors()); // lets the web build talk to the API during development
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: config.db.database });
  } catch (err) {
    res.status(503).json({ ok: false, message: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bands", bandRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/messages", messageRoutes);

// Unknown route → JSON, never an HTML error page (api.js always parses JSON).
app.use((req, res) => {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
});

// Final error handler: always { message } so the app can show it verbatim.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body isn't valid JSON." });
  }
  const friendly = friendlyDbError(err);
  if (friendly !== err) console.error("[api] db error:", friendly.message);
  else console.error("[api] error:", err);
  res
    .status(err && err.status ? err.status : 500)
    .json({ message: friendly.message || "Something went wrong on the server." });
});

function lanAddresses() {
  const out = [];
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos || []) {
      if (info.family === "IPv4" && !info.internal) out.push(info.address);
    }
  }
  return out;
}

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log("");
  console.log("  GigMatch API running");
  console.log(`    local     http://localhost:${config.port}/api`);
  for (const ip of lanAddresses()) {
    console.log(`    network   http://${ip}:${config.port}/api`);
  }
  console.log(`    database  ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
  console.log("");
  console.log("  The phone and this machine must be on the same Wi-Fi.");
  console.log("  The app picks the network URL automatically from Metro's host.");
  console.log("");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`✗ Port ${config.port} is already in use. Stop the other process or set API_PORT.`);
  } else {
    console.error("✗ Server failed to start:", err.message);
  }
  process.exit(1);
});

// Don't take the process down for a dropped MySQL connection.
pool.on("error", (err) => console.error("[api] pool error:", friendlyDbError(err).message));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log("\n[api] shutting down.");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
