import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_FILE = join(DATA_DIR, 'usuarios.json');

function ensureDataDir() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers() {
    ensureDataDir();
    if (!existsSync(USERS_FILE)) {
        saveUsers([]);
        return [];
    }
    try {
        const raw = readFileSync(USERS_FILE, 'utf-8').replace(/^\uFEFF/, '');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveUsers(users) {
    ensureDataDir();
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// ── Validações ────────────────────────────────────────────────────────────────

export function validateUserInput({ name, email, password }) {
    const errors = [];

    if (!name || name.trim().length < 2)
        errors.push('Nome deve ter pelo menos 2 caracteres');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.push('E-mail inválido');

    if (!password || password.length < 8)
        errors.push('Senha deve ter pelo menos 8 caracteres');
    else if (!/[a-zA-Z]/.test(password))
        errors.push('Senha deve conter pelo menos uma letra');
    else if (!/[0-9]/.test(password))
        errors.push('Senha deve conter pelo menos um número');

    return errors;
}

// ── CRUD de usuários ──────────────────────────────────────────────────────────

export function findUserByEmail(email) {
    return loadUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
}

export function findUserById(id) {
    return loadUsers().find(u => u.id === id);
}

export function listUsers() {
    return loadUsers().map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        plan: u.plan || 'free',
        active: u.active !== false,
        createdAt: u.createdAt
    }));
}

export function registerUser({ name, email, password, role = 'user' }) {
    const users = loadUsers();

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
        throw new Error('E-mail já cadastrado');
    }

    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');

    const user = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: hash,
        salt,
        role,
        plan: 'free',
        active: true,
        createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    return { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan };
}

export function updateUser(id, { name, email, password }) {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado');

    if (email) {
        const dup = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.id !== id);
        if (dup) throw new Error('E-mail já em uso por outro usuário');
        users[idx].email = email.toLowerCase().trim();
    }
    if (name) users[idx].name = name.trim();
    if (password) {
        const salt = randomBytes(16).toString('hex');
        users[idx].passwordHash = scryptSync(password, salt, 64).toString('hex');
        users[idx].salt = salt;
    }

    saveUsers(users);
    return { id: users[idx].id, name: users[idx].name, email: users[idx].email, role: users[idx].role, active: users[idx].active };
}

export function setUserActive(id, active) {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('Usuário não encontrado');
    if (user.role === 'admin') throw new Error('Não é possível desativar um administrador');
    user.active = active;
    saveUsers(users);
    return { id: user.id, name: user.name, email: user.email, active: user.active };
}

export function setUserPlan(id, plan) {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('Usuário não encontrado');
    if (user.role === 'admin') throw new Error('Não é possível alterar o plano de um administrador');
    user.plan = plan === 'premium' ? 'premium' : 'free';
    saveUsers(users);
    return { id: user.id, name: user.name, email: user.email, plan: user.plan };
}

export function verifyPassword(user, password) {
    try {
        const hash = scryptSync(password, user.salt, 64);
        const stored = Buffer.from(user.passwordHash, 'hex');
        return timingSafeEqual(hash, stored);
    } catch {
        return false;
    }
}

