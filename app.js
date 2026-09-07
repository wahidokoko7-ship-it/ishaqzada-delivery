// ===============================
// اسحاق‌زاده آنلاین ډیلیوري
// Firebase Delivery Management App
// ===============================

const ADMIN_PHONE = "+93704451971";

const firebaseConfig = {
  apiKey: "AIzaSyBTbCfJzrrDVJmwmCFv00Ob7HRgsUKz97M",
  authDomain: "ishaqzada-deliver.firebaseapp.com",
  projectId: "ishaqzada-deliver",
  storageBucket: "ishaqzada-deliver.firebasestorage.app",
  messagingSenderId: "620630878757",
  appId: "1:620630878757:web:e507a5c36c65e581f86dcc",
  measurementId: "G-MSQBV3EMPN"
};

// ===============================
// Firebase
// ===============================

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let confirmationResult = null;
let recaptchaVerifier = null;
let currentUser = null;
let recaptchaCreating = false;

// ===============================
// Provinces
// ===============================

const provinces = [
  "کابل",
  "کندهار",
  "هرات",
  "بلخ",
  "ننګرهار",
  "بدخشان",
  "بغلان",
  "بامیان",
  "دایکندی",
  "فراه",
  "فاریاب",
  "غزني",
  "غور",
  "هلمند",
  "کاپیسا",
  "خوست",
  "کنړ",
  "کندز",
  "لغمان",
  "لوګر",
  "میدان وردګ",
  "نیمروز",
  "نورستان",
  "پکتیا",
  "پکتیکا",
  "پنجشېر",
  "پروان",
  "سمنګان",
  "سرپل",
  "تخار",
  "ارزګان",
  "زابل"
];

// ===============================
// Helpers
// ===============================

function $(id) {
  return document.getElementById(id);
}

function cleanPhone(phone) {
  if (!phone) return "";

  phone = String(phone)
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (/^07\d{8}$/.test(phone)) {
    return "+93" + phone.substring(1);
  }

  if (/^\+937\d{8}$/.test(phone)) {
    return phone;
  }

  if (/^00937\d{8}$/.test(phone)) {
    return "+" + phone.substring(2);
  }

  if (/^937\d{8}$/.test(phone)) {
    return "+" + phone;
  }

  return "";
}

function isAdminPhone(phone) {
  return cleanPhone(phone) === ADMIN_PHONE;
}

function isAdminUser(user) {
  return !!user && isAdminPhone(user.phoneNumber);
}

function text(id, value) {
  const el = $(id);
  if (el) {
    el.textContent = value ?? "";
  }
}

function val(id) {
  const el = $(id);
  return el ? String(el.value || "").trim() : "";
}

function alertMsg(message) {
  alert(message);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===============================
// Page Navigation
// ===============================

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.style.display = "none";
  });

  const page = $(pageId);

  if (page) {
    page.style.display = "block";
  }
}

function showLogin() {
  showPage("login-page");
}

function showRegister() {
  showPage("register-page");
}

function showForgotPin() {
  showPage("forgot-page");
}

// ===============================
// reCAPTCHA — FIXED
// ===============================
//
// مهم:
// reCAPTCHA نور د page load پر مهال render نه کېږي.
// یوازې د SMS غوښتلو پر وخت جوړېږي.
// render() هم په لاس نه اجرا کېږي.
// دا د:
// "reCAPTCHA has already been rendered in this element"
// ستونزه ختموي.
// ===============================

function clearRecaptchaContainer() {
  const container = $("recaptcha-container");

  if (container) {
    container.innerHTML = "";
  }
}

function resetRecaptcha() {
  try {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
    }
  } catch (error) {
    console.log("reCAPTCHA clear:", error);
  }

  recaptchaVerifier = null;
  recaptchaCreating = false;

  clearRecaptchaContainer();
}

function setupRecaptcha() {
  // که verifier لا دمخه جوړ وي، هماغه استعمال کړه
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  if (recaptchaCreating) {
    return null;
  }

  const container = $("recaptcha-container");

  if (!container) {
    console.error("recaptcha-container not found");
    return null;
  }

  recaptchaCreating = true;

  try {
    // که پخوانی verifier په container کې پاتې وي، پاک یې کړه
    clearRecaptchaContainer();

    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container",
      {
        size: "invisible",

        callback: function () {
          console.log("reCAPTCHA verified");
        },

        "expired-callback": function () {
          console.log("reCAPTCHA expired");
          resetRecaptcha();
        },

        "error-callback": function () {
          console.log("reCAPTCHA error");
          resetRecaptcha();
        }
      }
    );

    recaptchaCreating = false;

    // مهم:
    // دلته recaptchaVerifier.render() نشته.
    // Firebase به یې د signInWithPhoneNumber پر مهال render کړي.

    return recaptchaVerifier;

  } catch (error) {
    recaptchaCreating = false;
    recaptchaVerifier = null;

    console.error("reCAPTCHA setup error:", error);

    clearRecaptchaContainer();

    return null;
  }
}

// ===============================
// Firebase Error Messages
// ===============================

function firebaseError(error) {
  console.error("Firebase error:", error);

  const code = error?.code || "";

  switch (code) {

    case "auth/invalid-phone-number":
      return "د موبایل شمېره سمه نه ده.";

    case "auth/too-many-requests":
      return "ډېرې هڅې شوې دي. لږ وروسته بیا هڅه وکړئ.";

    case "auth/quota-exceeded":
      return "د SMS ورځنی حد پوره شوی دی. وروسته بیا هڅه وکړئ.";

    case "auth/invalid-verification-code":
      return "د تایید کوډ ناسم دی.";

    case "auth/code-expired":
      return "د تایید کوډ موده پای ته رسېدلې.";

    case "auth/session-expired":
      return "د تایید ناستې موده پای ته رسېدلې. بیا SMS وغواړئ.";

    case "auth/captcha-check-failed":
      return "د امنیت تایید ناکام شو. بیا هڅه وکړئ.";

    case "auth/network-request-failed":
      return "د انټرنېټ ستونزه ده.";

    case "auth/operation-not-allowed":
      return "Phone Authentication په Firebase کې فعال نه دی.";

    case "auth/invalid-app-credential":
      return "د امنیت تایید ستونزه ده. بیا هڅه وکړئ.";

    case "auth/missing-phone-number":
      return "د موبایل شمېره ولیکئ.";

    default:
      return error?.message || "یوه ستونزه رامنځته شوه.";
  }
}

// ===============================
// Provinces Setup
// ===============================

function setupProvinces() {

  const selects = document.querySelectorAll(
    "#province, #register-province, #order-province"
  );

  selects.forEach(select => {

    if (!select) return;

    if (select.options.length > 1) return;

    provinces.forEach(province => {

      const option = document.createElement("option");

      option.value = province;
      option.textContent = province;

      select.appendChild(option);
    });
  });
}

// ===============================
// Registration
// ===============================

async function registerWorker() {

  const name = val("register-name");
  const phoneInput = val("register-phone");
  const pin = val("register-pin");
  const province = val("register-province");

  if (!name || !phoneInput || !pin || !province) {
    alertMsg("مهرباني وکړئ ټول معلومات بشپړ کړئ.");
    return;
  }

  const phone = cleanPhone(phoneInput);

  if (!/^\+937\d{8}$/.test(phone)) {
    alertMsg("د افغانستان معتبر موبایل نمبر ولیکئ.");
    return;
  }

  if (!/^\d{4,}$/.test(pin)) {
    alertMsg("PIN باید لږ تر لږه ۴ عددي وي.");
    return;
  }

  try {

    const verifier = setupRecaptcha();

    if (!verifier) {
      alertMsg("د امنیت تایید فعال نه شو. بیا هڅه وکړئ.");
      return;
    }

    confirmationResult =
      await auth.signInWithPhoneNumber(
        phone,
        verifier
      );

    sessionStorage.setItem(
      "registerData",
      JSON.stringify({
        name,
        phone,
        pin,
        province
      })
    );

    alertMsg(
      "د تایید کوډ ستاسو موبایل ته واستول شو."
    );

    showPage("verify-page");

  } catch (error) {

    alertMsg(firebaseError(error));

    resetRecaptcha();
  }
}

// ===============================
// Register Verification
// ===============================

async function verifyCode() {

  const code = val("verification-code");

  if (!confirmationResult) {
    alertMsg("لومړی د موبایل شمېره تایید کړئ.");
    return;
  }

  if (!code) {
    alertMsg("د تایید کوډ ولیکئ.");
    return;
  }

  try {

    const result =
      await confirmationResult.confirm(code);

    const user = result.user;

    const saved =
      JSON.parse(
        sessionStorage.getItem("registerData") || "{}"
      );

    if (saved.name) {

      await db
        .collection("users")
        .doc(user.uid)
        .set({

          name: saved.name,

          phone:
            user.phoneNumber ||
            saved.phone,

          pin: saved.pin,

          province: saved.province,

          role: "worker",

          approved: false,

          createdAt:
            firebase.firestore.FieldValue.serverTimestamp()

        });

      sessionStorage.removeItem(
        "registerData"
      );

      alertMsg(
        "ستاسو حساب جوړ شو. د Admin له تایید وروسته به اپ وکارولای شئ."
      );
    }

    confirmationResult = null;

    resetRecaptcha();

    await renderUser();

  } catch (error) {

    alertMsg(firebaseError(error));
  }
}

// ===============================
// Login — Send SMS
// ===============================

async function sendLoginCode() {

  const phoneInput = val("login-phone");
  const pin = val("login-pin");

  if (!phoneInput) {
    alertMsg("موبایل شمېره ولیکئ.");
    return;
  }

  if (!pin) {
    alertMsg("PIN ولیکئ.");
    return;
  }

  if (!/^\d{4,}$/.test(pin)) {
    alertMsg("PIN سم ولیکئ.");
    return;
  }

  const phone = cleanPhone(phoneInput);

  if (!/^\+937\d{8}$/.test(phone)) {
    alertMsg("د افغانستان معتبر موبایل نمبر ولیکئ.");
    return;
  }

  try {

    const verifier = setupRecaptcha();

    if (!verifier) {
      alertMsg("د امنیت تایید فعال نه شو. بیا هڅه وکړئ.");
      return;
    }

    sessionStorage.setItem(
      "loginPin",
      pin
    );

    sessionStorage.setItem(
      "loginPhone",
      phone
    );

    confirmationResult =
      await auth.signInWithPhoneNumber(
        phone,
        verifier
      );

    alertMsg(
      "د تایید کوډ ستاسو موبایل ته واستول شو."
    );

    showPage("verify-login-page");

  } catch (error) {

    alertMsg(firebaseError(error));

    resetRecaptcha();
  }
}

// ===============================
// Login Verification
// ===============================

async function verifyLoginCode() {

  const code = val("login-verification-code");

  if (!confirmationResult) {
    alertMsg(
      "لومړی د Login کوډ وغواړئ."
    );
    return;
  }

  if (!code) {
    alertMsg(
      "د تایید کوډ ولیکئ."
    );
    return;
  }

  try {

    const result =
      await confirmationResult.confirm(code);

    const user = result.user;

    currentUser = user;

    const pin =
      sessionStorage.getItem(
        "loginPin"
      ) || "";

    // ===========================
    // ADMIN
    // ===========================

    if (isAdminUser(user)) {

      const ref =
        db.collection("users")
          .doc(user.uid);

      const snap =
        await ref.get();

      await ref.set({

        name:
          snap.exists &&
          snap.data().name
            ? snap.data().name
            : "Admin",

        phone: ADMIN_PHONE,

        role: "admin",

        approved: true,

        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()

      }, {
        merge: true
      });

      sessionStorage.removeItem(
        "loginPin"
      );

      sessionStorage.removeItem(
        "loginPhone"
      );

      confirmationResult = null;

      resetRecaptcha();

      await renderUser();

      return;
    }

    // ===========================
    // WORKER
    // ===========================

    const ref =
      db.collection("users")
        .doc(user.uid);

    const snap =
      await ref.get();

    if (!snap.exists) {

      alertMsg(
        "دا حساب ثبت شوی نه دی. لومړی Register وکړئ."
      );

      await auth.signOut();

      resetRecaptcha();

      return;
    }

    const data = snap.data();

    if (data.pin !== pin) {

      alertMsg(
        "PIN ناسم دی."
      );

      await auth.signOut();

      resetRecaptcha();

      return;
    }

    if (data.approved !== true) {

      alertMsg(
        "ستاسو حساب لا د Admin له خوا تایید شوی نه دی."
      );

      await auth.signOut();

      resetRecaptcha();

      return;
    }

    sessionStorage.removeItem(
      "loginPin"
    );

    sessionStorage.removeItem(
      "loginPhone"
    );

    confirmationResult = null;

    resetRecaptcha();

    await renderUser();

  } catch (error) {

    alertMsg(firebaseError(error));
  }
}

// ===============================
// User Rendering
// ===============================

async function renderUser() {

  currentUser =
    auth.currentUser;

  if (!currentUser) {

    showLogin();

    return;
  }

  // ===========================
  // ADMIN
  // ===========================

  if (isAdminUser(currentUser)) {

    try {

      await ensureAdminAccount();

      await showAdminDashboard();

    } catch (error) {

      console.error(
        "Admin render error:",
        error
      );

      alertMsg(
        "د Admin معلومات نه شول ترلاسه کېدای."
      );
    }

    return;
  }

  // ===========================
  // WORKER
  // ===========================

  try {

    const snap =
      await db
        .collection("users")
        .doc(currentUser.uid)
        .get();

    if (!snap.exists) {

      alertMsg(
        "حساب پیدا نه شو."
      );

      await auth.signOut();

      return;
    }

    const data =
      snap.data();

    text(
      "user-name",
      data.name || "کارکوونکی"
    );

    text(
      "user-phone",
      data.phone ||
      currentUser.phoneNumber ||
      ""
    );

    if (data.approved === true) {

      await showWorkerDashboard();

    } else {

      showPage("pending-page");
    }

  } catch (error) {

    console.error(error);

    alertMsg(
      "د کارن معلومات ترلاسه نه شول."
    );
  }
}

// ===============================
// Admin Account
// ===============================

async function ensureAdminAccount() {

  if (!currentUser) return;

  if (!isAdminUser(currentUser)) {
    return;
  }

  const ref =
    db.collection("users")
      .doc(currentUser.uid);

  const snap =
    await ref.get();

  if (!snap.exists) {

    await ref.set({

      name: "Admin",

      phone: ADMIN_PHONE,

      role: "admin",

      approved: true,

      createdAt:
        firebase.firestore.FieldValue.serverTimestamp()

    });

    return;
  }

  const data =
    snap.data();

  if (
    data.role !== "admin" ||
    data.approved !== true
  ) {

    await ref.set({

      phone: ADMIN_PHONE,

      role: "admin",

      approved: true,

      updatedAt:
        firebase.firestore.FieldValue.serverTimestamp()

    }, {
      merge: true
    });
  }
}

// ===============================
// Worker Dashboard
// ===============================

async function showWorkerDashboard() {

  showPage("dashboard-page");

  text(
    "dashboard-user-name",
    currentUser?.phoneNumber || ""
  );

  await loadMyOrders();
}

// ===============================
// Admin Dashboard
// ===============================

async function showAdminDashboard() {

  showPage("admin-page");

  await loadAdminUsers();

  await loadAdminOrders();
}

// ===============================
// Logout
// ===============================

async function logout() {

  try {

    await auth.signOut();

    currentUser = null;

    confirmationResult = null;

    sessionStorage.clear();

    resetRecaptcha();

    showLogin();

  } catch (error) {

    console.error(error);
  }
}

// ===============================
// Create Order
// ===============================

async function createOrder() {

  if (!currentUser) {

    alertMsg(
      "لومړی Login وکړئ."
    );

    return;
  }

  const customerName =
    val("customer-name") ||
    val("order-customer-name");

  const customerPhone =
    val("customer-phone") ||
    val("order-customer-phone");

  const address =
    val("address") ||
    val("order-address");

  const province =
    val("order-province") ||
    val("province");

  const product =
    val("product") ||
    val("order-product");

  const price =
    val("price") ||
    val("order-price");

  if (
    !customerName ||
    !customerPhone ||
    !address ||
    !province ||
    !product ||
    !price
  ) {

    alertMsg(
      "مهرباني وکړئ د فرمایش ټول معلومات بشپړ کړئ."
    );

    return;
  }

  try {

    const order = {

      userId:
        currentUser.uid,

      workerPhone:
        currentUser.phoneNumber || "",

      customerName,

      customerPhone,

      address,

      province,

      product,

      price,

      status:
        "pending",

      photo: "",

      createdAt:
        firebase.firestore.FieldValue.serverTimestamp()
    };

    const orderRef =
      await db
        .collection("orders")
        .add(order);

    // Order photo
    const photoInput =
      $("order-photo") ||
      $("orderPhoto");

    if (
      photoInput &&
      photoInput.files &&
      photoInput.files[0]
    ) {

      const photoUrl =
        await uploadOrderPhoto(
          photoInput.files[0],
          orderRef.id
        );

      if (photoUrl) {

        await orderRef.update({
          photo: photoUrl
        });
      }
    }

    alertMsg(
      "فرمایش په بریالیتوب سره ثبت شو."
    );

    clearOrderForm();

    await loadMyOrders();

  } catch (error) {

    console.error(error);

    alertMsg(
      "فرمایش ثبت نه شو."
    );
  }
}

// ===============================
// Clear Order Form
// ===============================

function clearOrderForm() {

  [
    "customer-name",
    "order-customer-name",
    "customer-phone",
    "order-customer-phone",
    "address",
    "order-address",
    "product",
    "order-product",
    "price",
    "order-price"
  ].forEach(id => {

    const el = $(id);

    if (el) {
      el.value = "";
    }
  });
}

// ===============================
// Worker Orders
// ===============================

async function loadMyOrders() {

  if (!currentUser) return;

  try {

    const snapshot =
      await db
        .collection("orders")
        .where(
          "userId",
          "==",
          currentUser.uid
        )
        .get();

    const container =
      $("my-orders") ||
      $("orders-list");

    if (!container) return;

    container.innerHTML = "";

    if (snapshot.empty) {

      container.innerHTML =
        `<div class="muted">
          تر اوسه فرمایش نشته.
        </div>`;

      return;
    }

    snapshot.forEach(doc => {

      const order =
        doc.data();

      const item =
        document.createElement("div");

      item.className =
        "order-item";

      item.innerHTML = `

        ${
          order.photo
            ? `
              <img
                src="${escapeHtml(order.photo)}"
                style="max-width:100px;border-radius:10px;"
              >
            `
            : ""
        }

        <strong>
          ${escapeHtml(
            order.product || ""
          )}
        </strong>

        <br>

        مشتری:
        ${escapeHtml(
          order.customerName || ""
        )}

        <br>

        شمېره:
        ${escapeHtml(
          order.customerPhone || ""
        )}

        <br>

        ولایت:
        ${escapeHtml(
          order.province || ""
        )}

        <br>

        قیمت:
        ${escapeHtml(
          order.price || ""
        )}
        افغانۍ

        <br>

        حالت:
        ${escapeHtml(
          order.status || "pending"
        )}
      `;

      container.appendChild(item);
    });

  } catch (error) {

    console.error(error);
  }
}

// ===============================
// Admin Users
// ===============================

async function loadAdminUsers() {

  const container =
    $("admin-users");

  if (!container) return;

  if (
    !currentUser ||
    !isAdminUser(currentUser)
  ) {

    alertMsg(
      "یوازې Admin دا معلومات لیدلی شي."
    );

    return;
  }

  try {

    const snapshot =
      await db
        .collection("users")
        .get();

    container.innerHTML = "";

    if (snapshot.empty) {

      container.innerHTML =
        `<div class="muted">
          تر اوسه کارکوونکی نشته.
        </div>`;

      return;
    }

    snapshot.forEach(doc => {

      const data =
        doc.data();

      const item =
        document.createElement("div");

      item.className =
        "admin-user-item";

      const userIsAdmin =
        data.role === "admin" ||
        isAdminPhone(data.phone);

      item.innerHTML = `

        <div>

          <strong>
            ${escapeHtml(
              data.name || "بې نوم"
            )}
          </strong>

          <br>

          ${escapeHtml(
            data.phone || ""
          )}

          <br>

          ولایت:
          ${escapeHtml(
            data.province || ""
          )}

          <br>

          حالت:

          ${
            userIsAdmin
              ? "Admin"
              : data.approved
                ? "تایید شوی"
                : "انتظار"
          }

        </div>

        ${
          !userIsAdmin &&
          !data.approved
            ? `
              <button
                onclick="approveUser('${doc.id}')"
              >
                تایید
              </button>
            `
            : ""
        }
      `;

      container.appendChild(item);
    });

  } catch (error) {

    console.error(error);

    alertMsg(
      "د کارکوونکو معلومات ترلاسه نه شول."
    );
  }
}

// ===============================
// Approve Worker
// ===============================

async function approveUser(userId) {

  if (
    !currentUser ||
    !isAdminUser(currentUser)
  ) {

    alertMsg(
      "یوازې Admin دا کار کولی شي."
    );

    return;
  }

  try {

    await db
      .collection("users")
      .doc(userId)
      .update({

        approved: true,

        role: "worker",

        approvedAt:
          firebase.firestore.FieldValue.serverTimestamp()

      });

    alertMsg(
      "کارکوونکی تایید شو."
    );

    await loadAdminUsers();

  } catch (error) {

    console.error(error);

    alertMsg(
      "کارکوونکی تایید نه شو."
    );
  }
}

// ===============================
// Admin Orders
// ===============================

async function loadAdminOrders() {

  const container =
    $("admin-orders") ||
    $("all-orders");

  if (!container) return;

  if (
    !currentUser ||
    !isAdminUser(currentUser)
  ) {

    alertMsg(
      "یوازې Admin دا معلومات لیدلی شي."
    );

    return;
  }

  try {

    const snapshot =
      await db
        .collection("orders")
        .get();

    container.innerHTML = "";

    if (snapshot.empty) {

      container.innerHTML =
        `<div class="muted">
          تر اوسه فرمایش نشته.
        </div>`;

      return;
    }

    snapshot.forEach(doc => {

      const order =
        doc.data();

      const item =
        document.createElement("div");

      item.className =
        "admin-order-item";

      item.innerHTML = `

        ${
          order.photo
            ? `
              <img
                src="${escapeHtml(order.photo)}"
                style="max-width:120px;border-radius:10px;"
              >
            `
            : ""
        }

        <strong>
          ${escapeHtml(
            order.product || ""
          )}
        </strong>

        <br>

        مشتری:
        ${escapeHtml(
          order.customerName || ""
        )}

        <br>

        شمېره:
        ${escapeHtml(
          order.customerPhone || ""
        )}

        <br>

        ولایت:
        ${escapeHtml(
          order.province || ""
        )}

        <br>

        ادرس:
        ${escapeHtml(
          order.address || ""
        )}

        <br>

        قیمت:
        ${escapeHtml(
          order.price || ""
        )}
        افغانۍ

        <br>

        حالت:
        ${escapeHtml(
          order.status || "pending"
        )}

        <br><br>

        <button
          onclick="updateOrderStatus('${doc.id}', 'accepted')"
        >
          قبول
        </button>

        <button
          onclick="updateOrderStatus('${doc.id}', 'delivered')"
        >
          رسېدلی
        </button>

        <button
          onclick="updateOrderStatus('${doc.id}', 'cancelled')"
        >
          لغوه
        </button>
      `;

      container.appendChild(item);
    });

  } catch (error) {

    console.error(error);

    alertMsg(
      "د فرمایشونو معلومات ترلاسه نه شول."
    );
  }
}

// ===============================
// Update Order Status
// ===============================

async function updateOrderStatus(
  orderId,
  status
) {

  if (
    !currentUser ||
    !isAdminUser(currentUser)
  ) {

    alertMsg(
      "یوازې Admin دا کار کولی شي."
    );

    return;
  }

  try {

    await db
      .collection("orders")
      .doc(orderId)
      .update({

        status,

        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()

      });

    alertMsg(
      "د فرمایش حالت بدل شو."
    );

    await loadAdminOrders();

  } catch (error) {

    console.error(error);

    alertMsg(
      "حالت بدل نه شو."
    );
  }
}

// ===============================
// Profile Photo Upload
// ===============================

async function uploadProfilePhoto(file) {

  if (
    !currentUser ||
    !file
  ) {
    return "";
  }

  try {

    const path =
      `profile/${currentUser.uid}/profile.jpg`;

    const ref =
      storage.ref(path);

    await ref.put(file);

    return await ref.getDownloadURL();

  } catch (error) {

    console.error(error);

    alertMsg(
      "عکس Upload نه شو."
    );

    return "";
  }
}

// ===============================
// Order Photo Upload
// ===============================

async function uploadOrderPhoto(
  file,
  orderId
) {

  if (
    !currentUser ||
    !file ||
    !orderId
  ) {
    return "";
  }

  try {

    const path =
      `orders/${currentUser.uid}/${orderId}.jpg`;

    const ref =
      storage.ref(path);

    await ref.put(file);

    return await ref.getDownloadURL();

  } catch (error) {

    console.error(error);

    alertMsg(
      "د فرمایش عکس Upload نه شو."
    );

    return "";
  }
}

// ===============================
// Forgot PIN
// ===============================

function forgotPinInfo() {

  alertMsg(
    "د PIN د بیا ترلاسه کولو لپاره له Admin سره اړیکه ونیسئ:\n0704451971"
  );
}

// ===============================
// Auth State
// ===============================

auth.onAuthStateChanged(
  async user => {

    currentUser = user;

    if (user) {

      await renderUser();

    } else {

      showLogin();
    }
  }
);

// ===============================
// PWA Install
// ===============================

let deferredPrompt = null;

window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredPrompt = event;

    const button =
      $("install-button") ||
      $("install-app");

    if (button) {

      button.style.display =
        "block";

      button.onclick =
        async () => {

          if (!deferredPrompt) {
            return;
          }

          deferredPrompt.prompt();

          await deferredPrompt.userChoice;

          deferredPrompt = null;

          button.style.display =
            "none";
        };
    }
  }
);

// ===============================
// Service Worker
// ===============================

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("sw.js")
        .then(() => {

          console.log(
            "Service Worker registered."
          );

        })
        .catch(error => {

          console.log(
            "Service Worker error:",
            error
          );
        });
    }
  );
}

// ===============================
// Start App
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupProvinces();

    const loginButton =
      $("login-button");

    if (loginButton) {

      loginButton.addEventListener(
        "click",
        sendLoginCode
      );
    }

    const registerButton =
      $("register-button");

    if (registerButton) {

      registerButton.addEventListener(
        "click",
        registerWorker
      );
    }

    const verifyButton =
      $("verify-button");

    if (verifyButton) {

      verifyButton.addEventListener(
        "click",
        verifyCode
      );
    }

    const verifyLoginButton =
      $("verify-login-button");

    if (verifyLoginButton) {

      verifyLoginButton.addEventListener(
        "click",
        verifyLoginCode
      );
    }

    const orderButton =
      $("create-order-button");

    if (orderButton) {

      orderButton.addEventListener(
        "click",
        createOrder
      );
    }

    document
      .querySelectorAll(
        "[data-action='logout']"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          logout
        );
      });

    console.log(
      "Ishaqzada Delivery App started."
    );
  }
);

// ===============================
// Global Functions
// ===============================

window.showLogin =
  showLogin;

window.showRegister =
  showRegister;

window.showForgotPin =
  showForgotPin;

window.verifyCode =
  verifyCode;

window.verifyLoginCode =
  verifyLoginCode;

window.sendLoginCode =
  sendLoginCode;

window.registerWorker =
  registerWorker;

window.createOrder =
  createOrder;

window.logout =
  logout;

window.approveUser =
  approveUser;

window.updateOrderStatus =
  updateOrderStatus;

window.loadAdminUsers =
  loadAdminUsers;

window.loadAdminOrders =
  loadAdminOrders;

window.loadMyOrders =
  loadMyOrders;

window.forgotPinInfo =
  forgotPinInfo;

window.uploadProfilePhoto =
  uploadProfilePhoto;

window.uploadOrderPhoto =
  uploadOrderPhoto;
