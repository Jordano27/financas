// ── Auth ──────────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'fin_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Alternância login / cadastro ──────────────────────────────────────────────
function showView(view) {
  document.getElementById('loginView').classList.toggle('hidden', view !== 'login');
  document.getElementById('registerView').classList.toggle('hidden', view !== 'register');
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('registerError').classList.add('hidden');
  document.getElementById('loginForm').reset();
  document.getElementById('registerForm').reset();
  resetStrengthBar();
  if (view === 'login') document.getElementById('loginEmail').focus();
  else document.getElementById('regName').focus();
}

function showLoginOverlay() {
  document.getElementById('loginOverlay').classList.remove('hidden');
  showView('login');
}

function hideLoginOverlay() {
  document.getElementById('loginOverlay').classList.add('hidden');
}

// ── Validações frontend ───────────────────────────────────────────────────────
function validateRegisterForm(name, email, password, confirm) {
  if (!name || name.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido';
  if (!password || password.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
  if (!/[a-zA-Z]/.test(password)) return 'Senha deve conter pelo menos uma letra';
  if (!/[0-9]/.test(password)) return 'Senha deve conter pelo menos um número';
  if (password !== confirm) return 'As senhas não coincidem';
  return null;
}

function calcStrength(password) {
  if (!password) return { score: 0, label: '', cls: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Fraca', cls: 'weak' };
  if (score <= 2) return { score, label: 'Razoável', cls: 'fair' };
  if (score <= 3) return { score, label: 'Boa', cls: 'good' };
  return { score, label: 'Forte', cls: 'strong' };
}

function resetStrengthBar() {
  const bar = document.getElementById('passStrength');
  if (bar) bar.classList.add('hidden');
}

function updateStrengthBar(password) {
  const bar = document.getElementById('passStrength');
  const fill = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  if (!bar || !fill || !label) return;
  if (!password) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const { score, label: lbl, cls } = calcStrength(password);
  fill.style.width = `${Math.min(score / 5 * 100, 100)}%`;
  fill.className = cls;
  label.textContent = lbl;
}

// ── Chamadas de API de auth ───────────────────────────────────────────────────
async function doLogin(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao autenticar');
  return data;  // retorna { token, role, name }
}

async function doRegister(name, email, password) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao cadastrar');
  return data;
}

function bindLogin() {
  // Alternar vistas
  document.getElementById('goToRegister').addEventListener('click', () => showView('register'));
  document.getElementById('goToLogin').addEventListener('click', () => showView('login'));

  // Indicador de força da senha
  document.getElementById('regPass').addEventListener('input', e => updateStrengthBar(e.target.value));

  // Submissão do login
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;

    btn.disabled = true;
    btn.textContent = 'Entrando…';
    errEl.classList.add('hidden');

    try {
      const { token, role } = await doLogin(email, password);
      setToken(token);
      if (role === 'admin') {
        location.href = '/admin.html';
        return;
      }
      hideLoginOverlay();
      await init();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  // Submissão do cadastro
  document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const errEl = document.getElementById('registerError');
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regPassConfirm').value;

    const validationError = validateRegisterForm(name, email, password, confirm);
    if (validationError) {
      errEl.textContent = validationError;
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Salvando…';
    errEl.classList.add('hidden');

    try {
      await doRegister(name, email, password);
      showView('login');
      // Preenche o email para facilitar o login imediato
      document.getElementById('loginEmail').value = email;
      toast(`Usuário "${name}" cadastrado com sucesso! Faça login para continuar.`, 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar';
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    Object.values(state.charts).forEach(c => c.destroy?.());
    state.charts = {};
    showLoginOverlay();
  });
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  page: 'dashboard',
  month: '',
  months: [],
  categories: { income: [], expense: [], bill: [] },
  charts: {}
};

// ── API ───────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) {
    clearToken();
    showLoginOverlay();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtMonth(yyyyMM) {
  if (!yyyyMM) return '';
  const [y, m] = yyyyMM.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function deltaClass(v, goodIfPositive = true) {
  if (v === 0) return 'neutral';
  return (goodIfPositive ? v > 0 : v < 0) ? 'positive' : 'negative';
}

function deltaLabel(v) {
  if (v === 0) return '—';
  return (v > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(v));
}

function pctLabel(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadCategories();
  await loadMonths();
  bindNav();
  bindSidebar();
  bindExport();
  document.getElementById('yearSelect').addEventListener('change', () => {
    if (state._populateMonths) state._populateMonths(document.getElementById('yearSelect').value);
    onMonthChange();
  });
  document.getElementById('monthSelect').addEventListener('change', onMonthChange);
  navigate('dashboard');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
bindLogin();
if (getToken()) {
  init().catch(() => showLoginOverlay());
} else {
  showLoginOverlay();
}

async function loadCategories() {
  const [income, expense, bill] = await Promise.all([
    api('GET', '/api/categories/income'),
    api('GET', '/api/categories/expense'),
    api('GET', '/api/categories/bill')
  ]);
  state.categories = { income, expense, bill };
}

async function loadMonths() {
  const months = await api('GET', '/api/months');
  state.months = months;

  // Build unique sorted year and month lists
  const years = [...new Set(months.map(m => m.slice(0, 4)))].sort().reverse();
  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const prevMonth = state.month || months[0] || new Date().toISOString().slice(0, 7);
  const [prevY, prevM] = prevMonth.split('-');

  const yearSel = document.getElementById('yearSelect');
  const monthSel = document.getElementById('monthSelect');

  yearSel.innerHTML = years.map(y =>
    `<option value="${y}"${y === prevY ? ' selected' : ''}>${y}</option>`
  ).join('');

  function populateMonths(_selectedYear) {
    const ALL_MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    monthSel.innerHTML = ALL_MONTHS.map(mm =>
      `<option value="${mm}"${mm === prevM ? ' selected' : ''}>${MONTH_NAMES[parseInt(mm, 10) - 1]}</option>`
    ).join('');
  }

  populateMonths(yearSel.value);

  // Store helper on state for re-use on year change
  state._populateMonths = populateMonths;

  state.month = `${yearSel.value}-${monthSel.value}`;
}

function onMonthChange() {
  const y = document.getElementById('yearSelect').value;
  const m = document.getElementById('monthSelect').value;
  state.month = `${y}-${m}`;
  renderPage(state.page);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function bindNav() {
  document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) navigate(btn.dataset.page);
  });
  document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionModal('income'));
  document.getElementById('addExpenseBtn').addEventListener('click', () => showTransactionModal('expense'));
  document.getElementById('addBillBtn').addEventListener('click', () => showBillModal());
}

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  income: 'Ganhos',
  expense: 'Gastos',
  bills: 'Contas Fixas',
  reports: 'Relatórios'
};

function navigate(page) {
  state.page = page;

  // Update nav active
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update topbar title
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || '';

  // Show/hide sections
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('hidden', el.id !== `page-${page}`);
  });

  // Close sidebar on mobile
  closeSidebar();

  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard': return loadDashboard();
    case 'income': return loadTransactions('income');
    case 'expense': return loadTransactions('expense');
    case 'bills': return loadBills();
    case 'reports': return loadReports();
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const [stats] = await Promise.all([
    api('GET', `/api/stats/${state.month}`)
  ]);
  renderStatCards(stats);
  renderRecentList(stats);
  await renderCharts(stats);
}

function renderStatCards(stats) {
  const { totalIncome, totalExpense, totalBills, totalOutflow, balance, health } = stats;
  const savingsRate = stats.savingsRate ?? 0;

  const healthColor = health.score >= 80 ? '#34d399' : health.score >= 60 ? '#fbbf24' : '#f87171';

  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card income">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
      </div>
      <div class="stat-card__label">Ganhos</div>
      <div class="stat-card__value">${fmt(totalIncome)}</div>
      <div class="stat-card__sub">${fmtMonth(state.month)}</div>
    </div>
    <div class="stat-card expense">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
      </div>
      <div class="stat-card__label">Total de Saídas</div>
      <div class="stat-card__value">${fmt(totalOutflow)}</div>
      <div class="stat-card__sub">${fmt(totalExpense)} + contas ${fmt(totalBills)}</div>
    </div>
    <div class="stat-card balance">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div class="stat-card__label">Saldo</div>
      <div class="stat-card__value" style="color:${balance >= 0 ? 'var(--income)' : 'var(--expense)'}">${fmt(balance)}</div>
      <div class="stat-card__sub ${balance >= 0 ? 'up' : 'down'}">${savingsRate.toFixed(1)}% poupado</div>
    </div>
    <div class="stat-card health">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <div class="stat-card__label">Saúde Financeira</div>
      <div class="stat-card__value" style="color:${healthColor}">${health.score}/100</div>
      <div class="stat-card__sub">${health.label}</div>
    </div>
  `;
}

function renderRecentList(stats) {
  const bills = (stats.bills || []).map(b => ({ ...b, type: 'bill' }));
  const all = [...stats.incomes, ...stats.expenses, ...bills]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const el = document.getElementById('recent-list');
  if (!all.length) {
    el.innerHTML = emptyState('Nenhum lançamento neste mês');
    document.getElementById('viewAllBtn').classList.add('hidden');
    return;
  }

  function buildItem(t) {
    const isBill = t.type === 'bill';
    const amountClass = isBill ? 'expense' : t.type;
    const sign = t.type === 'income' ? '+' : '-';
    const meta = isBill
      ? `<span class="badge badge-cat">Conta fixa</span> · <span class="badge badge-cat">${esc(t.category)}</span>`
      : `${fmtDate(t.date)} · <span class="badge badge-cat">${esc(t.category)}</span>`;
    return `<div class="tx-item">
      <div class="tx-dot ${t.type}"></div>
      <div class="tx-info">
        <div class="tx-desc">${esc(t.description)}</div>
        <div class="tx-meta">${meta}</div>
      </div>
      <div class="tx-amount ${amountClass}">${sign}${fmt(t.amount)}</div>
    </div>`;
  }

  let expanded = false;
  const btn = document.getElementById('viewAllBtn');
  btn.classList.remove('hidden');
  btn.textContent = all.length > 3 ? 'Ver todos' : '';
  btn.onclick = null;

  function render(showAll) {
    el.innerHTML = (showAll ? all : all.slice(0, 3)).map(buildItem).join('');
  }

  render(false);

  if (all.length > 3) {
    btn.onclick = () => {
      expanded = !expanded;
      render(expanded);
      btn.textContent = expanded ? 'Ver menos' : 'Ver todos';
    };
  }
}

// ── Charts ────────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#818cf8', '#34d399', '#f87171', '#fbbf24', '#38bdf8', '#a78bfa', '#fb923c', '#4ade80', '#f472b6'];

Chart.defaults.color = '#64748b';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
}

async function renderCharts(currentStats) {
  // Build 6-month history
  const today = state.month;
  const histMonths = [];
  let [y, m] = today.split('-').map(Number);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    histMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const histStats = await Promise.all(histMonths.map(mo => api('GET', `/api/stats/${mo}`)));

  // ── History bar chart
  destroyChart('history');
  const hCtx = document.getElementById('chart-history').getContext('2d');
  state.charts.history = new Chart(hCtx, {
    type: 'bar',
    data: {
      labels: histMonths.map(mo => {
        const [yy, mm] = mo.split('-');
        return new Date(+yy, +mm - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
      }),
      datasets: [
        {
          label: 'Ganhos',
          data: histStats.map(s => s.totalIncome),
          backgroundColor: 'rgba(52,211,153,.75)',
          borderRadius: 5, borderSkipped: false
        },
        {
          label: 'Saídas',
          data: histStats.map(s => s.totalOutflow),
          backgroundColor: 'rgba(248,113,113,.75)',
          borderRadius: 5, borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { font: { size: 11 }, callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) } }
      }
    }
  });

  // ── Category donut chart
  destroyChart('categories');
  const allCats = { ...currentStats.expenseByCategory };
  for (const [k, v] of Object.entries(currentStats.billByCategory)) {
    allCats[k] = (allCats[k] || 0) + v;
  }

  const catWrap = document.getElementById('chart-categories-wrap');
  // Always restore canvas in case a previous render replaced it with empty-state
  if (!document.getElementById('chart-categories')) {
    catWrap.innerHTML = '<canvas id="chart-categories"></canvas>';
  }
  const catCtx = document.getElementById('chart-categories').getContext('2d');

  if (Object.keys(allCats).length) {
    state.charts.categories = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(allCats),
        datasets: [{
          data: Object.values(allCats),
          backgroundColor: CHART_COLORS,
          borderWidth: 2,
          borderColor: '#161b2e',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 10, font: { size: 11 }, padding: 10, usePointStyle: true }
          },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } }
        }
      }
    });
  } else {
    catWrap.innerHTML = '<div class="empty-state" style="height:100%"><p>Sem gastos para exibir</p></div>';
  }
}

// ── Transactions ──────────────────────────────────────────────────────────────
async function loadTransactions(type) {
  const [items, stats] = await Promise.all([
    api('GET', `/api/transactions?month=${state.month}&type=${type}`),
    api('GET', `/api/stats/${state.month}`)
  ]);

  const total = type === 'income' ? stats.totalIncome : stats.totalExpense;
  const label = type === 'income' ? '↑ Total de Ganhos' : '↓ Total de Gastos';
  document.getElementById(`${type}-total`).textContent = `${label}: ${fmt(total)}`;

  const container = document.getElementById(`${type}-table`);

  if (!items.length) {
    container.innerHTML = emptyState('Nenhum lançamento neste mês');
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th style="text-align:right">Valor</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${items.map(t => `
          <tr>
            <td style="color:var(--text-2);width:100px">${fmtDate(t.date)}</td>
            <td>${esc(t.description)}</td>
            <td><span class="badge badge-cat">${esc(t.category)}</span></td>
            <td style="text-align:right" class="amount ${type}">${fmt(t.amount)}</td>
            <td style="text-align:right;width:80px">
              <button class="icon-btn" data-edit-tx='${JSON.stringify({ id: t.id, type: t.type, description: t.description, amount: t.amount, category: t.category, date: t.date })}' aria-label="Editar">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn danger" data-del-tx="${t.id}" aria-label="Excluir">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const fresh = container.cloneNode(false);
  fresh.innerHTML = container.innerHTML;
  container.replaceWith(fresh);
  fresh.addEventListener('click', async e => {
    const editBtn = e.target.closest('[data-edit-tx]');
    const delBtn = e.target.closest('[data-del-tx]');
    if (editBtn) {
      const data = JSON.parse(editBtn.dataset.editTx);
      showEditTransactionModal(data, type);
    } else if (delBtn) {
      if (!confirm('Excluir este lançamento?')) return;
      try {
        await api('DELETE', `/api/transactions/${delBtn.dataset.delTx}`);
        toast('Lançamento excluído', 'success');
        loadTransactions(type);
        if (state.page === 'dashboard') loadDashboard();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ── Bills ─────────────────────────────────────────────────────────────────────
async function loadBills() {
  const bills = await api('GET', '/api/bills');
  const totalActive = bills.filter(b => b.active).reduce((s, b) => s + b.amount, 0);
  document.getElementById('bills-total').textContent = `Contas ativas: ${fmt(totalActive)}/mês`;

  const grid = document.getElementById('bills-grid');

  if (!bills.length) {
    grid.innerHTML = `<div class="card">${emptyState('Nenhuma conta fixa cadastrada')}</div>`;
    return;
  }

  grid.innerHTML = bills.map(b => `
    <div class="bill-card ${b.active ? 'active' : 'inactive'}" data-bill-id="${b.id}">
      <div class="bill-card__top">
        <div>
          <div class="bill-card__name">${esc(b.description)}</div>
          <div class="bill-card__cat">${esc(b.category)}</div>
        </div>
        <div style="text-align:right">
          <div class="bill-card__amount">${fmt(b.amount)}</div>
          <div class="bill-card__due">Dia ${b.dueDay}</div>
        </div>
      </div>
      <div class="bill-card__actions">
        <button class="toggle-btn" data-toggle-bill="${b.id}">${b.active ? '✓ Ativa' : 'Inativa'}</button>
        <button class="icon-btn" data-edit-bill='${JSON.stringify({ id: b.id, description: b.description, amount: b.amount, category: b.category, dueDay: b.dueDay })}' aria-label="Editar">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger" data-del-bill="${b.id}" aria-label="Excluir">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  const freshGrid = grid.cloneNode(false);
  freshGrid.innerHTML = grid.innerHTML;
  grid.replaceWith(freshGrid);
  freshGrid.addEventListener('click', async e => {
    const toggleBtn = e.target.closest('[data-toggle-bill]');
    const editBtn = e.target.closest('[data-edit-bill]');
    const delBtn = e.target.closest('[data-del-bill]');
    if (toggleBtn) {
      try {
        await api('PATCH', `/api/bills/${toggleBtn.dataset.toggleBill}/toggle`);
        toast('Status atualizado', 'info');
        loadBills();
      } catch (err) { toast(err.message, 'error'); }
    } else if (editBtn) {
      const data = JSON.parse(editBtn.dataset.editBill);
      showEditBillModal(data);
    } else if (delBtn) {
      if (!confirm('Excluir esta conta fixa?')) return;
      try {
        await api('DELETE', `/api/bills/${delBtn.dataset.delBill}`);
        toast('Conta excluída', 'success');
        loadBills();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────
async function loadReports() {
  const el = document.getElementById('reports-content');
  el.innerHTML = loader();

  const [stats, cmp, avgs] = await Promise.all([
    api('GET', `/api/stats/${state.month}`),
    api('GET', `/api/comparison/${state.month}`),
    api('GET', '/api/averages')
  ]);

  el.innerHTML = `
    <div class="reports-grid">
      ${renderHealthCard(stats.health)}
      <div class="card">
        <div class="card-header"><span class="card-title">Resumo do mês</span></div>
        <table class="cmp-table">
          <tbody>
            ${cmpRow('Ganhos', fmt(stats.totalIncome))}
            ${cmpRow('Gastos Variáveis', fmt(stats.totalExpense))}
            ${cmpRow('Contas Fixas', fmt(stats.totalBills))}
            ${cmpRow('Total de Saídas', fmt(stats.totalOutflow))}
            ${cmpRow('Saldo', fmt(stats.balance), stats.balance >= 0 ? 'var(--income)' : 'var(--expense)')}
            ${cmpRow('Taxa de Poupança', stats.savingsRate.toFixed(1) + '%')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <span class="card-title">Comparação com mês anterior</span>
        <span style="font-size:12px;color:var(--text-3)">${fmtMonth(cmp.previous.month)} → ${fmtMonth(cmp.current.month)}</span>
      </div>
      ${renderComparisonTable(cmp)}
    </div>

    ${avgs && avgs.avgIncome !== undefined ? `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <span class="card-title">Médias mensais</span>
        <span style="font-size:12px;color:var(--text-3)">${avgs.monthsAnalyzed} mês/meses analisado(s)</span>
      </div>
      ${renderAveragesTable(avgs)}
    </div>` : ''}

    <div class="card">
      <div class="card-header"><span class="card-title">Comparação visual</span></div>
      <div class="chart-wrap"><canvas id="chart-cmp"></canvas></div>
    </div>
  `;

  // Render comparison bar chart
  destroyChart('cmp');
  const ctx = document.getElementById('chart-cmp').getContext('2d');
  const { current: c, previous: p } = cmp;
  state.charts.cmp = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Ganhos', 'Gastos Variáveis', 'Contas Fixas', 'Saldo'],
      datasets: [
        {
          label: fmtMonth(p.month),
          data: [p.totalIncome, p.totalExpense, p.totalBills, p.balance],
          backgroundColor: 'rgba(129,140,248,.5)',
          borderRadius: 5
        },
        {
          label: fmtMonth(c.month),
          data: [c.totalIncome, c.totalExpense, c.totalBills, c.balance],
          backgroundColor: 'rgba(52,211,153,.65)',
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) } }
      }
    }
  });
}

function renderHealthCard(health) {
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ * (1 - health.score / 100);
  const color = health.score >= 80 ? '#34d399' : health.score >= 60 ? '#fbbf24' : '#f87171';
  return `
    <div class="health-card">
      <div class="health-ring">
        <svg width="130" height="130">
          <circle cx="65" cy="65" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
          <circle cx="65" cy="65" r="${r}" fill="none"
            stroke="${color}" stroke-width="10"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
            stroke-linecap="round"
            style="transform:rotate(-90deg);transform-origin:65px 65px;transition:stroke-dashoffset 1s ease"/>
        </svg>
        <div class="health-ring__text">
          <span class="health-ring__score" style="color:${color}">${health.score}</span>
          <span class="health-ring__max">/100</span>
        </div>
      </div>
      <div class="health-info">
        <div class="health-label">${health.label}</div>
        <div class="health-tips">
          ${health.tips.map(t => `<div class="health-tip">${esc(t)}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderComparisonTable(cmp) {
  const { current: c, previous: p, diff, pct } = cmp;
  return `
    <table class="cmp-table">
      <thead>
        <tr>
          <th>Métrica</th>
          <th>${fmtMonth(p.month)}</th>
          <th>${fmtMonth(c.month)}</th>
          <th>Variação</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Ganhos</td><td>${fmt(p.totalIncome)}</td><td>${fmt(c.totalIncome)}</td>
          <td><span class="delta ${deltaClass(diff.income, true)}">${deltaLabel(diff.income)}</span></td>
          <td><span class="delta ${deltaClass(pct.income, true)}">${pctLabel(pct.income)}</span></td></tr>
        <tr><td>Gastos Variáveis</td><td>${fmt(p.totalExpense)}</td><td>${fmt(c.totalExpense)}</td>
          <td><span class="delta ${deltaClass(diff.expense, false)}">${deltaLabel(diff.expense)}</span></td>
          <td><span class="delta ${deltaClass(pct.expense, false)}">${pctLabel(pct.expense)}</span></td></tr>
        <tr><td>Contas Fixas</td><td>${fmt(p.totalBills)}</td><td>${fmt(c.totalBills)}</td>
          <td><span class="delta ${deltaClass(diff.bills, false)}">${deltaLabel(diff.bills)}</span></td>
          <td><span class="delta neutral">—</span></td></tr>
        <tr><td>Total de Saídas</td><td>${fmt(p.totalOutflow)}</td><td>${fmt(c.totalOutflow)}</td>
          <td><span class="delta ${deltaClass(diff.outflow, false)}">${deltaLabel(diff.outflow)}</span></td>
          <td><span class="delta ${deltaClass(pct.outflow, false)}">${pctLabel(pct.outflow)}</span></td></tr>
        <tr><td>Saldo</td><td>${fmt(p.balance)}</td><td>${fmt(c.balance)}</td>
          <td><span class="delta ${deltaClass(diff.balance, true)}">${deltaLabel(diff.balance)}</span></td>
          <td><span class="delta ${deltaClass(pct.balance, true)}">${pctLabel(pct.balance)}</span></td></tr>
      </tbody>
    </table>
  `;
}

function renderAveragesTable(avgs) {
  return `
    <table class="cmp-table">
      <thead><tr><th>Métrica</th><th>Média Mensal</th></tr></thead>
      <tbody>
        ${cmpRow('Ganhos', fmt(avgs.avgIncome))}
        ${cmpRow('Gastos Variáveis', fmt(avgs.avgExpense))}
        ${cmpRow('Contas Fixas', fmt(avgs.avgBills))}
        ${cmpRow('Total de Saídas', fmt(avgs.avgOutflow))}
        ${cmpRow('Saldo Médio', fmt(avgs.avgBalance))}
        ${cmpRow('Taxa de Poupança', avgs.avgSavings.toFixed(1) + '%')}
      </tbody>
    </table>
  `;
}

function cmpRow(label, value, color) {
  return `<tr><td>${label}</td><td style="${color ? `color:${color};font-weight:600` : ''}">${value}</td></tr>`;
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}

function bindSidebar() {
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('visible');
  });
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}

function bindExport() {
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const token = getToken();
    try {
      const res = await fetch(`/api/export/${state.month}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.status === 401) {
        clearToken();
        showLoginOverlay();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financas_${state.month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao exportar: ' + e.message);
    }
  });
}

// ── Transaction modal ─────────────────────────────────────────────────────────
function showTransactionModal(type) {
  const cats = state.categories[type] || [];
  const title = type === 'income' ? '+ Adicionar Ganho' : '+ Adicionar Gasto';
  const btnClass = type === 'income' ? 'btn-success' : 'btn-danger';

  openModal(`
    <div class="modal-title">${title}</div>
    <form id="tx-form">
      <div class="form-group">
        <label>Categoria</label>
        <select class="form-select" name="category" required>
          ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <input class="form-input" name="description" type="text" placeholder="Ex: Supermercado" required minlength="2" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$)</label>
          <input class="form-input" name="amount" type="number" step="0.01" min="0.01" placeholder="0,00" required />
        </div>
        <div class="form-group">
          <label>Data</label>
          <input class="form-input" name="date" type="date" value="${todayISO()}" required />
        </div>
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelBtn">Cancelar</button>
        <button type="submit" class="btn ${btnClass}">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('tx-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('POST', '/api/transactions', {
        type,
        description: fd.get('description'),
        amount: fd.get('amount'),
        category: fd.get('category'),
        date: fd.get('date')
      });
      closeModal();
      toast(`${type === 'income' ? 'Ganho' : 'Gasto'} adicionado!`, 'success');
      await loadMonths();
      renderPage(state.page);
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Bill modal ────────────────────────────────────────────────────────────────
function showBillModal() {
  const cats = state.categories.bill || [];

  openModal(`
    <div class="modal-title">+ Adicionar Conta Fixa</div>
    <form id="bill-form">
      <div class="form-group">
        <label>Categoria</label>
        <select class="form-select" name="category" required>
          ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <input class="form-input" name="description" type="text" placeholder="Ex: Netflix" required minlength="2" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$)</label>
          <input class="form-input" name="amount" type="number" step="0.01" min="0.01" placeholder="0,00" required />
        </div>
        <div class="form-group">
          <label>Dia de vencimento</label>
          <input class="form-input" name="dueDay" type="number" min="1" max="31" placeholder="Ex: 15" required />
        </div>
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelBillBtn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('cancelBillBtn').addEventListener('click', closeModal);
  document.getElementById('bill-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('POST', '/api/bills', {
        description: fd.get('description'),
        amount: fd.get('amount'),
        category: fd.get('category'),
        dueDay: fd.get('dueDay')
      });
      closeModal();
      toast('Conta fixa adicionada!', 'success');
      loadBills();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Edit Transaction modal ────────────────────────────────────────────────────
function showEditTransactionModal(tx, type) {
  const cats = state.categories[type] || [];
  const title = type === 'income' ? 'Editar Ganho' : 'Editar Gasto';
  const btnClass = type === 'income' ? 'btn-success' : 'btn-danger';

  openModal(`
    <div class="modal-title">${title}</div>
    <form id="edit-tx-form">
      <div class="form-group">
        <label>Categoria</label>
        <select class="form-select" name="category" required>
          ${cats.map(c => `<option value="${esc(c)}"${c === tx.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <input class="form-input" name="description" type="text" value="${esc(tx.description)}" required minlength="2" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$)</label>
          <input class="form-input" name="amount" type="number" step="0.01" min="0.01" value="${tx.amount}" required />
        </div>
        <div class="form-group">
          <label>Data</label>
          <input class="form-input" name="date" type="date" value="${tx.date}" required />
        </div>
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelEditTx">Cancelar</button>
        <button type="submit" class="btn ${btnClass}">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('cancelEditTx').addEventListener('click', closeModal);
  document.getElementById('edit-tx-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('PUT', `/api/transactions/${tx.id}`, {
        description: fd.get('description'),
        amount: fd.get('amount'),
        category: fd.get('category'),
        date: fd.get('date')
      });
      closeModal();
      toast('Lançamento atualizado!', 'success');
      loadTransactions(type);
      if (state.page === 'dashboard') loadDashboard();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Edit Bill modal ───────────────────────────────────────────────────────────
function showEditBillModal(bill) {
  const cats = state.categories.bill || [];

  openModal(`
    <div class="modal-title">Editar Conta Fixa</div>
    <form id="edit-bill-form">
      <div class="form-group">
        <label>Categoria</label>
        <select class="form-select" name="category" required>
          ${cats.map(c => `<option value="${esc(c)}"${c === bill.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <input class="form-input" name="description" type="text" value="${esc(bill.description)}" required minlength="2" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$)</label>
          <input class="form-input" name="amount" type="number" step="0.01" min="0.01" value="${bill.amount}" required />
        </div>
        <div class="form-group">
          <label>Dia de vencimento</label>
          <input class="form-input" name="dueDay" type="number" min="1" max="31" value="${bill.dueDay}" required />
        </div>
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelEditBill">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('cancelEditBill').addEventListener('click', closeModal);
  document.getElementById('edit-bill-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('PUT', `/api/bills/${bill.id}`, {
        description: fd.get('description'),
        amount: fd.get('amount'),
        category: fd.get('category'),
        dueDay: fd.get('dueDay')
      });
      closeModal();
      toast('Conta fixa atualizada!', 'success');
      loadBills();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  const container = document.getElementById('toast-container');
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emptyState(msg) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <p>${msg}</p>
  </div>`;
}

function loader() {
  return '<div class="loader"><div class="spinner"></div></div>';
}

