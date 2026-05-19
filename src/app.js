import express from 'express';
import cors from 'cors';
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

// ── CORS — permite Expo web (8081), Expo Go e redes locais ───────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, cb) {
        // Requisições sem origin (apps nativos, Postman)
        if (!origin) return cb(null, true);
        // Lista explícita via .env
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        // Qualquer localhost (Expo web, preview)
        if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
        // Rede local (dispositivo físico na mesma rede Wi-Fi)
        if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) return cb(null, true);
        cb(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
    },
    credentials: true,
}));

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
