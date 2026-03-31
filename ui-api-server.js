const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { execFile } = require("child_process");

const ROOT_DIR = __dirname;
const UI_DIR = path.join(ROOT_DIR, "ui");
const SQL_DIR = path.join(ROOT_DIR, "sql");

const PORT = Number(process.env.UI_PORT || 8090);
const MYSQL_PATH = process.env.MYSQL_PATH || "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_NAME = process.env.DB_NAME || "movie_ticket_booking";
const DB_USER = process.env.DB_USER || "";
const DB_PASS = process.env.DB_PASS || "";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SEATS_PER_ROW = 5;
const MAX_SEATS_PER_SCREEN = 130;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*"
  });
  res.end(text);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", (error) => reject(error));
  });
}

function sqlQuote(value) {
  if (value === undefined || value === null || value === "") {
    return "NULL";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parsePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseSeatIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("seat_ids must be a non-empty array.");
  }
  return value.map((seatId) => parsePositiveInt(seatId, "seat_id"));
}

function parsePositiveAmount(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return parsed.toFixed(2);
}

function normalizeDateTime(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  let normalized = value.trim().replace("T", " ");
  const hasSeconds = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized);
  const hasMinutes = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized);

  if (!hasSeconds && !hasMinutes) {
    throw new Error(`${label} must be in YYYY-MM-DD HH:mm or YYYY-MM-DD HH:mm:ss format.`);
  }

  if (hasMinutes) {
    normalized = `${normalized}:00`;
  }

  return normalized;
}

function parseShowStatus(value) {
  const status = String(value || "SCHEDULED").toUpperCase();
  const allowed = ["SCHEDULED", "CANCELLED", "COMPLETED"];
  if (!allowed.includes(status)) {
    throw new Error("status must be SCHEDULED, CANCELLED, or COMPLETED.");
  }
  return status;
}

function parseRequiredText(value, label, maxLength = 255) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(`${label} is required.`);
  }
  if (text.length > maxLength) {
    throw new Error(`${label} is too long.`);
  }
  return text;
}

function parseEmail(value) {
  const email = parseRequiredText(value, "email", 255).toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!ok) {
    throw new Error("email format is invalid.");
  }
  return email;
}

function parsePhone(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const phone = String(value).trim();
  if (phone.length > 20) {
    throw new Error("phone is too long.");
  }
  return phone;
}

function parsePositiveIntRange(value, label, minValue, maxValue) {
  const parsed = parsePositiveInt(value, label);
  if (parsed < minValue || parsed > maxValue) {
    throw new Error(`${label} must be between ${minValue} and ${maxValue}.`);
  }
  return parsed;
}

function parseOptionalText(value, label, maxLength) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const text = String(value).trim();
  if (text.length > maxLength) {
    throw new Error(`${label} is too long.`);
  }
  return text;
}

function parseOptionalDate(value, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${label} must be in YYYY-MM-DD format.`);
  }
  return text;
}

function buildSeatLayout(capacity) {
  if (capacity > MAX_SEATS_PER_SCREEN) {
    throw new Error(`capacity cannot exceed ${MAX_SEATS_PER_SCREEN} seats per screen.`);
  }

  const seats = [];
  let remaining = capacity;

  for (let rowIndex = 0; rowIndex < 26 && remaining > 0; rowIndex += 1) {
    const rowLabel = String.fromCharCode(65 + rowIndex);
    const seatsInRow = Math.min(SEATS_PER_ROW, remaining);

    for (let seatIndex = 1; seatIndex <= seatsInRow; seatIndex += 1) {
      seats.push({
        seatNumber: `${rowLabel}${seatIndex}`,
        seatType: "REGULAR"
      });
    }

    remaining -= seatsInRow;
  }

  return seats;
}

function normalizeMysqlCliMessage(message) {
  const lines = String(message || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("mysql: [Warning]"));

  if (lines.length > 0) {
    return lines[lines.length - 1];
  }

  return "MySQL command failed.";
}

function buildMysqlArgs(sql) {
  const args = [];

  if (DB_USER) {
    args.push(`--user=${DB_USER}`);
  }
  if (DB_PASS) {
    args.push(`--password=${DB_PASS}`);
  }
  if (DB_HOST) {
    args.push(`--host=${DB_HOST}`);
  }
  if (DB_NAME) {
    args.push(`--database=${DB_NAME}`);
  }

  args.push("--batch", "--raw", "--skip-column-names", "--silent", `--execute=${sql}`);
  return args;
}

function runMysql(sql) {
  return new Promise((resolve, reject) => {
    if (!DB_USER || !DB_PASS) {
      reject(new Error("DB_USER and DB_PASS environment variables are required."));
      return;
    }

    execFile(MYSQL_PATH, buildMysqlArgs(sql), { maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const message = normalizeMysqlCliMessage(stderr || stdout || error.message);
        reject(new Error(message));
        return;
      }

      resolve(String(stdout || "").trim());
    });
  });
}

function parseLastJsonLine(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const candidate = lines[lines.length - 1];
  return JSON.parse(candidate);
}

async function getJsonResult(sql) {
  const output = await runMysql(sql);
  return parseLastJsonLine(output);
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".sql") return "text/plain; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function safeResolve(baseDir, relativePath) {
  const target = path.normalize(path.join(baseDir, relativePath));
  if (!target.startsWith(baseDir)) {
    return null;
  }
  return target;
}

function tryServeStatic(urlPath, res) {
  let candidate = null;

  if (urlPath === "/" || urlPath === "/ui" || urlPath === "/ui/") {
    candidate = path.join(UI_DIR, "index.html");
  } else if (urlPath.startsWith("/ui/")) {
    const relative = decodeURIComponent(urlPath.slice(4));
    candidate = safeResolve(UI_DIR, relative);
  } else if (urlPath.startsWith("/sql/")) {
    const relative = decodeURIComponent(urlPath.slice(5));
    candidate = safeResolve(SQL_DIR, relative);
  }

  if (!candidate) {
    return false;
  }

  fs.readFile(candidate, (error, data) => {
    if (error) {
      sendText(res, 404, "Not found.");
      return;
    }

    sendText(res, 200, data, mimeType(candidate));
  });

  return true;
}

async function handleApi(req, res, parsedUrl) {
  const { pathname } = parsedUrl;

  if (req.method === "GET" && pathname === "/api/health") {
    const result = await getJsonResult("SELECT JSON_OBJECT('ok', TRUE, 'db', DATABASE())");
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await readJsonBody(req);
    const role = String(body.role || "").toLowerCase();

    if (role === "user") {
      const userId = parsePositiveInt(body.user_id, "user_id");
      const user = await getJsonResult(
        `SELECT JSON_OBJECT('user_id', user_id, 'full_name', full_name, 'email', email) FROM users WHERE user_id = ${userId}`
      );

      if (!user) {
        sendJson(res, 401, { error: "Invalid user login." });
        return;
      }

      sendJson(res, 200, { ok: true, role: "user", user });
      return;
    }

    if (role === "admin") {
      const username = String(body.username || "").trim();
      const password = String(body.password || "");

      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        sendJson(res, 401, { error: "Invalid admin credentials." });
        return;
      }

      sendJson(res, 200, { ok: true, role: "admin", admin: { username: ADMIN_USERNAME } });
      return;
    }

    sendJson(res, 400, { error: "role must be either user or admin." });
    return;
  }

  if (req.method === "GET" && pathname === "/api/users") {
    const users = await getJsonResult(
      "SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('user_id', user_id, 'full_name', full_name, 'email', email)), JSON_ARRAY()) FROM (SELECT user_id, full_name, email FROM users ORDER BY user_id) x"
    );
    sendJson(res, 200, { users });
    return;
  }

  if (req.method === "POST" && pathname === "/api/users/create") {
    const body = await readJsonBody(req);
    const fullName = parseRequiredText(body.full_name, "full_name", 100);
    const email = parseEmail(body.email);
    const phone = parsePhone(body.phone);

    let created;
    try {
      created = await getJsonResult(
        `INSERT INTO users (full_name, email, phone, password_hash)
         VALUES (${sqlQuote(fullName)}, ${sqlQuote(email)}, ${sqlQuote(phone)}, 'ui_created_user');
         SELECT JSON_OBJECT(
           'user_id', LAST_INSERT_ID(),
           'full_name', ${sqlQuote(fullName)},
           'email', ${sqlQuote(email)},
           'phone', ${sqlQuote(phone)}
         )`
      );
    } catch (error) {
      const message = String(error.message || "");
      if (message.includes("uq_users_email")) {
        throw new Error("A user with this email already exists.");
      }
      if (message.includes("uq_users_phone")) {
        throw new Error("A user with this phone already exists.");
      }
      throw new Error("Could not create user. Please verify the details and try again.");
    }

    sendJson(res, 200, { user: created });
    return;
  }

  if (req.method === "GET" && pathname === "/api/movies") {
    const movies = await getJsonResult(
      "SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('movie_id', movie_id, 'title', title, 'duration_minutes', duration_minutes, 'genre', genre, 'language', language)), JSON_ARRAY()) FROM (SELECT movie_id, title, duration_minutes, genre, language FROM movies ORDER BY movie_id) x"
    );
    sendJson(res, 200, { movies });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/movies") {
    const movies = await getJsonResult(
      "SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('movie_id', movie_id, 'title', title, 'duration_minutes', duration_minutes, 'genre', genre, 'language', language, 'certificate', certificate, 'release_date', release_date)), JSON_ARRAY()) FROM (SELECT movie_id, title, duration_minutes, genre, language, certificate, IFNULL(DATE_FORMAT(release_date, '%Y-%m-%d'), NULL) AS release_date FROM movies ORDER BY movie_id) x"
    );
    sendJson(res, 200, { movies });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/movies/create") {
    const body = await readJsonBody(req);
    const title = parseRequiredText(body.title, "title", 150);
    const duration = parsePositiveIntRange(body.duration_minutes, "duration_minutes", 30, 400);
    const genre = parseRequiredText(body.genre, "genre", 80);
    const language = parseRequiredText(body.language || "English", "language", 50);
    const certificate = parseOptionalText(body.certificate, "certificate", 10);
    const releaseDate = parseOptionalDate(body.release_date, "release_date");

    const result = await getJsonResult(
      `INSERT INTO movies (title, duration_minutes, genre, language, certificate, release_date)
       VALUES (${sqlQuote(title)}, ${duration}, ${sqlQuote(genre)}, ${sqlQuote(language)}, ${sqlQuote(certificate)}, ${sqlQuote(releaseDate)});
       SELECT JSON_OBJECT('movie_id', LAST_INSERT_ID())`
    );

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/movies/update") {
    const body = await readJsonBody(req);
    const movieId = parsePositiveInt(body.movie_id, "movie_id");
    const title = parseRequiredText(body.title, "title", 150);
    const duration = parsePositiveIntRange(body.duration_minutes, "duration_minutes", 30, 400);
    const genre = parseRequiredText(body.genre, "genre", 80);
    const language = parseRequiredText(body.language || "English", "language", 50);
    const certificate = parseOptionalText(body.certificate, "certificate", 10);
    const releaseDate = parseOptionalDate(body.release_date, "release_date");

    const result = await getJsonResult(
      `UPDATE movies
       SET title = ${sqlQuote(title)},
           duration_minutes = ${duration},
           genre = ${sqlQuote(genre)},
           language = ${sqlQuote(language)},
           certificate = ${sqlQuote(certificate)},
           release_date = ${sqlQuote(releaseDate)}
       WHERE movie_id = ${movieId};
       SELECT JSON_OBJECT('movie_id', ${movieId}, 'updated', ROW_COUNT())`
    );

    if (!result || Number(result.updated) === 0) {
      sendJson(res, 404, { error: "Movie not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/movies/delete") {
    const body = await readJsonBody(req);
    const movieId = parsePositiveInt(body.movie_id, "movie_id");

    const result = await getJsonResult(
      `DELETE FROM movies WHERE movie_id = ${movieId};
       SELECT JSON_OBJECT('movie_id', ${movieId}, 'deleted', ROW_COUNT())`
    );

    if (!result || Number(result.deleted) === 0) {
      sendJson(res, 404, { error: "Movie not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/theaters") {
    const theaters = await getJsonResult(
      "SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('theater_id', theater_id, 'name', name, 'location', location)), JSON_ARRAY()) FROM (SELECT theater_id, name, location FROM theaters ORDER BY name) x"
    );
    sendJson(res, 200, { theaters });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/theaters/create") {
    const body = await readJsonBody(req);
    const name = parseRequiredText(body.name, "name", 120);
    const location = parseRequiredText(body.location, "location", 200);

    const result = await getJsonResult(
      `INSERT INTO theaters (name, location)
       VALUES (${sqlQuote(name)}, ${sqlQuote(location)});
       SELECT JSON_OBJECT('theater_id', LAST_INSERT_ID())`
    );

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/theaters/update") {
    const body = await readJsonBody(req);
    const theaterId = parsePositiveInt(body.theater_id, "theater_id");
    const name = parseRequiredText(body.name, "name", 120);
    const location = parseRequiredText(body.location, "location", 200);

    const result = await getJsonResult(
      `UPDATE theaters
       SET name = ${sqlQuote(name)},
           location = ${sqlQuote(location)}
       WHERE theater_id = ${theaterId};
       SELECT JSON_OBJECT('theater_id', ${theaterId}, 'updated', ROW_COUNT())`
    );

    if (!result || Number(result.updated) === 0) {
      sendJson(res, 404, { error: "Theater not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/theaters/delete") {
    const body = await readJsonBody(req);
    const theaterId = parsePositiveInt(body.theater_id, "theater_id");

    const result = await getJsonResult(
      `DELETE FROM theaters WHERE theater_id = ${theaterId};
       SELECT JSON_OBJECT('theater_id', ${theaterId}, 'deleted', ROW_COUNT())`
    );

    if (!result || Number(result.deleted) === 0) {
      sendJson(res, 404, { error: "Theater not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/api/shows") {
    const movieId = parsedUrl.searchParams.get("movie_id");
    let whereClause = "WHERE status = 'SCHEDULED'";

    if (movieId) {
      const parsedMovieId = parsePositiveInt(movieId, "movie_id");
      whereClause += ` AND movie_id = ${parsedMovieId}`;
    }

    const shows = await getJsonResult(
      `SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('show_id', show_id, 'movie_id', movie_id, 'screen_id', screen_id, 'show_time', DATE_FORMAT(show_time, '%Y-%m-%d %H:%i:%s'), 'base_price', base_price, 'status', status)), JSON_ARRAY()) FROM (SELECT show_id, movie_id, screen_id, show_time, base_price, status FROM shows ${whereClause} ORDER BY show_time) x`
    );
    sendJson(res, 200, { shows });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/screens") {
    const screens = await getJsonResult(
      "SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('screen_id', screen_id, 'screen_name', screen_name, 'capacity', capacity, 'theater_id', theater_id, 'theater_name', theater_name)), JSON_ARRAY()) FROM (SELECT s.screen_id, s.screen_name, s.capacity, t.theater_id, t.name AS theater_name FROM screens s INNER JOIN theaters t ON t.theater_id = s.theater_id ORDER BY t.name, s.screen_name) x"
    );
    sendJson(res, 200, { screens });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/screens/create") {
    const body = await readJsonBody(req);
    const theaterId = parsePositiveInt(body.theater_id, "theater_id");
    const screenName = parseRequiredText(body.screen_name, "screen_name", 60);
    const capacity = parsePositiveIntRange(body.capacity, "capacity", 1, MAX_SEATS_PER_SCREEN);
    const seatLayout = buildSeatLayout(capacity);
    const seatValues = seatLayout
      .map((seat) => `(@new_screen_id, ${sqlQuote(seat.seatNumber)}, ${sqlQuote(seat.seatType)})`)
      .join(", ");

    const result = await getJsonResult(
      `START TRANSACTION;
       INSERT INTO screens (theater_id, screen_name, capacity)
       VALUES (${theaterId}, ${sqlQuote(screenName)}, ${capacity});
       SET @new_screen_id = LAST_INSERT_ID();
       INSERT INTO seats (screen_id, seat_number, seat_type)
       VALUES ${seatValues};
       COMMIT;
       SELECT JSON_OBJECT('screen_id', @new_screen_id)`
    );

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/screens/update") {
    const body = await readJsonBody(req);
    const screenId = parsePositiveInt(body.screen_id, "screen_id");
    const screenName = parseRequiredText(body.screen_name, "screen_name", 60);
    const capacity = parsePositiveIntRange(body.capacity, "capacity", 1, MAX_SEATS_PER_SCREEN);
    const current = await getJsonResult(
      `SELECT JSON_OBJECT('capacity', capacity) FROM screens WHERE screen_id = ${screenId}`
    );

    if (!current) {
      sendJson(res, 404, { error: "Screen not found." });
      return;
    }

    if (Number(current.capacity) !== capacity) {
      throw new Error("Capacity updates are not supported. Create a new screen instead.");
    }

    const result = await getJsonResult(
      `UPDATE screens
       SET screen_name = ${sqlQuote(screenName)}
       WHERE screen_id = ${screenId};
       SELECT JSON_OBJECT('screen_id', ${screenId}, 'updated', ROW_COUNT())`
    );

    if (!result || Number(result.updated) === 0) {
      sendJson(res, 404, { error: "Screen not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/screens/delete") {
    const body = await readJsonBody(req);
    const screenId = parsePositiveInt(body.screen_id, "screen_id");

    const result = await getJsonResult(
      `DELETE FROM screens WHERE screen_id = ${screenId};
       SELECT JSON_OBJECT('screen_id', ${screenId}, 'deleted', ROW_COUNT())`
    );

    if (!result || Number(result.deleted) === 0) {
      sendJson(res, 404, { error: "Screen not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/shows") {
    const shows = await getJsonResult(
      "SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('show_id', show_id, 'movie_id', movie_id, 'movie_title', movie_title, 'screen_id', screen_id, 'screen_name', screen_name, 'theater_name', theater_name, 'show_time', show_time, 'base_price', base_price, 'status', status)), JSON_ARRAY()) FROM (SELECT sh.show_id, sh.movie_id, m.title AS movie_title, sh.screen_id, s.screen_name, t.name AS theater_name, DATE_FORMAT(sh.show_time, '%Y-%m-%d %H:%i:%s') AS show_time, sh.base_price, sh.status FROM shows sh INNER JOIN movies m ON m.movie_id = sh.movie_id INNER JOIN screens s ON s.screen_id = sh.screen_id INNER JOIN theaters t ON t.theater_id = s.theater_id ORDER BY sh.show_time DESC) x"
    );
    sendJson(res, 200, { shows });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/shows/create") {
    const body = await readJsonBody(req);
    const movieId = parsePositiveInt(body.movie_id, "movie_id");
    const screenId = parsePositiveInt(body.screen_id, "screen_id");
    const showTime = normalizeDateTime(body.show_time, "show_time");
    const basePrice = parsePositiveAmount(body.base_price, "base_price");
    const status = parseShowStatus(body.status);

    const result = await getJsonResult(
      `INSERT INTO shows (movie_id, screen_id, show_time, end_time, base_price, status) VALUES (${movieId}, ${screenId}, ${sqlQuote(showTime)}, NULL, ${basePrice}, ${sqlQuote(status)});
       SELECT JSON_OBJECT('show_id', LAST_INSERT_ID())`
    );

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/shows/update") {
    const body = await readJsonBody(req);
    const showId = parsePositiveInt(body.show_id, "show_id");
    const movieId = parsePositiveInt(body.movie_id, "movie_id");
    const screenId = parsePositiveInt(body.screen_id, "screen_id");
    const showTime = normalizeDateTime(body.show_time, "show_time");
    const basePrice = parsePositiveAmount(body.base_price, "base_price");
    const status = parseShowStatus(body.status);

    const result = await getJsonResult(
      `UPDATE shows
       SET movie_id = ${movieId},
           screen_id = ${screenId},
           show_time = ${sqlQuote(showTime)},
           end_time = NULL,
           base_price = ${basePrice},
           status = ${sqlQuote(status)}
       WHERE show_id = ${showId};
       SELECT JSON_OBJECT('show_id', ${showId}, 'updated', ROW_COUNT())`
    );

    if (!result || Number(result.updated) === 0) {
      sendJson(res, 404, { error: "Show not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/shows/delete") {
    const body = await readJsonBody(req);
    const showId = parsePositiveInt(body.show_id, "show_id");

    const result = await getJsonResult(
      `DELETE FROM shows WHERE show_id = ${showId};
       SELECT JSON_OBJECT('show_id', ${showId}, 'deleted', ROW_COUNT())`
    );

    if (!result || Number(result.deleted) === 0) {
      sendJson(res, 404, { error: "Show not found." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/api/seats") {
    const showId = parsePositiveInt(parsedUrl.searchParams.get("show_id"), "show_id");
    const seats = await getJsonResult(
      `SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('seat_id', seat_id, 'seat_number', seat_number, 'seat_type', seat_type)), JSON_ARRAY()) FROM (SELECT seat_id, seat_number, seat_type FROM v_show_seat_availability WHERE show_id = ${showId} AND availability = 'AVAILABLE' ORDER BY seat_number) x`
    );
    sendJson(res, 200, { seats });
    return;
  }

  const bookingMatch = pathname.match(/^\/api\/bookings\/(\d+)$/);
  if (req.method === "GET" && bookingMatch) {
    const bookingId = parsePositiveInt(bookingMatch[1], "booking_id");
    const booking = await getJsonResult(
      `SELECT JSON_OBJECT(
        'booking_id', b.booking_id,
        'user_id', b.user_id,
        'show_id', b.show_id,
        'status', b.status,
        'seat_count', b.seat_count,
        'total_amount', b.total_amount,
        'booking_time', DATE_FORMAT(b.booking_time, '%Y-%m-%d %H:%i:%s'),
        'cancelled_time', IFNULL(DATE_FORMAT(b.cancelled_time, '%Y-%m-%d %H:%i:%s'), NULL),
        'seats', COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT('seat_id', bs.seat_id, 'seat_number', s.seat_number, 'seat_type', s.seat_type)
            )
            FROM booking_seats bs
            INNER JOIN seats s ON s.seat_id = bs.seat_id
            WHERE bs.booking_id = b.booking_id
          ),
          JSON_ARRAY()
        ),
        'payment', COALESCE(
          (
            SELECT JSON_OBJECT(
              'payment_id', p.payment_id,
              'status', p.status,
              'amount', p.amount,
              'payment_method', p.payment_method,
              'transaction_ref', p.transaction_ref
            )
            FROM payments p
            WHERE p.booking_id = b.booking_id
          ),
          JSON_OBJECT()
        )
      )
      FROM bookings b
      WHERE b.booking_id = ${bookingId}`
    );

    if (!booking) {
      sendJson(res, 404, { error: "Booking not found." });
      return;
    }

    sendJson(res, 200, { booking });
    return;
  }

  if (req.method === "GET" && pathname === "/api/verify") {
    const showIdParam = parsedUrl.searchParams.get("show_id");
    const bookingIdParam = parsedUrl.searchParams.get("booking_id");
    const bookingStatusExpr = bookingIdParam
      ? `(SELECT status FROM bookings WHERE booking_id = ${parsePositiveInt(bookingIdParam, "booking_id")})`
      : "NULL";

    let availableFilter = "availability = 'AVAILABLE'";
    let bookedFilter = "availability = 'BOOKED'";
    let showIdExpr = "NULL";

    if (showIdParam !== null && String(showIdParam).trim() !== "") {
      const showId = parsePositiveInt(showIdParam, "show_id");
      availableFilter = `show_id = ${showId} AND availability = 'AVAILABLE'`;
      bookedFilter = `show_id = ${showId} AND availability = 'BOOKED'`;
      showIdExpr = String(showId);
    }

    const verify = await getJsonResult(
      `SELECT JSON_OBJECT(
        'tables_count', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()),
        'available_seats', (SELECT COUNT(*) FROM v_show_seat_availability WHERE ${availableFilter}),
        'booked_seats', (SELECT COUNT(*) FROM v_show_seat_availability WHERE ${bookedFilter}),
        'booking_status', ${bookingStatusExpr},
        'show_id', ${showIdExpr}
      )`
    );

    sendJson(res, 200, verify);
    return;
  }

  if (req.method === "POST" && pathname === "/api/bookings/create") {
    const body = await readJsonBody(req);
    const userId = parsePositiveInt(body.user_id, "user_id");
    const showId = parsePositiveInt(body.show_id, "show_id");
    const seatIds = parseSeatIds(body.seat_ids);

    const userCheck = await getJsonResult(
      `SELECT JSON_OBJECT('count', COUNT(*)) FROM users WHERE user_id = ${userId}`
    );

    if (!userCheck || Number(userCheck.count) === 0) {
      sendJson(res, 404, { error: "User not found." });
      return;
    }

    const show = await getJsonResult(
      `SELECT JSON_OBJECT('screen_id', screen_id, 'status', status, 'base_price', base_price)
       FROM shows
       WHERE show_id = ${showId}`
    );

    if (!show) {
      sendJson(res, 404, { error: "Show not found." });
      return;
    }

    if (show.status !== "SCHEDULED") {
      sendJson(res, 400, { error: "Only scheduled shows can be booked." });
      return;
    }

    const seatCount = seatIds.length;
    const validSeatCheck = await getJsonResult(
      `SELECT JSON_OBJECT('count', COUNT(*))
       FROM seats
       WHERE screen_id = ${show.screen_id}
         AND seat_id IN (${seatIds.join(",")})`
    );

    if (!validSeatCheck || Number(validSeatCheck.count) !== seatCount) {
      sendJson(res, 400, { error: "One or more selected seats do not belong to the show screen." });
      return;
    }

    const conflictCheck = await getJsonResult(
      `SELECT JSON_OBJECT('count', COUNT(*))
       FROM booking_seats bs
       INNER JOIN bookings b ON b.booking_id = bs.booking_id
       WHERE bs.show_id = ${showId}
         AND bs.seat_id IN (${seatIds.join(",")})
         AND b.status IN ('PENDING', 'CONFIRMED')`
    );

    if (conflictCheck && Number(conflictCheck.count) > 0) {
      sendJson(res, 409, { error: "One or more selected seats are already booked for this show." });
      return;
    }

    const totalAmount = (Number(show.base_price) * seatCount).toFixed(2);
    const seatValues = seatIds
      .map((seatId) => `(@new_booking_id, ${showId}, ${seatId})`)
      .join(", ");

    const bookingResult = await getJsonResult(
      `INSERT INTO bookings (user_id, show_id, status, seat_count, total_amount)
       VALUES (${userId}, ${showId}, 'CONFIRMED', ${seatCount}, ${totalAmount});
       SET @new_booking_id = LAST_INSERT_ID();
       INSERT INTO booking_seats (booking_id, show_id, seat_id)
       VALUES ${seatValues};
       INSERT INTO payments (booking_id, amount, status)
       VALUES (@new_booking_id, ${totalAmount}, 'PENDING');
       SELECT JSON_OBJECT('booking_id', @new_booking_id)`
    );

    sendJson(res, 200, bookingResult);
    return;
  }

  if (req.method === "POST" && pathname === "/api/bookings/payment-success") {
    const body = await readJsonBody(req);
    const bookingId = parsePositiveInt(body.booking_id, "booking_id");
    const paymentMethod = body.payment_method || "UPI";
    const txnRef = body.transaction_ref || `TXN-UI-${Date.now()}`;

    const result = await getJsonResult(
      `UPDATE payments
       SET status = 'SUCCESS',
           transaction_ref = ${sqlQuote(txnRef)},
           payment_method = ${sqlQuote(paymentMethod)},
           payment_time = NOW()
       WHERE booking_id = ${bookingId};
       SELECT JSON_OBJECT('booking_id', ${bookingId}, 'payment_status', 'SUCCESS', 'transaction_ref', ${sqlQuote(txnRef)}, 'updated', ROW_COUNT())`
    );

    if (!result || Number(result.updated) === 0) {
      sendJson(res, 404, { error: "Payment not found for this booking." });
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/bookings/cancel") {
    const body = await readJsonBody(req);
    const bookingId = parsePositiveInt(body.booking_id, "booking_id");
    const userId = parsePositiveInt(body.user_id, "user_id");

    const booking = await getJsonResult(
      `SELECT JSON_OBJECT('status', status, 'user_id', user_id)
       FROM bookings
       WHERE booking_id = ${bookingId}`
    );

    if (!booking) {
      sendJson(res, 404, { error: "Booking not found." });
      return;
    }

    if (Number(booking.user_id) !== userId) {
      sendJson(res, 403, { error: "Booking does not belong to this user." });
      return;
    }

    if (booking.status === "CANCELLED") {
      sendJson(res, 400, { error: "Booking is already cancelled." });
      return;
    }

    const result = await getJsonResult(
      `UPDATE bookings
       SET status = 'CANCELLED',
           cancelled_time = NOW()
       WHERE booking_id = ${bookingId};
       DELETE FROM booking_seats WHERE booking_id = ${bookingId};
       UPDATE payments
       SET status = CASE
           WHEN status = 'SUCCESS' THEN 'REFUNDED'
           WHEN status = 'PENDING' THEN 'FAILED'
           ELSE status
         END,
         payment_time = NOW()
       WHERE booking_id = ${bookingId};
       SELECT JSON_OBJECT('booking_id', ${bookingId}, 'status', 'CANCELLED')`
    );

    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = parsedUrl;

  if (pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, parsedUrl);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const served = tryServeStatic(pathname, res);
  if (!served) {
    sendText(res, 404, "Not found.");
  }
});

server.listen(PORT, () => {
  console.log(`UI API server running at http://localhost:${PORT}`);
  if (DB_USER && DB_PASS) {
    console.log(`DB connection configured for ${DB_USER}@${DB_HOST}/${DB_NAME}`);
  } else {
    console.log("DB credentials are not set. API requests requiring MySQL will fail.");
  }
});
