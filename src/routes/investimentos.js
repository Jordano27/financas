import { Router } from 'express';
import {
    syncLimiter, listInvestments, getTotal, getMarketOptions, syncInvestments,
    createInvestment, updateInvestmentHandler, deleteInvestmentHandler,
    addContribution, deleteContribution, updateCurrentValue,
} from '../controllers/investimentos.controller.js';

const router = Router();

router.get('/investments', listInvestments);
router.get('/investments/total', getTotal);
router.get('/investments/market-options', getMarketOptions);
router.post('/investments/sync', syncLimiter, syncInvestments);
router.post('/investments', createInvestment);
router.put('/investments/:id', updateInvestmentHandler);
router.delete('/investments/:id', deleteInvestmentHandler);
router.post('/investments/:id/contributions', addContribution);
router.delete('/investments/:id/contributions/:contribId', deleteContribution);
router.patch('/investments/:id/value', updateCurrentValue);

export default router;
