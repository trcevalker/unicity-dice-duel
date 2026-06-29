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
| Frontend | Vanilla JS + Vite |
| Network | testnet2 |
| Identity | Sphere nametags (`@handle`) |
| Payments | `ConnectClient.intent('send', …)` (you) / `sphere.payments.send()` (bot) |

---

## Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Set the bot wallet mnemonic (see "Bot Wallet" below)
echo "VITE_BOT_MNEMONIC=your twelve words..." > .env

# 3. Start dev server
npm run dev

# 4. Open http://localhost:5173
```

## Build for Production

```bash
npm run build
# Deploy the dist/ folder to any static host (Vercel, Netlify, GitHub Pages)
# VITE_BOT_MNEMONIC must be set in the build environment (e.g. a GitHub Actions secret)
```

---

## How to Play

1. Open the app and connect your Sphere wallet (extension, iframe, or popup)
2. Enter a bet amount in UCT base units
3. Pick Heads or Tails
4. Click **Flip Coin & Bet** — if you win, `@dicebot2` pays you automatically; if you lose, approve the send in your wallet

---

## Bot Wallet

`@dicebot2` is a real testnet2 wallet whose mnemonic is loaded directly in the browser via `Sphere.init()` (not through Connect/extension), so it can sign and send `payments.send()` autonomously when it loses — no human approval step exists for the bot.

⚠️ **This means the bot's mnemonic ships inside the public JS bundle.** Anyone can read it from DevTools and drain the bot's wallet. This is acceptable here only because the funds are testnet2 tokens with no real value. Never reuse this pattern with a mainnet-funded wallet.

The bot needs a UCT balance to pay out wins — fund `@dicebot2`'s address from another testnet2 wallet if its balance runs low (shown in the app under "🤖 @dicebot2 balance").

```js
import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

const { sphere } = await Sphere.init({
  ...createBrowserProviders({ network: 'testnet2', oracle: { apiKey: 'sk_...' } }),
  mnemonic: import.meta.env.VITE_BOT_MNEMONIC,
});

await sphere.payments.send({ recipient: '@player', coinId: 'UCT', amount: '100000' });
```

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
