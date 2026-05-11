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

export function getBills(userId, { activeOnly = false } = {}) {
    const db = loadUserDB(userId);
    let list = db.bills;
    if (activeOnly) list = list.filter(b => b.active);
    return list.sort((a, b) => a.dueDay - b.dueDay);
}

export function toggleBill(userId, id) {
    const db = loadUserDB(userId);
    const bill = db.bills.find(b => b.id === id);
    if (!bill) return false;
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

export function deleteBill(userId, id) {
    const db = loadUserDB(userId);
    const before = db.bills.length;
    db.bills = db.bills.filter(b => b.id !== id);
    saveUserDB(userId, db);
    return db.bills.length < before;
}

export function updateBill(userId, id, { description, amount, category, dueDay }) {
    const db = loadUserDB(userId);
    const bill = db.bills.find(b => b.id === id);
    if (!bill) return null;
    if (description !== undefined) bill.description = String(description).trim();
    if (amount !== undefined) bill.amount = Number(amount);
    if (category !== undefined) bill.category = category;
    if (dueDay !== undefined) bill.dueDay = Number(dueDay);
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

