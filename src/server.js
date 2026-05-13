import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';
import adminRouter from './routes/admin.js';
import { initScheduler } from './automacoes/automacoes_email/scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"],
            workerSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    }
}));
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

// ── Rotas públicas ────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── Rotas protegidas ──────────────────────────────────────────────────────────
app.use('/api', requireAuth);
app.use('/api', transactionsRouter);
app.use('/api/admin', adminRouter);

// ── Fallback SPA ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  💰  Gerenciador Financeiro  →  http://localhost:${PORT}\n`);
    initScheduler();
});
