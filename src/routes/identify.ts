import express from 'express';
import { identifyController } from '../controllers/identifyController';

const router = express.Router();
router.post('/', identifyController);

export default router;
