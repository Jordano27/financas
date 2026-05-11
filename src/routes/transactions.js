import { Router } from 'express';
import { getCategories } from '../db.js';
import {
    addTransaction, getTransactions, deleteTransaction, updateTransaction,
    addBill, getBills, deleteBill, toggleBill, toggleBillPaid, updateBill,
    addInvestment, getInvestments, deleteInvestment, updateInvestment, getTotalInvested,
    addGoal, getGoals, deleteGoal, updateGoal, addGoalContribution, deleteGoalContribution,
    getAllMonths, currentMonth, previousMonth
} from '../transactions.js';
import { buildMonthStats, compareMonths, buildAverages, financialHealth, buildHealthAnalysis } from '../reports.js';
import { exportSpreadsheet } from '../spreadsheet.js';
import { findUserById, updateUser } from '../users.js';
import { requirePremium } from '../middleware/auth.js';

const router = Router();

// GET /api/stats/:month
router.get('/stats/:month', requirePremium, (req, res) => {
    try {
        const userId = req.user.sub;
        const stats = buildMonthStats(userId, req.params.month);
        const health = financialHealth(stats);
        res.json({ ...stats, health });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/months
router.get('/months', (req, res) => {
    try {
        const userId = req.user.sub;
        const existing = getAllMonths(userId);
        const current = currentMonth();

        // Generate a continuous range from the earliest month to today
        const earliest = existing.length ? existing[0] : current;
        const months = [];
        let [y, m] = earliest.split('-').map(Number);
        const [cy, cm] = current.split('-').map(Number);
        while (y < cy || (y === cy && m <= cm)) {
            months.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
        }
        res.json(months.sort().reverse());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/transactions
router.get('/transactions', (req, res) => {
    try {
        const userId = req.user.sub;
        const { month, type } = req.query;
        res.json(getTransactions(userId, { month, type }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/transactions
router.post('/transactions', (req, res) => {
    try {
        const userId = req.user.sub;
        const { type, description, amount, category, date } = req.body;
        if (!type || !description || !amount || !category)
            return res.status(400).json({ error: 'Campos obrigatórios: type, description, amount, category' });
        if (!['income', 'expense'].includes(type))
            return res.status(400).json({ error: 'type deve ser income ou expense' });
        const val = parseFloat(String(amount).replace(',', '.'));
        if (isNaN(val) || val <= 0)
            return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addTransaction(userId, { type, description: String(description).trim(), amount: val, category, date }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/transactions/:id
router.delete('/transactions/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const ok = deleteTransaction(userId, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/transactions/:id
router.put('/transactions/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, date } = req.body;
        if (amount !== undefined) {
            const val = parseFloat(String(amount).replace(',', '.'));
            if (isNaN(val) || val <= 0)
                return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        const tx = updateTransaction(userId, req.params.id, { description, amount: req.body.amount, category, date });
        tx ? res.json(tx) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/bills
router.get('/bills', (req, res) => {
    try {
        const userId = req.user.sub;
        res.json(getBills(userId, { activeOnly: false }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/bills
router.post('/bills', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, dueDay } = req.body;
        if (!description || !amount || !category || !dueDay)
            return res.status(400).json({ error: 'Campos obrigatórios: description, amount, category, dueDay' });
        const val = parseFloat(String(amount).replace(',', '.'));
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
        const day = parseInt(dueDay);
        if (isNaN(day) || day < 1 || day > 31) return res.status(400).json({ error: 'Dia inválido (1-31)' });
        res.status(201).json(addBill(userId, { description: String(description).trim(), amount: val, category, dueDay: day }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/bills/:id/toggle
router.patch('/bills/:id/toggle', (req, res) => {
    try {
        const userId = req.user.sub;
        const bill = toggleBill(userId, req.params.id);
        bill ? res.json(bill) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/bills/:id/paid
router.patch('/bills/:id/paid', (req, res) => {
    try {
        const userId = req.user.sub;
        const { month } = req.body;
        if (!month || !/^\d{4}-\d{2}$/.test(month))
            return res.status(400).json({ error: 'month obrigatório (YYYY-MM)' });
        const bill = toggleBillPaid(userId, req.params.id, month);
        bill ? res.json(bill) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/bills/:id
router.delete('/bills/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const ok = deleteBill(userId, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/bills/:id
router.put('/bills/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, dueDay } = req.body;
        if (amount !== undefined) {
            const val = parseFloat(String(amount).replace(',', '.'));
            if (isNaN(val) || val <= 0)
                return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        if (dueDay !== undefined) {
            const day = parseInt(dueDay);
            if (isNaN(day) || day < 1 || day > 31)
                return res.status(400).json({ error: 'Dia inválido (1-31)' });
            req.body.dueDay = day;
        }
        const bill = updateBill(userId, req.params.id, { description, amount: req.body.amount, category, dueDay: req.body.dueDay });
        bill ? res.json(bill) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/categories/:type
router.get('/categories/:type', (req, res) => {
    try { res.json(getCategories(req.params.type)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Investments ───────────────────────────────────────────────────────────────

// GET /api/investments
router.get('/investments', (req, res) => {
    try {
        const userId = req.user.sub;
        const { month } = req.query;
        res.json(getInvestments(userId, { month }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/investments/total
router.get('/investments/total', (req, res) => {
    try {
        res.json({ total: getTotalInvested(req.user.sub) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/investments
router.post('/investments', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, date } = req.body;
        if (!description || !amount || !category)
            return res.status(400).json({ error: 'Campos obrigatórios: description, amount, category' });
        const val = parseFloat(String(amount).replace(',', '.'));
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addInvestment(userId, { description: String(description).trim(), amount: val, category, date }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/investments/:id
router.put('/investments/:id', (req, res) => {
    try {
        const userId = req.user.sub;
        const { description, amount, category, date } = req.body;
        if (amount !== undefined) {
            const val = parseFloat(String(amount).replace(',', '.'));
            if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
            req.body.amount = val;
        }
        const inv = updateInvestment(userId, req.params.id, { description, amount: req.body.amount, category, date });
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

// GET /api/me
router.get('/me', (req, res) => {
    try {
        const user = findUserById(req.user.sub);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ id: user.id, name: user.name, email: user.email });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/me
router.put('/me', (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (name && name.trim().length < 2)
            return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' });
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).json({ error: 'E-mail inválido' });
        if (password) {
            if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
            if (!/[a-zA-Z]/.test(password)) return res.status(400).json({ error: 'Senha deve conter letras' });
            if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Senha deve conter números' });
        }
        const updated = updateUser(req.user.sub, { name, email, password });
        res.json(updated);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /api/comparison/:month
router.get('/comparison/:month', requirePremium, (req, res) => {
    try {
        const userId = req.user.sub;
        const prev = previousMonth(req.params.month);
        res.json(compareMonths(userId, req.params.month, prev));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/averages
router.get('/averages', requirePremium, (req, res) => {
    try {
        const userId = req.user.sub;
        res.json(buildAverages(userId, getAllMonths(userId)) || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/:month
router.get('/export/:month', requirePremium, async (req, res) => {
    try {
        const userId = req.user.sub;
        const filepath = await exportSpreadsheet(userId, req.params.month);
        res.download(filepath, `financas_${req.params.month}.xlsx`);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Goals ───────────────────────────────────────────────────────────

// GET /api/goals
router.get('/goals', (req, res) => {
    try { res.json(getGoals(req.user.sub)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/goals
router.post('/goals', (req, res) => {
    try {
        const { description, targetAmount, targetDate, category } = req.body;
        if (!description || !targetAmount || !targetDate)
            return res.status(400).json({ error: 'Campos obrigatórios: description, targetAmount, targetDate' });
        const val = parseFloat(String(targetAmount).replace(',', '.'));
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
        res.status(201).json(addGoal(req.user.sub, { description, targetAmount: val, targetDate, category }));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/goals/:id
router.put('/goals/:id', (req, res) => {
    try {
        const { description, targetAmount, targetDate, category } = req.body;
        if (targetAmount !== undefined) {
            const val = parseFloat(String(targetAmount).replace(',', '.'));
            if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
            req.body.targetAmount = val;
        }
        const goal = updateGoal(req.user.sub, req.params.id, { description, targetAmount: req.body.targetAmount, targetDate, category });
        goal ? res.json(goal) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/goals/:id
router.delete('/goals/:id', (req, res) => {
    try {
        const ok = deleteGoal(req.user.sub, req.params.id);
        ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/goals/:id/contributions
router.post('/goals/:id/contributions', (req, res) => {
    try {
        const { amount, date, note } = req.body;
        if (!amount) return res.status(400).json({ error: 'amount obrigatório' });
        const val = parseFloat(String(amount).replace(',', '.'));
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Valor inválido' });
        const goal = addGoalContribution(req.user.sub, req.params.id, { amount: val, date, note });
        goal ? res.json(goal) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/goals/:goalId/contributions/:contributionId
router.delete('/goals/:goalId/contributions/:contributionId', (req, res) => {
    try {
        const goal = deleteGoalContribution(req.user.sub, req.params.goalId, req.params.contributionId);
        goal ? res.json(goal) : res.status(404).json({ error: 'Não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Insights ─────────────────────────────────────────────────────────────────

// GET /api/insights/:month
router.get('/insights/:month', (req, res) => {
    try {
        const userId = req.user.sub;
        const month = req.params.month;

        // ── Subscription categories (keywords in description/category) ────────
        const SUBSCRIPTION_GROUPS = {
            'Streamings': ['netflix', 'hbo', 'disney', 'amazon prime', 'prime video', 'apple tv', 'globoplay', 'paramount', 'crunchyroll', 'youtube premium', 'deezer', 'spotify', 'tidal', 'apple music'],
            'IAs': ['chatgpt', 'openai', 'copilot', 'claude', 'gemini', 'midjourney', 'notion ai', 'grammarly', 'jasper', 'perplexity'],
            'Jogos': ['xbox', 'playstation', 'ps plus', 'ps now', 'nintendo', 'game pass', 'ea play', 'steam', 'epic', 'geforce', 'ubisoft'],
            'Cloud & Software': ['google one', 'icloud', 'dropbox', 'onedrive', 'adobe', 'microsoft 365', 'office', 'aws', 'azure', 'google workspace', 'github', 'figma', 'notion', 'slack', 'zoom', 'trello', 'canva'],
            'Saúde & Fitness': ['gympass', 'wellhub', 'academia', 'strava', 'nike', 'headspace', 'calm', 'duolingo'],
            'Notícias & Educação': ['globo', 'folha', 'uol', 'estadão', 'coursera', 'udemy', 'alura', 'rocketseat', 'pluralsight', 'skillshare', 'linkedin learning'],
            'Outros': []
        };

        // Collect all bills as recurring items
        const allBills = getBills(userId, { activeOnly: true });

        // Also collect expense transactions with recurring keywords
        const expenses = getTransactions(userId, { month, type: 'expense' });
        const incomes = getTransactions(userId, { month, type: 'income' });

        // Classify subscriptions
        function classify(text) {
            const lower = (text || '').toLowerCase();
            for (const [group, keywords] of Object.entries(SUBSCRIPTION_GROUPS)) {
                if (group === 'Outros') continue;
                if (keywords.some(k => lower.includes(k))) return group;
            }
            return null; // not a known subscription
        }

        // Build subscription groups from bills (recurring by nature)
        const subscriptionGroups = {};
        for (const bill of allBills) {
            const group = classify(bill.description) || classify(bill.category);
            if (group) {
                if (!subscriptionGroups[group]) subscriptionGroups[group] = [];
                subscriptionGroups[group].push({ name: bill.description, amount: bill.amount, source: 'conta_fixa' });
            }
        }

        // Also detect from expense transactions (description matches)
        for (const exp of expenses) {
            const group = classify(exp.description) || classify(exp.category);
            if (group) {
                // Avoid duplicate if same description already from bills
                const already = Object.values(subscriptionGroups).flat().some(
                    s => s.name.toLowerCase() === exp.description.toLowerCase()
                );
                if (!already) {
                    if (!subscriptionGroups[group]) subscriptionGroups[group] = [];
                    subscriptionGroups[group].push({ name: exp.description, amount: exp.amount, source: 'gasto' });
                }
            }
        }

        const subscriptionTotal = Object.values(subscriptionGroups).flat().reduce((s, i) => s + i.amount, 0);

        // ── Balance forecast ──────────────────────────────────────────────────
        const today = new Date();
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;
        const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

        const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
        const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
        const totalBills = allBills.reduce((s, b) => s + b.amount, 0);
        const currentBalance = totalIncome - totalExpense - totalBills;

        // Average daily expense rate (from what's spent so far this month)
        const dailyExpenseRate = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
        const daysRemaining = daysInMonth - dayOfMonth;

        // Projected additional expenses
        const projectedAdditionalExpense = dailyExpenseRate * daysRemaining;
        const projectedBalance = currentBalance - projectedAdditionalExpense;

        // Find the day when balance would go negative (if it will)
        let negativeDayForecast = null;
        if (currentBalance > 0 && dailyExpenseRate > 0 && projectedBalance < 0) {
            negativeDayForecast = Math.floor(dayOfMonth + (currentBalance / dailyExpenseRate));
            if (negativeDayForecast > daysInMonth) negativeDayForecast = null;
        }

        // Bills unpaid that are still due
        const unpaidBills = allBills.filter(b => {
            const paidMonths = b.paidMonths || [];
            return !paidMonths.includes(month);
        });
        const unpaidBillsTotal = unpaidBills.reduce((s, b) => s + b.amount, 0);

        res.json({
            forecast: {
                currentBalance,
                projectedBalance,
                dailyExpenseRate,
                daysRemaining,
                negativeDayForecast,
                totalIncome,
                totalExpense,
                totalBills,
                unpaidBillsTotal,
                daysInMonth,
                dayOfMonth,
                isCurrentMonth
            },
            subscriptions: {
                groups: subscriptionGroups,
                total: subscriptionTotal
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/health/:month
router.get('/health/:month', (req, res) => {
    try {
        const userId = req.user.sub;
        const month = req.params.month;
        const months = getAllMonths(userId);
        res.json(buildHealthAnalysis(userId, month, months));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
