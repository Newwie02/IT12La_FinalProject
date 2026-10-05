const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { signToken, publicUser, requireAuth, findUserById } = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup  { name, email, password, role?, phone? }
router.post("/signup", async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "musician").trim();
  const phone = String(body.phone || "").trim();

  if (!name) return res.status(400).json({ message: "Name is required." });
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ message: "Enter a valid email address." });
  if (password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  if (!["musician", "band", "organizer", "client"].includes(role))
    return res.status(400).json({ message: "Unknown role." });

  const [existing] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length)
    return res.status(409).json({ message: "That email is already registered." });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await query(
    "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
    [name, email, phone || null, hash, role]
  );

  const user = { id: result.insertId, name, email, phone, role };
  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required." });

  const [rows] = await query(
    "SELECT id, name, email, phone, role, password_hash FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const row = rows[0];

  // Same message for "no such user" and "wrong password" — don't leak which.
  if (!row) return res.status(401).json({ message: "Invalid email or password." });

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid email or password." });

  const user = { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
  return res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me  (Bearer)
router.get("/me", requireAuth, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ message: "Account no longer exists." });
  return res.json(publicUser(user));
});

module.exports = router;
