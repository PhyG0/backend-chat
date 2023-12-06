import express from 'express';
const router = express.Router();
import apiController from '../controllers/apiController.js';

router.get('/:userName', apiController.getUser);
router.get('/id/:userId', apiController.getUserById);
router.get('/ids/:userId', apiController.getUsersById);


export default router;