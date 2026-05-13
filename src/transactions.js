import { loadUserDB, saveUserDB } from './db.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function todayISO() {
    return format(new Date(), 'yyyy-MM-dd');
}

export function monthKey(dateStr) {
    // Returns "YYYY-MM" from a "YYYY-MM-DD" string
    return dateStr.slice(0, 7);
}

export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatMonthLabel(yyyyMM) {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return format(date, 'MMMM yyyy', { locale: ptBR });
}

// ── Transactions (income / expense) ──────────────────────────────────────────

export function addTransaction(userId, { type, description, amount, category, date }) {
    const db = loadUserDB(userId);
    const transaction = {
        id: crypto.randomUUID(),
        type,          // 'income' | 'expense'
        description,
        amount: Number(amount),
        category,
        date: date || todayISO(),
        createdAt: new Date().toISOString()
    };
    db.transactions.push(transaction);
    saveUserDB(userId, db);
    return transaction;
}

export function getTransactions(userId, { month, type } = {}) {
    const db = loadUserDB(userId);
    let list = db.transactions;
    if (month) list = list.filter(t => monthKey(t.date) === month);
    if (type) list = list.filter(t => t.type === type);
    return list.sort((a, b) => a.date.localeCompare(b.date));
}

export function deleteTransaction(userId, id) {
    const db = loadUserDB(userId);
    const before = db.transactions.length;
    db.transactions = db.transactions.filter(t => t.id !== id);
    saveUserDB(userId, db);
    return db.transactions.length < before;
}

export function updateTransaction(userId, id, { description, amount, category, date }) {
    const db = loadUserDB(userId);
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return null;
    if (description !== undefined) tx.description = String(description).trim();
    if (amount !== undefined) tx.amount = Number(amount);
    if (category !== undefined) tx.category = category;
    if (date !== undefined) tx.date = date;
    saveUserDB(userId, db);
    return tx;
}

// ── Bills (contas fixas mensais) ──────────────────────────────────────────────

export function addBill(userId, { description, amount, category, dueDay, active = true }) {
    const db = loadUserDB(userId);
    const bill = {
        id: crypto.randomUUID(),
        description,
        amount: Number(amount),
        category,
        dueDay: Number(dueDay),  // day of month (1-31)
        active,
        createdAt: new Date().toISOString()
    };
    db.bills.push(bill);
    saveUserDB(userId, db);
    return bill;
}

export function getBills(userId, { activeOnly = false, month = null } = {}) {
    const db = loadUserDB(userId);
    let list = db.bills.map(b => {
        if (!month) return { ...b };
        // Support legacy boolean format (active only) and new object format
        const raw = b.monthOverrides?.[month];
        const override = raw !== undefined
            ? (typeof raw === 'object' ? raw : { active: raw })
            : {};
        return { ...b, ...override };
    });
    // Oculta contas marcadas como excluídas no mês selecionado
    if (month) list = list.filter(b => !b.deleted);
    if (activeOnly) list = list.filter(b => b.active);
    return list.sort((a, b) => a.dueDay - b.dueDay);
}

/**
 * toggleBill com suporte a mês específico.
 * - Com month: alterna apenas o override para aquele mês (não afeta outros meses).
 * - Sem month: alterna o estado global `active` (comportamento legado).
 */
export function toggleBill(userId, id, month = null) {
    const db = loadUserDB(userId);
    const bill = db.bills.find(b => b.id === id);
    if (!bill) return false;

    if (month) {
        if (!bill.monthOverrides) bill.monthOverrides = {};
        // Normalize legacy boolean to object
        if (typeof bill.monthOverrides[month] !== 'object') {
            bill.monthOverrides[month] = {};
        }
        const ov = bill.monthOverrides[month];
        const currentActive = 'active' in ov ? ov.active : bill.active;
        if (currentActive === bill.active) {
            ov.active = !bill.active;
        } else {
            delete ov.active;
            if (Object.keys(ov).length === 0) delete bill.monthOverrides[month];
        }
        saveUserDB(userId, db);
        const finalOv = bill.monthOverrides?.[month] || {};
        return { ...bill, ...finalOv };
    }

    // Legacy: toggle global state
    bill.active = !bill.active;
    saveUserDB(userId, db);
    return bill;
}

export function toggleBillPaid(userId, id, month) {
    const db = loadUserDB(userId);
    const bill = db.bills.find(b => b.id === id);
    if (!bill) return null;
    if (!bill.paidMonths) bill.paidMonths = [];
    const idx = bill.paidMonths.indexOf(month);
    if (idx === -1) {
        bill.paidMonths.push(month);
    } else {
        bill.paidMonths.splice(idx, 1);
    }
    saveUserDB(userId, db);
    return bill;
}

/**
 * deleteBill com suporte a mês específico.
 * - Com month: marca `deleted: true` no override daquele mês (oculta só neste mês).
 * - Sem month: remove a conta permanentemente de todos os meses.
 */
export function deleteBill(userId, id, month = null) {
    const db = loadUserDB(userId);
    const bill = db.bills.find(b => b.id === id);
    if (!bill) return false;

    if (month) {
        if (!bill.monthOverrides) bill.monthOverrides = {};
        if (!bill.monthOverrides[month] || typeof bill.monthOverrides[month] !== 'object') {
            bill.monthOverrides[month] = {};
        }
        bill.monthOverrides[month].deleted = true;
        saveUserDB(userId, db);
        return true;
    }

    // Remoção global
    const before = db.bills.length;
    db.bills = db.bills.filter(b => b.id !== id);
    saveUserDB(userId, db);
    return db.bills.length < before;
}

/**
 * updateBill com suporte a mês específico.
 * - Com month: salva as alterações somente no override daquele mês.
 * - Sem month: altera os dados globais da conta (todos os meses).
 */
export function updateBill(userId, id, { description, amount, category, dueDay, month = null }) {
    const db = loadUserDB(userId);
    const bill = db.bills.find(b => b.id === id);
    if (!bill) return null;

    if (month) {
        if (!bill.monthOverrides) bill.monthOverrides = {};
        if (!bill.monthOverrides[month] || typeof bill.monthOverrides[month] !== 'object') {
            bill.monthOverrides[month] = {};
        }
        const ov = bill.monthOverrides[month];
        if (description !== undefined) ov.description = String(description).trim();
        if (amount !== undefined) ov.amount = Number(amount);
        if (category !== undefined) ov.category = category;
        if (dueDay !== undefined) ov.dueDay = Number(dueDay);
        // Remove override if it matches the global values exactly
        if (
            (!('description' in ov) || ov.description === bill.description) &&
            (!('amount' in ov) || ov.amount === bill.amount) &&
            (!('category' in ov) || ov.category === bill.category) &&
            (!('dueDay' in ov) || ov.dueDay === bill.dueDay) &&
            !('active' in ov)
        ) {
            delete bill.monthOverrides[month];
        }
    } else {
        if (description !== undefined) bill.description = String(description).trim();
        if (amount !== undefined) bill.amount = Number(amount);
        if (category !== undefined) bill.category = category;
        if (dueDay !== undefined) bill.dueDay = Number(dueDay);
    }

    saveUserDB(userId, db);
    return bill;
}

// ── Investments (poupança e outros investimentos) ─────────────────────────────

export function addInvestment(userId, { description, amount, category, date }) {
    const db = loadUserDB(userId);
    if (!db.investments) db.investments = [];
    const investment = {
        id: crypto.randomUUID(),
        description,
        amount: Number(amount),
        category,
        date: date || todayISO(),
        createdAt: new Date().toISOString()
    };
    db.investments.push(investment);
    saveUserDB(userId, db);
    return investment;
}

export function getInvestments(userId, { month } = {}) {
    const db = loadUserDB(userId);
    let list = db.investments || [];
    if (month) list = list.filter(i => monthKey(i.date) === month);
    return list.sort((a, b) => b.date.localeCompare(a.date));
}

export function deleteInvestment(userId, id) {
    const db = loadUserDB(userId);
    const before = (db.investments || []).length;
    db.investments = (db.investments || []).filter(i => i.id !== id);
    saveUserDB(userId, db);
    return db.investments.length < before;
}

export function updateInvestment(userId, id, { description, amount, category, date }) {
    const db = loadUserDB(userId);
    const inv = (db.investments || []).find(i => i.id === id);
    if (!inv) return null;
    if (description !== undefined) inv.description = String(description).trim();
    if (amount !== undefined) inv.amount = Number(amount);
    if (category !== undefined) inv.category = category;
    if (date !== undefined) inv.date = date;
    saveUserDB(userId, db);
    return inv;
}

export function getTotalInvested(userId) {
    const db = loadUserDB(userId);
    return (db.investments || []).reduce((s, i) => s + i.amount, 0);
}

// ── Goals ─────────────────────────────────────────────────────────────────────

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

// ── Month query helpers ───────────────────────────────────────────────────────

export function getAllMonths(userId) {
    const db = loadUserDB(userId);
    const months = new Set(db.transactions.map(t => monthKey(t.date)));
    return [...months].sort();
}

export function currentMonth() {
    return format(new Date(), 'yyyy-MM');
}

export function previousMonth(yyyyMM) {
    const [year, month] = yyyyMM.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    return format(d, 'yyyy-MM');
}

