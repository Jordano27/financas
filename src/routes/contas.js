import { Router } from 'express';
import {
    listBills, createBill, toggleBillHandler, toggleBillPaidHandler,
    deleteBillHandler, updateBillHandler,
} from '../controllers/contas.controller.js';

const router = Router();

router.get('/bills', listBills);
router.post('/bills', createBill);
router.patch('/bills/:id/toggle', toggleBillHandler);
router.patch('/bills/:id/paid', toggleBillPaidHandler);
router.delete('/bills/:id', deleteBillHandler);
router.put('/bills/:id', updateBillHandler);

export default router;
