const jwt = require("jsonwebtoken");
const config = require("../config");
const { query } = require("../db");

// Verifies `Authorization: Bearer <jwt>` and puts {id, role, name} on req.user.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Not authorized: missing token." });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    const expired = err && err.name === "TokenExpiredError";
    return res.status(401).json({
      message: expired
        ? "Your session expired. Please log in again."
        : "Not authorized: invalid token.",
    });
  }

  req.user = { id: payload.id, role: payload.role, name: payload.name };
  return next();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// Standard user shape returned by signup/login.
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
  };
}

async function findUserById(id) {
  const [rows] = await query(
    "SELECT id, name, email, phone, role FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

module.exports = { requireAuth, signToken, publicUser, findUserById };
