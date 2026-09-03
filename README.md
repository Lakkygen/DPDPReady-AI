# DPDPReady AI

Multi-agent AI operations platform for DPDP compliance, built on Cloudflare Workers.

## Architecture

- **5 Agents:** Ops (Marcus), Growth (Amara), Research (David), Analyst (Sofia), Support (Maya)
- **Runtime:** Cloudflare Worker with D1 database
- **LLM:** OpenRouter (Gemini 2.5 Flash)
- **Interface:** Telegram bots + HTTP API
- **Security:** Approval gates, permission profiles, API token auth

## Setup

1. Install dependencies:
   ```bash
   npm install
