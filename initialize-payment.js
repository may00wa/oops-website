/* ==========================================================================
   initialize-payment.js
   Starts a ₦25,000 Paystack transaction for the selected slot.

   DEMO MODE (default): returns a fake reference immediately so the
   whole booking flow is clickable end to end before Paystack is
   connected. No card is charged, nothing is sent anywhere.

   REAL MODE (once PAYSTACK_SECRET_KEY is set in Netlify's environment
   variables, see README.md, Box 2): creates a real transaction with
   Paystack and returns the checkout link. The front end (script.js)
   redirects the person there to actually pay. Paystack then calls
   paystack-webhook.js on success, which is the only place a slot is
   ever marked as truly booked.
   ========================================================================== */

const AMOUNT_KOBO = 25000 * 100; // Paystack works in kobo

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const hasPaystack = !!process.env.PAYSTACK_SECRET_KEY;

  if (!hasPaystack) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'demo',
        reference: 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        // No authorizationUrl in demo mode, so script.js proceeds straight
        // to the confirmation screen instead of redirecting anywhere.
      })
    };
  }

  try {
    const channelsByMethod = {
      card: ['card'],
      transfer: ['bank_transfer'],
      ussd: ['ussd']
    };

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: body.email,
        amount: AMOUNT_KOBO,
        channels: channelsByMethod[body.method] || undefined,
        metadata: {
          slot: body.slot,
          name: body.name,
          business: body.business,
          link: body.link,
          sells: body.sells,
          age: body.age,
          reason: body.reason,
          settled: body.settled
        }
      })
    });

    const json = await res.json();
    if (!json.status) throw new Error(json.message || 'Paystack rejected the request.');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'live',
        reference: json.data.reference,
        authorizationUrl: json.data.authorization_url
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not start payment.', detail: err.message })
    };
  }
};
