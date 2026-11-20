/* ══════════════════════════════════════════
   LIFE DASHBOARD — app.js
   Vanilla JS, localStorage only.
══════════════════════════════════════════ */

'use strict';

/* ─── STORAGE HELPERS ─── */
const store = {
  get: (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

/* ─── TOAST ─── */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ══════════════════════════════════════════
   LIGHT / DARK MODE
══════════════════════════════════════════ */
(function initTheme() {
  const btn  = document.getElementById('theme-toggle');
  const icon = btn.querySelector('.theme-icon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    icon.textContent = theme === 'light' ? '☀️' : '🌙';
    store.set('theme', theme);
  }

  // restore saved theme (HTML already applied it before paint; just sync the icon)
  const saved = store.get('theme', 'dark');
  applyTheme(saved);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
})();

/* ══════════════════════════════════════════
   CLOCK, GREETING & CUSTOM NAME
══════════════════════════════════════════ */
(function initClock() {
  const clockEl      = document.getElementById('clock');
  const dateEl       = document.getElementById('date');
  const greetingEl   = document.getElementById('greeting');
  const editBtn      = document.getElementById('greeting-edit-btn');
  const inputWrap    = document.getElementById('greeting-input-wrap');
  const nameInput    = document.getElementById('name-input');
  const saveBtn      = document.getElementById('name-save');
  const cancelBtn    = document.getElementById('name-cancel');
  const namePrompt   = document.getElementById('name-prompt');

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  let userName = store.get('userName', '');

  function pad(n) { return String(n).padStart(2, '0'); }

  function greetingText(h) {
    const base =
      h < 5  ? 'Good night' :
      h < 12 ? 'Good morning' :
      h < 17 ? 'Good afternoon' :
      h < 21 ? 'Good evening' : 'Good night';
    return userName ? `${base}, ${userName}` : base;
  }

  // Show/hide the prompt vs pencil depending on whether a name is saved
  function syncNameUI() {
    if (userName) {
      namePrompt.style.display = 'none';   // name set → hide prompt
      editBtn.style.display    = '';       // show pencil for editing
    } else {
      namePrompt.style.display = '';       // no name → show "Set your name" button
      editBtn.style.display    = 'none';   // hide pencil (prompt covers the job)
    }
  }

  function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    const h12  = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    clockEl.textContent = `${pad(h12)}:${pad(m)}:${pad(s)} ${ampm}`;

    dateEl.textContent =
      `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    greetingEl.textContent = greetingText(h);
  }

  // ── open name editor ──
  function openEdit() {
    nameInput.value = userName;
    inputWrap.style.display  = 'flex';
    namePrompt.style.display = 'none';
    editBtn.style.display    = 'none';
    nameInput.focus();
    nameInput.select();
  }

  // ── save name ──
  function saveName() {
    const val = nameInput.value.trim();
    userName = val;
    store.set('userName', val);
    closeEdit();
    tick();
    showToast(val ? `Hi, ${val}! 👋` : 'Name cleared');
  }

  // ── close editor ──
  function closeEdit() {
    inputWrap.style.display = 'none';
    syncNameUI();
  }

  // Both the prompt button and the pencil open the same editor
  namePrompt.addEventListener('click', openEdit);
  editBtn.addEventListener('click', openEdit);
  saveBtn.addEventListener('click', saveName);
  cancelBtn.addEventListener('click', closeEdit);
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); saveName(); }
    if (e.key === 'Escape') { e.preventDefault(); closeEdit(); }
  });

  syncNameUI();
  tick();
  setInterval(tick, 1000);
})();

/* ══════════════════════════════════════════
   TO-DO LIST
══════════════════════════════════════════ */
(function initTodo() {
  const form      = document.getElementById('todo-form');
  const input     = document.getElementById('todo-input');
  const list      = document.getElementById('todo-list');
  const countEl   = document.getElementById('task-count');
  const emptyEl   = document.getElementById('todo-empty');
  const clearBtn  = document.getElementById('clear-done');

  let tasks = store.get('tasks', []);
  // task shape: { id, text, done }

  function save() { store.set('tasks', tasks); }

  function render() {
    list.innerHTML = '';

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (task.done ? ' done' : '');
      li.dataset.id = task.id;

      // checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = task.done;
      cb.addEventListener('change', () => toggle(task.id));

      // text span (view mode)
      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = task.text;

      // edit input (hidden by default)
      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'todo-edit-input';
      editInput.value = task.text;
      editInput.maxLength = 120;
      editInput.style.display = 'none';

      // ── enter edit mode ──
      function enterEdit() {
        if (task.done) return; // can't edit a completed task
        span.style.display = 'none';
        editInput.style.display = '';
        editInput.focus();
        editInput.select();
        editBtn.style.display = 'none';
        confirmBtn.style.display = '';
      }

      // ── commit edit ──
      function commitEdit() {
        const newText = editInput.value.trim();
        if (newText && newText !== task.text) {
          tasks = tasks.map(t => t.id === task.id ? { ...t, text: newText } : t);
          save();
        }
        render(); // re-render whether changed or not
      }

      // ── cancel edit ──
      function cancelEdit() {
        editInput.value = task.text;
        span.style.display = '';
        editInput.style.display = 'none';
        editBtn.style.display = '';
        confirmBtn.style.display = 'none';
      }

      editInput.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      });

      // edit (pencil) button
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon btn-icon-edit';
      editBtn.title = 'Edit task';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', enterEdit);

      // confirm (✓) button — hidden until editing
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn-icon btn-icon-confirm';
      confirmBtn.title = 'Save edit';
      confirmBtn.setAttribute('aria-label', 'Save edit');
      confirmBtn.innerHTML = '✓';
      confirmBtn.style.display = 'none';
      confirmBtn.addEventListener('click', commitEdit);

      // delete button
      const del = document.createElement('button');
      del.className = 'btn-icon';
      del.title = 'Delete task';
      del.setAttribute('aria-label', 'Delete task');
      del.innerHTML = '&times;';
      del.addEventListener('click', () => remove(task.id));

      li.append(cb, span, editInput, editBtn, confirmBtn, del);
      list.appendChild(li);
    });

    // count
    const done  = tasks.filter(t => t.done).length;
    const total = tasks.length;
    countEl.textContent = `${done} / ${total}`;

    // empty state
    emptyEl.classList.toggle('visible', total === 0);
    clearBtn.style.visibility = tasks.some(t => t.done) ? 'visible' : 'hidden';
  }

  function toggle(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    save(); render();
  }

  function remove(id) {
    tasks = tasks.filter(t => t.id !== id);
    save(); render();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ id: Date.now(), text, done: false });
    input.value = '';
    save(); render();
  });

  clearBtn.addEventListener('click', () => {
    const removed = tasks.filter(t => t.done).length;
    tasks = tasks.filter(t => !t.done);
    save(); render();
    if (removed) showToast(`Cleared ${removed} completed task${removed > 1 ? 's' : ''}`);
  });

  render();
})();

/* ══════════════════════════════════════════
   FOCUS TIMER
══════════════════════════════════════════ */
(function initTimer() {
  const displayEl    = document.getElementById('timer-display');
  const startBtn     = document.getElementById('timer-start');
  const resetBtn     = document.getElementById('timer-reset');
  const tabsEl       = document.getElementById('mode-tabs');
  const ringEl       = document.getElementById('ring-progress');
  const sessionNumEl = document.getElementById('session-count');
  const sessionLblEl = document.getElementById('session-label');
  const customWrap   = document.getElementById('custom-duration');
  const customInput  = document.getElementById('custom-mins');
  const customSetBtn = document.getElementById('custom-mins-set');

  const CIRCUMFERENCE = 2 * Math.PI * 52; // ≈ 326.73
  ringEl.style.strokeDasharray = CIRCUMFERENCE;

  // restore saved custom focus minutes (default 25)
  const savedFocusMins = store.get('focusMins', 25);

  // update the Focus tab label to reflect the saved duration
  const focusTab = tabsEl.querySelector('[data-label="Focus"]');
  focusTab.dataset.minutes = savedFocusMins;
  focusTab.textContent = `Focus ${savedFocusMins}`;

  let totalSeconds  = savedFocusMins * 60;
  let remaining     = totalSeconds;
  let running       = false;
  let interval      = null;
  let sessionCount  = store.get('timerSession', 1);
  let currentLabel  = 'Focus';
  let isFocusTab    = true;

  customInput.value = savedFocusMins;

  function pad(n) { return String(n).padStart(2, '0'); }

  function setDisplay() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    displayEl.textContent = `${pad(m)}:${pad(s)}`;
    const fraction = remaining / totalSeconds;
    ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
  }

  function stop() {
    clearInterval(interval);
    interval = null;
    running = false;
    startBtn.textContent = 'Start';
    // show custom duration panel only when on focus tab and not running
    customWrap.style.display = isFocusTab ? '' : 'none';
  }

  function start() {
    if (remaining === 0) return;
    running = true;
    startBtn.textContent = 'Pause';
    customWrap.style.display = 'none'; // hide while running
    interval = setInterval(() => {
      remaining--;
      setDisplay();
      if (remaining <= 0) {
        stop();
        sessionCount++;
        store.set('timerSession', sessionCount);
        sessionNumEl.textContent = sessionCount;
        ringEl.style.strokeDashoffset = CIRCUMFERENCE;
        playDoneBell();
        showToast(`⏰ ${currentLabel} session complete!`);
      }
    }, 1000);
  }

  startBtn.addEventListener('click', () => {
    if (running) stop(); else start();
  });

  resetBtn.addEventListener('click', () => {
    stop();
    remaining = totalSeconds;
    setDisplay();
  });

  // ── Custom duration set ──
  function applyCustomMins() {
    if (running) { showToast('Pause the timer before changing duration'); return; }
    const val = parseInt(customInput.value, 10);
    if (isNaN(val) || val < 1 || val > 120) {
      showToast('Enter a time between 1 and 120 minutes'); return;
    }
    store.set('focusMins', val);
    focusTab.dataset.minutes = val;
    focusTab.textContent = `Focus ${val}`;
    totalSeconds = val * 60;
    remaining    = totalSeconds;
    setDisplay();
    showToast(`Focus time set to ${val} min`);
  }

  customSetBtn.addEventListener('click', applyCustomMins);
  customInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); applyCustomMins(); }
  });

  // ── Mode tabs ──
  tabsEl.addEventListener('click', e => {
    const tab = e.target.closest('.mode-tab');
    if (!tab) return;
    if (running) { showToast('Pause the timer before switching modes'); return; }

    tabsEl.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const mins = Number(tab.dataset.minutes);
    currentLabel = tab.dataset.label;
    totalSeconds = mins * 60;
    remaining    = totalSeconds;
    sessionLblEl.textContent = `— ${currentLabel}`;

    isFocusTab = tab.dataset.label === 'Focus';
    customWrap.style.display = isFocusTab ? '' : 'none';

    const isBreak = tab.dataset.label !== 'Focus';
    ringEl.classList.toggle('break-mode', isBreak);

    setDisplay();
  });

  // restore session count + initial display
  sessionNumEl.textContent = sessionCount;
  customWrap.style.display = ''; // visible on load (focus tab is default)
  setDisplay();

  /* ─ Web Audio bell ─ */
  function playDoneBell() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    } catch (_) { /* AudioContext not available */ }
  }
})();

/* ══════════════════════════════════════════
   QUICK LINKS
══════════════════════════════════════════ */
(function initLinks() {
  const form     = document.getElementById('link-form');
  const labelIn  = document.getElementById('link-label');
  const urlIn    = document.getElementById('link-url');
  const grid     = document.getElementById('links-grid');
  const emptyEl  = document.getElementById('links-empty');

  let links = store.get('links', []);
  // link shape: { id, label, url }

  function save() { store.set('links', links); }

  function faviconUrl(url) {
    try {
      const origin = new URL(url).origin;
      return `${origin}/favicon.ico`;
    } catch { return null; }
  }

  function render() {
    grid.innerHTML = '';

    links.forEach(link => {
      const chip = document.createElement('div');
      chip.className = 'link-chip';

      // favicon
      const fav = faviconUrl(link.url);
      if (fav) {
        const img = document.createElement('img');
        img.className = 'link-favicon';
        img.src = fav;
        img.alt = '';
        img.onerror = () => img.remove(); // hide if broken
        chip.appendChild(img);
      }

      // anchor
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = link.label;
      chip.appendChild(a);

      // delete
      const del = document.createElement('button');
      del.className = 'btn-icon';
      del.title = 'Remove link';
      del.setAttribute('aria-label', 'Remove link');
      del.innerHTML = '&times;';
      del.addEventListener('click', () => {
        links = links.filter(l => l.id !== link.id);
        save(); render();
        showToast(`Removed "${link.label}"`);
      });
      chip.appendChild(del);

      grid.appendChild(chip);
    });

    emptyEl.classList.toggle('visible', links.length === 0);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const label = labelIn.value.trim();
    let   url   = urlIn.value.trim();

    if (!label || !url) { showToast('Enter both a label and a URL'); return; }

    // auto-prepend https:// if missing
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // basic URL validation
    try { new URL(url); } catch {
      showToast('That doesn\'t look like a valid URL'); return;
    }

    links.push({ id: Date.now(), label, url });
    labelIn.value = '';
    urlIn.value = '';
    save(); render();
  });

  render();
})();
