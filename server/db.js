const mysql = require("mysql2/promise");
const config = require("./config");

// Shared connection pool. mysql2 auto-reconnects per checkout, so a
// restarted XAMPP/MySQL doesn't kill the API process.
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
  charset: "utf8mb4",
  timezone: "+00:00",
});

// Turns cryptic driver errors into something a human can act on.
function friendlyDbError(err) {
  if (err && err.code === "ER_BAD_DB_ERROR") {
    return new Error(
      `Database "${config.db.database}" doesn't exist. Run: pnpm db:setup`
    );
  }
  if (err && (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND")) {
    return new Error(
      `Can't reach MySQL at ${config.db.host}:${config.db.port}. ` +
        `Is XAMPP's MySQL running? (sudo /opt/lampp/lampp startmysql)`
    );
  }
  if (err && err.code === "ER_ACCESS_DENIED_ERROR") {
    return new Error(
      `MySQL rejected ${config.db.user}. Check DB_USER/DB_PASSWORD (XAMPP default is root with an empty password).`
    );
  }
  return err;
}

// query(sql, params) → [rows, fields], with friendlier errors.
async function query(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    throw friendlyDbError(err);
  }
}

// Run fn inside a transaction; rolls back on any throw.
async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback failures
    }
    throw friendlyDbError(err);
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, transaction, friendlyDbError, closePool };

// Closes idle pool connections so short-lived scripts (db:setup) can exit.
function closePool() {
  return pool.end();
}
