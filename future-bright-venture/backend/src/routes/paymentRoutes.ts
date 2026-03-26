import { Router } from 'express';
import express from 'express';
import { body } from 'express-validator';
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

// Stripe
router.post('/stripe/create', [
  body('book_id').isInt().withMessage('Valid book ID is required'),
  body('email').isEmail().withMessage('Valid email is required')
], createStripePayment);

// PayPal
router.post('/paypal/create', [
  body('book_id').isInt().withMessage('Valid book ID is required'),
  body('email').isEmail().withMessage('Valid email is required')
], createPayPalOrder);

router.post('/paypal/capture', [
  body('orderId').notEmpty().withMessage('Order ID is required')
], capturePayPalOrder);

// M-Pesa
router.post('/mpesa/initiate', [
  body('book_id').isInt().withMessage('Valid book ID is required'),
  body('phone').notEmpty().withMessage('Phone number is required')
], initiateMpesaPayment);

router.post('/mpesa/verify', [
  body('transactionId').isInt().withMessage('Valid transaction ID is required')
], verifyMpesaPayment);

router.post('/mpesa/callback', mpesaCallback);

// Stripe webhook (raw body needed)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;