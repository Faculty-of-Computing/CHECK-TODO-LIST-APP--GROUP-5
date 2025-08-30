// -----------------------------
    // Config + Local Storage keys
    // -----------------------------
    const apiUrl = 'https://check-todo-backend.onrender.com/tasks';
    const LS_TASKS = 'todo_tasks_v1';
    const LS_PENDING = 'todo_pending_v1';
    let tasks = [];

    // -----------------------------
    // Global error catching (helps diagnose the original "Fetch Error:")
    // -----------------------------
    window.addEventListener('error', (ev) => {
      console.error('Uncaught error', ev.error || ev.message, ev.error?.stack);
      showError('Unexpected error: ' + (ev.error?.message || ev.message || 'See console'));
    });
    window.addEventListener('unhandledrejection', (ev) => {
      console.error('Unhandled promise rejection', ev.reason);
      showError('Unexpected promise error: ' + (ev.reason?.message || String(ev.reason)));
    });

    // -----------------------------
    // UI helpers
    // -----------------------------
    function showError(message){
      const el = document.getElementById('errorMessage');
      if(!el) return; el.textContent = message; el.style.display = 'block';
      clearTimeout(showError._t); showError._t = setTimeout(()=>{ el.style.display='none'; }, 5000);
      console.warn('UI Error:', message);
    }
    function showLoader(show){
      const loader = document.getElementById('loader'); if(loader) loader.style.display = show ? 'block' : 'none';
    }
    function setAddButtonLoading(loading){
      const btn = document.getElementById('addTaskButton'); if(!btn) return;
      const text = btn.querySelector('.btn-text');
      if(loading){
        btn.disabled = true; if(text) text.textContent = 'Posting...';
        if(!btn.querySelector('.spinner')){
          const sp = document.createElement('span'); sp.className = 'spinner'; sp.setAttribute('aria-hidden','true'); sp.style.marginLeft = '8px'; btn.appendChild(sp);
        }
      }else{
        btn.disabled = false; if(text) text.textContent = '+';
        const sp = btn.querySelector('.spinner'); if(sp) sp.remove();
      }
    }

    function normalizeTask(raw){
      // defensive normalization
      if(!raw) return { id: String(Date.now()), title: '', completed: false };
      return {
        id: String(raw.id ?? raw._id ?? raw.uuid ?? raw._key ?? Date.now()),
        title: (raw.title ?? raw.task ?? raw.description ?? '') + '',
        completed: Boolean(raw.completed)
      };
    }

    function escapeHtml(str){
      return String(str).replace(/[&<>"']/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    }

    function saveLocal(){
      try{ localStorage.setItem(LS_TASKS, JSON.stringify(tasks)); }catch(e){ console.warn('Could not save tasks locally', e); }
    }
    function loadLocal(){
      try{
        const raw = localStorage.getItem(LS_TASKS); if(!raw) return [];
        const parsed = JSON.parse(raw); if(Array.isArray(parsed)) return parsed.map(normalizeTask);
        return [];
      }catch(e){ console.warn('Could not load tasks from localStorage', e); return []; }
    }

    function loadPending(){
      try{ const raw = localStorage.getItem(LS_PENDING); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
    }
    function savePending(list){ try{ localStorage.setItem(LS_PENDING, JSON.stringify(list)); }catch(e){ console.warn('Could not save pending ops', e); } }

    async function syncPending(){
      const pending = loadPending(); if(!pending.length) return;
      console.info('Syncing pending ops', pending.length);
      const remaining = [];
      for(const op of pending){
        try{
          if(op.type === 'add'){
            const res = await safeFetch(apiUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: op.title, completed:false }) });
            if(res && res.ok){
              const saved = await safeParseJson(res);
              // replace local temp id in tasks
              const idx = tasks.findIndex(t => t.id === op.tempId);
              if(idx > -1){ tasks[idx] = normalizeTask(saved || { id: op.tempId, title: op.title, completed: false }); }
            }else{ remaining.push(op); }
          }else if(op.type === 'delete'){
            const res = await safeFetch(`${apiUrl}/${encodeURIComponent(op.id)}`, { method:'DELETE' });
            if(!res || !res.ok) remaining.push(op);
          }else if(op.type === 'update'){
            const res = await safeFetch(`${apiUrl}/${encodeURIComponent(op.id)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(op.payload) });
            if(!res || !res.ok) remaining.push(op);
          }
        }catch(err){ console.warn('Sync op failed, keep for later', op, err); remaining.push(op); }
      }
      savePending(remaining);
      if(remaining.length === 0) showError('All changes synced with server');
      saveLocal(); renderTasks();
    }

    // safeFetch: handles network errors separately so we can distinguish parse errors
    async function safeFetch(input, opts){
      try{
        return await fetch(input, opts);
      }catch(err){
        // network-level failure (DNS, CORS, offline, etc.)
        console.error('Network-level fetch failed', err);
        return null;
      }
    }

    async function safeParseJson(response){
      if(!response) return null;
      const ct = response.headers?.get('content-type') || '';
      try{
        if(ct.includes('application/json')) return await response.json();
        const text = await response.text();
        try{ return JSON.parse(text); }catch(e){ return text; }
      }catch(e){ console.warn('safeParseJson failed', e); return null; }
    }

    function updateProgress(){
      const completed = tasks.filter(t=>t.completed).length; const total = tasks.length;
      const progress = document.querySelector('progress'); if(progress) progress.value = total ? (completed/total)*100 : 0;
      const progressText = document.getElementById('progressText'); if(progressText) progressText.textContent = `${completed}/${total} completed`;
    }

    function createTaskLi(task){
      const li = document.createElement('li'); li.className='item'; li.dataset.id = task.id; if(task._temp) li.classList.add('temp');

      const titleText = escapeHtml(task.title);
      const checkboxId = `task_${task.id}`;
      li.innerHTML = `
        <div class="task-content">
          <input type="checkbox" id="${checkboxId}" ${task.completed ? 'checked' : ''} />
          <label for="${checkboxId}" class="task-label">${titleText}</label>
        </div>
        <div class="task-actions">
          <img class="editButton" src="../images/edit.png" alt="Edit" title="Edit Task" />
          <img class="deleteButton" src="../images/delete.png" alt="Delete" title="Delete Task" />
        </div>
        <div class="task-edit" hidden>
          <input type="text" class="editInput" value="${titleText}" />
          <div class="edit-controls">
            <button class="btn saveEdit" type="button">Save</button>
            <button class="btn cancelEdit" type="button" style="background:#64748b;color:#fff">Cancel</button>
          </div>
        </div>`;

      // defensive event attachments
      const checkbox = li.querySelector('input[type="checkbox"]');
      if(checkbox) checkbox.addEventListener('change', (e) => onToggleComplete(li.dataset.id, e.target.checked));

      const editBtn = li.querySelector('.editButton'); if(editBtn) editBtn.addEventListener('click', ()=> startEdit(li.dataset.id));
      const deleteBtn = li.querySelector('.deleteButton'); if(deleteBtn) deleteBtn.addEventListener('click', ()=> onDelete(li.dataset.id));

      const saveBtn = li.querySelector('.saveEdit'); if(saveBtn) saveBtn.addEventListener('click', ()=> finishEdit(li.dataset.id));
      const cancelBtn = li.querySelector('.cancelEdit'); if(cancelBtn) cancelBtn.addEventListener('click', ()=> cancelEdit(li.dataset.id));

      const editInput = li.querySelector('.editInput');
      if(editInput){
        editInput.addEventListener('keydown', (e) => {
          if(e.key === 'Enter') finishEdit(li.dataset.id);
          if(e.key === 'Escape') cancelEdit(li.dataset.id);
        });
      }

      return li;
    }

    function renderTasks(){
      const ul = document.getElementById('taskList'); if(!ul) return; ul.innerHTML = '';
      tasks.forEach(task => ul.appendChild(createTaskLi(task)));
      updateProgress();
    }

    function startEdit(id){
      try{
        const li = document.querySelector(`li[data-id="${id}"]`); if(!li) return;
        const task = tasks.find(t=>t.id===id); if(!task) return;
        li.querySelector('.task-content').hidden = true;
        const editDiv = li.querySelector('.task-edit'); editDiv.hidden = false;
        const input = editDiv.querySelector('.editInput'); input.value = task.title; input.focus(); input.select();
      }catch(e){ console.warn('startEdit failed', e); }
    }

    function cancelEdit(id){
      const li = document.querySelector(`li[data-id="${id}"]`); if(!li) return;
      li.querySelector('.task-content').hidden = false; li.querySelector('.task-edit').hidden = true;
    }

    async function finishEdit(id){
      const li = document.querySelector(`li[data-id="${id}"]`); if(!li) return;
      const input = li.querySelector('.editInput'); const newValue = input.value.trim(); if(!newValue) return showError('Task cannot be empty');
      const taskIndex = tasks.findIndex(t => t.id === id); if(taskIndex === -1) return; const prevTitle = tasks[taskIndex].title;
      // Optimistic update
      const label = li.querySelector('.task-label'); if(label) label.innerHTML = escapeHtml(newValue);
      tasks[taskIndex].title = newValue; li.querySelector('.task-content').hidden = false; li.querySelector('.task-edit').hidden = true;
      saveLocal(); showLoader(true);
      const payload = { title: newValue };
      try{
        const res = await safeFetch(`${apiUrl}/${encodeURIComponent(id)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if(!res || !res.ok) throw new Error('Failed to save to server');
        // update successful
      }catch(err){
        // rollback
        tasks[taskIndex].title = prevTitle; if(label) label.innerHTML = escapeHtml(prevTitle);
        showError('Could not save edit to server — rolled back');
        // queue for retry
        const pending = loadPending(); pending.push({ type:'update', id, payload }); savePending(pending);
      }finally{ showLoader(false); saveLocal(); }
    }

    // -----------------------------
    // API & actions (robust + offline-friendly)
    // -----------------------------
    async function fetchTasks(){
      showLoader(true);
      if(!navigator.onLine){
        // offline — load from local storage
        console.info('Offline — loading local tasks');
        tasks = loadLocal(); renderTasks(); showLoader(false); showError('Offline: showing saved tasks');
        // still attempt to sync pending in case user came online
        return;
      }

      try{
        const res = await safeFetch(apiUrl);
        if(!res){
          throw new Error('Network request failed (see console)');
        }
        if(!res.ok){
          const txt = await safeParseJson(res);
          throw new Error(`Server error ${res.status}: ${JSON.stringify(txt)}`);
        }
        const data = await safeParseJson(res);
        let taskArray = [];
        if(Array.isArray(data)) taskArray = data;
        else if(Array.isArray(data.tasks)) taskArray = data.tasks;
        else if(data && typeof data === 'object'){
          // some APIs return { tasks: [...] } or { data: [...] }
          if(Array.isArray(data.data)) taskArray = data.data;
          else if(Array.isArray(data.tasks)) taskArray = data.tasks;
          else taskArray = [];
        }
        tasks = taskArray.map(normalizeTask);
        renderTasks();
        saveLocal();
        // try to sync any pending ops now that we have connectivity
        await syncPending();
      }catch(err){
        console.error('Fetch Error:', err);
        // fallback to local data (if any)
        const local = loadLocal(); if(local && local.length){ tasks = local; renderTasks(); showError('Could not contact server — loaded saved tasks'); }
        else showError(err.message || 'Could not load tasks (check console)');
      }finally{ showLoader(false); }
    }

    async function onAdd(e){
      e.preventDefault();
      const input = document.getElementById('taskInput'); if(!input) return;
      const taskText = input.value.trim(); if(!taskText) return showError('Task cannot be empty');

      const tempId = `temp-${Date.now()}`;
      const optimistic = { id: tempId, title: taskText, completed:false, _temp:true };
      tasks.push(optimistic); const ul = document.getElementById('taskList'); const newLi = createTaskLi(optimistic); ul.appendChild(newLi); updateProgress();
      input.value = ''; setAddButtonLoading(true); showLoader(true);

      try{
        if(!navigator.onLine){
          // queue for later
          const pending = loadPending(); pending.push({ type:'add', title: taskText, tempId }); savePending(pending);
          showError('Offline: task saved locally and will sync when online');
          saveLocal();
          return;
        }

        const res = await safeFetch(apiUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: taskText, completed:false }) });
        if(!res){ throw new Error('Network request failed'); }
        if(!res.ok){ const txt = await safeParseJson(res); throw new Error(`Server error ${res.status}: ${JSON.stringify(txt)}`); }
        const savedRaw = await safeParseJson(res);
        const saved = normalizeTask(savedRaw || { id: tempId, title: taskText, completed:false });

        const index = tasks.findIndex(t=>t.id===tempId); if(index > -1) tasks[index] = saved;
        // update DOM li -> new id
        newLi.dataset.id = saved.id; newLi.classList.remove('temp');
        const checkbox = newLi.querySelector('input[type="checkbox"]'); if(checkbox){ checkbox.id = `task_${saved.id}`; }
        const label = newLi.querySelector('.task-label'); if(label) label.setAttribute('for', `task_${saved.id}`);

        saveLocal();
      }catch(err){
        console.error('Add failed', err);
        // save locally and queue the post
        const pending = loadPending(); pending.push({ type:'add', title: taskText, tempId }); savePending(pending);
        showError('Saved locally (server unreachable) — will sync later');
        saveLocal();
      }finally{ setAddButtonLoading(false); showLoader(false); }
    }

    async function onToggleComplete(id, completed){
      const li = document.querySelector(`li[data-id="${id}"]`); if(!li) return; const taskIndex = tasks.findIndex(t=>t.id===id); if(taskIndex===-1) return;
      const prevCompleted = tasks[taskIndex].completed; tasks[taskIndex].completed = completed; updateProgress(); saveLocal(); showLoader(true);
      try{
        if(!navigator.onLine){
          // queue update
          const pending = loadPending(); pending.push({ type:'update', id, payload: { completed } }); savePending(pending);
          showError('Offline: update queued');
          return;
        }
        const res = await safeFetch(`${apiUrl}/${encodeURIComponent(id)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ completed }) });
        if(!res || !res.ok) throw new Error('Update failed');
      }catch(err){
        console.error('Toggle failed', err);
        showError('Could not update status, rolled back'); tasks[taskIndex].completed = prevCompleted; const cb = li.querySelector('input[type="checkbox"]'); if(cb) cb.checked = prevCompleted; updateProgress(); saveLocal();
      }finally{ showLoader(false); }
    }

    async function onDelete(id){
      const li = document.querySelector(`li[data-id="${id}"]`); if(!li) return; const nextSib = li.nextSibling; const prevTasks = [...tasks];
      tasks = tasks.filter(t=>t.id!==id); li.remove(); updateProgress(); saveLocal(); showLoader(true);
      try{
        if(!navigator.onLine){
          const pending = loadPending(); pending.push({ type:'delete', id }); savePending(pending);
          showError('Offline: delete queued');
          return;
        }
        const res = await safeFetch(`${apiUrl}/${encodeURIComponent(id)}`, { method:'DELETE' });
        if(!res || !res.ok) throw new Error('Delete failed on server');
      }catch(err){
        console.error('Delete failed', err);
        showError('Delete failed, restored the item'); tasks = prevTasks; const ul = document.getElementById('taskList'); const deletedTask = prevTasks.find(t=>t.id===id); const newLi = createTaskLi(deletedTask); ul.insertBefore(newLi, nextSib); updateProgress(); saveLocal();
      }finally{ showLoader(false); }
    }

    // -----------------------------
    // Events
    // -----------------------------
    document.addEventListener('DOMContentLoaded', ()=>{
      try{
        const form = document.getElementById('taskForm'); const menuToggle = document.getElementById('menuToggle'); const navLinks = document.getElementById('navLinks');
        if(form) form.addEventListener('submit', onAdd);
        if(menuToggle && navLinks){
          menuToggle.addEventListener('click', ()=>{
            const isOpen = navLinks.classList.toggle('open'); menuToggle.setAttribute('aria-expanded', String(isOpen));
          });
        }
        document.querySelectorAll('#navLinks a').forEach(a=> a.addEventListener('click', ()=>{
          if(window.matchMedia('(max-width:768px)').matches){ navLinks.classList.remove('open'); document.getElementById('menuToggle').setAttribute('aria-expanded','false'); }
        }));

        // Try to fetch tasks from server (will fallback to local data if server is unreachable)
        fetchTasks();

        // Sync pending when back online
        window.addEventListener('online', ()=>{ showError('Back online — syncing changes...'); syncPending(); fetchTasks(); });
      }catch(e){ console.error('Init failed', e); showError('Initialization failed (see console)'); }
    });