import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { listUsers, registerUser, updateUser, setUserActive, setUserPlan, validateUserInput } from '../users.js';
import { getAllMonths, currentMonth } from '../transactions.js';
import { buildMonthStats, buildAverages } from '../reports.js';

const router = Router();

// Todos os endpoints deste router exigem perfil admin
router.use(requireAdmin);

// GET /api/admin/users
router.get('/users', (req, res) => {
    try { res.json(listUsers()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/users
router.post('/users', (req, res) => {
    const { name, email, password } = req.body || {};
    const errors = validateUserInput({ name, email, password });
    if (errors.length) return res.status(400).json({ error: errors[0] });
    try {
        const user = registerUser({ name, email, password, role: 'user' });
        res.status(201).json(user);
    } catch (e) { res.status(409).json({ error: e.message }); }
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req, res) => {
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
    try {
        res.json(updateUser(req.params.id, { name, email, password }));
    } catch (e) { res.status(404).json({ error: e.message }); }
});

// PATCH /api/admin/users/:id/toggle
router.patch('/users/:id/toggle', (req, res) => {
    const { active } = req.body || {};
    if (typeof active !== 'boolean')
        return res.status(400).json({ error: 'Campo "active" (boolean) obrigatório' });
    if (req.params.id === req.user.sub)
        return res.status(400).json({ error: 'Não é possível desativar sua própria conta' });
    try {
        res.json(setUserActive(req.params.id, active));
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// PATCH /api/admin/users/:id/plan
router.patch('/users/:id/plan', (req, res) => {
    const { plan } = req.body || {};
    if (!['free', 'premium'].includes(plan))
        return res.status(400).json({ error: 'Plano inválido. Use "free" ou "premium"' });
    try {
        res.json(setUserPlan(req.params.id, plan));
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /api/admin/metrics
router.get('/metrics', (req, res) => {
    try {
        const users = listUsers().filter(u => u.role !== 'admin');
        const metrics = users.map(u => {
            const months = getAllMonths(u.id);
            const current = currentMonth();
            const stats = buildMonthStats(u.id, current);
            const avgs = buildAverages(u.id, months) || {};
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                active: u.active,
                plan: u.plan || 'free',
                totalMonths: months.length,
                currentMonth: {
                    income: stats.totalIncome,
                    outflow: stats.totalOutflow,
                    balance: stats.balance,
                    savingsRate: stats.savingsRate
                },
                averages: avgs
            };
        });
        res.json(metrics);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
