const Stripe = require('stripe');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sessionId = req.query.session_id || (req.body && req.body.session_id);

  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Missing session_id parameter.' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    ? process.env.STRIPE_SECRET_KEY.trim().replace(/\\n/g, '').replace(/\\r/g, '').replace(/"/g, '')
    : undefined;
  const jwtSecret = process.env.JWT_SECRET
    ? process.env.JWT_SECRET.trim().replace(/\\n/g, '').replace(/\\r/g, '').replace(/"/g, '')
    : 'fallback_local_test_secret_12345';

  // For testing purposes, if Stripe secret key is not set, allow mock verification for mock session IDs
  if (!stripeSecretKey) {
    console.warn('STRIPE_SECRET_KEY is not set. Running in Demo/Test mode.');
    if (sessionId.startsWith('mock_')) {
      const token = jwt.sign(
        { sessionId, email: 'demo@metalmindtech.com', mock: true },
        jwtSecret,
        { expiresIn: '5m' }
      );
      return res.status(200).json({ success: true, token });
    }
    return res.status(500).json({
      success: false,
      error: 'STRIPE_SECRET_KEY is not configured in environment variables. Set this in Vercel Dashboard.'
    });
  }

  try {
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const email = session.customer_details ? session.customer_details.email : '';
      const token = jwt.sign(
        { sessionId: session.id, email },
        jwtSecret,
        { expiresIn: '5m' } // 5 minutes expiration
      );

      return res.status(200).json({ success: true, token });
    } else {
      return res.status(400).json({ success: false, error: 'Payment status is: ' + session.payment_status });
    }
  } catch (error) {
    console.error('Stripe retrieval error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify payment with Stripe: ' + error.message });
  }
};
