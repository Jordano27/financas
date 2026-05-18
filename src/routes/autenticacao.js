import { Router } from 'express';
import { login, loginLimiter, logout, register, unsubscribe } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/register', register);
router.post('/logout', logout);
router.get('/unsubscribe', unsubscribe);

export default router;
