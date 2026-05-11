import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES } from '../config.js';
import { findUserByEmail, registerUser, verifyPassword, validateUserInput } from '../users.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }
    const user = findUserByEmail(email);
    if (!user || !verifyPassword(user, password)) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }
    if (user.active === false) {
        return res.status(403).json({ error: 'Sua conta está desativada. Entre em contato com o administrador.' });
    }
    const role = user.role || 'user';
    const plan = user.plan || 'free';
    const token = jwt.sign(
        { sub: user.id, name: user.name, email: user.email, role, plan },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, expiresIn: JWT_EXPIRES, name: user.name, role, plan });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { name, email, password } = req.body || {};
    const errors = validateUserInput({ name, email, password });
    if (errors.length) {
        return res.status(400).json({ error: errors[0] });
    }
    try {
        const user = registerUser({ name, email, password });
        res.status(201).json(user);
    } catch (e) {
        res.status(409).json({ error: e.message });
    }
});

export default router;
