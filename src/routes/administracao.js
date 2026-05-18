import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { getUsers, createUser, updateUser, toggleUser, setPlan, getMetrics } from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAdmin);

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/toggle', toggleUser);
router.patch('/users/:id/plan', setPlan);
router.get('/metrics', getMetrics);

export default router;
