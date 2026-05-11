import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// ── Categorias globais (compartilhadas) ───────────────────────────────────────
const CATEGORIES_FILE = join(DATA_DIR, 'financas.json');

const DEFAULT_CATEGORIES = {
    income: ['Salário', 'Freelance', 'Investimentos', 'Aluguel Recebido', 'Outros'],
    expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Outros'],
    bill: ['Água', 'Luz', 'Internet', 'Telefone', 'Aluguel', 'Condomínio', 'Streaming', 'Cartão de Crédito', 'Academia', 'Seguro', 'Outros'],
    investment: ['Poupança', 'CDB', 'LCI/LCA', 'Tesouro Direto', 'Ações', 'Fundos de Investimento', 'Criptomoedas', 'Outros']
};

// ── Banco de dados por usuário ────────────────────────────────────────────────
const DEFAULT_USER_DB = {
    transactions: [],
    bills: [],
    investments: [],
    goals: []
};

function ensureDataDir() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function userDbFile(userId) {
    return join(DATA_DIR, `financas_${userId}.json`);
}

export function loadUserDB(userId) {
    ensureDataDir();
    const file = userDbFile(userId);
    if (!existsSync(file)) {
        saveUserDB(userId, structuredClone(DEFAULT_USER_DB));
        return structuredClone(DEFAULT_USER_DB);
    }
    try {
        const raw = readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
        return JSON.parse(raw);
    } catch {
        return structuredClone(DEFAULT_USER_DB);
    }
}

export function saveUserDB(userId, data) {
    ensureDataDir();
    writeFileSync(userDbFile(userId), JSON.stringify(data, null, 2), 'utf-8');
}

export function getCategories(type) {
    ensureDataDir();
    try {
        if (existsSync(CATEGORIES_FILE)) {
            const raw = JSON.parse(readFileSync(CATEGORIES_FILE, 'utf-8'));
            const cats = raw.categories || raw;
            if (cats[type]) return cats[type];
        }
    } catch { /* usa padrão */ }
    return DEFAULT_CATEGORIES[type] || [];
}

