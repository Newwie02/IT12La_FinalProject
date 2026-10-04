# GigMatch (IT12 Final Project)

Expo (React Native) app + a **separate Node/Express API** that stores data in
**XAMPP's MySQL/MariaDB**.

```
phone (Expo Go) ──► Metro :8081 ─┐
                                 ├─► API (Express) :8080 ──► MySQL (XAMPP) :3306
phone (Expo Go) ─────────────────┘
```

## 1. One-time setup

```bash
pnpm install          # app + API dependencies
sudo /opt/lampp/lampp start    # if XAMPP's MySQL isn't running yet
pnpm db:setup         # creates the `gigmatch` database, tables and demo data
```

`db:setup` is safe to re-run (it never wipes existing data).

### Demo accounts

Password for all of them: `password123`

| Role     | Email                |
| -------- | -------------------- |
| musician | ada@example.com      |
| musician | miguel@example.com   |
| musician | ivy@example.com      |
| organizer | client@example.com  |

## 2. Running it

```bash
pnpm dev        # API + Expo together (Ctrl+C stops both)
```

or separately:

```bash
pnpm server     # API only   (pnpm server:watch restarts on changes)
pnpm start      # Expo only
```

The API prints its URLs on boot — the `network` line is what a phone on the
same Wi-Fi uses.

## 3. Real device / IP addresses

Nothing is hardcoded anymore. `api.js` resolves the base URL in this order:

1. `EXPO_PUBLIC_API_URL` — explicit override (see `.env.example`)
2. **Metro's host** — the LAN IP Metro gave this device, i.e. your machine's
   current address, so it survives DHCP changes
3. `localhost` — web and Android emulator

Requirements for a physical phone:

- Phone and laptop on the **same Wi-Fi**
- Start Expo normally (`pnpm start`) — **not** `--tunnel`, since only Metro's
  port gets tunneled, not the API's `:8080`
- If auto-detection ever picks the wrong thing, copy the `network` URL from the
  API boot output into `.env`:

  ```bash
  cp .env.example .env
  # EXPO_PUBLIC_API_URL=http://<machine-ip>:8080/api
  ```

## API

Base URL: `http://<host>:8080/api` — errors always come back as
`{ "message": "..." }` with a real HTTP status.

| Method   | Path                    | Auth | Returns                                   |
| -------- | ----------------------- | ---- | ----------------------------------------- |
| `POST`   | `/auth/signup`          | –    | `{ token, user }`                          |
| `POST`   | `/auth/login`           | –    | `{ token, user }`                          |
| `GET`    | `/auth/me`              | ✓    | `{ id, name, email, role }`                |
| `PUT`    | `/users/me/role`        | ✓    | `{ ok, role }`                             |
| `GET`    | `/users/musicians`      | ✓    | `[{ id, name, role }]` (everyone but you)  |
| `GET`    | `/bands`                | –    | `[{ id, name, genre, location, bio, ... }]`|
| `POST`   | `/bands`                | ✓    | band                                      |
| `GET`    | `/bands/:id`            | –    | band                                      |
| `GET`    | `/gigs`                 | –    | `[{ id, title, description, ... }]`        |
| `POST`   | `/gigs`                 | ✓    | gig                                       |
| `GET`    | `/gigs/:id`             | –    | gig                                       |
| `GET`    | `/messages`             | ✓    | `[{ userId, name, lastMessage }]`          |
| `GET`    | `/messages/:otherUserId`| ✓    | `[{ id, senderId, receiverId, content }]`  |
| `POST`   | `/messages`             | ✓    | message                                   |
| `GET`    | `/health`               | –    | `{ ok, database }`                         |

Auth = `Authorization: Bearer <token>` (JWT, 30 days).

### Configuration

Defaults match a stock XAMPP install; override via environment variables or a
`.env` file (loaded automatically by the `server`, `server:watch` and
`db:setup` scripts):

| Var             | Default     | Purpose                       |
| --------------- | ----------- | ----------------------------- |
| `API_PORT`      | `8080`      | API port                      |
| `DB_HOST`       | `127.0.0.1` | MySQL host                    |
| `DB_PORT`       | `3306`      | MySQL port                    |
| `DB_USER`       | `root`      | MySQL user                    |
| `DB_PASSWORD`   | *(empty)*   | MySQL password                |
| `DB_NAME`       | `gigmatch`  | Database name                 |
| `JWT_SECRET`    | dev value   | Token signing secret          |
| `JWT_EXPIRES_IN`| `30d`       | Token lifetime                |

## Project layout

```
api.js              app → API client (base URL resolution, retries, errors)
app/                Expo Router screens
components/         shared UI
server/             Express API (separate process)
  index.js          app entry, listens on 0.0.0.0:8080
  schema.sql        database schema (applied by pnpm db:setup)
  db/setup.js       create DB + tables, seed if empty
  seed.js           demo users / bands / gigs / messages
  routes/           auth, users, bands, gigs, messages
  middleware/auth.js JWT verification
scripts/dev.mjs     runs API + Expo together
```
