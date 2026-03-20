const Movie = require('../models/Movie');
const AppError = require('../utils/AppError');

// Get all movies with optional filters
// GET /api/movies?genre=ACTION&language=English&search=term&rating=PG-13&limit=10&offset=0
const getAllMovies = async (req, res, next) => {
  try {
    const { genre, language, search, rating, limit, offset } = req.query;

    const filters = {};
    if (genre) filters.genre = genre;
    if (language) filters.language = language;
    if (search) filters.search = search;
    if (rating) filters.rating = rating;
    if (limit) filters.limit = limit;
    if (offset) filters.offset = offset;

    const movies = await Movie.findAll(filters);

    res.status(200).json({
      status: 'success',
      results: movies.length,
      data: {
        movies
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get single movie by ID
// GET /api/movies/:id
const getMovie = async (req, res, next) => {
  try {
    const { id } = req.params;

    const movie = await Movie.findById(id);

    if (!movie) {
      return next(new AppError('Movie not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        movie
      }
    });

  } catch (error) {
    next(error);
  }
};

// Create new movie (admin only)
// POST /api/movies
const createMovie = async (req, res, next) => {
  try {
    const {
      title,
      description,
      genre,
      language,
      duration_minutes,
      release_date,
      rating,
      poster_url
    } = req.body;

    const newMovie = await Movie.create({
      title,
      description,
      genre,
      language,
      duration_minutes,
      release_date,
      rating,
      poster_url
    });

    res.status(201).json({
      status: 'success',
      message: 'Movie created successfully',
      data: {
        movie: newMovie
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update movie (admin only)
// PUT /api/movies/:id
const updateMovie = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only pass defined fields to update method
    const updateData = {};
    const allowedFields = ['title', 'description', 'genre', 'language', 'duration_minutes', 'release_date', 'rating', 'poster_url'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedMovie = await Movie.update(id, updateData);

    res.status(200).json({
      status: 'success',
      message: 'Movie updated successfully',
      data: {
        movie: updatedMovie
      }
    });

  } catch (error) {
    next(error);
  }
};

// Soft delete movie (admin only)
// DELETE /api/movies/:id
const deleteMovie = async (req, res, next) => {
  try {
    // TODO: Add admin authentication middleware
    const { id } = req.params;

    await Movie.softDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Movie deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

// Search movies by title, genre, or language
// GET /api/movies/search?q=Inception
const searchMovies = async (req, res, next) => {
  try {
    const { q: searchQuery } = req.query;

    if (!searchQuery || searchQuery.trim() === '') {
      return next(new AppError('Search query (q) is required', 400));
    }

    const movies = await Movie.search(searchQuery.trim());

    res.status(200).json({
      status: 'success',
      results: movies.length,
      data: {
        movies
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get movie with its upcoming shows
// GET /api/movies/:id/shows
const getMovieWithShows = async (req, res, next) => {
  try {
    const { id } = req.params;

    const movieWithShows = await Movie.findWithShows(id);

    if (!movieWithShows) {
      return next(new AppError('Movie not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        movie: movieWithShows
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get all available genres
// GET /api/movies/genres
const getGenres = async (req, res, next) => {
  try {
    const genres = await Movie.getGenres();

    res.status(200).json({
      status: 'success',
      results: genres.length,
      data: {
        genres
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get all available languages
// GET /api/movies/languages
const getLanguages = async (req, res, next) => {
  try {
    const languages = await Movie.getLanguages();

    res.status(200).json({
      status: 'success',
      results: languages.length,
      data: {
        languages
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  searchMovies,
  getMovieWithShows,
  getGenres,
  getLanguages
};
