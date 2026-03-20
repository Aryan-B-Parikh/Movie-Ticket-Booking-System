// Global state
let currentMovies = [];
let selectedMovie = null;
let selectedShow = null;
let selectedSeats = [];
let availableSeats = [];
let seatPrices = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    initializeAuth();
    await loadMovies();
    attachEventListeners();
});

// Authentication Management
function initializeAuth() {
    const userInfo = document.getElementById('userInfo');
    const loginLink = document.getElementById('loginLink');
    const username = document.getElementById('username');
    const logoutBtn = document.getElementById('logoutBtn');

    if (api.isAuthenticated() && !api.isTokenExpired()) {
        const user = api.getCurrentUser();
        if (user) {
            // Show user info, hide login link
            userInfo.style.display = 'flex';
            loginLink.style.display = 'none';
            username.textContent = user.email.split('@')[0]; // Show username part of email
        } else {
            // Token invalid, clear it
            api.removeAuthToken();
            showLoginState();
        }
    } else {
        showLoginState();
    }

    // Attach logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function showLoginState() {
    const userInfo = document.getElementById('userInfo');
    const loginLink = document.getElementById('loginLink');

    userInfo.style.display = 'none';
    loginLink.style.display = 'block';
}

function handleLogout() {
    api.logout();
    showToast('Logged out successfully', 'success');
}

// Event Listeners
function attachEventListeners() {
    // Filter handlers
    const genreFilter = document.getElementById('genreFilter');
    const languageFilter = document.getElementById('languageFilter');

    if (genreFilter) {
        genreFilter.addEventListener('change', handleFilterChange);
    }

    if (languageFilter) {
        languageFilter.addEventListener('change', handleFilterChange);
    }

    // Booking form handler
    const confirmBookingForm = document.getElementById('confirmBookingForm');
    if (confirmBookingForm) {
        confirmBookingForm.addEventListener('submit', handleBookingConfirmation);
    }

    // Modal close on background click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Movie Management
async function loadMovies() {
    showLoadingState();

    try {
        const response = await api.getMovies();
        // API returns { status, data: { movies: [...] } }
        currentMovies = response.data?.movies || response.movies || [];
        displayMovies(currentMovies);
    } catch (error) {
        console.error('Error loading movies:', error);
        showErrorState('Failed to load movies. Please try again later.');
        showToast('Failed to load movies', 'error');
    }
}

function displayMovies(movies) {
    const moviesGrid = document.getElementById('moviesGrid');
    const loadingMovies = document.getElementById('loadingMovies');
    const moviesError = document.getElementById('moviesError');

    // Hide loading and error states
    loadingMovies.style.display = 'none';
    moviesError.style.display = 'none';

    if (!movies || movies.length === 0) {
        moviesGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 2rem; color: #666;">No movies found.</p>';
        return;
    }

    moviesGrid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="openMovieDetails(${movie.movie_id})" data-movie-id="${movie.movie_id}">
            <img src="${movie.poster_url || 'https://via.placeholder.com/280x400?text=No+Poster'}"
                 alt="${movie.title}"
                 class="movie-poster"
                 onerror="this.src='https://via.placeholder.com/280x400?text=No+Poster'">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span class="movie-genre">${movie.genre}</span>
                    <span class="movie-duration">${movie.duration} min</span>
                </div>
                <div class="movie-meta">
                    <span class="movie-language">${movie.language}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function showLoadingState() {
    const moviesGrid = document.getElementById('moviesGrid');
    const loadingMovies = document.getElementById('loadingMovies');
    const moviesError = document.getElementById('moviesError');

    moviesGrid.innerHTML = '';
    loadingMovies.style.display = 'block';
    moviesError.style.display = 'none';
}

function showErrorState(message) {
    const moviesGrid = document.getElementById('moviesGrid');
    const loadingMovies = document.getElementById('loadingMovies');
    const moviesError = document.getElementById('moviesError');

    moviesGrid.innerHTML = '';
    loadingMovies.style.display = 'none';
    moviesError.style.display = 'block';
    moviesError.querySelector('p').textContent = message;
}

// Filter handling
async function handleFilterChange() {
    const genre = document.getElementById('genreFilter').value;
    const language = document.getElementById('languageFilter').value;

    const filters = {};
    if (genre) filters.genre = genre;
    if (language) filters.language = language;

    showLoadingState();

    try {
        const response = await api.getMovies(filters);
        const movies = response.data?.movies || response.movies || [];
        displayMovies(movies);
    } catch (error) {
        console.error('Error filtering movies:', error);
        showErrorState('Failed to filter movies. Please try again.');
        showToast('Failed to filter movies', 'error');
    }
}

// Movie Details Modal
async function openMovieDetails(movieId) {
    try {
        const response = await api.getMovie(movieId);
        const movie = response.data?.movie || response.movie || response.data;

        selectedMovie = movie;
        displayMovieDetails(movie);

        const modal = document.getElementById('movieModal');
        modal.style.display = 'flex';

        // Load shows for this movie
        await loadMovieShows(movieId);
    } catch (error) {
        console.error('Error loading movie details:', error);
        showToast('Failed to load movie details', 'error');
    }
}

function displayMovieDetails(movie) {
    const movieDetails = document.getElementById('movieDetails');

    movieDetails.innerHTML = `
        <div class="movie-details">
            <div class="movie-info-large">
                <h3>${movie.title}</h3>
                <div class="movie-detail-row">
                    <span class="movie-detail-label">Genre:</span>
                    <span>${movie.genre}</span>
                </div>
                <div class="movie-detail-row">
                    <span class="movie-detail-label">Language:</span>
                    <span>${movie.language}</span>
                </div>
                <div class="movie-detail-row">
                    <span class="movie-detail-label">Duration:</span>
                    <span>${movie.duration} minutes</span>
                </div>
                <div class="movie-detail-row">
                    <span class="movie-detail-label">Release Date:</span>
                    <span>${formatDate(movie.release_date)}</span>
                </div>
                <div style="margin-top: 2rem;">
                    <button class="btn-primary" onclick="showMovieShows(${movie.movie_id})">
                        Book Tickets
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function loadMovieShows(movieId) {
    try {
        const response = await api.getMovieWithShows(movieId);
        const movieData = response.data || response;

        if (movieData && movieData.shows && movieData.shows.length > 0) {
            currentMovieShows = movieData.shows;
        } else {
            currentMovieShows = [];
        }
    } catch (error) {
        console.error('Error loading movie shows:', error);
        currentMovieShows = [];
    }
}

function showMovieShows(movieId) {
    if (!api.isAuthenticated()) {
        showToast('Please login to book tickets', 'error');
        window.location.href = 'pages/login.html';
        return;
    }

    closeMovieModal();
    openShowModal(movieId);
}

// Show Selection Modal
async function openShowModal(movieId) {
    try {
        const response = await api.getMovieWithShows(movieId);
        const movieData = response.data || response;
        const shows = movieData?.shows || [];

        displayShows(shows, movieData);

        const modal = document.getElementById('showModal');
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading shows:', error);
        showToast('Failed to load show times', 'error');
    }
}

function displayShows(shows, movieData) {
    const showSelection = document.getElementById('showSelection');

    if (!shows || shows.length === 0) {
        showSelection.innerHTML = `
            <h3>Select Show Time - ${movieData.title}</h3>
            <p style="text-align: center; color: #666; padding: 2rem;">
                No shows available for this movie.
            </p>
        `;
        return;
    }

    // Group shows by date
    const showsByDate = shows.reduce((groups, show) => {
        const date = formatDate(show.show_time);
        if (!groups[date]) groups[date] = [];
        groups[date].push(show);
        return groups;
    }, {});

    const showsHTML = Object.entries(showsByDate).map(([date, dateShows]) => `
        <div class="show-date-group">
            <h4 style="margin: 1.5rem 0 1rem; color: #333; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
                ${date}
            </h4>
            <div class="shows-grid">
                ${dateShows.map(show => `
                    <div class="show-card" onclick="selectShow(${show.show_id})" data-show-id="${show.show_id}">
                        <div class="show-time">${formatTime(show.show_time)}</div>
                        <div class="show-theatre">${show.theatre_name}</div>
                        <div class="show-screen">Screen ${show.screen_number}</div>
                        <div class="show-price">${formatCurrency(show.price)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    showSelection.innerHTML = `
        <h3>Select Show Time - ${movieData.title}</h3>
        ${showsHTML}
    `;
}

async function selectShow(showId) {
    try {
        const response = await api.getShow(showId);
        selectedShow = response.data?.show || response.show || response.data;

        closeShowModal();
        await openSeatModal(showId);
    } catch (error) {
        console.error('Error selecting show:', error);
        showToast('Failed to load show details', 'error');
    }
}

// Seat Selection Modal
async function openSeatModal(showId) {
    try {
        const response = await api.getAvailableSeats(showId);
        availableSeats = response.data?.seats || response.seats || response.data || [];

        selectedSeats = [];
        seatPrices = {};

        displaySeatMap();
        updateBookingSummary();

        const modal = document.getElementById('seatModal');
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading seats:', error);
        showToast('Failed to load seat information', 'error');
    }
}

function displaySeatMap() {
    const seatMap = document.getElementById('seatMap');

    if (!availableSeats || availableSeats.length === 0) {
        seatMap.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No seat information available.</p>';
        return;
    }

    // Group seats by row
    const seatsByRow = availableSeats.reduce((groups, seat) => {
        const row = seat.seat_row || seat.seat_number.charAt(0);
        if (!groups[row]) groups[row] = [];
        groups[row].push(seat);
        return groups;
    }, {});

    // Sort rows alphabetically
    const sortedRows = Object.keys(seatsByRow).sort();

    const seatMapHTML = sortedRows.map(row => {
        const rowSeats = seatsByRow[row].sort((a, b) => {
            const aNum = parseInt(a.seat_number.slice(1)) || 0;
            const bNum = parseInt(b.seat_number.slice(1)) || 0;
            return aNum - bNum;
        });

        return `
            <div class="seat-row">
                <div class="row-label">${row}</div>
                ${rowSeats.map(seat => {
                    const seatClass = seat.is_available ? 'available' : 'booked';
                    const seatNumber = seat.seat_number.slice(1) || seat.seat_number;
                    return `
                        <div class="seat ${seatClass}"
                             data-seat-id="${seat.seat_id}"
                             data-seat-number="${seat.seat_number}"
                             data-seat-type="${seat.seat_type}"
                             onclick="${seat.is_available ? `toggleSeat(${seat.seat_id}, '${seat.seat_number}', '${seat.seat_type}')` : ''}"
                             title="${seat.seat_number} - ${seat.seat_type}${seat.is_available ? ' (Available)' : ' (Booked)'}">
                            ${seatNumber}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');

    seatMap.innerHTML = seatMapHTML;
}

function toggleSeat(seatId, seatNumber, seatType) {
    const seatElement = document.querySelector(`[data-seat-id="${seatId}"]`);
    const isSelected = selectedSeats.includes(seatId);

    if (isSelected) {
        // Deselect seat
        selectedSeats = selectedSeats.filter(id => id !== seatId);
        seatElement.classList.remove('selected');
        seatElement.classList.add('available');
        delete seatPrices[seatId];
    } else {
        // Select seat
        selectedSeats.push(seatId);
        seatElement.classList.remove('available');
        seatElement.classList.add('selected');

        // Store seat price based on type
        const basePrice = selectedShow.price || 0;
        const multiplier = getSeatTypeMultiplier(seatType);
        seatPrices[seatId] = basePrice * multiplier;
    }

    updateBookingSummary();
}

function getSeatTypeMultiplier(seatType) {
    const multipliers = {
        'REGULAR': 1.0,
        'PREMIUM': 1.5,
        'VIP': 2.0,
        'RECLINER': 2.5
    };
    return multipliers[seatType] || 1.0;
}

function updateBookingSummary() {
    const selectedSeatsElement = document.getElementById('selectedSeats');
    const totalAmountElement = document.getElementById('totalAmount');
    const proceedButton = document.getElementById('proceedBooking');

    if (selectedSeats.length === 0) {
        selectedSeatsElement.textContent = 'No seats selected';
        totalAmountElement.textContent = 'Total: ₹0';
        proceedButton.disabled = true;
    } else {
        const seatNumbers = selectedSeats.map(seatId => {
            const seatElement = document.querySelector(`[data-seat-id="${seatId}"]`);
            return seatElement.getAttribute('data-seat-number');
        }).join(', ');

        selectedSeatsElement.textContent = `Selected: ${seatNumbers}`;

        const totalAmount = Object.values(seatPrices).reduce((sum, price) => sum + price, 0);
        totalAmountElement.textContent = `Total: ${formatCurrency(totalAmount)}`;

        proceedButton.disabled = false;
    }
}

function proceedToBooking() {
    if (selectedSeats.length === 0) {
        showToast('Please select at least one seat', 'error');
        return;
    }

    closeSeatModal();
    openBookingModal();
}

// Booking Confirmation Modal
function openBookingModal() {
    const bookingSummary = document.getElementById('bookingSummary');

    const totalAmount = Object.values(seatPrices).reduce((sum, price) => sum + price, 0);
    const seatNumbers = selectedSeats.map(seatId => {
        const seatElement = document.querySelector(`[data-seat-id="${seatId}"]`);
        return seatElement.getAttribute('data-seat-number');
    }).join(', ');

    bookingSummary.innerHTML = `
        <div class="booking-summary-details">
            <h4>Booking Summary</h4>
            <div class="summary-row">
                <span>Movie:</span>
                <span>${selectedMovie.title}</span>
            </div>
            <div class="summary-row">
                <span>Show Time:</span>
                <span>${formatDateTime(selectedShow.show_time)}</span>
            </div>
            <div class="summary-row">
                <span>Theatre:</span>
                <span>${selectedShow.theatre_name} - Screen ${selectedShow.screen_number}</span>
            </div>
            <div class="summary-row">
                <span>Seats:</span>
                <span>${seatNumbers}</span>
            </div>
            <div class="summary-row total">
                <span><strong>Total Amount:</strong></span>
                <span><strong>${formatCurrency(totalAmount)}</strong></span>
            </div>
        </div>
    `;

    const modal = document.getElementById('bookingModal');
    modal.style.display = 'flex';
}

async function handleBookingConfirmation(event) {
    event.preventDefault();

    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!paymentMethod) {
        showToast('Please select a payment method', 'error');
        return;
    }

    const bookingData = {
        showId: selectedShow.show_id,
        seatIds: selectedSeats,
        paymentMethod: paymentMethod
    };

    try {
        // Disable the form to prevent double submission
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        const response = await api.createBooking(bookingData);

        showToast('Booking confirmed successfully!', 'success');
        closeBookingModal();

        // Optionally redirect to booking history
        setTimeout(() => {
            window.location.href = 'pages/booking.html';
        }, 2000);

    } catch (error) {
        console.error('Booking failed:', error);
        showToast(`Booking failed: ${error.message}`, 'error');

        // Re-enable the form
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Confirm Booking';
    }
}

// Modal Management
function closeMovieModal() {
    const modal = document.getElementById('movieModal');
    modal.style.display = 'none';
    selectedMovie = null;
}

function closeShowModal() {
    const modal = document.getElementById('showModal');
    modal.style.display = 'none';
}

function closeSeatModal() {
    const modal = document.getElementById('seatModal');
    modal.style.display = 'none';
    selectedSeats = [];
    seatPrices = {};
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.style.display = 'none';

    // Reset the form
    const form = document.getElementById('confirmBookingForm');
    form.reset();

    // Reset seat selection
    selectedSeats = [];
    seatPrices = {};
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });

    // Reset state
    selectedMovie = null;
    selectedShow = null;
    selectedSeats = [];
    seatPrices = {};
}

// Utility Functions
function getCurrentUserName() {
    const user = api.getCurrentUser();
    return user ? user.email.split('@')[0] : 'Guest';
}