// ============================================================
// Unicity Dice Duel — main.js
// Built with @unicitylabs/sphere-sdk + Extension Connect
// Track: Games | Unicity Developer Program
// ============================================================

import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';

// ── DOM refs ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const connectBtn     = $('connectBtn');
const walletInfoDiv  = $('walletInfo');
const identityLabel  = $('identityLabel');
const balanceBadge   = $('balanceBadge');
const walletStatus   = $('walletStatus');
const gameCard       = $('gameCard');
const refreshBalanceBtn = $('refreshBalanceBtn');

const opponentInput  = $('opponentInput');
const betInput       = $('betInput');
const rollBtn        = $('rollBtn');
const myDice         = $('myDice');
const oppDice        = $('oppDice');
const resultBanner   = $('resultBanner');
const txInfo         = $('txInfo');
const gameStatus     = $('gameStatus');

const winsCount   = $('winsCount');
const lossesCount = $('lossesCount');
const tiesCount   = $('tiesCount');

// ── State ───────────────────────────────────────────────────
let client = null;
let myNametag = '';
let stats = { wins: 0, losses: 0, ties: 0 };

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

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

function rollDice(seed = 0) {
  const t = Date.now() + seed;
  return (((t * 1664525 + 1013904223) >>> 0) % 6) + 1;
}

async function simpleHash(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return new Uint32Array(hash)[0];
}

async function updateBalance() {
  if (!client) return;
  try {
    const balance = await client.query('sphere_getBalance');
    if (balance && balance.total !== undefined) {
      balanceBadge.textContent = `💰 ${balance.total} UCT`;
    } else if (balance) {
      balanceBadge.textContent = `💰 ${JSON.stringify(balance)}`;
    }
  } catch (e) {
    balanceBadge.textContent = '💰 Balance: (refresh to load)';
  }
}

// ── Connect to Sphere Wallet ──────────────────────────────────
// autoConnect() picks the best transport itself: extension if installed,
// iframe if embedded, otherwise a wallet popup at walletUrl.
connectBtn.addEventListener('click', async () => {
  spinner(connectBtn, 'Connecting to Sphere…');
  setStatus(walletStatus, '⏳ Waiting for Sphere wallet approval…', 'info');

  try {
    const { client: connectedClient, connection } = await autoConnect({
      dapp: {
        name: 'Unicity Dice Duel',
        description: 'P2P dice betting game on Unicity',
        url: location.origin,
      },
      walletUrl: 'https://sphere.unicity.network',
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

refreshBalanceBtn?.addEventListener('click', updateBalance);

// ── Game logic ───────────────────────────────────────────────
rollBtn.addEventListener('click', async () => {
  if (!client) return;

  const opponent = opponentInput.value.trim().replace(/^@/, '');
  const bet = parseInt(betInput.value, 10);

  if (!opponent) {
    setStatus(gameStatus, '❌ Enter opponent\'s Unicity ID.', 'error');
    return;
  }
  if (!bet || bet < 1) {
    setStatus(gameStatus, '❌ Enter a valid bet amount.', 'error');
    return;
  }

  spinner(rollBtn, 'Rolling dice…');
  resultBanner.className = 'result-banner';
  txInfo.classList.add('hidden');

  myDice.className = 'dice rolling';
  oppDice.className = 'dice rolling';

  const animInterval = setInterval(() => {
    myDice.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
    oppDice.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
  }, 80);

  await new Promise(r => setTimeout(r, 500));
  clearInterval(animInterval);

  const myRollNum = rollDice(0);
  const oppSeed = await simpleHash(opponent + Date.now().toString().slice(0, -3));
  const oppRollNum = rollDice(oppSeed);

  myDice.textContent = DICE_FACES[myRollNum - 1];
  oppDice.textContent = DICE_FACES[oppRollNum - 1];
  myDice.className = 'dice';
  oppDice.className = 'dice';

  setStatus(gameStatus, `🎲 You rolled ${myRollNum}, @${opponent} rolled ${oppRollNum}. Processing…`, 'info');

  try {
    if (myRollNum > oppRollNum) {
      myDice.className = 'dice winner';
      oppDice.className = 'dice loser';
      resultBanner.textContent = `🏆 You WIN! Rolled ${myRollNum} vs ${oppRollNum}`;
      resultBanner.className = 'result-banner win';
      stats.wins++;
      winsCount.textContent = stats.wins;
      setStatus(gameStatus, `✅ You win! @${opponent} owes you ${bet} UCT base units.`, 'success');

    } else if (myRollNum < oppRollNum) {
      myDice.className = 'dice loser';
      oppDice.className = 'dice winner';
      resultBanner.textContent = `💸 You LOSE! Rolled ${myRollNum} vs ${oppRollNum}`;
      resultBanner.className = 'result-banner lose';
      stats.losses++;
      lossesCount.textContent = stats.losses;

      setStatus(gameStatus, `⏳ Sending ${bet} UCT base units to @${opponent}…`, 'info');

      try {
        // Use extension intent — pops up approval in Sphere extension
        const tx = await client.intent('send', {
          recipient: `@${opponent}`,
          amount: bet,
          coinId: 'UCT',
        });

        setStatus(gameStatus, `✅ Sent ${bet} UCT base units to @${opponent}!`, 'success');
        if (tx?.id) {
          txInfo.innerHTML = `📝 TX: <a href="https://explorer.unicity.network/tx/${tx.id}" target="_blank">View on Explorer</a>`;
          txInfo.classList.remove('hidden');
        }
        await updateBalance();

      } catch (payErr) {
        // User may have rejected in extension
        if (payErr.message?.includes('rejected') || payErr.message?.includes('denied')) {
          setStatus(gameStatus, `⚠️ Payment rejected in Sphere extension. You lost but didn't pay!`, 'error');
        } else {
          setStatus(gameStatus, `⚠️ Payment failed: ${payErr.message}`, 'error');
        }
      }

    } else {
      resultBanner.textContent = `🤝 TIE! Both rolled ${myRollNum} — no tokens transferred.`;
      resultBanner.className = 'result-banner tie';
      stats.ties++;
      tiesCount.textContent = stats.ties;
      setStatus(gameStatus, `🤝 Tie game! No tokens moved.`, 'info');
    }
  } catch (err) {
    setStatus(gameStatus, `❌ Error: ${err.message}`, 'error');
  }

  resetBtn(rollBtn, '🎲 Roll Dice & Bet');
});
