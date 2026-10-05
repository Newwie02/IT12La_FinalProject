// Demo data so the app isn't empty on first run.
// Runs from `pnpm db:setup` (only when the users table is empty).

const bcrypt = require("bcryptjs");
const { query } = require("./db");

const DEMO_PASSWORD = "password123";

const DEMO_USERS = [
  { name: "Ada Ramos", email: "ada@example.com", role: "musician", phone: "09171234567" },
  { name: "Miguel Cruz", email: "miguel@example.com", role: "musician", phone: "09181234567" },
  { name: "Ivy Mananday", email: "ivy@example.com", role: "musician", phone: "09191234567" },
  { name: "Angelica Tan", email: "client@example.com", role: "organizer", phone: "09201234567" },
];

const DEMO_BANDS = [
  {
    name: "Ctrl+S",
    genre: "Pop, R&B",
    location: "Visayan Village, Tagum",
    bio: "Five-piece party band playing OPM covers and R&B sets for weddings and corporate nights.",
  },
  {
    name: "IV of Speeds",
    genre: "Rock, Pop",
    location: "Maganum, Tagum",
    bio: "Loud, fast, and slightly out of tune on purpose. Rock sets and original material.",
  },
  {
    name: "Salimpusa",
    genre: "Acoustic, Folk",
    location: "Magugpo Pob, Tagum",
    bio: "Acoustic duo for cafés, intimate weddings, and lazy Sunday brunches.",
  },
  {
    name: "Barangay Brass",
    genre: "Manila Sound, Funk",
    location: "Davao City",
    bio: "Horn-driven Manila Sound revival — disco, funk, and 70s OPM dance floors.",
  },
];

const DEMO_GIGS = [
  {
    title: "Wedding Reception — Live Set",
    description: "Three 45-minute sets, acoustic-friendly volume, dinner + dance floor.",
    location: "Visayan Village, Tagum",
    date: "Sat, Oct 18 · 6:00 PM",
    pay: "₱17,000",
  },
  {
    title: "Corporate Christmas Party",
    description: "Two-hour cover set, needs a 12-piece-friendly stage.",
    location: "Tagum City Hall",
    date: "Fri, Dec 12 · 7:00 PM",
    pay: "₱25,000",
  },
  {
    title: "Café Sunday Brunch",
    description: "Mellow acoustic background music, 3 hours.",
    location: "Mabini St, Tagum",
    date: "Sun, Oct 26 · 10:00 AM",
    pay: "₱4,500",
  },
];

const DEMO_MESSAGES = [
  // [senderEmail, receiverEmail, content]
  ["ada@example.com", "miguel@example.com", "Hey! Are you free for a wedding set on the 18th?"],
  ["miguel@example.com", "ada@example.com", "Yes! I'll bring the pedalboard. What time call?"],
  ["ada@example.com", "miguel@example.com", "Load-in at 4pm, we start at 6."],
  ["client@example.com", "ada@example.com", "Hi Ada, do you have availability for a Dec party?"],
];

async function countUsers() {
  const [rows] = await query("SELECT COUNT(*) AS n FROM users");
  return Number(rows[0].n);
}

async function seedIfEmpty() {
  if ((await countUsers()) > 0) {
    console.log("→ Users table already has data — skipping seed.");
    return false;
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const userIds = {};
  for (const user of DEMO_USERS) {
    const [result] = await query(
      "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [user.name, user.email, user.phone, hash, user.role]
    );
    userIds[user.email] = result.insertId;
  }

  for (const band of DEMO_BANDS) {
    await query(
      "INSERT INTO bands (owner_id, name, genre, location, bio, photo_url) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userIds["ada@example.com"],
        band.name,
        band.genre,
        band.location,
        band.bio,
        "",
      ]
    );
  }

  for (const gig of DEMO_GIGS) {
    await query(
      "INSERT INTO gigs (organizer_id, title, description, location, date, pay) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userIds["client@example.com"],
        gig.title,
        gig.description,
        gig.location,
        gig.date,
        gig.pay,
      ]
    );
  }

  for (const [from, to, content] of DEMO_MESSAGES) {
    await query(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
      [userIds[from], userIds[to], content]
    );
  }

  console.log(
    `→ Seeded ${DEMO_USERS.length} users, ${DEMO_BANDS.length} bands, ` +
      `${DEMO_GIGS.length} gigs, ${DEMO_MESSAGES.length} messages.`
  );
  console.log("→ Demo logins (password for all: password123):");
  for (const user of DEMO_USERS) {
    console.log(`    ${user.role.padEnd(10)} ${user.email}`);
  }
  return true;
}

module.exports = { seedIfEmpty, DEMO_PASSWORD };
