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

export function deleteBill(userId, id) {
    const db = loadUserDB(userId);
    const before = db.bills.length;
    db.bills = db.bills.filter(b => b.id !== id);
    saveUserDB(userId, db);
    return db.bills.length < before;
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

