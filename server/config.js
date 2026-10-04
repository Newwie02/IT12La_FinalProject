// Server configuration.
// Everything can be overridden with env vars (see .env.example) — the
// defaults match a stock XAMPP install on this machine.

const config = {
  port: Number(process.env.API_PORT || process.env.PORT || 5000),
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "gigmatch",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "gigmatch-dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  },
};

module.exports = config;
