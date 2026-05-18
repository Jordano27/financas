import { Router } from 'express';
import {
    listGoals, createGoal, updateGoalHandler, deleteGoalHandler,
    addContribution, deleteContribution,
} from '../controllers/metas.controller.js';

const router = Router();

router.get('/goals', listGoals);
router.post('/goals', createGoal);
router.put('/goals/:id', updateGoalHandler);
router.delete('/goals/:id', deleteGoalHandler);
router.post('/goals/:id/contributions', addContribution);
router.delete('/goals/:goalId/contributions/:contributionId', deleteContribution);

export default router;
