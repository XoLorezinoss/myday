'use strict';
/* My Day v1 — single-file app logic. Sections: helpers, storage, recurring logic, views, forms, actions, init */
const V='1.1',SCHEMA=1; // SCHEMA = data-structure version; bump it and add a MIG entry whenever stored data changes shape
// ---------- helpers ----------
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const p2=n=>String(n).padStart(2,'0'),ds=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`,dt=s=>new Date(s+'T12:00:00'),today=()=>ds(new Date());
const add=(s,n,u='d')=>{const d=dt(s);u=='m'?d.setMonth(d.getMonth()+n):d.setDate(d.getDate()+n);return ds(d)};
const diff=(a,b)=>Math.round((dt(a)-dt(b))/864e5);
const fmt=s=>dt(s).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
const uid=()=>Math.random().toString(36).slice(2,10);
// ---------- storage (IndexedDB holds one state object; localStorage holds theme) ----------
const idb=new Promise(r=>{const q=indexedDB.open('my-day',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>r(q.result)});
const kv=(m,f)=>idb.then(d=>new Promise(r=>{const q=f(d.transaction('kv',m).objectStore('kv'));q.onsuccess=()=>r(q.result)}));
const D0=()=>({ver:SCHEMA,cats:[{id:'c1',n:'Home',i:'🏠'},{id:'c2',n:'Car',i:'🚗'},{id:'c3',n:'Gym',i:'🏋️'}],rec:[],rem:[],todo:[],ev:[],notes:[],topics:['AI'],
 feeds:[{n:'Google News',u:'https://news.google.com/rss/search?q={q}&hl=en-AU&gl=AU&ceid=AU:en'}]});
// ---------- data migrations: never start empty; upgrade saved data step by step ----------
const MIG={1:s=>{const d=D0();['cats','rec','rem','todo','ev','notes','topics','feeds'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=d[k]});s.rec.forEach(r=>{if(!Array.isArray(r.hist))r.hist=[r.last]})}};
function loadState(j){const s={...D0(),...j,ver:j?.ver||0};while(s.ver<SCHEMA){MIG[s.ver+1]?.(s);s.ver++}return s}
let S,tab='home',sub='todo',news=null;
const save=()=>kv('readwrite',s=>s.put(S,'s')),commit=()=>{close();save();render()};
// ---------- recurring logic ----------
const nextDue=r=>add(r.last,r.e.n,r.e.u); // next due = last completed + interval
function st(r){const d=diff(nextDue(r),today());
 if(r.snz&&r.snz>today())return{k:'snz',c:'',i:'💤',t:'Snoozed until '+fmt(r.snz),d}; // snooze never changes r.last
 const c=d<0?'red':d<=3?'amb':'grn',t=d<0?`${-d} day${d==-1?'':'s'} overdue`:d==0?'Due today':d==1?'Due tomorrow':`Due in ${d} days`;
 return{k:c,c,i:{red:'🔴',amb:'🟡',grn:'🟢'}[c],t,d}}
const btn=(a,id,l,c='')=>`<button class="${c}" data-a="${a}" data-id="${id}">${l}</button>`;
const rc=r=>{const s=st(r),c=S.cats.find(x=>x.id==r.cat)||{i:'📌',n:''};
 return `<div class="card ${s.c}"><div class="t">${c.i} ${esc(r.n)}</div><div class="st">${s.i} ${s.t}</div><small>${esc(c.n)} · Last: ${fmt(r.last)} · Next: ${fmt(nextDue(r))}</small>${r.notes?`<small>${esc(r.notes)}</small>`:''}<div class="row">${btn('done',r.id,'✓ Done','pri')}${btn('snz',r.id,'Snooze')}${btn('hist',r.id,'History')}${btn('er',r.id,'Edit')}</div></div>`};
const row=(c,id,main,sub,chk)=>`<div class="item">${chk==null?'':`<button class="ck" aria-label="Toggle done" data-a="tgl" data-c="${c}" data-id="${id}">${chk?'✅':'⬜️'}</button>`}<div class="grow" data-a="ed" data-c="${c}" data-id="${id}"><div>${main}</div><small>${sub}</small></div></div>`;
const sec=(t,b,e)=>`<h3>${t}</h3>${b||`<p class="mu">${e||''}</p>`}`;
// ---------- views ----------
const rr=r=>{const s=st(r),c=S.cats.find(x=>x.id==r.cat)||{i:'📌'};return `<div class="item ${s.c}"><div class="grow"><div class="t">${s.i} ${c.i} ${esc(r.n)}</div><small class="st">${s.t}</small></div>${btn('done',r.id,'✓ Done','pri')}${btn('snz',r.id,'Snooze')}</div>`};
const grp=(t,a,max=5)=>a.length?`<h3>${t} (${a.length})</h3>`+a.slice(0,max).map(x=>rr(x.r)).join('')+(a.length>max?`<details><summary>Show ${a.length-max} more</summary>${a.slice(max).map(x=>rr(x.r)).join('')}</details>`:''):'';
function home(){const t=today(),h=new Date().getHours(),rs=S.rec.map(r=>({r,s:st(r)})).sort((a,b)=>a.s.d-b.s.d),ac=rs.filter(x=>x.s.k!='snz');
 const ov=ac.filter(x=>x.s.d<0),dd=ac.filter(x=>x.s.d==0),so=ac.filter(x=>x.s.d>=1&&x.s.d<=3),up=ac.filter(x=>x.s.d>3&&x.s.d<=7),sn=rs.filter(x=>x.s.k=='snz');
 const ev=S.ev.filter(e=>e.date==t).sort((a,b)=>(a.start||'').localeCompare(b.start||'')),rm=S.rem.filter(x=>!x.done&&x.date<=t),td=S.todo.filter(x=>!x.done&&x.due&&x.due<=t);
 const sm=[ov.length&&`🔴 ${ov.length} overdue`,dd.length&&`🔴 ${dd.length} due today`,so.length&&`🟡 ${so.length} due soon`,(rm.length+td.length+ev.length)&&`📌 ${rm.length+td.length+ev.length} today`].filter(Boolean).join(' · ')||'✅ All clear — nothing needs attention';
 return `<h2>${h<12?'Good morning':h<18?'Good afternoon':'Good evening'} 👋</h2><div class="mu">${new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div><div class="sum">${sm}</div><input id="q" type="search" placeholder="Search everything…"><div id="res"></div>`+
 grp('Overdue',ov)+grp('Due today',dd)+grp('Due soon',so)+
 (rm.length?`<h3>Reminders today (${rm.length})</h3>`+rm.map(x=>row('rem',x.id,esc(x.title),`🔔 ${x.date<t?'Overdue · ':''}${x.time||'Today'}`,false)).join(''):'')+
 (td.length?`<h3>To-do today (${td.length})</h3>`+td.map(x=>row('todo',x.id,esc(x.t),x.due<t?'Overdue':'Due today',false)).join(''):'')+
 (ev.length?`<h3>Calendar today (${ev.length})</h3>`+ev.map(e=>row('ev',e.id,esc(e.title),'📅 '+(e.start?e.start+(e.end?'–'+e.end:''):'All day'))).join(''):'')+
 (up.length?`<details><summary>Coming up this week (${up.length})</summary>${up.map(x=>rr(x.r)).join('')}</details>`:'')+
 (sn.length?`<details><summary>Snoozed (${sn.length})</summary>${sn.map(x=>rc(x.r)).join('')}</details>`:'')}
const todoR=x=>row('todo',x.id,`<span class="${x.done?'dn':''}">${esc(x.t)}</span>`,x.due?'Due '+fmt(x.due):'',x.done);
function tasks(){const seg=`<div class="seg">${[['todo','To-do'],['rem','Reminders'],['rec','Recurring']].map(x=>`<button data-a="sub" data-id="${x[0]}" class="${sub==x[0]?'on':''}">${x[1]}</button>`).join('')}</div>`;
 if(sub=='todo'){const a=S.todo.filter(x=>!x.done),d=S.todo.filter(x=>x.done);
  return seg+`<div class="row"><input id="nt" placeholder="Add a to-do…" enterkeyhint="done"><button class="pri" data-a="qa">Add</button></div>`+a.map(todoR).join('')+(d.length?'<h3>Completed</h3>'+d.map(todoR).join(''):'')}
 if(sub=='rem'){const f=x=>row('rem',x.id,`<span class="${x.done?'dn':''}">${esc(x.title)}</span>`,fmt(x.date)+(x.time?' · '+x.time:''),x.done),s=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time);
  return seg+`<button class="pri" data-a="add" data-c="rem">+ New reminder</button>`+S.rem.filter(x=>!x.done).sort(s).map(f).join('')+(S.rem.some(x=>x.done)?'<h3>Completed</h3>'+S.rem.filter(x=>x.done).sort(s).reverse().map(f).join(''):'')}
 return seg+`<button class="pri" data-a="nr">+ New recurring task</button>`+S.cats.map(c=>{const l=S.rec.filter(r=>r.cat==c.id).sort((a,b)=>nextDue(a).localeCompare(nextDue(b)));return sec(c.i+' '+esc(c.n),l.map(rc).join(''),'No tasks yet')}).join('')}
function cal(){const t=today();let l='',d='';
 S.ev.filter(e=>e.date>=t).sort((a,b)=>(a.date+(a.start||'')).localeCompare(b.date+(b.start||''))).forEach(e=>{if(e.date!=d){d=e.date;l+=`<h3>${d==t?'Today':fmt(d)}</h3>`}
  l+=row('ev',e.id,esc(e.title),(e.start?e.start+(e.end?'–'+e.end:''):'All day')+(e.notes?' · '+esc(e.notes):''))});
 return `<button class="pri" data-a="add" data-c="ev">+ New event</button>`+(l||'<p class="mu">No upcoming events</p>')}
const notesV=()=>`<button class="pri" data-a="add" data-c="notes">+ New note</button>`+S.notes.map(n=>row('notes',n.id,`<b>${esc(n.title)}</b>`,esc((n.body||'').slice(0,90)))).join('');
function newsV(){return `<div class="chips">${S.topics.map((t,i)=>`<span class="chip">${esc(t)} <b data-a="rt" data-id="${i}">✕</b></span>`).join('')}<button data-a="at">+ Topic</button></div><button data-a="rf">↻ Refresh</button>`+
 (news==='loading'?'<p class="mu">Loading…</p>':(news||[]).map(n=>`<a class="card" href="${esc(n.l)}" target="_blank" rel="noopener"><div class="t">${esc(n.t)}</div><small>${esc(n.s)} · ${n.d?new Date(n.d.replace(' ','T')+'Z').toLocaleString('en-AU'):''} · #${esc(n.k)}</small><small>${esc(n.x)}</small></a>`).join('')||'<p class="mu">No articles. Add a topic and check your connection.</p>')}
const theme=()=>localStorage.getItem('theme')||'system';
function applyTheme(){const d=theme()=='dark'||(theme()=='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.dataset.t=d?'dark':'light'}
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',applyTheme);
const setV=()=>`<h3>Appearance</h3><select id="th">${['system','light','dark'].map(x=>`<option ${theme()==x?'selected':''}>${x}</option>`).join('')}</select><h3>Recurring tasks</h3><button data-a="cats">Manage categories</button><h3>News</h3><button data-a="at">Add topic</button> <button data-a="src">Manage sources</button><h3>Notes</h3><button data-a="notesTab">Open notes</button><h3>Data</h3><button data-a="exp">Export data</button> <button data-a="imp">Import data</button><input type="file" id="fi" accept=".json" hidden> <button class="dng" data-a="clr">Clear all data</button><h3>About</h3><p class="mu">My Day v${V} · All data stays on this device.</p>`;
function render(){const T={home:'Today',cal:'Calendar',tasks:'Tasks',news:'News',notes:'Notes',set:'Settings'};
 $('#hd').innerHTML=`<h1>${T[tab]}</h1>`;$('#mn').innerHTML={home,cal,tasks,news:newsV,notes:notesV,set:setV}[tab]();
 $('#nv').innerHTML=[['home','🏠','Home'],['cal','📅','Calendar'],['tasks','✅','Tasks'],['notes','📝','Notes'],['news','📰','News'],['set','⚙️','Settings']].map(x=>`<button data-a="tab" data-id="${x[0]}" class="${tab==x[0]?'on':''}"><span>${x[1]}</span>${x[2]}</button>`).join('');
 if(tab=='news'&&news===null)load()}
// ---------- news: free RSS (Google News search feeds) converted to JSON by rss2json.com to avoid CORS ----------
async function load(){if(!S.topics.length){news=[];return render()}news='loading';render();
 const jobs=S.topics.flatMap(t=>S.feeds.map(f=>fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(f.u.replace('{q}',encodeURIComponent(t)))).then(r=>r.json())
  .then(j=>(j.items||[]).filter(i=>/^https?:/.test(i.link)).slice(0,8).map(i=>({t:i.title,l:i.link,d:i.pubDate,s:f.n,x:(i.description||'').replace(/<[^>]*>/g,'').slice(0,140),k:t}))).catch(()=>[])));
 const seen=new Set();news=(await Promise.all(jobs)).flat().filter(n=>!seen.has(n.l)&&seen.add(n.l)).sort((a,b)=>new Date((b.d||'').replace(' ','T')+'Z')-new Date((a.d||'').replace(' ','T')+'Z'));
 if(tab=='news')render()}
// ---------- forms ----------
const close=()=>document.querySelector('.sh')?.remove();
function sheet(h){close();const e=document.createElement('div');e.className='sh';e.innerHTML=`<div class="box">${h}</div>`;e.onclick=x=>{if(x.target==e)close()};document.body.append(e);return e}
function form(title,fs,cb,del){const e=sheet(`<h3>${title}</h3>`+fs.map(f=>`<label>${f.l}${f.t=='area'?`<textarea id="f_${f.k}" rows="4">${esc(f.v)}</textarea>`:f.t=='select'?`<select id="f_${f.k}">${f.o.map(o=>`<option value="${esc(o[0])}" ${o[0]==f.v?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`:`<input id="f_${f.k}" type="${f.t||'text'}" value="${esc(f.v)}">`}</label>`).join('')+`<div class="row"><button class="pri" id="ok">Save</button>${del?'<button class="dng" id="dl">Delete</button>':''}<button id="cx">Cancel</button></div>`);
 e.querySelector('#ok').onclick=()=>{const v={};fs.forEach(f=>v[f.k]=e.querySelector('#f_'+f.k).value);cb(v)};e.querySelector('#cx').onclick=close;if(del)e.querySelector('#dl').onclick=()=>confirm('Delete?')&&del()}
const D=()=>({rem:{title:'',notes:'',date:today(),time:'',done:false},ev:{title:'',notes:'',date:today(),start:'',end:''},notes:{title:'',body:''},todo:{t:'',due:'',done:false}});
const F={rem:[{k:'title',l:'Title'},{k:'notes',l:'Notes',t:'area'},{k:'date',l:'Date',t:'date'},{k:'time',l:'Time (optional)',t:'time'}],ev:[{k:'title',l:'Title'},{k:'date',l:'Date',t:'date'},{k:'start',l:'Start',t:'time'},{k:'end',l:'End',t:'time'},{k:'notes',l:'Notes',t:'area'}],notes:[{k:'title',l:'Title'},{k:'body',l:'Note',t:'area'}],todo:[{k:'t',l:'To-do'},{k:'due',l:'Due date (optional)',t:'date'}]};
function edit(c,id){const it=S[c].find(x=>x.id==id),n=!it,o=it||D()[c],fs=F[c];
 form(n?'New':'Edit',fs.map(f=>({...f,v:o[f.k]})),v=>{if(!String(v[fs[0].k]).trim())return;Object.assign(o,v);if(n){o.id=uid();S[c].push(o)}commit()},n?0:()=>{S[c]=S[c].filter(x=>x!=it);commit()})}
const FQ=[['1d','Every 1 day'],['2d','Every 2 days'],['3d','Every 3 days'],['7d','Every 7 days'],['14d','Every 14 days'],['30d','Every 30 days'],['60d','Every 60 days'],['90d','Every 90 days'],['6m','Every 6 months'],['12m','Every 12 months'],['c','Custom (days)']];
function recForm(r){const n=!r;r=r||{n:'',notes:'',cat:S.cats[0]?.id,last:today(),e:{n:7,u:'d'},hist:[]};const key=FQ.some(f=>f[0]==r.e.n+r.e.u)?r.e.n+r.e.u:'c';
 form(n?'New recurring task':'Edit task',[{k:'n',l:'Task name',v:r.n},{k:'notes',l:'Notes',t:'area',v:r.notes},{k:'cat',l:'Category',t:'select',o:S.cats.map(c=>[c.id,c.i+' '+c.n]),v:r.cat},{k:'last',l:'Last completed',t:'date',v:r.last},{k:'f',l:'Frequency',t:'select',o:FQ,v:key},{k:'cd',l:'Custom days (if Custom)',t:'number',v:key=='c'?r.e.n:''}],v=>{
  if(!v.n.trim())return;let e;if(v.f=='c')e={n:Math.max(1,+v.cd||1),u:'d'};else{const m=v.f.match(/(\d+)([dm])/);e={n:+m[1],u:m[2]}}
  Object.assign(r,{n:v.n.trim(),notes:v.notes,cat:v.cat,last:v.last||today(),e});if(n){r.id=uid();r.hist=[r.last];S.rec.push(r)}commit()},n?0:()=>{S.rec=S.rec.filter(x=>x!=r);commit()})}
function cats(){const e=sheet(`<h3>Categories</h3>`+S.cats.map((c,i)=>`<div class="item"><div class="grow">${c.i} ${esc(c.n)}</div><button data-i="${i}" data-m="up">▲</button><button data-i="${i}" data-m="dn">▼</button><button data-i="${i}" data-m="ed">✎</button><button data-i="${i}" data-m="rm">🗑</button></div>`).join('')+`<div class="row"><button class="pri" data-m="add">+ Add</button><button data-m="x">Done</button></div>`);
 e.onclick=x=>{const b=x.target.closest('[data-m]');if(x.target==e)return close();if(!b)return;const m=b.dataset.m,i=+b.dataset.i,a=S.cats;if(m=='x')return close();
  if(m=='up'&&i>0)[a[i-1],a[i]]=[a[i],a[i-1]];if(m=='dn'&&i<a.length-1)[a[i+1],a[i]]=[a[i],a[i+1]];
  if(m=='add'||m=='ed'){const c=a[i]||{id:uid(),n:'',i:'📌'};return form('Category',[{k:'i',l:'Emoji',v:c.i},{k:'n',l:'Name',v:c.n}],v=>{if(!v.n.trim())return;Object.assign(c,{n:v.n.trim(),i:v.i||'📌'});if(m=='add')a.push(c);save();render();cats()})}
  if(m=='rm'){if(!confirm('Delete this category and its recurring tasks?'))return;S.rec=S.rec.filter(r=>r.cat!=a[i].id);a.splice(i,1)}
  save();render();cats()}}
// ---------- actions (wired via data-a attributes) ----------
const rec=id=>S.rec.find(r=>r.id==id);
const A={tab:id=>{tab=id;render()},notesTab:()=>{tab='notes';render()},sub:id=>{sub=id;render()},
 done:id=>{const r=rec(id);form('Mark done: '+esc(r.n),[{k:'d',l:'Completed on (today or pick a date)',t:'date',v:today()}],v=>{const d=v.d||today();r.hist=[...new Set([d,...r.hist])].sort().reverse();r.last=d;r.snz=null;commit()})},
 snz:id=>{const r=rec(id);form('Snooze',[{k:'d',l:'Snooze for',t:'select',o:[['1','1 day'],['3','3 days'],['7','7 days'],['14','14 days']],v:'7'},{k:'c',l:'Or custom number of days',t:'number',v:''}],v=>{r.snz=add(today(),+v.c>0?+v.c:+v.d);commit()})},
 hist:id=>{const r=rec(id);sheet(`<h3>${esc(r.n)} — history</h3>`+(r.hist.map(d=>`<div class="item">${fmt(d)}</div>`).join('')||'<p class="mu">None yet</p>')+`<div class="row"><button data-a="cl">Close</button></div>`)},
 cl:close,er:id=>recForm(rec(id)),nr:()=>recForm(),
 tgl:(id,el)=>{const x=S[el.dataset.c].find(y=>y.id==id);x.done=!x.done;save();render()},ed:(id,el)=>edit(el.dataset.c,id),add:(_,el)=>edit(el.dataset.c),
 qa:()=>{const i=$('#nt'),t=i.value.trim();if(!t)return;S.todo.push({id:uid(),t,due:'',done:false});save();render();$('#nt').focus()},
 at:()=>form('Add topic',[{k:'t',l:'Topic (e.g. ASX, BMW, Brisbane)'}],v=>{const t=v.t.trim();if(t&&!S.topics.includes(t)){S.topics.push(t);commit();if(tab=='news')load()}}),
 rt:id=>{S.topics.splice(+id,1);save();load()},rf:()=>load(),cats,
 src:()=>{const e=sheet(`<h3>News sources</h3><p class="mu">Use {q} where the topic goes in the RSS URL.</p>`+S.feeds.map((f,i)=>`<div class="item"><div class="grow">${esc(f.n)}<small>${esc(f.u)}</small></div><button data-i="${i}">🗑</button></div>`).join('')+`<div class="row"><button class="pri" data-i="add">+ Add</button><button data-i="x">Done</button></div>`);
  e.onclick=x=>{const b=x.target.closest('[data-i]');if(x.target==e||b?.dataset.i=='x')return close();if(!b)return;
   if(b.dataset.i=='add')return form('Add source',[{k:'n',l:'Name'},{k:'u',l:'RSS URL'}],v=>{if(v.n&&/^https?:/.test(v.u)){S.feeds.push(v);save();news=null;A.src()}});
   S.feeds.splice(+b.dataset.i,1);save();news=null;A.src()}},
 exp:()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));a.download=`my-day-backup-${today()}.json`;a.click()},
 imp:()=>$('#fi').click(),
 clr:()=>{if(confirm('Delete ALL your data? This cannot be undone.')){S=D0();news=null;save();render()}}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&A[b.dataset.a])A[b.dataset.a](b.dataset.id,b)});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.id=='nt')A.qa()});
document.addEventListener('change',e=>{
 if(e.target.id=='th'){localStorage.setItem('theme',e.target.value);applyTheme()}
 if(e.target.id=='fi'&&e.target.files[0])e.target.files[0].text().then(t=>{try{const j=JSON.parse(t);if(!Array.isArray(j.rec))throw 0;if(!confirm('Replace current data with this backup?'))return;S=loadState(j);news=null;save();render()}catch{alert('That file is not a valid backup.')}})});
document.addEventListener('input',e=>{if(e.target.id!='q')return;const s=e.target.value.toLowerCase().trim(),o=[];
 if(s)[['rec','n','🔁'],['rem','title','🔔'],['ev','title','📅'],['notes','title','📝'],['todo','t','☐']].forEach(([c,k,i])=>S[c].forEach(x=>{if(JSON.stringify(x).toLowerCase().includes(s))o.push(c=='rec'?rc(x):row(c,x.id,esc(x[k]),i))}));
 $('#res').innerHTML=o.join('')||(s?'<p class="mu">No results</p>':'')});
// ---------- init ----------
(async()=>{const saved=await kv('readonly',s=>s.get('s'));S=loadState(saved);
 if((saved?.ver||0)<SCHEMA){if(saved)await kv('readwrite',s=>s.put(saved,'pre-migration-backup'));save()} // keep a safety copy before upgrading
 applyTheme();render();navigator.storage?.persist?.();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!document.querySelector('.sh')&&document.activeElement.tagName!='INPUT')render()})})();
