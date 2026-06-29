# 🎲 Unicity Dice Duel

A peer-to-peer dice betting game built on **Unicity** using the **Sphere SDK**. The dApp connects to whichever network your Sphere wallet is already on — it does not target a specific network itself.

> **Track:** Games  
> **Reward tier target:** Bronze → Silver

---

## What It Does

Two players connect their Unicity wallets, choose a bet amount (in UCT base units), and roll dice. The higher roll wins — and the loser's bet is automatically sent to the winner via Sphere SDK's `payments.send()`.

- ✅ Each player gets a **Unicity ID** (nametag like `@alice`)  
- ✅ Each player holds a **Sphere wallet** with real UCT tokens  
- ✅ The **loser automatically sends** the bet amount to the winner on-chain  
- ✅ Ties result in no token transfer  
- ✅ Win/loss/tie stats tracked per session  

---

## Tech Stack

| Layer | Tech |
|-------|------|
| SDK | `@unicitylabs/sphere-sdk` v0.10.7 |
| Frontend | Vanilla JS + Vite |
| Network | Whichever network the connected Sphere wallet is on |
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

// Create / restore wallet — uses whichever network the wallet is already configured for
const { sphere, generatedMnemonic } = await Sphere.init({
  ...createBrowserProviders(),
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

## Network

This dApp doesn't target a specific network — it connects via Sphere Connect to whichever network your wallet is already configured for. If that's mainnet, real UCT value is at risk. Bet responsibly.

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
