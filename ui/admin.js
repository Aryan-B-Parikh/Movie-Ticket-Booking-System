const SESSION_KEY = "mtb_session";

const state = {
  session: null,
  shows: [],
  selectedShowId: null,
  movies: [],
  selectedMovieId: null,
  theaters: [],
  selectedTheaterId: null,
  screens: [],
  selectedScreenId: null
};

const els = {
  adminWelcomeText: document.getElementById("adminWelcomeText"),
  logoutBtn: document.getElementById("logoutBtn"),
  movieTitleInput: document.getElementById("adminMovieTitle"),
  movieDurationInput: document.getElementById("adminMovieDuration"),
  movieGenreInput: document.getElementById("adminMovieGenre"),
  movieLanguageInput: document.getElementById("adminMovieLanguage"),
  movieCertificateInput: document.getElementById("adminMovieCertificate"),
  movieReleaseDateInput: document.getElementById("adminMovieRelease"),
  movieSaveBtn: document.getElementById("movieSaveBtn"),
  movieResetBtn: document.getElementById("movieResetBtn"),
  movieRefreshBtn: document.getElementById("movieRefreshBtn"),
  movieFormState: document.getElementById("movieFormState"),
  movieTableBody: document.getElementById("adminMoviesBody"),
  theaterNameInput: document.getElementById("adminTheaterName"),
  theaterLocationInput: document.getElementById("adminTheaterLocation"),
  theaterSaveBtn: document.getElementById("theaterSaveBtn"),
  theaterResetBtn: document.getElementById("theaterResetBtn"),
  theaterRefreshBtn: document.getElementById("theaterRefreshBtn"),
  theaterFormState: document.getElementById("theaterFormState"),
  theaterTableBody: document.getElementById("adminTheatersBody"),
  screenTheaterSelect: document.getElementById("adminScreenTheater"),
  screenNameInput: document.getElementById("adminScreenName"),
  screenCapacityInput: document.getElementById("adminScreenCapacity"),
  screenSaveBtn: document.getElementById("screenSaveBtn"),
  screenResetBtn: document.getElementById("screenResetBtn"),
  screenRefreshBtn: document.getElementById("screenRefreshBtn"),
  screenFormState: document.getElementById("screenFormState"),
  screenTableBody: document.getElementById("adminScreensBody"),
  screenSelect: document.getElementById("adminScreenSelect"),
  movieSelect: document.getElementById("adminMovieSelect"),
  statusSelect: document.getElementById("adminStatus"),
  showTimeInput: document.getElementById("adminShowTime"),
  basePriceInput: document.getElementById("adminBasePrice"),
  saveShowBtn: document.getElementById("saveShowBtn"),
  resetShowBtn: document.getElementById("resetShowBtn"),
  refreshShowsBtn: document.getElementById("refreshShowsBtn"),
  verifyBtn: document.getElementById("verifyBtn"),
  formState: document.getElementById("adminFormState"),
  showTableBody: document.getElementById("adminShowsBody"),
  metricTables: document.getElementById("metricTables"),
  metricAvailable: document.getElementById("metricAvailable"),
  metricBooked: document.getElementById("metricBooked"),
  metricBookingStatus: document.getElementById("metricBookingStatus"),
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

function setFormState(message) {
  els.formState.textContent = message;
}

function setMovieFormState(message) {
  els.movieFormState.textContent = message;
}

function setTheaterFormState(message) {
  els.theaterFormState.textContent = message;
}

function setScreenFormState(message) {
  els.screenFormState.textContent = message;
}

function clearSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = placeholderText;
  selectEl.appendChild(option);
}

function normalizeDateForInput(value) {
  return String(value || "").replace(" ", "T").slice(0, 16);
}

function normalizeDateOnly(value) {
  return String(value || "").trim();
}

function getMoviePayload() {
  const title = String(els.movieTitleInput.value || "").trim();
  const duration = Number(els.movieDurationInput.value);
  const genre = String(els.movieGenreInput.value || "").trim();
  const language = String(els.movieLanguageInput.value || "English").trim() || "English";
  const certificate = String(els.movieCertificateInput.value || "").trim();
  const releaseDate = String(els.movieReleaseDateInput.value || "").trim();

  if (!title) {
    throw new Error("Enter movie title.");
  }
  if (!Number.isInteger(duration) || duration < 30 || duration > 400) {
    throw new Error("Duration must be between 30 and 400 minutes.");
  }
  if (!genre) {
    throw new Error("Enter movie genre.");
  }
  if (!language) {
    throw new Error("Enter movie language.");
  }

  return {
    title,
    duration_minutes: duration,
    genre,
    language,
    certificate: certificate || null,
    release_date: releaseDate || null
  };
}

function clearMovieForm() {
  state.selectedMovieId = null;
  els.movieTitleInput.value = "";
  els.movieDurationInput.value = "";
  els.movieGenreInput.value = "";
  els.movieLanguageInput.value = "";
  els.movieCertificateInput.value = "";
  els.movieReleaseDateInput.value = "";
  els.movieSaveBtn.textContent = "Add Movie";
  setMovieFormState("Creating new movie.");
  els.movieTableBody.querySelectorAll("tr").forEach((row) => row.classList.remove("active"));
}

function selectMovie(movieId) {
  const movie = state.movies.find((item) => item.movie_id === movieId);
  if (!movie) {
    return;
  }

  state.selectedMovieId = movie.movie_id;
  els.movieTitleInput.value = movie.title || "";
  els.movieDurationInput.value = String(movie.duration_minutes || "");
  els.movieGenreInput.value = movie.genre || "";
  els.movieLanguageInput.value = movie.language || "";
  els.movieCertificateInput.value = movie.certificate || "";
  els.movieReleaseDateInput.value = normalizeDateOnly(movie.release_date);
  els.movieSaveBtn.textContent = "Update Movie";
  setMovieFormState(`Editing movie #${movie.movie_id}.`);

  els.movieTableBody.querySelectorAll("tr").forEach((row) => {
    if (Number(row.dataset.movieId) === movieId) {
      row.classList.add("active");
    } else {
      row.classList.remove("active");
    }
  });
}

function renderMovieTable() {
  els.movieTableBody.innerHTML = "";

  if (state.movies.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan=\"8\">No movies available.</td>";
    els.movieTableBody.appendChild(row);
    return;
  }

  state.movies.forEach((movie) => {
    const row = document.createElement("tr");
    row.dataset.movieId = String(movie.movie_id);

    row.innerHTML = `
      <td>${movie.movie_id}</td>
      <td>${movie.title}</td>
      <td>${movie.duration_minutes}</td>
      <td>${movie.genre}</td>
      <td>${movie.language}</td>
      <td>${movie.certificate || "-"}</td>
      <td>${movie.release_date || "-"}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="edit-movie" data-id="${movie.movie_id}">Edit</button>
          <button type="button" class="delete" data-action="delete-movie" data-id="${movie.movie_id}">Delete</button>
        </div>
      </td>
    `;

    els.movieTableBody.appendChild(row);
  });
}

function getTheaterPayload() {
  const name = String(els.theaterNameInput.value || "").trim();
  const location = String(els.theaterLocationInput.value || "").trim();

  if (!name) {
    throw new Error("Enter theater name.");
  }
  if (!location) {
    throw new Error("Enter theater location.");
  }

  return { name, location };
}

function clearTheaterForm() {
  state.selectedTheaterId = null;
  els.theaterNameInput.value = "";
  els.theaterLocationInput.value = "";
  els.theaterSaveBtn.textContent = "Add Theater";
  setTheaterFormState("Creating new theater.");
  els.theaterTableBody.querySelectorAll("tr").forEach((row) => row.classList.remove("active"));
}

function selectTheater(theaterId) {
  const theater = state.theaters.find((item) => item.theater_id === theaterId);
  if (!theater) {
    return;
  }

  state.selectedTheaterId = theater.theater_id;
  els.theaterNameInput.value = theater.name || "";
  els.theaterLocationInput.value = theater.location || "";
  els.theaterSaveBtn.textContent = "Update Theater";
  setTheaterFormState(`Editing theater #${theater.theater_id}.`);

  els.theaterTableBody.querySelectorAll("tr").forEach((row) => {
    if (Number(row.dataset.theaterId) === theaterId) {
      row.classList.add("active");
    } else {
      row.classList.remove("active");
    }
  });
}

function renderTheaterTable() {
  els.theaterTableBody.innerHTML = "";

  if (state.theaters.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan=\"4\">No theaters available.</td>";
    els.theaterTableBody.appendChild(row);
    return;
  }

  state.theaters.forEach((theater) => {
    const row = document.createElement("tr");
    row.dataset.theaterId = String(theater.theater_id);

    row.innerHTML = `
      <td>${theater.theater_id}</td>
      <td>${theater.name}</td>
      <td>${theater.location}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="edit-theater" data-id="${theater.theater_id}">Edit</button>
          <button type="button" class="delete" data-action="delete-theater" data-id="${theater.theater_id}">Delete</button>
        </div>
      </td>
    `;

    els.theaterTableBody.appendChild(row);
  });
}

function getScreenPayload() {
  const theaterId = toId(els.screenTheaterSelect.value);
  const screenName = String(els.screenNameInput.value || "").trim();
  const capacity = Number(els.screenCapacityInput.value);

  if (!theaterId) {
    throw new Error("Select a theater.");
  }
  if (!screenName) {
    throw new Error("Enter screen name.");
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 130) {
    throw new Error("Capacity must be between 1 and 130.");
  }

  return {
    theater_id: theaterId,
    screen_name: screenName,
    capacity
  };
}

function clearScreenForm() {
  state.selectedScreenId = null;
  els.screenNameInput.value = "";
  els.screenCapacityInput.value = "";
  els.screenCapacityInput.disabled = false;
  els.screenSaveBtn.textContent = "Add Screen";
  setScreenFormState("Creating new screen.");
  els.screenTableBody.querySelectorAll("tr").forEach((row) => row.classList.remove("active"));
}

function selectScreen(screenId) {
  const screen = state.screens.find((item) => item.screen_id === screenId);
  if (!screen) {
    return;
  }

  state.selectedScreenId = screen.screen_id;
  els.screenTheaterSelect.value = String(screen.theater_id);
  els.screenNameInput.value = screen.screen_name || "";
  els.screenCapacityInput.value = String(screen.capacity || "");
  els.screenCapacityInput.disabled = true;
  els.screenSaveBtn.textContent = "Update Screen";
  setScreenFormState(`Editing screen #${screen.screen_id}.`);

  els.screenTableBody.querySelectorAll("tr").forEach((row) => {
    if (Number(row.dataset.screenId) === screenId) {
      row.classList.add("active");
    } else {
      row.classList.remove("active");
    }
  });
}

function renderScreenTable() {
  els.screenTableBody.innerHTML = "";

  if (state.screens.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan=\"5\">No screens available.</td>";
    els.screenTableBody.appendChild(row);
    return;
  }

  state.screens.forEach((screen) => {
    const row = document.createElement("tr");
    row.dataset.screenId = String(screen.screen_id);

    row.innerHTML = `
      <td>${screen.screen_id}</td>
      <td>${screen.screen_name}</td>
      <td>${screen.theater_name}</td>
      <td>${screen.capacity}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="edit-screen" data-id="${screen.screen_id}">Edit</button>
          <button type="button" class="delete" data-action="delete-screen" data-id="${screen.screen_id}">Delete</button>
        </div>
      </td>
    `;

    els.screenTableBody.appendChild(row);
  });
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

function getFormPayload() {
  const screenId = toId(els.screenSelect.value);
  const movieId = toId(els.movieSelect.value);
  const showTime = String(els.showTimeInput.value || "").trim();
  const basePrice = Number(els.basePriceInput.value);

  if (!screenId) {
    throw new Error("Select a screen.");
  }
  if (!movieId) {
    throw new Error("Select a movie.");
  }
  if (!showTime) {
    throw new Error("Enter show time.");
  }
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new Error("Enter valid base price.");
  }

  return {
    screen_id: screenId,
    movie_id: movieId,
    show_time: showTime,
    base_price: Math.round(basePrice * 100) / 100,
    status: String(els.statusSelect.value || "SCHEDULED").trim() || "SCHEDULED"
  };
}

function clearForm() {
  state.selectedShowId = null;
  els.statusSelect.value = "SCHEDULED";
  els.showTimeInput.value = "";
  els.basePriceInput.value = "";
  els.saveShowBtn.textContent = "Add Show";
  setFormState("Creating new show.");
  els.showTableBody.querySelectorAll("tr").forEach((row) => row.classList.remove("active"));
}

function selectShow(showId) {
  const show = state.shows.find((item) => item.show_id === showId);
  if (!show) {
    return;
  }

  state.selectedShowId = show.show_id;
  els.screenSelect.value = String(show.screen_id);
  els.movieSelect.value = String(show.movie_id);
  els.statusSelect.value = String(show.status || "SCHEDULED");
  els.showTimeInput.value = normalizeDateForInput(show.show_time);
  els.basePriceInput.value = String(show.base_price);
  els.saveShowBtn.textContent = "Update Show";
  setFormState(`Editing show #${show.show_id}. Save to update.`);

  els.showTableBody.querySelectorAll("tr").forEach((row) => {
    if (Number(row.dataset.showId) === showId) {
      row.classList.add("active");
    } else {
      row.classList.remove("active");
    }
  });
}

function renderShowTable() {
  els.showTableBody.innerHTML = "";

  if (state.shows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan=\"7\">No shows available.</td>";
    els.showTableBody.appendChild(row);
    return;
  }

  state.shows.forEach((show) => {
    const row = document.createElement("tr");
    row.dataset.showId = String(show.show_id);

    row.innerHTML = `
      <td>${show.show_id}</td>
      <td>${show.movie_title || show.movie_id}</td>
      <td>${show.screen_name || show.screen_id}</td>
      <td>${show.show_time}</td>
      <td>${show.base_price}</td>
      <td>${show.status}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="edit" data-id="${show.show_id}">Edit</button>
          <button type="button" class="delete" data-action="delete" data-id="${show.show_id}">Delete</button>
        </div>
      </td>
    `;

    els.showTableBody.appendChild(row);
  });
}

async function loadScreens() {
  const response = await apiGet("/api/admin/screens");
  state.screens = response.screens || [];
  clearSelect(els.screenSelect, "Select screen");

  state.screens.forEach((screen) => {
    const option = document.createElement("option");
    option.value = String(screen.screen_id);
    option.textContent = `${screen.screen_id} - ${screen.screen_name} (${screen.theater_name})`;
    els.screenSelect.appendChild(option);
  });

  renderScreenTable();

  const currentSelection = toId(els.screenSelect.value);
  if (currentSelection && state.screens.some((screen) => screen.screen_id === currentSelection)) {
    els.screenSelect.value = String(currentSelection);
  } else if (state.screens.length > 0) {
    els.screenSelect.value = String(state.screens[0].screen_id);
  }
}

async function loadMovies() {
  const response = await apiGet("/api/admin/movies");
  state.movies = response.movies || [];
  clearSelect(els.movieSelect, "Select movie");

  state.movies.forEach((movie) => {
    const option = document.createElement("option");
    option.value = String(movie.movie_id);
    option.textContent = `${movie.movie_id} - ${movie.title}`;
    els.movieSelect.appendChild(option);
  });

  renderMovieTable();

  const currentSelection = toId(els.movieSelect.value);
  if (currentSelection && state.movies.some((movie) => movie.movie_id === currentSelection)) {
    els.movieSelect.value = String(currentSelection);
  } else if (state.movies.length > 0) {
    els.movieSelect.value = String(state.movies[0].movie_id);
  }
}

async function loadTheaters() {
  const response = await apiGet("/api/admin/theaters");
  state.theaters = response.theaters || [];
  clearSelect(els.screenTheaterSelect, "Select theater");

  state.theaters.forEach((theater) => {
    const option = document.createElement("option");
    option.value = String(theater.theater_id);
    option.textContent = `${theater.theater_id} - ${theater.name}`;
    els.screenTheaterSelect.appendChild(option);
  });

  renderTheaterTable();

  const currentSelection = toId(els.screenTheaterSelect.value);
  if (currentSelection && state.theaters.some((theater) => theater.theater_id === currentSelection)) {
    els.screenTheaterSelect.value = String(currentSelection);
  } else if (state.theaters.length > 0) {
    els.screenTheaterSelect.value = String(state.theaters[0].theater_id);
  }
}

async function createMovie() {
  const payload = getMoviePayload();
  const result = await apiPost("/api/admin/movies/create", payload);
  setMovieFormState(`Created movie #${result.movie_id}.`);
  logLine(`Movie created with id ${result.movie_id}.`);
  await loadMovies();
  selectMovie(result.movie_id);
}

async function updateMovie() {
  const movieId = toId(state.selectedMovieId);
  if (!movieId) {
    throw new Error("Select a movie row to update.");
  }

  const payload = getMoviePayload();
  await apiPost("/api/admin/movies/update", {
    movie_id: movieId,
    ...payload
  });

  setMovieFormState(`Updated movie #${movieId}.`);
  logLine(`Movie updated: ${movieId}.`);
  await loadMovies();
  selectMovie(movieId);
}

async function deleteMovie() {
  const movieId = toId(state.selectedMovieId);
  if (!movieId) {
    throw new Error("Select a movie row to delete.");
  }

  await apiPost("/api/admin/movies/delete", {
    movie_id: movieId
  });

  setMovieFormState(`Deleted movie #${movieId}.`);
  logLine(`Movie deleted: ${movieId}.`);
  clearMovieForm();
  await loadMovies();
}

async function createTheater() {
  const payload = getTheaterPayload();
  const result = await apiPost("/api/admin/theaters/create", payload);
  setTheaterFormState(`Created theater #${result.theater_id}.`);
  logLine(`Theater created with id ${result.theater_id}.`);
  await loadTheaters();
  await loadScreens();
  selectTheater(result.theater_id);
}

async function updateTheater() {
  const theaterId = toId(state.selectedTheaterId);
  if (!theaterId) {
    throw new Error("Select a theater row to update.");
  }

  const payload = getTheaterPayload();
  await apiPost("/api/admin/theaters/update", {
    theater_id: theaterId,
    ...payload
  });

  setTheaterFormState(`Updated theater #${theaterId}.`);
  logLine(`Theater updated: ${theaterId}.`);
  await loadTheaters();
  await loadScreens();
  selectTheater(theaterId);
}

async function deleteTheater() {
  const theaterId = toId(state.selectedTheaterId);
  if (!theaterId) {
    throw new Error("Select a theater row to delete.");
  }

  await apiPost("/api/admin/theaters/delete", {
    theater_id: theaterId
  });

  setTheaterFormState(`Deleted theater #${theaterId}.`);
  logLine(`Theater deleted: ${theaterId}.`);
  clearTheaterForm();
  await loadTheaters();
  await loadScreens();
}

async function createScreen() {
  const payload = getScreenPayload();
  const result = await apiPost("/api/admin/screens/create", payload);
  setScreenFormState(`Created screen #${result.screen_id}.`);
  logLine(`Screen created with id ${result.screen_id}.`);
  await loadScreens();
  selectScreen(result.screen_id);
}

async function updateScreen() {
  const screenId = toId(state.selectedScreenId);
  if (!screenId) {
    throw new Error("Select a screen row to update.");
  }

  const payload = getScreenPayload();
  await apiPost("/api/admin/screens/update", {
    screen_id: screenId,
    ...payload
  });

  setScreenFormState(`Updated screen #${screenId}.`);
  logLine(`Screen updated: ${screenId}.`);
  await loadScreens();
  selectScreen(screenId);
}

async function deleteScreen() {
  const screenId = toId(state.selectedScreenId);
  if (!screenId) {
    throw new Error("Select a screen row to delete.");
  }

  await apiPost("/api/admin/screens/delete", {
    screen_id: screenId
  });

  setScreenFormState(`Deleted screen #${screenId}.`);
  logLine(`Screen deleted: ${screenId}.`);
  clearScreenForm();
  await loadScreens();
}

async function loadShows() {
  const response = await apiGet("/api/admin/shows");
  state.shows = response.shows || [];
  renderShowTable();
  logLine("Show list loaded.");
}

async function createShow() {
  const payload = getFormPayload();
  const result = await apiPost("/api/admin/shows/create", payload);
  setFormState(`Created show #${result.show_id}.`);
  logLine(`Show created with id ${result.show_id}.`);
  await loadShows();
  selectShow(result.show_id);
}

async function updateShow() {
  const showId = toId(state.selectedShowId);
  if (!showId) {
    throw new Error("Select a show row to update.");
  }

  const payload = getFormPayload();
  await apiPost("/api/admin/shows/update", {
    show_id: showId,
    ...payload
  });

  setFormState(`Updated show #${showId}.`);
  logLine(`Show updated: ${showId}.`);
  await loadShows();
  selectShow(showId);
}

async function deleteShow() {
  const showId = toId(state.selectedShowId);
  if (!showId) {
    throw new Error("Select a show row to delete.");
  }

  await apiPost("/api/admin/shows/delete", {
    show_id: showId
  });

  setFormState(`Deleted show #${showId}.`);
  logLine(`Show deleted: ${showId}.`);
  clearForm();
  await loadShows();
}

async function verifyDb() {
  if (state.shows.length === 0) {
    throw new Error("No shows available to verify.");
  }

  const showId = toId(state.selectedShowId);
  const verifyPath = showId ? `/api/verify?show_id=${showId}` : "/api/verify";

  const result = await apiGet(verifyPath);
  els.metricTables.textContent = String(result.tables_count);
  els.metricAvailable.textContent = String(result.available_seats);
  els.metricBooked.textContent = String(result.booked_seats);
  if (result.booking_status) {
    els.metricBookingStatus.textContent = String(result.booking_status);
  } else if (result.show_id) {
    els.metricBookingStatus.textContent = `SHOW ${result.show_id}`;
  } else {
    els.metricBookingStatus.textContent = "ALL SHOWS";
  }

  logLine(showId ? `DB verified for show ${showId}.` : "DB verified for all shows.");
}

function bindEvents() {
  els.logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "./index.html";
  });

  els.movieSaveBtn.addEventListener("click", async () => {
    try {
      if (state.selectedMovieId) {
        await updateMovie();
      } else {
        await createMovie();
      }
    } catch (error) {
      logLine(`Save movie failed: ${error.message}`);
    }
  });

  els.movieResetBtn.addEventListener("click", () => {
    clearMovieForm();
    setMovieFormState("Form reset.");
  });

  els.movieRefreshBtn.addEventListener("click", async () => {
    try {
      await loadMovies();
      setMovieFormState("Movie list refreshed.");
    } catch (error) {
      logLine(`Refresh movies failed: ${error.message}`);
    }
  });

  els.movieTableBody.addEventListener("click", (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action === "edit-movie") {
      const movieId = toId(target.dataset.id);
      if (movieId) {
        selectMovie(movieId);
      }
    }

    if (target.dataset.action === "delete-movie") {
      const movieId = toId(target.dataset.id);
      if (movieId) {
        state.selectedMovieId = movieId;
        deleteMovie().catch((error) => {
          logLine(`Delete movie failed: ${error.message}`);
        });
      }
    }
  });

  els.theaterSaveBtn.addEventListener("click", async () => {
    try {
      if (state.selectedTheaterId) {
        await updateTheater();
      } else {
        await createTheater();
      }
    } catch (error) {
      logLine(`Save theater failed: ${error.message}`);
    }
  });

  els.theaterResetBtn.addEventListener("click", () => {
    clearTheaterForm();
    setTheaterFormState("Form reset.");
  });

  els.theaterRefreshBtn.addEventListener("click", async () => {
    try {
      await loadTheaters();
      setTheaterFormState("Theater list refreshed.");
    } catch (error) {
      logLine(`Refresh theaters failed: ${error.message}`);
    }
  });

  els.theaterTableBody.addEventListener("click", (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action === "edit-theater") {
      const theaterId = toId(target.dataset.id);
      if (theaterId) {
        selectTheater(theaterId);
      }
    }

    if (target.dataset.action === "delete-theater") {
      const theaterId = toId(target.dataset.id);
      if (theaterId) {
        state.selectedTheaterId = theaterId;
        deleteTheater().catch((error) => {
          logLine(`Delete theater failed: ${error.message}`);
        });
      }
    }
  });

  els.screenSaveBtn.addEventListener("click", async () => {
    try {
      if (state.selectedScreenId) {
        await updateScreen();
      } else {
        await createScreen();
      }
    } catch (error) {
      logLine(`Save screen failed: ${error.message}`);
    }
  });

  els.screenResetBtn.addEventListener("click", () => {
    clearScreenForm();
    setScreenFormState("Form reset.");
  });

  els.screenRefreshBtn.addEventListener("click", async () => {
    try {
      await loadScreens();
      setScreenFormState("Screen list refreshed.");
    } catch (error) {
      logLine(`Refresh screens failed: ${error.message}`);
    }
  });

  els.screenTableBody.addEventListener("click", (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action === "edit-screen") {
      const screenId = toId(target.dataset.id);
      if (screenId) {
        selectScreen(screenId);
      }
    }

    if (target.dataset.action === "delete-screen") {
      const screenId = toId(target.dataset.id);
      if (screenId) {
        state.selectedScreenId = screenId;
        deleteScreen().catch((error) => {
          logLine(`Delete screen failed: ${error.message}`);
        });
      }
    }
  });

  els.saveShowBtn.addEventListener("click", async () => {
    try {
      if (state.selectedShowId) {
        await updateShow();
      } else {
        await createShow();
      }
    } catch (error) {
      logLine(`Save show failed: ${error.message}`);
    }
  });

  els.resetShowBtn.addEventListener("click", () => {
    clearForm();
    setFormState("Form reset.");
  });

  els.refreshShowsBtn.addEventListener("click", async () => {
    try {
      await loadShows();
      setFormState("Show list refreshed.");
    } catch (error) {
      logLine(`Refresh failed: ${error.message}`);
    }
  });

  els.verifyBtn.addEventListener("click", async () => {
    try {
      await verifyDb();
    } catch (error) {
      logLine(`Verify failed: ${error.message}`);
    }
  });

  els.showTableBody.addEventListener("click", (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action === "edit") {
      const showId = toId(target.dataset.id);
      if (showId) {
        selectShow(showId);
        setFormState(`Editing show #${showId}.`);
      }
    }

    if (target.dataset.action === "delete") {
      const showId = toId(target.dataset.id);
      if (showId) {
        state.selectedShowId = showId;
        deleteShow().catch((error) => {
          logLine(`Delete failed: ${error.message}`);
        });
      }
    }
  });
}

async function boot() {
  const session = getSession();
  if (!session || session.role !== "admin") {
    window.location.href = "./index.html";
    return;
  }

  state.session = session;
  els.adminWelcomeText.textContent = `Logged in as ${session.admin.username}`;

  bindEvents();

  try {
    await apiGet("/api/health");
    await loadTheaters();
    await loadScreens();
    await loadMovies();
    await loadShows();
    clearMovieForm();
    clearTheaterForm();
    clearScreenForm();
    clearForm();
    await verifyDb();
    setFormState("Dashboard ready.");
    logLine("Admin dashboard ready.");
  } catch (error) {
    logLine(`Startup error: ${error.message}`);
  }
}

boot();
