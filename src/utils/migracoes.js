/**
 * src/utils/migrations.js
 *
 * Migrações de dados executadas automaticamente na inicialização do servidor.
 * Cada migração é idempotente: verifica se há necessidade antes de alterar.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

// ── Migração 001: Campos legados em investimentos ─────────────────────────────
// Normaliza `amount` → `initialAmount` e `date` → `startDate`, removendo
// os campos antigos do disco para que o modelo não precise de código defensivo.

function normalizeInvestment(inv) {
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

function migrateInvestmentFields() {
    if (!existsSync(DATA_DIR)) return;

    const files = readdirSync(DATA_DIR).filter(
        f => f.startsWith('financas_') && f.endsWith('.json') && !f.endsWith('.backup.json')
    );

    for (const file of files) {
        const filePath = join(DATA_DIR, file);
        try {
            const db = JSON.parse(readFileSync(filePath, 'utf-8'));
            if (!Array.isArray(db.investments) || !db.investments.length) continue;

            const needsMigration = db.investments.some(i => 'amount' in i || 'date' in i);
            if (!needsMigration) continue;

            db.investments = db.investments.map(normalizeInvestment);
            writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');
            console.log(`[migration] ${file}: campos legados de investimentos removidos`);
        } catch (err) {
            console.error(`[migration] falha ao processar ${file}:`, err.message);
        }
    }
}

// ── Ponto de entrada ──────────────────────────────────────────────────────────

export function runMigrations() {
    migrateInvestmentFields();
}
