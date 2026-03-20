const Theatre = require('../models/Theatre');
const AppError = require('../utils/AppError');

// Get all theatres
// GET /api/theatres
const getAllTheatres = async (req, res, next) => {
  try {
    const theatres = await Theatre.findAll();

    res.status(200).json({
      status: 'success',
      results: theatres.length,
      data: {
        theatres
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get single theatre by ID with its screens
// GET /api/theatres/:id
const getTheatre = async (req, res, next) => {
  try {
    const { id } = req.params;

    const theatre = await Theatre.findById(id);

    if (!theatre) {
      return next(new AppError('Theatre not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        theatre
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get theatres by location
// GET /api/theatres/location/:location
const getTheatresByLocation = async (req, res, next) => {
  try {
    const { location } = req.params;

    const theatres = await Theatre.findByLocation(location);

    res.status(200).json({
      status: 'success',
      results: theatres.length,
      data: {
        theatres
      }
    });

  } catch (error) {
    next(error);
  }
};

// Create new theatre (admin only)
// POST /api/theatres
const createTheatre = async (req, res, next) => {
  try {
    // TODO: Add admin authentication middleware
    const { name, location, city, state, pincode } = req.body;

    const newTheatre = await Theatre.create({
      name,
      location,
      city,
      state,
      pincode
    });

    res.status(201).json({
      status: 'success',
      message: 'Theatre created successfully',
      data: {
        theatre: newTheatre
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update theatre (admin only)
// PUT /api/theatres/:id
const updateTheatre = async (req, res, next) => {
  try {
    // TODO: Add admin authentication middleware
    const { id } = req.params;
    const { name, location, city, state, pincode } = req.body;

    const updatedTheatre = await Theatre.update(id, {
      name,
      location,
      city,
      state,
      pincode
    });

    res.status(200).json({
      status: 'success',
      message: 'Theatre updated successfully',
      data: {
        theatre: updatedTheatre
      }
    });

  } catch (error) {
    next(error);
  }
};

// Delete theatre (admin only)
// DELETE /api/theatres/:id
const deleteTheatre = async (req, res, next) => {
  try {
    // TODO: Add admin authentication middleware
    const { id } = req.params;

    await Theatre.delete(id);

    res.status(200).json({
      status: 'success',
      message: 'Theatre deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTheatres,
  getTheatre,
  getTheatresByLocation,
  createTheatre,
  updateTheatre,
  deleteTheatre
};
