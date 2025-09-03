// ======================================
// 🔧 CONFIG – NO TRAILING SPACES!
// ======================================
const API_BASE = 'https://chk-be-test2.onrender.com';
const TASKS_ENDPOINT = `${API_BASE}/tasks`;

const LS_TOKEN = 'todo_token';
const LS_USERNAME = 'todo_username';
const LS_TASKS = 'todo_tasks_v2';
const LS_PENDING = 'todo_pending_v2';

let tasks = [];

const VALID_CATEGORIES = ['Work', 'Personal', 'Study', 'Shopping', 'Other'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

// ======================================
// 🛠 UTILS
// ======================================
function uid() {
  return 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '<',
    '>': '>',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(str || '').replace(/[&<>"']/g, s => map[s]);
}

// ======================================
// 🔐 AUTH HEADER
// ======================================
function getAuthHeader() {
  const token = localStorage.getItem(LS_TOKEN);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ======================================
// 💬 MESSAGES
// ======================================
function showMessage(msg, type = 'error') {
  const el = document.getElementById('errorMessage');
  if (!el) return console.warn(msg);
  el.textContent = msg;
  el.className = type;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}
const showError = (msg) => showMessage(msg, 'error');
const showSuccess = (msg) => showMessage(msg, 'success');

// ======================================
// 💾 LOCAL STORAGE
// ======================================
function saveLocal() {
  try {
    localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
  } catch (e) {
    showError('Storage full');
  }
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_TASKS)) || [];
  } catch {
    return [];
  }
}

function loadPending() {
  try {
    return JSON.parse(localStorage.getItem(LS_PENDING)) || [];
  } catch {
    return [];
  }
}

function savePending(list) {
  try {
    localStorage.setItem(LS_PENDING, JSON.stringify(list));
  } catch (e) {
    console.warn('Pending save failed');
  }
}

// ======================================
// 🌐 SAFE FETCH WITH TIMEOUT
// ======================================
async function safeFetchJson(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...options.headers
      }
    });

    clearTimeout(id);

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { error: 'Invalid JSON response' };
    }

    if (!res.ok) {
      const msg = data.msg || data.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

// ======================================
// 🔄 NORMALIZE: Handle arrays and objects
// ======================================
function normalizeTask(raw) {
  if (!raw) return null;

  // If it's an array: [id, user_id, title, desc, cat, pri, status]
  if (Array.isArray(raw)) {
    return {
      id: String(raw[0]),
      title: String(raw[2] || 'Untitled').trim(),
      description: String(raw[3] || ''),
      category: VALID_CATEGORIES.includes(raw[4]) ? raw[4] : 'Personal',
      priority: VALID_PRIORITIES.includes(raw[5]) ? raw[5] : 'Medium',
      completed: Boolean(raw[6])
    };
  }

  // If it's an object
  return {
    id: String(raw.id),
    title: String(raw.title || 'Untitled').trim(),
    description: String(raw.description || ''),
    category: VALID_CATEGORIES.includes(raw.category) ? raw.category : 'Personal',
    priority: VALID_PRIORITIES.includes(raw.priority) ? raw.priority : 'Medium',
    completed: Boolean(raw.status)
  };
}

// ======================================
// 📤 Convert UI → Backend: Must send { subject }
// ======================================
function taskToBackend(task) {
  const subject = String(task.title || '').trim();
  if (!subject) throw new Error('Subject must be a non-empty string');
  return {
    subject,
    description: String(task.description || ''),
    category: task.category,
    priority: task.priority,
    status: task.completed ? 1 : 0
  };
}

// ======================================
// 🖼️ CREATE TASK ELEMENT
// ======================================
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.completed ? 'completed' : ''}`;
  li.dataset.id = task.id;

  const checkboxId = `task-${task.id}`;

  li.innerHTML = `
    <div class="task-content">
      <input type="checkbox" id="${checkboxId}" ${task.completed ? 'checked' : ''} />
      <div class="task-text">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <div class="task-meta">
          <span class="priority ${task.priority.toLowerCase()}">Priority: ${task.priority}</span>
          <span class="category">${task.category}</span>
        </div>
      </div>
    </div>
    <div class="task-actions">
      <img class="editButton" src="../images/edit.png" alt="Edit" title="Edit Task" />
      <img class="deleteButton" src="../images/delete.png" alt="Delete" title="Delete Task" />
    </div>
    <div class="task-edit" hidden>
      <input type="text" class="editInput" value="${escapeHtml(task.title)}" />
      <textarea class="editDesc">${escapeHtml(task.description)}</textarea>
      <select class="editPriority">
        ${VALID_PRIORITIES.map(p => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
      <select class="editCategory">
        ${VALID_CATEGORIES.map(c => `<option value="${c}" ${task.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <button class="btn saveEdit">Save</button>
      <button class="btn cancelEdit" style="background:#64748b">Cancel</button>
    </div>
  `;

  // ✅ Use event value directly
  li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
    onToggleComplete(task.id, e.target.checked);
  });

  li.querySelector('.editButton').addEventListener('click', () => startEdit(task.id));
  li.querySelector('.deleteButton').addEventListener('click', () => onDelete(task.id));
  li.querySelector('.saveEdit').addEventListener('click', () => finishEdit(task.id));
  li.querySelector('.cancelEdit').addEventListener('click', () => cancelEdit(task.id));

  return li;
}

// ======================================
// 🎨 RENDER TASKS
// ======================================
function renderTasks() {
  const ul = document.getElementById('taskList');
  if (!ul) return;

  const filterP = document.getElementById('filterPriority')?.value || '';
  const filterC = document.getElementById('filterCategory')?.value || '';

  const filtered = tasks.filter(t => {
    return (!filterP || t.priority === filterP) && (!filterC || t.category === filterC);
  });

  ul.innerHTML = filtered.length ? '' : '<li class="no-tasks">📭 No tasks found</li>';
  filtered.forEach(t => ul.appendChild(createTaskElement(t)));

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const progress = document.querySelector('progress');
  const progressText = document.getElementById('progressText');
  if (progress) progress.value = total ? (completed / total) * 100 : 0;
  if (progressText) progressText.textContent = `${completed}/${total} completed`;
}

// ======================================
// ➕ ADD TASK
// ======================================
async function onAdd(e) {
  e.preventDefault();

  const title = document.getElementById('taskInput')?.value.trim();
  if (!title) return showError('Task title is required');

  const newTask = {
    id: uid(),
    title,
    description: document.getElementById('taskDesc')?.value || '',
    category: document.getElementById('taskCategory')?.value || 'Personal',
    priority: document.getElementById('taskPriority')?.value || 'Medium',
    completed: false,
    _temp: true
  };

  tasks.push(newTask);
  renderTasks();

  // Reset form
  document.getElementById('taskInput').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskCategory').value = 'Personal';
  document.getElementById('taskPriority').value = 'Medium';

  setButtonLoading(true);
  showLoader(true);

  try {
    if (!navigator.onLine) {
      savePending([...loadPending(), { type: 'add', tempId: newTask.id, payload: taskToBackend(newTask) }]);
      showSuccess('✅ Saved offline — will sync when online');
      return;
    }

    const payload = taskToBackend(newTask);

    const res = await safeFetchJson(TASKS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // ✅ Use `res.id` only if returned
    const realId = res.id ? String(res.id) : newTask.id;
    const task = tasks.find(t => t.id === newTask.id);
    if (task) {
      task.id = realId;
      delete task._temp;
    }

    showSuccess(`✅ "${title}" added!`);
  } catch (err) {
    console.error('Add failed:', err);
    const payload = taskToBackend(newTask);
    savePending([...loadPending(), { type: 'add', tempId: newTask.id, payload }]);
    showError(`⚠️ Saved offline: ${err.message}`);
  } finally {
    setButtonLoading(false);
    showLoader(false);
    saveLocal();
    renderTasks();
  }
}

// ======================================
// ✅ TOGGLE, EDIT, DELETE
// ======================================
async function onToggleComplete(id, completed) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = completed;
  renderTasks();
  saveLocal();

  const payload = taskToBackend(task);
  if (!navigator.onLine) {
    savePending([...loadPending(), { type: 'update', id, payload }]);
    return;
  }

  try {
    await safeFetchJson(`${TASKS_ENDPOINT}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  } catch (err) {
    savePending([...loadPending(), { type: 'update', id, payload }]);
    showError('⚠️ Update saved offline');
  }
}

function startEdit(id) {
  const li = document.querySelector(`li[data-id="${id}"]`);
  if (li) {
    li.classList.add('editing');
    li.querySelector('.task-edit').hidden = false;
  }
}

function finishEdit(id) {
  const li = document.querySelector(`li[data-id="${id}"]`);
  if (!li) return;

  const title = li.querySelector('.editInput').value.trim();
  if (!title) return showError('Title is required');

  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.title = title;
  task.description = li.querySelector('.editDesc').value;
  task.priority = li.querySelector('.editPriority').value;
  task.category = li.querySelector('.editCategory').value;

  li.classList.remove('editing');
  li.querySelector('.task-edit').hidden = true;

  renderTasks();
  saveLocal();

  const payload = taskToBackend(task);
  if (!navigator.onLine) {
    savePending([...loadPending(), { type: 'update', id, payload }]);
    showSuccess('✅ Saved offline');
    return;
  }

  safeFetchJson(`${TASKS_ENDPOINT}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  .then(() => showSuccess('✅ Updated!'))
  .catch(err => {
    savePending([...loadPending(), { type: 'update', id, payload }]);
    showError('⚠️ Saved offline');
  });
}

function cancelEdit(id) {
  const li = document.querySelector(`li[data-id="${id}"]`);
  if (li) {
    li.classList.remove('editing');
    li.querySelector('.task-edit').hidden = true;
  }
}

async function onDelete(id) {
  if (!confirm('Delete this task?')) return;

  const wasOnline = navigator.onLine;
  tasks = tasks.filter(t => t.id !== id);
  renderTasks();
  saveLocal();

  if (!wasOnline) {
    savePending([...loadPending(), { type: 'delete', id }]);
    showError('🗑️ Deleted offline');
    return;
  }

  try {
    await safeFetchJson(`${TASKS_ENDPOINT}/${id}`, { method: 'DELETE' });
    showSuccess('🗑️ Deleted!');
  } catch (err) {
    savePending([...loadPending(), { type: 'delete', id }]);
    showError('⚠️ Will delete when online');
  }
}

// ======================================
// 🔄 SYNC PENDING
// ======================================
async function syncPending() {
  const ops = loadPending();
  if (!ops.length) return;

  const remaining = [];

  for (const op of ops) {
    try {
      if (op.type === 'add') {
        const res = await safeFetchJson(TASKS_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify(op.payload)
        });
        const realId = res.id ? String(res.id) : null;
        if (realId && op.tempId) {
          const task = tasks.find(t => t.id === op.tempId);
          if (task) task.id = realId;
        }
      } else if (op.type === 'update') {
        await safeFetchJson(`${TASKS_ENDPOINT}/${op.id}`, {
          method: 'PUT',
          body: JSON.stringify(op.payload)
        });
      } else if (op.type === 'delete') {
        await safeFetchJson(`${TASKS_ENDPOINT}/${op.id}`, { method: 'DELETE' });
      }
      // If successful, don't add to remaining
    } catch (err) {
      remaining.push(op);
    }
  }

  savePending(remaining);
  if (remaining.length === 0) showSuccess('✅ All synced!');
  saveLocal();
  renderTasks();
}

// ======================================
// 📥 FETCH TASKS
// ======================================
async function fetchTasks() {
  showLoader(true);

  if (!navigator.onLine) {
    tasks = loadLocal().map(normalizeTask).filter(Boolean);
    renderTasks();
    showError('📶 Offline — using saved tasks');
    showLoader(false);
    return;
  }

  try {
    const data = await safeFetchJson(TASKS_ENDPOINT);
    if (!Array.isArray(data)) throw new Error('Invalid format');
    tasks = data.map(normalizeTask).filter(Boolean);
    saveLocal();
    renderTasks();
    await syncPending();
  } catch (err) {
    console.error('Fetch failed:', err);
    const local = loadLocal().map(normalizeTask).filter(Boolean);
    if (local.length) {
      tasks = local;
      renderTasks();
      showError('⚠️ Using local data');
    } else {
      showError('❌ No tasks. Check login.');
    }
  } finally {
    showLoader(false);
  }
}

// ======================================
// 🎯 HELPERS
// ======================================
function setButtonLoading(loading) {
  const btn = document.getElementById('addTaskButton');
  const text = btn?.querySelector('.btn-text');
  if (!btn) return;
  btn.disabled = loading;
  if (text) text.textContent = loading ? 'Adding...' : '+';
  if (loading && !btn.querySelector('.spinner')) {
    const sp = document.createElement('span');
    sp.className = 'spinner';
    sp.style.marginLeft = '8px';
    btn.appendChild(sp);
  } else if (!loading && btn.querySelector('.spinner')) {
    btn.querySelector('.spinner').remove();
  }
}

function showLoader(show) {
  const el = document.getElementById('loader');
  if (el) el.style.display = show ? 'block' : 'none';
}

// ======================================
// 🚀 INIT
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(LS_TOKEN);
  if (!token) {
    window.location.href = 'auth.html';
    return;
  }

  const username = localStorage.getItem(LS_USERNAME) || 'User';
  const avatar = document.getElementById('userAvatar');
  if (avatar) avatar.textContent = username.charAt(0).toUpperCase();

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    const pending = loadPending();
    if (pending.length && !confirm(`You have ${pending.length} unsynced tasks. Logout?`)) return;
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USERNAME);
    localStorage.removeItem(LS_TASKS);
    localStorage.removeItem(LS_PENDING);
    showSuccess('👋 Logged out!');
    setTimeout(() => window.location.href = 'auth.html', 600);
  });

  document.getElementById('taskForm')?.addEventListener('submit', onAdd);
  document.getElementById('filterPriority')?.addEventListener('change', renderTasks);
  document.getElementById('filterCategory')?.addEventListener('change', renderTasks);

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });

  fetchTasks();

  window.addEventListener('online', () => {
    showSuccess('🌐 Back online — syncing...');
    syncPending();
    fetchTasks();
  });
});
