import { listUsers, registerUser, updateUser as updateUserModel, setUserActive, setUserPlan as setUserPlanModel } from '../models/usuario.model.js';
import { validateUserInput, validateUserUpdate } from '../services/usuario.service.js';
import { getAllMonths, currentMonth } from '../models/transacao.model.js';
import { buildMonthStats, buildAverages } from '../services/relatorio.service.js';

export function getUsers(req, res) {
    try { res.json(listUsers()); }
    catch (e) { res.status(500).json({ error: e.message }); }
}

export function createUser(req, res) {
    const { name, email, password } = req.body || {};
    const errors = validateUserInput({ name, email, password });
    if (errors.length) return res.status(400).json({ error: errors[0] });
    try {
        const user = registerUser({ name, email, password, role: 'user' });
        res.status(201).json(user);
    } catch (e) { res.status(409).json({ error: e.message }); }
}

export function updateUser(req, res) {
    const { name, email, password } = req.body || {};
    const errors = validateUserUpdate({ name, email, password });
    if (errors.length) return res.status(400).json({ error: errors[0] });
    try {
        res.json(updateUserModel(req.params.id, { name, email, password }));
    } catch (e) { res.status(404).json({ error: e.message }); }
}

export function toggleUser(req, res) {
    const { active } = req.body || {};
    if (typeof active !== 'boolean')
        return res.status(400).json({ error: 'Campo "active" (boolean) obrigatório' });
    if (req.params.id === req.user.sub)
        return res.status(400).json({ error: 'Não é possível desativar sua própria conta' });
    try {
        res.json(setUserActive(req.params.id, active));
    } catch (e) { res.status(400).json({ error: e.message }); }
}

export function setPlan(req, res) {
    const { plan } = req.body || {};
    if (!['free', 'premium'].includes(plan))
        return res.status(400).json({ error: 'Plano inválido. Use "free" ou "premium"' });
    try {
        res.json(setUserPlanModel(req.params.id, plan));
    } catch (e) { res.status(400).json({ error: e.message }); }
}

export function getMetrics(req, res) {
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
}
