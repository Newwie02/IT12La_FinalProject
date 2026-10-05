const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function toMessage(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function parseUserId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/messages (Bearer) — conversation list for the signed-in user:
// [{ userId, name, lastMessage }]  (messages.jsx keys on userId)
router.get("/", requireAuth, async (req, res) => {
  const me = req.user.id;

  const [rows] = await query(
    `SELECT id, sender_id, receiver_id, content, created_at,
            CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id
       FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY id DESC`,
    [me, me, me]
  );

  // rows are newest-first, so the first row seen per other_id is the latest.
  const latest = new Map();
  for (const row of rows) {
    if (!latest.has(row.other_id)) latest.set(row.other_id, row);
  }

  const ids = [...latest.keys()];
  if (!ids.length) return res.json([]);

  const placeholders = ids.map(() => "?").join(", ");
  const [users] = await query(
    `SELECT id, name FROM users WHERE id IN (${placeholders})`,
    ids
  );
  const names = new Map(users.map((u) => [u.id, u.name]));

  const conversations = ids.map((userId) => {
    const row = latest.get(userId);
    return {
      userId,
      name: names.get(userId) || "Unknown user",
      lastMessage: row.content,
      updatedAt: row.created_at,
    };
  });

  return res.json(conversations);
});

// GET /api/messages/:otherUserId (Bearer) — the chat thread, oldest first.
router.get("/:otherUserId", requireAuth, async (req, res) => {
  const otherId = parseUserId(req.params.otherUserId);
  if (!otherId) return res.status(400).json({ message: "Invalid user id." });
  if (otherId === req.user.id)
    return res.status(400).json({ message: "You can't open a thread with yourself." });

  const [users] = await query("SELECT id FROM users WHERE id = ? LIMIT 1", [otherId]);
  if (!users.length) return res.status(404).json({ message: "That user doesn't exist." });

  const me = req.user.id;
  const [rows] = await query(
    `SELECT id, sender_id, receiver_id, content, created_at
       FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY id ASC`,
    [me, otherId, otherId, me]
  );

  return res.json(rows.map(toMessage));
});

// POST /api/messages (Bearer)  { receiverId, content }
router.post("/", requireAuth, async (req, res) => {
  const body = req.body || {};
  const receiverId = parseUserId(body.receiverId);
  const content = String(body.content || "").trim();

  if (!receiverId) return res.status(400).json({ message: "receiverId is required." });
  if (!content) return res.status(400).json({ message: "Message can't be empty." });
  if (content.length > 4000)
    return res.status(400).json({ message: "Message is too long (max 4000 characters)." });
  if (receiverId === req.user.id)
    return res.status(400).json({ message: "You can't message yourself." });

  const [users] = await query("SELECT id FROM users WHERE id = ? LIMIT 1", [receiverId]);
  if (!users.length) return res.status(404).json({ message: "That user doesn't exist." });

  const [result] = await query(
    "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
    [req.user.id, receiverId, content]
  );

  const [rows] = await query("SELECT * FROM messages WHERE id = ? LIMIT 1", [result.insertId]);
  return res.status(201).json(toMessage(rows[0]));
});

module.exports = router;
