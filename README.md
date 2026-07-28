# MyoMT Utilities Suite

Personal productivity toolkit — 10 self-contained HTML tools sharing one design language and one localStorage.

## Tools

| Tool | What it does |
|---|---|
| 📋 Task Manager | Kanban + auto time-tracking + standup export |
| 🎙 AI Note Taker | Voice-to-text + AI summarize (Gemini/Groq/Ollama/etc.) |
| ✨ AI Note Taker Enterprise | Meeting Mode, grounded search, dual-voice podcast, mind map, flashcards |
| 🎧 Recap Audio Maker | Text → spoken audio (Gemini TTS) |
| 🔐 Password Manager | AES-256 encrypted vault, screenshot attachments |
| 🔧 SQL Formatter | Pretty-print SQL, keyword casing, syntax highlight |
| 🚀 SQL Deploy | Generate PowerShell deploy scripts from .sql folders |
| 🐙 GitHub Trending | Live trending repos with topic filters |
| 📚 Study Room | Focused study environment |
| ⚙ Settings | Central hub — `Ctrl+,` from anywhere |

## Run locally

Double-click `serve.bat` — pure PowerShell HTTP server, no install needed. Serves on `http://localhost:8000` and shows your LAN IP so you can hit it from phone/tablet on the same WiFi.

## Install as PWA

When served over HTTP(S) (not `file://`), a floating **Install App** button appears bottom-right. Click → OS install prompt → home-screen icon.

## Data & privacy

- **Everything stays in browser localStorage** — nothing uploaded, no backend
- **API keys** (Gemini, Groq, etc.) live only in your browser
- **Password Manager** uses AES-256-GCM encryption on your master password
- **AI calls** go directly from your browser to the chosen provider (Gemini/Groq/Anthropic/etc.) — no proxy, no logging

## Shortcuts

- `Ctrl+K` — Command Palette (search all data across tools)
- `Ctrl+,` — Settings hub

## Built by

MyoMT · not for public distribution · personal use only
