const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin globally to avoid re-initializing on hot-reloads
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle escaped newlines in environment variable
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Disable Vercel's default body parser so we can get the raw body for Stripe signature validation
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to buffer the raw request stream
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Look out for successful payment checkout session completions
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Extract metadata that we passed into the created session
    const { uid, plan } = session.metadata || {};

    if (uid && plan) {
      try {
        await db.collection('users').doc(uid).update({
          plan: plan,
          subscriptionStatus: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully upgraded user ${uid} to plan ${plan}`);
      } catch (error) {
        console.error(`Failed to update user ${uid}:`, error.message);
      }
    } else {
      console.warn("Received a checkout completed event, but missing metadata!");
    }
  }

  // Tell Stripe we successfully processed the event so it stops retrying
  res.json({ received: true });
};
