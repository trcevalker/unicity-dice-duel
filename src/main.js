// ============================================================
// Unicity Coin Flip — main.js
// Built with @unicitylabs/sphere-sdk + Extension Connect
// Track: Games | Unicity Developer Program
// ============================================================

import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';
import { NETWORKS, Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// testnet2 gateway key — published as non-secret by Unicity (sphere-sdk .env.example).
const TESTNET2_API_KEY = 'sk_ddc3cfcc001e4a28ac3fad7407f99590';
const BOT_NAMETAG = 'dicebot2';
const BOT_MNEMONIC = import.meta.env.VITE_BOT_MNEMONIC;
const MIN_BET_UCT = 0.1;
const MAX_BET_UCT = 10;

// ── DOM refs ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const connectBtn     = $('connectBtn');
const walletInfoDiv  = $('walletInfo');
const identityLabel  = $('identityLabel');
const balanceBadge   = $('balanceBadge');
const botBalanceBadge = $('botBalanceBadge');
const walletStatus   = $('walletStatus');
const gameCard       = $('gameCard');
const refreshBalanceBtn = $('refreshBalanceBtn');

const betInput   = $('betInput');
const headsBtn   = $('headsBtn');
const tailsBtn   = $('tailsBtn');
const flipBtn    = $('flipBtn');
const coinEl     = $('coin');
const resultBanner = $('resultBanner');
const txInfo     = $('txInfo');
const gameStatus = $('gameStatus');

const winsCount   = $('winsCount');
const lossesCount = $('lossesCount');
const historyList = $('historyList');

// ── State ───────────────────────────────────────────────────
let client = null;       // user's ConnectClient (via Sphere Wallet extension/popup)
let myNametag = '';
let botSphere = null;    // bot's own Sphere instance — signs/sends autonomously
let choice = null;       // 'heads' | 'tails'
let stats = { wins: 0, losses: 0 };
let uctCoinId = null;     // real hex coinId for UCT, read from sphere_getBalance
let uctDecimals = null;   // real decimals for UCT, read from sphere_getBalance
let coinRotation = 0;     // cumulative rotateY degrees, so the coin keeps spinning forward
let history = [];        // last games, newest first: { win, coinResult, betUct }

// ── Helpers ─────────────────────────────────────────────────
function setStatus(el, msg, type = '') {
  el.textContent = msg;
  el.className = 'status-bar' + (type ? ' ' + type : '');
}

function spinner(btn, text) {
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>${text}`;
}

function resetBtn(btn, text) {
  btn.disabled = false;
  btn.innerHTML = text;
}

function findUctAsset(assets) {
  return Array.isArray(assets) ? assets.find(a => a.symbol === 'UCT') : null;
}

// Caches the real coinId/decimals as a side effect so later sends use the
// wallet's own values instead of a guessed constant.
function cacheUctInfo(assets) {
  const uct = findUctAsset(assets);
  if (uct) {
    uctCoinId = uct.coinId;
    uctDecimals = uct.decimals;
  }
  return uct;
}

function formatUctAssets(assets) {
  const uct = findUctAsset(assets);
  if (!uct) return '0';
  const value = Number(uct.totalAmount) / 10 ** uct.decimals;
  return Number(value.toFixed(4)).toString();
}

async function updateBalance() {
  if (!client) return;
  try {
    const assets = await client.query('sphere_getBalance');
    cacheUctInfo(assets);
    balanceBadge.textContent = `💰 ${formatUctAssets(assets)} UCT`;
  } catch (e) {
    balanceBadge.textContent = '💰 Balance: (refresh to load)';
  }
}

// Lists every callable method on an object's prototype chain — used to debug
// what's actually available when an expected method misbehaves.
function listMethods(obj) {
  const methods = new Set();
  let proto = obj;
  while (proto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (typeof obj[name] === 'function') methods.add(name);
    }
    proto = Object.getPrototypeOf(proto);
  }
  return Array.from(methods);
}

// Resolves a real hex coinId from the bot's own held tokens, instead of
// guessing the 'UCT' symbol string.
function resolveBotUctCoinId() {
  if (!botSphere) return null;
  try {
    const tokens = botSphere.payments.getTokens();
    console.log('[bot] payments.getTokens():', tokens);
    if (Array.isArray(tokens) && tokens.length > 0) {
      console.log('[bot] using first token coinId:', tokens[0].coinId, 'symbol:', tokens[0].symbol);
      return tokens[0].coinId;
    }
    console.error('[bot] getTokens() returned no tokens. payments methods available:', listMethods(botSphere.payments));
    return null;
  } catch (e) {
    console.error('[bot] getTokens() threw:', e);
    console.error('[bot] payments methods available:', listMethods(botSphere.payments));
    return null;
  }
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<span class="history-empty">No games yet</span>';
    return;
  }
  historyList.innerHTML = history.slice(0, 5).map(h =>
    `<span class="history-item ${h.win ? 'win' : 'lose'}">${h.win ? '🏆' : '💸'} ${h.coinResult === 'heads' ? '🦅' : '🔵'} ${h.betUct} UCT</span>`
  ).join('');
}

function recordHistory(entry) {
  history.unshift(entry);
  history = history.slice(0, 5);
  renderHistory();
}

function fireConfetti() {
  const colors = ['#F97316', '#FF6F00', '#FFB347', '#FFD700', '#FFFFFF'];
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 6;
    piece.style.position = 'absolute';
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.4}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = '-10px';
    piece.style.opacity = '0.9';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    const duration = 1.8 + Math.random() * 1.2;
    const drift = (Math.random() - 0.5) * 200;
    piece.style.transition = `transform ${duration}s cubic-bezier(0.2,0.6,0.4,1), top ${duration}s linear, opacity ${duration}s linear`;
    container.appendChild(piece);
    requestAnimationFrame(() => {
      piece.style.top = '110%';
      piece.style.transform = `translateX(${drift}px) rotate(${360 + Math.random() * 360}deg)`;
      piece.style.opacity = '0';
    });
  }
  setTimeout(() => container.remove(), 3200);
}

// The bot has no ConnectClient, so there's no RPC layer to call the
// `sphere_getBalance` wire method through — payments.getBalance() is the
// same underlying call that method wraps on the wallet side.
function updateBotBalance() {
  if (!botSphere) return;
  try {
    const assets = botSphere.payments.getBalance('UCT');
    botBalanceBadge.textContent = `${formatUctAssets(assets)} UCT`;
    console.log('[bot] balance:', assets);
  } catch (e) {
    console.error('[bot] getBalance failed:', e);
    botBalanceBadge.textContent = `⚠️ Balance unavailable: ${e.message}`;
  }
  resolveBotUctCoinId(); // also logs payments.getTokens() output for debugging
}

// ── Bot wallet (autonomous signer — no human approval needed) ──
async function initBot() {
  if (!BOT_MNEMONIC) {
    console.error('VITE_BOT_MNEMONIC is not set — bot cannot pay out winnings.');
    botBalanceBadge.textContent = '⚠️ Bot not configured (no mnemonic)';
    return;
  }
  console.log('[bot] initializing Sphere.init() with mnemonic:', BOT_MNEMONIC);
  try {
    const providers = createBrowserProviders({
      network: 'testnet2',
      oracle: { apiKey: TESTNET2_API_KEY },
    });
    const { sphere, created } = await Sphere.init({
      ...providers,
      network: 'testnet2',
      mnemonic: BOT_MNEMONIC,
    });
    botSphere = sphere;
    console.log('[bot] Sphere.init() succeeded. created:', created, 'nametag:', sphere.identity?.nametag, 'identity:', sphere.identity);
    console.log(`[bot] nametag: @${sphere.identity?.nametag}  address: ${sphere.identity?.directAddress}`);
    if (sphere.identity?.nametag !== BOT_NAMETAG) {
      console.error(`[bot] WARNING: wallet's nametag "${sphere.identity?.nametag}" does not match expected "${BOT_NAMETAG}"`);
    }
    updateBotBalance();
  } catch (e) {
    console.error('[bot] Sphere.init() failed:', e);
    botBalanceBadge.textContent = `⚠️ Bot init failed: ${e.message}`;
  }
}
initBot();

// ── Connect to Sphere Wallet ──────────────────────────────────
// autoConnect() picks the best transport itself: extension if installed,
// iframe if embedded, otherwise a wallet popup at walletUrl.
connectBtn.addEventListener('click', async () => {
  spinner(connectBtn, 'Connecting to Sphere…');
  setStatus(walletStatus, '⏳ Waiting for Sphere wallet approval…', 'info');

  try {
    const { client: connectedClient, connection } = await autoConnect({
      dapp: {
        name: 'Unicity Coin Flip',
        description: 'Coin flip betting game against a bot, on Unicity',
        url: location.origin,
      },
      walletUrl: 'https://sphere.unicity.network',
      network: { id: NETWORKS.testnet2.networkId, name: NETWORKS.testnet2.name },
    });

    client = connectedClient;
    myNametag = connection.identity?.nametag || connection.identity?.name || 'unknown';

    // Show wallet info
    connectBtn.classList.add('hidden');
    walletInfoDiv.classList.remove('hidden');
    gameCard.classList.remove('hidden');

    identityLabel.textContent = `@${myNametag}`;
    setStatus(walletStatus, `✅ Connected as @${myNametag}`, 'success');
    await updateBalance();
    updateBotBalance();

  } catch (err) {
    resetBtn(connectBtn, '🔌 Connect Sphere Wallet');
    if (err.message?.includes('popup')) {
      setStatus(walletStatus,
        '❌ Could not open the Sphere wallet popup. Check your popup blocker, or install the extension from github.com/unicity-sphere/sphere-extension',
        'error'
      );
    } else {
      setStatus(walletStatus, `❌ ${err.message}`, 'error');
    }
  }
});

refreshBalanceBtn?.addEventListener('click', () => {
  updateBalance();
  updateBotBalance();
});

// ── Choice selection ────────────────────────────────────────
function selectChoice(value) {
  choice = value;
  headsBtn.classList.toggle('selected', value === 'heads');
  tailsBtn.classList.toggle('selected', value === 'tails');
}
headsBtn.addEventListener('click', () => selectChoice('heads'));
tailsBtn.addEventListener('click', () => selectChoice('tails'));

// ── Game logic ───────────────────────────────────────────────
flipBtn.addEventListener('click', async () => {
  if (!client) return;

  const betUct = parseFloat(betInput.value);

  if (!choice) {
    setStatus(gameStatus, '❌ Pick Heads or Tails.', 'error');
    return;
  }
  if (!betUct || betUct < MIN_BET_UCT || betUct > MAX_BET_UCT) {
    setStatus(gameStatus, `❌ Enter a bet between ${MIN_BET_UCT} and ${MAX_BET_UCT} UCT.`, 'error');
    return;
  }

  if (uctDecimals === null) {
    // Not cached yet — read the real decimals from sphere_getBalance.
    try {
      cacheUctInfo(await client.query('sphere_getBalance'));
    } catch (e) {
      console.error('Failed to resolve UCT decimals from sphere_getBalance', e);
    }
  }
  if (uctDecimals === null || !uctCoinId) {
    setStatus(gameStatus, '❌ Could not resolve UCT token info from your wallet balance.', 'error');
    return;
  }
  const bet = Math.round(betUct * 10 ** uctDecimals);

  spinner(flipBtn, 'Flipping…');
  resultBanner.className = 'result-banner';
  txInfo.classList.add('hidden');

  const result = crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0 ? 'heads' : 'tails';
  const won = result === choice;

  // 3D coin flip: spin a few full turns, landing exactly on the face that
  // matches the result (front = heads, back = tails).
  const extraSpins = 4 + Math.floor(Math.random() * 2);
  const targetMod = result === 'tails' ? 180 : 0;
  const currentMod = ((coinRotation % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta < 0) delta += 360;
  coinRotation += extraSpins * 360 + delta;
  coinEl.style.transition = 'transform 1s cubic-bezier(0.2, 0.8, 0.2, 1)';
  coinEl.style.transform = `rotateY(${coinRotation}deg)`;

  await new Promise(r => setTimeout(r, 1000));

  setStatus(gameStatus, `🪙 Landed on ${result}. Processing…`, 'info');

  try {
    if (won) {
      resultBanner.textContent = `🏆 You WIN! It landed on ${result}.`;
      resultBanner.className = 'result-banner win';
      stats.wins++;
      winsCount.textContent = stats.wins;
      recordHistory({ win: true, coinResult: result, betUct });
      fireConfetti();

      setStatus(gameStatus, `⏳ @${BOT_NAMETAG} is sending you ${betUct} UCT…`, 'info');

      try {
        if (!botSphere) throw new Error('Bot wallet is not ready');
        // Prefer the coinId from the bot's own held tokens; fall back to the
        // coinId already resolved from the user's balance (same coin either way).
        const botCoinId = resolveBotUctCoinId() || uctCoinId;
        if (!botCoinId) throw new Error('Could not resolve UCT coinId from bot tokens');
        console.log('[bot] payments.send() with coinId:', botCoinId, 'amount:', bet, 'recipient:', myNametag);
        const tx = await botSphere.payments.send({
          recipient: `@${myNametag}`,
          coinId: botCoinId,
          amount: String(bet),
        });

        setStatus(gameStatus, `✅ @${BOT_NAMETAG} sent you ${betUct} UCT!`, 'success');
        if (tx?.id) {
          txInfo.innerHTML = `📝 TX: <a href="https://explorer.unicity.network/tx/${tx.id}" target="_blank">View on Explorer</a>`;
          txInfo.classList.remove('hidden');
        }
        await updateBalance();
        updateBotBalance();
      } catch (payErr) {
        console.error('Bot payout failed', payErr);
        setStatus(gameStatus, `⚠️ You won, but the bot's payout failed: ${payErr.message}`, 'error');
      }

    } else {
      resultBanner.textContent = `💸 You LOSE! It landed on ${result}.`;
      resultBanner.className = 'result-banner lose';
      stats.losses++;
      lossesCount.textContent = stats.losses;
      recordHistory({ win: false, coinResult: result, betUct });

      if (!client?.isConnected) {
        console.error('Cannot send intent: ConnectClient is not connected', client);
        setStatus(gameStatus, '❌ Wallet is not connected — reconnect and try again.', 'error');
        resetBtn(flipBtn, '🪙 Flip Coin & Bet');
        return;
      }

      setStatus(gameStatus, `⏳ Sending ${betUct} UCT to @${BOT_NAMETAG}…`, 'info');

      try {
        // Use extension intent — pops up approval in Sphere extension.
        // Wire param is `to`, not `recipient` (Sphere Connect protocol).
        const tx = await client.intent('send', {
          to: `@${BOT_NAMETAG}`,
          amount: String(bet),
          coinId: uctCoinId,
        });

        setStatus(gameStatus, `✅ Sent ${betUct} UCT to @${BOT_NAMETAG}!`, 'success');
        if (tx?.id) {
          txInfo.innerHTML = `📝 TX: <a href="https://explorer.unicity.network/tx/${tx.id}" target="_blank">View on Explorer</a>`;
          txInfo.classList.remove('hidden');
        }
        await updateBalance();
        updateBotBalance();

      } catch (payErr) {
        console.error('client.intent("send") failed', payErr);
        if (payErr.message?.includes('rejected') || payErr.message?.includes('denied')) {
          setStatus(gameStatus, `⚠️ Payment rejected in Sphere extension. You lost but didn't pay!`, 'error');
        } else {
          setStatus(gameStatus, `⚠️ Payment failed: ${payErr.message}`, 'error');
        }
      }
    }
  } catch (err) {
    setStatus(gameStatus, `❌ Error: ${err.message}`, 'error');
  }

  resetBtn(flipBtn, '🪙 Flip Coin & Bet');
});
