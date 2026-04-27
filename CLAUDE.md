# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Learning Assistant** — a PDF Research Assistant and Prompt Sandbox. Upload PDFs, ask questions about them via Claude, and score prompts for quality.

There are **two separate frontend implementations**:
- `index.html` (root) — a fully self-contained vanilla JS demo. It does **not** call the backend; uploads are simulated, chat uses hardcoded replies, and sandbox scoring is done locally with a heuristic algorithm. Used for workshop/demo purposes without needing a running server.
- `frontend/` — the real React + TypeScript app that calls the FastAPI backend.

## Running the App

### Backend
```bash
cd backend
pip install fastapi uvicorn anthropic pypdf python-dotenv
cp .env.example .env   # add your ANTHROPIC_API_KEY
uvicorn main:app --reload
```
Runs on `http://localhost:8000`.

### Frontend (React app)
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`. The API base URL is hardcoded as `http://localhost:8000` in `frontend/src/App.tsx`.

### Vanilla demo
Just open `index.html` in a browser — no server needed.

> **Note:** The vanilla demo's sandbox scoring (`scoreQuestion` in `index.html`) is a purely local heuristic (word count, keyword presence, question mark detection) — it produces different results than the backend `/sandbox` endpoint, which calls Claude. The chat replies in the demo are also hardcoded strings, not real AI responses.

## Architecture

### Backend (`backend/main.py`)
- FastAPI with a global in-memory `documents` dict (`filename → extracted text`). **State resets on server restart.**
- PDF text is extracted with `pypdf` and truncated to 20,000 characters per file.
- `POST /upload` — accepts a PDF, stores extracted text.
- `GET /docs` — lists uploaded document names.
- `POST /chat` — multi-turn Q&A: injects all document text (up to 15k chars) into the system prompt, then calls `claude-opus-4-7`.
- `POST /sandbox` — prompt quality scorer: sends the user's question to Claude with a JSON-only response schema (`score`, `feedback`, `improved`).

### Frontend (`frontend/src/App.tsx`)
Single-file React app with three tab views rendered from one component tree:
- **Upload tab** — drag-and-drop or click to upload a PDF; calls `/upload`.
- **Chat tab** (`ChatSection`) — conversational UI; maintains message history client-side and sends it with each request to `/chat`.
- **Sandbox tab** (`SandboxSection`) — submits a prompt to `/sandbox` and renders the score (1–10), feedback, and a rewritten version.

### Environment
- `ANTHROPIC_API_KEY` must be set in `backend/.env` (see `backend/.env.example`).
- No database — all uploaded document text is held in the backend process memory.
