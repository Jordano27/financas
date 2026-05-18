import {
    addGoal, getGoals, deleteGoal, updateGoal,
    addGoalContribution, deleteGoalContribution,
} from '../models/meta.model.js';
import { enviarEmailMetaConcluida } from '../jobs/meta-concluida.job.js';
import { requireFields, parsePositiveFloat } from '../utils/validacao.js';

export function listGoals(req, res) {
    try { res.json(getGoals(req.user.sub)); }
    catch (e) { res.status(500).json({ error: e.message }); }
}

export function createGoal(req, res) {
    try {
        const { description, targetAmount, targetDate, category } = req.body;
        const check = requireFields(req.body, ['description', 'targetAmount', 'targetDate']);
        if (!check.ok) return res.status(400).json({ error: check.message });
        const val = parsePositiveFloat(targetAmount);
        if (!val) return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addGoal(req.user.sub, { description, targetAmount: val, targetDate, category }));
    } catch (e) { res.status(500).json({ error: e.message }); }
}

export function updateGoalHandler(req, res) {
    try {
        const { description, targetAmount, targetDate, category } = req.body;
        if (targetAmount !== undefined) {
            const val = parsePositiveFloat(targetAmount);
            if (!val) return res.status(400).json({ error: 'Valor inválido' });
            req.body.targetAmount = val;
        }
        const goal = updateGoal(req.user.sub, req.params.id, { description, targetAmount: req.body.targetAmount, targetDate, category });
        goal ? res.json(goal) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

export function deleteGoalHandler(req, res) {
    try {
        const ok = deleteGoal(req.user.sub, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

export function addContribution(req, res) {
    try {
        const { amount, date, note } = req.body;
        if (!amount) return res.status(400).json({ error: 'amount obrigatório' });
        const val = parsePositiveFloat(amount);
        if (!val) return res.status(400).json({ error: 'Valor inválido' });
        const goal = addGoalContribution(req.user.sub, req.params.id, { amount: val, date, note });
        if (!goal) return res.status(404).json({ error: 'Não encontrado' });
        if ((goal.savedAmount || 0) >= goal.targetAmount && !goal.completedEmailSent) {
            enviarEmailMetaConcluida(req.user.sub, goal).catch(err =>
                console.error('[MetaConcluida] Erro ao enviar email por evento:', err.message)
            );
        }
        res.json(goal);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

export function deleteContribution(req, res) {
    try {
        const goal = deleteGoalContribution(req.user.sub, req.params.goalId, req.params.contributionId);
        goal ? res.json(goal) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}
