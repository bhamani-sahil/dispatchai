from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


@router.get("/admin", response_class=HTMLResponse)
async def admin_ui():
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DispatchAI — Admin Tester</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; }
  .topbar { background: #1a1a2e; color: #fff; padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 18px; font-weight: 700; }
  .logo span { color: #4f8ef7; }
  .token-bar { font-size: 12px; color: #aaa; display: flex; align-items: center; gap: 10px; }
  .token-status { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .token-status.active { background: #1a3a1a; color: #27ae60; }
  .token-status.inactive { background: #3a1a1a; color: #e74c3c; }

  .main { padding: 24px 32px; max-width: 1100px; margin: 0 auto; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid.full { grid-template-columns: 1fr; }

  .card { background: #fff; border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); overflow: hidden; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-size: 14px; font-weight: 700; color: #1a1a2e; }
  .card-method { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .method-post { background: #e8f5e9; color: #27ae60; }
  .method-get { background: #e3f2fd; color: #1976d2; }
  .method-put { background: #fff3e0; color: #f57c00; }
  .method-delete { background: #fce4ec; color: #e74c3c; }
  .card-body { padding: 16px 20px; }

  .form-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 140px; }
  label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
  input, select, textarea { border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 10px; font-size: 13px; outline: none; font-family: inherit; transition: border-color 0.2s; width: 100%; }
  input:focus, select:focus, textarea:focus { border-color: #4f8ef7; }
  textarea { resize: vertical; min-height: 60px; }

  .btn { padding: 9px 18px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .btn-primary { background: #4f8ef7; color: #fff; }
  .btn-primary:hover { background: #3a7de8; }
  .btn-success { background: #27ae60; color: #fff; }
  .btn-success:hover { background: #219a52; }
  .btn-warning { background: #f57c00; color: #fff; }
  .btn-warning:hover { background: #e65100; }
  .btn-danger { background: #e74c3c; color: #fff; }
  .btn-danger:hover { background: #c0392b; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  .response-box { margin-top: 12px; background: #1a1a2e; border-radius: 8px; padding: 12px; font-size: 12px; color: #a8d8a8; font-family: 'Courier New', monospace; max-height: 200px; overflow-y: auto; white-space: pre-wrap; display: none; }
  .response-box.error { color: #f8a8a8; }
  .response-box.show { display: block; }

  .section-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 28px 0 14px; }
  .section-title:first-child { margin-top: 0; }

  .service-list { margin-top: 12px; }
  .service-item { background: #f8f9ff; border: 1px solid #e8ecff; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .service-info { font-size: 13px; color: #1a1a2e; }
  .service-info span { font-size: 11px; color: #888; margin-left: 8px; }
  .service-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .nav-links { display: flex; gap: 8px; }
  .nav-link { font-size: 12px; color: #aaa; text-decoration: none; padding: 5px 10px; border-radius: 6px; }
  .nav-link:hover { background: rgba(255,255,255,0.1); color: #fff; }

  .divider { height: 1px; background: #eee; margin: 28px 0; }
</style>
</head>
<body>

<div class="topbar">
  <div class="logo">Dispatch<span>AI</span> <span style="font-size:12px;color:#888;font-weight:400">Admin Tester</span></div>
  <div style="display:flex;align-items:center;gap:16px;">
    <div class="nav-links">
      <a href="/test" class="nav-link">SMS Test</a>
      <a href="/calendar" class="nav-link">Calendar</a>
    </div>
    <span class="token-status inactive" id="token-status">No Token</span>
  </div>
</div>

<div class="main">

  <!-- AUTH -->
  <div class="section-title">Auth</div>
  <div class="grid">

    <div class="card">
      <div class="card-header">
        <div class="card-title">Signup</div>
        <span class="card-method method-post">POST</span>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>Name</label>
            <input id="signup-name" placeholder="Sahil" value="Sahil">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input id="signup-email" type="email" placeholder="you@email.com">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input id="signup-password" type="password" placeholder="Test1234!" value="Test1234!">
          </div>
        </div>
        <button class="btn btn-success" onclick="signup()">Sign Up</button>
        <div class="response-box" id="signup-res"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Login</div>
        <span class="card-method method-post">POST</span>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input id="login-email" type="email" placeholder="you@email.com">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input id="login-password" type="password" placeholder="Test1234!" value="Test1234!">
          </div>
        </div>
        <button class="btn btn-primary" onclick="login()">Login</button>
        <div class="response-box" id="login-res"></div>
      </div>
    </div>

  </div>

  <div class="divider"></div>

  <!-- BUSINESS -->
  <div class="section-title">Business</div>
  <div class="grid">

    <div class="card">
      <div class="card-header">
        <div class="card-title">Create Business</div>
        <span class="card-method method-post">POST /api/business</span>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>Business Name</label>
            <input id="biz-name" placeholder="Test Plumbing Co" value="Test Plumbing Co">
          </div>
          <div class="form-group">
            <label>Agent Type</label>
            <select id="biz-type">
              <option value="plumbing">plumbing</option>
              <option value="hvac">hvac</option>
              <option value="auto_detailing">auto_detailing</option>
              <option value="junk_removal">junk_removal</option>
              <option value="garage_door_repair">garage_door_repair</option>
              <option value="pet_grooming">pet_grooming</option>
              <option value="general_handyman">general_handyman</option>
              <option value="electrical">electrical</option>
              <option value="locksmith">locksmith</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Phone</label>
            <input id="biz-phone" placeholder="+14031234567">
          </div>
          <div class="form-group">
            <label>Twilio Phone</label>
            <input id="biz-twilio" placeholder="+14178043751">
          </div>
          <div class="form-group">
            <label>Emergency Phone</label>
            <input id="biz-emergency" placeholder="+14031234567">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Service Area</label>
            <input id="biz-area" placeholder="Calgary NW">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Custom Instructions (optional)</label>
            <textarea id="biz-instructions" placeholder="e.g. Always offer a senior discount"></textarea>
          </div>
        </div>
        <button class="btn btn-success" onclick="createBusiness()">Create Business</button>
        <div class="response-box" id="create-biz-res"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Get / Update Business</div>
        <span class="card-method method-get">GET /api/business</span>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" onclick="getBusiness()">Get My Business</button>
        <div class="response-box" id="get-biz-res"></div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #f0f0f0;">
          <div style="font-size:11px;font-weight:700;color:#888;margin-bottom:10px;">UPDATE BUSINESS</div>
          <div class="form-row">
            <div class="form-group">
              <label>Business Name</label>
              <input id="upd-biz-name" placeholder="Updated Name">
            </div>
            <div class="form-group">
              <label>Agent Type</label>
              <select id="upd-biz-type">
                <option value="plumbing">plumbing</option>
                <option value="hvac">hvac</option>
                <option value="auto_detailing">auto_detailing</option>
                <option value="junk_removal">junk_removal</option>
                <option value="garage_door_repair">garage_door_repair</option>
                <option value="pet_grooming">pet_grooming</option>
                <option value="general_handyman">general_handyman</option>
                <option value="electrical">electrical</option>
                <option value="locksmith">locksmith</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Emergency Phone</label>
              <input id="upd-biz-emergency" placeholder="+14031234567">
            </div>
            <div class="form-group">
              <label>Service Area</label>
              <input id="upd-biz-area" placeholder="Calgary SW">
            </div>
          </div>
          <button class="btn btn-warning" onclick="updateBusiness()">Update Business</button>
          <div class="response-box" id="upd-biz-res"></div>
        </div>
      </div>
    </div>

  </div>

  <div class="divider"></div>

  <!-- SERVICES -->
  <div class="section-title">Services</div>
  <div class="grid">

    <div class="card">
      <div class="card-header">
        <div class="card-title">Add Service</div>
        <span class="card-method method-post">POST /api/business/services</span>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>Service Name</label>
            <input id="svc-name" placeholder="Drain Cleaning">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Description</label>
            <input id="svc-desc" placeholder="Full snake and flush">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Price Min ($)</label>
            <input id="svc-min" type="number" placeholder="150">
          </div>
          <div class="form-group">
            <label>Price Max ($)</label>
            <input id="svc-max" type="number" placeholder="300">
          </div>
          <div class="form-group">
            <label>Duration (min)</label>
            <input id="svc-duration" type="number" placeholder="60">
          </div>
        </div>
        <button class="btn btn-success" onclick="addService()">Add Service</button>
        <div class="response-box" id="add-svc-res"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Services List</div>
        <span class="card-method method-get">GET /api/business/services</span>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" onclick="getServices()">Load Services</button>
        <div class="service-list" id="service-list"></div>
        <div class="response-box" id="get-svc-res"></div>
      </div>
    </div>

  </div>

</div>

<!-- Edit service modal -->
<div id="edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:14px;padding:28px;width:440px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
    <div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:16px;">Edit Service</div>
    <input type="hidden" id="edit-svc-id">
    <div class="form-row">
      <div class="form-group">
        <label>Name</label>
        <input id="edit-svc-name">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Description</label>
        <input id="edit-svc-desc">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Price Min</label>
        <input id="edit-svc-min" type="number">
      </div>
      <div class="form-group">
        <label>Price Max</label>
        <input id="edit-svc-max" type="number">
      </div>
      <div class="form-group">
        <label>Duration (min)</label>
        <input id="edit-svc-duration" type="number">
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-warning" onclick="saveEdit()">Save</button>
      <button class="btn" style="background:#f0f0f0;color:#333;" onclick="closeEdit()">Cancel</button>
    </div>
    <div class="response-box" id="edit-svc-res"></div>
  </div>
</div>

<script>
  let TOKEN = localStorage.getItem('dispatch_token') || '';
  updateTokenStatus();

  function updateTokenStatus() {
    const el = document.getElementById('token-status');
    if (TOKEN) {
      el.textContent = 'Token Active';
      el.className = 'token-status active';
    } else {
      el.textContent = 'No Token';
      el.className = 'token-status inactive';
    }
  }

  function show(id, data, isError) {
    const el = document.getElementById(id);
    el.textContent = JSON.stringify(data, null, 2);
    el.className = 'response-box show' + (isError ? ' error' : '');
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` };
  }

  async function call(method, url, body, resId) {
    try {
      const opts = { method, headers: authHeaders() };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      const data = await res.json().catch(() => ({}));
      show(resId, data, !res.ok);
      return res.ok ? data : null;
    } catch (e) {
      show(resId, { error: e.message }, true);
      return null;
    }
  }

  async function signup() {
    const data = await call('POST', '/api/auth/signup', {
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value,
    }, 'signup-res');
    if (data?.access_token) {
      TOKEN = data.access_token;
      localStorage.setItem('dispatch_token', TOKEN);
      updateTokenStatus();
    }
  }

  async function login() {
    const data = await call('POST', '/api/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value,
    }, 'login-res');
    if (data?.access_token) {
      TOKEN = data.access_token;
      localStorage.setItem('dispatch_token', TOKEN);
      updateTokenStatus();
    }
  }

  async function createBusiness() {
    await call('POST', '/api/business', {
      name: document.getElementById('biz-name').value,
      agent_type: document.getElementById('biz-type').value,
      phone: document.getElementById('biz-phone').value || null,
      twilio_phone: document.getElementById('biz-twilio').value || null,
      emergency_phone: document.getElementById('biz-emergency').value || null,
      service_area: document.getElementById('biz-area').value || null,
      custom_instructions: document.getElementById('biz-instructions').value || null,
    }, 'create-biz-res');
  }

  async function getBusiness() {
    await call('GET', '/api/business', null, 'get-biz-res');
  }

  async function updateBusiness() {
    await call('PUT', '/api/business', {
      name: document.getElementById('upd-biz-name').value,
      agent_type: document.getElementById('upd-biz-type').value,
      emergency_phone: document.getElementById('upd-biz-emergency').value || null,
      service_area: document.getElementById('upd-biz-area').value || null,
    }, 'upd-biz-res');
  }

  async function addService() {
    const data = await call('POST', '/api/business/services', {
      name: document.getElementById('svc-name').value,
      description: document.getElementById('svc-desc').value || null,
      price_min: parseFloat(document.getElementById('svc-min').value) || null,
      price_max: parseFloat(document.getElementById('svc-max').value) || null,
      duration_minutes: parseInt(document.getElementById('svc-duration').value) || null,
    }, 'add-svc-res');
    if (data) getServices();
  }

  async function getServices() {
    const res = await fetch('/api/business/services', { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    if (!res.ok) { show('get-svc-res', data, true); return; }

    const list = document.getElementById('service-list');
    if (!data.length) { list.innerHTML = '<div style="font-size:13px;color:#aaa;margin-top:10px;">No services yet.</div>'; return; }
    list.innerHTML = data.map(s => `
      <div class="service-item">
        <div class="service-info">
          <strong>${s.name}</strong>
          <span>${s.price_min ? '$' + s.price_min + (s.price_max ? '-$' + s.price_max : '') : 'No price'}</span>
          ${s.duration_minutes ? `<span>${s.duration_minutes}min</span>` : ''}
        </div>
        <div class="service-actions">
          <button class="btn btn-warning btn-sm" onclick="openEdit(${JSON.stringify(s).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteService('${s.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function openEdit(s) {
    document.getElementById('edit-svc-id').value = s.id;
    document.getElementById('edit-svc-name').value = s.name;
    document.getElementById('edit-svc-desc').value = s.description || '';
    document.getElementById('edit-svc-min').value = s.price_min || '';
    document.getElementById('edit-svc-max').value = s.price_max || '';
    document.getElementById('edit-svc-duration').value = s.duration_minutes || '';
    document.getElementById('edit-modal').style.display = 'flex';
    document.getElementById('edit-svc-res').className = 'response-box';
  }

  function closeEdit() {
    document.getElementById('edit-modal').style.display = 'none';
  }

  async function saveEdit() {
    const id = document.getElementById('edit-svc-id').value;
    const data = await call('PUT', `/api/business/services/${id}`, {
      name: document.getElementById('edit-svc-name').value,
      description: document.getElementById('edit-svc-desc').value || null,
      price_min: parseFloat(document.getElementById('edit-svc-min').value) || null,
      price_max: parseFloat(document.getElementById('edit-svc-max').value) || null,
      duration_minutes: parseInt(document.getElementById('edit-svc-duration').value) || null,
    }, 'edit-svc-res');
    if (data) { closeEdit(); getServices(); }
  }

  async function deleteService(id) {
    if (!confirm('Delete this service?')) return;
    const res = await fetch(`/api/business/services/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok || res.status === 204) getServices();
    else show('get-svc-res', { error: 'Delete failed' }, true);
  }
</script>
</body>
</html>"""
