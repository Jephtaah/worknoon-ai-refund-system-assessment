import { Router } from 'express';
import * as db from '../db.js';
import { evaluateDeterministic, enforcePolicy } from '../services/policyEngine.js';
import { getAiDecision } from '../services/aiService.js';

const router = Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

router.post('/refund-request', async (req, res, next) => {
  try {
    const { order_id, reason, message } = req.body ?? {};

    if (!isNonEmptyString(order_id) || !isNonEmptyString(reason) || !isNonEmptyString(message)) {
      return res.status(400).json({ error: { message: 'order_id, reason, and message are all required.' } });
    }

    const order = await db.getOrderById(order_id);
    const policy = await db.readPolicy();

    let result;

    if (!order) {
      result = {
        decision: 'escalated',
        reasoning: 'We could not find an order with that order ID.',
        policy_checks: [{ rule: 'order_lookup', result: 'fail' }],
        escalated: true,
        source: 'deterministic',
      };
      await db.appendAuditLog({ customer_id: 'UNKNOWN', order_id, reason, message, ...result });
      return res.status(200).json(result);
    }

    const customer_id = order.customer_id;
    const combinedMessage = `Reason: ${reason}\nDetails: ${message}`;

    const deterministic = evaluateDeterministic({ order, message: combinedMessage, policy });
    if (deterministic) {
      result = deterministic;
    } else {
      const aiResult = await getAiDecision(order, combinedMessage);
      result = enforcePolicy(aiResult, order, policy);
    }

    await db.appendAuditLog({ customer_id, order_id, reason, message, ...result });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
