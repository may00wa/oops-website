/* ==========================================================================
   paystack-webhook.js
   The one place a slot is ever marked as actually booked. Paystack calls
   this address itself the moment a payment clears, it is never triggered
   by the browser, so a booking can't be faked by refreshing a page.

   SETUP: after deploy, copy this function's URL
     https://yoursite.com/.netlify/functions/paystack-webhook
   into Paystack's dashboard under Settings > API Keys & Webhooks.
   See README.md, Box 2.

   Requires PAYSTACK_SECRET_KEY to verify the request really came from
   Paystack. Optionally uses SUPABASE_URL / SUPABASE_SERVICE_KEY to mark
   the slot booked, and RESEND_API_KEY / NOTIFY_EMAIL to send the two
   emails: the founder's confirmation, and the brief to Oops.

   Any of those pieces that are missing simply get skipped with a console
   log, so this function never crashes before every box in the setup
   guide has been ticked. It just does less until then.
   ========================================================================== */

const crypto = require('crypto');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.warn('paystack-webhook: PAYSTACK_SECRET_KEY not set, ignoring event.');
    return { statusCode: 200, body: 'Demo mode, nothing to verify yet.' };
  }

  // Verify this request genuinely came from Paystack.
  const hash = crypto.createHmac('sha512', secret).update(event.body).digest('hex');
  if (hash !== event.headers['x-paystack-signature']) {
    return { statusCode: 401, body: 'Signature mismatch.' };
  }

  const payload = JSON.parse(event.body);
  if (payload.event !== 'charge.success') {
    return { statusCode: 200, body: 'Event ignored.' };
  }

  const data = payload.data;
  const meta = data.metadata || {};
  const reference = data.reference;

  /* -------------------- mark the slot booked -------------------- */
  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
  if (hasSupabase) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      await supabase.from('bookings').insert({
        reference,
        slot: meta.slot,
        name: meta.name,
        email: data.customer.email,
        business: meta.business,
        link: meta.link,
        sells: meta.sells,
        age: meta.age,
        reason: meta.reason,
        settled: meta.settled,
        confirmed_by_oops: false
      });
    } catch (err) {
      console.error('Supabase write failed:', err.message);
    }
  } else {
    console.warn('paystack-webhook: SUPABASE not configured, booking not persisted.');
  }

  /* -------------------- send the two emails -------------------- */
  const hasResend = !!process.env.RESEND_API_KEY;
  if (hasResend) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const notifyEmail = process.env.NOTIFY_EMAIL || 'consult@oopsbranding.com';

      const slotLabel = meta.slot ? `${meta.slot.date} · ${meta.slot.time} WAT` : 'your slot';

      // Confirmation to the founder, with a calendar file attached.
      await resend.emails.send({
        from: 'Oops! <consult@oopsbranding.com>',
        to: data.customer.email,
        subject: `Locked in: ${slotLabel}`,
        text: `Your call is booked for ${slotLabel}.\n\nOops will email you within 24 hours to confirm.\n\nReference: ${reference}`,
        attachments: [{
          filename: 'oops-consultation.ics',
          content: Buffer.from(buildIcs(meta.slot, reference)).toString('base64')
        }]
      });

      // The brief, to Oops itself.
      await resend.emails.send({
        from: 'Oops! Bookings <consult@oopsbranding.com>',
        to: notifyEmail,
        subject: `New booking, ${slotLabel}, Ref ${reference}`,
        text: [
          `NEW BOOKING, ${slotLabel}, Ref ${reference}`,
          '',
          `${meta.business || ''}   ${meta.link || ''}`,
          `${meta.name || ''}  ·  ${data.customer.email}`,
          '',
          `Sells: ${meta.sells || ''}`,
          `Been running: ${meta.age || ''}`,
          `Booked because: ${meta.reason || ''}`,
          `Wants settled: ${meta.settled || ''}`,
          '',
          'Payment: confirmed, ₦25,000'
        ].join('\n')
      });
    } catch (err) {
      console.error('Email send failed:', err.message);
    }
  } else {
    console.warn('paystack-webhook: RESEND not configured, no emails sent.');
  }

  return { statusCode: 200, body: 'ok' };
};

function buildIcs(slot, reference) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${reference}@oopsbranding.com`,
    `DTSTAMP:${now}`,
    `SUMMARY:Oops! consultation`,
    `DESCRIPTION:Reference ${reference}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}
