// ── Token ─────────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'fin_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// Redireciona se não logado ou não for admin
const token = getToken();
if (!token) { location.href = '/'; }
else {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'admin') location.href = '/';
        else document.getElementById('adminName').textContent = payload.name || 'Admin';
    } catch { location.href = '/'; }
}

// ── API ───────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (res.status === 401) { clearToken(); location.href = '/'; return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
}
function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ── Navigation ────────────────────────────────────────────────────────────────
const PAGE_TITLES = { dashboard: 'Dashboard', users: 'Gerenciamento de Usuários' };

function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(el =>
        el.classList.toggle('active', el.dataset.page === page));
    document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || '';
    document.querySelectorAll('.page').forEach(el =>
        el.classList.toggle('hidden', el.id !== `page-${page}`));
    closeSidebar();
    if (page === 'dashboard') loadDashboard();
    else if (page === 'users') loadUsers();
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('visible');
}
document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('visible');
});
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
document.getElementById('overlay').addEventListener('click', closeSidebar);
document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) navigate(btn.dataset.page);
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    location.href = '/';
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    document.getElementById('admin-summary-cards').innerHTML = loader();
    document.getElementById('admin-users-table').innerHTML = loader();
    try {
        const metrics = await api('GET', '/api/admin/metrics');
        renderSummaryCards(metrics);
        renderUsersMetricsTable(metrics);
    } catch (e) { toast(e.message, 'error'); }
}

function renderSummaryCards(metrics) {
    const totalUsers = metrics.length;
    const activeUsers = metrics.filter(u => u.active).length;
    const totalIncome = metrics.reduce((s, u) => s + (u.currentMonth?.income || 0), 0);
    const totalBalance = metrics.reduce((s, u) => s + (u.currentMonth?.balance || 0), 0);

    document.getElementById('admin-summary-cards').innerHTML = `
    <div class="stat-card income">
        <div class="stat-card__label">Usuários Ativos</div>
        <div class="stat-card__value">${activeUsers} / ${totalUsers}</div>
        <div class="stat-card__sub">Total cadastrados</div>
    </div>
    <div class="stat-card balance">
        <div class="stat-card__label">Ganhos Totais (mês)</div>
        <div class="stat-card__value">${fmt(totalIncome)}</div>
        <div class="stat-card__sub">Soma de todos os usuários</div>
    </div>
    <div class="stat-card ${totalBalance >= 0 ? 'health' : 'expense'}">
        <div class="stat-card__label">Saldo Total (mês)</div>
        <div class="stat-card__value" style="color:${totalBalance >= 0 ? 'var(--income)' : 'var(--expense)'}">${fmt(totalBalance)}</div>
        <div class="stat-card__sub">Soma de todos os saldos</div>
    </div>
    <div class="stat-card bills">
        <div class="stat-card__label">Média de Poupança</div>
        <div class="stat-card__value">${metrics.length ? (metrics.reduce((s, u) => s + (u.currentMonth?.savingsRate || 0), 0) / metrics.length).toFixed(1) : 0}%</div>
        <div class="stat-card__sub">Média entre usuários ativos</div>
    </div>`;
}

function renderUsersMetricsTable(metrics) {
    if (!metrics.length) {
        document.getElementById('admin-users-table').innerHTML = '<div class="empty-state"><p>Nenhum usuário cadastrado</p></div>';
        return;
    }
    document.getElementById('admin-users-table').innerHTML = `
    <div class="table-wrap">
    <table class="data-table">
        <thead><tr>
            <th>Usuário</th><th>Status</th><th>Ganhos</th><th>Saídas</th><th>Saldo</th><th>Poupança</th><th>Meses</th>
        </tr></thead>
        <tbody>
        ${metrics.map(u => `
            <tr>
                <td><strong>${esc(u.name)}</strong><br><small style="color:var(--text-2)">${esc(u.email)}</small></td>
                <td><span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">${u.active ? 'Ativo' : 'Inativo'}</span></td>
                <td class="num positive">${fmt(u.currentMonth?.income)}</td>
                <td class="num negative">${fmt(u.currentMonth?.outflow)}</td>
                <td class="num ${(u.currentMonth?.balance ?? 0) >= 0 ? 'positive' : 'negative'}">${fmt(u.currentMonth?.balance)}</td>
                <td class="num">${(u.currentMonth?.savingsRate ?? 0).toFixed(1)}%</td>
                <td class="num">${u.totalMonths}</td>
            </tr>`).join('')}
        </tbody>
    </table></div>`;
}

// ── Users CRUD ────────────────────────────────────────────────────────────────
async function loadUsers() {
    document.getElementById('users-table').innerHTML = loader();
    try {
        const users = await api('GET', '/api/admin/users');
        renderUsersTable(users);
    } catch (e) { toast(e.message, 'error'); }
}

function renderUsersTable(users) {
    const regular = users.filter(u => u.role !== 'admin');
    if (!regular.length) {
        document.getElementById('users-table').innerHTML = '<div class="empty-state"><p>Nenhum usuário cadastrado</p></div>';
        return;
    }
    document.getElementById('users-table').innerHTML = `
    <div class="table-wrap">
    <table class="data-table">
        <thead><tr>
            <th>Nome</th><th>E-mail</th><th>Cadastro</th><th>Status</th><th>Ações</th>
        </tr></thead>
        <tbody>
        ${regular.map(u => `
            <tr id="user-row-${u.id}">
                <td><strong>${esc(u.name)}</strong></td>
                <td>${esc(u.email)}</td>
                <td>${fmtDate(u.createdAt)}</td>
                <td><span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">${u.active ? 'Ativo' : 'Inativo'}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-outline" onclick="openEditModal('${u.id}','${esc(u.name)}','${esc(u.email)}')">Editar</button>
                    <button class="btn btn-sm ${u.active ? 'btn-danger' : 'btn-success'}" onclick="toggleUser('${u.id}', ${!u.active})">
                        ${u.active ? 'Desativar' : 'Ativar'}
                    </button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table></div>`;
}

async function toggleUser(id, active) {
    try {
        await api('PATCH', `/api/admin/users/${id}/toggle`, { active });
        toast(`Usuário ${active ? 'ativado' : 'desativado'} com sucesso`, 'success');
        loadUsers();
    } catch (e) { toast(e.message, 'error'); }
}

// ── Modais ────────────────────────────────────────────────────────────────────
function openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modalBackdrop').classList.remove('hidden');
}
function closeModal() {
    document.getElementById('modalBackdrop').classList.add('hidden');
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
});

// Novo usuário
document.getElementById('addUserBtn').addEventListener('click', () => {
    openModal(`
    <h2 class="modal-title">Novo Usuário</h2>
    <form id="addUserForm" class="login-form">
        <div class="login-field">
            <label>Nome</label>
            <input id="newUserName" type="text" placeholder="Nome completo" required />
        </div>
        <div class="login-field">
            <label>E-mail</label>
            <input id="newUserEmail" type="email" placeholder="email@exemplo.com" required />
        </div>
        <div class="login-field">
            <label>Senha</label>
            <input id="newUserPass" type="password" placeholder="Mínimo 8 chars, letras e números" required />
        </div>
        <p class="login-error hidden" id="addUserError"></p>
        <div style="display:flex;gap:12px;margin-top:4px">
            <button class="btn btn-primary" type="submit" id="addUserSubmit">Salvar</button>
            <button class="btn btn-outline" type="button" onclick="closeModal()">Cancelar</button>
        </div>
    </form>`);
    document.getElementById('addUserForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('addUserSubmit');
        const errEl = document.getElementById('addUserError');
        const name = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPass').value;
        btn.disabled = true; btn.textContent = 'Salvando…'; errEl.classList.add('hidden');
        try {
            await api('POST', '/api/admin/users', { name, email, password });
            toast(`Usuário "${name}" criado com sucesso`, 'success');
            closeModal(); loadUsers();
        } catch (err) {
            errEl.textContent = err.message; errEl.classList.remove('hidden');
        } finally { btn.disabled = false; btn.textContent = 'Salvar'; }
    });
});

function openEditModal(id, name, email) {
    openModal(`
    <h2 class="modal-title">Editar Usuário</h2>
    <form id="editUserForm" class="login-form">
        <div class="login-field">
            <label>Nome</label>
            <input id="editName" type="text" value="${esc(name)}" required />
        </div>
        <div class="login-field">
            <label>E-mail</label>
            <input id="editEmail" type="email" value="${esc(email)}" required />
        </div>
        <div class="login-field">
            <label>Nova senha <small style="color:var(--text-3)">(deixe vazio para não alterar)</small></label>
            <input id="editPass" type="password" placeholder="••••••••" />
        </div>
        <p class="login-error hidden" id="editUserError"></p>
        <div style="display:flex;gap:12px;margin-top:4px">
            <button class="btn btn-primary" type="submit" id="editUserSubmit">Salvar</button>
            <button class="btn btn-outline" type="button" onclick="closeModal()">Cancelar</button>
        </div>
    </form>`);
    document.getElementById('editUserForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('editUserSubmit');
        const errEl = document.getElementById('editUserError');
        const newName = document.getElementById('editName').value.trim();
        const newEmail = document.getElementById('editEmail').value.trim();
        const newPass = document.getElementById('editPass').value;
        const body = { name: newName, email: newEmail };
        if (newPass) body.password = newPass;
        btn.disabled = true; btn.textContent = 'Salvando…'; errEl.classList.add('hidden');
        try {
            await api('PUT', `/api/admin/users/${id}`, body);
            toast('Usuário atualizado com sucesso', 'success');
            closeModal(); loadUsers();
        } catch (err) {
            errEl.textContent = err.message; errEl.classList.remove('hidden');
        } finally { btn.disabled = false; btn.textContent = 'Salvar'; }
    });
}

// expor funções usadas inline no HTML
window.openEditModal = openEditModal;
window.toggleUser = toggleUser;
window.closeModal = closeModal;

// ── Helpers ───────────────────────────────────────────────────────────────────
function loader() {
    return '<div class="loader"><div class="spinner"></div></div>';
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
navigate('dashboard');
