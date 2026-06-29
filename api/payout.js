import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import path from 'path';

const TESTNET2_API_KEY = 'sk_ddc3cfcc001e4a28ac3fad7407f99590';
const DATA_DIR = '/tmp/bot-wallet';

// Cache sphere instance across warm invocations of the same function container.
let cachedSphere = null;

async function getBot() {
  if (cachedSphere) return cachedSphere;

  const mnemonic = process.env.BOT_MNEMONIC;
  if (!mnemonic) throw new Error('BOT_MNEMONIC env var is not set');

  const providers = createNodeProviders({
    network: 'testnet2',
    dataDir: DATA_DIR,
    tokensDir: path.join(DATA_DIR, 'tokens'),
    oracle: { apiKey: TESTNET2_API_KEY },
  });

  const { sphere } = await Sphere.init({
    ...providers,
    network: 'testnet2',
    mnemonic,
  });

  // Pull any historical/pending incoming transfers from the aggregator.
  try { await sphere.payments.hydrateHistoryFromServer?.(); } catch (_) {}
  try { await sphere.payments.sync?.(); } catch (_) {}

  cachedSphere = sphere;
  return sphere;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { recipient, amount, coinId } = req.body ?? {};
  if (!recipient || !amount || !coinId) {
    return res.status(400).json({ error: 'Missing recipient, amount, or coinId' });
  }

  try {
    const sphere = await getBot();

    // Log bot's current token state before attempting send.
    const assets = await sphere.payments.getAssets?.().catch(() => []);
    console.log('[payout] bot assets before send:', JSON.stringify(assets));

    const tx = await sphere.payments.send({ recipient, coinId, amount: String(amount) });
    console.log('[payout] send() succeeded:', JSON.stringify(tx));

    const assetsAfter = await sphere.payments.getAssets?.().catch(() => []);
    const botBalance = Array.isArray(assetsAfter)
      ? (assetsAfter.find(a => a.symbol === 'UCT')?.totalAmount ?? '0')
      : '0';

    return res.status(200).json({ ok: true, tx, botBalance });
  } catch (e) {
    // Reset cached instance on failure so next request gets a fresh sync.
    cachedSphere = null;
    console.error('[payout] failed:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
