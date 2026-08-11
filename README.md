# 😈 Devil AI (Open-Truly Chat) — Multi-Persona WhatsApp AI Automation Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![Baileys WASocket](https://img.shields.io/badge/WhatsApp-Baileys%20v6.x-25D366.svg)](https://github.com/WhiskeySockets/Baileys)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-4EA94B.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![Samsung One UI Dark Theme](https://img.shields.io/badge/UI%20Design-Samsung%20One%20UI%20Dark-7c3aed.svg)]()

> **Devil AI** is a state-of-the-art, 24/7 automated sales, support, and conversational AI platform for WhatsApp. Built with **Node.js**, **Baileys WASocket**, **MongoDB**, **OpenRouter GPT-4o**, **Whisper Voice Transcription**, and **React**, it features a sleek **Samsung One UI Dark Mode** dashboard for complete control.

---

## 🌟 Key Features

### 1. 🤖 Multi-Persona AI Companion Engine
- **3 Built-in Companions**:
  - **😈 Devil's AI**: Smart, unfiltered, highly capable assistant.
  - **👦 Dhruv Mode**: Casual Hinglish brotherly vibe.
  - **👧 Annu Mode**: Warm, sweet girlfriend persona.
- **🎭 Custom Persona Studio**: Build unlimited custom AI agents with custom System Prompts, temperature sliders, and quick templates (Sales Closer, Support Specialist, Real Estate Bot, etc.).

### 2. 🧠 Knowledge Base RAG & Web Scraper
- **PDF & File Upload**: Ingest product catalogs, pricing sheets, or WhatsApp chat logs into MongoDB.
- **Native Web Scraper**: Scrape website URLs directly into AI memory without external package overhead.

### 3. 🖼️ Vision & 🎙️ Voice Note AI (Multimodal)
- **GPT-4o Vision API**: Analyzes images sent over WhatsApp and responds in the active persona.
- **Whisper Audio Transcription & TTS**: Listens to WhatsApp voice notes and replies back with natural audio voice notes.

### 4. 🏷️ Smart Lead CRM Pipeline (Kanban Board)
- Visual 5-stage drag-and-drop CRM pipeline (`Inquiry`, `Hot Lead`, `High Value`, `Deal Closed`, `Inactive`).
- Inline notes editor and direct WhatsApp chat window trigger.

### 5. 🖼️ Media & Document Auto-Attachments
- Attach PDFs, product photos, or voice notes triggered by user keywords (`catalog`, `pricing`, `brochure`).

### 6. ⏰ Automated Drip Sequences & Follow-Ups
- Auto-send follow-up messages after custom inactivity rules (e.g. 24-hour lead check-in).

### 7. 📢 Broadcast & Anti-Ban Campaign Manager
- Send bulk announcements to contacts with randomized anti-ban delivery pacing (2s–10s jitter delays).

### 8. ⏸️ User STOP / Opt-Out Support
- Contacts can type `STOP` or `PAUSE` anytime to pause AI replies, and `START` to re-enable.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, Socket.io
- **WhatsApp Engine**: `@whiskeysockets/baileys` (native WebSocket connection, no browser needed)
- **AI Models**: OpenRouter (GPT-4o / GPT-4o Mini), Whisper Speech-to-Text, OpenAI TTS
- **Database**: MongoDB Atlas / Native MongoDB Driver
- **Frontend**: React 18, Vite, Vanilla CSS (Samsung One UI Dark Design System)

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js v18+
- npm / npx
- MongoDB URI (Atlas or Local)
- OpenRouter / OpenAI API Key

### 1. Clone Repository
```bash
git clone https://github.com/dhruv9671267714/devil-ai.git
cd devil-ai
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=3000
OPENROUTER_API_KEY=your_openrouter_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wsapai?retryWrites=true&w=majority
ENABLE_WHATSAPP=true
WA_AUTH_FOLDER=./auth_info_baileys
```

### 4. Build Client & Start Server
```bash
# Build React frontend
cd client
npm run build
cd ..

# Start Node.js server
npm start
```

Open `http://localhost:3000` in your browser to access the Admin Console and scan the WhatsApp QR code!

---

## 🛡️ Security & Privacy Notice

This repository contains **NO API keys, passwords, credentials, or session tokens**. All sensitive configuration values are loaded securely via environment variables (`.env`).

---

## 📜 License & Credits

Distributed under the MIT License. See `LICENSE` for more information.

- **Original Open-Truly-Chat Project**: Developed by [jeetvani](https://github.com/jeetvani/open-truly-chat)
- **Major Baileys Engine & UI Upgrade**: Developed by **Dhruv** ([rootds-coder](https://github.com/rootds-coder)) 🚀

