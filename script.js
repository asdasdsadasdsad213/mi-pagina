/* ---------- helpers: storage ---------- */
const STORAGE = {
  planner: 'aula_planner_v1',
  tasks: 'aula_tasks_v1',
  habits: 'aula_habits_v1'
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------- NAVIGATION ---------- */
$$('.menu-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    $$('.menu-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');

    $$('.panel').forEach(p=>p.classList.remove('active'));
    const id = btn.dataset.section;
    document.getElementById(id).classList.add('active');

    // refresh content when switching
    renderAll();
  });
});

/* ---------- INITIAL RENDER ---------- */
function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch(e){ return fallback; }
}
function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

/* planner: array of events {title,date,start,end,type} */
let planner = loadJSON(STORAGE.planner, []);
let tasks = loadJSON(STORAGE.tasks, []);
let habits = loadJSON(STORAGE.habits, []);

/* ---------- RENDERERS ---------- */
function renderHeroStats(){
  // clases hoy
  const today = (new Date()).toISOString().slice(0,10);
  const classesToday = planner.filter(ev=>ev.date === today && ev.type === 'clase').length;
  const totalStudyHours = tasks.reduce((s,t)=> s + (t.hours||0), 0);
  const pendingTasks = tasks.filter(t=>!t.done).length;

  $('#card-classes').textContent = classesToday;
  $('#card-study').textContent = totalStudyHours + 'h';
  $('#card-tasks').textContent = pendingTasks;
  $('#quickSummary').textContent = `Tienes ${pendingTasks} tarea(s) pendientes y ${classesToday} clase(s) hoy.`;
}

/* AGENDA */
$('#agendaForm').addEventListener('submit', e=>{
  e.preventDefault();
  const title = $('#agendaTitle').value.trim();
  const date = $('#agendaDate').value;
  const start = $('#agendaStart').value || '';
  const end = $('#agendaEnd').value || '';
  const type = $('#agendaType').value;

  if(!title || !date) return;
  planner.push({title,date,start,end,type});
  saveJSON(STORAGE.planner, planner);
  $('#agendaTitle').value=''; $('#agendaDate').value=''; $('#agendaStart').value=''; $('#agendaEnd').value='';
  renderAgenda();
  renderHeroStats();
});

/* render agenda list (next 7 days) */
function renderAgenda(){
  const root = $('#agendaList');
  root.innerHTML = '';
  const today = new Date();
  for(let i=0;i<7;i++){
    const d = new Date(today); d.setDate(today.getDate()+i);
    const iso = d.toISOString().slice(0,10);
    const label = d.toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'});
    const items = planner.filter(p=>p.date === iso);

    const block = document.createElement('div');
    block.className='agenda-item';
    block.innerHTML = `<div><strong>${label}</strong><div class="muted">${items.length} actividad(es)</div></div>
      <div>${ items.length ? items.map(it=>`<div>${it.start?it.start+' • ':''}${it.title}</div>`).join('') : '<small class="muted">— vacío —</small>' }</div>`;
    root.appendChild(block);
  }
}

/* PLANNER weekly grid */
function renderPlanner(){
  const grid = $('#plannerGrid');
  grid.innerHTML = '';
  const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const monday = (d => { d = new Date(d); const diff = d.getDate() - d.getDay() + 1; d.setDate(diff); return d; })(new Date()); // approx Monday
  for(let i=0;i<7;i++){
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const iso = d.toISOString().slice(0,10);
    const col = document.createElement('div');
    col.className='day';
    col.innerHTML = `<h4>${days[i]} <small style="color:var(--muted)"> ${d.getDate()}</small></h4>
      <div class="day-items">${planner.filter(p=>p.date===iso).map(it=>`<div class="pitem">${it.start?'<small>'+it.start+'</small>':''} <strong>${it.title}</strong> <span style="color:var(--muted)"> ${it.type}</span></div>`).join('') || '<small class="muted">sin actividades</small>'}</div>`;
    grid.appendChild(col);
  }
}

/* TASKS */
$('#addTaskBtn').addEventListener('click', (e)=>{
  e.preventDefault();
  const txt = $('#newTaskText').value.trim();
  const pr = $('#taskPriority').value;
  if(!txt) return;
  const item = {id:Date.now(), text:txt, priority:pr, done:false, hours:0};
  tasks.unshift(item);
  saveJSON(STORAGE.tasks, tasks);
  $('#newTaskText').value='';
  renderTasks();
  renderHeroStats();
});

function renderTasks(){
  const list = $('#tasksList'); list.innerHTML='';
  tasks.forEach(t=>{
    const li = document.createElement('li');
    li.className = 'task-priority ' + t.priority;
    li.innerHTML = `<div>
        <input type="checkbox" ${t.done?'checked':''} onchange="toggleTask(${t.id},this.checked)" />
        <span style="margin-left:8px">${t.text}</span>
      </div>
      <div>
        <small style="margin-right:8px">${t.hours || 0}h</small>
        <button onclick="removeTask(${t.id})">❌</button>
      </div>`;
    list.appendChild(li);
  });
}
window.toggleTask = function(id,checked){
  const it = tasks.find(t=>t.id===id); if(!it) return;
  it.done = !!checked;
  saveJSON(STORAGE.tasks, tasks);
  renderTasks(); renderHeroStats();
}
window.removeTask = function(id){
  tasks = tasks.filter(t=>t.id!==id);
  saveJSON(STORAGE.tasks, tasks);
  renderTasks(); renderHeroStats();
}

/* HABITS */
$('#addHabitForm').addEventListener('submit', e=>{
  e.preventDefault();
  const name = $('#habitName').value.trim();
  if(!name) return;
  habits.push({id:Date.now(),name, streak:0});
  saveJSON(STORAGE.habits, habits);
  $('#habitName').value='';
  renderHabits();
});

function renderHabits(){
  const root = $('#habitsList');
  root.innerHTML='';
  habits.forEach(h=>{
    const card = document.createElement('div');
    card.className='habit-card';
    card.innerHTML = `<div><strong>${h.name}</strong><div class="muted">racha: ${h.streak} d</div></div>
      <div class="habit-row"><button onclick="incrementHabit(${h.id})">+día</button> <button onclick="removeHabit(${h.id})">Eliminar</button></div>`;
    root.appendChild(card);
  });
}
window.incrementHabit = function(id){
  const it = habits.find(h=>h.id===id); if(!it) return;
  it.streak++; saveJSON(STORAGE.habits, habits); renderHabits();
}
window.removeHabit = function(id){
  habits = habits.filter(h=>h.id!==id); saveJSON(STORAGE.habits,habits); renderHabits();
}

/* REPORTS: simple distribution by weekday from planner durations (if hours attached to tasks) */
function renderReports(){
  // compute hours per weekday from tasks.hours (simple approach)
  const map = {lun:0, mar:0, mie:0, jue:0, vie:0, sab:0, dom:0};
  tasks.forEach(t=>{
    // if task has date (not implemented) we skip; we'll evenly allocate hours to today for demo
    const todayIdx = (new Date()).getDay() || 7; // 1-7
    const keys = ['dom','lun','mar','mie','jue','vie','sab'];
    const key = keys[todayIdx%7];
    map[key] += (t.hours||0);
  });
  // total hours
  const total = Object.values(map).reduce((a,b)=>a+b,0);
  $('#totalHours').textContent = total + 'h';
  // set widths (normalize to 100)
  const max = Math.max(...Object.values(map),1);
  $('#r-lun').style.width = Math.round((map.lun/max)*100) + '%';
  $('#r-mar').style.width = Math.round((map.mar/max)*100) + '%';
  $('#r-mie').style.width = Math.round((map.mie/max)*100) + '%';
  $('#r-jue').style.width = Math.round((map.jue/max)*100) + '%';
  $('#r-vie').style.width = Math.round((map.vie/max)*100) + '%';
  $('#r-sab').style.width = Math.round((map.sab/max)*100) + '%';
  $('#r-dom').style.width = Math.round((map.dom/max)*100) + '%';
}

/* UPCOMING */
function renderUpcoming(){
  const root = $('#upcomingList'); root.innerHTML='';
  const upcoming = planner.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
  if(upcoming.length===0) root.innerHTML = '<li class="muted">No hay actividades próximas</li>';
  upcoming.forEach(u=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${u.title}</strong><div class="muted">${u.date} ${u.start? ' • '+u.start : ''}</div></div>
      <div><small>${u.type}</small></div>`;
    root.appendChild(li);
  });
}

/* RENDER ALL */
function renderAll(){
  renderHeroStats();
  renderAgenda();
  renderPlanner();
  renderTasks();
  renderHabits();
  renderReports();
  renderUpcoming();
}

/* initial */
renderAll();
