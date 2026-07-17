/* ==========================================================================
   get-availability.js
   Returns bookable slots for the next two weeks.

   DEMO MODE (default, no setup needed):
   Returns a small generated list so the page works immediately after
   deploy, before Supabase is connected.

   REAL MODE (once SUPABASE_URL and SUPABASE_SERVICE_KEY are set in
   Netlify's environment variables, see README.md, Box 3):
   Reads real slot rows from a Supabase table called "slots" and marks
   anything already booked or currently on hold as taken.
   ========================================================================== */

exports.handler = async function () {
  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;

  if (!hasSupabase) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'demo', slots: [] })
      // The demo slot list already lives in script.js on the front end,
      // so an empty demo response here is intentional. Once Supabase is
      // connected, this function becomes the single source of truth and
      // script.js's PLUG POINT comment shows exactly where to switch over.
    };
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(80);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'live', slots: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not load availability.', detail: err.message })
    };
  }
};
