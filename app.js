// // =================================================================
// // Entropy — Frontend client for Spring Boot + STOMP/SockJS backend
// // =================================================================

// const BACKEND_URL = 'https://entropy-bjdu.onrender.com';
// const State = {
//   apiBase: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
//       ? 'http://localhost:8080'
//       : BACKEND_URL,

//   token: localStorage.getItem('nex_token') || null,
//   username: localStorage.getItem('nex_user') || null,
//   rooms: [],
//   currentRoom: null,
//   stomp: null,
//   subscription: null,
//   authMode: 'login',
//   lastSender: null,
// };

// // ---------- DOM ----------
// const $ = (id) => document.getElementById(id);
// const authScreen = $('auth-screen');
// const appScreen = $('app-screen');
// const authForm = $('auth-form');
// const authError = $('auth-error');
// const authSubmitLabel = $('auth-submit-label');
// const apiBaseInput = $('api-base');
// const usernameInput = $('username');
// const passwordInput = $('password');
// const userTag = $('user-tag');
// const roomList = $('room-list');
// const roomTitle = $('room-title');
// const roomMeta = $('room-meta');
// const messages = $('messages');
// const composer = $('composer');
// const composerInput = $('composer-input');
// const wsStatus = $('ws-status');
// const wsDot = document.querySelector('.sidebar-foot .dot');

// // ---------- API helpers ----------
// async function api(path, opts = {}) {
//   const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
//   if (State.token) headers.Authorization = `Bearer ${State.token}`;
//   const res = await fetch(`${State.apiBase}${path}`, { ...opts, headers });
//   if (!res.ok) {
//     const txt = await res.text().catch(() => '');
//     throw new Error(txt || `${res.status} ${res.statusText}`);
//   }
//   const ct = res.headers.get('content-type') || '';
//   return ct.includes('application/json') ? res.json() : res.text();
// }

// // ---------- Auth ----------
// document.querySelectorAll('.auth-tab').forEach(btn => {
//   btn.addEventListener('click', () => {
//     document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
//     btn.classList.add('active');
//     State.authMode = btn.dataset.tab;
//     authSubmitLabel.textContent = State.authMode === 'login' ? 'Authenticate' : 'Create Account';
//     authError.textContent = '';
//     const emailField = $('email-field');
//     if (emailField) emailField.style.display = State.authMode === 'signup' ? 'flex' : 'none';
//   });
// });

// authForm.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   authError.textContent = '';
// //  State.apiBase = apiBaseInput.value.trim().replace(/\/$/, '');
// //  localStorage.setItem('nex_api', State.apiBase);

//   const username = usernameInput.value.trim();
//   const password = passwordInput.value;
//   const path = State.authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

//   const emailInput = $('email');
//   const email = emailInput ? emailInput.value.trim() : '';
//   const body = State.authMode === 'login'
//     ? { username, password }
//     : { username, password, email };

//   try {
//     const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
//     const token = data.token || data.accessToken || data.jwt || data;
//     if (!token || typeof token !== 'string') throw new Error('No token returned by server');
//     State.token = token;
//     State.username = data.username || username;
//     localStorage.setItem('nex_token', State.token);
//     localStorage.setItem('nex_user', State.username);
//     bootApp();
//   } catch (err) {
//     authError.textContent = `// ${err.message}`;
//   }
// });

// function logout() {
//   disconnectWs();
//   localStorage.removeItem('nex_token');
//   localStorage.removeItem('nex_user');
//   State.token = null;
//   State.username = null;
//   State.rooms = [];
//   State.currentRoom = null;
//   appScreen.classList.add('hidden');
//   authScreen.classList.remove('hidden');
// }

// // ---------- Boot ----------
// function bootApp() {
// //  apiBaseInput.value = State.apiBase;
//   authScreen.classList.add('hidden');
//   appScreen.classList.remove('hidden');
//   userTag.textContent = `@${State.username}`;
//   loadRooms();
//   connectWs();
// }

// if (State.token) bootApp();

// // ---------- Rooms ----------
// async function loadRooms() {
//   try {
//     const rooms = await api('/api/rooms/my-rooms');
//     State.rooms = Array.isArray(rooms) ? rooms : [];
//     renderRooms();
//   } catch (err) {
//     console.error('loadRooms', err);
//     roomList.innerHTML = `<li class="mono micro" style="padding:10px;color:var(--danger)">// ${err.message}</li>`;
//   }
// }

// function renderRooms() {
//   if (!State.rooms.length) {
//     roomList.innerHTML = `<li class="mono micro" style="padding:10px;color:var(--dim)">// no rooms yet</li>`;
//     return;
//   }
//   roomList.innerHTML = '';
//   State.rooms.forEach(r => {
//     const id = r.roomId ?? r.id ?? r;
//     const name = r.roomName ?? r.name ?? `room-${id}`;
//     const li = document.createElement('li');
//     li.className = 'room-item' + (State.currentRoom?.id == id ? ' active' : '');
//     li.innerHTML = `<i class="lucide lucide-hash"></i><span class="room-name">${escapeHtml(name)}</span>`;
//     li.addEventListener('click', () => selectRoom({ id, name }));
//     roomList.appendChild(li);
//   });
// }

// async function selectRoom(room) {
//   if (State.currentRoom?.id == room.id) return;

//   // Leave previous
//   if (State.currentRoom && State.stomp?.connected) {
//     try {
//       State.stomp.send(`/app/chat.leave/${State.currentRoom.id}`, {},
//         JSON.stringify({ content: '', senderUsername: State.username, type: 'LEAVE' }));
//     } catch {}
//     State.subscription?.unsubscribe();
//   }

//   State.currentRoom = room;
//   State.lastSender = null;
//   roomTitle.textContent = room.name;
//   roomMeta.textContent = `room.id=${room.id}`;
//   composer.classList.remove('hidden');
//   messages.innerHTML = '';
//   renderRooms();

//   // FIX 3: show leave button when a room is selected
//   const leaveBtn = $('leave-room-btn');
//   if (leaveBtn) leaveBtn.classList.remove('hidden');

//   // History
//   try {
//     const history = await api(`/api/rooms/history/${room.id}`);
//     (history || []).forEach(renderIncoming);
//   } catch (err) {
//     addSystem(`could not load history: ${err.message}`);
//   }

//   // Subscribe + join
//   if (State.stomp?.connected) subscribeRoom(room.id);
// }

// // FIX 1 & 2: leaveRoomAction at top level scope, matching the onclick in HTML
// async function leaveRoomAction() {
//   if (!State.currentRoom) return;

//   if (!confirm(`Leave ${State.currentRoom.name}? You will lose access to this room's history.`)) return;

//   try {
//     const roomId = State.currentRoom.id;

//     // Notify others via WebSocket
//     if (State.stomp?.connected) {
//       State.stomp.send(`/app/chat.leave/${roomId}`, {},
//         JSON.stringify({ content: '', senderUsername: State.username, type: 'LEAVE' }));
//     }

//     // Unsubscribe locally
//     State.subscription?.unsubscribe();

//     // Call backend DELETE
//     await api(`/api/rooms/leave/${roomId}`, { method: 'DELETE' });

//     // Reset UI
//     State.currentRoom = null;
//     State.lastSender = null;

//     roomTitle.textContent = 'Select a room';
//     roomMeta.textContent = 'no.room.selected';
//     messages.innerHTML = `
//       <div class="empty-state">
//         <i class="lucide lucide-message-square-lock"></i>
//         <p>Pick a room from the sidebar to start chatting</p>
//         <p class="mono micro">// or create one</p>
//       </div>`;
//     composer.classList.add('hidden');

//     // Hide leave button again
//     const leaveBtn = $('leave-room-btn');
//     if (leaveBtn) leaveBtn.classList.add('hidden');

//     // Refresh sidebar
//     await loadRooms();

//   } catch (err) {
//     console.error('Error leaving room:', err);
//     alert(`// Error: ${err.message}`);
//   }
// }

// function subscribeRoom(roomId) {
//   State.subscription = State.stomp.subscribe(`/topic/room/${roomId}`, (frame) => {
//     try { renderIncoming(JSON.parse(frame.body)); } catch (e) { console.error(e); }
//   });
//   State.stomp.send(`/app/chat.join/${roomId}`, {},
//     JSON.stringify({ content: '', senderUsername: State.username, type: 'JOIN' }));
// }

// // ---------- Modal (create/join) ----------
// const modal = $('modal');
// const modalTitle = $('modal-title');
// const modalLabel = $('modal-label');
// const modalInput = $('modal-input');
// const modalSubmit = $('modal-submit');
// const modalForm = $('modal-form');
// const modalError = $('modal-error');
// let modalMode = 'create';

// function openModal(mode) {
//   modalMode = mode;
//   modalError.textContent = '';
//   modalInput.value = '';
//   if (mode === 'create') {
//     modalTitle.textContent = 'Create Room';
//     modalLabel.textContent = 'room_name';
//     modalSubmit.textContent = 'Create';
//   } else {
//     modalTitle.textContent = 'Join Room';
//     modalLabel.textContent = 'room_id_or_code';
//     modalSubmit.textContent = 'Join';
//   }
//   modal.classList.remove('hidden');
//   setTimeout(() => modalInput.focus(), 50);
// }
// $('create-room-btn').addEventListener('click', () => openModal('create'));
// $('join-room-btn').addEventListener('click', () => openModal('join'));
// $('modal-close').addEventListener('click', () => modal.classList.add('hidden'));
// modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

// modalForm.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   modalError.textContent = '';
//   const value = modalInput.value.trim();
//   try {
//     if (modalMode === 'create') {
//       const data = await api('/api/rooms/create', { method: 'POST', body: JSON.stringify({ roomName: value }) });
//       modal.classList.add('hidden');
//       await loadRooms();
//       if (data?.roomId) selectRoom({ id: data.roomId, name: data.roomName ?? value });
//     } else {
//       const data = await api(`/api/rooms/join/${value}`, { method: 'POST' });
//       modal.classList.add('hidden');
//       await loadRooms();
//       if (data?.roomName) selectRoom({ id: value, name: data.roomName });
//     }
//   } catch (err) {
//     modalError.textContent = `// ${err.message}`;
//   }
// });

// // ---------- WebSocket ----------
// function connectWs() {
//   const wsUrl = `${State.apiBase}/ws`;
//   const sock = new SockJS(wsUrl);
//   const stomp = Stomp.over(sock);
//   stomp.debug = null;
//   State.stomp = stomp;
//   setWsStatus('connecting…', false);

//   stomp.connect(
//     { Authorization: `Bearer ${State.token}` },
//     () => {
//       setWsStatus('connected', true);
//       if (State.currentRoom) subscribeRoom(State.currentRoom.id);
//     },
//     (err) => {
//       console.error('WS error', err);
//       setWsStatus('disconnected', false);
//       setTimeout(connectWs, 4000);
//     }
//   );
// }

// function disconnectWs() {
//   try { State.subscription?.unsubscribe(); } catch {}
//   try { State.stomp?.disconnect(); } catch {}
//   State.stomp = null;
//   setWsStatus('disconnected', false);
// }

// function setWsStatus(text, ok) {
//   wsStatus.textContent = text;
//   wsDot.classList.toggle('connected', !!ok);
// }

// // ---------- Composer ----------
// composer.addEventListener('submit', (e) => {
//   e.preventDefault();
//   const content = composerInput.value.trim();
//   if (!content || !State.currentRoom || !State.stomp?.connected) return;
//   const payload = { content, senderUsername: State.username, type: 'CHAT' };
//   State.stomp.send(`/app/chat.sendMessage/${State.currentRoom.id}`, {}, JSON.stringify(payload));
//   composerInput.value = '';
// });

// // ---------- Render messages ----------
// function renderIncoming(msg) {
//   const empty = messages.querySelector('.empty-state');
//   if (empty) empty.remove();

//   const type = (msg.type || 'CHAT').toUpperCase();
//   if (type === 'JOIN' || type === 'LEAVE') {
//     const verb = type === 'JOIN' ? 'joined' : 'left';
//     addSystem(`${msg.sender || msg.senderUsername || 'someone'} ${verb} the room`);
//     State.lastSender = null;
//     return;
//   }

//   const sender = msg.sender || msg.senderUsername || 'unknown';
//   const isSelf = sender === State.username;
//   const ts = formatTime(msg.timestamp);

//   if (State.lastSender === sender) {
//     const last = messages.querySelector('.msg-group:last-child .msg-bubbles');
//     if (last) {
//       const bubble = document.createElement('div');
//       bubble.className = 'msg-bubble';
//       bubble.textContent = msg.content || '';
//       last.appendChild(bubble);
//       scrollBottom();
//       return;
//     }
//   }

//   const group = document.createElement('div');
//   group.className = 'msg-group' + (isSelf ? ' self' : '');
//   group.innerHTML = `
//     <div class="avatar">${escapeHtml(sender.slice(0,2).toUpperCase())}</div>
//     <div class="msg-content">
//       <div class="msg-meta">
//         <span class="sender">${escapeHtml(sender)}</span>
//         <span>${ts}</span>
//       </div>
//       <div class="msg-bubbles">
//         <div class="msg-bubble"></div>
//       </div>
//     </div>`;
//   group.querySelector('.msg-bubble').textContent = msg.content || '';
//   messages.appendChild(group);
//   State.lastSender = sender;
//   scrollBottom();
// }

// function addSystem(text) {
//   const el = document.createElement('div');
//   el.className = 'system-msg';
//   el.innerHTML = `<i class="lucide lucide-radio"></i><span></span>`;
//   el.querySelector('span').textContent = text;
//   messages.appendChild(el);
//   scrollBottom();
// }

// function scrollBottom() { messages.scrollTop = messages.scrollHeight; }

// function formatTime(ts) {
//   if (!ts) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   const d = new Date(ts);
//   return isNaN(d) ? ts : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// }

// function escapeHtml(s) {
//   return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
// }
// function formatTime(ts) {
//   if (!ts) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   // Handle both "2026-04-23T14:10:00" and "2026-04-23T14:10:00.000Z" formats
//   let d;
//   if (typeof ts === 'string' && !ts.endsWith('Z') && !ts.includes('+')) {
//     // Server sends without timezone — treat as UTC and convert to local
//     d = new Date(ts + 'Z');
//   } else {
//     d = new Date(ts);
//   }
//   return isNaN(d) ? ts : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// }


// =================================================================
// Entropy — Frontend client for Spring Boot + STOMP/SockJS backend
// =================================================================

// =================================================================
// Entropy — Frontend client for Spring Boot + STOMP/SockJS backend
// =================================================================

const BACKEND_URL = 'https://entropy-bjdu.onrender.com';

const State = {
  apiBase: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : BACKEND_URL,
  token: localStorage.getItem('nex_token') || null,
  username: localStorage.getItem('nex_user') || null,
  rooms: [],
  currentRoom: null,
  stomp: null,
  subscription: null,
  authMode: 'login',
  lastSender: null,
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const authScreen = $('auth-screen');
const appScreen = $('app-screen');
const authForm = $('auth-form');
const authError = $('auth-error');
const authSubmitLabel = $('auth-submit-label');
const usernameInput = $('username');
const passwordInput = $('password');
const userTag = $('user-tag');
const roomList = $('room-list');
const roomTitle = $('room-title');
const roomMeta = $('room-meta');
const messages = $('messages');
const composer = $('composer');
const composerInput = $('composer-input');
const wsStatus = $('ws-status');
const wsDot = document.querySelector('.sidebar-foot .dot');

// ---------- Mobile sidebar toggle ----------
// FIX: single implementation, no duplicates
const sidebarEl = document.querySelector('.sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle');

// Create backdrop once
const backdropEl = document.createElement('div');
backdropEl.className = 'sidebar-backdrop';
document.body.appendChild(backdropEl);

function openSidebar() {
  sidebarEl?.classList.add('open');
  backdropEl.classList.add('show');
}
function closeSidebar() {
  sidebarEl?.classList.remove('open');
  backdropEl.classList.remove('show');
}

sidebarToggleBtn?.addEventListener('click', () =>
  sidebarEl?.classList.contains('open') ? closeSidebar() : openSidebar()
);
backdropEl.addEventListener('click', closeSidebar);

// Auto-close sidebar when a room is picked on mobile
document.addEventListener('click', (e) => {
  if (e.target.closest('.room-item') && window.matchMedia('(max-width: 720px)').matches) {
    closeSidebar();
  }
});

// ---------- API helpers ----------
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (State.token) headers.Authorization = `Bearer ${State.token}`;
  const res = await fetch(`${State.apiBase}${path}`, { ...opts, headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `${res.status} ${res.statusText}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// ---------- Auth ----------
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.authMode = btn.dataset.tab;
    authSubmitLabel.textContent = State.authMode === 'login' ? 'Authenticate' : 'Create Account';
    authError.textContent = '';
    const emailField = $('email-field');
    if (emailField) emailField.style.display = State.authMode === 'signup' ? 'flex' : 'none';
  });
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const path = State.authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

  const emailInput = $('email');
  const email = emailInput ? emailInput.value.trim() : '';
  const body = State.authMode === 'login'
    ? { username, password }
    : { username, password, email };

  try {
    const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
    const token = data.token || data.accessToken || data.jwt || data;
    if (!token || typeof token !== 'string') throw new Error('No token returned by server');
    State.token = token;
    State.username = data.username || username;
    localStorage.setItem('nex_token', State.token);
    localStorage.setItem('nex_user', State.username);
    bootApp();
  } catch (err) {
    authError.textContent = `// ${err.message}`;
  }
});

function logout() {
  disconnectWs();
  localStorage.removeItem('nex_token');
  localStorage.removeItem('nex_user');
  State.token = null;
  State.username = null;
  State.rooms = [];
  State.currentRoom = null;
  appScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

// ---------- Boot ----------
function bootApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  userTag.textContent = `@${State.username}`;
  loadRooms();
  connectWs();
}

if (State.token) bootApp();

// ---------- Rooms ----------
async function loadRooms() {
  try {
    const rooms = await api('/api/rooms/my-rooms');
    State.rooms = Array.isArray(rooms) ? rooms : [];
    renderRooms();
  } catch (err) {
    console.error('loadRooms', err);
    roomList.innerHTML = `<li class="mono micro" style="padding:10px;color:var(--danger)">// ${err.message}</li>`;
  }
}

function renderRooms() {
  if (!State.rooms.length) {
    roomList.innerHTML = `<li class="mono micro" style="padding:10px;color:var(--dim)">// no rooms yet</li>`;
    return;
  }
  roomList.innerHTML = '';
  State.rooms.forEach(r => {
    const id = r.roomId ?? r.id ?? r;
    const name = r.roomName ?? r.name ?? `room-${id}`;
    const li = document.createElement('li');
    li.className = 'room-item' + (State.currentRoom?.id == id ? ' active' : '');
    li.innerHTML = `<i class="lucide lucide-hash"></i><span class="room-name">${escapeHtml(name)}</span>`;
    li.addEventListener('click', () => selectRoom({ id, name }));
    roomList.appendChild(li);
  });
}

async function selectRoom(room) {
  if (State.currentRoom?.id == room.id) return;

  // Leave previous room's WebSocket subscription
  if (State.currentRoom && State.stomp?.connected) {
    try {
      State.stomp.send(`/app/chat.leave/${State.currentRoom.id}`, {},
        JSON.stringify({ content: '', senderUsername: State.username, type: 'LEAVE' }));
    } catch {}
    State.subscription?.unsubscribe();
    delete activeSubscriptions[State.currentRoom.id];
  }

  State.currentRoom = room;
  State.lastSender = null;
  roomTitle.textContent = room.name;
  roomMeta.textContent = `room.id=${room.id}`;
  composer.classList.remove('hidden');
  messages.innerHTML = '';
  renderRooms();

  const leaveBtn = $('leave-room-btn');
  if (leaveBtn) leaveBtn.classList.remove('hidden');

  // Load history
  try {
    const history = await api(`/api/rooms/history/${room.id}`);
    (history || []).forEach(renderIncoming);
  } catch (err) {
    addSystem(`could not load history: ${err.message}`);
  }

  // Subscribe to WebSocket room
  if (State.stomp?.connected) subscribeRoom(room.id);
}

// ---------- Active subscriptions map — prevents double messages ----------
const activeSubscriptions = {};

function subscribeRoom(roomId) {
  // FIX: don't subscribe twice to the same room
  if (activeSubscriptions[roomId]) return;

  activeSubscriptions[roomId] = State.stomp.subscribe(`/topic/room/${roomId}`, (frame) => {
    try { renderIncoming(JSON.parse(frame.body)); } catch (e) { console.error(e); }
  });

  State.subscription = activeSubscriptions[roomId];

  State.stomp.send(`/app/chat.join/${roomId}`, {},
    JSON.stringify({ content: '', senderUsername: State.username, type: 'JOIN' }));
}

async function leaveRoomAction() {
  if (!State.currentRoom) return;
  if (!confirm(`Leave ${State.currentRoom.name}? You will lose access to this room's history.`)) return;

  try {
    const roomId = State.currentRoom.id;

    if (State.stomp?.connected) {
      State.stomp.send(`/app/chat.leave/${roomId}`, {},
        JSON.stringify({ content: '', senderUsername: State.username, type: 'LEAVE' }));
    }

    State.subscription?.unsubscribe();
    delete activeSubscriptions[roomId];

    await api(`/api/rooms/leave/${roomId}`, { method: 'DELETE' });

    State.currentRoom = null;
    State.lastSender = null;

    roomTitle.textContent = 'Select a room';
    roomMeta.textContent = 'no.room.selected';
    messages.innerHTML = `
      <div class="empty-state">
        <i class="lucide lucide-message-square-lock"></i>
        <p>Pick a room from the sidebar to start chatting</p>
        <p class="mono micro">// or create one</p>
      </div>`;
    composer.classList.add('hidden');

    const leaveBtn = $('leave-room-btn');
    if (leaveBtn) leaveBtn.classList.add('hidden');

    await loadRooms();

  } catch (err) {
    console.error('Error leaving room:', err);
    alert(`// Error: ${err.message}`);
  }
}

// ---------- Modal (create/join) ----------
const modal = $('modal');
const modalTitle = $('modal-title');
const modalLabel = $('modal-label');
const modalInput = $('modal-input');
const modalSubmit = $('modal-submit');
const modalForm = $('modal-form');
const modalError = $('modal-error');
let modalMode = 'create';

function openModal(mode) {
  modalMode = mode;
  modalError.textContent = '';
  modalInput.value = '';
  if (mode === 'create') {
    modalTitle.textContent = 'Create Room';
    modalLabel.textContent = 'room_name';
    modalSubmit.textContent = 'Create';
  } else {
    modalTitle.textContent = 'Join Room';
    modalLabel.textContent = 'room_id_or_code';
    modalSubmit.textContent = 'Join';
  }
  modal.classList.remove('hidden');
  setTimeout(() => modalInput.focus(), 50);
}

$('create-room-btn').addEventListener('click', () => openModal('create'));
$('join-room-btn').addEventListener('click', () => openModal('join'));
$('modal-close').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

modalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  modalError.textContent = '';
  const value = modalInput.value.trim();
  try {
    if (modalMode === 'create') {
      const data = await api('/api/rooms/create', { method: 'POST', body: JSON.stringify({ roomName: value }) });
      modal.classList.add('hidden');
      await loadRooms();
      if (data?.roomId) selectRoom({ id: data.roomId, name: data.roomName ?? value });
    } else {
      const data = await api(`/api/rooms/join/${value}`, { method: 'POST' });
      modal.classList.add('hidden');
      await loadRooms();
      if (data?.roomName) selectRoom({ id: value, name: data.roomName });
    }
  } catch (err) {
    modalError.textContent = `// ${err.message}`;
  }
});

// ---------- WebSocket ----------
function connectWs() {
  const wsUrl = `${State.apiBase}/ws`;
  const sock = new SockJS(wsUrl);
  const stomp = Stomp.over(sock);
  stomp.debug = null;
  State.stomp = stomp;
  setWsStatus('connecting…', false);

  stomp.connect(
    { Authorization: `Bearer ${State.token}` },
    () => {
      setWsStatus('connected', true);
      if (State.currentRoom) subscribeRoom(State.currentRoom.id);
    },
    (err) => {
      console.error('WS error', err);
      setWsStatus('disconnected', false);
      setTimeout(connectWs, 4000);
    }
  );
}

function disconnectWs() {
  try { State.subscription?.unsubscribe(); } catch {}
  try { State.stomp?.disconnect(); } catch {}
  State.stomp = null;
  setWsStatus('disconnected', false);
}

function setWsStatus(text, ok) {
  wsStatus.textContent = text;
  wsDot.classList.toggle('connected', !!ok);
}

// ---------- Composer ----------
composer.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = composerInput.value.trim();
  if (!content || !State.currentRoom || !State.stomp?.connected) return;
  const payload = { content, senderUsername: State.username, type: 'CHAT' };
  State.stomp.send(`/app/chat.sendMessage/${State.currentRoom.id}`, {}, JSON.stringify(payload));
  composerInput.value = '';
});

// ---------- Render messages ----------
function renderIncoming(msg) {
  const empty = messages.querySelector('.empty-state');
  if (empty) empty.remove();

  const type = (msg.type || 'CHAT').toUpperCase();
  if (type === 'JOIN' || type === 'LEAVE') {
    const verb = type === 'JOIN' ? 'joined' : 'left';
    addSystem(`${msg.sender || msg.senderUsername || 'someone'} ${verb} the room`);
    State.lastSender = null;
    return;
  }

  const sender = msg.sender || msg.senderUsername || 'unknown';
  const isSelf = sender === State.username;
  const ts = formatTime(msg.timestamp);

  // Group consecutive messages from same sender
  if (State.lastSender === sender) {
    const last = messages.querySelector('.msg-group:last-child .msg-bubbles');
    if (last) {
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = msg.content || '';
      last.appendChild(bubble);
      scrollBottom();
      return;
    }
  }

  const group = document.createElement('div');
  group.className = 'msg-group' + (isSelf ? ' self' : '');
  group.innerHTML = `
    <div class="avatar">${escapeHtml(sender.slice(0,2).toUpperCase())}</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="sender">${escapeHtml(sender)}</span>
        <span>${ts}</span>
      </div>
      <div class="msg-bubbles">
        <div class="msg-bubble"></div>
      </div>
    </div>`;
  group.querySelector('.msg-bubble').textContent = msg.content || '';
  messages.appendChild(group);
  State.lastSender = sender;
  scrollBottom();
}

function addSystem(text) {
  const el = document.createElement('div');
  el.className = 'system-msg';
  el.innerHTML = `<i class="lucide lucide-radio"></i><span></span>`;
  el.querySelector('span').textContent = text;
  messages.appendChild(el);
  scrollBottom();
}

function scrollBottom() { messages.scrollTop = messages.scrollHeight; }

// FIX: single formatTime — handles UTC timestamps from server correctly
function formatTime(ts) {
  if (!ts) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let d;
  if (typeof ts === 'string' && !ts.endsWith('Z') && !ts.includes('+')) {
    d = new Date(ts + 'Z'); // treat as UTC, convert to local
  } else {
    d = new Date(ts);
  }
  return isNaN(d) ? ts : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}