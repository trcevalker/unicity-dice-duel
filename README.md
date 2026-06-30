# 🪙 Unicity Coin Flip

A coin-flip betting game against a house bot, built on **Unicity** using the **Sphere SDK**. The dApp connects to whichever network your Sphere wallet is already on — it currently targets **testnet2**.

> **Track:** Games  
> **Reward tier target:** Bronze → Silver

---

## What It Does

You connect your Sphere wallet, choose a bet amount (0.1–10 UCT) and call Heads or Tails. The result is decided randomly:

- ✅ **You win** → the bot (`@dicebot2`) automatically sends you the bet amount — no approval needed on its side, it signs autonomously
- ✅ **You lose** → you approve sending the bet amount to `@dicebot2` via your Sphere wallet
- ✅ Win/loss stats tracked per session

---

## Tech Stack

| Layer | Tech |
|-------|------|
| SDK | `@unicitylabs/sphere-sdk` v0.10.1 |
| Frontend | Vanilla JS + Vite, deployed on Vercel |
| Bot server | Node.js/Express, deployed on Railway (persistent process) |
| Network | testnet2 |
| Identity | Sphere nametags (`@handle`) |
| Payments | `ConnectClient.intent('send', …)` (you) / `sphere.payments.send()` (bot, server-side) |

---

## Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Frontend dev server
npm run dev
# Open http://localhost:5173 — payout calls hit the deployed Railway bot
# server by default (see VITE_PAYOUT_URL below), so wins work without
# running the bot server locally.

# 3. (Optional) Run the bot server locally too
echo "BOT_MNEMONIC=your twelve words..." > .env
npm start
# Then set VITE_PAYOUT_URL=http://localhost:3001/payout to point the
# frontend at your local bot instead of the Railway deployment.
```

## Build for Production

```bash
npm run build
# Deploy dist/ to any static host. VITE_PAYOUT_URL must point at a running
# bot server (see "Payout Architecture" below); falls back to the Railway
# deployment if unset.
```

---

## How to Play

1. Open the app and connect your Sphere wallet (extension, iframe, or popup)
2. Enter a bet amount in UCT base units
3. Pick Heads or Tails
4. Click **Flip Coin & Bet** — if you win, `@dicebot2` pays you automatically; if you lose, approve the send in your wallet

---

## Payout Architecture

The bot (`@dicebot2`) runs as a **persistent Node.js process on Railway** (`server.js`), not in the browser. The frontend calls it over HTTP:

```
Frontend (Vercel)  →  POST /payout  →  Bot server (Railway, always-on)
```

**Why server-side, and why persistent (not serverless):** Unicity tokens are transferred peer-to-peer over a Nostr relay. A recipient only "sees" an incoming transfer if its wallet is actively subscribed to the relay at the moment the transfer is published — there's no way to retroactively discover a transfer after the fact. The Sphere browser extension keeps a permanent background connection, so it always catches transfers. A serverless function (Vercel) cold-starts on each request and can't maintain that subscription, so it never saw funds sent to the bot. We confirmed this directly: querying the relay for every event ever addressed to `@dicebot2`'s pubkey turned up zero `TOKEN_TRANSFER` events, even seconds after a transfer was sent live while a persistent server was connected and listening.

**Why self-mint instead of pre-funding the bot:** Testnet2 has no faucet endpoint, and (per the discovery above) funding the bot via a normal wallet-to-wallet transfer isn't reliably observable by the SDK anyway. The SDK exposes `payments.mintFungibleToken(coinId, amount)`, which mints a fresh, already-local, already-spendable token directly into the calling wallet — no network discovery needed. So on every win, the bot:

1. **Self-mints** exactly the payout amount (`mintFungibleToken`)
2. **Immediately sends** that freshly-minted token to the winner (`payments.send`)

This was verified end-to-end: `getAssets()` logged before/after `send()` shows the bot's balance going from the freshly-minted amount down to zero, and the returned transaction is a real signed, aggregator-certified state-transition (not a local stub).

⚠️ The bot's mnemonic lives only in the Railway server's environment variable (`BOT_MNEMONIC`) — it is **not** part of the public JS bundle. Self-minting is acceptable only because these are worthless testnet2 tokens; never reuse this pattern against a mainnet token contract.

---

## Agent-Based

This build is **not agent-based** (human-controlled on the player side).  
The bot side is an autonomous signer, not an AI agent — it always pays out on a loss, deterministically.

---

## Submission Checklist

- [x] Code is public on GitHub
- [x] App is deployed and live
- [x] Short description included (this README)
- [x] Clear run instructions
- [x] Not agent-based (noted above)
- [x] Submitted via Developer Portal before campaign end

---

## Links

- [Sphere SDK](https://github.com/unicity-sphere/sphere-sdk)
- [Unicity Developer Portal](https://sphere.unicity.network/developers)
- [Explorer](https://explorer.unicity.network)
