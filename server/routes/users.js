const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_ROLES = ["musician", "band", "organizer", "client"];

// GET /api/users/musicians  (Bearer) — everyone except me, for the
// "Fellow musician" list on dashboard-musician.
router.get("/musicians", requireAuth, async (req, res) => {
  const [rows] = await query(
    `SELECT id, name, role
       FROM users
      WHERE id <> ?
      ORDER BY id ASC
      LIMIT 50`,
    [req.user.id]
  );

  return res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role === "band" ? "Band" : r.role === "organizer" ? "Event Organizer" : "Musician",
    }))
  );
});

// PUT /api/users/me/role  (Bearer)  { role } — called by the role-select screen.
router.put("/me/role", requireAuth, async (req, res) => {
  const role = String((req.body || {}).role || "").trim();
  if (!ALLOWED_ROLES.includes(role))
    return res.status(400).json({ message: "Unknown role." });

  await query("UPDATE users SET role = ? WHERE id = ?", [role, req.user.id]);
  return res.json({ ok: true, role });
});

module.exports = router;
