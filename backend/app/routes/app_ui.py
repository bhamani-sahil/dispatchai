from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


@router.get("/app", response_class=HTMLResponse)
async def app_ui():
    return HTML


HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DispatchAI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #08080f;
  --surface: #10101a;
  --surface2: #161620;
  --border: #1e1e2c;
  --border2: #2a2a3a;
  --accent: #6366f1;
  --accent-hover: #4f52d4;
  --green: #10b981;
  --orange: #f59e0b;
  --red: #ef4444;
  --text: #f0f0fa;
  --text2: #a0a0b8;
  --muted: #606078;
  --card: #0f0f18;
  --card2: #14141e;
}
body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

/* ── Animations ── */
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
@keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
@keyframes scaleIn { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }
@keyframes checkDraw { from { stroke-dashoffset:60; } to { stroke-dashoffset:0; } }

.tab-content.active { animation: fadeIn 0.2s ease-out; }

/* ── Toast ── */
.toast { position:fixed; bottom:24px; right:24px; background:var(--surface2); border:1px solid var(--border2); color:var(--text); padding:12px 20px; border-radius:10px; font-size:14px; font-weight:500; transform:translateY(20px); opacity:0; transition:all .3s ease; z-index:9999; max-width:340px; }
.toast.show { transform:translateY(0); opacity:1; }
.toast.toast-success { border-left:3px solid var(--green); }
.toast.toast-error { border-left:3px solid var(--red); }
.toast.toast-info { border-left:3px solid var(--accent); }

/* ── Auth screen ── */
#auth-screen { display:grid; min-height:100vh; }
.auth-split { display:grid; grid-template-columns:1fr 1fr; min-height:100vh; }
@media(max-width:768px){ .auth-split { grid-template-columns:1fr; } .auth-brand { display:none !important; } }

.auth-brand {
  background: linear-gradient(145deg, #0c0c1a 0%, #10102a 60%, #141428 100%);
  border-right:1px solid var(--border);
  display:flex; flex-direction:column; justify-content:center; padding:60px;
  position:relative; overflow:hidden;
}
.auth-brand::before {
  content:''; position:absolute; top:-40%; left:-10%;
  width:500px; height:500px; border-radius:50%;
  background: radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%);
  pointer-events:none;
}
.auth-brand .brand-logo { font-size:28px; font-weight:700; color:var(--text); margin-bottom:16px; letter-spacing:-.5px; }
.auth-brand .brand-logo span { color:var(--accent); }
.auth-brand .brand-tagline { font-size:32px; font-weight:700; color:var(--text); line-height:1.25; margin-bottom:12px; letter-spacing:-.5px; }
.auth-brand .brand-sub { font-size:16px; color:var(--text2); margin-bottom:48px; line-height:1.6; }
.brand-bullets { display:flex; flex-direction:column; gap:20px; }
.brand-bullet { display:flex; align-items:flex-start; gap:14px; }
.brand-bullet .bb-icon { font-size:20px; flex-shrink:0; margin-top:2px; }
.brand-bullet .bb-text strong { display:block; font-size:14px; font-weight:600; color:var(--text); margin-bottom:2px; }
.brand-bullet .bb-text span { font-size:13px; color:var(--muted); line-height:1.5; }

.auth-right {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:48px 40px; background:var(--bg);
}
.auth-form-wrap { width:100%; max-width:400px; }

/* Step dots */
.step-dots { display:flex; gap:8px; justify-content:center; margin-bottom:36px; }
.step-dot { width:8px; height:8px; border-radius:50%; background:var(--border2); transition:all .25s ease; }
.step-dot.active { background:var(--accent); width:24px; border-radius:4px; }
.step-dot.done { background:var(--green); }

.auth-title { font-size:24px; font-weight:700; color:var(--text); margin-bottom:6px; letter-spacing:-.3px; }
.auth-sub { font-size:14px; color:var(--muted); margin-bottom:28px; }
.auth-tabs { display:flex; gap:6px; margin-bottom:24px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:4px; }
.auth-tabs button { flex:1; background:none; border:none; color:var(--muted); border-radius:7px; padding:8px 12px; font-size:13px; font-weight:500; cursor:pointer; transition:all .15s ease; font-family:inherit; }
.auth-tabs button.active { background:var(--accent); color:#fff; }
.auth-field { margin-bottom:14px; }
.auth-field label { display:block; font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:6px; }
.auth-field input, .auth-field textarea, .auth-field select {
  width:100%; background:var(--surface); border:1px solid var(--border); border-radius:8px;
  padding:10px 14px; color:var(--text); font-size:14px; outline:none; font-family:inherit;
  transition:all .15s ease;
}
.auth-field input:focus, .auth-field textarea:focus, .auth-field select:focus { border-color:var(--accent); background:var(--surface2); }
.auth-field select { appearance:none; cursor:pointer; }
.auth-field textarea { resize:vertical; min-height:80px; }
.auth-err { color:var(--red); font-size:13px; margin-top:8px; text-align:center; min-height:18px; }
.auth-btn {
  width:100%; background:var(--accent); color:#fff; border:none; border-radius:8px;
  padding:12px; font-size:15px; font-weight:600; cursor:pointer; margin-top:8px;
  transition:all .15s ease; font-family:inherit; letter-spacing:-.1px;
}
.auth-btn:hover { background:var(--accent-hover); transform:translateY(-1px); }
.auth-btn:active { transform:translateY(0); }
.auth-btn:disabled { opacity:.4; cursor:not-allowed; transform:none; }
.auth-switch { text-align:center; margin-top:16px; font-size:13px; color:var(--muted); }
.auth-switch a { color:var(--accent); cursor:pointer; text-decoration:none; font-weight:500; }

/* ── Step 2: Agent picker ── */
.agent-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:24px; }
@media(max-width:480px){ .agent-grid { grid-template-columns:repeat(2,1fr); } }
.agent-card {
  background:var(--surface); border:1.5px solid var(--border); border-radius:10px;
  padding:14px 12px; cursor:pointer; text-align:center; transition:all .15s ease;
}
.agent-card:hover { border-color:var(--border2); background:var(--surface2); transform:translateY(-1px); }
.agent-card.selected { border-color:var(--accent); background:rgba(99,102,241,.08); }
.agent-card .ac-emoji { font-size:22px; margin-bottom:6px; }
.agent-card .ac-name { font-size:12px; font-weight:600; color:var(--text); margin-bottom:2px; }
.agent-card .ac-desc { font-size:10px; color:var(--muted); line-height:1.4; }

/* ── Step 4: Success ── */
.success-screen { text-align:center; padding:20px 0; }
.success-check { width:72px; height:72px; margin:0 auto 24px; background:rgba(16,185,129,.1); border-radius:50%; display:flex; align-items:center; justify-content:center; }
.success-check svg { width:36px; height:36px; }
.success-check svg path { stroke:var(--green); stroke-width:2.5; fill:none; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:60; stroke-dashoffset:60; animation:checkDraw .5s ease .2s forwards; }
.success-biz { font-size:22px; font-weight:700; color:var(--text); margin-bottom:8px; letter-spacing:-.3px; }
.success-number { font-size:14px; color:var(--muted); margin-bottom:32px; }
.success-number strong { color:var(--green); }

/* ── App shell ── */
#app-screen { display:none; flex-direction:column; min-height:100vh; }

/* ── Topbar ── */
.topbar {
  background:var(--surface); border-bottom:1px solid var(--border);
  padding:0 20px; display:flex; align-items:center; gap:16px; height:56px;
  position:sticky; top:0; z-index:50;
}
.topbar .logo { font-size:17px; font-weight:700; color:var(--text); letter-spacing:-.3px; flex-shrink:0; }
.topbar .logo span { color:var(--accent); }
.topbar-center { flex:1; display:flex; align-items:center; justify-content:center; gap:10px; }
.topbar-biz-name { font-size:13px; font-weight:500; color:var(--text2); }
.topbar-agent-badge {
  font-size:10px; font-weight:600; padding:3px 8px; border-radius:20px;
  background:rgba(99,102,241,.15); color:var(--accent); border:1px solid rgba(99,102,241,.25);
  text-transform:capitalize; letter-spacing:.2px;
}
.hamburger-btn {
  background:none; border:1px solid var(--border); color:var(--text2); border-radius:8px;
  width:36px; height:36px; display:flex; align-items:center; justify-content:center;
  cursor:pointer; font-size:16px; transition:all .15s ease; flex-shrink:0;
}
.hamburger-btn:hover { border-color:var(--border2); color:var(--text); background:var(--surface2); }

/* ── Tabs ── */
.tabs { display:flex; gap:2px; padding:0 20px; background:var(--surface); border-bottom:1px solid var(--border); }
.tab { padding:13px 16px; font-size:13px; font-weight:500; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; white-space:nowrap; transition:all .15s ease; }
.tab:hover { color:var(--text2); }
.tab.active { color:var(--accent); border-bottom-color:var(--accent); }
.tab-content { display:none; padding:24px; flex:1; overflow-y:auto; }
.tab-content.active { display:block; }

/* ── Drawer ── */
.drawer-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:200; }
.drawer-overlay.open { display:block; }
.drawer {
  position:fixed; top:0; right:0; bottom:0; width:300px;
  background:var(--surface); border-left:1px solid var(--border);
  z-index:201; transform:translateX(100%); transition:transform 250ms ease-out;
  display:flex; flex-direction:column; overflow-y:auto;
}
.drawer.open { transform:translateX(0); }
.drawer-header { padding:20px; border-bottom:1px solid var(--border); }
.drawer-biz { font-size:15px; font-weight:600; color:var(--text); margin-bottom:6px; }
.drawer-badge { font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; background:rgba(99,102,241,.15); color:var(--accent); border:1px solid rgba(99,102,241,.25); display:inline-block; }
.drawer-body { flex:1; padding:12px 0; }
.drawer-item {
  display:flex; align-items:center; gap:12px; padding:12px 20px;
  font-size:14px; font-weight:500; color:var(--text2); cursor:pointer;
  transition:all .15s ease; border:none; background:none; width:100%; text-align:left; font-family:inherit;
}
.drawer-item:hover { background:var(--surface2); color:var(--text); }
.drawer-item .di-icon { font-size:16px; width:20px; text-align:center; flex-shrink:0; }
.drawer-item.danger { color:var(--red); }
.drawer-item.danger:hover { background:rgba(239,68,68,.08); }
.drawer-divider { height:1px; background:var(--border); margin:8px 20px; }
.drawer-form { padding:16px 20px; border-top:1px solid var(--border); }
.drawer-form .df-title { font-size:12px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:14px; }
.drawer-field { margin-bottom:12px; }
.drawer-field label { display:block; font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; }
.drawer-field input, .drawer-field textarea, .drawer-field select {
  width:100%; background:var(--bg); border:1px solid var(--border); border-radius:7px;
  padding:8px 11px; color:var(--text); font-size:13px; outline:none; font-family:inherit;
  transition:all .15s ease;
}
.drawer-field input:focus, .drawer-field textarea:focus, .drawer-field select:focus { border-color:var(--accent); }
.drawer-field select { appearance:none; cursor:pointer; }
.drawer-field textarea { resize:vertical; min-height:70px; }
.drawer-copy-wrap { display:flex; gap:6px; align-items:center; }
.drawer-copy-wrap input { flex:1; }
.drawer-copy-btn { background:var(--surface2); border:1px solid var(--border); color:var(--text2); border-radius:7px; padding:8px 10px; font-size:12px; cursor:pointer; white-space:nowrap; transition:all .15s ease; font-family:inherit; }
.drawer-copy-btn:hover { border-color:var(--accent); color:var(--accent); }

/* ── Cards & layout ── */
.card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px; transition:all .15s ease; }
.card:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(0,0,0,.4); }
.metric-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:14px; margin-bottom:24px; }
.metric-card {
  background:var(--card); border:1px solid var(--border); border-radius:12px;
  padding:18px 20px; position:relative; overflow:hidden; transition:all .15s ease;
}
.metric-card:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(0,0,0,.4); }
.metric-card .mc-bar { height:3px; border-radius:3px 3px 0 0; position:absolute; top:0; left:0; right:0; }
.metric-card .mc-bar.green { background:var(--green); }
.metric-card .mc-bar.indigo { background:var(--accent); }
.metric-card .mc-bar.blue { background:#3b82f6; }
.metric-card .mc-bar.orange { background:var(--orange); }
.metric-card .mc-bar.red { background:var(--red); }
.metric-card .mc-bar.muted { background:var(--border2); }
.metric-card .label { font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:10px; }
.metric-card .value { font-size:28px; font-weight:700; color:var(--text); line-height:1; letter-spacing:-.5px; }
.metric-card .sub { font-size:12px; color:var(--muted); margin-top:6px; }
.section-title { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:14px; }
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
@media(max-width:800px){ .grid-2 { grid-template-columns:1fr; } }

/* ── Badges ── */
.badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; letter-spacing:.2px; }
.badge-green { background:rgba(16,185,129,.12); color:var(--green); border:1px solid rgba(16,185,129,.2); }
.badge-orange { background:rgba(245,158,11,.12); color:var(--orange); border:1px solid rgba(245,158,11,.2); }
.badge-red { background:rgba(239,68,68,.12); color:var(--red); border:1px solid rgba(239,68,68,.2); }
.badge-blue { background:rgba(59,130,246,.12); color:#60a5fa; border:1px solid rgba(59,130,246,.2); }
.badge-grey { background:rgba(96,96,120,.12); color:var(--muted); border:1px solid rgba(96,96,120,.2); }

/* ── Buttons ── */
.btn { border:none; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s ease; font-family:inherit; }
.btn-primary { background:var(--accent); color:#fff; }
.btn-primary:hover { background:var(--accent-hover); transform:translateY(-1px); }
.btn-danger { background:var(--red); color:#fff; }
.btn-danger:hover { opacity:.85; }
.btn-success { background:var(--green); color:#fff; }
.btn-success:hover { opacity:.85; }
.btn-ghost { background:none; border:1px solid var(--border2); color:var(--text2); }
.btn-ghost:hover { border-color:var(--border2); color:var(--text); background:var(--surface2); }
.btn:disabled { opacity:.4; cursor:not-allowed; transform:none !important; }

/* ── Period picker ── */
.period-bar { display:flex; gap:6px; margin-bottom:20px; flex-wrap:wrap; }
.period-btn { background:none; border:1px solid var(--border); color:var(--muted); border-radius:20px; padding:6px 14px; font-size:12px; font-weight:500; cursor:pointer; transition:all .15s ease; font-family:inherit; }
.period-btn:hover { border-color:var(--border2); color:var(--text2); }
.period-btn.active { background:var(--accent); border-color:var(--accent); color:#fff; }

/* ── Agent toggle ── */
.agent-toggle-bar {
  display:flex; align-items:center; gap:12px; background:var(--card);
  border:1px solid var(--border); border-radius:12px; padding:16px 20px; margin-bottom:20px;
}
.agent-toggle-bar .status { flex:1; }
.agent-toggle-bar .status-label { font-size:13px; font-weight:600; }
.agent-toggle-bar .status-sub { font-size:12px; color:var(--muted); margin-top:2px; }
.toggle-switch { position:relative; width:44px; height:24px; cursor:pointer; flex-shrink:0; }
.toggle-switch input { opacity:0; width:0; height:0; }
.toggle-slider { position:absolute; inset:0; background:var(--border2); border-radius:24px; transition:.3s; }
.toggle-slider:before { content:''; position:absolute; width:18px; height:18px; left:3px; top:3px; background:#fff; border-radius:50%; transition:.3s; }
.toggle-switch input:checked + .toggle-slider { background:var(--green); }
.toggle-switch input:checked + .toggle-slider:before { transform:translateX(20px); }

/* ── Lists ── */
.list-item { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .15s ease; }
.list-item:hover { background:var(--surface2); }
.list-item:last-child { border-bottom:none; }
.list-item .main { flex:1; min-width:0; }
.list-item .title { font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.list-item .sub { font-size:12px; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.list-item .right { text-align:right; flex-shrink:0; }
.list-item .time { font-size:11px; color:var(--muted); }

/* ── Upcoming jobs ── */
.job-item { display:flex; align-items:center; gap:12px; padding:11px 14px; border-bottom:1px solid var(--border); border-left:3px solid var(--green); }
.job-item:last-child { border-bottom:none; }
.job-item .ji-date { font-size:11px; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px; }
.job-item .ji-title { font-size:13px; font-weight:500; }
.job-item .ji-sub { font-size:11px; color:var(--muted); margin-top:1px; }
.job-item .ji-right { text-align:right; flex-shrink:0; margin-left:auto; }

/* ── Inbox ── */
.inbox-layout { display:grid; grid-template-columns:300px 1fr; gap:0; height:calc(100vh - 130px); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.convo-list { border-right:1px solid var(--border); overflow-y:auto; background:var(--card); }
.convo-detail { display:flex; flex-direction:column; background:var(--bg); }
.convo-detail-header { padding:14px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; background:var(--card); }
.messages-area { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }
.msg { max-width:72%; padding:10px 14px; border-radius:14px; font-size:14px; line-height:1.55; }
.msg.customer { background:var(--surface2); color:var(--text); align-self:flex-start; border-bottom-left-radius:4px; border:1px solid var(--border); }
.msg.ai_agent { background:var(--accent); color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }
.msg.business_owner { background:rgba(16,185,129,.12); color:#a7f3d0; align-self:flex-end; border-bottom-right-radius:4px; border:1px solid rgba(16,185,129,.2); }
.msg .msg-meta { font-size:10px; opacity:.55; margin-top:5px; }
.reply-bar { padding:12px 14px; border-top:1px solid var(--border); display:flex; gap:8px; align-items:flex-end; background:var(--card); }
.reply-bar textarea { flex:1; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 12px; color:var(--text); font-size:14px; resize:none; outline:none; font-family:inherit; transition:border-color .15s ease; }
.reply-bar textarea:focus { border-color:var(--accent); }
.no-selection { display:flex; align-items:center; justify-content:center; flex:1; color:var(--muted); font-size:14px; flex-direction:column; gap:8px; }
.no-selection .ns-icon { font-size:32px; opacity:.4; }
@media(max-width:700px){ .inbox-layout { grid-template-columns:1fr; } }

/* ── Scheduler ── */
.booking-card {
  background:var(--card); border:1px solid var(--border); border-radius:10px;
  padding:16px; margin-bottom:8px; transition:all .15s ease;
  border-left:3px solid var(--green);
}
.booking-card:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(0,0,0,.4); }
.booking-card .bk-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.booking-card .bk-time { font-size:15px; font-weight:700; letter-spacing:-.2px; }
.booking-card .bk-detail { font-size:13px; color:var(--text2); margin-bottom:4px; }
.booking-card .bk-summary { font-size:12px; color:var(--muted); background:var(--bg); border-radius:6px; padding:8px 10px; margin-top:10px; border:1px solid var(--border); }
.booking-card .bk-actions { display:flex; gap:6px; margin-top:12px; flex-wrap:wrap; }
.slot-available { background:none; border:1.5px dashed var(--border2); border-radius:10px; padding:12px 16px; margin-bottom:8px; display:flex; align-items:center; gap:12px; opacity:.7; transition:all .15s ease; }
.slot-available:hover { border-color:var(--accent); opacity:1; background:rgba(99,102,241,.04); }
.slot-available .sl-time { font-size:14px; font-weight:600; color:var(--muted); flex:1; }
.date-group-header {
  font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase;
  letter-spacing:.7px; margin:24px 0 10px; display:flex; align-items:center; gap:10px;
}
.date-group-header .today-badge {
  font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px;
  background:rgba(99,102,241,.15); color:var(--accent); border:1px solid rgba(99,102,241,.25);
  text-transform:uppercase; letter-spacing:.5px;
}
.sched-divider { height:1px; background:var(--border); margin:10px 0; opacity:.5; }

/* ── Modal ── */
.modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:100; align-items:center; justify-content:center; }
.modal-overlay.open { display:flex; }
.modal-box { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:28px; width:420px; max-width:95vw; animation:scaleIn .2s ease; }
.modal-box h3 { font-size:17px; font-weight:700; margin-bottom:4px; letter-spacing:-.2px; }
.modal-box .modal-sub { font-size:13px; color:var(--muted); margin-bottom:20px; }
.modal-field { margin-bottom:14px; }
.modal-field label { display:block; font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; }
.modal-field input, .modal-field textarea { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:9px 12px; color:var(--text); font-size:14px; outline:none; font-family:inherit; transition:border-color .15s ease; }
.modal-field input:focus, .modal-field textarea:focus { border-color:var(--accent); }
.modal-actions { display:flex; gap:10px; margin-top:20px; }

/* ── Brain ── */
.brain-layout { display:flex; flex-direction:column; height:calc(100vh - 130px); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.brain-messages { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; background:linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%); }
.brain-msg { max-width:82%; padding:12px 16px; border-radius:14px; font-size:14px; line-height:1.6; }
.brain-msg.owner { background:var(--accent); color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }
.brain-msg.brain { background:var(--card2); color:var(--text); align-self:flex-start; border-bottom-left-radius:4px; border:1px solid var(--border); border-left:3px solid var(--accent); }
.brain-msg .intent-badge { display:inline-block; font-size:10px; font-weight:600; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,.1); margin-top:6px; }
.brain-msg .action-badge { display:inline-block; font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(16,185,129,.15); color:var(--green); margin-top:4px; margin-left:4px; border:1px solid rgba(16,185,129,.2); }
.brain-input-bar { padding:12px 14px; border-top:1px solid var(--border); display:flex; gap:8px; background:var(--card); }
.brain-input-bar input { flex:1; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:10px 14px; color:var(--text); font-size:14px; outline:none; font-family:inherit; transition:border-color .15s ease; }
.brain-input-bar input:focus { border-color:var(--accent); }

/* ── Brain doc card ── */
.brain-doc-card { background:var(--surface2); border:1px solid var(--accent); border-radius:10px; padding:14px 16px; margin-top:10px; }
.brain-doc-card .doc-title { font-size:13px; font-weight:700; color:var(--accent); margin-bottom:4px; }
.brain-doc-card .doc-meta { font-size:12px; color:var(--muted); margin-bottom:10px; }
.brain-doc-card .doc-actions { display:flex; gap:8px; flex-wrap:wrap; }

/* ── Misc ── */
.loading { color:var(--muted); font-size:14px; padding:24px; text-align:center; }
.empty { color:var(--muted); font-size:14px; padding:40px; text-align:center; }
.activity-item { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); }
.activity-item:last-child { border-bottom:none; }
.activity-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.activity-dot.booking { background:var(--green); }
.activity-dot.conversation { background:var(--accent); }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════
     AUTH SCREEN
═══════════════════════════════════════════════════════════ -->
<div id="auth-screen">
  <div class="auth-split">

    <!-- Left branding panel -->
    <div class="auth-brand">
      <div class="brand-logo">⚡ Dispatch<span>AI</span></div>
      <div class="brand-tagline">Your AI dispatch agent, always on.</div>
      <div class="brand-sub">Turn missed calls and texts into booked jobs — automatically.</div>
      <div class="brand-bullets">
        <div class="brand-bullet">
          <div class="bb-icon">📱</div>
          <div class="bb-text">
            <strong>Answers every SMS instantly</strong>
            <span>Your AI agent qualifies leads, answers questions, and books jobs while you're on the job.</span>
          </div>
        </div>
        <div class="brand-bullet">
          <div class="bb-icon">📅</div>
          <div class="bb-text">
            <strong>Smart calendar management</strong>
            <span>Customers pick time slots, reschedule themselves, and get reminders — zero admin work.</span>
          </div>
        </div>
        <div class="brand-bullet">
          <div class="bb-icon">🧠</div>
          <div class="bb-text">
            <strong>Your brain in the cloud</strong>
            <span>Ask Anna to scan the schedule, text a customer, or draft an invoice. She just does it.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right form panel -->
    <div class="auth-right">
      <div class="auth-form-wrap">

        <!-- Step dots -->
        <div class="step-dots" id="step-dots">
          <div class="step-dot active" id="dot-1"></div>
          <div class="step-dot" id="dot-2"></div>
          <div class="step-dot" id="dot-3"></div>
          <div class="step-dot" id="dot-4"></div>
        </div>

        <!-- ── STEP 1: Sign in / Sign up ── -->
        <div id="auth-step-1">
          <div class="auth-title" id="auth-step-title">Welcome back</div>
          <div class="auth-sub" id="auth-step-sub">Sign in to your DispatchAI account</div>
          <div class="auth-tabs">
            <button class="active" onclick="setAuthMode('login')">Sign In</button>
            <button onclick="setAuthMode('signup')">Sign Up</button>
          </div>
          <div class="auth-field">
            <label>Email</label>
            <input type="email" id="auth-email" placeholder="you@example.com" onkeydown="authKey(event)" />
          </div>
          <div class="auth-field">
            <label>Password</label>
            <input type="password" id="auth-password" placeholder="••••••••" onkeydown="authKey(event)" />
          </div>
          <div id="auth-err" class="auth-err"></div>
          <button class="auth-btn" onclick="doAuth()" id="auth-submit-btn">Sign In</button>
          <div class="auth-switch" id="auth-switch-text">
            No account? <a onclick="setAuthMode('signup')">Create one free</a>
          </div>
        </div>

        <!-- ── STEP 2: Pick your agent ── -->
        <div id="auth-step-2" style="display:none;">
          <div class="auth-title">Pick your agent type</div>
          <div class="auth-sub">Anna will learn the language and workflows of your trade.</div>
          <div class="agent-grid" id="agent-grid"></div>
          <div id="agent-err" class="auth-err"></div>
          <button class="auth-btn" onclick="goStep3()">Continue</button>
        </div>

        <!-- ── STEP 3: Business details ── -->
        <div id="auth-step-3" style="display:none;">
          <div class="auth-title">Set up your business</div>
          <div class="auth-sub">Anna needs a few details to represent you properly.</div>
          <div class="auth-field">
            <label>Business Name *</label>
            <input type="text" id="biz-name-input" placeholder="Calgary Plumbing Co" />
          </div>
          <div class="auth-field">
            <label>Service Area</label>
            <input type="text" id="biz-area-input" placeholder="Calgary NW" />
          </div>
          <div class="auth-field">
            <label>Emergency Phone</label>
            <input type="tel" id="biz-phone-input" placeholder="+14031234567" />
          </div>
          <div class="auth-field">
            <label>Your SMS Number from Twilio</label>
            <input type="tel" id="biz-twilio-input" placeholder="+14031112222" />
          </div>
          <div class="auth-field">
            <label>Custom Instructions (optional)</label>
            <textarea id="biz-instructions-input" placeholder="Anything Anna should know? e.g. 'We charge a $50 travel fee outside the city'"></textarea>
          </div>
          <div id="biz-err" class="auth-err"></div>
          <button class="auth-btn" onclick="submitBusinessDetails()" id="biz-submit-btn">Finish Setup</button>
        </div>

        <!-- ── STEP 4: All set! ── -->
        <div id="auth-step-4" style="display:none;">
          <div class="success-screen">
            <div class="success-check">
              <svg viewBox="0 0 36 36"><path d="M8 18 L15 25 L28 11"/></svg>
            </div>
            <div class="success-biz" id="success-biz-name">You're all set!</div>
            <div class="success-number">Your SMS number: <strong id="success-twilio-number">—</strong></div>
            <button class="auth-btn" onclick="launchDashboard()">Open Dashboard</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     APP SCREEN
═══════════════════════════════════════════════════════════ -->
<div id="app-screen">

  <!-- Topbar -->
  <div class="topbar">
    <div class="logo">⚡ Dispatch<span>AI</span></div>
    <div class="topbar-center">
      <div class="topbar-biz-name" id="topbar-biz"></div>
      <div class="topbar-agent-badge" id="topbar-agent-badge" style="display:none"></div>
    </div>
    <button class="hamburger-btn" onclick="toggleDrawer()" aria-label="Menu">&#9776;</button>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <div class="tab active" onclick="switchTab('dashboard')">Dashboard</div>
    <div class="tab" onclick="switchTab('inbox')">Inbox <span id="review-badge" style="display:none;background:var(--red);color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px;"></span></div>
    <div class="tab" onclick="switchTab('scheduler')">Scheduler</div>
    <div class="tab" onclick="switchTab('brain')">🧠 Brain</div>
  </div>

  <!-- DASHBOARD -->
  <div id="tab-dashboard" class="tab-content active">
    <div class="period-bar">
      <button class="period-btn active" onclick="setPeriod('today')">Today</button>
      <button class="period-btn" onclick="setPeriod('this_week')">This Week</button>
      <button class="period-btn" onclick="setPeriod('this_month')">This Month</button>
      <button class="period-btn" onclick="setPeriod('all_time')">All Time</button>
    </div>
    <div class="agent-toggle-bar">
      <div class="status">
        <div class="status-label" id="agent-status-label">AI Agent Active</div>
        <div class="status-sub">Anna is responding to customer SMS automatically</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="agent-toggle" onchange="toggleAgent()" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="metric-grid" id="metric-grid">
      <div class="loading">Loading metrics...</div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="section-title">Upcoming Jobs</div>
        <div id="upcoming-jobs"><div class="loading">Loading...</div></div>
      </div>
      <div class="card">
        <div class="section-title">Recent Activity</div>
        <div id="recent-activity"><div class="loading">Loading...</div></div>
      </div>
    </div>
  </div>

  <!-- INBOX -->
  <div id="tab-inbox" class="tab-content">
    <div class="inbox-layout">
      <div class="convo-list" id="convo-list"><div class="loading">Loading...</div></div>
      <div class="convo-detail" id="convo-detail">
        <div class="no-selection">
          <div class="ns-icon">💬</div>
          Select a conversation
        </div>
      </div>
    </div>
  </div>

  <!-- SCHEDULER -->
  <div id="tab-scheduler" class="tab-content">
    <div id="scheduler-content"><div class="loading">Loading bookings...</div></div>
  </div>

  <!-- BOOKING MODAL -->
  <div class="modal-overlay" id="booking-modal">
    <div class="modal-box">
      <h3>New Booking</h3>
      <div class="modal-sub" id="modal-slot-label">Select a slot</div>
      <input type="hidden" id="modal-slot-id" />
      <div class="modal-field">
        <label>Customer Phone</label>
        <input type="tel" id="modal-phone" placeholder="+14031234567" />
      </div>
      <div class="modal-field">
        <label>Customer Name (optional)</label>
        <input type="text" id="modal-name" placeholder="John Smith" />
      </div>
      <div class="modal-field">
        <label>Address</label>
        <input type="text" id="modal-address" placeholder="123 Main St NW" />
      </div>
      <div class="modal-field">
        <label>Notes</label>
        <textarea id="modal-notes" rows="2" placeholder="What's the job?"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="submitBooking()">Book Slot</button>
        <button class="btn btn-ghost" onclick="closeBookingModal()">Cancel</button>
      </div>
    </div>
  </div>

  <!-- BRAIN -->
  <div id="tab-brain" class="tab-content">
    <div class="brain-layout">
      <div class="brain-messages" id="brain-messages">
        <div style="text-align:center;color:var(--muted);font-size:13px;padding:40px 20px;line-height:2.2;">
          <strong style="color:var(--text);font-size:15px;display:block;margin-bottom:12px;">Ask Anna anything about your business</strong>
          📅 <em>"Scan the schedule"</em><br>
          📄 <em>"Invoice for John Smith, drain cleaning $150"</em><br>
          💬 <em>"Text the Monday 3pm booking and ask for the gate code"</em><br>
          💰 <em>"Update drain cleaning to $180"</em>
        </div>
      </div>
      <div class="brain-input-bar">
        <input id="brain-input" placeholder="Ask Anna..." onkeydown="brainKey(event)" />
        <button class="btn btn-primary" onclick="brainSend()">Send</button>
        <button class="btn btn-ghost" onclick="brainReset()" title="Clear history">↺</button>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     DRAWER
═══════════════════════════════════════════════════════════ -->
<div class="drawer-overlay" id="drawer-overlay" onclick="closeDrawer()"></div>
<div class="drawer" id="drawer">
  <div class="drawer-header">
    <div class="drawer-biz" id="drawer-biz-name">Loading...</div>
    <div class="drawer-badge" id="drawer-agent-badge"></div>
  </div>
  <div class="drawer-body">
    <button class="drawer-item" onclick="toggleDrawerSection('biz-settings')">
      <span class="di-icon">🏢</span> Business Settings
    </button>
    <div id="drawer-biz-settings" style="display:none;">
      <div class="drawer-form">
        <div class="df-title">Business Settings</div>
        <div class="drawer-field">
          <label>Business Name</label>
          <input type="text" id="d-biz-name" />
        </div>
        <div class="drawer-field">
          <label>Service Area</label>
          <input type="text" id="d-biz-area" />
        </div>
        <div class="drawer-field">
          <label>Emergency Phone</label>
          <input type="tel" id="d-biz-phone" />
        </div>
        <button class="btn btn-primary" style="width:100%;font-size:13px;" onclick="saveBusinessSettings()">Save Changes</button>
      </div>
    </div>

    <button class="drawer-item" onclick="toggleDrawerSection('agent-settings')">
      <span class="di-icon">🤖</span> Agent Settings
    </button>
    <div id="drawer-agent-settings" style="display:none;">
      <div class="drawer-form">
        <div class="df-title">Agent Settings</div>
        <div class="drawer-field">
          <label>Agent Type</label>
          <select id="d-agent-type">
            <option value="plumbing">🔧 Plumbing</option>
            <option value="hvac">❄️ HVAC</option>
            <option value="auto_detailing">🚗 Auto Detailing</option>
            <option value="pet_grooming">🐾 Pet Grooming</option>
            <option value="electrical">⚡ Electrical</option>
            <option value="locksmith">🔑 Locksmith</option>
            <option value="general_handyman">🪛 Handyman</option>
            <option value="landscaping">🌿 Landscaping</option>
            <option value="junk_removal">🗑️ Junk Removal</option>
            <option value="garage_door_repair">🚪 Garage Door</option>
            <option value="carpet_cleaning">🧹 Carpet Cleaning</option>
            <option value="pressure_washing">💦 Pressure Washing</option>
            <option value="appliance_repair">🔩 Appliance Repair</option>
            <option value="car_repair">🚙 Auto Repair</option>
            <option value="door_repair">🚪 Door Repair</option>
          </select>
        </div>
        <div class="drawer-field">
          <label>Custom Instructions</label>
          <textarea id="d-instructions" placeholder="Anything Anna should know?"></textarea>
        </div>
        <button class="btn btn-primary" style="width:100%;font-size:13px;" onclick="saveAgentSettings()">Save Changes</button>
      </div>
    </div>

    <button class="drawer-item" onclick="toggleDrawerSection('twilio-section')">
      <span class="di-icon">📱</span> Your Twilio Number
    </button>
    <div id="drawer-twilio-section" style="display:none;">
      <div class="drawer-form">
        <div class="df-title">SMS Number</div>
        <div class="drawer-field">
          <div class="drawer-copy-wrap">
            <input type="text" id="d-twilio-number" readonly />
            <button class="drawer-copy-btn" onclick="copyTwilioNumber()">Copy</button>
          </div>
        </div>
      </div>
    </div>

    <div class="drawer-divider"></div>
    <button class="drawer-item danger" onclick="logout()">
      <span class="di-icon">🚪</span> Sign Out
    </button>
  </div>
</div>

<script>
// ── State ──────────────────────────────────────────────────────────────────
let token = localStorage.getItem('dispatch_token') || '';
let currentPeriod = 'this_week';
let selectedConvoId = null;
let authMode = 'login';
let agentActive = true;
let signupStep = 1;
let signupAgentType = '';
let drawerOpen = false;

// ── Helpers ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function api(path, opts = {}) {
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(r => { if (r.status === 401) { logout(); } return r.json(); });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

function statusBadge(status) {
  const map = {
    ai_handling: ['badge-green', 'AI Active'],
    human_takeover: ['badge-orange', 'Takeover'],
    needs_review: ['badge-red', 'Needs Review'],
    completed: ['badge-grey', 'Completed'],
    draft: ['badge-grey', 'Draft'],
    sent: ['badge-blue', 'Sent'],
    paid: ['badge-green', 'Paid'],
    void: ['badge-grey', 'Void'],
  };
  const [cls, label] = map[status] || ['badge-grey', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Auth ───────────────────────────────────────────────────────────────────
const AGENT_TYPES = [
  { value:'plumbing', emoji:'🔧', name:'Plumbing', desc:'Leaks, drains, water heaters' },
  { value:'hvac', emoji:'❄️', name:'HVAC', desc:'Furnace, AC, heat pumps' },
  { value:'auto_detailing', emoji:'🚗', name:'Auto Detailing', desc:'Interior, exterior, ceramic coating' },
  { value:'pet_grooming', emoji:'🐾', name:'Pet Grooming', desc:'Baths, cuts, nail trims' },
  { value:'electrical', emoji:'⚡', name:'Electrical', desc:'Panels, outlets, EV chargers' },
  { value:'locksmith', emoji:'🔑', name:'Locksmith', desc:'Lockouts, rekeying, smart locks' },
  { value:'general_handyman', emoji:'🪛', name:'Handyman', desc:'Repairs, installs, assembly' },
  { value:'landscaping', emoji:'🌿', name:'Landscaping', desc:'Lawn care, hedges, cleanup' },
  { value:'junk_removal', emoji:'🗑️', name:'Junk Removal', desc:'Haul-away, cleanouts, debris' },
  { value:'garage_door_repair', emoji:'🚪', name:'Garage Door', desc:'Springs, openers, installs' },
  { value:'carpet_cleaning', emoji:'🧹', name:'Carpet Cleaning', desc:'Steam clean, stains, odour' },
  { value:'pressure_washing', emoji:'💦', name:'Pressure Washing', desc:'Driveways, decks, house wash' },
  { value:'appliance_repair', emoji:'🔩', name:'Appliance Repair', desc:'Fridge, washer, oven' },
  { value:'car_repair', emoji:'🚙', name:'Auto Repair', desc:'Oil, brakes, diagnostics' },
  { value:'door_repair', emoji:'🚪', name:'Door Repair', desc:'Hinges, frames, weatherstrip' },
];

function buildAgentGrid() {
  $('agent-grid').innerHTML = AGENT_TYPES.map(a => `
    <div class="agent-card" id="ac-${a.value}" onclick="selectAgent('${a.value}')">
      <div class="ac-emoji">${a.emoji}</div>
      <div class="ac-name">${a.name}</div>
      <div class="ac-desc">${a.desc}</div>
    </div>`).join('');
}

function selectAgent(value) {
  signupAgentType = value;
  document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
  const el = $('ac-' + value);
  if (el) el.classList.add('selected');
  $('agent-err').textContent = '';
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tabs button').forEach((b,i) => b.classList.toggle('active', (i===0&&mode==='login')||(i===1&&mode==='signup')));
  if (mode === 'login') {
    $('auth-step-title').textContent = 'Welcome back';
    $('auth-step-sub').textContent = 'Sign in to your DispatchAI account';
    $('auth-submit-btn').textContent = 'Sign In';
    $('auth-switch-text').innerHTML = `No account? <a onclick="setAuthMode('signup')">Create one free</a>`;
  } else {
    $('auth-step-title').textContent = 'Create your account';
    $('auth-step-sub').textContent = 'Start dispatching smarter in minutes';
    $('auth-submit-btn').textContent = 'Create Account';
    $('auth-switch-text').innerHTML = `Already have an account? <a onclick="setAuthMode('login')">Sign in</a>`;
  }
  $('auth-err').textContent = '';
}

function authKey(e) { if (e.key === 'Enter') doAuth(); }

function updateStepDots(step) {
  for (let i = 1; i <= 4; i++) {
    const dot = $('dot-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < step) dot.classList.add('done');
    else if (i === step) dot.classList.add('active');
  }
}

function showStep(step) {
  signupStep = step;
  [$('auth-step-1'),$('auth-step-2'),$('auth-step-3'),$('auth-step-4')].forEach((el,i) => {
    if (el) el.style.display = (i+1 === step) ? '' : 'none';
  });
  updateStepDots(step);
}

async function doAuth() {
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value.trim();
  if (!email || !password) { $('auth-err').textContent = 'Email and password required'; return; }
  const btn = $('auth-submit-btn');
  btn.disabled = true;
  btn.textContent = '...';
  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
  const body = authMode === 'signup'
    ? { email, password, business_name: 'My Business' }
    : { email, password };
  try {
    const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { $('auth-err').textContent = data.detail || 'Auth failed'; btn.disabled = false; btn.textContent = authMode === 'login' ? 'Sign In' : 'Create Account'; return; }
    token = data.access_token;
    localStorage.setItem('dispatch_token', token);
    if (authMode === 'signup') {
      buildAgentGrid();
      showStep(2);
    } else {
      initApp();
    }
  } catch(e) {
    $('auth-err').textContent = 'Network error. Try again.';
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
  }
}

function goStep3() {
  if (!signupAgentType) { $('agent-err').textContent = 'Please select your service type.'; return; }
  showStep(3);
}

async function submitBusinessDetails() {
  const name = $('biz-name-input').value.trim();
  if (!name) { $('biz-err').textContent = 'Business name is required.'; return; }
  const btn = $('biz-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  const body = {
    name,
    service_area: $('biz-area-input').value.trim(),
    emergency_phone: $('biz-phone-input').value.trim(),
    twilio_number: $('biz-twilio-input').value.trim(),
    custom_instructions: $('biz-instructions-input').value.trim(),
    agent_type: signupAgentType,
  };
  try {
    const res = await api('/api/business', { method:'POST', body });
    if (res.id || res.name || res.ok) {
      $('success-biz-name').textContent = name + ' is ready!';
      $('success-twilio-number').textContent = body.twilio_number || '(not set)';
      showStep(4);
    } else {
      $('biz-err').textContent = res.detail || 'Could not save. Try again.';
      btn.disabled = false;
      btn.textContent = 'Finish Setup';
    }
  } catch(e) {
    $('biz-err').textContent = 'Network error.';
    btn.disabled = false;
    btn.textContent = 'Finish Setup';
  }
}

function launchDashboard() {
  $('auth-screen').style.display = 'none';
  initApp();
}

function logout() {
  token = '';
  localStorage.removeItem('dispatch_token');
  closeDrawer();
  $('app-screen').style.display = 'none';
  showStep(1);
  setAuthMode('login');
  $('auth-screen').style.display = 'grid';
  signupAgentType = '';
}

// ── App init ───────────────────────────────────────────────────────────────
async function initApp() {
  $('auth-screen').style.display = 'none';
  $('app-screen').style.display = 'flex';
  $('app-screen').style.flexDirection = 'column';

  try {
    const biz = await api('/api/business');
    $('topbar-biz').textContent = biz.name || '';
    if (biz.agent_type) {
      const agentLabel = (AGENT_TYPES.find(a => a.value === biz.agent_type) || {}).name || biz.agent_type;
      const badge = $('topbar-agent-badge');
      badge.textContent = agentLabel;
      badge.style.display = '';
    }
  } catch(e) {}

  loadDashboard();
  loadInbox();
  loadScheduler();
}

// Auto-init if token exists
if (token) { initApp(); } else { $('auth-screen').style.display = 'grid'; }

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    const names = ['dashboard','inbox','scheduler','brain'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  $('tab-' + name).classList.add('active');
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function setPeriod(p) {
  currentPeriod = p;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  loadDashboard();
}

async function loadDashboard() {
  const d = await api(`/api/dashboard?period=${currentPeriod}`);
  agentActive = d.agent_active;
  $('agent-toggle').checked = agentActive;
  $('agent-status-label').textContent = agentActive ? 'AI Agent Active' : 'AI Agent Paused';

  if (d.needs_review_count > 0) {
    $('review-badge').textContent = d.needs_review_count;
    $('review-badge').style.display = 'inline-block';
  }

  $('metric-grid').innerHTML = `
    <div class="metric-card"><div class="mc-bar indigo"></div><div class="label">Revenue Converted</div><div class="value">$${d.revenue_converted.toFixed(0)}</div><div class="sub">from sent/paid docs</div></div>
    <div class="metric-card"><div class="mc-bar green"></div><div class="label">Bookings</div><div class="value">${d.total_bookings}</div><div class="sub">${currentPeriod.replace('_',' ')}</div></div>
    <div class="metric-card"><div class="mc-bar blue"></div><div class="label">Conversations</div><div class="value">${d.total_conversations}</div><div class="sub">${currentPeriod.replace('_',' ')}</div></div>
    <div class="metric-card"><div class="mc-bar orange"></div><div class="label">Conversion Rate</div><div class="value">${d.conversion_rate}%</div><div class="sub">conversations → bookings</div></div>
    <div class="metric-card"><div class="mc-bar blue"></div><div class="label">Active Now</div><div class="value">${d.active_conversations}</div><div class="sub">open conversations</div></div>
    <div class="metric-card"><div class="mc-bar red"></div><div class="label">Needs Review</div><div class="value" style="color:${d.needs_review_count>0?'var(--red)':'var(--text)'}">${d.needs_review_count}</div><div class="sub">low confidence replies</div></div>
    <div class="metric-card"><div class="mc-bar muted"></div><div class="label">Time Saved</div><div class="value">${d.time_saved_hours}h</div><div class="sub">AI handled (est. 2min/msg)</div></div>
  `;

  const jobs = d.upcoming_jobs;
  $('upcoming-jobs').innerHTML = jobs.length === 0
    ? '<div class="empty">No upcoming jobs</div>'
    : jobs.map(j => `
      <div class="job-item">
        <div style="flex:1;">
          <div class="ji-date">${j.slot_date} ${j.slot_time||''}</div>
          <div class="ji-title">${j.customer_phone}</div>
          <div class="ji-sub">${j.customer_address || 'No address'} · ${j.job_summary || 'No summary'}</div>
        </div>
        <div class="ji-right">${statusBadge(j.status)}</div>
      </div>`).join('');

  const acts = d.recent_activity;
  $('recent-activity').innerHTML = acts.length === 0
    ? '<div class="empty">No activity yet</div>'
    : acts.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.type}"></div>
        <div style="flex:1;font-size:13px;">${a.label}</div>
        <div style="font-size:11px;color:var(--muted)">${timeAgo(a.time)}</div>
        ${statusBadge(a.status)}
      </div>`).join('');
}

async function toggleAgent() {
  const res = await api('/api/dashboard/agent-toggle', { method:'PUT' });
  agentActive = res.agent_active;
  $('agent-status-label').textContent = agentActive ? 'AI Agent Active' : 'AI Agent Paused';
}

// ── INBOX ─────────────────────────────────────────────────────────────────
let conversations = [];

async function loadInbox() {
  const convs = await api('/api/conversations');
  conversations = convs;
  $('convo-list').innerHTML = convs.length === 0
    ? '<div class="empty">No conversations yet</div>'
    : convs.map(c => `
      <div class="list-item" onclick="selectConvo('${c.id}')" id="cl-${c.id}">
        <div class="main">
          <div class="title">${c.customer_phone}</div>
          <div class="sub">${timeAgo(c.last_message_at || c.created_at)}</div>
        </div>
        <div class="right">${statusBadge(c.status)}</div>
      </div>`).join('');
}

async function selectConvo(id) {
  selectedConvoId = id;
  document.querySelectorAll('.list-item').forEach(el => el.style.background = '');
  const el = $('cl-' + id);
  if (el) el.style.background = 'var(--surface2)';

  const convo = conversations.find(c => c.id === id);
  const msgs = await api(`/api/conversations/${id}/messages`);
  const isTakeover = convo?.status === 'human_takeover';

  $('convo-detail').innerHTML = `
    <div class="convo-detail-header">
      <div style="flex:1">
        <div style="font-size:15px;font-weight:600;">${convo?.customer_phone || 'Customer'}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">${statusBadge(convo?.status)}</div>
      </div>
      ${isTakeover
        ? `<button class="btn btn-success" style="font-size:12px;" onclick="handback('${id}')">🤖 Hand back to AI</button>`
        : `<button class="btn btn-ghost" style="border-color:var(--orange);color:var(--orange);font-size:12px;" onclick="takeover('${id}')">🙋 Take Over</button>`
      }
    </div>
    <div class="messages-area" id="msg-area-${id}">
      ${msgs.length === 0 ? '<div class="empty">No messages</div>' : msgs.map(m => `
        <div class="msg ${m.sender_type}" style="align-self:${m.sender_type==='customer'?'flex-start':'flex-end'}">
          ${m.body}
          <div class="msg-meta">${m.sender_type === 'ai_agent' ? 'Anna' : m.sender_type === 'business_owner' ? 'You (owner)' : 'Customer'} · ${timeAgo(m.created_at)}</div>
        </div>`).join('')}
    </div>
    ${isTakeover ? `
    <div class="reply-bar">
      <textarea id="owner-reply-input" rows="2" placeholder="Reply as owner..." onkeydown="replyKey(event,'${id}')"></textarea>
      <button class="btn btn-primary" onclick="sendOwnerReply('${id}')">Send</button>
    </div>` : ''}
  `;
  const area = $(`msg-area-${id}`);
  if (area) area.scrollTop = area.scrollHeight;
}

async function takeover(id) {
  await api(`/api/conversations/${id}/takeover`, { method:'PUT' });
  await loadInbox();
  selectConvo(id);
}

async function handback(id) {
  await api(`/api/conversations/${id}/handback`, { method:'PUT' });
  await loadInbox();
  selectConvo(id);
}

function replyKey(e, id) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendOwnerReply(id); }
}

async function sendOwnerReply(id) {
  const input = $('owner-reply-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  await api(`/api/conversations/${id}/reply`, { method:'POST', body:{ message:msg } });
  selectConvo(id);
}

// ── SCHEDULER ─────────────────────────────────────────────────────────────
async function loadScheduler() {
  const slots = await api('/api/calendar/all-slots');

  const grouped = {};
  slots.forEach(s => {
    const d = s.date || 'Unknown';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(s);
  });

  if (Object.keys(grouped).length === 0) {
    $('scheduler-content').innerHTML = '<div class="empty">No slots available this week.</div>';
    return;
  }

  const statusColors = { booked:'badge-green', assigned:'badge-blue', completed:'badge-grey', cancelled:'badge-red' };
  const todayStr = new Date().toISOString().slice(0,10);

  $('scheduler-content').innerHTML = Object.entries(grouped).sort().map(([date, daySlots]) => {
    const isToday = date === todayStr;
    const booked = daySlots.filter(s => s.booked);
    const available = daySlots.filter(s => !s.booked);
    return `
    <div class="date-group-header">
      ${date}
      ${isToday ? '<span class="today-badge">TODAY</span>' : ''}
    </div>
    ${booked.map(s => `
      <div class="booking-card" id="bk-${s.booking_id}">
        <div class="bk-header">
          <div class="bk-time">${s.time}</div>
          <span class="badge ${statusColors[s.status] || 'badge-green'}">${s.status || 'booked'}</span>
        </div>
        ${s.customer_phone ? `<div class="bk-detail">📞 ${s.customer_phone}</div>` : ''}
        ${s.customer_address ? `<div class="bk-detail">📍 ${s.customer_address}</div>` : `<div class="bk-detail" style="color:var(--orange)">📍 No address on file</div>`}
        ${s.notes ? `<div class="bk-summary">🤖 ${s.notes}</div>` : '<div class="bk-summary" style="opacity:.4;font-style:italic;">No summary yet</div>'}
        ${s.booking_id && !['cancelled','completed','no_show'].includes(s.status) ? `
        <div class="bk-actions">
          <button class="btn btn-ghost" style="font-size:12px;" onclick="openForwardModal('${s.booking_id}','${(s.customer_phone||'')}','${(s.customer_address||'')}','${s.date}','${s.time}')">↗ Forward</button>
          <button class="btn btn-success" style="font-size:12px;" onclick="setBookingStatus('${s.booking_id}','completed')">✓ Done</button>
          <button class="btn btn-ghost" style="font-size:12px;color:var(--orange);border-color:var(--orange);" onclick="setBookingStatus('${s.booking_id}','no_show')">✗ No-show</button>
          <button class="btn btn-danger" style="font-size:12px;" onclick="setBookingStatus('${s.booking_id}','cancelled')">Cancel</button>
        </div>` : ''}
      </div>`).join('')}
    ${booked.length > 0 && available.length > 0 ? '<div class="sched-divider"></div>' : ''}
    ${available.map(s => `
      <div class="slot-available">
        <div class="sl-time">${s.time}</div>
        <button class="btn btn-ghost" style="font-size:12px;" onclick="openBookingModal('${s.id}','${s.date}','${s.time}')">+ Book</button>
      </div>`).join('')}
    `;
  }).join('');
}

function openBookingModal(slotId, date, time) {
  $('modal-slot-id').value = slotId;
  $('modal-slot-label').textContent = date + ' · ' + time;
  $('modal-phone').value = '';
  $('modal-name').value = '';
  $('modal-address').value = '';
  $('modal-notes').value = '';
  $('booking-modal').classList.add('open');
  setTimeout(() => $('modal-phone').focus(), 100);
}

function closeBookingModal() {
  $('booking-modal').classList.remove('open');
}

async function submitBooking() {
  const slotId = $('modal-slot-id').value;
  const phone = $('modal-phone').value.trim();
  if (!phone) { toast('Phone number is required.', 'error'); return; }

  const body = {
    slot_id: slotId,
    customer_phone: phone,
    customer_name: $('modal-name').value.trim(),
    customer_address: $('modal-address').value.trim(),
    notes: $('modal-notes').value.trim(),
  };

  const res = await api('/api/calendar/book', { method:'POST', body });
  if (res.booking_id || res.booked) {
    closeBookingModal();
    toast('Booking confirmed!', 'success');
    loadScheduler();
    loadDashboard();
  } else {
    toast(res.detail || 'Could not book that slot — it may already be taken.', 'error');
  }
}

async function setBookingStatus(bookingId, status) {
  const labels = { completed:'Mark as completed?', cancelled:'Cancel this booking?', no_show:'Mark as no-show?' };
  if (!confirm(labels[status] || 'Update status?')) return;
  const res = await api(`/api/calendar/bookings/${bookingId}/status`, { method:'PUT', body:{ status } });
  if (res.ok) { loadScheduler(); loadDashboard(); toast('Status updated.'); }
  else toast('Error: ' + JSON.stringify(res), 'error');
}

function openForwardModal(bookingId, phone, address, date, time) {
  const techPhone = prompt(
    `Forward to tech:\\n\\n${date} ${time}\\nCustomer: ${phone}\\nAddress: ${address || 'No address'}\\n\\nEnter tech phone number:`
  );
  if (!techPhone) return;
  forwardToTech(bookingId, techPhone);
}

async function forwardToTech(bookingId, techPhone) {
  const res = await api('/api/calendar/forward-tech', {
    method: 'POST',
    body: { booking_id: bookingId, tech_phone: techPhone },
  });
  if (res.sent) {
    toast('Job sent to tech at ' + res.to, 'success');
    loadScheduler();
  } else {
    toast('Error: ' + JSON.stringify(res), 'error');
  }
}

// ── BRAIN ─────────────────────────────────────────────────────────────────
async function brainSend() {
  const input = $('brain-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  appendBrainMsg(msg, 'owner');

  const sendBtn = document.querySelector('.brain-input-bar .btn-primary');
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  const res = await api('/api/brain/chat', { method:'POST', body:{ message:msg } });

  sendBtn.disabled = false;
  sendBtn.textContent = 'Send';

  appendBrainMsg(res.response, 'brain', res.intent, res.action_executed);

  if (res.action_executed === 'document_created' && res.document) {
    appendBrainDocCard(res.document);
  }
}

function appendBrainDocCard(doc) {
  const area = $('brain-messages');
  const div = document.createElement('div');
  div.className = 'brain-msg brain';
  const phone = doc.customer_phone || '';
  div.innerHTML = `
    <div class="brain-doc-card">
      <div class="doc-title">${doc.doc_number} · ${doc.doc_type === 'invoice' ? 'Invoice' : 'Quote'}</div>
      <div class="doc-meta">${doc.customer_name || doc.customer_phone || 'Customer'} · $${(doc.total||0).toFixed(2)} · ${doc.issue_date || 'Today'}</div>
      <div class="doc-actions">
        ${doc.pdf_url ? `<a href="${doc.pdf_url}" target="_blank" class="btn btn-ghost" style="text-decoration:none;font-size:12px;">📄 View PDF</a>` : ''}
        ${doc.pdf_url && phone ? `<button class="btn btn-primary" onclick="sendDocSms('${doc.id}','${phone}')" style="font-size:12px;">📱 Send SMS</button>` : ''}
      </div>
    </div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

async function sendDocSms(id, phone) {
  const to = prompt('Send to:', phone);
  if (!to) return;
  const res = await api(`/api/documents/${id}/send`, { method:'POST', body:{ method:'sms', to } });
  if (res.sent) toast('Sent!', 'success');
  else toast('Error: ' + JSON.stringify(res), 'error');
}

function appendBrainMsg(text, role, intent, action) {
  const area = $('brain-messages');
  const div = document.createElement('div');
  div.className = `brain-msg ${role}`;
  div.innerHTML = text.replace(/\\n/g, '<br>');
  if (intent && role === 'brain') {
    const labels = { generate_document:'📄 invoice', schedule_scan:'📅 schedule', text_customer:'💬 texted', pricing_update:'💰 pricing', forward:'📤 forward', general:'💬 general' };
    const label = labels[intent] || intent;
    div.innerHTML += `<div><span class="intent-badge">${label}</span>${action ? `<span class="action-badge">✓ done</span>` : ''}</div>`;
  }
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

$('booking-modal').addEventListener('click', e => { if (e.target === $('booking-modal')) closeBookingModal(); });

function brainKey(e) {
  if (e.key === 'Enter') { e.preventDefault(); brainSend(); }
}

async function brainReset() {
  await api('/api/brain/history', { method:'DELETE' });
  $('brain-messages').innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:40px 20px;">Conversation cleared.</div>';
}

// ── DRAWER ─────────────────────────────────────────────────────────────────
function toggleDrawer() {
  drawerOpen ? closeDrawer() : openDrawer();
}

async function openDrawer() {
  drawerOpen = true;
  $('drawer').classList.add('open');
  $('drawer-overlay').classList.add('open');
  try {
    const biz = await api('/api/business');
    $('drawer-biz-name').textContent = biz.name || 'My Business';
    const agentLabel = (AGENT_TYPES.find(a => a.value === biz.agent_type) || {}).name || biz.agent_type || '';
    $('drawer-agent-badge').textContent = agentLabel;
    // Pre-fill forms
    $('d-biz-name').value = biz.name || '';
    $('d-biz-area').value = biz.service_area || '';
    $('d-biz-phone').value = biz.emergency_phone || '';
    if (biz.twilio_number) $('d-twilio-number').value = biz.twilio_number;
    if (biz.agent_type) $('d-agent-type').value = biz.agent_type;
    $('d-instructions').value = biz.custom_instructions || '';
  } catch(e) {}
}

function closeDrawer() {
  drawerOpen = false;
  $('drawer').classList.remove('open');
  $('drawer-overlay').classList.remove('open');
}

function toggleDrawerSection(id) {
  const el = $('drawer-' + id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  // Close all sections first
  ['biz-settings','agent-settings','twilio-section'].forEach(s => {
    const sec = $('drawer-' + s);
    if (sec) sec.style.display = 'none';
  });
  if (!isOpen) el.style.display = '';
}

async function saveBusinessSettings() {
  const body = {
    name: $('d-biz-name').value.trim(),
    service_area: $('d-biz-area').value.trim(),
    emergency_phone: $('d-biz-phone').value.trim(),
  };
  if (!body.name) { toast('Business name is required.', 'error'); return; }
  const res = await api('/api/business', { method:'PUT', body });
  if (res.id || res.name || res.ok) {
    $('topbar-biz').textContent = body.name;
    $('drawer-biz-name').textContent = body.name;
    toast('Business settings saved!', 'success');
  } else {
    toast(res.detail || 'Could not save.', 'error');
  }
}

async function saveAgentSettings() {
  const body = {
    agent_type: $('d-agent-type').value,
    custom_instructions: $('d-instructions').value.trim(),
  };
  const res = await api('/api/business', { method:'PUT', body });
  if (res.id || res.name || res.ok) {
    const agentLabel = (AGENT_TYPES.find(a => a.value === body.agent_type) || {}).name || body.agent_type;
    $('drawer-agent-badge').textContent = agentLabel;
    const badge = $('topbar-agent-badge');
    badge.textContent = agentLabel;
    badge.style.display = '';
    toast('Agent settings saved!', 'success');
  } else {
    toast(res.detail || 'Could not save.', 'error');
  }
}

function copyTwilioNumber() {
  const val = $('d-twilio-number').value;
  if (!val) { toast('No number to copy.', 'info'); return; }
  navigator.clipboard.writeText(val).then(() => toast('Number copied!', 'success')).catch(() => toast('Could not copy.', 'error'));
}
</script>
</body>
</html>
"""
