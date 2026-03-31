const SESSION_KEY = "mtb_session";

const els = {
  userTabBtn: document.getElementById("userTabBtn"),
  adminTabBtn: document.getElementById("adminTabBtn"),
  userLoginPanel: document.getElementById("userLoginPanel"),
  adminLoginPanel: document.getElementById("adminLoginPanel"),
  userLoginSelect: document.getElementById("userLoginSelect"),
  userLoginBtn: document.getElementById("userLoginBtn"),
  createUserBtn: document.getElementById("createUserBtn"),
  newUserName: document.getElementById("newUserName"),
  newUserEmail: document.getElementById("newUserEmail"),
  newUserPhone: document.getElementById("newUserPhone"),
  adminUsername: document.getElementById("adminUsername"),
  adminPassword: document.getElementById("adminPassword"),
  adminLoginBtn: document.getElementById("adminLoginBtn"),
  loginMessage: document.getElementById("loginMessage")
};

function setMessage(text) {
  els.loginMessage.textContent = text;
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = placeholderText;
  selectEl.appendChild(option);
}

function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function apiGet(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function switchToUserTab() {
  els.userTabBtn.classList.add("active");
  els.adminTabBtn.classList.remove("active");
  els.userLoginPanel.classList.remove("hidden");
  els.adminLoginPanel.classList.add("hidden");
  setMessage("Select existing user or create new user.");
}

function switchToAdminTab() {
  els.adminTabBtn.classList.add("active");
  els.userTabBtn.classList.remove("active");
  els.adminLoginPanel.classList.remove("hidden");
  els.userLoginPanel.classList.add("hidden");
  setMessage("Enter admin credentials to continue.");
}

async function loadUsers() {
  const response = await apiGet("/api/users");
  clearSelect(els.userLoginSelect, "Select user");

  response.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = String(user.user_id);
    option.textContent = `${user.user_id} - ${user.full_name} (${user.email})`;
    els.userLoginSelect.appendChild(option);
  });

  if (response.users.length > 0) {
    els.userLoginSelect.value = String(response.users[0].user_id);
  }
}

async function createUser() {
  const fullName = String(els.newUserName.value || "").trim();
  const email = String(els.newUserEmail.value || "").trim();
  const phone = String(els.newUserPhone.value || "").trim();

  if (!fullName || !email) {
    throw new Error("Full name and email are required.");
  }

  const result = await apiPost("/api/users/create", {
    full_name: fullName,
    email,
    phone
  });

  els.newUserName.value = "";
  els.newUserEmail.value = "";
  els.newUserPhone.value = "";

  await loadUsers();
  els.userLoginSelect.value = String(result.user.user_id);
  setMessage(`User created: ${result.user.full_name}. You can login now.`);
}

async function loginUser() {
  const userId = toId(els.userLoginSelect.value);
  if (!userId) {
    throw new Error("Select a user first.");
  }

  const session = await apiPost("/api/auth/login", {
    role: "user",
    user_id: userId
  });

  setSession(session);
  window.location.href = "./user.html";
}

async function loginAdmin() {
  const username = String(els.adminUsername.value || "").trim();
  const password = String(els.adminPassword.value || "");
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  const session = await apiPost("/api/auth/login", {
    role: "admin",
    username,
    password
  });

  setSession(session);
  window.location.href = "./admin.html";
}

function bindEvents() {
  els.userTabBtn.addEventListener("click", switchToUserTab);
  els.adminTabBtn.addEventListener("click", switchToAdminTab);

  els.createUserBtn.addEventListener("click", async () => {
    try {
      await createUser();
    } catch (error) {
      setMessage(error.message);
    }
  });

  els.userLoginBtn.addEventListener("click", async () => {
    try {
      await loginUser();
    } catch (error) {
      setMessage(error.message);
    }
  });

  els.adminLoginBtn.addEventListener("click", async () => {
    try {
      await loginAdmin();
    } catch (error) {
      setMessage(error.message);
    }
  });
}

async function boot() {
  const session = getSession();
  if (session?.role === "user") {
    window.location.href = "./user.html";
    return;
  }
  if (session?.role === "admin") {
    window.location.href = "./admin.html";
    return;
  }

  bindEvents();
  switchToUserTab();

  try {
    await apiGet("/api/health");
    await loadUsers();
  } catch (error) {
    setMessage(`Startup error: ${error.message}`);
  }
}

boot();
