const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const provinces = [
  "کندهار","هرات","کابل","مزار شریف","فراه","نیمروز","هلمند","غزني",
  "پکتیا","پکتیکا","خوست","لوګر","وردګ","بامیان","دایکندي","بلخ",
  "جوزجان","فاریاب","سرپل","سمنگان","تخار","کندز","بدخشان","بغلان",
  "ننګرهار","لغمان","کنړ","نورستان","پروان","پنجشیر","کاپیسا",
  "ارزگان","زابل","بادغیس","غور"
];

provinces.forEach(p => {
  const o = document.createElement("option");
  o.textContent = p;
  o.value = p;
  $("#province").appendChild(o);
});

const auth = window.firebaseAuth;
const firestore = window.firebaseDB;

let currentUser = null;
let confirmationResult = null;

function toast(text) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

function show(id) {
  ["auth", "pending", "dashboard", "admin"].forEach(x => {
    const el = $("#" + x);
    if (el) el.classList.add("hidden");
  });

  const target = $("#" + id);
  if (target) target.classList.remove("hidden");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function cleanPhone(phone) {
  phone = String(phone || "").trim();

  if (/^07\d{8}$/.test(phone)) {
    return "+93" + phone.substring(1);
  }

  if (/^\+937\d{8}$/.test(phone)) {
    return phone;
  }

  return "";
}

async function getUserData(uid) {
  const snap = await firestore.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function renderUser(user) {
  if (!user) {
    currentUser = null;
    show("auth");
    return;
  }

  currentUser = user;

  const data = await getUserData(user.uid);

  if (!data) {
    show("pending");
    return;
  }

  if (data.role === "admin") {
    await renderAdmin();
    show("admin");
    return;
  }

  if (!data.approved) {
    show("pending");
    return;
  }

  const welcome = $("#welcomeName");
  if (welcome) welcome.textContent = data.name || "کارکوونکی";

  show("dashboard");
  await renderOrders();
}

async function renderOrders() {
  if (!currentUser) return;

  const snap = await firestore
    .collection("orders")
    .where("userId", "==", currentUser.uid)
    .get();

  const orders = [];

  snap.forEach(doc => {
    orders.push({
      id: doc.id,
      ...doc.data()
    });
  });

  orders.sort((a, b) => {
    const ad = a.createdAt?.seconds || 0;
    const bd = b.createdAt?.seconds || 0;
    return bd - ad;
  });

  let k = 0;
  let other = 0;
  let total = 0;

  orders.forEach(o => {
    total += Number(o.price) || 0;

    if (o.province === "کندهار") {
      k += Number(o.qty) || 0;
    } else {
      other += Number(o.qty) || 0;
    }
  });

  if ($("#kCount")) $("#kCount").textContent = k;
  if ($("#oCount")) $("#oCount").textContent = other;
  if ($("#total")) {
    $("#total").textContent = total.toLocaleString("en-US");
  }

  if (!$("#orders")) return;

  if (!orders.length) {
    $("#orders").innerHTML = `
      <div class="card center">
        <div class="big">📦</div>
        <b>آرډر نشته</b>
        <p class="muted">تر اوسه کوم آرډر نه دی ثبت شوی.</p>
      </div>
    `;
    return;
  }

  $("#orders").innerHTML = orders.map(o => `
    <div class="order">
      ${o.photo ? `<img src="${esc(o.photo)}">` : ""}
      <div class="orderInfo">
        <b>${esc(o.name)}</b>
        <div class="muted">
          ${esc(o.province)} • ${o.qty || 0} عدد •
          ${(Number(o.price) || 0).toLocaleString()} ؋
        </div>
        <small>${esc(o.customerPhone)}</small>
      </div>
      <span class="badge">نوی</span>
    </div>
  `).join("");
}

async function renderAdmin() {
  const usersSnap = await firestore.collection("users").get();

  const users = [];
  usersSnap.forEach(doc => {
    users.push({
      id: doc.id,
      ...doc.data()
    });
  });

  const pending = users.filter(u => u.role !== "admin" && !u.approved);

  if ($("#pendingCount")) {
    $("#pendingCount").textContent = pending.length;
  }

  if ($("#requests")) {
    if (!pending.length) {
      $("#requests").innerHTML =
        `<div class="muted">نوی درخواست نشته.</div>`;
    } else {
      $("#requests").innerHTML = pending.map(u => `
        <div class="request">
          ${u.photo ? `<img src="${esc(u.photo)}">` : ""}
          <div class="orderInfo">
            <b>${esc(u.name || "")}</b>
            <div>${esc(u.phone || "")}</div>
          </div>
          <button class="primary" onclick="approveUser('${u.id}')">
            ✓ تایید
          </button>
        </div>
      `).join("");
    }
  }

  const ordersSnap = await firestore.collection("orders").get();

  const orders = [];
  ordersSnap.forEach(doc => {
    orders.push({
      id: doc.id,
      ...doc.data()
    });
  });

  orders.sort((a, b) => {
    const ad = a.createdAt?.seconds || 0;
    const bd = b.createdAt?.seconds || 0;
    return bd - ad;
  });

  if ($("#allOrders")) {
    if (!orders.length) {
      $("#allOrders").innerHTML =
        `<div class="muted">تر اوسه آرډر نشته.</div>`;
    } else {
      $("#allOrders").innerHTML = orders.map(o => `
        <div class="order">
          <div class="orderInfo">
            <b>${esc(o.name)}</b>
            <div>
              ${esc(o.province)} • ${o.qty || 0} عدد •
              ${(Number(o.price) || 0).toLocaleString()} ؋
            </div>
            <small>
              مشتری: ${esc(o.customerPhone)}
            </small>
          </div>
        </div>
      `).join("");
    }
  }
}

window.approveUser = async function(uid) {
  try {
    await firestore.collection("users").doc(uid).update({
      approved: true,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    toast("کارکوونکی تایید شو");
    await renderAdmin();

  } catch (error) {
    console.error(error);
    toast("د تایید پر مهال ستونزه رامنځته شوه");
  }
};

async function saveUserData(uid, data) {
  await firestore.collection("users").doc(uid).set(
    data,
    { merge: true }
  );
}

/* Login Tabs */

$$(".tab").forEach(button => {
  button.onclick = () => {
    $$(".tab").forEach(x => x.classList.remove("active"));
    button.classList.add("active");

    if ($("#loginForm")) {
      $("#loginForm").classList.toggle(
        "hidden",
        button.dataset.tab !== "login"
      );
    }

    if ($("#registerForm")) {
      $("#registerForm").classList.toggle(
        "hidden",
        button.dataset.tab !== "register"
      );
    }
  };
});

/* Login */

if ($("#loginForm")) {
  $("#loginForm").onsubmit = async e => {
    e.preventDefault();

    const phone = cleanPhone($("#loginPhone").value);

    if (!phone) {
      toast("د موبایل شمېره سمه ولیکئ");
      return;
    }

    try {
      toast("SMS کوډ لېږل کېږي...");

      confirmationResult =
        await auth.signInWithPhoneNumber(
          phone,
          window.recaptchaVerifier
        );

      const code = prompt("د SMS شپږ رقمي کوډ ولیکئ:");

      if (!code) {
        toast("کوډ داخل نه شو");
        return;
      }

      const result = await confirmationResult.confirm(code);

      const user = result.user;

      const data = await getUserData(user.uid);

      if (!data) {
        await saveUserData(user.uid, {
          phone: phone,
          name: "",
          approved: false,
          role: "worker",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      toast("ننوتل بریالي شول");
      await renderUser(user);

    } catch (error) {
      console.error(error);
      toast("ننوتل ناکام شول: " + (error.message || ""));
    }
  };
}

/* Register */

if ($("#registerForm")) {
  $("#registerForm").onsubmit = async e => {
    e.preventDefault();

    const name = $("#regName").value.trim();
    const phone = cleanPhone($("#regPhone").value);
    const pin = $("#regPin").value.trim();

    if (!name) {
      toast("نوم ولیکئ");
      return;
    }

    if (!phone) {
      toast("د موبایل شمېره سمه ولیکئ");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      toast("PIN باید ۴ رقمي وي");
      return;
    }

    try {
      toast("SMS کوډ لېږل کېږي...");

      confirmationResult =
        await auth.signInWithPhoneNumber(
          phone,
          window.recaptchaVerifier
        );

      const code = prompt("د SMS شپږ رقمي کوډ ولیکئ:");

      if (!code) {
        toast("کوډ داخل نه شو");
        return;
      }

      const result = await confirmationResult.confirm(code);

      const user = result.user;

      await saveUserData(user.uid, {
        uid: user.uid,
        name: name,
        phone: phone,
        pin: pin,
        approved: false,
        role: "worker",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      toast("درخواست اډمین ته ولېږل شو");

      await renderUser(user);

    } catch (error) {
      console.error(error);
      toast("ثبت نام ناکام شو: " + (error.message || ""));
    }
  };
}

/* New Order */

if ($("#orderForm")) {
  $("#orderForm").onsubmit = async e => {
    e.preventDefault();

    if (!currentUser) {
      toast("لومړی Login وکړئ");
      return;
    }

    try {
      const order = {
        userId: currentUser.uid,
        name: $("#orderName").value.trim(),
        customerPhone: $("#customerPhone").value.trim(),
        province: $("#province").value,
        qty: Number($("#qty").value),
        address: $("#address").value.trim(),
        price: Number($("#price").value),
        photo: "",
        status: "new",
        createdAt:
          firebase.firestore.FieldValue.serverTimestamp()
      };

      await firestore.collection("orders").add(order);

      $("#orderForm").reset();

      if ($("#orderModal")) {
        $("#orderModal").classList.add("hidden");
      }

      toast("آرډر په بریالیتوب ثبت شو");

      await renderOrders();

    } catch (error) {
      console.error(error);
      toast("آرډر ثبت نه شو");
    }
  };
}

/* New Order Button */

if ($("#newOrder")) {
  $("#newOrder").onclick = () => {
    $("#orderModal").classList.remove("hidden");
  };
}

/* Forgot PIN */

if ($("#forgot")) {
  $("#forgot").onclick = () => {
    $("#forgotModal").classList.remove("hidden");
  };
}

/* Close Modals */

$$("[data-close]").forEach(x => {
  x.onclick = () => {
    const modal = x.closest(".modal");
    if (modal) modal.classList.add("hidden");
  };
});

/* Logout */

async function logout() {
  try {
    await auth.signOut();
    currentUser = null;
    show("auth");
    toast("له حسابه ووتلئ");
  } catch (error) {
    console.error(error);
  }
}

if ($("#logout1")) $("#logout1").onclick = logout;
if ($("#logout2")) $("#logout2").onclick = logout;
if ($("#adminLogout")) $("#adminLogout").onclick = logout;

/* Firebase Auth State */

auth.onAuthStateChanged(async user => {
  if (user) {
    await renderUser(user);
  } else {
    currentUser = null;
    show("auth");
  }
});

/* reCAPTCHA */

try {
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
    "recaptcha-container",
    {
      size: "invisible"
    }
  );

  window.recaptchaVerifier.render();

} catch (error) {
  console.log("reCAPTCHA:", error);
}

/* PWA Install */

let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;

  if ($("#installBtn")) {
    $("#installBtn").classList.remove("hidden");
  }
});

if ($("#installBtn")) {
  $("#installBtn").onclick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    deferredPrompt = null;

    $("#installBtn").classList.add("hidden");
  };
}

/* Service Worker */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js")
    .catch(err => console.log("SW:", err));
      }
