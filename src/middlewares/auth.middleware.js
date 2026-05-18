import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/app.js';
import { isBlacklisted } from '../utils/tokenBlacklist.js';

export function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.jti && isBlacklisted(payload.jti)) {
            return res.status(401).json({ error: 'Token revogado. Faça login novamente.' });
        }
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
}

export function requirePremium(req, res, next) {
    if (req.user?.role === 'admin' || req.user?.plan === 'premium') return next();
    return res.status(403).json({ error: 'Funcionalidade disponível apenas no plano Premium' });
}
