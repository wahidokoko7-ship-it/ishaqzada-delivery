const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const provinces=["کندهار","هرات","کابل","مزار شریف","فراه","نیمروز","هلمند","غزني","پکتیا","پکتیکا","خوست","لوګر","وردګ","بامیان","دایکندی","بلخ","جوزجان","فاریاب","سرپل","سمنگان","تخار","کندز","بدخشان","بغلان","ننګرهار","لغمان","کنړ","نورستان","پروان","پنجشیر","کاپیسا","ارزگان","زابل","بادغیس","غور"];
provinces.forEach(p=>{let o=document.createElement("option");o.textContent=p;o.value=p;$("#province").append(o)});
const db={users:JSON.parse(localStorage.getItem("iz_users")||"[]"),orders:JSON.parse(localStorage.getItem("iz_orders")||"[]"),session:JSON.parse(localStorage.getItem("iz_session")||"null")};
function save(){localStorage.setItem("iz_users",JSON.stringify(db.users));localStorage.setItem("iz_orders",JSON.stringify(db.orders));localStorage.setItem("iz_session",JSON.stringify(db.session))}
function toast(t){$("#toast").textContent=t;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),2200)}
function show(id){["auth","pending","dashboard","admin"].forEach(x=>$("#"+x).classList.add("hidden"));$("#"+id).classList.remove("hidden")}
function fileData(file){return new Promise(r=>{if(!file)return r("");let fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file)})}
function render(){
 if(!db.session){show("auth");return}
 if(db.session==="admin"){renderAdmin();show("admin");return}
 const u=db.users.find(x=>x.phone===db.session);
 if(!u){db.session=null;save();show("auth");return}
 if(!u.approved){show("pending");return}
 $("#welcomeName").textContent=u.name;show("dashboard");renderOrders()
}
function renderOrders(){
 const mine=db.orders.filter(o=>o.user===db.session).sort((a,b)=>b.id-a.id);
 let k=0,other=0,total=0;mine.forEach(o=>{total+=+o.price||0;o.province==="کندهار"?k+=+o.qty||0:other+=+o.qty||0});
 $("#kCount").textContent=k;$("#oCount").textContent=other;$("#total").textContent=total.toLocaleString("en-US");
 $("#orders").innerHTML=mine.length?mine.map(o=>`<div class="order"><img src="${o.photo||''}"><div class="orderInfo"><b>${esc(o.name)}</b><div class="muted">${esc(o.province)} • ${o.qty} عدد • ${(+o.price||0).toLocaleString()} ؋</div><small>${esc(o.customerPhone)}</small></div><span class="badge">نوی</span></div>`).join(""):`<div class="card center"><div class="big">📦</div><b>آرډر نشته</b><p class="muted">تر اوسه کوم آرډر نه دی ثبت شوی.</p></div>`
}
function renderAdmin(){
 const pending=db.users.filter(u=>!u.approved);$("#pendingCount").textContent=pending.length;
 $("#requests").innerHTML=pending.length?pending.map(u=>`<div class="request"><img src="${u.photo||''}"><div class="orderInfo"><b>${esc(u.name)}</b><div>${esc(u.phone)}</div></div><button class="primary" onclick="approve('${u.phone}')">✓ تایید</button></div>`).join(""):`<div class="muted">نوی درخواست نشته.</div>`;
 const os=[...db.orders].sort((a,b)=>b.id-a.id);$("#allOrders").innerHTML=os.length?os.map(o=>`<div class="order"><div class="orderInfo"><b>${esc(o.name)}</b><div>${esc(o.province)} • ${o.qty} عدد • ${(+o.price||0).toLocaleString()} ؋</div><small>مشتری: ${esc(o.customerPhone)} | کارکوونکی: ${esc(o.user)}</small></div></div>`).join(""):`<div class="muted">تر اوسه آرډر نشته.</div>`;
}
window.approve=phone=>{let u=db.users.find(x=>x.phone===phone);if(u){u.approved=true;save();renderAdmin();toast("کارکوونکی تایید شو")}};
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#loginForm").classList.toggle("hidden",b.dataset.tab!=="login");$("#registerForm").classList.toggle("hidden",b.dataset.tab!=="register")});
$("#loginForm").onsubmit=e=>{e.preventDefault();let p=$("#loginPhone").value.trim(),pin=$("#loginPin").value.trim();if(p==="0700426319"&&pin==="0000"){db.session="admin";save();render();return}let u=db.users.find(x=>x.phone===p&&x.pin===pin);if(!u){toast("شمېره یا PIN ناسم دی");return}db.session=p;save();render()};
$("#registerForm").onsubmit=async e=>{e.preventDefault();let p=$("#regPhone").value.trim(),pin=$("#regPin").value.trim();if(!/^07\d{8}$/.test(p)||!/^\d{4}$/.test(pin)){toast("موبایل او PIN سم ولیکئ");return}if(db.users.some(x=>x.phone===p)){toast("دا شمېره مخکې ثبت شوې");return}db.users.push({name:$("#regName").value.trim(),phone:p,pin,photo:await fileData($("#regPhoto").files[0]),approved:false});db.session=p;save();render();toast("درخواست اډمین ته ولېږل شو")};
$("#orderForm").onsubmit=async e=>{e.preventDefault();let o={id:Date.now(),user:db.session,photo:await fileData($("#orderPhoto").files[0]),name:$("#orderName").value.trim(),customerPhone:$("#customerPhone").value.trim(),province:$("#province").value,qty:+$("#qty").value,address:$("#address").value.trim(),price:+$("#price").value};db.orders.push(o);save();$("#orderForm").reset();$("#orderModal").classList.add("hidden");renderOrders();toast("آرډر په بریالیتوب ثبت شو")};
$("#newOrder").onclick=()=>$("#orderModal").classList.remove("hidden");
$("#forgot").onclick=()=>$("#forgotModal").classList.remove("hidden");
$("#logout1").onclick=$("#logout2").onclick=$("#adminLogout").onclick=()=>{db.session=null;save();render()};
$$("[data-close]").forEach(x=>x.onclick=()=>x.closest(".modal").classList.add("hidden"));
let deferred;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").classList.remove("hidden")});$("#installBtn").onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;$("#installBtn").classList.add("hidden")}};
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
render();