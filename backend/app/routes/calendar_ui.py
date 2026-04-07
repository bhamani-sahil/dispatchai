from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


@router.get("/calendar", response_class=HTMLResponse)
async def calendar_ui():
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DispatchAI — Calendar</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; }

  /* Top bar */
  .topbar { background: #1a1a2e; color: #fff; padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.2); position: sticky; top: 0; z-index: 50; }
  .topbar-left { display: flex; align-items: center; gap: 16px; }
  .logo { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
  .logo span { color: #4f8ef7; }
  .nav-link { font-size: 13px; color: #aaa; text-decoration: none; padding: 6px 12px; border-radius: 6px; transition: all 0.2s; }
  .nav-link:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .refresh-badge { font-size: 11px; color: #4f8ef7; background: rgba(79,142,247,0.15); padding: 4px 10px; border-radius: 20px; }

  /* Main layout */
  .main { padding: 24px 32px 40px; max-width: 1600px; margin: 0 auto; }
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .page-title { font-size: 26px; font-weight: 700; color: #1a1a2e; }
  .page-subtitle { font-size: 13px; color: #888; margin-top: 3px; }
  .stats { display: flex; gap: 12px; }
  .stat-card { background: #fff; border-radius: 12px; padding: 14px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); text-align: center; min-width: 110px; }
  .stat-number { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  .stat-label { font-size: 11px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-card.booked .stat-number { color: #e05252; }
  .stat-card.available .stat-number { color: #27ae60; }

  /* Calendar wrapper */
  .calendar-wrap { background: #fff; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.09); overflow: hidden; }

  /* Calendar grid — time column + day columns */
  .cal-grid { display: grid; }
  .cal-grid.cols-6 { grid-template-columns: 90px repeat(5, 1fr); }
  .cal-grid.cols-7 { grid-template-columns: 90px repeat(6, 1fr); }

  /* Day header row */
  .cal-corner { background: #1a1a2e; }
  .cal-day-header { background: #1a1a2e; color: #fff; padding: 16px 12px; text-align: center; border-left: 1px solid rgba(255,255,255,0.08); }
  .cal-day-header .day-name { font-size: 14px; font-weight: 700; }
  .cal-day-header .day-date { font-size: 11px; color: #aaa; margin-top: 3px; }
  .cal-day-header.today .day-name { color: #4f8ef7; }
  .cal-day-header.today .day-date { color: #4f8ef7; }

  /* Time label cells */
  .cal-time-label { background: #fafafa; border-top: 1px solid #efefef; padding: 0 14px; display: flex; align-items: center; justify-content: flex-end; min-height: 110px; }
  .cal-time-label span { font-size: 11px; font-weight: 600; color: #aaa; text-align: right; line-height: 1.3; }

  /* Slot cells */
  .cal-slot-cell { border-left: 1px solid #efefef; border-top: 1px solid #efefef; padding: 10px; min-height: 110px; position: relative; transition: background 0.15s; }
  .cal-slot-cell:hover { background: #fafeff; }

  /* Slot block inside cell */
  .slot-block { border-radius: 10px; padding: 10px 12px; height: 100%; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; display: flex; flex-direction: column; gap: 4px; }
  .slot-block:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.14); }
  .slot-block.available { background: linear-gradient(145deg, #e8f5e9, #d0edd3); border: 1.5px solid #a5d6a7; }
  .slot-block.booked { background: linear-gradient(145deg, #fff3f3, #fde0e0); border: 1.5px solid #ef9a9a; }
  .slot-block-time { font-size: 11px; font-weight: 700; color: #555; }
  .slot-block-status { font-size: 11px; font-weight: 600; }
  .slot-block.available .slot-block-status { color: #2e7d32; }
  .slot-block.booked .slot-block-status { color: #c0392b; }
  .slot-block-phone { font-size: 11px; color: #444; margin-top: 2px; }
  .slot-block-summary { font-size: 11px; color: #555; font-style: italic; margin-top: 4px; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
  .slot-block-more { font-size: 10px; color: #4f8ef7; margin-top: 4px; font-weight: 600; }

  /* Empty cell */
  .cal-closed-cell { border-left: 1px solid #efefef; border-top: 1px solid #efefef; background: repeating-linear-gradient(45deg, #f8f8f8, #f8f8f8 4px, #fafafa 4px, #fafafa 8px); min-height: 110px; }

  /* Modal */
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; align-items: center; justify-content: center; }
  .modal-overlay.active { display: flex; }
  .modal { background: #fff; border-radius: 18px; padding: 32px; width: 520px; max-width: 92vw; box-shadow: 0 24px 70px rgba(0,0,0,0.28); max-height: 90vh; overflow-y: auto; }
  .modal-header { margin-bottom: 20px; }
  .modal-title { font-size: 20px; font-weight: 700; color: #1a1a2e; }
  .modal-subtitle { font-size: 13px; color: #888; margin-top: 4px; }
  .modal-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
  .modal-badge.available { background: #e8f5e9; color: #27ae60; }
  .modal-badge.booked { background: #fce4ec; color: #e74c3c; }

  /* Job summary box */
  .summary-box { background: #f8f9ff; border: 1.5px solid #d8e4ff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .summary-box-label { font-size: 10px; font-weight: 700; color: #4f8ef7; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .summary-box-text { font-size: 14px; color: #1a1a2e; line-height: 1.6; }

  .detail-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; }
  .detail-icon { font-size: 16px; width: 26px; flex-shrink: 0; margin-top: 1px; }
  .detail-text { font-size: 13px; color: #333; line-height: 1.5; }
  .detail-text strong { color: #1a1a2e; font-weight: 600; }
  .divider { height: 1px; background: #f0f0f0; margin: 20px 0; }
  .share-section h3 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 12px; }
  .share-input-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .share-input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color 0.2s; }
  .share-input:focus { border-color: #4f8ef7; }
  .btn { padding: 9px 18px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-primary { background: #4f8ef7; color: #fff; }
  .btn-primary:hover { background: #3a7de8; }
  .btn-secondary { background: #f0f0f0; color: #333; }
  .btn-secondary:hover { background: #e0e0e0; }
  .modal-actions { display: flex; gap: 8px; margin-top: 24px; justify-content: flex-end; }
  .sent-badge { font-size: 11px; color: #27ae60; background: #e8f5e9; padding: 3px 8px; border-radius: 20px; display: none; }
  .quick-contacts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .quick-contact { font-size: 11px; background: #f0f4ff; color: #4f8ef7; border: 1px solid #c5d8ff; border-radius: 20px; padding: 3px 10px; cursor: pointer; }
  .quick-contact:hover { background: #4f8ef7; color: #fff; }
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-left">
    <div class="logo">Dispatch<span>AI</span></div>
    <a href="/test" class="nav-link">← SMS Tester</a>
  </div>
  <div class="refresh-badge" id="refresh-badge">● Live</div>
</div>

<div class="main">
  <div class="page-header">
    <div>
      <div class="page-title">Booking Calendar</div>
      <div class="page-subtitle">Test Plumbing Co · Next 7 days</div>
    </div>
    <div class="stats">
      <div class="stat-card available">
        <div class="stat-number" id="available-count">—</div>
        <div class="stat-label">Available</div>
      </div>
      <div class="stat-card booked">
        <div class="stat-number" id="booked-count">—</div>
        <div class="stat-label">Booked</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="total-count">—</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
  </div>

  <div class="calendar-wrap">
    <div class="cal-grid" id="calendar">
      <div style="padding:40px;text-align:center;color:#aaa;grid-column:1/-1">Loading...</div>
    </div>
  </div>
</div>

<!-- Booking detail modal -->
<div class="modal-overlay" id="modal" onclick="closeModal(event)">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="modal-title">Booking Details</div>
      <div class="modal-subtitle" id="modal-subtitle"></div>
      <span class="modal-badge" id="modal-badge"></span>
    </div>

    <div id="modal-available">
      <div class="detail-row">
        <div class="detail-icon">✅</div>
        <div class="detail-text">This slot is <strong>available</strong> — no booking yet.</div>
      </div>
    </div>

    <div id="modal-booked" style="display:none">
      <!-- Job summary — most important, shown first -->
      <div class="summary-box" id="modal-summary-box">
        <div class="summary-box-label">AI Job Summary</div>
        <div class="summary-box-text" id="modal-notes">—</div>
      </div>

      <div class="detail-row">
        <div class="detail-icon">📞</div>
        <div class="detail-text" id="modal-phone">—</div>
      </div>
      <div class="detail-row">
        <div class="detail-icon">📍</div>
        <div class="detail-text" id="modal-address">—</div>
      </div>

      <div class="divider"></div>

      <div class="share-section">
        <h3>Share with crew</h3>
        <div class="share-input-row">
          <input class="share-input" id="share-phone" type="tel" placeholder="e.g. 4031234567">
          <button class="btn btn-primary" onclick="shareBooking()">Send SMS</button>
        </div>
        <div class="quick-contacts" id="quick-contacts"></div>
        <span class="sent-badge" id="sent-badge">✓ Sent!</span>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Close</button>
    </div>
  </div>
</div>

<script>
  const QUICK_CONTACTS = [
    { name: "Mike (Lead)", phone: "4031110001" },
    { name: "Dave (Tech)", phone: "4031110002" },
  ];

  // All time slots in order — used to build rows
  const ALL_TIME_SLOTS = [
    "8:00-10:00am",
    "9:00-11:00am",
    "10:00am-12:00pm",
    "11:00am-1:00pm",
    "1:00-3:00pm",
    "3:00-5:00pm",
  ];

  // Friendly labels per time slot
  const TIME_LABELS = {
    "8:00-10:00am":    "8 – 10 am",
    "9:00-11:00am":    "9 – 11 am",
    "10:00am-12:00pm": "10 am – 12 pm",
    "11:00am-1:00pm":  "11 am – 1 pm",
    "1:00-3:00pm":     "1 – 3 pm",
    "3:00-5:00pm":     "3 – 5 pm",
  };

  let currentSlot = null;

  function closeModal(e) {
    if (e.target === document.getElementById('modal')) {
      document.getElementById('modal').classList.remove('active');
    }
  }

  function openSlot(slot) {
    currentSlot = slot;
    document.getElementById('modal-title').textContent = slot.date;
    document.getElementById('modal-subtitle').textContent = slot.time;
    const badge = document.getElementById('modal-badge');
    badge.textContent = slot.booked ? 'Booked' : 'Available';
    badge.className = `modal-badge ${slot.booked ? 'booked' : 'available'}`;
    document.getElementById('modal-available').style.display = slot.booked ? 'none' : 'block';
    document.getElementById('modal-booked').style.display = slot.booked ? 'block' : 'none';
    document.getElementById('sent-badge').style.display = 'none';
    document.getElementById('share-phone').value = '';

    if (slot.booked) {
      const notesEl = document.getElementById('modal-notes');
      if (slot.notes) {
        notesEl.textContent = slot.notes;
        document.getElementById('modal-summary-box').style.display = 'block';
      } else {
        document.getElementById('modal-summary-box').style.display = 'none';
      }
      document.getElementById('modal-phone').innerHTML = slot.customer_phone
        ? `<strong>Phone:</strong> ${slot.customer_phone}`
        : '<span style="color:#aaa">No phone on file</span>';
      document.getElementById('modal-address').innerHTML = slot.customer_address
        ? `<strong>Address:</strong> ${slot.customer_address}`
        : '<span style="color:#aaa">No address on file</span>';

      const qc = document.getElementById('quick-contacts');
      qc.innerHTML = QUICK_CONTACTS.map(c =>
        `<span class="quick-contact" onclick="document.getElementById('share-phone').value='${c.phone}'">${c.name}</span>`
      ).join('');
    }

    document.getElementById('modal').classList.add('active');
  }

  async function shareBooking() {
    if (!currentSlot) return;
    const phone = document.getElementById('share-phone').value.trim().replace(/\\D/g, '');
    if (!phone) return;

    const message = [
      'DispatchAI Booking',
      `${currentSlot.date} · ${currentSlot.time}`,
      currentSlot.customer_address ? '📍 ' + currentSlot.customer_address : '',
      currentSlot.customer_phone ? '📞 ' + currentSlot.customer_phone : '',
      currentSlot.notes ? '🔧 ' + currentSlot.notes : '',
    ].filter(Boolean).join('\\n');

    const res = await fetch('/api/calendar/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone.startsWith('1') ? `+${phone}` : `+1${phone}`, message }),
    });

    if (res.ok) {
      document.getElementById('sent-badge').style.display = 'inline';
      document.getElementById('share-phone').value = '';
    }
  }

  async function load() {
    const res = await fetch('/api/calendar/slots');
    const slots = await res.json();

    // Organize: byDay[date] = { meta, byTime[time] = slot }
    const byDay = {};
    const dayOrder = [];
    for (const s of slots) {
      if (!byDay[s.date]) {
        byDay[s.date] = { date: s.date, date_short: s.date_short, date_raw: s.date_raw, byTime: {} };
        dayOrder.push(s.date);
      }
      byDay[s.date].byTime[s.time] = s;
    }

    const days = dayOrder.map(d => byDay[d]);
    const numDays = days.length;
    const booked = slots.filter(s => s.booked).length;
    const available = slots.filter(s => !s.booked).length;

    document.getElementById('booked-count').textContent = booked;
    document.getElementById('available-count').textContent = available;
    document.getElementById('total-count').textContent = slots.length;

    // Determine which time rows exist across all days
    const usedTimes = new Set(slots.map(s => s.time));
    const timeRows = ALL_TIME_SLOTS.filter(t => usedTimes.has(t));

    const cal = document.getElementById('calendar');
    cal.innerHTML = '';
    cal.className = `cal-grid cols-${numDays + 1}`;

    // --- Header row ---
    const corner = document.createElement('div');
    corner.className = 'cal-corner';
    cal.appendChild(corner);

    const todayStr = new Date().toISOString().split('T')[0];
    for (const day of days) {
      const el = document.createElement('div');
      el.className = 'cal-day-header' + (day.date_raw === todayStr ? ' today' : '');
      const [dayName, ...rest] = day.date.split(',');
      el.innerHTML = `<div class="day-name">${dayName}</div><div class="day-date">${rest.join(',').trim()}</div>`;
      cal.appendChild(el);
    }

    // --- Time rows ---
    for (const time of timeRows) {
      // Time label cell
      const labelCell = document.createElement('div');
      labelCell.className = 'cal-time-label';
      labelCell.innerHTML = `<span>${(TIME_LABELS[time] || time).replace(' – ', '<br>')}</span>`;
      cal.appendChild(labelCell);

      // Day cells
      for (const day of days) {
        const slot = day.byTime[time];
        if (!slot) {
          // This day doesn't have this time slot (e.g. Saturday has different hours)
          const closed = document.createElement('div');
          closed.className = 'cal-closed-cell';
          cal.appendChild(closed);
          continue;
        }

        const cell = document.createElement('div');
        cell.className = 'cal-slot-cell';

        const block = document.createElement('div');
        block.className = `slot-block ${slot.booked ? 'booked' : 'available'}`;

        if (slot.booked) {
          block.innerHTML = `
            <div class="slot-block-status">● Booked</div>
            ${slot.customer_phone ? `<div class="slot-block-phone">📞 ${slot.customer_phone}</div>` : ''}
            ${slot.notes ? `<div class="slot-block-summary">${slot.notes}</div>` : '<div class="slot-block-summary" style="color:#bbb;font-style:italic">No summary yet</div>'}
            <div class="slot-block-more">View details →</div>
          `;
        } else {
          block.innerHTML = `
            <div class="slot-block-status">● Open</div>
            <div style="font-size:11px;color:#888;margin-top:4px">Tap to view</div>
          `;
        }

        block.onclick = () => openSlot(slot);
        cell.appendChild(block);
        cal.appendChild(cell);
      }
    }
  }

  load();
  setInterval(() => {
    load();
    const b = document.getElementById('refresh-badge');
    b.style.color = '#27ae60';
    setTimeout(() => b.style.color = '#4f8ef7', 500);
  }, 5000);
</script>
</body>
</html>"""
