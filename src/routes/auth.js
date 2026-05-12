import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES } from '../config.js';
import { findUserByEmail, registerUser, verifyPassword, validateUserInput, unsubscribeByToken } from '../users.js';

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

// GET /api/auth/unsubscribe?token=xxx  (link do email, sem autenticação)
router.get('/unsubscribe', (req, res) => {
    const { token } = req.query;
    try {
        const user = unsubscribeByToken(token);
        res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Cancelado</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f3f4f6}
.card{background:#fff;border-radius:12px;padding:40px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#16a34a}p{color:#374151}</style></head>
<body><div class="card"><h1>✅ Pronto!</h1>
<p>O email <strong>${user.email}</strong> foi removido da lista de relatórios mensais.</p>
<p>Você pode reativar o recebimento a qualquer momento nas configurações do seu perfil.</p>
<a href="/" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none">Ir para o app</a>
</div></body></html>`);
    } catch {
        res.status(400).send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f3f4f6}
.card{background:#fff;border-radius:12px;padding:40px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#dc2626}</style></head>
<body><div class="card"><h1>Link inválido</h1><p>Este link de cancelamento é inválido ou já foi utilizado.</p></div></body></html>`);
    }
});

export default router;
