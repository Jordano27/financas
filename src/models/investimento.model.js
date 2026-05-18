import { loadUserDB, saveUserDB } from '../config/database.js';
import { todayISO } from '../utils/auxiliares.js';

// ── Migração defensiva de entradas legadas ────────────────────────────────────

export function migrateInvestment(inv) {
    const initialAmount = inv.initialAmount ?? inv.amount ?? 0;
    const startDate = inv.startDate ?? inv.date ?? inv.createdAt?.slice(0, 10) ?? null;
    const { amount: _a, date: _d, ...rest } = inv;
    return {
        ...rest,
        initialAmount,
        currentValue: inv.currentValue ?? initialAmount,
        contributions: inv.contributions ?? [],
        startDate,
        marketType: inv.marketType ?? 'manual',
        marketId: inv.marketId ?? null,
        rateInfo: inv.rateInfo ?? null,
        lastSyncAt: inv.lastSyncAt ?? null,
    };
}

// ── CRUD de Investimentos ─────────────────────────────────────────────────────

export function addInvestment(userId, { description, category, initialAmount, startDate, marketType = 'manual', marketId = null, rateInfo = null }) {
    const db = loadUserDB(userId);
    if (!db.investments) db.investments = [];
    const amt = Number(initialAmount);
    const investment = {
        id: crypto.randomUUID(),
        description: String(description).trim(),
        category,
        initialAmount: amt,
        currentValue: amt,
        contributions: [],
        startDate: startDate || todayISO(),
        marketType,
        marketId,
        rateInfo,
        lastSyncAt: null,
        createdAt: new Date().toISOString(),
    };
    db.investments.push(investment);
    saveUserDB(userId, db);
    return investment;
}

export function getInvestments(userId, { month } = {}) {
    const db = loadUserDB(userId);
    let list = (db.investments || []).map(migrateInvestment);
    // Filtra por mês: inclui apenas investimentos cujo startDate <= último dia do mês
    if (month) {
        list = list.filter(i => {
            const start = i.startDate || i.date;
            return start ? start.slice(0, 7) <= month : true;
        });
    }
    return list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
}

export function deleteInvestment(userId, id) {
    const db = loadUserDB(userId);
    const before = (db.investments || []).length;
    db.investments = (db.investments || []).filter(i => i.id !== id);
    saveUserDB(userId, db);
    return db.investments.length < before;
}

export function updateInvestment(userId, id, { description, category, initialAmount, startDate, marketType, marketId, rateInfo }) {
    const db = loadUserDB(userId);
    const inv = (db.investments || []).find(i => i.id === id);
    if (!inv) return null;
    if (description !== undefined) inv.description = String(description).trim();
    if (category !== undefined) inv.category = category;
    if (initialAmount !== undefined) { inv.initialAmount = Number(initialAmount); }
    if (startDate !== undefined) { inv.startDate = startDate; }
    if (marketType !== undefined) inv.marketType = marketType;
    if (marketId !== undefined) inv.marketId = marketId;
    if (rateInfo !== undefined) inv.rateInfo = rateInfo;
    saveUserDB(userId, db);
    return migrateInvestment(inv);
}

export function updateInvestmentCurrentValue(userId, id, currentValue, lastSyncAt = null) {
    const db = loadUserDB(userId);
    const inv = (db.investments || []).find(i => i.id === id);
    if (!inv) return null;
    inv.currentValue = Number(currentValue);
    inv.lastSyncAt = lastSyncAt || new Date().toISOString();
    saveUserDB(userId, db);
    return migrateInvestment(inv);
}

export function addInvestmentContribution(userId, id, { amount, date, note }) {
    const db = loadUserDB(userId);
    const inv = (db.investments || []).find(i => i.id === id);
    if (!inv) return null;
    if (!inv.contributions) inv.contributions = [];
    const contribution = {
        id: crypto.randomUUID(),
        amount: Number(amount),
        date: date || todayISO(),
        note: note || '',
        createdAt: new Date().toISOString(),
    };
    inv.contributions.push(contribution);
    inv.initialAmount = (inv.initialAmount || 0) + contribution.amount;
    saveUserDB(userId, db);
    return migrateInvestment(inv);
}

export function deleteInvestmentContribution(userId, invId, contributionId) {
    const db = loadUserDB(userId);
    const inv = (db.investments || []).find(i => i.id === invId);
    if (!inv || !inv.contributions) return null;
    const contrib = inv.contributions.find(c => c.id === contributionId);
    if (!contrib) return null;
    inv.contributions = inv.contributions.filter(c => c.id !== contributionId);
    inv.initialAmount = Math.max(0, (inv.initialAmount || 0) - contrib.amount);
    saveUserDB(userId, db);
    return migrateInvestment(inv);
}

export function getTotalInvested(userId) {
    const db = loadUserDB(userId);
    return (db.investments || []).reduce((s, i) => s + (i.initialAmount ?? i.amount ?? 0), 0);
}
