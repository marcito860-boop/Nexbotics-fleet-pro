import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Book, Transaction } from '../models';

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any
});

// Create Stripe payment intent
export const createStripePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { book_id, email } = req.body;
    
    const book = await Book.findByPk(book_id);
    if (!book) {
      res.status(404).json({ message: 'Book not found' });
      return;
    }

    const amount = Math.round(parseFloat(book.price.toString()) * 100); // Convert to cents

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        book_id: book.id.toString(),
        book_title: book.title
      }
    });

    // Create pending transaction
    const downloadToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const transaction = await Transaction.create({
      book_id: book.id,
      payment_method: 'stripe',
      amount: book.price,
      status: 'pending',
      email,
      download_token: downloadToken,
      expires_at: expiresAt,
      payment_reference: paymentIntent.id
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction.id,
      downloadToken
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    res.status(500).json({ message: 'Payment processing error' });
  }
};

// Create PayPal order
export const createPayPalOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { book_id, email } = req.body;
    
    const book = await Book.findByPk(book_id);
    if (!book) {
      res.status(404).json({ message: 'Book not found' });
      return;
    }

    // Get PayPal access token
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await axios.post(
      `https://api.${process.env.PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Create order
    const orderResponse = await axios.post(
      `https://api.${process.env.PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: book.price.toString()
          },
          description: `Purchase of ${book.title}`
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Create pending transaction
    const downloadToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const transaction = await Transaction.create({
      book_id: book.id,
      payment_method: 'paypal',
      amount: book.price,
      status: 'pending',
      email,
      download_token: downloadToken,
      expires_at: expiresAt,
      payment_reference: orderResponse.data.id
    });

    res.json({
      orderId: orderResponse.data.id,
      transactionId: transaction.id,
      downloadToken
    });
  } catch (error) {
    console.error('PayPal order error:', error);
    res.status(500).json({ message: 'Payment processing error' });
  }
};

// Capture PayPal order
export const capturePayPalOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    // Get PayPal access token
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await axios.post(
      `https://api.${process.env.PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Capture the order
    const captureResponse = await axios.post(
      `https://api.${process.env.PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (captureResponse.data.status === 'COMPLETED') {
      // Update transaction
      await Transaction.update(
        { status: 'completed' },
        { where: { payment_reference: orderId } }
      );

      const transaction = await Transaction.findOne({
        where: { payment_reference: orderId }
      });

      res.json({
        success: true,
        downloadToken: transaction?.download_token
      });
    } else {
      res.status(400).json({ message: 'Payment not completed' });
    }
  } catch (error) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ message: 'Payment capture error' });
  }
};

// Initiate M-Pesa STK Push
export const initiateMpesaPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { book_id, phone } = req.body;
    
    const book = await Book.findByPk(book_id);
    if (!book) {
      res.status(404).json({ message: 'Book not found' });
      return;
    }

    // Format phone number (remove leading 0 or +254)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // For development/demo, simulate successful STK push
    // In production, this would call the actual Safaricom Daraja API
    
    // Create pending transaction
    const downloadToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const transaction = await Transaction.create({
      book_id: book.id,
      payment_method: 'mpesa',
      amount: book.price,
      status: 'pending',
      phone: formattedPhone,
      download_token: downloadToken,
      expires_at: expiresAt,
      payment_reference: `MPESA_${Date.now()}`
    });

    // Simulate STK push (in production, make actual API call)
    res.json({
      message: 'STK Push initiated. Please check your phone and enter M-Pesa PIN.',
      transactionId: transaction.id,
      downloadToken,
      checkoutRequestId: `ws_CO_${Date.now()}`,
      simulated: true
    });
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    res.status(500).json({ message: 'Payment processing error' });
  }
};

// M-Pesa callback (for production)
export const mpesaCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Body } = req.body;
    
    if (Body.stkCallback.ResultCode === 0) {
      // Payment successful
      const checkoutRequestId = Body.stkCallback.CheckoutRequestID;
      
      await Transaction.update(
        { status: 'completed' },
        { where: { payment_reference: checkoutRequestId } }
      );
    } else {
      // Payment failed
      const checkoutRequestId = Body.stkCallback.CheckoutRequestID;
      
      await Transaction.update(
        { status: 'failed' },
        { where: { payment_reference: checkoutRequestId } }
      );
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Error' });
  }
};

// Verify M-Pesa payment (for demo/development)
export const verifyMpesaPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.body;
    
    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // For demo, complete the payment
    await transaction.update({ status: 'completed' });

    res.json({
      success: true,
      downloadToken: transaction.download_token
    });
  } catch (error) {
    console.error('M-Pesa verify error:', error);
    res.status(500).json({ message: 'Verification error' });
  }
};

// Stripe webhook
export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as stripe.PaymentIntent;
    
    await Transaction.update(
      { status: 'completed' },
      { where: { payment_reference: paymentIntent.id } }
    );
  }

  res.json({ received: true });
};