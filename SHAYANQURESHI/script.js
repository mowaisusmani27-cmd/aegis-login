
'use strict';

/* ==============================
   NEXORA APP CORE / STATE
   ============================== */
const App = {
  storageKey: 'nexora_v1',
  state: null,
  init() {
    Storage.init();
    this.state = Storage.load();
    UI.applySettings(this.state.settings);
    User.render();
    Navigation.init();
    UI.bindGlobal();
    const page = document.body.dataset.page;
    if (page === 'dashboard') Dashboard.init();
    if (page === 'core') CoreModule.init();
    if (page === 'activity') Activity.init();
    if (page === 'notifications') Notifications.init();
    if (page === 'saved') Saved.init();
    if (page === 'profile') Profile.init();
    if (page === 'settings') Settings.init();
    if (page === 'help') Help.init();
    Auth.init();
    Search.init();
    Command.init();
  }
};

const Storage = {
  defaults() {
    return {
      users: [],
      currentUser: null,
      session: false,
      modules: [
        {id:'m1',name:'Insight Engine',description:'Turn scattered information into clear, actionable intelligence.',icon:'✦',category:'Analytics',status:'active',updated:'Today',favorite:true},
        {id:'m2',name:'Focus Studio',description:'A calm command surface for deep work, goals and personal workflows.',icon:'◌',category:'Productivity',status:'active',updated:'Yesterday',favorite:false},
        {id:'m3',name:'Knowledge Vault',description:'Organize research, notes and reusable knowledge in one place.',icon:'◇',category:'Research',status:'active',updated:'2 days ago',favorite:true},
        {id:'m4',name:'Flow Manager',description:'Design repeatable processes and keep complex work moving.',icon:'↗',category:'Operations',status:'archived',updated:'5 days ago',favorite:false}
      ],
      notifications: [
        {id:'n1',title:'Welcome to NEXORA',text:'Your modular workspace is ready to explore.',time:'Just now',read:false},
        {id:'n2',title:'Your workspace is ready',text:'All core services are operational.',time:'10 min ago',read:false},
        {id:'n3',title:'System update available',text:'A new workspace experience is available.',time:'Yesterday',read:true}
      ],
      activity: [
        {id:'a1',icon:'↗',text:'Logged in to NEXORA',time:'Just now',category:'Session'},
        {id:'a2',icon:'✦',text:'Workspace initialized',time:'10 min ago',category:'System'},
        {id:'a3',icon:'☆',text:'Knowledge Vault was favorited',time:'Yesterday',category:'Module'},
        {id:'a4',icon:'⚙',text:'Default workspace settings loaded',time:'2 days ago',category:'Settings'}
      ],
      settings: {dark:true,compact:false,accent:'violet',emailAlerts:true,updates:true,activityAlerts:true,landing:'dashboard',animations:true}
    };
  },
  init() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) { this.save(this.defaults()); return; }
      const parsed = JSON.parse(raw);
      const base = this.defaults();
      this.state = {...base,...parsed,settings:{...base.settings,...(parsed.settings||{})}};
      if (!Array.isArray(this.state.users)) this.state.users = [];
      if (!Array.isArray(this.state.modules)) this.state.modules = base.modules;
      if (!Array.isArray(this.state.notifications)) this.state.notifications = base.notifications;
      if (!Array.isArray(this.state.activity)) this.state.activity = base.activity;
      this.save(this.state);
    } catch(e) {
      console.warn('Invalid NEXORA storage, resetting.', e);
      this.save(this.defaults());
    }
  },
  load() { try { return JSON.parse(localStorage.getItem(this.storageKey)) || this.defaults(); } catch { return this.defaults(); } },
  save(data) { try { localStorage.setItem(this.storageKey, JSON.stringify(data)); } catch(e) { console.error(e); } },
  update(fn) { fn(App.state); this.save(App.state); }
};

const Auth = {
  init() {
    document.getElementById('loginForm')?.addEventListener('submit', e => { e.preventDefault(); this.login(new FormData(e.target)); });
    document.getElementById('signupForm')?.addEventListener('submit', e => { e.preventDefault(); this.signup(new FormData(e.target)); });
    document.getElementById('forgotForm')?.addEventListener('submit', e => { e.preventDefault(); this.forgot(new FormData(e.target)); });
    document.querySelectorAll('[data-social]').forEach(b => b.addEventListener('click', () => UI.toast('Social login is a demo placeholder.')));
    document.querySelectorAll('[data-toggle-password]').forEach(b => b.addEventListener('click', () => {
      const input = b.previousElementSibling; input.type = input.type === 'password' ? 'text' : 'password'; b.textContent = input.type === 'password' ? 'Show' : 'Hide';
    }));
    const p = document.querySelector('#signupForm input[name=password]');
    p?.addEventListener('input', () => this.strength(p.value));
  },
  login(fd) {
    const email = String(fd.get('email')||'').trim().toLowerCase(), password = String(fd.get('password')||'');
    if (!email || !password) return UI.toast('Please enter your email and password.','error');
    const user = App.state.users.find(u => u.email === email && u.password === password);
    if (!user) return UI.toast('Invalid email or password.','error');
    App.state.currentUser = user.id; App.state.session = true; Storage.save(App.state);
    Activity.add('Logged in to NEXORA','↗','Session'); UI.toast('Welcome back.');
    setTimeout(()=>location.href='dashboard.html',500);
  },
  signup(fd) {
    const name=String(fd.get('name')||'').trim(), username=String(fd.get('username')||'').trim(), email=String(fd.get('email')||'').trim().toLowerCase(), password=String(fd.get('password')||''), confirm=String(fd.get('confirm')||'');
    if (!name||!username||!email||!password||!confirm) return UI.toast('Please complete every field.','error');
    if (password.length<8) return UI.toast('Password must be at least 8 characters.','error');
    if (password!==confirm) return UI.toast('Passwords do not match.','error');
    if (!fd.get('terms')) return UI.toast('Please accept the demo terms.','error');
    if (App.state.users.some(u=>u.email===email)) return UI.toast('An account with this email already exists.','error');
    const user={id:'u_'+Date.now(),name,username,email,password,bio:'Building something meaningful.',joined:new Date().toLocaleDateString(undefined,{month:'short',year:'numeric'})};
    App.state.users.push(user); App.state.currentUser=user.id; App.state.session=true; Storage.save(App.state);
    Activity.add('Account created','✦','Account'); UI.toast('Account created successfully.');
    setTimeout(()=>location.href='dashboard.html',600);
  },
  forgot(fd) {
    const email=String(fd.get('email')||'').trim().toLowerCase();
    if(!email) return UI.toast('Enter your email address.','error');
    document.getElementById('resetSuccess')?.classList.remove('hidden'); UI.toast('Reset link simulated.');
  },
  strength(v) {
    const score=(v.length>=8)+(v.length>=12)+(/[A-Z]/.test(v)?1:0)+(/[0-9]/.test(v)?1:0)+(/[^A-Za-z0-9]/.test(v)?1:0);
    const bar=document.querySelector('[data-strength-bar]'), text=document.querySelector('[data-strength-text]');
    if(bar) bar.style.width=(score*20)+'%'; if(text) text.textContent=score<2?'Weak':score<4?'Good':'Strong';
  },
  logout() { App.state.session=false; App.state.currentUser=null; Storage.save(App.state); UI.toast('Signed out.'); setTimeout(()=>location.href='index.html',350); }
};

const User = {
  get(){ return App.state.users.find(u=>u.id===App.state.currentUser) || null; },
  render(){
    const u=this.get(); const name=u?.name||'Guest', initials=name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
    document.querySelectorAll('[data-name]').forEach(e=>e.textContent=name);
    document.querySelectorAll('[data-first-name]').forEach(e=>e.textContent=name.split(' ')[0]);
    document.querySelectorAll('[data-avatar]').forEach(e=>e.textContent=initials);
    document.querySelectorAll('[data-profile-name]').forEach(e=>e.textContent=name);
    document.querySelectorAll('[data-profile-username]').forEach(e=>e.textContent=u?.username||'username');
  }
};

const Navigation = {
  init(){
    const page=document.body.dataset.page;
    document.querySelectorAll('.nav-group a[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===page));
    const titles={dashboard:'Dashboard',core:'Core Workspace',activity:'Activity',notifications:'Notifications',saved:'Saved',settings:'Settings',help:'Command Center'};
    document.querySelector('[data-title]')?.replaceChildren(document.createTextNode(titles[page]||'Workspace'));
    const unread=App.state.notifications.filter(n=>!n.read).length; const badge=document.getElementById('navBadge'); if(badge){badge.textContent=unread||'';badge.style.display=unread?'inline-flex':'none';}
  }
};

const Activity = {
  add(text,icon='✦',category='System'){
    App.state.activity.unshift({id:'a_'+Date.now()+Math.random(),icon,text,time:'Just now',category});
    App.state.activity=App.state.activity.slice(0,50); Storage.save(App.state); this.render();
  },
  init(){ this.render(); document.querySelector('[data-clear-activity]')?.addEventListener('click',()=>{ if(confirm('Clear all activity?')){App.state.activity=[];Storage.save(App.state);this.render();UI.toast('Activity cleared.');}}); },
  render(){
    const target=document.getElementById('activityList'); if(!target)return;
    target.innerHTML=App.state.activity.length?App.state.activity.map(a=>`<div class="timeline-item"><span class="timeline-icon">${a.icon}</span><div><b>${UI.escape(a.text)}</b><small>${UI.escape(a.category)} · ${UI.escape(a.time)}</small></div></div>`).join(''):`<div class="empty"><span>◷</span><h3>No activity yet</h3><p>Your workspace events will appear here.</p></div>`;
    const dash=document.getElementById('dashboardActivity'); if(dash) dash.innerHTML=App.state.activity.slice(0,4).map(a=>`<div class="timeline-item"><span class="timeline-icon">${a.icon}</span><div><b>${UI.escape(a.text)}</b><small>${UI.escape(a.time)}</small></div></div>`).join('');
  }
};

const Notifications = {
  init(){this.render();document.querySelector('[data-mark-all]')?.addEventListener('click',()=>{App.state.notifications.forEach(n=>n.read=true);Storage.save(App.state);this.render();Navigation.init();UI.toast('All notifications marked as read.');});},
  render(){
    const target=document.getElementById('notificationList'); if(!target)return;
    target.innerHTML=App.state.notifications.length?App.state.notifications.map(n=>`<div class="notification ${n.read?'read':''}" data-notification="${n.id}"><span class="notif-icon">◉</span><div><b>${UI.escape(n.title)}</b><p>${UI.escape(n.text)}</p><small>${UI.escape(n.time)}</small></div><div class="notif-actions"><button data-read="${n.id}" title="Mark read">✓</button><button data-delete-notif="${n.id}" title="Delete">×</button></div></div>`).join(''):`<div class="empty"><span>◉</span><h3>You're all caught up</h3><p>No new notifications.</p></div>`;
    target.querySelectorAll('[data-read]').forEach(b=>b.onclick=()=>{const n=App.state.notifications.find(x=>x.id===b.dataset.read);if(n)n.read=true;Storage.save(App.state);this.render();Navigation.init();});
    target.querySelectorAll('[data-delete-notif]').forEach(b=>b.onclick=()=>{App.state.notifications=App.state.notifications.filter(x=>x.id!==b.dataset.deleteNotif);Storage.save(App.state);this.render();Navigation.init();});
    const dash=document.getElementById('dashboardNotifications'); if(dash) dash.innerHTML=App.state.notifications.slice(0,3).map(n=>`<div class="mini-notif ${n.read?'read':''}"><span>◉</span><div><b>${UI.escape(n.title)}</b><small>${UI.escape(n.time)}</small></div></div>`).join('');
  }
};

/* ==============================
   CORE APPLICATION MODULE
   Replace this entire section with a future application plugin.
   The NEXORA shell, auth, navigation, profile and settings do not depend on it.
   ============================== */
const CoreModule = {
  filter:'all', query:'',
  init(){
    this.render();
    document.querySelector('[data-create-module]')?.addEventListener('click',()=>this.openEditor());
    document.getElementById('moduleSearch')?.addEventListener('input',e=>{this.query=e.target.value.toLowerCase();this.render();});
    document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.filter=b.dataset.filter;this.render();}));
  },
  filtered(){
    return App.state.modules.filter(m=>(this.filter==='all'||(this.filter==='favorite'&&m.favorite)||(this.filter==='active'&&m.status==='active')||(this.filter==='archived'&&m.status==='archived')) && (!this.query||[m.name,m.description,m.category].join(' ').toLowerCase().includes(this.query)));
  },
  render(){
    const grid=document.getElementById('moduleGrid'); if(!grid)return;
    const items=this.filtered();
    grid.innerHTML=items.length?items.map(m=>`<article class="module-card"><div class="module-top"><span class="module-icon">${m.icon}</span><button class="star ${m.favorite?'on':''}" data-fav="${m.id}" aria-label="Favorite">${m.favorite?'★':'☆'}</button></div><span class="category">${UI.escape(m.category)}</span><h3>${UI.escape(m.name)}</h3><p>${UI.escape(m.description)}</p><div class="module-foot"><span class="module-status ${m.status}">● ${m.status}</span><small>Updated ${UI.escape(m.updated)}</small></div><div class="module-actions"><button data-open-module="${m.id}">Launch →</button><button data-edit-module="${m.id}">Edit</button><button data-delete-module="${m.id}" class="danger">Delete</button></div></article>`).join(''):`<div class="empty module-empty"><span>◈</span><h3>No modules found</h3><p>Try another search or create your first module.</p><button class="btn btn-primary" data-create-module>＋ Create module</button></div>`;
    grid.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>this.toggleFavorite(b.dataset.fav));
    grid.querySelectorAll('[data-open-module]').forEach(b=>b.onclick=()=>this.launch(b.dataset.openModule));
    grid.querySelectorAll('[data-edit-module]').forEach(b=>b.onclick=()=>this.openEditor(b.dataset.editModule));
    grid.querySelectorAll('[data-delete-module]').forEach(b=>b.onclick=()=>this.remove(b.dataset.deleteModule));
  },
  toggleFavorite(id){const m=App.state.modules.find(x=>x.id===id);if(m){m.favorite=!m.favorite;Storage.save(App.state);Activity.add(`${m.name} was ${m.favorite?'favorited':'unfavorited'}`,'☆','Module');this.render();}},
  launch(id){const m=App.state.modules.find(x=>x.id===id);if(m){UI.toast(`${m.name} launched — demo workspace.`);Activity.add(`Opened ${m.name}`,'↗','Module');}},
  remove(id){const m=App.state.modules.find(x=>x.id===id);if(!m)return;if(!confirm(`Delete "${m.name}"? This cannot be undone.`))return;App.state.modules=App.state.modules.filter(x=>x.id!==id);Storage.save(App.state);Activity.add(`Deleted ${m.name}`,'×','Module');this.render();UI.toast('Module deleted.');},
  openEditor(id=null){
    const m=id?App.state.modules.find(x=>x.id===id):{name:'',description:'',icon:'✦',category:'Productivity',status:'active'};
    UI.modal(`<form id="moduleForm" class="modal-form"><div class="modal-head"><div><span class="eyebrow">${id?'EDIT MODULE':'NEW MODULE'}</span><h2>${id?'Edit':'Create'} module</h2></div><button type="button" data-close-modal>×</button></div><label>Name<input name="name" value="${UI.escapeAttr(m.name)}" required maxlength="40"></label><label>Description<textarea name="description" rows="3" required>${UI.escape(m.description)}</textarea></label><div class="two"><label>Category<select name="category"><option ${m.category==='Productivity'?'selected':''}>Productivity</option><option ${m.category==='Analytics'?'selected':''}>Analytics</option><option ${m.category==='Research'?'selected':''}>Research</option><option ${m.category==='Operations'?'selected':''}>Operations</option><option>Finance</option><option>Education</option></select></label><label>Icon<input name="icon" value="${UI.escapeAttr(m.icon)}" maxlength="2"></label></div><label>Status<select name="status"><option value="active" ${m.status==='active'?'selected':''}>Active</option><option value="archived" ${m.status==='archived'?'selected':''}>Archived</option></select></label><div class="modal-actions"><button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button class="btn btn-primary" type="submit">${id?'Save changes':'Create module'}</button></div></form>`);
    document.getElementById('moduleForm')?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);const data={name:String(fd.get('name')).trim(),description:String(fd.get('description')).trim(),category:fd.get('category'),icon:fd.get('icon')||'✦',status:fd.get('status'),updated:'Just now'};if(!data.name||!data.description)return UI.toast('Complete the module details.','error');if(id){Object.assign(m,data);Activity.add(`Updated ${m.name}`,'✦','Module');}else{data.id='m_'+Date.now();data.favorite=false;App.state.modules.unshift(data);Activity.add(`Created ${data.name}`,'✦','Module');App.state.notifications.unshift({id:'n_'+Date.now(),title:'New module created',text:`${data.name} is ready in NEXORA LAB.`,time:'Just now',read:false});}Storage.save(App.state);UI.closeModal();this.render();Navigation.init();Notifications.render();UI.toast(id?'Module updated.':'Module created.');});
  }
};

const Dashboard = { init(){Activity.render();Notifications.render();} };

const Saved = { init(){this.render();},render(){const g=document.getElementById('savedGrid');if(!g)return;const items=App.state.modules.filter(m=>m.favorite);g.innerHTML=items.length?items.map(m=>`<article class="module-card"><div class="module-top"><span class="module-icon">${m.icon}</span><span class="category">${UI.escape(m.category)}</span></div><h3>${UI.escape(m.name)}</h3><p>${UI.escape(m.description)}</p><div class="module-foot"><span class="module-status ${m.status}">● ${m.status}</span><small>${m.updated}</small></div><div class="module-actions"><a href="core.html">Open in Core →</a></div></article>`).join(''):`<div class="empty module-empty"><span>☆</span><h3>No saved modules</h3><p>Favorite a module in Core to see it here.</p><a class="btn btn-primary" href="core.html">Browse Core</a></div>`;}};

const Profile = {init(){const u=User.get();if(!u)return;document.querySelectorAll('[data-profile-input]').forEach(i=>i.value=u[i.dataset.profileInput]||'');document.getElementById('profileModules')?.replaceChildren(document.createTextNode(App.state.modules.length));document.getElementById('profileForm')?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);Object.assign(u,{name:fd.get('name').trim(),username:fd.get('username').trim(),email:fd.get('email').trim(),bio:fd.get('bio').trim()});Storage.save(App.state);User.render();Activity.add('Profile updated','◎','Profile');UI.toast('Profile saved.');});}};

const Settings = {init(){const u=User.get(),s=App.state.settings;document.querySelectorAll('[data-setting]').forEach(i=>i.value=u?.[i.dataset.setting]||'');document.querySelector('[data-setting-toggle="dark"]').checked=s.dark;document.querySelector('[data-setting-toggle="compact"]').checked=s.compact;document.querySelector('[data-setting-toggle="emailAlerts"]').checked=s.emailAlerts;document.querySelector('[data-setting-toggle="updates"]').checked=s.updates;document.querySelector('[data-setting-toggle="activityAlerts"]').checked=s.activityAlerts;document.querySelector('[data-setting-toggle="animations"]').checked=s.animations;document.querySelector('[data-setting-select="accent"]').value=s.accent;document.querySelector('[data-setting-select="landing"]').value=s.landing;document.querySelector('[data-save-settings]')?.addEventListener('click',()=>this.save());},
save(){const u=User.get(),s=App.state.settings;document.querySelectorAll('[data-setting]').forEach(i=>u[i.dataset.setting]=i.value.trim());document.querySelectorAll('[data-setting-toggle]').forEach(i=>s[i.dataset.settingToggle]=i.checked);document.querySelectorAll('[data-setting-select]').forEach(i=>s[i.dataset.settingSelect]=i.value);Storage.save(App.state);UI.applySettings(s);User.render();Activity.add('Settings changed','⚙','Settings');UI.toast('Settings saved.');}};

const Search = {init(){document.querySelectorAll('[data-search]').forEach(b=>b.addEventListener('click',()=>this.open()));document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();this.open();}});},
open(){UI.overlay('search-root',`<div class="search-box"><div class="search-head">⌕<input id="globalSearch" autofocus placeholder="Search NEXORA..."><kbd>ESC</kbd></div><div id="searchResults"></div></div>`);const i=document.getElementById('globalSearch');i.oninput=()=>this.render(i.value);this.render('');},
render(q){const r=document.getElementById('searchResults');if(!r)return;const pages=[['Dashboard','dashboard.html','Workspace overview'],['Core','core.html','NEXORA LAB modules'],['Activity','activity.html','Workspace timeline'],['Notifications','notifications.html','Your inbox'],['Saved','saved.html','Favorite modules'],['Profile','profile.html','Account identity'],['Settings','settings.html','Preferences'],['Help','help.html','Command center']];const x=q.toLowerCase();const results=[...pages.filter(p=>p.join(' ').toLowerCase().includes(x)).map(p=>({title:p[0],url:p[1],text:p[2],icon:'◈'})),...App.state.modules.filter(m=>[m.name,m.description,m.category].join(' ').toLowerCase().includes(x)).map(m=>({title:m.name,url:'core.html',text:m.category+' · module',icon:m.icon}))];r.innerHTML=results.length?results.slice(0,8).map(a=>`<a class="search-result" href="${a.url}"><span>${a.icon}</span><div><b>${UI.escape(a.title)}</b><small>${UI.escape(a.text)}</small></div><span>→</span></a>`).join(''):`<div class="empty search-empty"><span>⌕</span><h3>No results</h3><p>Try another keyword.</p></div>`;}};

const Command = {items:[['Go to Dashboard','dashboard.html','⌂'],['Open Core','core.html','◈'],['Open Activity','activity.html','◷'],['Open Notifications','notifications.html','◉'],['Open Settings','settings.html','⚙'],['Create Module','#create','＋'],['Toggle Theme','#theme','◐'],['Logout','#logout','↪']],index:0,init(){document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>this.open()));document.addEventListener('keydown',e=>{if(e.key==='Escape'){UI.closeOverlay();UI.closeModal();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();this.open();}});},
open(){UI.overlay('command-root',`<div class="command-box"><div class="command-head">⌘ <input id="commandInput" autofocus placeholder="Type a command..."><kbd>ESC</kbd></div><div id="commands"></div><small class="command-foot">↑ ↓ navigate · Enter select</small></div>`);this.render('');const i=document.getElementById('commandInput');i.oninput=()=>this.render(i.value);i.onkeydown=e=>{const rows=[...document.querySelectorAll('.command-item')];if(e.key==='ArrowDown'){e.preventDefault();this.index=Math.min(this.index+1,rows.length-1);this.highlight(rows);}if(e.key==='ArrowUp'){e.preventDefault();this.index=Math.max(this.index-1,0);this.highlight(rows);}if(e.key==='Enter'){e.preventDefault();rows[this.index]?.click();}};},
render(q){const c=document.getElementById('commands');if(!c)return;const items=this.items.filter(x=>x[0].toLowerCase().includes(q.toLowerCase()));this.index=0;c.innerHTML=items.map((x,i)=>`<button class="command-item ${i===0?'selected':''}" data-cmd="${x[1]}"><span>${x[2]}</span><b>${x[0]}</b><small>${i===0?'↵':''}</small></button>`).join('');c.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>{const v=b.dataset.cmd;UI.closeOverlay();if(v==='#create'){if(document.body.dataset.page==='core')CoreModule.openEditor();else location.href='core.html';}else if(v==='#theme'){const s=App.state.settings;s.dark=!s.dark;Storage.save(App.state);UI.applySettings(s);UI.toast(s.dark?'Dark mode enabled.':'Light mode enabled.');}else if(v==='#logout')Auth.logout();else location.href=v;});},
highlight(rows){rows.forEach((r,i)=>r.classList.toggle('selected',i===this.index));rows[this.index]?.scrollIntoView({block:'nearest'});}};

const Help={init(){document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>Command.open()));}};

const UI = {
  bindGlobal(){document.querySelectorAll('[data-logout]').forEach(b=>b.addEventListener('click',()=>Auth.logout()));document.querySelector('[data-menu]')?.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.toggle('open'));},
  toast(msg,type='success'){const root=document.getElementById('toast-root');if(!root)return;const e=document.createElement('div');e.className='toast '+type;e.innerHTML=`<span>${type==='error'?'!':'✓'}</span>${UI.escape(msg)}`;root.appendChild(e);setTimeout(()=>e.classList.add('out'),2600);setTimeout(()=>e.remove(),3000);},
  modal(content){const r=document.getElementById('modal-root');if(!r)return;r.innerHTML=`<div class="overlay modal-overlay"><div class="modal">${content}</div></div>`;r.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=this.closeModal);r.querySelector('.modal-overlay').onclick=e=>{if(e.target===e.currentTarget)this.closeModal();};},
  closeModal(){document.getElementById('modal-root').innerHTML='';},
  overlay(rootId,content){const r=document.getElementById(rootId);if(!r)return;r.innerHTML=`<div class="overlay global-overlay">${content}</div>`;r.querySelector('.global-overlay').onclick=e=>{if(e.target===e.currentTarget)this.closeOverlay();};r.querySelector('[autofocus]')?.focus();},
  closeOverlay(){['command-root','search-root'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML='';});},
  applySettings(s){document.documentElement.dataset.accent=s.accent||'violet';document.documentElement.classList.toggle('compact',!!s.compact);document.documentElement.classList.toggle('no-motion',!s.animations);document.documentElement.classList.toggle('light',!s.dark);},
  escape(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));},
  escapeAttr(v){return this.escape(v).replace(/`/g,'&#096;');}
};

document.addEventListener('DOMContentLoaded',()=>App.init());
