/**
 * scripts/migrate-investments.mjs
 *
 * Script de execução única que normaliza os dados de investimentos em todos os
 * arquivos JSON de usuários, eliminando campos duplicados legados (amount/date)
 * e garantindo que todos os campos novos estejam presentes.
 *
 * Uso: node scripts/migrate-investments.mjs
 * Faz backup automático de cada arquivo antes de alterar.
 */

import { readFileSync, writeFileSync, copyFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

function migrateInvestment(inv) {
    const initialAmount = inv.initialAmount ?? inv.amount ?? 0;
    const startDate = inv.startDate ?? inv.date ?? inv.createdAt?.slice(0, 10) ?? null;

    return {
        id: inv.id,
        description: inv.description,
        category: inv.category,
        initialAmount,
        currentValue: inv.currentValue ?? initialAmount,
        contributions: inv.contributions ?? [],
        startDate,
        marketType: inv.marketType ?? 'manual',
        marketId: inv.marketId ?? null,
        rateInfo: inv.rateInfo ?? null,
        lastSyncAt: inv.lastSyncAt ?? null,
        createdAt: inv.createdAt,
        // campos legado removidos: amount, date
    };
}

const files = readdirSync(DATA_DIR).filter(f => f.startsWith('financas_') && f.endsWith('.json'));

if (!files.length) {
    console.log('Nenhum arquivo de usuário encontrado em data/');
    process.exit(0);
}

let totalUsers = 0;
let totalInvestments = 0;

for (const file of files) {
    const filePath = join(DATA_DIR, file);
    const raw = readFileSync(filePath, 'utf-8');
    const db = JSON.parse(raw);

    if (!Array.isArray(db.investments) || !db.investments.length) {
        console.log(`[SKIP] ${file} — sem investimentos`);
        continue;
    }

    // Backup antes de alterar
    const backupPath = filePath.replace('.json', '.backup.json');
    copyFileSync(filePath, backupPath);

    const migrated = db.investments.map(migrateInvestment);
    const changed = JSON.stringify(migrated) !== JSON.stringify(db.investments);

    if (!changed) {
        console.log(`[OK]   ${file} — já normalizado, sem alterações`);
        continue;
    }

    db.investments = migrated;
    writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`[MIGR] ${file} — ${migrated.length} investimento(s) normalizado(s). Backup: ${file.replace('.json', '.backup.json')}`);
    totalInvestments += migrated.length;
    totalUsers++;
}

console.log(`\nMigração concluída: ${totalUsers} usuário(s) alterado(s), ${totalInvestments} investimento(s) normalizados.`);
