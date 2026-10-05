// Idempotent database setup: applies server/schema.sql, then seeds demo
// data if the users table is empty.
//
//   pnpm db:setup

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const config = require("../config");
const { closePool } = require("../db");
const { seedIfEmpty } = require("../seed");

async function main() {
  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  // Connect without selecting a database first so CREATE DATABASE works.
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    console.log(
      `→ Applying schema to MySQL at ${config.db.host}:${config.db.port} ...`
    );
    await conn.query(sql);
    console.log(`→ Schema ready (database: ${config.db.database}).`);
  } finally {
    await conn.end();
  }

  await seedIfEmpty();
  await closePool(); // otherwise the pool's idle socket keeps the script alive
  console.log("✓ Done. Start the API with: pnpm server");
}

main().catch((err) => {
  console.error("✗ db:setup failed:", err.message);
  process.exitCode = 1;
});
