import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { requireAuth } from './middlewares/auth.middleware.js';
import authRouter from './routes/autenticacao.js';
import transactionsRouter from './routes/transacoes.js';
import billsRouter from './routes/contas.js';
import investmentsRouter from './routes/investimentos.js';
import goalsRouter from './routes/metas.js';
import adminRouter from './routes/administracao.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

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
app.use('/api', billsRouter);
app.use('/api', investmentsRouter);
app.use('/api', goalsRouter);
app.use('/api/admin', adminRouter);

// ── Fallback SPA ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

export default app;
