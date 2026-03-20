const Show = require('../models/Show');
const AppError = require('../utils/AppError');

// Get all shows with optional filters
// GET /api/shows?movieId=1&theatreId=2&date=2026-03-20&startDate=2026-03-20&endDate=2026-03-27
const getAllShows = async (req, res, next) => {
  try {
    const { movieId, theatreId, date, startDate, endDate } = req.query;

    const filters = {};

    if (movieId) filters.movieId = parseInt(movieId);
    if (theatreId) filters.theatreId = parseInt(theatreId);
    if (date) filters.date = date;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const shows = await Show.findAll(filters);

    res.status(200).json({
      status: 'success',
      results: shows.length,
      data: {
        shows
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get single show by ID with full details
// GET /api/shows/:id
const getShow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const show = await Show.findById(id);

    if (!show) {
      return next(new AppError('Show not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        show
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get shows by movie ID
// GET /api/movies/:movieId/shows
const getShowsByMovie = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.findByMovie(movieId);

    res.status(200).json({
      status: 'success',
      results: shows.length,
      data: {
        shows
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get shows by theatre ID
// GET /api/theatres/:theatreId/shows
const getShowsByTheatre = async (req, res, next) => {
  try {
    const { theatreId } = req.params;

    const shows = await Show.findByTheatre(theatreId);

    res.status(200).json({
      status: 'success',
      results: shows.length,
      data: {
        shows
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get upcoming shows (next N days, default 7)
// GET /api/shows/upcoming?days=7
const getUpcomingShows = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // Validate days parameter
    if (days < 1 || days > 90) {
      return next(new AppError('Days must be between 1 and 90', 400));
    }

    const shows = await Show.findUpcoming(days);

    res.status(200).json({
      status: 'success',
      results: shows.length,
      data: {
        shows
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get available seats for a show
// GET /api/shows/:id/seats
// Calls stored procedure sp_get_available_seats
const getAvailableSeats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const seats = await Show.getAvailableSeats(id);

    res.status(200).json({
      status: 'success',
      results: seats.length,
      data: {
        seats
      }
    });

  } catch (error) {
    next(error);
  }
};

// Create new show (ADMIN only)
// POST /api/shows
// Body: { movie_id, screen_id, show_time, price }
const createShow = async (req, res, next) => {
  try {
    const { movie_id, screen_id, show_time, price } = req.body;

    // Validate show_time is in the future
    const showDate = new Date(show_time);
    const now = new Date();

    if (showDate <= now) {
      return next(new AppError('Show time must be in the future', 400));
    }

    const newShow = await Show.create({
      movie_id,
      screen_id,
      show_time,
      price
    });

    res.status(201).json({
      status: 'success',
      message: 'Show created successfully',
      data: {
        show: newShow
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update show (ADMIN only)
// PUT /api/shows/:id
// Body: { movie_id?, screen_id?, show_time?, price? }
const updateShow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { movie_id, screen_id, show_time, price } = req.body;

    // Validate at least one field is provided
    if (!movie_id && !screen_id && !show_time && !price) {
      return next(new AppError('At least one field must be provided for update', 400));
    }

    // Validate show_time is in the future if provided
    if (show_time) {
      const showDate = new Date(show_time);
      const now = new Date();

      if (showDate <= now) {
        return next(new AppError('Show time must be in the future', 400));
      }
    }

    const updateData = {};
    if (movie_id) updateData.movie_id = movie_id;
    if (screen_id) updateData.screen_id = screen_id;
    if (show_time) updateData.show_time = show_time;
    if (price) updateData.price = price;

    const updatedShow = await Show.update(id, updateData);

    res.status(200).json({
      status: 'success',
      message: 'Show updated successfully',
      data: {
        show: updatedShow
      }
    });

  } catch (error) {
    next(error);
  }
};

// Soft delete show (ADMIN only)
// DELETE /api/shows/:id
const deleteShow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await Show.softDelete(id);

    res.status(200).json({
      status: 'success',
      message: result.message
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllShows,
  getShow,
  getShowsByMovie,
  getShowsByTheatre,
  getUpcomingShows,
  getAvailableSeats,
  createShow,
  updateShow,
  deleteShow
};
