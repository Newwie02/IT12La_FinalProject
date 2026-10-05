const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function toGig(row) {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    title: row.title,
    description: row.description || "",
    location: row.location || "",
    date: row.date || "",
    pay: row.pay || "",
    createdAt: row.created_at,
  };
}

// GET /api/gigs — plain array
router.get("/", async (_req, res) => {
  const [rows] = await query("SELECT * FROM gigs ORDER BY id DESC LIMIT 100");
  return res.json(rows.map(toGig));
});

// GET /api/gigs/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid gig id." });

  const [rows] = await query("SELECT * FROM gigs WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) return res.status(404).json({ message: "Gig not found." });
  return res.json(toGig(rows[0]));
});

// POST /api/gigs (Bearer)  { title, description, location, date, pay }
router.post("/", requireAuth, async (req, res) => {
  const body = req.body || {};
  const title = String(body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Gig title is required." });

  const [result] = await query(
    `INSERT INTO gigs (organizer_id, title, description, location, date, pay)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      title,
      String(body.description || "").trim(),
      String(body.location || "").trim(),
      String(body.date || "").trim(),
      String(body.pay || "").trim(),
    ]
  );

  const [rows] = await query("SELECT * FROM gigs WHERE id = ? LIMIT 1", [result.insertId]);
  return res.status(201).json(toGig(rows[0]));
});

module.exports = router;
