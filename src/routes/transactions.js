import { Router } from 'express';
import { getCategories } from '../db.js';
import {
    addTransaction, getTransactions, deleteTransaction,
    addBill, getBills, deleteBill, toggleBill,
    getAllMonths, currentMonth, previousMonth
} from '../transactions.js';
import { buildMonthStats, compareMonths, buildAverages, financialHealth } from '../reports.js';
import { exportSpreadsheet } from '../spreadsheet.js';

const router = Router();

// GET /api/stats/:month
router.get('/stats/:month', (req, res) => {
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
        const months = getAllMonths(userId);
        const current = currentMonth();
        if (!months.includes(current)) months.push(current);
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

// DELETE /api/bills/:id
router.delete('/bills/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const ok = deleteBill(userId, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/categories/:type
router.get('/categories/:type', (req, res) => {
    try { res.json(getCategories(req.params.type)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/comparison/:month
router.get('/comparison/:month', (req, res) => {
    try {
        const userId = req.user.sub;
        const prev = previousMonth(req.params.month);
        res.json(compareMonths(userId, req.params.month, prev));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/averages
router.get('/averages', (req, res) => {
    try {
        const userId = req.user.sub;
        res.json(buildAverages(userId, getAllMonths(userId)) || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/:month
router.get('/export/:month', async (req, res) => {
    try {
        const userId = req.user.sub;
        const filepath = await exportSpreadsheet(userId, req.params.month);
        res.download(filepath, `financas_${req.params.month}.xlsx`);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
