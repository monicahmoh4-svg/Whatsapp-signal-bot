# WA Signal Bot — WhatsApp Auto-Broadcast Trading Signal App

Automatically scan Deriv synthetic markets, generate AI-powered trading signals, and broadcast them to your WhatsApp groups — even when you are offline.

## Features

- 🔍 **Live Market Scanner** — monitors Deriv synthetic indices in real time
- 🤖 **AI Signal Generation** — Gemini 2.5 Flash creates professional signal text
- 📲 **WhatsApp Broadcast** — sends signals directly to any WhatsApp group
- ⏰ **Alert + Signal Sequence** — pre-signal alert fires 1 minute before the actual signal
- 🌐 **Site Detection** — detects bots and branding from any linked trading site
- 📋 **Signal Templates** — 8 ready-made templates (alert, win, cooldown, session open/close…)
- 📊 **Signal History** — searchable log of all sent signals
- 👥 **Multi-Group Support** — connect and switch between multiple WhatsApp groups
- 🔄 **Server-Side Auto-Broadcast** — signals continue 24/7 even after logout
- 🗑️ **Auto-Delete** — signals removed from group after 10 minutes

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourusername/whatsapp-signal-bot
cd whatsapp-signal-bot
npm install
cp .env.example .env   # fill in your credentials
npm run dev
```

### 2. Get your Whapi.Cloud token (free)

1. Go to [whapi.cloud](https://whapi.cloud) → create a free account
2. Connect your WhatsApp number by scanning the QR code
3. Copy your **API token** from the dashboard
4. Paste it into the app under Settings

### 3. Get your Gemini AI key (free)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API Key** → create a new key
3. Add it to `.env` as `GEMINI_API_KEY=...`

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Then add environment variables in Vercel dashboard → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Google AI key |
| `ADMIN_USERNAME` | Your login username |
| `ADMIN_PASSWORD` | Your login password |
| `CRON_SECRET` | Any random secret (optional) |

---

## Server-Side Auto-Broadcast Setup

Signals stop when you close the browser by default. To make them continue 24/7:

1. Deploy the app to Vercel
2. Go to **Settings → Server Auto-Broadcast** → click **Enable Server Broadcasting**
3. Copy the two cron payloads shown
4. Go to [cron-job.org](https://cron-job.org) → free account → create **2 cron jobs**:
   - **Cron Job 1** (alert): paste the alert payload in request body, set schedule to your interval
   - **Cron Job 2** (signal): paste the signal payload, same interval — **wait 1 minute before saving** so it's naturally offset
5. Both jobs hit the same URL with `POST` method and `Content-Type: application/json`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini AI key |
| `ADMIN_USERNAME` | Yes | Login username |
| `ADMIN_PASSWORD` | Yes | Login password |
| `CRON_SECRET` | No | Protects the cron endpoint from public access |
| `NODE_ENV` | No | `development` or `production` |

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Framer Motion
- **Backend**: Express.js (Vercel serverless)
- **AI**: Google Gemini 2.5 Flash
- **WhatsApp API**: [Whapi.Cloud](https://whapi.cloud)
- **Hosting**: Vercel

---

## Why Whapi.Cloud?

The official WhatsApp Business API requires Meta green-tick approval and only supports groups created via API. Whapi.Cloud provides full WhatsApp access (including existing groups) for any WhatsApp number with no Meta approval needed — free tier available.
