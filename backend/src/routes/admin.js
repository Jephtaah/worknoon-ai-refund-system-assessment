import { Router } from 'express';
import * as db from '../db.js';

const router = Router();

router.get('/admin/requests', async (req, res, next) => {
  try {
    const requests = await db.getAuditLog();
    requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
});

export default router;
