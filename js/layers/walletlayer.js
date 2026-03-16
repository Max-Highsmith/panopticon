/* ===================================================================
   PANOPTICON — Wallet Ambient Layer
   Generalizable financial accounts panel. Shows cash balance, credit
   line, open positions, and transaction log. Reacts to tool calls:
   query_account_balance (highlight), transfer_funds (sending animation),
   place_market_order (position added).
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

// --- Accumulated state (persists across render calls) ---
let walletState = {
  cash_balance: 0,
  credit_available: 0,
  open_positions: [],
  transactions: [],
};

export function resetWalletState() {
  walletState = { cash_balance: 0, credit_available: 0, open_positions: [], transactions: [] };
}

function formatUSD(n) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// --- Render ---

function renderWalletPanel(contentEl, data) {
  // Merge incoming data into accumulated state
  if (data.cash_balance !== undefined) walletState.cash_balance = data.cash_balance;
  if (data.credit_available !== undefined) walletState.credit_available = data.credit_available;
  if (data.open_positions) walletState.open_positions = [...data.open_positions];
  if (data.account_balance) {
    walletState.cash_balance = data.account_balance.cash_balance;
    walletState.credit_available = data.account_balance.credit_available;
  }
  if (data._newTransaction) walletState.transactions.push(data._newTransaction);
  if (data._newPosition) walletState.open_positions.push(data._newPosition);

  contentEl.innerHTML = '';

  // Balance header
  const header = document.createElement('div');
  header.className = 'wallet-header';

  const cashBox = document.createElement('div');
  cashBox.className = 'wallet-balance-box' + (data._highlight === 'cash' ? ' flash' : '');
  cashBox.innerHTML = `<div class="wallet-balance-label">CASH</div><div class="wallet-balance-value">${formatUSD(walletState.cash_balance)}</div>`;

  const creditBox = document.createElement('div');
  creditBox.className = 'wallet-balance-box' + (data._highlight === 'credit' ? ' flash' : '');
  creditBox.innerHTML = `<div class="wallet-balance-label">CREDIT LINE</div><div class="wallet-balance-value">${formatUSD(walletState.credit_available)}</div>`;

  const totalBox = document.createElement('div');
  totalBox.className = 'wallet-balance-box wallet-total';
  totalBox.innerHTML = `<div class="wallet-balance-label">TOTAL AVAILABLE</div><div class="wallet-balance-value">${formatUSD(walletState.cash_balance + walletState.credit_available)}</div>`;

  header.appendChild(cashBox);
  header.appendChild(creditBox);
  header.appendChild(totalBox);
  contentEl.appendChild(header);

  // Pending operation indicator
  if (data._pending) {
    const pending = document.createElement('div');
    pending.className = 'wallet-pending';
    pending.textContent = data._pending;
    contentEl.appendChild(pending);
  }

  // Open positions
  if (walletState.open_positions.length > 0) {
    const section = document.createElement('div');
    section.className = 'wallet-section';
    section.innerHTML = '<div class="wallet-section-title">OPEN POSITIONS</div>';
    for (const pos of walletState.open_positions) {
      const row = document.createElement('div');
      row.className = 'wallet-position-row';
      row.innerHTML = `<span class="wallet-pos-side ${pos.side === 'YES' ? 'yes' : 'no'}">${pos.side}</span> <span class="wallet-pos-ticker">${pos.ticker}</span> <span class="wallet-pos-amount">${formatUSD(pos.amount_usd)}</span>`;
      section.appendChild(row);
    }
    contentEl.appendChild(section);
  }

  // Transaction log
  if (walletState.transactions.length > 0) {
    const section = document.createElement('div');
    section.className = 'wallet-section';
    section.innerHTML = '<div class="wallet-section-title">TRANSACTIONS</div>';
    for (const tx of walletState.transactions) {
      const row = document.createElement('div');
      row.className = 'wallet-tx-row';
      const icon = tx.type === 'wire_transfer' ? '\u2192' : '\u2022'; // → or •
      row.innerHTML = `<span class="wallet-tx-icon">${icon}</span> <span class="wallet-tx-amount">${formatUSD(tx.amount_usd)}</span> <span class="wallet-tx-detail">${tx.recipient || tx.purpose || ''}</span>`;
      section.appendChild(row);
    }
    contentEl.appendChild(section);
  }

  // Highlight flash animation — auto-remove after delay
  if (data._highlight) {
    setTimeout(() => {
      const flashEls = contentEl.querySelectorAll('.flash');
      flashEls.forEach(el => el.classList.remove('flash'));
    }, 2000);
  }
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'wallet',
  dataUrl: '', // Dynamic layer — data pushed via update(), not fetched
  panelId: 'wallet-panel',
  countId: 'wallet-count',
  logLabel: 'WALLET',
  tabLabel: 'WALLET',
  tabColor: '#ffaa00',
  renderFn: renderWalletPanel,
  countFn: (data) => formatUSD(data.cash_balance || 0),
});

registerLayerLoader('wallet', {
  load: layer.load,
  flyTo: null,
  reset: () => { resetWalletState(); layer.reset(); },
  dataUrl: '',
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
  update: layer.update,
});
