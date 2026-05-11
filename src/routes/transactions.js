import { Router } from 'express';
import { getCategories } from '../db.js';
import {
    addTransaction, getTransactions, deleteTransaction, updateTransaction,
    addBill, getBills, deleteBill, toggleBill, toggleBillPaid, updateBill,
    addInvestment, getInvestments, deleteInvestment, updateInvestment, getTotalInvested,
    getAllMonths, currentMonth, previousMonth
} from '../transactions.js';
import { buildMonthStats, compareMonths, buildAverages, financialHealth } from '../reports.js';
import { exportSpreadsheet } from '../spreadsheet.js';
import { findUserById, updateUser } from '../users.js';
import { requirePremium } from '../middleware/auth.js';

const router = Router();

// GET /api/stats/:month
router.get('/stats/:month', requirePremium, (req, res) => {
    try {
        const userId = req.user.sub;
        const stats = buildMonthStats(userId, req.params.month);
        const health = financialHealth(stats);
        res.json({ ...stats, health });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/months
router.get('/months', (req, res) => {
    try {
        const userId = req.user.sub;
        const existing = getAllMonths(userId);
        const current = currentMonth();

        // Generate a continuous range from the earliest month to today
        const earliest = existing.length ? existing[0] : current;
        const months = [];
        let [y, m] = earliest.split('-').map(Number);
        const [cy, cm] = current.split('-').map(Number);
        while (y < cy || (y === cy && m <= cm)) {
            months.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
        }
        res.json(months.sort().reverse());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/transactions
router.get('/transactions', (req, res) => {
    try {
        const userId = req.user.sub;
        const { month, type } = req.query;
        res.json(getTransactions(userId, { month, type }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/transactions
router.post('/transactions', (req, res) => {
    try {
        const userId = req.user.sub;
        const { type, description, amount, category, date } = req.body;
        if (!type || !description || !amount || !category)
            return res.status(400).json({ error: 'Campos obrigatórios: type, description, amount, category' });
        if (!['income', 'expense'].includes(type))
            return res.status(400).json({ error: 'type deve ser income ou expense' });
        const val = parseFloat(String(amount).replace(',', '.'));
        if (isNaN(val) || val <= 0)
            return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addTransaction(userId, { type, description: String(description).trim(), amount: val, category, date }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/transactions/:id
router.delete('/transactions/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const ok = deleteTransaction(userId, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/transactions/:id
router.put('/transactions/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, date } = req.body;
        if (amount !== undefined) {
            const val = parseFloat(String(amount).replace(',', '.'));
            if (isNaN(val) || val <= 0)
                return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        const tx = updateTransaction(userId, req.params.id, { description, amount: req.body.amount, category, date });
        tx ? res.json(tx) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/bills
router.get('/bills', (req, res) => {
    try {
        const userId = req.user.sub;
        res.json(getBills(userId, { activeOnly: false }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/bills
router.post('/bills', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, dueDay } = req.body;
        if (!description || !amount || !category || !dueDay)
            return res.status(400).json({ error: 'Campos obrigatórios: description, amount, category, dueDay' });
        const val = parseFloat(String(amount).replace(',', '.'));
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
        const day = parseInt(dueDay);
        if (isNaN(day) || day < 1 || day > 31) return res.status(400).json({ error: 'Dia inválido (1-31)' });
        res.status(201).json(addBill(userId, { description: String(description).trim(), amount: val, category, dueDay: day }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/bills/:id/toggle
router.patch('/bills/:id/toggle', (req, res) => {
    try {
        const userId = req.user.sub;
        const bill = toggleBill(userId, req.params.id);
        bill ? res.json(bill) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/bills/:id/paid
router.patch('/bills/:id/paid', (req, res) => {
    try {
        const userId = req.user.sub;
        const { month } = req.body;
        if (!month || !/^\d{4}-\d{2}$/.test(month))
            return res.status(400).json({ error: 'month obrigatório (YYYY-MM)' });
        const bill = toggleBillPaid(userId, req.params.id, month);
        bill ? res.json(bill) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/bills/:id
router.delete('/bills/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const ok = deleteBill(userId, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/bills/:id
router.put('/bills/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, dueDay } = req.body;
        if (amount !== undefined) {
            const val = parseFloat(String(amount).replace(',', '.'));
            if (isNaN(val) || val <= 0)
                return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        if (dueDay !== undefined) {
            const day = parseInt(dueDay);
            if (isNaN(day) || day < 1 || day > 31)
                return res.status(400).json({ error: 'Dia inválido (1-31)' });
            req.body.dueDay = day;
        }
        const bill = updateBill(userId, req.params.id, { description, amount: req.body.amount, category, dueDay: req.body.dueDay });
        bill ? res.json(bill) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/categories/:type
router.get('/categories/:type', (req, res) => {
    try { res.json(getCategories(req.params.type)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Investments ───────────────────────────────────────────────────────────────

// GET /api/investments
router.get('/investments', (req, res) => {
    try {
        const userId = req.user.sub;
        const { month } = req.query;
        res.json(getInvestments(userId, { month }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/investments/total
router.get('/investments/total', (req, res) => {
    try {
        res.json({ total: getTotalInvested(req.user.sub) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/investments
router.post('/investments', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, date } = req.body;
        if (!description || !amount || !category)
            return res.status(400).json({ error: 'Campos obrigatórios: description, amount, category' });
        const val = parseFloat(String(amount).replace(',', '.'));
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addInvestment(userId, { description: String(description).trim(), amount: val, category, date }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/investments/:id
router.put('/investments/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, date } = req.body;
        if (amount !== undefined) {
            const val = parseFloat(String(amount).replace(',', '.'));
            if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        const inv = updateInvestment(userId, req.params.id, { description, amount: req.body.amount, category, date });
        inv ? res.json(inv) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/investments/:id
router.delete('/investments/:id', (req, res) => {
    try {
        const ok = deleteInvestment(req.user.sub, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/me
router.get('/me', (req, res) => {
    try {
        const user = findUserById(req.user.sub);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ id: user.id, name: user.name, email: user.email });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/me
router.put('/me', (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (name && name.trim().length < 2)
            return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' });
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).json({ error: 'E-mail inválido' });
        if (password) {
            if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
            if (!/[a-zA-Z]/.test(password)) return res.status(400).json({ error: 'Senha deve conter letras' });
            if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Senha deve conter números' });
        }
        const updated = updateUser(req.user.sub, { name, email, password });
        res.json(updated);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /api/comparison/:month
router.get('/comparison/:month', requirePremium, (req, res) => {
    try {
        const userId = req.user.sub;
        const prev = previousMonth(req.params.month);
        res.json(compareMonths(userId, req.params.month, prev));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/averages
router.get('/averages', requirePremium, (req, res) => {
    try {
        const userId = req.user.sub;
        res.json(buildAverages(userId, getAllMonths(userId)) || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/:month
router.get('/export/:month', requirePremium, async (req, res) => {
    try {
        const userId = req.user.sub;
        const filepath = await exportSpreadsheet(userId, req.params.month);
        res.download(filepath, `financas_${req.params.month}.xlsx`);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
