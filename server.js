import { webcrypto } from 'node:crypto';
// Some Node versions (Railway's Nixpacks default included) don't expose the
// Web Crypto API as a bare global yet — the SDK's uuid dependency needs it.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import express from 'express';
import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTNET2_API_KEY = 'sk_ddc3cfcc001e4a28ac3fad7407f99590';
const DATA_DIR = process.env.BOT_DATA_DIR || path.join(__dirname, 'bot-wallet-data');
const PORT = process.env.PORT || 3001;

let botSphere = null;

async function initBot() {
  const mnemonic = process.env.BOT_MNEMONIC;
  if (!mnemonic) throw new Error('BOT_MNEMONIC env var is not set');

  const providers = createNodeProviders({
    network: 'testnet2',
    dataDir: DATA_DIR,
    tokensDir: path.join(DATA_DIR, 'tokens'),
    oracle: { apiKey: TESTNET2_API_KEY },
  });

  const { sphere } = await Sphere.init({ ...providers, network: 'testnet2', mnemonic });
  console.log('[bot] Sphere.init() done. nametag:', sphere.identity?.nametag,
              'address:', sphere.identity?.directAddress);

  botSphere = sphere;
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, botReady: !!botSphere }));

app.get('/balance', async (_req, res) => {
  if (!botSphere) return res.status(503).json({ error: 'Bot not ready yet' });
  const assets = await botSphere.payments.getAssets?.().catch(() => []);
  res.json({ assets });
});

app.post('/payout', async (req, res) => {
  if (!botSphere) return res.status(503).json({ error: 'Bot not ready yet' });

  const { recipient, amount, coinId } = req.body ?? {};
  if (!recipient || !amount || !coinId) {
    return res.status(400).json({ error: 'Missing recipient, amount, or coinId' });
  }

  try {
    // Testnet2 has no faucet and incoming P2P transfers from the Sphere
    // extension aren't discoverable by this SDK session (confirmed: extension
    // sends never appear as kind-31113 events on the public relay this SDK
    // listens to). So self-mint exactly the payout amount right before
    // sending it, instead of depending on a pre-funded balance.
    const mintResult = await botSphere.payments.mintFungibleToken(coinId, BigInt(amount));
    if (!mintResult?.success) {
      throw new Error(`Mint failed: ${mintResult?.error ?? 'unknown error'}`);
    }
    console.log('[payout] minted token:', mintResult.tokenId, 'amount:', amount);

    const assetsBefore = await botSphere.payments.getAssets?.().catch(() => []);
    console.log('[payout] getAssets() before send():', JSON.stringify(assetsBefore));

    const tx = await botSphere.payments.send({ recipient, coinId, amount: String(amount) });
    console.log('[payout] send() succeeded tx:', JSON.stringify(tx));

    const assetsAfter = await botSphere.payments.getAssets?.().catch(() => []);
    console.log('[payout] getAssets() after send():', JSON.stringify(assetsAfter));

    return res.json({ ok: true, tx });
  } catch (e) {
    console.error('[payout] failed:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

initBot().catch(e => console.error('[bot] init failed:', e.message));
app.listen(PORT, () => console.log(`Bot server on port ${PORT}`));
