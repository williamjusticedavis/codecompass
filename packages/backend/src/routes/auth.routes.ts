import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

export const authRouter = Router();

// Public routes
authRouter.post('/register', authController.register.bind(authController));
authRouter.post('/login', authController.login.bind(authController));

// Protected routes
authRouter.get('/me', authenticateToken, authController.getMe.bind(authController));
authRouter.post('/logout', authenticateToken, authController.logout.bind(authController));
