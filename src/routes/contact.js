// src/routes/contact.js - CREATE THIS FILE
import express from 'express';
import { sendContactEmail } from '../controllers/contactController.js';

const router = express.Router();

// POST /api/contact/send
router.post('/send', sendContactEmail);

export default router;