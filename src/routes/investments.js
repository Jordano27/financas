import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import {
    addInvestment, getInvestments, deleteInvestment, updateInvestment,
    getTotalInvested, addInvestmentContribution, deleteInvestmentContribution,
    updateInvestmentCurrentValue,
} from '../investments.js';
import { syncInvestmentsForUser } from '../automacoes/market-sync.js';
import { requireFields, parsePositiveFloat } from '../validation.js';

const router = Router();

const syncLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.sub ?? ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas sincronizações. Tente novamente em 10 minutos.' },
});

// Cache em memória de 1 hora para não sobrecarregar APIs externas
const MARKET_OPTIONS_CACHE_TTL_MS = 60 * 60 * 1000;
const _marketOptionsCache = {};

// GET /api/investments
router.get('/investments', (req, res) => {
    try {
        res.json(getInvestments(req.user.sub));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/investments/total
router.get('/investments/total', (req, res) => {
    try {
        res.json({ total: getTotalInvested(req.user.sub) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/investments/market-options?type=stock|crypto|tesouro
router.get('/investments/market-options', async (req, res) => {
    const { type } = req.query;
    if (!['stock', 'crypto', 'tesouro'].includes(type))
        return res.status(400).json({ error: 'Tipo inválido. Use: stock, crypto ou tesouro' });

    const now = Date.now();
    if (_marketOptionsCache[type] && (now - _marketOptionsCache[type].ts) < MARKET_OPTIONS_CACHE_TTL_MS)
        return res.json(_marketOptionsCache[type].data);

    try {
        let data;
        if (type === 'stock') {
            const r = await fetch('https://brapi.dev/api/available');
            const j = await r.json();
            data = (j.stocks || []).map(t => ({ id: t, label: t }));
        } else if (type === 'crypto') {
            const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&order=market_cap_desc&per_page=100&page=1');
            const j = await r.json();
            data = j.map(c => ({ id: c.id, label: `${c.name} (${c.symbol.toUpperCase()})` }));
        } else if (type === 'tesouro') {
            const r = await fetch('https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/component/app/rates/json/index.json');
            const j = await r.json();
            const bonds = j?.response?.TrsrBdTradgList || [];
            data = bonds.map(b => ({ id: b.TrsrBd?.nm, label: b.TrsrBd?.nm })).filter(b => b.id);
        }
        _marketOptionsCache[type] = { ts: now, data };
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: `Erro ao buscar opções de mercado: ${e.message}` });
    }
});

// POST /api/investments/sync
router.post('/investments/sync', syncLimiter, async (req, res) => {
    try {
        const results = await syncInvestmentsForUser(req.user.sub);
        res.json({ ok: true, results });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/investments
router.post('/investments', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, category, initialAmount, startDate, marketType, marketId, rateInfo } = req.body;
        const check = requireFields(req.body, ['description', 'initialAmount', 'category']);
        if (!check.ok) return res.status(400).json({ error: check.message });
        if (marketType && marketType !== 'manual' && req.user.plan !== 'premium' && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Cotações automáticas disponíveis apenas no plano Premium.' });
        const val = parsePositiveFloat(initialAmount);
        if (!val) return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addInvestment(userId, {
            description: String(description).trim(),
            category, initialAmount: val, startDate,
            marketType: marketType || 'manual',
            marketId: marketId || null,
            rateInfo: rateInfo || null,
        }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/investments/:id
router.put('/investments/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, category, initialAmount, startDate, marketType, marketId, rateInfo } = req.body;
        if (marketType && marketType !== 'manual' && req.user.plan !== 'premium' && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Cotações automáticas disponíveis apenas no plano Premium.' });
        if (initialAmount !== undefined) {
            const val = parsePositiveFloat(initialAmount);
            if (!val) return res.status(400).json({ error: 'Valor inválido' });
            req.body.initialAmount = val;
        }
        const inv = updateInvestment(userId, req.params.id, {
            description, category, initialAmount: req.body.initialAmount,
            startDate, marketType, marketId, rateInfo,
        });
        inv ? res.json(inv) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/investments/:id
router.delete('/investments/:id', (req, res) => {
    try {
        const ok = deleteInvestment(req.user.sub, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/investments/:id/contributions
router.post('/investments/:id/contributions', (req, res) => {
    try {
        const { amount, date, note } = req.body;
        if (!amount) return res.status(400).json({ error: 'amount obrigatório' });
        const val = parsePositiveFloat(amount);
        if (!val) return res.status(400).json({ error: 'Valor inválido' });
        const inv = addInvestmentContribution(req.user.sub, req.params.id, { amount: val, date, note });
        inv ? res.json(inv) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/investments/:id/contributions/:contribId
router.delete('/investments/:id/contributions/:contribId', (req, res) => {
    try {
        const inv = deleteInvestmentContribution(req.user.sub, req.params.id, req.params.contribId);
        inv ? res.json(inv) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/investments/:id/value  — atualiza valor atual manualmente
router.patch('/investments/:id/value', (req, res) => {
    try {
        const { currentValue } = req.body;
        if (currentValue == null) return res.status(400).json({ error: 'currentValue obrigatório' });
        const val = parseFloat(String(currentValue).replace(',', '.'));
        if (isNaN(val) || val < 0) return res.status(400).json({ error: 'Valor inválido' });
        const inv = updateInvestmentCurrentValue(req.user.sub, req.params.id, val);
        inv ? res.json(inv) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
