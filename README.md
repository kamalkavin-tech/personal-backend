# VaultX Backend

Zero-trust personal vault **API**. The server stores only encrypted (AES-256-GCM) payloads and never sees plaintext user data.

Built with **NestJS 10**, **MongoDB (Mongoose)**, **Redis**, **JWT**, and **Zod**.

## Features

- Auth: register, login, refresh tokens (httpOnly cookie), 2FA (TOTP + backup codes), change/forgot/reset password, device & session management
- Vault entries (passwords, notes, identities, cards, API keys, secrets, journal, addresses, contacts), folders, trash & restore
- Files & photos with GridFS, albums, favorites, storage quotas
- Backups (snapshots + restore), security overview/history/audit, notifications, dashboard stats
- Rate limiting, Helmet, Argon2 password hashing, audit logging

## Getting Started

```bash
npm install
npm run docker:up     # optional: local MongoDB + Redis containers
npm run dev
```

The API listens on `http://localhost:4000/api`.

```bash
# create your local env
copy .env.example .env
```

Configure `MONGO_URI` (MongoDB Atlas or local Docker) and `REDIS_URL` in `.env`. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Scripts

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Start NestJS in watch mode on :4000        |
| `npm run build`     | Build shared package + server              |
| `npm run typecheck` | Build shared, then type-check server       |
| `npm run docker:up` | Start local MongoDB + Redis containers     |

## Structure

```
apps/server       NestJS application
packages/shared   Shared Zod schemas + types (compiled package)
docker            Local MongoDB + Redis compose
```
