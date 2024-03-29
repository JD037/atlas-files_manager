import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = express.Router();

// GETs ROUTES ********************************
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
// Task 4 routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);
// Task 6 routes
router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);
// Task 8 route
router.get('/files/:id/data', FilesController.getFile);
// Task 9 route
router.get('/files/:id/data', FilesController.getFile);

// POSTs ROUTES **********************************
router.post('/users', UsersController.postNew);
router.post('/files', FilesController.postUpload);

// PUTS ROUTES
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

export default router;
