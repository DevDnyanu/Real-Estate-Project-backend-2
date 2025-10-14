// src/routes/contact.js
import express from 'express';
import { sendContactEmail } from '../controllers/contactController.js';

const router = express.Router();

// POST /api/contact/send
router.post('/send', sendContactEmail);

export default router;
