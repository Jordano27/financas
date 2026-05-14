import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getCategories } from '../db.js';
import {
    addTransaction, getTransactions, deleteTransaction, updateTransaction,
    getAllMonths, currentMonth, previousMonth,
} from '../transactions.js';
import { getBills } from '../bills.js';
import { buildMonthStats, compareMonths, buildAverages, financialHealth, buildHealthAnalysis, buildInsights } from '../reports.js';
import { exportSpreadsheet } from '../spreadsheet.js';
import { findUserById, updateUser, setEmailOptOut, validateUserUpdate } from '../users.js';
import { requirePremium } from '../middleware/auth.js';
import { requireFields, parsePositiveFloat } from '../validation.js';

const router = Router();

const exportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.sub ?? ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas exportações. Tente novamente em 10 minutos.' },
});

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
        const { month, type } = req.query;
        res.json(getTransactions(req.user.sub, { month, type }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/transactions
router.post('/transactions', (req, res) => {
    try {
        const userId = req.user.sub;
        const { type, description, amount, category, date } = req.body;
        const check = requireFields(req.body, ['type', 'description', 'amount', 'category']);
        if (!check.ok) return res.status(400).json({ error: check.message });
        if (!['income', 'expense'].includes(type))
            return res.status(400).json({ error: 'type deve ser income ou expense' });
        const val = parsePositiveFloat(amount);
        if (!val) return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addTransaction(userId, { type, description: String(description).trim(), amount: val, category, date }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/transactions/:id
router.delete('/transactions/:id', (req, res) => {
    try {
        const ok = deleteTransaction(req.user.sub, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/transactions/:id
router.put('/transactions/:id', (req, res) => {
    try {
        const { description, amount, category, date } = req.body;
        if (amount !== undefined) {
            const val = parsePositiveFloat(amount);
            if (!val) return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        const tx = updateTransaction(req.user.sub, req.params.id, { description, amount: req.body.amount, category, date });
        tx ? res.json(tx) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/categories/:type
router.get('/categories/:type', (req, res) => {
    try { res.json(getCategories(req.params.type)); }
    catch (e) { res.status(500).json({ error: e.message }); }
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
        const errors = validateUserUpdate({ name, email, password });
        if (errors.length) return res.status(400).json({ error: errors[0] });
        const updated = updateUser(req.user.sub, { name, email, password });
        res.json(updated);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /api/comparison/:month
router.get('/comparison/:month', requirePremium, (req, res) => {
    try {
        const prev = previousMonth(req.params.month);
        res.json(compareMonths(req.user.sub, req.params.month, prev));
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
router.get('/export/:month', exportLimiter, requirePremium, async (req, res) => {
    try {
        const filepath = await exportSpreadsheet(req.user.sub, req.params.month);
        res.download(filepath, `financas_${req.params.month}.xlsx`);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/insights/:month
router.get('/insights/:month', (req, res) => {
    try {
        res.json(buildInsights(req.user.sub, req.params.month));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/health/:month
router.get('/health/:month', (req, res) => {
    try {
        const months = getAllMonths(req.user.sub);
        res.json(buildHealthAnalysis(req.user.sub, req.params.month, months));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/email-optin
router.get('/email-optin', (req, res) => {
    try {
        const user = findUserById(req.user.sub);
        res.json({ emailOptOut: user?.emailOptOut ?? false });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/email-optin
router.patch('/email-optin', (req, res) => {
    try {
        const { optOut } = req.body ?? {};
        const result = setEmailOptOut(req.user.sub, optOut);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
