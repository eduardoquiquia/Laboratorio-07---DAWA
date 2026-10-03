import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { sessionCookie } from '../controllers/AuthController.js';
const router = express.Router();
router.post('/signUp', AuthController.signUp);
router.post('/signIn', AuthController.signIn);
router.post('/signOut', (req, res) => res.clearCookie('session', sessionCookie).sendStatus(204));
export default router;
