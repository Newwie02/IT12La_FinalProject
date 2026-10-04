const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function toBand(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    genre: row.genre || "",
    location: row.location || "",
    bio: row.bio || "",
    photoUrl: row.photo_url || "",
    createdAt: row.created_at,
  };
}

// GET /api/bands — plain array (discover.jsx does setBands(data) directly)
router.get("/", async (_req, res) => {
  const [rows] = await query("SELECT * FROM bands ORDER BY id DESC LIMIT 100");
  return res.json(rows.map(toBand));
});

// GET /api/bands/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid band id." });

  const [rows] = await query("SELECT * FROM bands WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) return res.status(404).json({ message: "Band not found." });
  return res.json(toBand(rows[0]));
});

// POST /api/bands (Bearer)  { name, genre, location, bio, photoUrl }
router.post("/", requireAuth, async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Band name is required." });

  const [result] = await query(
    `INSERT INTO bands (owner_id, name, genre, location, bio, photo_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      name,
      String(body.genre || "").trim(),
      String(body.location || "").trim(),
      String(body.bio || "").trim(),
      String(body.photoUrl || "").trim(),
    ]
  );

  const [rows] = await query("SELECT * FROM bands WHERE id = ? LIMIT 1", [result.insertId]);
  return res.status(201).json(toBand(rows[0]));
});

module.exports = router;
