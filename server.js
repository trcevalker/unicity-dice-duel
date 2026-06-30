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
const SYNC_INTERVAL_MS = 20_000;

let botSphere = null;

async function initBot() {
  const mnemonic = process.env.BOT_MNEMONIC;
  if (!mnemonic) throw new Error('BOT_MNEMONIC env var is not set');

  const providers = createNodeProviders({
    network: 'testnet2',
    dataDir: DATA_DIR,
    tokensDir: path.join(DATA_DIR, 'tokens'),
    oracle: { apiKey: TESTNET2_API_KEY },
    transport: { debug: true },
    debug: true,
  });

  console.log('[bot] transport relays:', JSON.stringify(providers.transport?.relays ?? providers.transport));

  // Raw listener directly on the transport, bypassing the Payments module,
  // to see if ANY token-transfer event ever reaches this process at all.
  providers.transport.onTokenTransfer?.((transfer) => {
    console.log('[bot] RAW onTokenTransfer fired:', JSON.stringify(transfer));
  });

  const { sphere } = await Sphere.init({ ...providers, network: 'testnet2', mnemonic });
  console.log('[bot] Sphere.init() done. nametag:', sphere.identity?.nametag,
              'address:', sphere.identity?.directAddress);

  try { await sphere.payments.sync?.(); } catch (e) { console.warn('[bot] initial sync error:', e.message); }

  botSphere = sphere;

  // Keep relay subscription alive and log balance periodically so incoming
  // transfers are received while this process is running.
  setInterval(async () => {
    try {
      await sphere.payments.sync?.();
      const assets = await sphere.payments.getAssets?.().catch(() => []);
      const uct = Array.isArray(assets) ? assets.find(a => a.symbol === 'UCT') : null;
      console.log('[bot] heartbeat — UCT balance:', uct ? uct.totalAmount : '0',
                  'transport connected:', providers.transport?.isConnected?.());
    } catch (e) {
      console.warn('[bot] heartbeat sync failed:', e.message);
    }
  }, SYNC_INTERVAL_MS);
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
    const assets = await botSphere.payments.getAssets?.().catch(() => []);
    console.log('[payout] assets before send:', JSON.stringify(assets));

    const tx = await botSphere.payments.send({ recipient, coinId, amount: String(amount) });
    console.log('[payout] send() succeeded tx:', JSON.stringify(tx));

    const assetsAfter = await botSphere.payments.getAssets?.().catch(() => []);
    const botBalance = Array.isArray(assetsAfter)
      ? (assetsAfter.find(a => a.symbol === 'UCT')?.totalAmount ?? '0')
      : '0';

    return res.json({ ok: true, tx, botBalance });
  } catch (e) {
    console.error('[payout] failed:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// Start bot init then listen — requests that arrive before init completes get 503.
initBot().catch(e => console.error('[bot] init failed:', e.message));
app.listen(PORT, () => console.log(`Bot server on port ${PORT}`));
