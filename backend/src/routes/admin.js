import { Router } from 'express';
import * as db from '../db.js';

const router = Router();

router.get('/admin/requests', async (req, res, next) => {
  try {
    const requests = await db.getAuditLog();
    const orders = await db.readOrders();
    const customers = await db.readCustomers();

    const ordersMap = new Map(orders.map((o) => [o.order_id, o]));
    const customersMap = new Map(customers.map((c) => [c.customer_id, c]));

    const enrichedRequests = requests.map((r) => {
      const order = ordersMap.get(r.order_id) || null;
      const customer = customersMap.get(r.customer_id) || (order ? customersMap.get(order.customer_id) : null);
      return {
        ...r,
        order,
        customer,
      };
    });

    enrichedRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.status(200).json({ requests: enrichedRequests });
  } catch (err) {
    next(err);
  }
});

export default router;
