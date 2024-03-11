import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

// GETs
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// Task 4 routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);

// POSTs
router.post('/users', UsersController.postNew);

export default router;
