# 🎲 Unicity Dice Duel

A peer-to-peer dice betting game built on **Unicity Mainnet** using the **Sphere SDK**.

> **Track:** Games  
> **Reward tier target:** Bronze → Silver  
> **Network:** mainnet

---

## What It Does

Two players connect their Unicity wallets, choose a bet amount (in UCT base units), and roll dice. The higher roll wins — and the loser's bet is automatically sent to the winner via Sphere SDK's `payments.send()`.

- ✅ Each player gets a **Unicity ID** (nametag like `@alice`)  
- ✅ Each player holds a **Sphere wallet** with real mainnet UCT tokens  
- ✅ The **loser automatically sends** the bet amount to the winner on-chain  
- ✅ Ties result in no token transfer  
- ✅ Win/loss/tie stats tracked per session  

---

## Tech Stack

| Layer | Tech |
|-------|------|
| SDK | `@unicitylabs/sphere-sdk` v0.10.7 |
| Frontend | Vanilla JS + Vite |
| Network | Unicity Mainnet |
| Identity | Sphere nametags (`@handle`) |
| Payments | `sphere.payments.send()` |

---

## Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

## Build for Production

```bash
npm run build
# Deploy the dist/ folder to any static host (Vercel, Netlify, GitHub Pages)
```

---

## How to Play

1. Open the app and create a wallet with a unique nametag (e.g. `dicemaster42`)
2. **Save your recovery phrase** — it's the only way to restore your wallet
3. Make sure your wallet holds real UCT tokens via the [Unicity Developer Portal](https://sphere.unicity.network) (you need a Unicity ID first)
4. Enter your opponent's `@nametag` and a bet amount in UCT base units
5. Click **Roll Dice & Bet** — dice roll, winner is determined, loser's client sends tokens

---

## Sphere SDK Usage

```js
import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// Create / restore wallet
const { sphere, generatedMnemonic } = await Sphere.init({
  ...createBrowserProviders({ network: 'mainnet' }),
  autoGenerate: true,
  nametag: 'dicemaster42',
});

// Send tokens to the winner
await sphere.payments.send({
  recipient: '@opponent',
  coinId: 'UCT',
  amount: '100000',  // 0.1 UCT
});
```

---

## Agent-Based

This build is **not agent-based** (human-controlled).  
For an agent extension, see `AGENT_EXTENSION.md`.

## Mainnet

All transactions run against Unicity **mainnet** — real UCT value is at risk. Bet responsibly.

---

## Submission Checklist

- [x] Code is public on GitHub
- [x] App is deployed and live
- [x] Short description included (this README)
- [x] Clear run instructions for mainnet
- [x] Not agent-based (noted above)
- [x] Submitted via Developer Portal before campaign end

---

## Links

- [Sphere SDK](https://github.com/unicity-sphere/sphere-sdk)
- [Unicity Developer Portal](https://sphere.unicity.network/developers)
- [Mainnet Explorer](https://explorer.unicity.network)
