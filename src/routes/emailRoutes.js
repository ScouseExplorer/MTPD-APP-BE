import express from 'express';
const router = express.Router();
import { sendEmail } from '../services/emailService.js';

// Simple test endpoint to trigger an email via Resend
router.post('/test', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ success: false, message: 'to, subject, and html or text are required' });
    }

    const result = await sendEmail({ to, subject, html, text });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
