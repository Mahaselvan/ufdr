# UFDR AI Investigation Assistant

UFDR AI Investigation Assistant is a full-stack digital forensics workspace for ingesting UFDR-like exports, running natural-language evidence queries, visualizing communication links, and generating downloadable investigation reports.

## Pages

### Login
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/2e76ed2a-d950-4eea-9b61-5298eed5b3fd" />

### Dashboard
<img width="1918" height="1072" alt="image" src="https://github.com/user-attachments/assets/d67fe2b2-68a6-4647-bf51-3dc593a75f9b" />

### UFDR Upload
<img width="1919" height="1073" alt="image" src="https://github.com/user-attachments/assets/fe5a3a6c-e289-46c0-90b9-ccd5211d45c5" />

### Query Evidence 
<img width="1918" height="1069" alt="image" src="https://github.com/user-attachments/assets/517171d1-3e59-4134-8b0a-97c225aa5d75" />

### Link Analysis
<img width="1919" height="1069" alt="image" src="https://github.com/user-attachments/assets/5f9641b6-7e70-4754-9311-14ff9022cb9b" />

### Report Generation
<img width="1917" height="1072" alt="image" src="https://github.com/user-attachments/assets/551c8e9b-a787-4b7e-a426-b124bedc1fc0" />


## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Data Scope Model](#data-scope-model)
- [Supported Input Mapping](#supported-input-mapping)
- [Demo Data Behavior](#demo-data-behavior)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Limitations](#limitations)
- [Roadmap](#roadmap)

## Overview
The platform is designed for investigation workflows where analysts need to:
- Upload evidence exports (`.xml`, `.csv`, `.json`)
- Normalize mixed schemas into a single evidence model
- Detect suspicious patterns (crypto, foreign contacts, links, long calls)
- Ask plain-English questions over evidence
- Explore communication networks
- Export reports for sharing

## Features
- Multi-format UFDR-like ingestion (`XML`, `CSV`, `JSON`)
- Record normalization into unified fields (`chat`, `call`, `contact`)
- Intelligence flagging:
  - `CRYPTO`
  - `FOREIGN`
  - `LINK`
  - `LONG_CALL`
  - `PHONE_IN_TEXT`
- Natural-language investigation queries with:
  - Hugging Face interpretation/generation (if token is configured)
  - Rule-based fallback (always available)
- Dashboard metrics and recent activity feed
- Link analysis graph with scope controls and edge filtering
- PDF/CSV report generation
- Auto-seeded demo dataset for first run

## Tech Stack
### Frontend
- React 18
- React Router
- Axios
- Vite

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Multer (file uploads)
- `csv-parser` + `xml2js` (file parsing)
- PDFKit (report generation)

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
    package.json
  frontend/
    src/
      api/
      components/
      pages/
      styles/
    package.json
  data/
    sample-ufdr.json
  README.md
```

## How It Works
1. Upload a UFDR-like export from the frontend (`/upload`).
2. Backend parses and normalizes records into a common schema.
3. Intelligence service tags suspicious indicators.
4. Records are stored in MongoDB.
5. Query, dashboard, link analysis, and report modules operate on selected data scope.

## Prerequisites
- Node.js `18+`
- npm `9+`
- MongoDB instance (local or remote)

## Quick Start
### 1. Clone
```bash
git clone https://github.com/Mahaselvan/ufdr.git
cd ufdr
```

### 2. Setup and run backend
```bash
cd backend
copy .env.example .env
npm install
npm run dev
```
Backend default: `http://localhost:5000`

### 3. Setup and run frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend default: `http://localhost:5173`

## Configuration
Set values in `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ufdr_ai
HF_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
HF_MODEL=google/gemma-2-2b-it
```

Notes:
- `HF_ACCESS_TOKEN` is optional.
- If no token is provided, query interpretation and answer generation fall back to deterministic rule logic.
- Frontend API URL is currently hardcoded in `frontend/src/api/client.js` as `http://localhost:5000/api`.

## API Reference
Base URL: `http://localhost:5000/api`

### Health
- `GET /health`

### Upload
- `POST /upload-ufdr`
- Content type: `multipart/form-data`
- Field: `file`
- Supported extensions: `.xml`, `.csv`, `.json`

### Dashboard + Graph
- `GET /dashboard`
- `GET /activity`
- `GET /links?sourceScope=latest|file|all&sourceFile=<name>`

### Query
- `POST /query`
- Body:
```json
{
  "question": "Show me foreign communications",
  "sourceScope": "latest",
  "sourceFile": ""
}
```
- `GET /query/examples`
- `GET /query/sources`
- `POST /query/cleanup-invalid`

### Reports
- `GET /reports?sourceScope=latest|file|all&sourceFile=<name>`
- `POST /reports/generate`
- Body:
```json
{
  "template": "Full Investigation Report",
  "format": "PDF",
  "sourceScope": "latest",
  "sourceFile": "",
  "question": "Summarize evidence in scope"
}
```

## Data Scope Model
Used across query, links, and reports:
- `latest`: latest uploaded source file
- `file`: specific selected source file
- `all`: full dataset

Fallback behavior:
- If `latest` cannot resolve a source file, backend gracefully downgrades to `all`.

## Supported Input Mapping
Parser maps common UFDR-like fields to this normalized model:
- `type`
- `from`
- `to`
- `timestamp`
- `content`
- `country`
- `durationSeconds`
- `source`
- `sourceFile`
- `metadata`

Only `chat`, `call`, and `contact` records are persisted.
Rows with no meaningful values are discarded.

## Demo Data Behavior
- On fresh database startup, backend seeds `data/sample-ufdr.json` as demo records.
- Demo records are marked with `isDemoData: true`.
- When a real upload is ingested, demo records are removed before insert.

Manual seeding:
```bash
cd backend
npm run seed
```

## Scripts
### Backend (`backend/package.json`)
- `npm run dev` - start server with nodemon
- `npm start` - start server with node
- `npm run seed` - seed demo dataset

### Frontend (`frontend/package.json`)
- `npm run dev` - start Vite dev server
- `npm run build` - build production bundle
- `npm run preview` - preview built bundle

## Troubleshooting
- Upload says "No supported records found":
  - Ensure records can map to `chat`, `call`, or `contact` and include at least one meaningful field.
- Query returns empty results:
  - Try `sourceScope=all` to verify records exist outside latest file scope.
- Frontend cannot reach backend:
  - Confirm backend is running on `:5000` and that `frontend/src/api/client.js` base URL matches.
- No AI answer quality improvement:
  - Configure valid `HF_ACCESS_TOKEN` and verify model accessibility.

## Security Notes
- Never commit real secrets in `backend/.env`.
- Keep only placeholder values in `backend/.env.example`.
- If a secret is exposed, rotate it and rewrite Git history before pushing.

## Limitations
- Login is local showcase mode (no real authentication/authorization)
- No RBAC or audit trails
- Result sets are capped in backend endpoints (for responsiveness)
- Large-scale cases may require pagination and indexing strategy improvements

## Roadmap
1. Add real auth (`JWT/session`) and RBAC.
2. Add pagination + advanced server-side filtering.
3. Add tests (unit, integration, API contract).
4. Add Docker Compose for one-command startup.
5. Add CI checks (lint, build, tests, secret scan).
