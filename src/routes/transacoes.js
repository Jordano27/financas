import { Router } from 'express';
import { requirePremium } from '../middlewares/auth.middleware.js';
import {
    exportLimiter, getStats, getMonths, listTransactions, addTransactionHandler,
    deleteTransactionHandler, updateTransactionHandler, getCategoriesHandler,
    getMe, updateMe, getComparison, getAverages, exportData,
    getInsights, getHealth, getEmailOptIn, patchEmailOptIn,
} from '../controllers/transacoes.controller.js';

const router = Router();

router.get('/stats/:month', requirePremium, getStats);
router.get('/months', getMonths);
router.get('/transactions', listTransactions);
router.post('/transactions', addTransactionHandler);
router.delete('/transactions/:id', deleteTransactionHandler);
router.put('/transactions/:id', updateTransactionHandler);
router.get('/categories/:type', getCategoriesHandler);
router.get('/me', getMe);
router.put('/me', updateMe);
router.get('/comparison/:month', requirePremium, getComparison);
router.get('/averages', requirePremium, getAverages);
router.get('/export/:month', exportLimiter, requirePremium, exportData);
router.get('/insights/:month', getInsights);
router.get('/health/:month', getHealth);
router.get('/email-optin', getEmailOptIn);
router.patch('/email-optin', patchEmailOptIn);

export default router;
