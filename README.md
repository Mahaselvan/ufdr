# UFDR AI Investigation Assistant

A full-stack digital forensics workspace for uploading UFDR-style evidence, running natural-language investigations, visualizing communication links, and generating downloadable reports.

## What This Project Does

- Ingests `XML`, `CSV`, and `JSON` UFDR-like exports
- Normalizes records into a unified evidence model (`chat`, `call`, `contact`)
- Auto-tags suspicious signals with intelligence flags (`CRYPTO`, `FOREIGN`, `LINK`, `LONG_CALL`, `PHONE_IN_TEXT`)
- Supports natural-language querying with:
  - Hugging Face model interpretation (when token is configured)
  - Deterministic rule-based fallback (always available)
- Provides dashboard metrics, recent activity, and link analysis graph data
- Generates investigation reports in `PDF` or `CSV`
- Includes demo seed data for first-run experience

## Architecture

- `frontend/`: React + Vite UI
- `backend/`: Node.js + Express API + MongoDB
- `data/sample-ufdr.json`: optional demo evidence seed

Flow:

1. Upload file from UI (`/upload`)
2. Backend parses and normalizes records
3. Intelligence service attaches flags
4. Records stored in MongoDB
5. Query/dashboard/link/report endpoints operate on selected data scope

## Tech Stack

### Frontend
- React 18
- React Router
- Axios
- Vite

### Backend
- Express
- Mongoose
- Multer (file upload)
- `csv-parser`, `xml2js` (parsing)
- PDFKit (PDF reports)

### Database
- MongoDB

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB running locally or reachable via URI

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/Mahaselvan/ufdr.git
cd ufdr
```

### 2. Backend setup

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:5000` by default.

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

Defined in `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ufdr_ai
HF_ACCESS_TOKEN=your_hf_token_here
HF_MODEL=google/gemma-2-2b-it
```

Notes:

- `HF_ACCESS_TOKEN` is optional, but required for model-based query interpretation and answer generation.
- Without HF token, the app still works using built-in rule logic.
- Never commit real secrets to Git history.

## API Overview

Base URL: `http://localhost:5000/api`

- `POST /upload-ufdr`
  - Multipart form field: `file`
  - Accepts `.xml`, `.csv`, `.json`
- `GET /dashboard`
- `GET /activity`
- `GET /links?sourceScope=latest|file|all&sourceFile=...`
- `POST /query`
  - Body: `{ question, sourceScope, sourceFile }`
- `GET /query/examples`
- `GET /query/sources`
- `POST /query/cleanup-invalid`
- `GET /reports?sourceScope=latest|file|all&sourceFile=...`
- `POST /reports/generate`
  - Body: `{ template, format, sourceScope, sourceFile, question }`

Health check:

- `GET /health`

## Data Scope Model

Used by Query, Link Analysis, and Reports:

- `latest`: latest uploaded source file
- `file`: specific selected source file
- `all`: all records in collection

If `latest` has no file metadata, backend gracefully falls back to `all`.

## Intelligence Flags

Current rule tags:

- `CRYPTO`: crypto keywords or wallet-like patterns
- `FOREIGN`: non-`+91` international numbers
- `LINK`: URL detected
- `LONG_CALL`: call duration >= 600 seconds
- `PHONE_IN_TEXT`: phone pattern inside free text

## Supported Input Mapping

Parser normalizes common UFDR-like column/key variants to:

- `type`, `from`, `to`, `timestamp`, `content`, `country`, `durationSeconds`, `source`, `sourceFile`, `metadata`

Uploader keeps only supported record types (`chat`, `call`, `contact`) and drops empty records.

## Demo Data Behavior

- On fresh DB startup, backend auto-loads `data/sample-ufdr.json` as demo records.
- Uploading a real file removes demo records (`isDemoData: true`) before inserting new evidence.

Manual seed command:

```bash
cd backend
npm run seed
```

## Scripts

### Backend (`backend/package.json`)

- `npm run dev` - start with nodemon
- `npm start` - start with node
- `npm run seed` - seed sample data

### Frontend (`frontend/package.json`)

- `npm run dev` - dev server
- `npm run build` - production build
- `npm run preview` - preview build locally

## Project Structure

```text
ufdr/
  backend/
    src/
      config/
      controllers/
      models/
      routes/
      services/
      utils/
    uploads/
    .env.example
  frontend/
    src/
      api/
      components/
      pages/
      styles/
  data/
    sample-ufdr.json
```

## Security and Git Hygiene

- Keep `backend/.env` out of version control.
- Use placeholder values only in `backend/.env.example`.
- If a secret is ever committed, rotate it and rewrite Git history before pushing.

## Current Limitations

- Login page is showcase-only (no real authentication/authorization)
- No role-based access control
- Query understanding quality depends on model availability and prompt behavior
- Large UFDR datasets may need pagination/streaming for scale

## Suggested Next Improvements

1. Add real authentication (JWT/session + RBAC)
2. Add pagination and server-side filtering for large queries
3. Add test coverage (unit + integration + API contract tests)
4. Add Docker Compose for one-command startup
5. Add CI checks (lint, build, tests, secret scan)
