import { Router } from 'express';
import { login, loginLimiter, register, unsubscribe } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/register', register);
router.get('/unsubscribe', unsubscribe);

export default router;
