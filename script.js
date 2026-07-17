/* ==========================================================================
   OOPS! v2 front end
   Scramble headline, word reveal on scroll, magnetic buttons, custom
   cursor, and the same four screen booking mechanism as before, now
   living inside a centered modal instead of a full page takeover.
   Every real backend hookup is still marked PLUG POINT.
   ========================================================================== */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     1. TEXT SCRAMBLE (hero headline)
     -------------------------------------------------------------------- */
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!?#%&";

  function scramble(el, finalText, opts = {}) {
    const duration = opts.duration || 2600;
    const pauseAfter = opts.pauseAfter || 3400;
    const loop = opts.loop || false;

    if (reduceMotion) { el.textContent = finalText; return; }

    const steps = Math.round(duration / 45);
    const stepTime = duration / steps;
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const t = frame / steps;
      const revealCount = Math.floor(t * finalText.length);
      let out = "";
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === " ") { out += " "; continue; }
        if (i < revealCount) out += finalText[i];
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      el.textContent = out;
      if (frame >= steps) {
        el.textContent = finalText;
        clearInterval(interval);
        if (loop) setTimeout(() => scramble(el, finalText, opts), pauseAfter);
      }
    }, stepTime);
  }

  document.querySelectorAll('[data-scramble]').forEach((el, i) => {
    const final = el.dataset.scramble;
    setTimeout(() => scramble(el, final, { duration: 2600, pauseAfter: 3400, loop: true }), 300 + i * 700);
  });

  /* ---------------------------------------------------------------------
     2. WORD REVEAL ON SCROLL
     -------------------------------------------------------------------- */
  const revealTargets = document.querySelectorAll('[data-word-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    revealTargets.forEach(el => { el.classList.add('word-reveal'); io.observe(el); });
  } else {
    revealTargets.forEach(el => el.classList.add('word-reveal', 'is-visible'));
  }

  /* ---------------------------------------------------------------------
     3. CUSTOM CURSOR
     -------------------------------------------------------------------- */
  const cursor = document.getElementById('cursor-dot');
  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-active'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    });
  }

  /* ---------------------------------------------------------------------
     4. MAGNETIC BUTTONS
     -------------------------------------------------------------------- */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.4}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
    });
  }

  /* ---------------------------------------------------------------------
     4b. BEFORE / AFTER SCENARIO ROTATOR
     -------------------------------------------------------------------- */
  const swapBefore = document.getElementById('swap-text-before');
  const swapAfter = document.getElementById('swap-text-after');
  if (swapBefore && swapAfter) {
    const scenarios = [
      { before: "We sell fashion for everyone.", after: "We sell for the woman walking into a room she wants to own." },
      { before: "Our menu has something for everyone.", after: "Regulars don't check the menu — they just say \"the usual.\"" },
      { before: "We sell skincare.", after: "The step she never skips, even on the most rushed morning." },
      { before: "Quality service, guaranteed.", after: "The plain answer you've been paying agencies to avoid giving you." }
    ];
    let scenarioIndex = 0;
    const ROTATE_MS = 4800;
    const FADE_MS = 400;

    function showScenario(i) {
      swapBefore.classList.add('is-fading');
      swapAfter.classList.add('is-fading');
      setTimeout(() => {
        swapBefore.textContent = scenarios[i].before;
        swapAfter.textContent = scenarios[i].after;
        swapBefore.classList.remove('is-fading');
        swapAfter.classList.remove('is-fading');
      }, FADE_MS);
    }

    if (!reduceMotion && scenarios.length > 1) {
      setInterval(() => {
        scenarioIndex = (scenarioIndex + 1) % scenarios.length;
        showScenario(scenarioIndex);
      }, ROTATE_MS);
    }
  }

  /* ---------------------------------------------------------------------
     5. DEMO DATA, availability
     PLUG POINT: get-availability.js returns this shape from Supabase
     instead, once Box 3 in README.md is set up.
     -------------------------------------------------------------------- */
  function buildDemoSlots() {
    const today = new Date();
    const times = ["10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];
    const weeks = [];

    for (let g = 0; g < 2; g++) {
      const label = g === 0 ? "This week" : "Next week";
      const days = [];
      for (let d = 0; d < 4; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + (g * 7) + d + 1);
        const dayShort = date.toLocaleDateString('en-GB', { weekday: 'short' });
        const dateShort = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const fullLabel = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const slots = times.map((t, i) => {
          const taken = (g === 0 && d === 0 && i < 3) || (g === 0 && d === 1 && i === 4);
          return { id: `${g}-${d}-${i}`, time: t, taken, fullLabel };
        });
        days.push({ id: `${g}-${d}`, dayShort, dateShort, fullLabel, slots });
      }
      weeks.push({ label, days });
    }
    return weeks;
  }

  const weekData = buildDemoSlots();
  let selectedWeekIndex = 0;
  let selectedDayId = null;
  let selectedSlot = null;
  let holdExpiresAt = null;
  let holdTimerInterval = null;

  function currentWeek() { return weekData[selectedWeekIndex]; }
  function currentDay() {
    return currentWeek().days.find(d => d.id === selectedDayId) || currentWeek().days[0];
  }

  function renderSlots() {
    if (!selectedDayId) selectedDayId = weekData[0].days[0].id;
    const container = document.getElementById('slot-groups');
    container.innerHTML = '';

    /* Week tabs */
    const tabs = document.createElement('div');
    tabs.className = 'week-tabs';
    weekData.forEach((week, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'week-tab' + (i === selectedWeekIndex ? ' is-selected' : '');
      tab.textContent = week.label;
      tab.addEventListener('click', () => {
        selectedWeekIndex = i;
        selectedDayId = weekData[i].days[0].id;
        renderSlots();
      });
      tabs.appendChild(tab);
    });
    container.appendChild(tabs);

    /* Date strip for the active week */
    const strip = document.createElement('div');
    strip.className = 'date-strip';
    currentWeek().days.forEach(day => {
      const allTaken = day.slots.every(s => s.taken);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'date-chip' + (day.id === selectedDayId ? ' is-selected' : '');
      chip.disabled = allTaken;
      chip.innerHTML = `<span class="date-chip__day">${day.dayShort}</span><span class="date-chip__date">${day.dateShort}</span>`;
      if (!allTaken) {
        chip.addEventListener('click', () => {
          selectedDayId = day.id;
          renderSlots();
        });
      }
      strip.appendChild(chip);
    });
    container.appendChild(strip);

    /* Time grid for the selected day only */
    const day = currentDay();
    const remaining = day.slots.filter(s => !s.taken).length;

    const panel = document.createElement('div');
    panel.className = 'time-panel';

    const label = document.createElement('div');
    label.className = 'time-panel__label';
    label.innerHTML = `<span>${day.fullLabel}</span><span>${remaining} left</span>`;
    panel.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'time-grid';
    day.slots.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-slot';
      btn.textContent = slot.time;
      btn.disabled = slot.taken;
      btn.dataset.id = slot.id;
      if (selectedSlot && selectedSlot.id === slot.id) btn.classList.add('is-selected');
      if (!slot.taken) btn.addEventListener('click', () => selectSlot(slot, btn));
      grid.appendChild(btn);
    });
    panel.appendChild(grid);
    container.appendChild(panel);
  }

  function selectSlot(slot, btn) {
    document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectedSlot = { ...slot, date: slot.fullLabel };
    document.getElementById('slot-error').style.display = 'none';

    /* PLUG POINT: create-hold.js
       fetch('/.netlify/functions/create-hold', { method:'POST', body: JSON.stringify({slotId: slot.id}) })
       Demo: hold locally for ten minutes. */
    holdExpiresAt = Date.now() + 10 * 60 * 1000;
  }

  /* ---------------------------------------------------------------------
     6. MODAL NAVIGATION
     -------------------------------------------------------------------- */
  const modal = document.getElementById('booking-modal');
  const progressFill = document.getElementById('progress-fill');
  let currentScreen = 1;
  const totalScreens = 4;

  function openBooking() {
    modal.classList.add('is-active');
    document.body.classList.add('modal-open');
    if (!document.getElementById('slot-groups').children.length) renderSlots();
  }
  function closeBooking() {
    modal.classList.remove('is-active');
    document.body.classList.remove('modal-open');
  }

  document.querySelectorAll('[data-open-booking]').forEach(el => el.addEventListener('click', openBooking));
  document.querySelectorAll('[data-close-booking]').forEach(el => el.addEventListener('click', () => {
    closeBooking();
    setTimeout(() => { if (!modal.classList.contains('is-active')) goToScreen(1, true); }, 400);
  }));

  document.getElementById('booking-form') && document.getElementById('booking-form').addEventListener('submit', e => e.preventDefault());

  function goToScreen(n, silent) {
    if (n === currentScreen && !silent) return;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('is-active'));
    const target = document.querySelector(`.screen[data-screen="${n}"]`);
    if (target) target.classList.add('is-active');
    currentScreen = n;
    progressFill.style.width = `${(n / totalScreens) * 100}%`;
    document.querySelector('.modal-body').scrollTop = 0;
    if (n === 3) startHoldTimer();
  }

  document.querySelectorAll('[data-next-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentScreen === 1) {
        if (!selectedSlot) {
          document.getElementById('slot-error').style.display = 'inline';
          return;
        }
      }
      if (currentScreen === 2 && btn.dataset.validateForm !== undefined) {
        if (!validateForm()) return;
        buildSummary();
      }
      goToScreen(currentScreen + 1);
    });
  });
  document.querySelectorAll('[data-prev-screen]').forEach(btn => {
    btn.addEventListener('click', () => goToScreen(currentScreen - 1));
  });

  /* ---------------------------------------------------------------------
     7. FORM VALIDATION
     -------------------------------------------------------------------- */
  function validateForm() {
    const form = document.getElementById('booking-form');
    const errorBox = document.getElementById('form-error');
    if (!form.checkValidity()) {
      form.reportValidity();
      errorBox.classList.add('is-visible');
      return false;
    }
    errorBox.classList.remove('is-visible');
    return true;
  }

  function getFormData() {
    const form = document.getElementById('booking-form');
    const fd = new FormData(form);
    const obj = {};
    fd.forEach((v, k) => { obj[k] = v; });
    return obj;
  }

  function buildSummary() {
    const data = getFormData();
    const box = document.getElementById('booking-summary');
    box.innerHTML = `
      <strong>${escapeHtml(data.business || '')}</strong> &middot; ${escapeHtml(data.name || '')}<br>
      ${escapeHtml(selectedSlot ? selectedSlot.date + ' \u00B7 ' + selectedSlot.time : '')} WAT
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------------------------------------------------------------
     8. HOLD COUNTDOWN
     -------------------------------------------------------------------- */
  function startHoldTimer() {
    clearInterval(holdTimerInterval);
    if (!holdExpiresAt) holdExpiresAt = Date.now() + 10 * 60 * 1000;
    const timerEl = document.getElementById('hold-timer');

    function tick() {
      const remaining = Math.max(0, holdExpiresAt - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (remaining <= 0) {
        clearInterval(holdTimerInterval);
        handleHoldExpired();
      }
    }
    tick();
    holdTimerInterval = setInterval(tick, 1000);
  }

  function handleHoldExpired() {
    selectedSlot = null;
    document.querySelectorAll('.time-slot.is-selected').forEach(s => s.classList.remove('is-selected'));
    goToScreen(1);
    document.getElementById('slot-error').style.display = 'inline';
    document.getElementById('slot-error').textContent = 'Your hold expired. Pick a slot to continue.';
  }

  /* ---------------------------------------------------------------------
     9. PAYMENT METHOD SELECT
     -------------------------------------------------------------------- */
  let selectedPayMethod = 'card';
  document.querySelectorAll('[data-pay-method]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-pay-method]').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedPayMethod = btn.dataset.payMethod;
    });
  });

  /* ---------------------------------------------------------------------
     10. PAYMENT + LOCK
     PLUG POINT: initialize-payment.js and paystack-webhook.js. Demo mode
     simulates a short delay then proceeds, so the flow is clickable end
     to end before Paystack keys exist.
     -------------------------------------------------------------------- */
  const payButton = document.getElementById('pay-button');
  payButton.addEventListener('click', async () => {
    payButton.classList.add('is-loading');
    payButton.textContent = 'Processing\u2026';

    try {
      const data = getFormData();
      const payload = { slot: selectedSlot, method: selectedPayMethod, ...data };

      let confirmed = false;
      let reference = 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();

      try {
        const res = await fetch('/.netlify/functions/initialize-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.reference) { reference = json.reference; confirmed = true; }
          if (json.authorizationUrl) { window.location.href = json.authorizationUrl; return; }
        }
      } catch (err) { /* function not deployed yet, fall through to demo */ }

      if (!confirmed) await new Promise(r => setTimeout(r, 1400));

      showConfirmation(reference, data);
    } finally {
      payButton.classList.remove('is-loading');
      payButton.textContent = 'Pay and lock slot';
    }
  });

  function showConfirmation(reference, data) {
    clearInterval(holdTimerInterval);
    document.getElementById('confirm-datetime').textContent =
      selectedSlot ? `${selectedSlot.date} \u00B7 ${selectedSlot.time} WAT` : '';
    document.getElementById('confirm-ref').textContent = reference;
    document.getElementById('confirm-email').textContent = data.email || '';
    goToScreen(4);
  }

  /* ---------------------------------------------------------------------
     11. ESCAPE KEY + BACKDROP CLICK
     -------------------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-active')) closeBooking();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal && !(payButton && payButton.classList.contains('is-loading'))) closeBooking();
  });

})();
