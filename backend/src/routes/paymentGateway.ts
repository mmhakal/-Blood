import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { PaymentGatewayService } from '../services/paymentGatewayService';
import { SubscriptionBillingService } from '../services/subscriptionBillingService';
import { auditFromReq } from '../services/auditService';

const router = Router();

// POST /api/payments/initiate - Initiate payment order
router.post('/initiate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { invoice_id, amount, currency, payment_method, notes } = req.body;

  if (!invoice_id || !amount) {
    res.status(400).json({ error: 'invoice_id and amount are required' });
    return;
  }

  try {
    const order = await PaymentGatewayService.initiatePayment({
      invoice_id,
      amount: Number(amount),
      currency: currency || 'INR',
      payment_method: payment_method || 'UPI',
      notes,
      customer_name: req.user?.name,
      customer_email: req.user?.email
    });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/verify - Server-side cryptographic payment verification
router.post('/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { gateway_order_id, gateway_payment_id, gateway_signature, invoice_id, amount, payment_method } = req.body;

  if (!invoice_id || !amount) {
    res.status(400).json({ error: 'invoice_id and amount are required' });
    return;
  }

  try {
    const result = await PaymentGatewayService.verifyPayment(
      {
        gateway_order_id: gateway_order_id || `order_mock_${Date.now()}`,
        gateway_payment_id: gateway_payment_id || `pay_mock_${Date.now()}`,
        gateway_signature: gateway_signature || 'mock_signature',
        invoice_id,
        amount: Number(amount),
        payment_method: payment_method || 'UPI'
      },
      req.user?.id
    );

    auditFromReq(req, 'PAYMENT_VERIFIED_GATEWAY', 'payments', result.payment_id, null, {
      invoice_id,
      amount,
      receipt_number: result.receipt_number
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/payments/refund - Process authorized payment refund
router.post('/refund', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { payment_id, amount, reason } = req.body;

  if (!payment_id || !amount || !reason) {
    res.status(400).json({ error: 'payment_id, amount, and reason are required' });
    return;
  }

  try {
    const result = await PaymentGatewayService.processRefund(
      payment_id,
      Number(amount),
      reason,
      req.user?.id
    );

    auditFromReq(req, 'PROCESS_REFUND', 'refunds', result.refund_id, null, {
      payment_id,
      amount,
      reason
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/subscriptions/lifecycle/evaluate - Run subscription lifecycle engine
router.get('/subscriptions/lifecycle/evaluate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const evaluation = await SubscriptionBillingService.evaluateAllSubscriptions();
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
