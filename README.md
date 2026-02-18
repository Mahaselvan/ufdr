# UFDR AI Investigation Tool (MERN MVP)

Hackathon-ready MERN project with UFDR upload, evidence parsing, rule-based intelligence, Hugging Face-powered natural language query, link analysis, and report showcase UI.

## Project Structure

- `backend/` Node + Express + MongoDB APIs
- `frontend/` React (Vite) dashboard UI
- `data/sample-ufdr.json` seeded demo UFDR-like dataset

## Features Implemented

- UFDR file upload API (`XML`, `CSV`, `JSON`) with parsing and DB ingestion
- Evidence schema for `chat`, `call`, `contact`
- Rule intelligence flags: `CRYPTO`, `FOREIGN`, `LINK`, `LONG_CALL`
- NL query endpoint (`POST /api/query`) using Hugging Face token (`HF_ACCESS_TOKEN`) to convert question to Mongo filter, with rule fallback
- Dashboard metrics + recent activity
- Link analysis graph data (`GET /api/links`)
- Report preview + generate endpoint
- Real report download (`PDF` / `CSV`) from current evidence scope
- Showcase login page (no real authentication)
- Auto-seeded demo data when database is empty, clearly marked in dashboard

## Backend Setup

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Set these in `backend/.env`:

- `HF_ACCESS_TOKEN=your_huggingface_access_token`
- `HF_MODEL=google/gemma-2-2b-it` (or your preferred text-generation/instruction model)

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and uses backend `http://localhost:5000`.

## Working Scopes (Important)

- Query, Link Analysis, and Reports now support:
  - `Latest uploaded file`
  - `Specific file`
  - `All records`
- New real uploads automatically clear seeded demo rows so analysis stays accurate.

## Seed Data (Optional Manual)

```bash
cd backend
npm run seed
```

## Demo Login

- Officer ID: any value (default: `Officer IO-2024-156`)
- Password: any value

Authentication is intentionally disabled for hackathon demo speed.
