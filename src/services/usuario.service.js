import { randomBytes } from 'crypto';
import { loadUsers, saveUsers } from '../models/usuario.model.js';

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

/** Valida apenas os campos presentes (para PUT/PATCH parciais). */
export function validateUserUpdate({ name, email, password }) {
    const errors = [];

    if (name !== undefined && name.trim().length < 2)
        errors.push('Nome deve ter pelo menos 2 caracteres');

    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.push('E-mail inválido');

    if (password !== undefined) {
        if (password.length < 8)
            errors.push('Senha deve ter pelo menos 8 caracteres');
        else if (!/[a-zA-Z]/.test(password))
            errors.push('Senha deve conter pelo menos uma letra');
        else if (!/[0-9]/.test(password))
            errors.push('Senha deve conter pelo menos um número');
    }

    return errors;
}

// ── Email opt-out ─────────────────────────────────────────────────────────────

/** Gera (ou retorna o existente) token de cancelamento de emails para um usuário. */
export function getOrCreateUnsubToken(id) {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('Usuário não encontrado');
    if (!user.unsubToken) {
        user.unsubToken = randomBytes(24).toString('hex');
        saveUsers(users);
    }
    return user.unsubToken;
}

/** Marca o usuário como opt-out via token (sem precisar de autenticação). */
export function unsubscribeByToken(token) {
    if (!token) throw new Error('Token inválido');
    const users = loadUsers();
    const user = users.find(u => u.unsubToken === token);
    if (!user) throw new Error('Token não encontrado');
    user.emailOptOut = true;
    saveUsers(users);
    return { name: user.name, email: user.email };
}

/** Permite o usuário reativar o recebimento via painel. */
export function setEmailOptOut(id, optOut) {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('Usuário não encontrado');
    user.emailOptOut = Boolean(optOut);
    saveUsers(users);
    return { id: user.id, emailOptOut: user.emailOptOut };
}
