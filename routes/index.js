import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

// GETs
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// POSTs
router.post('/users', UsersController.postNew);

export default router;
