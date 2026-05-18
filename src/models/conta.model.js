import { loadUserDB, saveUserDB } from '../config/database.js';
import { todayISO, monthKey } from '../utils/auxiliares.js';

// ── Contas Fixas (Bills) ──────────────────────────────────────────────────────

export function addBill(userId, { description, amount, category, dueDay, active = true }) {
    const db = loadUserDB(userId);
    const bill = {
        id: crypto.randomUUID(),
        description,
        amount: Number(amount),
        category,
        dueDay: Number(dueDay),
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
        const raw = b.monthOverrides?.[month];
        const override = raw !== undefined
            ? (typeof raw === 'object' ? raw : { active: raw })
            : {};
        return { ...b, ...override };
    });
    if (month) list = list.filter(b => !b.deleted);
    if (activeOnly) list = list.filter(b => b.active);
    return list.sort((a, b) => a.dueDay - b.dueDay);
}

/**
 * toggleBill com suporte a mês específico.
 * - Com month: alterna apenas o override para aquele mês.
 * - Sem month: alterna o estado global `active` (legado).
 */
export function toggleBill(userId, id, month = null) {
    const db = loadUserDB(userId);
    const bill = db.bills.find(b => b.id === id);
    if (!bill) return false;

    if (month) {
        if (!bill.monthOverrides) bill.monthOverrides = {};
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
 * - Com month: marca `deleted: true` no override (oculta só neste mês).
 * - Sem month: remove permanentemente.
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

    const before = db.bills.length;
    db.bills = db.bills.filter(b => b.id !== id);
    saveUserDB(userId, db);
    return db.bills.length < before;
}

/**
 * updateBill com suporte a mês específico.
 * - Com month: salva as alterações somente no override daquele mês.
 * - Sem month: altera os dados globais da conta.
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

// ── Controle de alertas de vencimento (anti-duplicata) ────────────────────────

export function markBillAlert(userId, billId, month, tipo) {
    const db = loadUserDB(userId);
    if (!db.billAlerts) db.billAlerts = {};
    if (!db.billAlerts[billId]) db.billAlerts[billId] = {};
    if (!db.billAlerts[billId][month]) db.billAlerts[billId][month] = {};
    db.billAlerts[billId][month][tipo] = true;
    saveUserDB(userId, db);
}

export function getBillAlerts(userId) {
    const db = loadUserDB(userId);
    return db.billAlerts || {};
}
