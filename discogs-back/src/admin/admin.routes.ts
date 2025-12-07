import { Router } from 'express';
import * as AdminController from './admin.controller';
import { authenticateToken } from '../middleware/auth';
import { checkAdmin } from '../middleware/admin';

const router = Router();

console.log('[ADMIN ROUTER] Initializing admin routes');

router
    .route('/api/admin/users')
    .get(authenticateToken, checkAdmin, AdminController.readAllUsers);

router
    .route('/api/admin/users/:username')
    .put(authenticateToken, checkAdmin, AdminController.updateUser)
    .delete(authenticateToken, checkAdmin, AdminController.deleteUser);

console.log('[ADMIN ROUTER] Routes registered: /api/admin/users, /api/admin/users/:username');

export default router;

