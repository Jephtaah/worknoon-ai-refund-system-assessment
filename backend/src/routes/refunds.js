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
    const { customer_id, order_id, message } = req.body ?? {};

    if (!isNonEmptyString(customer_id) || !isNonEmptyString(order_id) || !isNonEmptyString(message)) {
      return res.status(400).json({ error: { message: 'customer_id, order_id, and message are all required.' } });
    }

    const [customer, order, policy] = await Promise.all([
      db.getCustomerById(customer_id),
      db.getOrderById(order_id),
      db.readPolicy(),
    ]);

    let result;

    if (!customer || !order || order.customer_id !== customer_id) {
      result = {
        decision: 'escalated',
        reasoning: 'We could not verify this order against the customer on file.',
        policy_checks: [{ rule: 'order_lookup', result: 'fail' }],
        escalated: true,
        source: 'deterministic',
      };
    } else {
      const deterministic = evaluateDeterministic({ order, message, policy });
      if (deterministic) {
        result = deterministic;
      } else {
        const aiResult = await getAiDecision(order, message);
        result = enforcePolicy(aiResult, order, policy);
      }
    }

    await db.appendAuditLog({ customer_id, order_id, ...result });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
