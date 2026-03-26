import { Router } from 'express';
import {
  createStripePayment,
  createPayPalOrder,
  capturePayPalOrder,
  initiateMpesaPayment,
  verifyMpesaPayment,
  mpesaCallback,
  stripeWebhook
} from '../controllers/paymentController';

const router = Router();

// Stripe payment
router.post('/stripe', createStripePayment);

// PayPal payment
router.post('/paypal/create', createPayPalOrder);
router.post('/paypal/capture', capturePayPalOrder);

// M-Pesa payment
router.post('/mpesa', initiateMpesaPayment);
router.post('/mpesa/verify', verifyMpesaPayment);
router.post('/mpesa/callback', mpesaCallback);

// Stripe webhook (needs raw body)
router.post('/stripe/webhook', stripeWebhook);

export default router;
