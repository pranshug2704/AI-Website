import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      
      // Handle successful checkout
      if (checkoutSession.subscription && checkoutSession.customer) {
        const subscription = await stripe.subscriptions.retrieve(
          checkoutSession.subscription as string
        );
        
        const userId = subscription.metadata.userId;
        const priceId = subscription.items.data[0].price.id;
        
        // Determine subscription tier based on price ID
        let subscriptionTier = 'free';
        let usageLimit = 100000;
        
        if (priceId === process.env.STRIPE_PRICE_PRO) {
          subscriptionTier = 'pro';
          usageLimit = 1000000;
        } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) {
          subscriptionTier = 'enterprise';
          usageLimit = 10000000;
        }
        
        // Update user subscription
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscription: subscriptionTier,
            usageLimit,
            stripeSubscriptionId: subscription.id
          }
        });
      }
      break;
      
    case 'customer.subscription.updated':
      // Handle subscription updates
      const updatedSubscription = event.data.object as Stripe.Subscription;
      const userId = updatedSubscription.metadata.userId;
      const priceId = updatedSubscription.items.data[0].price.id;
      
      // Determine subscription tier based on price ID
      let subscriptionTier = 'free';
      let usageLimit = 100000;
      
      if (priceId === process.env.STRIPE_PRICE_PRO) {
        subscriptionTier = 'pro';
        usageLimit = 1000000;
      } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) {
        subscriptionTier = 'enterprise';
        usageLimit = 10000000;
      }
      
      // Update user subscription
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscription: subscriptionTier,
          usageLimit
        }
      });
      break;
      
    case 'customer.subscription.deleted':
      // Handle subscription cancellations
      const deletedSubscription = event.data.object as Stripe.Subscription;
      
      const deletedUserId = deletedSubscription.metadata.userId;
      
      // Reset user to free tier
      await prisma.user.update({
        where: { id: deletedUserId },
        data: {
          subscription: 'free',
          usageLimit: 100000,
          stripeSubscriptionId: null
        }
      });
      break;
  }
  
  return NextResponse.json({ received: true });
}