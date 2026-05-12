// ── Auth ──────────────────────────────────────────────────────────────────────
import { FAQ_TREE } from './chatbot-faq.js';

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

function getTokenPayload() {
  const token = getToken();
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function getUserPlan() {
  return getTokenPayload()?.plan || 'free';
}

// ── Alternância login / cadastro ──────────────────────────────────────────────
let selectedPlan = 'free';

function showView(view) {
  document.getElementById('loginView').classList.toggle('hidden', view !== 'login');
  document.getElementById('registerView').classList.toggle('hidden', view !== 'register');
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('registerError').classList.add('hidden');
  document.getElementById('loginForm').reset();
  document.getElementById('registerForm').reset();
  resetStrengthBar();
  document.querySelector('.login-card').classList.toggle('register-wide', view === 'register');
  if (view === 'register') {
    selectedPlan = 'free';
    selectPlanCard('free');
  }
  if (view === 'login') document.getElementById('loginEmail').focus();
  else document.getElementById('regName').focus();
}

function selectPlanCard(plan) {
  selectedPlan = plan;
  document.getElementById('planFree').classList.toggle('selected', plan === 'free');
  document.getElementById('planPremium').classList.toggle('selected', plan === 'premium');
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

function showPixPaymentModal(userName) {
  const pixKey = '04259296043';
  const whatsapp = '54999047760';
  const overlay = document.createElement('div');
  overlay.className = 'pix-overlay';
  overlay.id = 'pixOverlay';
  overlay.innerHTML = `
    <div class="pix-modal">
      <div class="pix-modal__header">
        <span class="pix-modal__title">⭐ Ativação do Plano Premium</span>
      </div>
      <div class="pix-modal__body">
        <p class="pix-modal__greeting">Olá, <strong>${esc(userName)}</strong>! Sua conta foi criada com sucesso.</p>
        <p class="pix-modal__info">Para ativar o plano Premium, realize o pagamento via PIX:</p>
        <div class="pix-amount">R$ 19,90</div>
        <div class="pix-key-wrap">
          <span class="pix-key-label">Chave PIX (CPF)</span>
          <div class="pix-key-row">
            <span class="pix-key-value" id="pixKeyValue">${pixKey}</span>
            <button class="btn btn-outline pix-copy-btn" id="pixCopyBtn">Copiar</button>
          </div>
        </div>
        <div class="pix-instructions">
          <p>📱 Após o pagamento, envie SEU EMAIL e o COMPROVANTE para o WhatsApp:</p>
          <a class="pix-whatsapp-link" href="https://wa.me/55${whatsapp}?text=Comprovante%20de%20pagamento%20Premium%20-%20${encodeURIComponent(userName)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:#25d366;vertical-align:middle;margin-right:6px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.522 5.854L.057 23.882l6.174-1.438A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.792 9.792 0 0 1-5.006-1.374l-.36-.214-3.664.854.878-3.568-.234-.374A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
            (54) 99904-7760
          </a>
          <p class="pix-waiting">⏳ O acesso Premium será liberado em até <strong>24 horas</strong> após a confirmação do pagamento.</p>
        </div>
        <button class="btn btn-primary pix-close-btn" id="pixCloseBtn">Entendido — Fazer login</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Copy PIX key
  document.getElementById('pixCopyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(pixKey).then(() => {
      document.getElementById('pixCopyBtn').textContent = 'Copiado!';
      setTimeout(() => { document.getElementById('pixCopyBtn').textContent = 'Copiar'; }, 2000);
    });
  });

  document.getElementById('pixCloseBtn').addEventListener('click', () => {
    overlay.remove();
  });
}

function applyPlanRestrictions() {
  const plan = getUserPlan();
  const payload = getTokenPayload();
  const isPremium = plan === 'premium' || payload?.role === 'admin';

  // Hide nav items entirely for free users
  ['dashboard', 'reports', 'goals', 'insights', 'health'].forEach(page => {
    document.querySelectorAll(`[data-page="${page}"]`).forEach(btn => {
      btn.classList.toggle('hidden', !isPremium);
    });
  });

  // Show/hide export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.classList.toggle('hidden', !isPremium);

  // Show/hide plan badge
  const badge = document.getElementById('planBadge');
  if (badge) badge.classList.toggle('hidden', isPremium);
}

function bindLogin() {
  // Alternar vistas
  document.getElementById('goToRegister').addEventListener('click', () => showView('register'));
  document.getElementById('goToLogin').addEventListener('click', () => showView('login'));

  // Plan card selection
  document.getElementById('planFree').addEventListener('click', () => selectPlanCard('free'));
  document.getElementById('planPremium').addEventListener('click', () => selectPlanCard('premium'));

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
      // Reset chatbot so login-screen conversation doesn't carry over
      document.getElementById('chatMessages').innerHTML = '';
      document.getElementById('chatOptions').innerHTML = '';
      document.getElementById('chatWindow').classList.add('hidden');
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
      if (selectedPlan === 'premium') {
        showView('login');
        document.getElementById('loginEmail').value = email;
        showPixPaymentModal(name);
      } else {
        showView('login');
        document.getElementById('loginEmail').value = email;
        toast(`Usuário "${name}" cadastrado com sucesso! Faça login para continuar.`, 'success');
      }
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Criar conta';
    }
  });

  // User menu (avatar → dropdown)
  document.getElementById('userAvatarBtn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    document.getElementById('userDropdown').classList.add('hidden');
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    Object.values(state.charts).forEach(c => c.destroy?.());
    state.charts = {};
    state.month = '';
    state.months = [];
    // Reset and close chatbot
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('chatOptions').innerHTML = '';
    document.getElementById('chatWindow').classList.add('hidden');
    showLoginOverlay();
  });

  document.getElementById('myAccountBtn').addEventListener('click', () => {
    document.getElementById('userDropdown').classList.add('hidden');
    showMyAccountModal();
  });

  // Upgrade button in sidebar badge
  document.getElementById('upgradePlanBtn').addEventListener('click', () => {
    const name = getTokenPayload()?.name || 'usuário';
    showPixPaymentModal(name);
  });
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  page: 'dashboard',
  month: '',
  months: [],
  categories: { income: [], expense: [], bill: [], investment: [] },
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

// ── Chatbot ───────────────────────────────────────────────────────────────────
function bindChatbot() {
  if (bindChatbot._bound) return;
  bindChatbot._bound = true;

  const fab = document.getElementById('tourBtn');
  const win = document.getElementById('chatWindow');
  const closeBtn = document.getElementById('chatClose');
  const endBtn = document.getElementById('chatEnd');

  fab.addEventListener('click', () => {
    const isOpen = !win.classList.contains('hidden');
    if (isOpen) {
      win.classList.add('hidden');
    } else {
      win.classList.remove('hidden');
      const msgs = document.getElementById('chatMessages');
      if (msgs.children.length === 0) {
        // Check if we're on the login/register screen
        const onLoginScreen = !document.getElementById('loginOverlay').classList.contains('hidden');
        if (onLoginScreen) {
          chatGoto('welcome_guest');
        } else {
          const payload = getTokenPayload();
          const isPremium = getUserPlan() === 'premium' || payload?.role === 'admin';
          chatGoto(isPremium ? 'welcome' : 'welcome_free');
        }
      }
    }
  });

  closeBtn.addEventListener('click', () => win.classList.add('hidden'));

  endBtn.addEventListener('click', () => {
    // Reset conversation and close
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('chatOptions').innerHTML = '';
    win.classList.add('hidden');
  });
}

function chatAddBubble(text, role) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-bubble chat-bubble--${role}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function chatShowTyping() {
  const msgs = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'chat-typing';
  el.id = 'chatTyping';
  el.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function chatRemoveTyping() {
  document.getElementById('chatTyping')?.remove();
}

function chatSetOptions(options) {
  const container = document.getElementById('chatOptions');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chat-option-btn';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => chatHandleOption(opt));
    container.appendChild(btn);
  });
}

const RESTART_OPTION = { label: '🔄 Reiniciar conversa', next: '__welcome__' };

function getWelcomeNode() {
  const onLoginScreen = !document.getElementById('loginOverlay').classList.contains('hidden');
  if (onLoginScreen) return 'welcome_guest';
  const payload = getTokenPayload();
  const isPremium = getUserPlan() === 'premium' || payload?.role === 'admin';
  return isPremium ? 'welcome' : 'welcome_free';
}

async function chatGoto(nodeId) {
  // Resolve the dynamic welcome sentinel
  if (nodeId === '__welcome__') nodeId = getWelcomeNode();
  const node = FAQ_TREE[nodeId];
  if (!node) return;
  chatSetOptions([]); // disable options while typing
  chatShowTyping();
  await new Promise(r => setTimeout(r, 650));
  chatRemoveTyping();
  chatAddBubble(node.text, 'bot');
  // Append restart option on all nodes except the welcome screens themselves
  const isWelcome = nodeId === 'welcome' || nodeId === 'welcome_free' || nodeId === 'welcome_guest';
  const options = isWelcome ? node.options : [...node.options, RESTART_OPTION];
  chatSetOptions(options);
}

async function chatHandleOption(opt) {
  // Show user's choice as bubble
  chatAddBubble(opt.label, 'user');
  chatSetOptions([]); // clear while processing

  if (opt.action === 'start_tour') {
    // Show bot confirmation and leave restart option visible before closing
    chatShowTyping();
    await new Promise(r => setTimeout(r, 600));
    chatRemoveTyping();
    chatAddBubble('Tour iniciado! Quando terminar, abra o chat novamente para continuar tirando dúvidas. 😊', 'bot');
    chatSetOptions([RESTART_OPTION]);
    await new Promise(r => setTimeout(r, 900));
    document.getElementById('chatWindow').classList.add('hidden');
    await new Promise(r => setTimeout(r, 300));
    startTour();
    return;
  }

  if (opt.action && opt.action.startsWith('go_page:')) {
    navigate(opt.action.split(':')[1]);
  }

  if (opt.next) {
    await chatGoto(opt.next);
  }
}

// ── Guided Tour ───────────────────────────────────────────────────────────────
const TOUR_STEPS_FREE = [
  // ── Receitas ──────────────────────────────────────────────────────────────
  { page: 'income', selector: '#addIncomeBtn', text: 'Clique aqui para registrar um novo ganho ou receita no mês atual.' },
  { page: 'income', selector: '#income-table', text: 'Todos os seus ganhos do mês ficam listados aqui com data, categoria e valor.' },
  // ── Gastos ───────────────────────────────────────────────────────────────
  { page: 'expense', selector: '#addExpenseBtn', text: 'Use este botão para lançar um novo gasto variável, como compras e despesas do dia a dia.' },
  { page: 'expense', selector: '#expense-table', text: 'Lista completa dos seus gastos variáveis do mês, organizados por data e categoria.' },
  // ── Contas Fixas ─────────────────────────────────────────────────────────
  { page: 'bills', selector: '#addBillBtn', text: 'Cadastre aqui uma conta fixa que se repete todo mês, como aluguel, internet ou assinatura.' },
  { page: 'bills', selector: '#bills-grid', text: 'Cada card exibe uma conta fixa com valor, dia de vencimento e status de pagamento do mês.' },
  // ── Investimentos ─────────────────────────────────────────────────────────
  { page: 'investments', selector: '#addInvestmentBtn', text: 'Adicione aqui um investimento para acompanhar o crescimento do seu patrimônio ao longo do tempo.' },
  { page: 'investments', selector: '#investments-table', text: 'Veja todos os seus investimentos com o valor total acumulado e o rendimento obtido.' },
];

const TOUR_STEPS = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  { page: 'dashboard', selector: '.stat-cards', text: 'Os cartões de resumo mostram instantaneamente seu saldo, ganhos, gastos e total investido no mês.' },
  { page: 'dashboard', selector: '.charts-row', text: 'Os gráficos exibem o histórico dos últimos 6 meses e a distribuição dos seus gastos por categoria.' },
  { page: 'dashboard', selector: '#recent-list', text: 'Os lançamentos recentes listam as últimas movimentações para você ter controle imediato.' },
  // ── Receitas ───────────────────────────────────────────────────────────────
  { page: 'income', selector: '#addIncomeBtn', text: 'Clique aqui para registrar um novo ganho ou receita no mês atual.' },
  { page: 'income', selector: '#income-table', text: 'Todos os seus ganhos do mês ficam listados aqui com data, categoria e valor.' },
  // ── Gastos ─────────────────────────────────────────────────────────────────
  { page: 'expense', selector: '#addExpenseBtn', text: 'Use este botão para lançar um novo gasto variável, como compras e despesas do dia a dia.' },
  { page: 'expense', selector: '#expense-table', text: 'Lista completa dos seus gastos variáveis do mês, organizados por data e categoria.' },
  // ── Contas Fixas ───────────────────────────────────────────────────────────
  { page: 'bills', selector: '#addBillBtn', text: 'Cadastre aqui uma conta fixa que se repete todo mês, como aluguel, internet ou assinatura.' },
  { page: 'bills', selector: '#bills-grid', text: 'Cada card exibe uma conta fixa com valor, dia de vencimento e status de pagamento do mês.' },
  // ── Investimentos ──────────────────────────────────────────────────────────
  { page: 'investments', selector: '#addInvestmentBtn', text: 'Adicione aqui um investimento para acompanhar o crescimento do seu patrimônio ao longo do tempo.' },
  { page: 'investments', selector: '#investments-table', text: 'Veja todos os seus investimentos com o valor total acumulado e o rendimento obtido.' },
  // ── Metas ──────────────────────────────────────────────────────────────────
  { page: 'goals', selector: '#addGoalBtn', text: 'Crie uma nova meta financeira, como guardar para uma viagem, emergência ou conquista pessoal.' },
  { page: 'goals', selector: '#goals-grid', text: 'Cada meta exibe a barra de progresso e quanto você precisa guardar por mês para atingi-la no prazo.' },
  // ── Inteligência ───────────────────────────────────────────────────────────
  { page: 'insights', selector: '#insights-forecast', text: 'A projeção de saldo analisa seus gastos diários e estima como você vai fechar o mês.' },
  { page: 'insights', selector: '#insights-spending', text: 'A análise de gastos agrupa todos os seus gastos e contas fixas por categoria, mostrando onde vai mais dinheiro.' },
  // ── Saúde Financeira ───────────────────────────────────────────────────────
  { page: 'health', selector: '#health-score', text: 'O score de saúde financeira vai de 0 a 100 e resume o equilíbrio da sua vida financeira com base na regra 50-30-20.' },
  { page: 'health', selector: '#health-pillars', text: 'Cada pilar mostra quanto você usa em necessidades, desejos e investimentos comparado à meta ideal.' },
  { page: 'health', selector: '#health-history', text: 'O histórico exibe a evolução do seu score nos últimos meses para você acompanhar sua melhora.' },
  { page: 'health', selector: '#health-proj', text: 'A projeção calcula como seu saldo acumulado se comportará nos próximos meses se mantiver o ritmo atual.' },
  { page: 'health', selector: '#health-plan', text: 'O plano de ação traz dicas personalizadas para melhorar os pilares que estão abaixo da meta.' },
  // ── Relatórios ─────────────────────────────────────────────────────────────
  { page: 'reports', selector: '.reports-grid', text: 'O resumo do mês exibe todos os totais — ganhos, gastos, contas fixas, investimentos e saldo.' },
  { page: 'reports', selector: '#report-compliance', text: 'O painel de adimplência mostra quantas contas fixas foram pagas e o valor em aberto do mês.' },
  { page: 'reports', selector: '#report-goals', text: 'Aqui você vê o progresso de todas as suas metas com projeção de quanto economizar por mês.' },
  { page: 'reports', selector: '#report-spending', text: 'A análise de gastos no relatório consolida todos os gastos e contas fixas agrupados por categoria.' },
  { page: 'reports', selector: '#report-comparison', text: 'A comparação com o mês anterior mostra a variação em cada categoria para identificar tendências.' },
  { page: 'reports', selector: '#report-chart', text: 'O gráfico visual facilita a comparação lado a lado entre o mês atual e o anterior.' },
];

const tourState = { active: false, step: 0, steps: TOUR_STEPS };

async function startTour() {
  const payload = getTokenPayload();
  const isPremium = getUserPlan() === 'premium' || payload?.role === 'admin';
  tourState.active = true;
  tourState.step = 0;
  tourState.steps = isPremium ? TOUR_STEPS : TOUR_STEPS_FREE;
  document.getElementById('tourBtn').style.visibility = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.userSelect = 'none';
  await showTourStep(0);
}

async function showTourStep(index) {
  if (!tourState.active) return;
  if (index < 0 || index >= tourState.steps.length) { endTour(); return; }

  tourState.step = index;
  const step = tourState.steps[index];

  // Navigate to page if needed
  if (state.page !== step.page) {
    navigate(step.page);
  }

  // Poll for element (checks every 80ms, up to 2s)
  let target = null;
  const deadline = Date.now() + 2000;
  while (!target && Date.now() < deadline) {
    target = document.querySelector(step.selector);
    if (!target) await new Promise(r => setTimeout(r, 80));
  }

  if (!target) {
    // Skip silently if element never rendered
    await showTourStep(index + 1);
    return;
  }

  // Scroll into view
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  await new Promise(r => setTimeout(r, 300));

  const rect = target.getBoundingClientRect();
  const PAD = 8;

  // Spotlight
  const spotlight = document.getElementById('tourSpotlight');
  spotlight.classList.remove('hidden');
  spotlight.style.cssText = `left:${rect.left - PAD}px;top:${rect.top - PAD}px;width:${rect.width + PAD * 2}px;height:${rect.height + PAD * 2}px`;

  // Balloon position
  const balloon = document.getElementById('tourBalloon');
  balloon.classList.remove('hidden');
  balloon.classList.remove('caret-bottom');

  const BALLOON_W = 300;
  const BALLOON_H = 130;
  const viewH = window.innerHeight;
  const viewW = window.innerWidth;
  const spaceBelow = viewH - rect.bottom - PAD;
  const spaceAbove = rect.top - PAD;
  let bTop;

  if (spaceBelow >= BALLOON_H + 16 || spaceBelow >= spaceAbove) {
    bTop = rect.bottom + PAD + 14;
  } else {
    bTop = rect.top - PAD - BALLOON_H - 14;
    balloon.classList.add('caret-bottom');
  }

  // Clamp so balloon never leaves the viewport
  bTop = Math.max(10, Math.min(viewH - BALLOON_H - 10, bTop));

  let bLeft = rect.left + rect.width / 2 - BALLOON_W / 2;
  bLeft = Math.max(12, Math.min(viewW - BALLOON_W - 12, bLeft));

  balloon.style.cssText = `top:${bTop}px;left:${bLeft}px;width:${BALLOON_W}px`;

  // Content
  document.getElementById('tourStepLabel').textContent = `Passo ${index + 1} de ${tourState.steps.length}`;
  document.getElementById('tourText').textContent = step.text;

  const prevBtn = document.getElementById('tourPrev');
  const nextBtn = document.getElementById('tourNext');
  prevBtn.disabled = index === 0;
  nextBtn.textContent = index === tourState.steps.length - 1 ? 'Concluir ✓' : 'Próximo →';

  document.getElementById('tourOverlay').classList.remove('hidden');
}

function endTour() {
  tourState.active = false;
  document.body.style.overflow = '';
  document.body.style.userSelect = '';
  document.getElementById('tourOverlay').classList.add('hidden');
  const spotlight = document.getElementById('tourSpotlight');
  spotlight.classList.add('hidden');
  spotlight.style.cssText = '';
  const balloon = document.getElementById('tourBalloon');
  balloon.classList.add('hidden');
  balloon.classList.remove('caret-bottom');
  balloon.style.cssText = '';
  document.getElementById('tourBtn').style.visibility = '';
  toast('Tour concluído! 🎉', 'success');
}

function bindTour() {
  if (bindTour._bound) return;
  bindTour._bound = true;

  document.getElementById('tourClose').addEventListener('click', endTour);
  document.getElementById('tourPrev').addEventListener('click', () => showTourStep(tourState.step - 1));
  document.getElementById('tourNext').addEventListener('click', () => showTourStep(tourState.step + 1));
  // Swallow all clicks on the overlay — only tour buttons work during tour
  document.getElementById('tourOverlay').addEventListener('click', e => e.stopPropagation());
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
  setupUserAvatar();
  applyPlanRestrictions();
  bindTour();
  bindChatbot();
  const startPage = getUserPlan() === 'premium' || getTokenPayload()?.role === 'admin' ? 'dashboard' : 'income';
  navigate(startPage);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
bindLogin();
bindChatbot(); // available on login screen too
if (getToken()) {
  init().catch(() => showLoginOverlay());
} else {
  showLoginOverlay();
}

async function loadCategories() {
  const [income, expense, bill, investment] = await Promise.all([
    api('GET', '/api/categories/income'),
    api('GET', '/api/categories/expense'),
    api('GET', '/api/categories/bill'),
    api('GET', '/api/categories/investment')
  ]);
  state.categories = { income, expense, bill, investment };
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
    if (!btn) return;
    navigate(btn.dataset.page);
  });
  document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionModal('income'));
  document.getElementById('addExpenseBtn').addEventListener('click', () => showTransactionModal('expense'));
  document.getElementById('addBillBtn').addEventListener('click', () => showBillModal());
  document.getElementById('addInvestmentBtn').addEventListener('click', () => showInvestmentModal());
  document.getElementById('addGoalBtn').addEventListener('click', () => showGoalModal());
}

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  income: 'Ganhos',
  expense: 'Gastos',
  bills: 'Contas Fixas',
  investments: 'Investimentos',
  goals: 'Metas',
  insights: 'Inteligência & Insights',
  health: 'Saúde Financeira',
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
    case 'investments': return loadInvestments();
    case 'goals': return loadGoals();
    case 'insights': return loadInsights();
    case 'health': return loadHealth();
    case 'reports': return loadReports();
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function calcPrevMonth(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function loadDashboard() {
  const prevMonth = calcPrevMonth(state.month);
  const [stats, prevStats] = await Promise.all([
    api('GET', `/api/stats/${state.month}`),
    api('GET', `/api/stats/${prevMonth}`)
  ]);
  renderStatCards(stats, prevStats);
  renderRecentList(stats);
  await renderCharts(stats);
}

function renderStatCards(stats, prevStats) {
  const { totalIncome, totalExpense, totalBills, totalOutflow, totalInvested, balance, health } = stats;
  const savingsRate = stats.savingsRate ?? 0;
  const prevInvested = prevStats?.totalInvested ?? 0;
  const investDelta = (totalInvested ?? 0) - prevInvested;
  const investDeltaSign = investDelta > 0 ? '+' : '';
  const investDeltaColor = investDelta >= 0 ? 'var(--income)' : 'var(--expense)';
  const prevMonthName = fmtMonth(calcPrevMonth(state.month));
  const investDeltaLabel = prevInvested === 0
    ? 'sem investimento no mês anterior'
    : `mês ant.: ${fmt(prevInvested)}`;
  const investPctLabel = prevInvested > 0
    ? ` (${investDeltaSign}${((investDelta / prevInvested) * 100).toFixed(1)}%)`
    : '';

  // Inadimplência — apenas contas vencidas e não pagas
  const activeBills = stats.bills || [];
  const today = new Date();
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const overdueBills = activeBills.filter(b => {
    const isPaid = (b.paidMonths || []).includes(state.month);
    if (isPaid) return false;
    if (state.month < currentYM) return true;   // mês passado não pago = vencida
    if (state.month > currentYM) return false;  // mês futuro = não vencida
    return today.getDate() > b.dueDay;           // mês atual: passou do dia de vencimento
  });
  const unpaidCount = overdueBills.length;
  const totalCount = activeBills.length;
  const unpaidValue = overdueBills.reduce((s, b) => s + b.amount, 0);
  const unpaidPct = totalCount > 0 ? ((unpaidCount / totalCount) * 100).toFixed(1) : '0.0';
  const defaultColor = unpaidCount === 0 ? 'var(--income)' : Number(unpaidPct) >= 50 ? 'var(--expense)' : 'var(--bills)';

  // Adimplência — contas pagas no mês
  const paidBills = activeBills.filter(b => (b.paidMonths || []).includes(state.month));
  const paidCount = paidBills.length;
  const paidValue = paidBills.reduce((s, b) => s + b.amount, 0);
  const paidPct = totalCount > 0 ? ((paidCount / totalCount) * 100).toFixed(1) : '0.0';
  const complianceColor = paidCount === totalCount && totalCount > 0 ? 'var(--income)' : Number(paidPct) >= 50 ? 'var(--bills)' : 'var(--expense)';

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
      <div class="stat-card__value">${fmt(totalOutflow + (totalInvested ?? 0))}</div>
      <div class="stat-card__sub">${fmt(totalExpense)} gastos + ${fmt(totalBills)} contas + ${fmt(totalInvested ?? 0)} invest.</div>
    </div>
    <div class="stat-card balance">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div class="stat-card__label">Saldo</div>
      <div class="stat-card__value" style="color:${balance >= 0 ? 'var(--income)' : 'var(--expense)'}">${fmt(balance)}</div>
      <div class="stat-card__sub ${balance >= 0 ? 'up' : 'down'}">${savingsRate.toFixed(1)}% poupado</div>
    </div>
    <div class="stat-card invest">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      </div>
      <div class="stat-card__label">Investido no mês</div>
      <div class="stat-card__value" style="color:var(--invest)">${fmt(totalInvested ?? 0)}</div>
      <div class="stat-card__sub">${fmtMonth(state.month)}</div>
    </div>
    <div class="stat-card invest-delta">
      <div class="stat-card__icon">
        ${investDelta >= 0
      ? `<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
      : `<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`
    }
      </div>
      <div class="stat-card__label">Variação de investimentos</div>
      <div class="stat-card__value" style="color:${investDeltaColor}">${investDeltaSign}${fmt(investDelta)}${investPctLabel}</div>
      <div class="stat-card__sub">${investDeltaLabel}</div>
    </div>
    <div class="stat-card default-rate">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="stat-card__label">Inadimplência</div>
      <div class="stat-card__value" style="color:${defaultColor}">${unpaidPct}%</div>
      <div class="stat-card__sub">
        ${unpaidCount === 0
      ? 'Nenhuma conta vencida ✓'
      : `${unpaidCount} de ${totalCount} contas · ${fmt(unpaidValue)} vencido`}
      </div>
    </div>
    <div class="stat-card compliance">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <div class="stat-card__label">Adimplência</div>
      <div class="stat-card__value" style="color:${complianceColor}">${paidPct}%</div>
      <div class="stat-card__sub">
        ${paidCount === 0
      ? 'Nenhuma conta paga ainda'
      : `${paidCount} de ${totalCount} contas · ${fmt(paidValue)} pago`}
      </div>
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
  const investments = (stats.investments || []).map(i => ({ ...i, type: 'investment' }));
  const all = [...stats.incomes, ...stats.expenses, ...bills, ...investments]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const el = document.getElementById('recent-list');
  if (!all.length) {
    el.innerHTML = emptyState('Nenhum lançamento neste mês');
    document.getElementById('viewAllBtn').classList.add('hidden');
    return;
  }

  function buildItem(t) {
    const isBill = t.type === 'bill';
    const isInvest = t.type === 'investment';
    const amountClass = isBill ? 'expense' : isInvest ? 'invest' : t.type;
    const sign = t.type === 'income' ? '+' : isInvest ? '+' : '-';
    const meta = isBill
      ? `<span class="badge badge-cat">Conta fixa</span> · <span class="badge badge-cat">${esc(t.category)}</span>`
      : isInvest
        ? `<span class="badge badge-invest">Investimento</span> · <span class="badge badge-invest">${esc(t.category)}</span>`
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
        },
        {
          label: 'Investido',
          data: histStats.map(s => s.totalInvested ?? 0),
          backgroundColor: 'rgba(56,189,248,.75)',
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
            <td>
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
      if (!await confirmDelete('Tem certeza que deseja excluir este lançamento?')) return;
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
  const bills = await api('GET', `/api/bills?month=${state.month}`);
  const totalActive = bills.filter(b => b.active).reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills
    .filter(b => b.active && (b.paidMonths || []).includes(state.month))
    .reduce((s, b) => s + b.amount, 0);
  document.getElementById('bills-total').textContent =
    `Contas ativas: ${fmt(totalActive)}/mês · Pago em ${fmtMonth(state.month)}: ${fmt(totalPaid)}`;

  const grid = document.getElementById('bills-grid');

  if (!bills.length) {
    grid.innerHTML = `<div class="card">${emptyState('Nenhuma conta fixa cadastrada')}</div>`;
    return;
  }

  grid.innerHTML = bills.map(b => {
    const isPaid = (b.paidMonths || []).includes(state.month);

    // Calcular vencimento: comparar mês selecionado com hoje
    const today = new Date();
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const isOverdue = b.active && !isPaid && (() => {
      if (state.month < currentYM) return true;   // mês passado não pago
      if (state.month > currentYM) return false;  // mês futuro
      return today.getDate() > b.dueDay;           // mês atual: passou do dia
    })();

    return `
    <div class="bill-card ${b.active ? 'active' : 'inactive'} ${isPaid ? 'paid' : ''} ${isOverdue ? 'overdue' : ''}" data-bill-id="${b.id}">
      <div class="bill-card__top">
        <div>
          <div class="bill-card__name">
            ${esc(b.description)}
            ${isOverdue ? `<span class="overdue-flag">⚠ Vencida</span>` : ''}
          </div>
          <div class="bill-card__cat">${esc(b.category)}</div>
        </div>
        <div style="text-align:right">
          <div class="bill-card__amount">${fmt(b.amount)}</div>
          <div class="bill-card__due">Dia ${b.dueDay}</div>
        </div>
      </div>
      <div class="bill-card__actions">
        <button class="paid-btn ${isPaid ? 'is-paid' : ''}" data-paid-bill="${b.id}">${isPaid ? '✓ Pago' : 'Em aberto'}</button>
        <button class="toggle-btn" data-toggle-bill="${b.id}">${b.active ? '✓ Ativa' : 'Inativa'}</button>
        <button class="icon-btn" data-edit-bill='${JSON.stringify({ id: b.id, description: b.description, amount: b.amount, category: b.category, dueDay: b.dueDay })}' aria-label="Editar">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger" data-del-bill="${b.id}" aria-label="Excluir">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `;
  }).join('');

  const freshGrid = grid.cloneNode(false);
  freshGrid.innerHTML = grid.innerHTML;
  grid.replaceWith(freshGrid);
  freshGrid.addEventListener('click', async e => {
    const paidBtn = e.target.closest('[data-paid-bill]');
    const toggleBtn = e.target.closest('[data-toggle-bill]');
    const editBtn = e.target.closest('[data-edit-bill]');
    const delBtn = e.target.closest('[data-del-bill]');
    if (paidBtn) {
      try {
        await api('PATCH', `/api/bills/${paidBtn.dataset.paidBill}/paid`, { month: state.month });
        loadBills();
      } catch (err) { toast(err.message, 'error'); }
    } else if (toggleBtn) {
      try {
        await api('PATCH', `/api/bills/${toggleBtn.dataset.toggleBill}/toggle`, { month: state.month });
        toast('Status atualizado', 'info');
        loadBills();
      } catch (err) { toast(err.message, 'error'); }
    } else if (editBtn) {
      const data = JSON.parse(editBtn.dataset.editBill);
      showEditBillModal(data, state.month);
    } else if (delBtn) {
      if (!await confirmDelete(`Excluir esta conta fixa somente em ${fmtMonth(state.month)}?`)) return;
      try {
        await api('DELETE', `/api/bills/${delBtn.dataset.delBill}?month=${state.month}`);
        toast('Conta removida neste mês', 'success');
        loadBills();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ── Investments ───────────────────────────────────────────────────────────────
async function loadInvestments() {
  const [items, totalData] = await Promise.all([
    api('GET', `/api/investments?month=${state.month}`),
    api('GET', '/api/investments/total')
  ]);

  const monthTotal = items.reduce((s, i) => s + i.amount, 0);
  const totalEl = document.getElementById('investments-total');
  totalEl.textContent = `Investido em ${fmtMonth(state.month)}: ${fmt(monthTotal)} · Total acumulado: ${fmt(totalData.total)}`;

  const container = document.getElementById('investments-table');

  if (!items.length) {
    container.innerHTML = emptyState(`Nenhum investimento em ${fmtMonth(state.month)}`);
    return;
  }

  // Group totals by category
  const byCategory = {};
  items.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + i.amount; });

  container.innerHTML = `
    <div class="invest-summary">
      ${Object.entries(byCategory).map(([cat, val]) => `
        <div class="invest-summary__item">
          <span class="invest-summary__cat">${esc(cat)}</span>
          <span class="invest-summary__val">${fmt(val)}</span>
        </div>
      `).join('')}
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Descri\u00e7\u00e3o</th>
          <th>Tipo</th>
          <th style="text-align:right">Valor</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${items.map(i => `
          <tr>
            <td style="color:var(--text-2);width:100px">${fmtDate(i.date)}</td>
            <td>${esc(i.description)}</td>
            <td><span class="badge badge-invest">${esc(i.category)}</span></td>
            <td style="text-align:right" class="amount invest">${fmt(i.amount)}</td>
            <td>
              <button class="icon-btn" data-edit-invest='${JSON.stringify({ id: i.id, description: i.description, amount: i.amount, category: i.category, date: i.date })}' aria-label="Editar">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn danger" data-del-invest="${i.id}" aria-label="Excluir">
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
    const editBtn = e.target.closest('[data-edit-invest]');
    const delBtn = e.target.closest('[data-del-invest]');
    if (editBtn) {
      showEditInvestmentModal(JSON.parse(editBtn.dataset.editInvest));
    } else if (delBtn) {
      if (!await confirmDelete('Tem certeza que deseja excluir este investimento?')) return;
      try {
        await api('DELETE', `/api/investments/${delBtn.dataset.delInvest}`);
        toast('Investimento excluído', 'success');
        loadInvestments();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

// ── Investment modal ──────────────────────────────────────────────────────────
function showInvestmentModal() {
  const cats = state.categories.investment || [];

  openModal(`
    <div class="modal-title">+ Adicionar Investimento</div>
    <form id="invest-form">
      <div class="form-group">
        <label>Tipo</label>
        <select class="form-select" name="category" required>
          ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descri\u00e7\u00e3o</label>
        <input class="form-input" name="description" type="text" placeholder="Ex: CDB Banco Inter 12%" required minlength="2" />
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
        <button type="button" class="btn btn-ghost" id="cancelInvestBtn">Cancelar</button>
        <button type="submit" class="btn btn-invest">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('cancelInvestBtn').addEventListener('click', closeModal);
  document.getElementById('invest-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('POST', '/api/investments', {
        description: fd.get('description'),
        amount: fd.get('amount'),
        category: fd.get('category'),
        date: fd.get('date')
      });
      closeModal();
      toast('Investimento adicionado!', 'success');
      loadInvestments();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Edit Investment modal ─────────────────────────────────────────────────────
function showEditInvestmentModal(inv) {
  const cats = state.categories.investment || [];

  openModal(`
    <div class="modal-title">Editar Investimento</div>
    <form id="edit-invest-form">
      <div class="form-group">
        <label>Tipo</label>
        <select class="form-select" name="category" required>
          ${cats.map(c => `<option value="${esc(c)}"${c === inv.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descri\u00e7\u00e3o</label>
        <input class="form-input" name="description" type="text" value="${esc(inv.description)}" required minlength="2" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$)</label>
          <input class="form-input" name="amount" type="number" step="0.01" min="0.01" value="${inv.amount}" required />
        </div>
        <div class="form-group">
          <label>Data</label>
          <input class="form-input" name="date" type="date" value="${inv.date}" required />
        </div>
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelEditInvestBtn">Cancelar</button>
        <button type="submit" class="btn btn-invest">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('cancelEditInvestBtn').addEventListener('click', closeModal);
  document.getElementById('edit-invest-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('PUT', `/api/investments/${inv.id}`, {
        description: fd.get('description'),
        amount: fd.get('amount'),
        category: fd.get('category'),
        date: fd.get('date')
      });
      closeModal();
      toast('Investimento atualizado!', 'success');
      loadInvestments();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Goals ─────────────────────────────────────────────────────────────────────

function monthsUntil(targetDate) {
  const now = new Date();
  const target = new Date(targetDate + 'T00:00:00');
  const diff = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(0, diff);
}

function goalProgressColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 40) return '#f59e0b';
  return '#3b82f6';
}

function formatGoalDate(isoDate) {
  if (!isoDate) return '';
  const [year, month] = isoDate.split('-');
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

function renderGoalCard(goal) {
  const saved = goal.savedAmount || 0;
  const target = goal.targetAmount || 1;
  const pct = Math.min(100, (saved / target) * 100);
  const pctDisplay = pct.toFixed(1);
  const color = goalProgressColor(pct);
  const remaining = target - saved;
  const months = monthsUntil(goal.targetDate);
  const monthlyNeeded = months > 0 ? remaining / months : (remaining > 0 ? remaining : 0);
  const isDone = saved >= target;
  const isOverdueCard = !isDone && months === 0;

  const editSvg = `<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const trashSvg = `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

  const monthlyInfo = isDone
    ? `<span class="goal-meta__item goal-achieved">🎉 Meta atingida!</span>`
    : months > 0
      ? `<span class="goal-meta__item">📅 ${fmt(monthlyNeeded)}/mês</span><span class="goal-meta__item">⏳ ${months} ${months === 1 ? 'mês' : 'meses'} restantes</span>`
      : `<span class="goal-meta__item goal-overdue-label">⚠️ Prazo vencido</span>`;

  return `
    <div class="goal-card ${isDone ? 'goal-done' : ''} ${isOverdueCard ? 'goal-overdue-card' : ''}" data-goal-id="${goal.id}">
      <div class="goal-card__top">
        <div>
          <div class="goal-card__name">${esc(goal.description)}</div>
          <div class="goal-card__cat">${esc(goal.category || 'Geral')}</div>
        </div>
        <div style="text-align:right">
          <div class="goal-card__amount" style="color:${color}">${pctDisplay}%</div>
          <div class="goal-card__sub">${fmt(saved)} <span class="goal-of">de</span> ${fmt(target)}</div>
        </div>
      </div>
      <div class="goal-thermometer">
        <div class="goal-thermometer__fill" style="width:${pctDisplay}%;background:${color}"></div>
      </div>
      <div class="goal-card__meta">
        <span class="goal-meta__item">🎯 ${formatGoalDate(goal.targetDate)}</span>
        ${monthlyInfo}
      </div>
      <div class="goal-card__actions">
        ${!isDone ? `<button class="goal-aporte-btn" data-contribute-goal="${goal.id}">Aportar</button>` : ''}
        ${goal.contributions && goal.contributions.length > 0 ? `<button class="goal-aporte-btn" data-view-contributions="${goal.id}">Aportes (${goal.contributions.length})</button>` : ''}
        <button class="icon-btn" data-edit-goal="${goal.id}" aria-label="Editar">${editSvg}</button>
        <button class="icon-btn danger" data-del-goal="${goal.id}" aria-label="Excluir">${trashSvg}</button>
      </div>
    </div>`;
}

function showContributionsModal(goal, goals) {
  const all = (goal.contributions || []).slice().reverse();
  const rows = all.map(c => `
    <tr>
      <td>${c.date ? c.date.split('-').reverse().join('/') : '—'}</td>
      <td>${fmt(c.amount)}</td>
      <td>${esc(c.note || '—')}</td>
      <td><button class="icon-btn danger btn-xs" data-del-contribution="${c.id}" data-contribution-goal="${goal.id}" title="Remover">✕</button></td>
    </tr>`).join('');
  const total = all.reduce((s, c) => s + c.amount, 0);
  openModal(`
    <div class="modal-title">Aportes — ${esc(goal.description)}</div>
    <p style="font-size:12px;color:var(--text-3);margin:0 0 12px">Total aportado: <strong style="color:var(--text)">${fmt(total)}</strong></p>
    <table class="data-table contributions-table" id="contribsTable">
      <thead><tr><th>Data</th><th>Valor</th><th>Nota</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="form-footer" style="margin-top:14px">
      <button class="btn btn-ghost" id="closeContribsBtn">Fechar</button>
    </div>
  `);
  document.getElementById('closeContribsBtn').addEventListener('click', closeModal);
  document.getElementById('contribsTable').addEventListener('click', async e => {
    const btn = e.target.closest('[data-del-contribution]');
    if (!btn) return;
    const ok = await confirmDelete('Remover este aporte?');
    if (!ok) return;
    await api('DELETE', `/api/goals/${btn.dataset.contributionGoal}/contributions/${btn.dataset.delContribution}`);
    toast('Aporte removido', 'success');
    closeModal();
    loadGoals();
  });
}

async function loadGoals() {
  const grid = document.getElementById('goals-grid');
  const summary = document.getElementById('goals-summary');
  grid.innerHTML = loader();

  let goals;
  try {
    goals = await api('GET', '/api/goals');
  } catch (err) {
    grid.innerHTML = emptyState(`Erro ao carregar metas: ${err.message}`);
    return;
  }

  if (!goals || goals.length === 0) {
    grid.innerHTML = emptyState('Nenhuma meta cadastrada. Crie sua primeira meta!');
    summary.textContent = '0 Metas';
    return;
  }

  const total = goals.length;
  const done = goals.filter(g => (g.savedAmount || 0) >= g.targetAmount).length;
  summary.textContent = `${total} Meta${total !== 1 ? 's' : ''} · ${done} concluída${done !== 1 ? 's' : ''}`;

  grid.innerHTML = goals.map(renderGoalCard).join('');

  grid.querySelectorAll('[data-view-contributions]').forEach(btn => {
    btn.addEventListener('click', () => {
      const goal = goals.find(g => g.id === btn.dataset.viewContributions);
      if (goal) showContributionsModal(goal, goals);
    });
  });

  grid.querySelectorAll('[data-contribute-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const goal = goals.find(g => g.id === btn.dataset.contributeGoal);
      if (goal) showContributeModal(goal);
    });
  });

  grid.querySelectorAll('[data-edit-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const goal = goals.find(g => g.id === btn.dataset.editGoal);
      if (goal) showGoalModal(goal);
    });
  });

  grid.querySelectorAll('[data-del-goal]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const goal = goals.find(g => g.id === btn.dataset.delGoal);
      if (!goal) return;
      const ok = await confirmDelete(`Excluir a meta "${goal.description}"?`);
      if (!ok) return;
      await api('DELETE', `/api/goals/${goal.id}`);
      toast('Meta excluída', 'success');
      loadGoals();
    });
  });

}

function showGoalModal(goal = null) {
  const isEdit = !!goal;
  const todayMonth = new Date().toISOString().substring(0, 7);
  openModal(`
    <div class="modal-title">${isEdit ? 'Editar Meta' : 'Nova Meta'}</div>
    <form id="goalForm">
      <div class="form-group">
        <label>Descrição *</label>
        <input class="form-input" type="text" id="gDescription" maxlength="80" placeholder="Ex: Viagem ao Japão" value="${isEdit ? esc(goal.description) : ''}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor da Meta (R$) *</label>
          <input class="form-input" type="number" id="gTargetAmount" min="1" step="0.01" placeholder="0,00" value="${isEdit ? goal.targetAmount : ''}" required>
        </div>
        <div class="form-group">
          <label>Data Alvo *</label>
          <input class="form-input" type="month" id="gTargetDate" min="${todayMonth}" value="${isEdit ? goal.targetDate.substring(0, 7) : ''}" required>
        </div>
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <input class="form-input" type="text" id="gCategory" maxlength="40" placeholder="Ex: Viagem, Carro, Emergência" value="${isEdit ? esc(goal.category || '') : ''}">
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelGoalBtn">Cancelar</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar' : 'Criar Meta'}</button>
      </div>
    </form>
  `);

  document.getElementById('cancelGoalBtn').addEventListener('click', closeModal);

  document.getElementById('goalForm').addEventListener('submit', async e => {
    e.preventDefault();
    const description = document.getElementById('gDescription').value.trim();
    const targetAmount = parseFloat(document.getElementById('gTargetAmount').value);
    const targetDateMonth = document.getElementById('gTargetDate').value;
    const category = document.getElementById('gCategory').value.trim() || 'Geral';

    if (!description || !targetDateMonth || isNaN(targetAmount) || targetAmount <= 0) {
      toast('Preencha todos os campos obrigatórios', 'error'); return;
    }

    const targetDate = targetDateMonth + '-01';

    if (isEdit) {
      await api('PUT', `/api/goals/${goal.id}`, { description, targetAmount, targetDate, category });
      toast('Meta atualizada', 'success');
    } else {
      await api('POST', '/api/goals', { description, targetAmount, targetDate, category });
      toast('Meta criada!', 'success');
    }
    closeModal();
    loadGoals();
  });
}

function showContributeModal(goal) {
  const months = monthsUntil(goal.targetDate);
  const remaining = Math.max(0, goal.targetAmount - (goal.savedAmount || 0));
  const suggestion = months > 0 ? (remaining / months).toFixed(2) : '';
  const pct = Math.min(100, ((goal.savedAmount || 0) / goal.targetAmount) * 100);

  openModal(`
    <div class="modal-title">Aportar para: ${esc(goal.description)}</div>
    <form id="contributeForm">
      <div class="contribute-summary">
        <div class="goal-thermometer">
          <div class="goal-thermometer__fill" style="width:${pct.toFixed(1)}%;background:${goalProgressColor(pct)}"></div>
        </div>
        <small style="color:var(--text-muted)">${fmt(goal.savedAmount || 0)} de ${fmt(goal.targetAmount)} (${pct.toFixed(1)}%)</small>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor do Aporte (R$) *</label>
          <input class="form-input" type="number" id="cAmount" min="0.01" step="0.01" value="${suggestion}" placeholder="0,00" required>
        </div>
        <div class="form-group">
          <label>Data</label>
          <input class="form-input" type="date" id="cDate" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <div class="form-group">
        <label>Nota (opcional)</label>
        <input class="form-input" type="text" id="cNote" maxlength="80" placeholder="Ex: Salário de maio">
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelContributeBtn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Confirmar Aporte</button>
      </div>
    </form>
  `);

  document.getElementById('cancelContributeBtn').addEventListener('click', closeModal);

  document.getElementById('contributeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('cAmount').value);
    const date = document.getElementById('cDate').value;
    const note = document.getElementById('cNote').value.trim();

    if (isNaN(amount) || amount <= 0) { toast('Valor inválido', 'error'); return; }

    await api('POST', `/api/goals/${goal.id}/contributions`, { amount, date, note });
    toast('Aporte registrado!', 'success');
    closeModal();
    loadGoals();
  });
}

// ── Insights ───────────────────────────────────────────────────────────
async function loadInsights() {
  const el = document.getElementById('insights-content');
  el.innerHTML = loader();

  if (!state.month) {
    el.innerHTML = `<div class="card" style="padding:24px">${emptyState('Selecione um mês para ver os insights.')}</div>`;
    return;
  }

  try {
    const data = await api('GET', `/api/insights/${state.month}`);
    const { forecast, subscriptions } = data;
    el.innerHTML = renderForecastSection(forecast) + renderSubscriptionsSection(subscriptions);

    el.querySelectorAll('[data-sub-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = document.getElementById(btn.dataset.subToggle);
        if (!body) return;
        const open = !body.hidden;
        body.hidden = open;
        btn.classList.toggle('open', !open);
      });
    });
  } catch (err) {
    el.innerHTML = `<div class="card" style="padding:24px">${emptyState('Erro ao carregar insights: ' + err.message)}</div>`;
  }
}

function renderForecastSection(f) {
  const balanceClass = f.projectedBalance >= 0 ? 'positive' : 'negative';
  const balanceIcon = f.projectedBalance >= 0 ? '🟢' : '🔴';

  const progressPct = f.totalIncome > 0
    ? Math.min(100, ((f.totalExpense + f.totalBills) / f.totalIncome) * 100)
    : 0;

  let alertHtml = '';
  if (!f.isCurrentMonth) {
    alertHtml = `<div class="insight-alert insight-alert--info">ℹ️ Visualizando projeção para um mês não corrente.</div>`;
  } else if (f.currentBalance < 0 || f.projectedBalance < 0) {
    const dayInfo = f.negativeDayForecast ? ` por volta do dia <strong>${f.negativeDayForecast}</strong>` : '';
    alertHtml = `<div class="insight-alert insight-alert--danger">🔴 Atenção: seu saldo ${f.currentBalance < 0 ? 'já está negativo' : `ficará negativo${dayInfo}`}. Revise seus gastos.</div>`;
  } else if (f.negativeDayForecast) {
    alertHtml = `<div class="insight-alert insight-alert--danger">⚠️ Cuidado: se continuar assim, você ficará negativo por volta do dia <strong>${f.negativeDayForecast}</strong>.</div>`;
  } else if (progressPct >= 90) {
    alertHtml = `<div class="insight-alert insight-alert--danger">⚠️ Comprometimento crítico (${progressPct.toFixed(1)}%)! Suas despesas estão consumindo quase toda a receita.</div>`;
  } else if (progressPct >= 70) {
    alertHtml = `<div class="insight-alert insight-alert--warning">🟡 Atenção: ${progressPct.toFixed(1)}% da receita já comprometida. Acompanhe seus gastos.</div>`;
  } else {
    alertHtml = `<div class="insight-alert insight-alert--success">✅ Projeção positiva! Você deve fechar o mês no azul.</div>`;
  }

  const progressColor = progressPct >= 90 ? '#ef4444' : progressPct >= 70 ? '#f59e0b' : '#22c55e';

  return `
    <div class="insights-section" id="insights-forecast">
      <div class="insights-section__title">
        <svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
        Projeção de Saldo — ${fmtMonth(state.month)}
      </div>
      ${alertHtml}
      <div class="insight-cards">
        <div class="insight-card">
          <div class="insight-card__label">Saldo atual</div>
          <div class="insight-card__value ${f.currentBalance >= 0 ? 'text-income' : 'text-expense'}">${fmt(f.currentBalance)}</div>
          <div class="insight-card__sub">Receitas menos despesas até hoje (dia ${f.dayOfMonth})</div>
        </div>
        <div class="insight-card">
          <div class="insight-card__label">Saldo projetado no fim do mês</div>
          <div class="insight-card__value ${balanceClass}">${balanceIcon} ${fmt(f.projectedBalance)}</div>
          <div class="insight-card__sub">Baseado em ${fmt(f.dailyExpenseRate)}/dia × ${f.daysRemaining} dias restantes</div>
        </div>
        <div class="insight-card">
          <div class="insight-card__label">Contas a pagar (em aberto)</div>
          <div class="insight-card__value ${f.unpaidBillsTotal > 0 ? 'text-expense' : 'text-income'}">${fmt(f.unpaidBillsTotal)}</div>
          <div class="insight-card__sub">De ${fmt(f.totalBills)} total de contas fixas</div>
        </div>
      </div>
      <div class="insight-progress-wrap">
        <div class="insight-progress-label">
          <span>Comprometimento da receita</span>
          <span style="color:${progressColor};font-weight:700">${progressPct.toFixed(1)}%</span>
        </div>
        <div class="insight-progress-bar">
          <div class="insight-progress-fill" style="width:${progressPct}%;background:${progressColor}"></div>
        </div>
        <div class="insight-progress-legend">
          <span>🟢 &lt;70% saudável</span>
          <span>🟡 70-90% atenção</span>
          <span>🔴 &gt;90% crítico</span>
        </div>
      </div>
    </div>`;
}

function renderSubscriptionsSection(subs) {
  const groups = subs.groups || {};
  const groupNames = Object.keys(groups);

  if (groupNames.length === 0) {
    return `
      <div class="insights-section" id="insights-spending">
        <div class="insights-section__title">
          <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Análise de Gastos
        </div>
        ${emptyState('Nenhum gasto ou conta fixa registrado neste mês.')}
      </div>`;
  }

  const CAT_ICONS = {
    // Gastos variáveis
    'Alimentação': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,
    'Transporte': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    'Moradia': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    'Saúde': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    'Educação': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    'Lazer': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13" stroke-width="3"/><line x1="18" y1="11" x2="18.01" y2="11" stroke-width="3"/></svg>`,
    'Vestuário': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>`,
    // Contas fixas
    'Água': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    'Luz': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    'Internet': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    'Telefone': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.67 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.58 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    'Aluguel': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l2 2"/></svg>`,
    'Condomínio': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="8.01" y2="6" stroke-width="3"/><line x1="12" y1="6" x2="12.01" y2="6" stroke-width="3"/><line x1="16" y1="6" x2="16.01" y2="6" stroke-width="3"/><line x1="8" y1="10" x2="8.01" y2="10" stroke-width="3"/><line x1="12" y1="10" x2="12.01" y2="10" stroke-width="3"/><line x1="16" y1="10" x2="16.01" y2="10" stroke-width="3"/><line x1="8" y1="14" x2="8.01" y2="14" stroke-width="3"/><line x1="16" y1="14" x2="16.01" y2="14" stroke-width="3"/></svg>`,
    'Streaming': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
    'Cartão de Crédito': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    'Academia': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="4" cy="12" r="2"/><circle cx="20" cy="12" r="2"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="8" y1="9" x2="8" y2="15"/><line x1="16" y1="9" x2="16" y2="15"/></svg>`,
    'Seguro': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    'Outros': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
  };
  const DEFAULT_CAT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

  const groupsHtml = groupNames.map((name, idx) => {
    const g = groups[name];
    const items = Array.isArray(g) ? g : (g.items || []);
    const groupTotal = typeof g.total === 'number' ? g.total : items.reduce((s, i) => s + i.amount, 0);
    const bodyId = `spend-group-body-${idx}`;
    const rows = items
      .slice().sort((a, b) => b.amount - a.amount)
      .map(item => {
        const pct = groupTotal > 0 ? (item.amount / groupTotal * 100).toFixed(1) : '0.0';
        const tag = item.source === 'conta_fixa'
          ? `<span class="spend-tag spend-tag--bill">Fixa</span>`
          : `<span class="spend-tag spend-tag--exp">Variável</span>`;
        return `
          <div class="sub-item">
            <span class="sub-item__name">${esc(item.name)} ${tag}</span>
            <span class="sub-item__pct">${pct}%</span>
            <span class="sub-item__amount">${fmt(item.amount)}</span>
          </div>`;
      }).join('');
    return `
      <div class="sub-group">
        <button class="sub-group__header" data-sub-toggle="${bodyId}" type="button">
          <span class="sub-group__icon">${CAT_ICONS[name] || DEFAULT_CAT_ICON}</span>
          <span class="sub-group__name">${esc(name)}</span>
          <span class="sub-group__count">${items.length}</span>
          <span class="sub-group__total">${fmt(groupTotal)}</span>
          <svg class="sub-group__chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="sub-group__items" id="${bodyId}" hidden>${rows}</div>
      </div>`;
  }).join('');

  return `
    <div class="insights-section" id="insights-spending">
      <div class="insights-section__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Análise de Gastos
        <span class="insights-section__badge">${fmt(subs.total)} total</span>
      </div>
      <div class="sub-groups">${groupsHtml}</div>
    </div>`;
}

// ── Saúde Financeira ──────────────────────────────────────────────────────────
async function loadHealth() {
  const el = document.getElementById('health-content');
  if (!el) return;
  if (!state.month) { el.innerHTML = emptyState('Selecione um mês para ver a análise.'); return; }
  el.innerHTML = loader();
  try {
    const data = await api('GET', `/api/health/${state.month}`);
    el.innerHTML = renderHealthModule(data);
    renderHealthCharts(data);
  } catch (e) {
    console.error('[Saúde Financeira]', e);
    el.innerHTML = emptyState(`Erro ao carregar análise: ${e.message}`);
  }
}

function renderHealthModule(data) {
  const { health, current, ideal, gap, projections, plan, enhancements, history } = data;
  const { score, label, tips, breakdown } = health;
  const { totalIncome, totalExpense, totalBills, totalInvested, balance } = current;

  const scoreColor = score >= 85 ? '#22c55e' : score >= 65 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const r = 58, circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  const fmtPct = v => v.toFixed(1) + '%';
  const bar = (actual, target, color, inverse = false) => {
    const pct = Math.min(100, (actual / (target || 1)) * 100);
    const ok = inverse ? actual <= target : actual >= target;
    const barColor = ok ? '#22c55e' : '#ef4444';
    return `<div class="hbar-wrap"><div class="hbar-fill" style="width:${pct}%;background:${barColor}"></div></div>`;
  };

  // 50-30-20 breakdown
  const bd = breakdown || {};
  const pillars = [
    { name: 'Necessidades', icon: '🏠', pct: bd.needsPct || 0, target: 50, actual: totalBills, idealAmt: ideal.needs, score: bd.needsScore || 0, weight: '40%', dir: 'lte', label: '≤ 50%' },
    { name: 'Desejos', icon: '🛍️', pct: bd.wantsPct || 0, target: 30, actual: totalExpense, idealAmt: ideal.wants, score: bd.wantsScore || 0, weight: '30%', dir: 'lte', label: '≤ 30%' },
    { name: 'Investimentos', icon: '📈', pct: bd.investPct || 0, target: 20, actual: totalInvested, idealAmt: ideal.invest, score: bd.investScore || 0, weight: '30%', dir: 'gte', label: '≥ 20%' },
  ];

  const pillarCards = pillars.map(p => {
    const ok = p.dir === 'lte' ? p.pct <= p.target : p.pct >= p.target;
    const color = ok ? '#22c55e' : '#ef4444';
    const pctFill = Math.min(100, (p.pct / (p.dir === 'lte' ? p.target * 1.5 : p.target)));
    return `
      <div class="hpillar-card">
        <div class="hpillar-card__top">
          <span class="hpillar-card__icon">${p.icon}</span>
          <div>
            <div class="hpillar-card__name">${p.name}</div>
            <div class="hpillar-card__meta">Meta: ${p.label} · Peso ${p.weight}</div>
          </div>
          <div class="hpillar-card__score" style="color:${color}">${Math.round(p.score)}</div>
        </div>
        <div class="hpillar-card__row">
          <span style="font-size:12px;color:var(--text-3)">Atual: ${fmt(p.actual)} (${fmtPct(p.pct)})</span>
          <span style="font-size:12px;color:var(--text-3)">Ideal: ${fmt(p.idealAmt)}</span>
        </div>
        <div class="hbar-wrap"><div class="hbar-fill" style="width:${pctFill * (p.dir === 'gte' ? (p.pct / p.target) : 1) >= 1 ? '100' : (p.pct / (p.dir === 'lte' ? p.target * 1.5 : p.target) * 100).toFixed(0)}%;background:${color}"></div></div>
        ${!ok ? `<div class="hpillar-card__gap" style="color:${color}">
          ${p.dir === 'lte'
          ? `Reduzir ${fmt(gap[p.name === 'Necessidades' ? 'needs' : 'wants'])}/mês`
          : `Aumentar ${fmt(gap.invest)}/mês`}
        </div>` : '<div class="hpillar-card__gap" style="color:#22c55e">✓ Dentro da meta</div>'}
      </div>`;
  }).join('');

  // History trend
  const historyHtml = history.length ? history.map(h => `
    <div class="hhistory-item">
      <span class="hhistory-item__month">${fmtMonth(h.month)}</span>
      <div class="hbar-wrap" style="flex:1"><div class="hbar-fill" style="width:${h.score}%;background:${h.score >= 85 ? '#22c55e' : h.score >= 65 ? '#f59e0b' : '#ef4444'}"></div></div>
      <span class="hhistory-item__score" style="color:${h.score >= 85 ? '#22c55e' : h.score >= 65 ? '#f59e0b' : '#ef4444'}">${h.score}</span>
    </div>`).join('') : '<p style="color:var(--text-3);font-size:13px">Sem histórico anterior disponível.</p>';

  // Projection section
  const projHtml = projections.map(p => `
    <div class="hproj-row">
      <span class="hproj-row__label">+${p.month} mês${p.month > 1 ? 'es' : ''}</span>
      <span class="hproj-row__val" style="color:${p.cumulativeBalance >= 0 ? '#22c55e' : '#ef4444'}">${fmt(p.cumulativeBalance)}</span>
      <span style="font-size:11px;color:var(--text-3)">${p.cumulativeBalance >= 0 ? 'positivo' : 'negativo'}</span>
    </div>`).join('');

  // Plan
  const planHtml = plan.length ? plan.map(p => `
    <div class="hplan-item hplan-item--${p.impact}">
      <div class="hplan-item__pillar">${p.pillar} <span class="hplan-item__badge">${p.impact}</span></div>
      <div class="hplan-item__action">${p.action}</div>
    </div>`).join('') : '<p style="color:#22c55e;font-size:13px">✅ Parabéns! Você está seguindo a regra 50-30-20.</p>';

  const enhHtml = enhancements.length ? enhancements.map(e =>
    `<div class="hplan-item hplan-item--enhance">${e}</div>`).join('') : '';

  return `
    <div class="health-module">

      <!-- Score principal -->
      <div class="hmodule-score-card" id="health-score">
        <div class="hmodule-ring-wrap">
          <svg width="140" height="140">
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="11"/>
            <circle cx="70" cy="70" r="${r}" fill="none"
              stroke="${scoreColor}" stroke-width="11"
              stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
              stroke-linecap="round"
              style="transform:rotate(-90deg);transform-origin:70px 70px;transition:stroke-dashoffset 1s ease"/>
          </svg>
          <div class="hmodule-ring-text">
            <span class="hmodule-ring-score" style="color:${scoreColor}">${score}</span>
            <span class="hmodule-ring-label">/ 100</span>
          </div>
        </div>
        <div class="hmodule-score-info">
          <div class="hmodule-score-status" style="color:${scoreColor}">${label}</div>
          <div class="hmodule-score-method">Regra 50-30-20</div>
          <div class="hmodule-score-income">Renda: ${fmt(totalIncome)} · Saldo: <span style="color:${balance >= 0 ? '#22c55e' : '#ef4444'}">${fmt(balance)}</span></div>
          <div class="hmodule-tips">
            ${tips.map(t => `<div class="hmodule-tip">${t}</div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Pilares 50-30-20 -->
      <div class="hmodule-section" id="health-pillars">
        <div class="hmodule-section__title">📊 Distribuição 50-30-20</div>
        <div class="hpillar-grid">${pillarCards}</div>
      </div>

      <!-- Gráfico de distribuição -->
      <div class="hmodule-section" id="health-chart-sect">
        <div class="hmodule-section__title">📉 Comparação visual com a meta</div>
        <div class="chart-wrap" style="height:220px"><canvas id="chart-health-bar"></canvas></div>
      </div>

      <!-- Histórico -->
      <div class="hmodule-section" id="health-history">
        <div class="hmodule-section__title">📅 Tendência dos últimos meses</div>
        <div class="hhistory">${historyHtml}</div>
      </div>

      <!-- Projeção -->
      <div class="hmodule-section" id="health-proj">
        <div class="hmodule-section__title">🔮 Projeção — se manter como está</div>
        <p style="font-size:12.5px;color:var(--text-3);margin-bottom:12px">Saldo acumulado projetado mantendo o ritmo atual de receitas e despesas.</p>
        <div class="hproj">${projHtml}</div>
        <div class="chart-wrap" style="height:200px;margin-top:16px"><canvas id="chart-health-proj"></canvas></div>
      </div>

      <!-- Plano de melhora -->
      <div class="hmodule-section" id="health-plan">
        <div class="hmodule-section__title">${score < 65 ? '🛠️ Plano de Melhora' : '🚀 Plano de Aprimoramento'}</div>
        ${planHtml}
        ${enhHtml}
      </div>

    </div>`;
}

function renderHealthCharts(data) {
  const { current, ideal } = data;
  const { totalExpense, totalBills, totalInvested, totalIncome } = current;

  // Bar chart: actual vs ideal
  destroyChart('health-bar');
  const ctxBar = document.getElementById('chart-health-bar');
  if (ctxBar) {
    state.charts['health-bar'] = new Chart(ctxBar.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Necessidades (50%)', 'Desejos (30%)', 'Investimentos (20%)'],
        datasets: [
          { label: 'Ideal', data: [ideal.needs, ideal.wants, ideal.invest], backgroundColor: 'rgba(99,102,241,.45)', borderRadius: 5 },
          {
            label: 'Atual', data: [totalBills, totalExpense, totalInvested], backgroundColor: [
              totalBills <= ideal.needs ? 'rgba(34,197,94,.7)' : 'rgba(239,68,68,.7)',
              totalExpense <= ideal.wants ? 'rgba(34,197,94,.7)' : 'rgba(239,68,68,.7)',
              totalInvested >= ideal.invest ? 'rgba(34,197,94,.7)' : 'rgba(239,68,68,.7)'
            ], borderRadius: 5
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

  // Projection line chart
  destroyChart('health-proj');
  const ctxProj = document.getElementById('chart-health-proj');
  if (ctxProj) {
    const labels = data.projections.map(p => `+${p.month}m`);
    const vals = data.projections.map(p => p.cumulativeBalance);
    state.charts['health-proj'] = new Chart(ctxProj.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Saldo projetado',
          data: vals,
          borderColor: vals[vals.length - 1] >= 0 ? '#22c55e' : '#ef4444',
          backgroundColor: vals[vals.length - 1] >= 0 ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
          fill: true, tension: 0.4, pointRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.04)' } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) } }
        }
      }
    });
  }
}

// ── Reports ───────────────────────────────────────────────────────────────────
function renderReportGoals(goals) {
  if (!goals || goals.length === 0) return '';
  const total = goals.length;
  const done = goals.filter(g => (g.savedAmount || 0) >= g.targetAmount).length;
  const inProgress = total - done;
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + (g.savedAmount || 0), 0);
  const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
  const color = overallPct >= 80 ? '#22c55e' : overallPct >= 40 ? '#f59e0b' : '#3b82f6';

  const rows = goals.map(g => {
    const saved = g.savedAmount || 0;
    const pct = Math.min(100, (saved / g.targetAmount) * 100);
    const months = monthsUntil(g.targetDate);
    const remaining = g.targetAmount - saved;
    const monthly = months > 0 ? remaining / months : 0;
    const isDone = saved >= g.targetAmount;
    return `
      <tr>
        <td>${esc(g.description)}</td>
        <td style="color:var(--text-3);font-size:12px">${esc(g.category || 'Geral')}</td>
        <td>${fmt(saved)} <span style="color:var(--text-3);font-size:11px">de ${fmt(g.targetAmount)}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:var(--border);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct.toFixed(1)}%;background:${goalProgressColor(pct)};border-radius:99px"></div>
            </div>
            <span style="font-size:11.5px;font-weight:700;color:${goalProgressColor(pct)};width:36px;text-align:right">${pct.toFixed(0)}%</span>
          </div>
        </td>
        <td style="font-size:12px;color:var(--text-3)">${formatGoalDate(g.targetDate)}</td>
        <td style="font-size:12px">${isDone ? '<span style="color:#22c55e;font-weight:600">✓ Atingida</span>' : months > 0 ? fmt(monthly) + '/mês' : '<span style="color:var(--expense)">Vencida</span>'}</td>
      </tr>`;
  }).join('');

  return `
    <div class="card" id="report-goals" style="margin-bottom:20px">
      <div class="card-header">
        <span class="card-title">Metas</span>
        <span style="font-size:12px;color:var(--text-3)">${done} concluída${done !== 1 ? 's' : ''} · ${inProgress} em andamento</span>
      </div>
      <table class="cmp-table" style="margin-bottom:12px">
        <tbody>
          ${cmpRow('Total de metas', String(total))}
          ${cmpRow('Total acumulado', fmt(totalSaved))}
          ${cmpRow('Total a atingir', fmt(totalTarget))}
          ${cmpRow('Progresso geral', `<span style="color:${color};font-weight:700">${overallPct.toFixed(1)}%</span>`)}
        </tbody>
      </table>
      <div style="overflow-x:auto">
        <table class="data-table" style="font-size:13px">
          <thead>
            <tr>
              <th>Meta</th><th>Categoria</th><th>Poupado</th><th style="min-width:140px">Progresso</th><th>Prazo</th><th>Poupar/mês</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function renderReportSubscriptions(subs) {
  if (!subs || !subs.groups || Object.keys(subs.groups).length === 0) return '';
  const groups = subs.groups;
  const groupNames = Object.keys(groups);

  const rows = groupNames.map(name => {
    const g = groups[name];
    const items = Array.isArray(g) ? g : (g.items || []);
    const groupTotal = typeof g.total === 'number' ? g.total : items.reduce((s, i) => s + i.amount, 0);
    const subRows = items.map(item => {
      const sourceLabel = item.source === 'conta_fixa' ? 'Fixa' : 'Variável';
      return `
      <tr style="opacity:.8">
        <td style="padding-left:28px;font-size:12px;color:var(--text-2)">${esc(item.name)}
          <span style="font-size:10px;padding:1px 5px;border-radius:99px;margin-left:4px;background:${item.source === 'conta_fixa' ? 'rgba(251,191,36,.15)' : 'rgba(248,113,113,.15)'};color:${item.source === 'conta_fixa' ? '#fbbf24' : '#f87171'}">${sourceLabel}</span>
        </td>
        <td style="font-size:12px;color:var(--text-3)">${esc(name)}</td>
        <td style="font-size:12px">${fmt(item.amount)}</td>
        <td style="font-size:12px;color:var(--text-3)">—</td>
      </tr>`;
    }).join('');
    return `
      <tr style="font-weight:600">
        <td>${esc(name)}</td>
        <td style="color:var(--text-3);font-size:12px">${items.length} item${items.length !== 1 ? 's' : ''}</td>
        <td>${fmt(groupTotal)}</td>
        <td style="color:var(--text-3)">—</td>
      </tr>${subRows}`;
  }).join('');

  return `
    <div class="card" id="report-spending" style="margin-bottom:20px">
      <div class="card-header">
        <span class="card-title">Análise de Gastos</span>
        <span style="font-size:12px;font-weight:700;color:var(--expense)">${fmt(subs.total)} total</span>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table" style="font-size:13px">
          <thead>
            <tr><th>Categoria / Descrição</th><th>Qtd</th><th>Valor</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

async function loadReports() {
  const el = document.getElementById('reports-content');
  el.innerHTML = loader();
  try {

    const [stats, cmp, avgs, goals, insights] = await Promise.all([
      api('GET', `/api/stats/${state.month}`),
      api('GET', `/api/comparison/${state.month}`),
      api('GET', '/api/averages'),
      api('GET', '/api/goals').catch(() => []),
      api('GET', `/api/insights/${state.month}`).catch(() => null)
    ]);

    const activeBills = (stats.bills || []).filter(b => b.active);
    const todayR = new Date();
    const currentYMR = `${todayR.getFullYear()}-${String(todayR.getMonth() + 1).padStart(2, '0')}`;
    const overdueBillsR = activeBills.filter(b => {
      const isPaid = (b.paidMonths || []).includes(state.month);
      if (isPaid) return false;
      if (state.month < currentYMR) return true;
      if (state.month > currentYMR) return false;
      return todayR.getDate() > b.dueDay;
    });
    const paidBillsR = activeBills.filter(b => (b.paidMonths || []).includes(state.month));
    const totalCountR = activeBills.length;
    const unpaidCountR = overdueBillsR.length;
    const unpaidValueR = overdueBillsR.reduce((s, b) => s + b.amount, 0);
    const unpaidPctR = totalCountR > 0 ? ((unpaidCountR / totalCountR) * 100).toFixed(1) : '0.0';
    const defaultColorR = unpaidCountR === 0 ? 'var(--income)' : Number(unpaidPctR) >= 50 ? 'var(--expense)' : 'var(--bills)';
    const paidCountR = paidBillsR.length;
    const paidValueR = paidBillsR.reduce((s, b) => s + b.amount, 0);
    const paidPctR = totalCountR > 0 ? ((paidCountR / totalCountR) * 100).toFixed(1) : '0.0';
    const complianceColorR = paidCountR === totalCountR && totalCountR > 0 ? 'var(--income)' : Number(paidPctR) >= 50 ? 'var(--bills)' : 'var(--expense)';

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
            ${cmpRow('Investido no mês', fmt(stats.totalInvested ?? 0), 'var(--invest)')}
            ${cmpRow('Saldo', fmt(stats.balance), stats.balance >= 0 ? 'var(--income)' : 'var(--expense)')}
            ${cmpRow('Taxa de Poupança', stats.savingsRate.toFixed(1) + '%')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" id="report-compliance" style="margin-bottom:20px">
      <div class="card-header"><span class="card-title">Adimplência &amp; Inadimplência — ${fmtMonth(state.month)}</span></div>
      <table class="cmp-table">
        <tbody>
          <tr>
            <td style="font-weight:600">Total de contas fixas ativas</td>
            <td colspan="3">${totalCountR} conta${totalCountR !== 1 ? 's' : ''}</td>
          </tr>
          <tr>
            <td style="font-weight:600;color:var(--income)">✓ Adimplência</td>
            <td><span style="color:${complianceColorR};font-weight:700">${paidPctR}%</span></td>
            <td>${paidCountR} de ${totalCountR} contas pagas</td>
            <td style="color:var(--income)">${fmt(paidValueR)} pago</td>
          </tr>
          <tr>
            <td style="font-weight:600;color:var(--expense)">⚠ Inadimplência</td>
            <td><span style="color:${defaultColorR};font-weight:700">${unpaidPctR}%</span></td>
            <td>${unpaidCountR === 0 ? 'Nenhuma conta vencida' : `${unpaidCountR} de ${totalCountR} contas vencidas`}</td>
            <td style="color:${defaultColorR}">${unpaidCountR > 0 ? fmt(unpaidValueR) + ' vencido' : '—'}</td>
          </tr>
          ${unpaidCountR > 0 ? overdueBillsR.map(b => `
          <tr style="opacity:.75">
            <td style="padding-left:24px;font-size:12px;color:var(--text-2)">${esc(b.description)}</td>
            <td style="font-size:12px;color:var(--text-2)">Vence dia ${b.dueDay}</td>
            <td></td>
            <td style="font-size:12px;color:var(--expense)">${fmt(b.amount)}</td>
          </tr>`).join('') : ''}
        </tbody>
      </table>
    </div>

    ${renderReportGoals(goals)}
    ${insights ? renderReportSubscriptions(insights.subscriptions) : ''}

    <div class="card" id="report-comparison" style="margin-bottom:20px">
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

    <div class="card" id="report-chart">
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

  } catch (err) {
    console.error('[loadReports]', err);
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--expense)">
      <p style="font-size:15px;margin-bottom:8px">Erro ao carregar relatório</p>
      <p style="font-size:12px;color:var(--text-3)">${esc(err.message)}</p>
    </div>`;
  }
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

function confirmDelete(message) {
  return new Promise(resolve => {
    openModal(`
      <div style="display:flex;justify-content:center;margin-bottom:18px">
        <svg viewBox="0 0 24 24" style="width:54px;height:54px;stroke:#f87171;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <p style="color:var(--text-2);margin-bottom:24px">${message}</p>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-ghost" id="confirmCancelBtn">Cancelar</button>
        <button class="btn btn-danger" id="confirmOkBtn">Excluir</button>
      </div>
    `);
    document.getElementById('confirmOkBtn').addEventListener('click', () => { closeModal(); resolve(true); });
    document.getElementById('confirmCancelBtn').addEventListener('click', () => { closeModal(); resolve(false); });
  });
}

function bindSidebar() {
  const app = document.querySelector('.app');
  const menuBtn = document.getElementById('menuBtn');

  menuBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      const isOpen = document.getElementById('sidebar').classList.contains('open');
      if (isOpen) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('visible');
        menuBtn.classList.remove('is-open');
      } else {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('overlay').classList.add('visible');
        menuBtn.classList.add('is-open');
      }
    } else {
      const isMini = app.classList.toggle('sidebar-mini');
      menuBtn.classList.toggle('is-open', isMini);
    }
  });

  document.getElementById('overlay').addEventListener('click', () => {
    closeSidebar();
    menuBtn.classList.remove('is-open');
  });
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
function showEditBillModal(bill, month) {
  const cats = state.categories.bill || [];
  const monthNote = month
    ? `<p style="margin:0 0 14px;font-size:13px;color:var(--text-3);background:var(--bg-2,#f3f4f6);border-radius:6px;padding:8px 10px;">
        ✏️ Alterações aplicadas somente em <strong>${fmtMonth(month)}</strong>
       </p>`
    : '';

  openModal(`
    <div class="modal-title">Editar Conta Fixa</div>
    ${monthNote}
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
        dueDay: fd.get('dueDay'),
        month: month || undefined
      });
      closeModal();
      toast('Conta fixa atualizada!', 'success');
      loadBills();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── User avatar & account ─────────────────────────────────────────────────────
function setupUserAvatar() {
  try {
    const token = getToken();
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const name = payload.name || '';
    document.getElementById('userAvatarLetter').textContent = name.charAt(0).toUpperCase() || '?';
    document.getElementById('userNameLabel').textContent = name;
  } catch { /* ignore */ }
}

async function showMyAccountModal() {
  let user;
  try { user = await api('GET', '/api/me'); }
  catch (e) { toast(e.message, 'error'); return; }

  // Carrega estado de opt-out apenas para premium
  let emailOptOut = false;
  if (user.plan === 'premium') {
    try { const r = await api('GET', '/api/email-optin'); emailOptOut = r.emailOptOut; }
    catch (_) { /* ignora */ }
  }

  const emailRow = user.plan === 'premium' ? `
      <div class="form-group" style="border-top:1px solid var(--border,#e5e7eb);padding-top:14px;margin-top:4px;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:500;">
          <input type="checkbox" id="emailOptOutChk" ${emailOptOut ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" />
          <span>Não receber relatório mensal por e-mail</span>
        </label>
        <small style="color:var(--text-3);display:block;margin-top:4px;padding-left:26px;">Relatório de Saúde Financeira enviado todo dia 1</small>
      </div>` : '';

  openModal(`
    <div class="modal-title">Minha Conta</div>
    <form id="my-account-form">
      <div class="form-group">
        <label>Nome</label>
        <input class="form-input" name="name" type="text" value="${esc(user.name)}" required minlength="2" />
      </div>
      <div class="form-group">
        <label>E-mail</label>
        <input class="form-input" name="email" type="email" value="${esc(user.email)}" required />
      </div>
      <div class="form-group">
        <label>Nova senha <small style="color:var(--text-3)">(deixe vazio para não alterar)</small></label>
        <input class="form-input" name="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="new-password" />
      </div>
      ${emailRow}
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="cancelAccountBtn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  `);

  document.getElementById('cancelAccountBtn').addEventListener('click', closeModal);
  document.getElementById('my-account-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newName = fd.get('name');
    const newEmail = fd.get('email');
    const newPass = fd.get('password');
    const body = { name: newName, email: newEmail };
    if (newPass) body.password = newPass;
    try {
      await api('PUT', '/api/me', body);

      // Salva preferência de opt-out se for premium
      if (user.plan === 'premium') {
        const chk = document.getElementById('emailOptOutChk');
        if (chk) {
          await api('PATCH', '/api/email-optin', { optOut: chk.checked }).catch(() => { });
        }
      }

      const credentialsChanged = newPass || newEmail !== user.email;
      if (credentialsChanged) {
        toast('Dados atualizados! Faça login novamente para continuar.', 'success');
        closeModal();
        setTimeout(() => {
          clearToken();
          Object.values(state.charts).forEach(c => c.destroy?.());
          state.charts = {};
          showLoginOverlay();
        }, 2000);
      } else {
        toast('Dados atualizados com sucesso!', 'success');
        closeModal();
        // Update avatar letter if name changed
        document.getElementById('userAvatarLetter').textContent = newName.charAt(0).toUpperCase() || '?';
      }
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

