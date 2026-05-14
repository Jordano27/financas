import { Router } from 'express';
import {
    addBill, getBills, deleteBill, toggleBill, toggleBillPaid, updateBill,
} from '../bills.js';
import { requireFields, parsePositiveFloat } from '../validation.js';

const router = Router();

// GET /api/bills
router.get('/bills', (req, res) => {
    try {
        const userId = req.user.sub;
        const month = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
            ? req.query.month : null;
        res.json(getBills(userId, { activeOnly: false, month }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/bills
router.post('/bills', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, dueDay } = req.body;
        const check = requireFields(req.body, ['description', 'amount', 'category', 'dueDay']);
        if (!check.ok) return res.status(400).json({ error: check.message });
        const val = parsePositiveFloat(amount);
        if (!val) return res.status(400).json({ error: 'Valor inválido' });
        const day = parseInt(dueDay);
        if (isNaN(day) || day < 1 || day > 31) return res.status(400).json({ error: 'Dia inválido (1-31)' });
        res.status(201).json(addBill(userId, { description: String(description).trim(), amount: val, category, dueDay: day }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/bills/:id/toggle
router.patch('/bills/:id/toggle', (req, res) => {
    try {
        const userId = req.user.sub;
        const month = typeof req.body?.month === 'string' && /^\d{4}-\d{2}$/.test(req.body.month)
            ? req.body.month : null;
        const bill = toggleBill(userId, req.params.id, month);
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

// DELETE /api/bills/:id  (?month=YYYY-MM para excluir só naquele mês)
router.delete('/bills/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const month = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
            ? req.query.month : null;
        const ok = deleteBill(userId, req.params.id, month);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/bills/:id
router.put('/bills/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, dueDay } = req.body;
        const month = typeof req.body.month === 'string' && /^\d{4}-\d{2}$/.test(req.body.month)
            ? req.body.month : null;
        if (amount !== undefined) {
            const val = parsePositiveFloat(amount);
            if (!val) return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        if (dueDay !== undefined) {
            const day = parseInt(dueDay);
            if (isNaN(day) || day < 1 || day > 31)
                return res.status(400).json({ error: 'Dia inválido (1-31)' });
            req.body.dueDay = day;
        }
        const bill = updateBill(userId, req.params.id, { description, amount: req.body.amount, category, dueDay: req.body.dueDay, month });
        bill ? res.json(bill) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
