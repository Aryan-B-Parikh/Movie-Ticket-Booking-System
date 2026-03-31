const SESSION_KEY = "mtb_session";

const state = {
  session: null,
  selectedSeats: new Set(),
  currentSeats: [],
  currentBooking: null
};

const els = {
  welcomeText: document.getElementById("welcomeText"),
  logoutBtn: document.getElementById("logoutBtn"),
  movieSelect: document.getElementById("movieSelect"),
  showSelect: document.getElementById("showSelect"),
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
  verifyBtn: document.getElementById("verifyBtn"),
  metricTables: document.getElementById("metricTables"),
  metricAvailable: document.getElementById("metricAvailable"),
  metricBooked: document.getElementById("metricBooked"),
  metricBookingStatus: document.getElementById("metricBookingStatus"),
  bookingJson: document.getElementById("bookingJson"),
  opLog: document.getElementById("opLog")
};

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

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

function clearSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = placeholderText;
  selectEl.appendChild(option);
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

function resetSeatState() {
  state.selectedSeats = new Set();
  state.currentSeats = [];
  els.seatList.innerHTML = "";
  els.seatSummary.textContent = "No seats selected";
  els.createBookingBtn.disabled = true;
}

function resetRuntimeMetrics() {
  els.metricTables.textContent = "-";
  els.metricAvailable.textContent = "-";
  els.metricBooked.textContent = "-";
  els.metricBookingStatus.textContent = "-";
}

async function syncRuntimeStatus() {
  const showId = toId(els.showSelect.value);
  if (!showId) {
    resetRuntimeMetrics();
    return;
  }

  try {
    await verifyDb();
  } catch (error) {
    logLine(`Verify failed: ${error.message}`);
  }
}

function renderSeats(seats) {
  resetSeatState();
  state.currentSeats = seats;

  if (!seats.length) {
    els.seatList.textContent = "No available seats";
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
        const labels = state.currentSeats
          .filter((item) => state.selectedSeats.has(item.seat_id))
          .map((item) => item.seat_number);
        els.seatSummary.textContent = `${labels.length} selected: ${labels.join(", ")}`;
      }

      els.createBookingBtn.disabled = state.selectedSeats.size === 0;
    });

    els.seatList.appendChild(button);
  });
}

async function loadMovies() {
  const response = await apiGet("/api/movies");
  clearSelect(els.movieSelect, "Select movie");
  clearSelect(els.showSelect, "Select show");

  response.movies.forEach((movie) => {
    const option = document.createElement("option");
    option.value = String(movie.movie_id);
    option.textContent = `${movie.movie_id} - ${movie.title}`;
    els.movieSelect.appendChild(option);
  });

  if (response.movies.length > 0) {
    els.movieSelect.value = String(response.movies[0].movie_id);
    await loadShows(response.movies[0].movie_id);
  }
}

async function loadShows(movieId) {
  clearSelect(els.showSelect, "Select show");
  resetSeatState();

  if (!movieId) {
    resetRuntimeMetrics();
    return;
  }

  const response = await apiGet(`/api/shows?movie_id=${movieId}`);
  response.shows.forEach((show) => {
    const option = document.createElement("option");
    option.value = String(show.show_id);
    option.textContent = `${show.show_id} - ${show.show_time} - Rs.${show.base_price}`;
    els.showSelect.appendChild(option);
  });

  if (response.shows.length > 0) {
    els.showSelect.value = String(response.shows[0].show_id);
  } else {
    resetRuntimeMetrics();
  }
}

async function loadSeats() {
  const showId = toId(els.showSelect.value);
  if (!showId) {
    throw new Error("Select a show first.");
  }

  const response = await apiGet(`/api/seats?show_id=${showId}`);
  renderSeats(response.seats || []);
  await syncRuntimeStatus();
  logLine(`Seats loaded for show ${showId}.`);
}

async function createBooking() {
  const showId = toId(els.showSelect.value);
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
  await loadSeats();
  await verifyDb();
}

async function loadBooking() {
  const bookingId = toId(els.bookingIdInput.value);
  if (!bookingId) {
    throw new Error("Enter booking id.");
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
    throw new Error("Enter booking id.");
  }

  await apiPost("/api/bookings/payment-success", {
    booking_id: bookingId,
    payment_method: els.paymentMethod.value,
    transaction_ref: String(els.txnRef.value || "").trim() || `TXN-UI-${Date.now()}`
  });

  logLine(`Payment marked success for booking #${bookingId}.`);
  await loadBooking();
  await verifyDb();
}

async function cancelBooking() {
  const bookingId = toId(els.bookingIdInput.value);
  if (!bookingId) {
    throw new Error("Enter booking id.");
  }

  await apiPost("/api/bookings/cancel", {
    booking_id: bookingId,
    user_id: state.session.user.user_id
  });

  logLine(`Booking cancelled: #${bookingId}`);
  await loadBooking();
  await loadSeats();
  await verifyDb();
}

async function verifyDb() {
  const showId = toId(els.showSelect.value);
  if (!showId) {
    throw new Error("Select a show before verify.");
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
  } else {
    els.metricBookingStatus.textContent = "-";
  }

  logLine(`DB verified for show ${result.show_id || showId}.`);
}

function bindEvents() {
  els.logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "./index.html";
  });

  els.movieSelect.addEventListener("change", async () => {
    try {
      await loadShows(toId(els.movieSelect.value));
      await syncRuntimeStatus();
    } catch (error) {
      logLine(`Failed to load shows: ${error.message}`);
    }
  });

  els.showSelect.addEventListener("change", async () => {
    resetSeatState();
    await syncRuntimeStatus();
  });

  els.loadSeatsBtn.addEventListener("click", async () => {
    try {
      await loadSeats();
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
      logLine(`Payment failed: ${error.message}`);
    }
  });

  els.cancelBookingBtn.addEventListener("click", async () => {
    try {
      await cancelBooking();
    } catch (error) {
      logLine(`Cancel failed: ${error.message}`);
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
  const session = getSession();
  if (!session || session.role !== "user") {
    window.location.href = "./index.html";
    return;
  }

  state.session = session;
  els.welcomeText.textContent = `Logged in as ${session.user.full_name} (${session.user.email})`;

  bindEvents();

  try {
    await apiGet("/api/health");
    await loadMovies();
    await syncRuntimeStatus();
    logLine("User dashboard ready.");
  } catch (error) {
    logLine(`Startup error: ${error.message}`);
  }
}

boot();
