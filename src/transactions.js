/**
 * transactions.js — ponto de re-exportacao unificado (compatibilidade).
 *
 * A logica foi dividida em modulos de dominio:
 *   src/helpers.js      — helpers de data/moeda
 *   src/bills.js        — contas fixas
 *   src/investments.js  — carteira de investimentos
 *   src/goals.js        — metas financeiras
 *
 * Este arquivo mantem todos os exports originais para nao quebrar importacoes existentes.
 */
import { loadUserDB, saveUserDB } from './db.js';
import { todayISO, monthKey } from './helpers.js';

export {
    todayISO, monthKey, formatCurrency, formatMonthLabel,
    currentMonth, previousMonth,
} from './helpers.js';

// ── Transactions (income / expense) ──────────────────────────────────────────

export function addTransaction(userId, { type, description, amount, category, date }) {
    const db = loadUserDB(userId);
    const transaction = {
        id: crypto.randomUUID(),
        type,
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

// ── Month query helpers ───────────────────────────────────────────────────────

export function getAllMonths(userId) {
    const db = loadUserDB(userId);
    const months = new Set(db.transactions.map(t => monthKey(t.date)));
    return [...months].sort();
}

// ── Re-exports dos modulos de dominio ─────────────────────────────────────────
export {
    addBill, getBills, deleteBill, toggleBill, toggleBillPaid, updateBill,
    markBillAlert, getBillAlerts,
} from './bills.js';

export {
    addInvestment, getInvestments, deleteInvestment, updateInvestment,
    updateInvestmentCurrentValue, addInvestmentContribution,
    deleteInvestmentContribution, getTotalInvested, migrateInvestment,
} from './investments.js';

export {
    addGoal, getGoals, deleteGoal, updateGoal,
    addGoalContribution, deleteGoalContribution, markGoalCompletedEmailSent,
} from './goals.js';
