const Screen = require('../models/Screen');
const Seat = require('../models/Seat');
const AppError = require('../utils/AppError');

// Get all screens for a specific theatre
// GET /api/theatres/:theatreId/screens
const getScreensByTheatre = async (req, res, next) => {
  try {
    const { theatreId } = req.params;

    const screens = await Screen.findByTheatre(theatreId);

    res.status(200).json({
      status: 'success',
      results: screens.length,
      data: {
        screens
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get screen details with seats
// GET /api/screens/:id
const getScreen = async (req, res, next) => {
  try {
    const { id } = req.params;

    const screen = await Screen.findById(id);

    if (!screen) {
      return next(new AppError('Screen not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        screen
      }
    });

  } catch (error) {
    next(error);
  }
};

// Create new screen for a theatre (admin only)
// POST /api/theatres/:theatreId/screens
const createScreen = async (req, res, next) => {
  try {
    // TODO: Add admin authentication middleware
    const { theatreId } = req.params;
    const { screen_number, total_seats, screen_type } = req.body;

    const newScreen = await Screen.create({
      theatre_id: theatreId,
      screen_number,
      total_seats,
      screen_type
    });

    res.status(201).json({
      status: 'success',
      message: 'Screen created successfully',
      data: {
        screen: newScreen
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update screen details (admin only)
// PUT /api/screens/:id
const updateScreen = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only pass defined fields to update method
    const updateData = {};
    const allowedFields = ['screen_number', 'total_seats', 'screen_type'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedScreen = await Screen.update(id, updateData);

    res.status(200).json({
      status: 'success',
      message: 'Screen updated successfully',
      data: {
        screen: updatedScreen
      }
    });

  } catch (error) {
    next(error);
  }
};

// Delete screen (admin only)
// DELETE /api/screens/:id
const deleteScreen = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Screen.delete(id);

    res.status(200).json({
      status: 'success',
      message: 'Screen deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

// Create seats for a screen in batch (admin only)
// POST /api/screens/:screenId/seats
const createSeatsForScreen = async (req, res, next) => {
  try {
    // TODO: Add admin authentication middleware
    const { screenId } = req.params;
    const { seats } = req.body; // Expected: { seats: [{ seat_number, seat_type }, ...] }

    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      return next(new AppError('Seats array is required and must not be empty', 400));
    }

    const result = await Seat.createBatch(screenId, seats);

    res.status(201).json({
      status: 'success',
      message: result.message,
      data: {
        seats_created: result.seats_created
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getScreensByTheatre,
  getScreen,
  createScreen,
  updateScreen,
  deleteScreen,
  createSeatsForScreen
};
