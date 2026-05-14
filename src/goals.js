import { loadUserDB, saveUserDB } from './db.js';
import { todayISO } from './helpers.js';
import { format } from 'date-fns';

// ── Metas (Goals) ─────────────────────────────────────────────────────────────

export function addGoal(userId, { description, targetAmount, targetDate, category }) {
    const db = loadUserDB(userId);
    if (!db.goals) db.goals = [];
    const goal = {
        id: crypto.randomUUID(),
        description: String(description).trim(),
        targetAmount: Number(targetAmount),
        targetDate,
        category: category || 'Geral',
        savedAmount: 0,
        contributions: [],
        createdAt: new Date().toISOString()
    };
    db.goals.push(goal);
    saveUserDB(userId, db);
    return goal;
}

export function getGoals(userId) {
    const db = loadUserDB(userId);
    return (db.goals || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function deleteGoal(userId, id) {
    const db = loadUserDB(userId);
    const idx = (db.goals || []).findIndex(g => g.id === id);
    if (idx === -1) return false;
    db.goals.splice(idx, 1);
    saveUserDB(userId, db);
    return true;
}

export function updateGoal(userId, id, { description, targetAmount, targetDate, category }) {
    const db = loadUserDB(userId);
    const goal = (db.goals || []).find(g => g.id === id);
    if (!goal) return null;
    if (description !== undefined) goal.description = String(description).trim();
    if (targetAmount !== undefined) goal.targetAmount = Number(targetAmount);
    if (targetDate !== undefined) goal.targetDate = targetDate;
    if (category !== undefined) goal.category = category;
    saveUserDB(userId, db);
    return goal;
}

export function addGoalContribution(userId, id, { amount, date, note }) {
    const db = loadUserDB(userId);
    const goal = (db.goals || []).find(g => g.id === id);
    if (!goal) return null;
    const contribution = {
        id: crypto.randomUUID(),
        amount: Number(amount),
        date: date || format(new Date(), 'yyyy-MM-dd'),
        note: note || '',
        createdAt: new Date().toISOString()
    };
    if (!goal.contributions) goal.contributions = [];
    goal.contributions.push(contribution);
    goal.savedAmount = goal.contributions.reduce((s, c) => s + c.amount, 0);
    saveUserDB(userId, db);
    return goal;
}

export function deleteGoalContribution(userId, goalId, contributionId) {
    const db = loadUserDB(userId);
    const goal = (db.goals || []).find(g => g.id === goalId);
    if (!goal || !goal.contributions) return null;
    goal.contributions = goal.contributions.filter(c => c.id !== contributionId);
    goal.savedAmount = goal.contributions.reduce((s, c) => s + c.amount, 0);
    saveUserDB(userId, db);
    return goal;
}

/** Marca a meta como "email de conclusão enviado" para não enviar duplicata. */
export function markGoalCompletedEmailSent(userId, goalId) {
    const db = loadUserDB(userId);
    const goal = (db.goals || []).find(g => g.id === goalId);
    if (!goal) return false;
    goal.completedEmailSent = true;
    goal.completedAt = goal.completedAt || new Date().toISOString();
    saveUserDB(userId, db);
    return true;
}
