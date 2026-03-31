const state = {
  session: null,
  selectedSeats: new Set(),
  currentSeats: [],
  currentBooking: null,
  adminShows: [],
  editingShowId: null
};

const els = {
  loginScreen: document.getElementById("loginScreen"),
  appScreen: document.getElementById("appScreen"),
  loginMessage: document.getElementById("loginMessage"),
  userTabBtn: document.getElementById("userTabBtn"),
  adminTabBtn: document.getElementById("adminTabBtn"),
  userLoginPanel: document.getElementById("userLoginPanel"),
  adminLoginPanel: document.getElementById("adminLoginPanel"),
  userLoginSelect: document.getElementById("userLoginSelect"),
  userLoginBtn: document.getElementById("userLoginBtn"),
  adminUsername: document.getElementById("adminUsername"),
  adminPassword: document.getElementById("adminPassword"),
  adminLoginBtn: document.getElementById("adminLoginBtn"),
  welcomeTitle: document.getElementById("welcomeTitle"),
  roleBadge: document.getElementById("roleBadge"),
  logoutBtn: document.getElementById("logoutBtn"),
  userPanel: document.getElementById("userPanel"),
  userMovieSelect: document.getElementById("userMovieSelect"),
  userShowSelect: document.getElementById("userShowSelect"),
  loadSeatsBtn: document.getElementById("loadSeatsBtn"),
  seatList: document.getElementById("seatList"),
  seatSummary: document.getElementById("seatSummary"),
  createBookingBtn: document.getElementById("createBookingBtn"),
  bookingIdInput: document.getElementById("bookingIdInput"),
  loadBookingBtn: document.getElementById("loadBookingBtn"),
  paymentMethod: document.getElementById("paymentMethod"),
  txnRef: document.getElementById("txnRef"),
  markPaymentBtn: document.getElementById("markPaymentBtn"),
  cancelBookingBtn: document.getElementById("cancelBookingBtn"),
  adminPanel: document.getElementById("adminPanel"),
  adminMovieSelect: document.getElementById("adminMovieSelect"),
  adminScreenSelect: document.getElementById("adminScreenSelect"),
  adminStatus: document.getElementById("adminStatus"),
  adminShowTime: document.getElementById("adminShowTime"),
  adminBasePrice: document.getElementById("adminBasePrice"),
  saveShowBtn: document.getElementById("saveShowBtn"),
  resetShowBtn: document.getElementById("resetShowBtn"),
  refreshShowsBtn: document.getElementById("refreshShowsBtn"),
  adminFormState: document.getElementById("adminFormState"),
  adminShowsBody: document.getElementById("adminShowsBody"),
  verifyBtn: document.getElementById("verifyBtn"),
  metricTables: document.getElementById("metricTables"),
  metricAvailable: document.getElementById("metricAvailable"),
  metricBooked: document.getElementById("metricBooked"),
  metricBookingStatus: document.getElementById("metricBookingStatus"),
  bookingJson: document.getElementById("bookingJson"),
  opLog: document.getElementById("opLog")
};

function nowTime() {
  return new Date().toLocaleTimeString();
}

function logLine(message) {
  const line = `[${nowTime()}] ${message}`;
  const existing = els.opLog.textContent.trim() === "Waiting for actions..."
    ? []
    : els.opLog.textContent.split("\n");

  existing.push(line);
  els.opLog.textContent = existing.slice(-180).join("\n");
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }
  return String(value).replace(" ", "T").slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Show time is required.");
  }
  return `${value.replace("T", " ")}:00`;
}

function clearSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderText;
  selectEl.appendChild(placeholder);
}

function resetUserBookingUI() {
  state.selectedSeats = new Set();
  state.currentSeats = [];
  state.currentBooking = null;
  els.seatList.innerHTML = "";
  els.seatSummary.textContent = "No seats selected";
  els.createBookingBtn.disabled = true;
  els.bookingIdInput.value = "";
  els.bookingJson.textContent = "No booking loaded yet.";
  els.metricBookingStatus.textContent = "-";
}

function setLoginMessage(text) {
  els.loginMessage.textContent = text;
}

function switchToUserTab() {
  els.userTabBtn.classList.add("active");
  els.adminTabBtn.classList.remove("active");
  els.userLoginPanel.classList.remove("hidden");
  els.adminLoginPanel.classList.add("hidden");
  setLoginMessage("Use user login to open booking interface.");
}

function switchToAdminTab() {
  els.adminTabBtn.classList.add("active");
  els.userTabBtn.classList.remove("active");
  els.adminLoginPanel.classList.remove("hidden");
  els.userLoginPanel.classList.add("hidden");
  setLoginMessage("Admin credentials are required for show management.");
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

async function loadUsersForLogin() {
  const response = await apiGet("/api/users");
  clearSelect(els.userLoginSelect, "Select user");

  response.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = String(user.user_id);
    option.textContent = `${user.user_id} - ${user.full_name}`;
    els.userLoginSelect.appendChild(option);
  });

  if (response.users.length > 0) {
    els.userLoginSelect.value = String(response.users[0].user_id);
  }
}

function showAppForRole(roleLabel, titleText) {
  els.loginScreen.classList.add("hidden");
  els.appScreen.classList.remove("hidden");
  els.welcomeTitle.textContent = titleText;
  els.roleBadge.textContent = roleLabel;
}

function showLoginScreen() {
  els.appScreen.classList.add("hidden");
  els.loginScreen.classList.remove("hidden");
  state.session = null;
  state.editingShowId = null;
  state.adminShows = [];
  resetUserBookingUI();
}

async function loginAsUser() {
  const userId = toId(els.userLoginSelect.value);
  if (!userId) {
    throw new Error("Please select a user.");
  }

  const session = await apiPost("/api/auth/login", {
    role: "user",
    user_id: userId
  });

  state.session = session;
  showAppForRole("Role: USER", `Welcome, ${session.user.full_name}`);
  els.userPanel.classList.remove("hidden");
  els.adminPanel.classList.add("hidden");
  await loadUserMovies();
  await verifyDbSafe();
  logLine(`User logged in: ${session.user.full_name}`);
}

async function loginAsAdmin() {
  const username = String(els.adminUsername.value || "").trim();
  const password = String(els.adminPassword.value || "");
  if (!username || !password) {
    throw new Error("Admin username and password are required.");
  }

  const session = await apiPost("/api/auth/login", {
    role: "admin",
    username,
    password
  });

  state.session = session;
  showAppForRole("Role: ADMIN", "Admin Show Management");
  els.userPanel.classList.add("hidden");
  els.adminPanel.classList.remove("hidden");
  await loadAdminFormData();
  await loadAdminShows();
  logLine("Admin logged in.");
}

async function loadUserMovies() {
  const response = await apiGet("/api/movies");
  clearSelect(els.userMovieSelect, "Select movie");
  clearSelect(els.userShowSelect, "Select show");
  resetUserBookingUI();

  response.movies.forEach((movie) => {
    const option = document.createElement("option");
    option.value = String(movie.movie_id);
    option.textContent = `${movie.movie_id} - ${movie.title}`;
    els.userMovieSelect.appendChild(option);
  });

  if (response.movies.length > 0) {
    els.userMovieSelect.value = String(response.movies[0].movie_id);
    await loadUserShows(response.movies[0].movie_id);
  }
}

async function loadUserShows(movieId) {
  clearSelect(els.userShowSelect, "Select show");
  resetUserBookingUI();
  if (!movieId) {
    return;
  }

  const response = await apiGet(`/api/shows?movie_id=${movieId}`);
  response.shows.forEach((show) => {
    const option = document.createElement("option");
    option.value = String(show.show_id);
    option.textContent = `${show.show_id} - ${show.show_time} - Rs.${show.base_price}`;
    els.userShowSelect.appendChild(option);
  });

  if (response.shows.length > 0) {
    els.userShowSelect.value = String(response.shows[0].show_id);
  }
}

function renderSeatButtons(seats) {
  state.currentSeats = seats;
  state.selectedSeats = new Set();
  els.seatList.innerHTML = "";

  if (!seats.length) {
    els.seatList.textContent = "No available seats";
    els.seatSummary.textContent = "No seats selected";
    els.createBookingBtn.disabled = true;
    return;
  }

  seats.forEach((seat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "seat-pill";
    button.textContent = `${seat.seat_number} (${seat.seat_type})`;
    button.addEventListener("click", () => {
      if (state.selectedSeats.has(seat.seat_id)) {
        state.selectedSeats.delete(seat.seat_id);
        button.classList.remove("active");
      } else {
        state.selectedSeats.add(seat.seat_id);
        button.classList.add("active");
      }

      if (state.selectedSeats.size === 0) {
        els.seatSummary.textContent = "No seats selected";
      } else {
        const labels = seats
          .filter((item) => state.selectedSeats.has(item.seat_id))
          .map((item) => item.seat_number);
        els.seatSummary.textContent = `${labels.length} selected: ${labels.join(", ")}`;
      }

      els.createBookingBtn.disabled = state.selectedSeats.size === 0;
    });
    els.seatList.appendChild(button);
  });

  els.seatSummary.textContent = "No seats selected";
  els.createBookingBtn.disabled = true;
}

async function loadUserSeats() {
  const showId = toId(els.userShowSelect.value);
  if (!showId) {
    throw new Error("Please select a show first.");
  }

  const response = await apiGet(`/api/seats?show_id=${showId}`);
  renderSeatButtons(response.seats || []);
  logLine(`Seats loaded for show ${showId}.`);
}

async function createBooking() {
  if (!state.session || state.session.role !== "user") {
    throw new Error("User session is required.");
  }

  const showId = toId(els.userShowSelect.value);
  if (!showId) {
    throw new Error("Select a show first.");
  }

  const seatIds = [...state.selectedSeats];
  if (seatIds.length === 0) {
    throw new Error("Select at least one seat.");
  }

  const result = await apiPost("/api/bookings/create", {
    user_id: state.session.user.user_id,
    show_id: showId,
    seat_ids: seatIds
  });

  els.bookingIdInput.value = String(result.booking_id);
  logLine(`Booking created: #${result.booking_id}`);
  await loadBooking();
  await loadUserSeats();
  await verifyDbSafe();
}

async function loadBooking() {
  const bookingId = toId(els.bookingIdInput.value);
  if (!bookingId) {
    throw new Error("Enter a booking id.");
  }

  const response = await apiGet(`/api/bookings/${bookingId}`);
  state.currentBooking = response.booking;
  els.bookingJson.textContent = prettyJson(response.booking);
  els.metricBookingStatus.textContent = response.booking.status;
  logLine(`Booking loaded: #${bookingId}`);
}

async function markPaymentSuccess() {
  const bookingId = toId(els.bookingIdInput.value);
  if (!bookingId) {
    throw new Error("Enter a booking id.");
  }

  const payload = {
    booking_id: bookingId,
    payment_method: els.paymentMethod.value,
    transaction_ref: String(els.txnRef.value || "").trim() || `TXN-UI-${Date.now()}`
  };

  await apiPost("/api/bookings/payment-success", payload);
  logLine(`Payment marked success for booking #${bookingId}.`);
  await loadBooking();
  await verifyDbSafe();
}

async function cancelBooking() {
  if (!state.session || state.session.role !== "user") {
    throw new Error("User session is required.");
  }

  const bookingId = toId(els.bookingIdInput.value);
  if (!bookingId) {
    throw new Error("Enter a booking id.");
  }

  await apiPost("/api/bookings/cancel", {
    booking_id: bookingId,
    user_id: state.session.user.user_id
  });

  logLine(`Booking cancelled: #${bookingId}`);
  await loadBooking();
  await loadUserSeats();
  await verifyDbSafe();
}

async function loadAdminFormData() {
  const [moviesResponse, screensResponse] = await Promise.all([
    apiGet("/api/movies"),
    apiGet("/api/admin/screens")
  ]);

  clearSelect(els.adminMovieSelect, "Select movie");
  moviesResponse.movies.forEach((movie) => {
    const option = document.createElement("option");
    option.value = String(movie.movie_id);
    option.textContent = `${movie.movie_id} - ${movie.title}`;
    els.adminMovieSelect.appendChild(option);
  });

  clearSelect(els.adminScreenSelect, "Select screen");
  screensResponse.screens.forEach((screen) => {
    const option = document.createElement("option");
    option.value = String(screen.screen_id);
    option.textContent = `${screen.theater_name} - ${screen.screen_name}`;
    els.adminScreenSelect.appendChild(option);
  });

  if (moviesResponse.movies.length > 0) {
    els.adminMovieSelect.value = String(moviesResponse.movies[0].movie_id);
  }

  if (screensResponse.screens.length > 0) {
    els.adminScreenSelect.value = String(screensResponse.screens[0].screen_id);
  }

  resetAdminForm();
}

function resetAdminForm() {
  state.editingShowId = null;
  els.adminShowTime.value = "";
  els.adminBasePrice.value = "";
  els.adminStatus.value = "SCHEDULED";
  els.saveShowBtn.textContent = "Add Show";
  els.adminFormState.textContent = "Creating new show.";
}

function renderAdminShows() {
  if (state.adminShows.length === 0) {
    els.adminShowsBody.innerHTML = '<tr><td colspan="7">No shows found.</td></tr>';
    return;
  }

  els.adminShowsBody.innerHTML = state.adminShows.map((show) => {
    return `
      <tr>
        <td>${show.show_id}</td>
        <td>${escapeHtml(show.movie_title)}</td>
        <td>${escapeHtml(show.theater_name)} / ${escapeHtml(show.screen_name)}</td>
        <td>${escapeHtml(show.show_time)}</td>
        <td>${escapeHtml(show.base_price)}</td>
        <td>${escapeHtml(show.status)}</td>
        <td>
          <div class="table-actions">
            <button type="button" data-action="edit" data-show-id="${show.show_id}">Edit</button>
            <button type="button" class="delete" data-action="delete" data-show-id="${show.show_id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadAdminShows() {
  const response = await apiGet("/api/admin/shows");
  state.adminShows = response.shows || [];
  renderAdminShows();
  logLine(`Admin shows loaded (${state.adminShows.length}).`);
}

function fillAdminForm(showId) {
  const show = state.adminShows.find((item) => Number(item.show_id) === Number(showId));
  if (!show) {
    return;
  }

  state.editingShowId = show.show_id;
  els.adminMovieSelect.value = String(show.movie_id);
  els.adminScreenSelect.value = String(show.screen_id);
  els.adminShowTime.value = toDateTimeLocal(show.show_time);
  els.adminBasePrice.value = String(show.base_price);
  els.adminStatus.value = String(show.status);
  els.saveShowBtn.textContent = "Update Show";
  els.adminFormState.textContent = `Editing show #${show.show_id}.`;
}

async function saveAdminShow() {
  const movieId = toId(els.adminMovieSelect.value);
  const screenId = toId(els.adminScreenSelect.value);
  if (!movieId || !screenId) {
    throw new Error("Select movie and screen.");
  }

  const payload = {
    movie_id: movieId,
    screen_id: screenId,
    show_time: fromDateTimeLocal(els.adminShowTime.value),
    base_price: Number(els.adminBasePrice.value),
    status: els.adminStatus.value
  };

  if (!Number.isFinite(payload.base_price) || payload.base_price <= 0) {
    throw new Error("Base price must be a positive number.");
  }

  if (state.editingShowId) {
    payload.show_id = state.editingShowId;
    await apiPost("/api/admin/shows/update", payload);
    logLine(`Show updated: #${state.editingShowId}`);
  } else {
    const result = await apiPost("/api/admin/shows/create", payload);
    logLine(`Show created: #${result.show_id}`);
  }

  await loadAdminShows();
  resetAdminForm();
}

async function deleteAdminShow(showId) {
  await apiPost("/api/admin/shows/delete", { show_id: showId });
  logLine(`Show deleted: #${showId}`);
  if (state.editingShowId === showId) {
    resetAdminForm();
  }
  await loadAdminShows();
}

async function verifyDb() {
  let showId = toId(els.userShowSelect.value);
  if (!showId && state.adminShows.length > 0) {
    showId = toId(state.adminShows[0].show_id);
  }

  if (!showId) {
    throw new Error("No show available to verify.");
  }

  const bookingId = toId(els.bookingIdInput.value);
  const path = bookingId
    ? `/api/verify?show_id=${showId}&booking_id=${bookingId}`
    : `/api/verify?show_id=${showId}`;

  const result = await apiGet(path);
  els.metricTables.textContent = String(result.tables_count);
  els.metricAvailable.textContent = String(result.available_seats);
  els.metricBooked.textContent = String(result.booked_seats);
  if (result.booking_status) {
    els.metricBookingStatus.textContent = String(result.booking_status);
  }

  logLine(`DB verified using show #${showId}.`);
}

async function verifyDbSafe() {
  try {
    await verifyDb();
  } catch {
    // Skip noisy verification errors during initial load.
  }
}

function bindEvents() {
  els.userTabBtn.addEventListener("click", switchToUserTab);
  els.adminTabBtn.addEventListener("click", switchToAdminTab);

  els.userLoginBtn.addEventListener("click", async () => {
    try {
      await loginAsUser();
    } catch (error) {
      setLoginMessage(error.message);
      logLine(`User login failed: ${error.message}`);
    }
  });

  els.adminLoginBtn.addEventListener("click", async () => {
    try {
      await loginAsAdmin();
    } catch (error) {
      setLoginMessage(error.message);
      logLine(`Admin login failed: ${error.message}`);
    }
  });

  els.logoutBtn.addEventListener("click", () => {
    showLoginScreen();
    switchToUserTab();
    setLoginMessage("Logged out.");
    logLine("Session ended.");
  });

  els.userMovieSelect.addEventListener("change", async () => {
    try {
      await loadUserShows(toId(els.userMovieSelect.value));
    } catch (error) {
      logLine(`Failed to load shows: ${error.message}`);
    }
  });

  els.userShowSelect.addEventListener("change", () => {
    state.selectedSeats = new Set();
    state.currentSeats = [];
    els.seatList.innerHTML = "";
    els.seatSummary.textContent = "No seats selected";
    els.createBookingBtn.disabled = true;
  });

  els.loadSeatsBtn.addEventListener("click", async () => {
    try {
      await loadUserSeats();
    } catch (error) {
      logLine(`Failed to load seats: ${error.message}`);
    }
  });

  els.createBookingBtn.addEventListener("click", async () => {
    try {
      await createBooking();
    } catch (error) {
      logLine(`Create booking failed: ${error.message}`);
    }
  });

  els.loadBookingBtn.addEventListener("click", async () => {
    try {
      await loadBooking();
    } catch (error) {
      logLine(`Load booking failed: ${error.message}`);
    }
  });

  els.markPaymentBtn.addEventListener("click", async () => {
    try {
      await markPaymentSuccess();
    } catch (error) {
      logLine(`Payment update failed: ${error.message}`);
    }
  });

  els.cancelBookingBtn.addEventListener("click", async () => {
    try {
      await cancelBooking();
    } catch (error) {
      logLine(`Cancel booking failed: ${error.message}`);
    }
  });

  els.saveShowBtn.addEventListener("click", async () => {
    try {
      await saveAdminShow();
    } catch (error) {
      logLine(`Save show failed: ${error.message}`);
    }
  });

  els.resetShowBtn.addEventListener("click", () => {
    resetAdminForm();
    logLine("Admin form reset.");
  });

  els.refreshShowsBtn.addEventListener("click", async () => {
    try {
      await loadAdminShows();
    } catch (error) {
      logLine(`Refresh shows failed: ${error.message}`);
    }
  });

  els.adminShowsBody.addEventListener("click", async (event) => {
    const action = event.target?.dataset?.action;
    const showId = toId(event.target?.dataset?.showId);
    if (!action || !showId) {
      return;
    }

    if (action === "edit") {
      fillAdminForm(showId);
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(`Delete show #${showId}?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteAdminShow(showId);
      } catch (error) {
        logLine(`Delete show failed: ${error.message}`);
      }
    }
  });

  els.verifyBtn.addEventListener("click", async () => {
    try {
      await verifyDb();
    } catch (error) {
      logLine(`Verify failed: ${error.message}`);
    }
  });
}

async function boot() {
  try {
    bindEvents();
    switchToUserTab();
    await apiGet("/api/health");
    await loadUsersForLogin();
    logLine("UI ready. Please login.");
  } catch (error) {
    setLoginMessage(`Initialization failed: ${error.message}`);
    logLine(`Initialization failed: ${error.message}`);
  }
}

boot();
