# Getting Oops! live

The whole site already works the moment you deploy it. Slots, the form,
the payment screen, the confirmation, all of it is clickable right away.
What's below turns it from "working demo" into "actually taking real
money and real bookings." Four boxes. Do them in order.

Nothing here needs you to touch code. You are only ever pasting things
into labeled boxes.

---

## Box 1: Give the site an address

1. In Netlify, open your site, go to **Domain settings**.
2. Click **Add a custom domain** and type in your domain.
3. Netlify shows you two lines of text.
4. Go to wherever you bought your domain (GoDaddy, Namecheap, wherever),
   find **DNS settings**, and paste those two lines in.
5. Wait a few hours. Your domain now points at the site.

---

## Box 2: Let people pay you (Paystack)

1. Go to paystack.com, make a business account.
2. They'll ask for your bank details and ID. Fill it in, submit, wait
   for approval.
3. Once approved, go to **Settings > API Keys & Webhooks**. Copy the
   **Secret Key**.
4. In Netlify, go to **Site configuration > Environment variables**,
   click **Add a variable**, name it exactly `PAYSTACK_SECRET_KEY`,
   paste the key in as the value.
5. Still on that same Paystack webhooks page, add this address as your
   webhook URL, replacing `yoursite.com` with your real domain:
   `https://yoursite.com/.netlify/functions/paystack-webhook`
6. Done. Money can now flow from customer to your bank account.

---

## Box 3: Let the site remember bookings (Supabase)

1. Go to supabase.com, make a free account, click **New project**.
2. Give it any name, wait for it to finish setting up.
3. Go to **Project Settings > API**. Copy the **Project URL** and the
   **service_role key**.
4. In Netlify's environment variables, add two more:
   - `SUPABASE_URL` → paste the Project URL
   - `SUPABASE_SERVICE_KEY` → paste the service_role key
5. Inside Supabase, go to the **SQL editor** and run this once, so it
   has somewhere to store slots, holds, and bookings:

   ```sql
   create table slots (
     id text primary key,
     starts_at timestamptz,
     label text
   );
   create table holds (
     slot_id text primary key,
     expires_at timestamptz
   );
   create table bookings (
     reference text primary key,
     slot jsonb,
     name text,
     email text,
     business text,
     link text,
     sells text,
     age text,
     reason text,
     settled text,
     confirmed_by_oops boolean default false,
     created_at timestamptz default now()
   );
   ```

6. Done. The site now has a memory for who booked what.

---

## Box 4: Let emails actually send (Resend)

1. Go to resend.com, make an account.
2. Add your domain. It gives you a few lines of text to paste into your
   domain's DNS settings, same place as Box 1.
3. Once it shows your domain as verified, copy your **API Key**.
4. In Netlify's environment variables, add:
   - `RESEND_API_KEY` → paste the API key
   - `NOTIFY_EMAIL` → `consult@oopsbranding.com`
5. Done. Confirmation emails and booking briefs will now actually
   arrive.

---

## Box 5: The one human step

This system was built on purpose to still need a person. Every time a
booking brief lands in `consult@oopsbranding.com`, someone reads it and
replies to confirm the slot within 24 hours. Decide now who that person
is. That's the only box with no button to click, just a habit to keep.

---

## What happens if you skip a box

Nothing breaks. Every function checks whether its box is filled in
before doing anything with it. Skip Box 2 and the payment screen still
walks through, just without touching real money. Skip Box 3 and slots
still show up, just from a small built-in list instead of a real
calendar. Skip Box 4 and bookings still complete, just without emails
going out. You can turn each one on whenever you're ready, in any order,
and nothing you've already set up gets undone.
