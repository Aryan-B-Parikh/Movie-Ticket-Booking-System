// Integration tests for Movies endpoints
// Tests movie CRUD operations, search functionality, and admin vs user access

const request = require('supertest');
const app = require('../../../src/app');
const { TestDataFactory, DatabaseCleaner } = require('../../helpers/testData');
const { ApiHelper, ResponseValidator } = require('../../helpers/requestHelpers');

describe('Movies Integration Tests', () => {

  let apiHelper;
  let regularUser, adminUser;

  beforeAll(async () => {
    apiHelper = new ApiHelper(app);
  });

  beforeEach(async () => {
    await DatabaseCleaner.cleanAll();

    // Create test users
    regularUser = await TestDataFactory.createUser({
      email: 'user@example.com',
      role: 'USER'
    });

    adminUser = await TestDataFactory.createUser({
      email: 'admin@example.com',
      role: 'ADMIN'
    });

    // Login users to get tokens
    await apiHelper.loginUser({
      email: regularUser.email,
      password: regularUser.password
    });

    await apiHelper.loginUser({
      email: adminUser.email,
      password: adminUser.password
    });
  });

  afterAll(async () => {
    await DatabaseCleaner.cleanAll();
  });

  describe('GET /api/movies', () => {

    beforeEach(async () => {
      // Create sample movies
      await TestDataFactory.createMovies(5);
    });

    it('should return all movies without authentication', async () => {
      const response = await apiHelper.get('/api/movies');

      ResponseValidator.validateArrayResponse(response, (movie) => {
        expect(movie).toHaveProperty('movie_id');
        expect(movie).toHaveProperty('title');
        expect(movie).toHaveProperty('description');
        expect(movie).toHaveProperty('genre');
        expect(movie).toHaveProperty('language');
        expect(movie).toHaveProperty('duration_minutes');
        expect(movie).toHaveProperty('release_date');
        expect(movie).toHaveProperty('rating');
        expect(movie.duration_minutes).toBeValidPrice();
      });

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter movies by genre', async () => {
      const response = await apiHelper.get('/api/movies?genre=ACTION');

      ResponseValidator.validateArrayResponse(response);
      response.body.data.forEach(movie => {
        expect(movie.genre).toBe('ACTION');
      });
    });

    it('should filter movies by language', async () => {
      const response = await apiHelper.get('/api/movies?language=English');

      ResponseValidator.validateArrayResponse(response);
      response.body.data.forEach(movie => {
        expect(movie.language).toBe('English');
      });
    });

    it('should filter movies by rating', async () => {
      const response = await apiHelper.get('/api/movies?rating=PG-13');

      ResponseValidator.validateArrayResponse(response);
      response.body.data.forEach(movie => {
        expect(movie.rating).toBe('PG-13');
      });
    });

    it('should apply pagination with limit and offset', async () => {
      const response = await apiHelper.get('/api/movies?limit=2&offset=1');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should validate limit parameter', async () => {
      const response = await apiHelper.get('/api/movies?limit=150', null, 400);

      ResponseValidator.validateErrorResponse(response, 'Limit must be between 1 and 100');
    });

    it('should validate negative offset', async () => {
      const response = await apiHelper.get('/api/movies?offset=-1', null, 400);

      ResponseValidator.validateErrorResponse(response, 'Offset must be a non-negative integer');
    });

    it('should handle invalid genre filter', async () => {
      const response = await apiHelper.get('/api/movies?genre=INVALID_GENRE', null, 400);

      ResponseValidator.validateErrorResponse(response, 'Invalid genre');
    });

    it('should handle multiple filters', async () => {
      const response = await apiHelper.get('/api/movies?genre=ACTION&language=English&rating=PG-13');

      ResponseValidator.validateArrayResponse(response);
      response.body.data.forEach(movie => {
        expect(movie.genre).toBe('ACTION');
        expect(movie.language).toBe('English');
        expect(movie.rating).toBe('PG-13');
      });
    });

    it('should return empty array when no movies match filters', async () => {
      const response = await apiHelper.get('/api/movies?genre=DOCUMENTARY');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/movies/:id', () => {

    let testMovie;

    beforeEach(async () => {
      testMovie = await TestDataFactory.createMovie({
        title: 'Test Movie Detail',
        description: 'A detailed test movie',
        genre: 'ACTION',
        language: 'English',
        duration_minutes: 150,
        rating: 'PG-13'
      });
    });

    it('should return specific movie by ID', async () => {
      const response = await apiHelper.get(`/api/movies/${testMovie.movie_id}`);

      ResponseValidator.validateSuccessResponse(response, [
        'movie_id', 'title', 'description', 'genre', 'language',
        'duration_minutes', 'release_date', 'rating', 'poster_url'
      ]);

      const movie = response.body.data;
      expect(movie.movie_id).toBe(testMovie.movie_id);
      expect(movie.title).toBe(testMovie.title);
      expect(movie.genre).toBe(testMovie.genre);
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await apiHelper.get('/api/movies/999', null, 404);

      ResponseValidator.validateErrorResponse(response, 'Movie not found');
    });

    it('should validate movie ID parameter', async () => {
      const response = await apiHelper.get('/api/movies/invalid', null, 400);

      ResponseValidator.validateErrorResponse(response, 'Invalid movie ID');
    });

    it('should validate zero movie ID', async () => {
      const response = await apiHelper.get('/api/movies/0', null, 400);

      ResponseValidator.validateErrorResponse(response, 'Invalid movie ID');
    });
  });

  describe('GET /api/movies/search', () => {

    beforeEach(async () => {
      await TestDataFactory.createMovie({
        title: 'The Dark Knight',
        description: 'A Batman movie',
        genre: 'ACTION'
      });

      await TestDataFactory.createMovie({
        title: 'Knight Rider',
        description: 'A TV series',
        genre: 'ACTION'
      });

      await TestDataFactory.createMovie({
        title: 'Comedy Central',
        description: 'Stand up comedy',
        genre: 'COMEDY'
      });
    });

    it('should search movies by title', async () => {
      const response = await apiHelper.get('/api/movies/search?q=Knight');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data.length).toBe(2);
      response.body.data.forEach(movie => {
        expect(movie.title.toLowerCase()).toContain('knight');
      });
    });

    it('should search movies by description', async () => {
      const response = await apiHelper.get('/api/movies/search?q=Batman');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('The Dark Knight');
    });

    it('should be case insensitive', async () => {
      const response = await apiHelper.get('/api/movies/search?q=dark');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('The Dark Knight');
    });

    it('should require search query parameter', async () => {
      const response = await apiHelper.get('/api/movies/search', null, 400);

      ResponseValidator.validateErrorResponse(response, 'Search query (q) is required');
    });

    it('should validate search query length', async () => {
      const longQuery = 'a'.repeat(101);
      const response = await apiHelper.get(`/api/movies/search?q=${longQuery}`, null, 400);

      ResponseValidator.validateErrorResponse(response, 'Search query must be between 1 and 100 characters');
    });

    it('should handle empty search results', async () => {
      const response = await apiHelper.get('/api/movies/search?q=NonexistentMovie');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/movies/genres', () => {

    it('should return all available genres', async () => {
      const response = await apiHelper.get('/api/movies/genres');

      ResponseValidator.validateArrayResponse(response);
      const expectedGenres = [
        'ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'ROMANCE',
        'SCI_FI', 'THRILLER', 'DOCUMENTARY', 'ANIMATION', 'OTHER'
      ];

      expectedGenres.forEach(genre => {
        expect(response.body.data).toContain(genre);
      });
    });
  });

  describe('GET /api/movies/languages', () => {

    it('should return all available languages', async () => {
      const response = await apiHelper.get('/api/movies/languages');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data).toContain('English');
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/movies/:id/shows', () => {

    let testMovie, testTheatres;

    beforeEach(async () => {
      testMovie = await TestDataFactory.createMovie();
      testTheatres = await TestDataFactory.createTheatres(2);

      // Create shows for the movie
      await TestDataFactory.createShows([testMovie], testTheatres.flatMap(t => t.screens), 3);
    });

    it('should return movie with its shows', async () => {
      const response = await apiHelper.get(`/api/movies/${testMovie.movie_id}/shows`);

      ResponseValidator.validateSuccessResponse(response, ['movie', 'shows']);

      const { movie, shows } = response.body.data;
      expect(movie.movie_id).toBe(testMovie.movie_id);
      expect(Array.isArray(shows)).toBe(true);
      expect(shows.length).toBeGreaterThan(0);

      shows.forEach(show => {
        expect(show).toHaveProperty('show_id');
        expect(show).toHaveProperty('show_time');
        expect(show).toHaveProperty('price');
        expect(show).toHaveProperty('theatre_name');
        expect(show.movie_id).toBe(testMovie.movie_id);
      });
    });

    it('should filter shows by date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const response = await apiHelper.get(`/api/movies/${testMovie.movie_id}/shows?date=${dateStr}`);

      ResponseValidator.validateSuccessResponse(response);
      const { shows } = response.body.data;

      shows.forEach(show => {
        expect(show.show_time.slice(0, 10)).toBe(dateStr);
      });
    });

    it('should return empty shows array for movie without shows', async () => {
      const movieWithoutShows = await TestDataFactory.createMovie({
        title: 'Movie Without Shows'
      });

      const response = await apiHelper.get(`/api/movies/${movieWithoutShows.movie_id}/shows`);

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.shows).toEqual([]);
    });
  });

  describe('POST /api/movies - Admin Only', () => {

    const validMovieData = {
      title: 'New Test Movie',
      description: 'A brand new test movie',
      genre: 'ACTION',
      language: 'English',
      duration_minutes: 120,
      release_date: '2024-06-01',
      rating: 'PG-13',
      poster_url: 'https://example.com/poster.jpg'
    };

    it('should create new movie as admin', async () => {
      const response = await apiHelper.createMovie(validMovieData, adminUser.user_id, 201);

      ResponseValidator.validateSuccessResponse(response, [
        'movie_id', 'title', 'description', 'genre', 'language',
        'duration_minutes', 'release_date', 'rating'
      ]);

      const movie = response.body.data;
      expect(movie.title).toBe(validMovieData.title);
      expect(movie.genre).toBe(validMovieData.genre);
      expect(movie.duration_minutes).toBe(validMovieData.duration_minutes);
    });

    it('should reject movie creation as regular user', async () => {
      const response = await apiHelper.createMovie(validMovieData, regularUser.user_id, 403);

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should reject movie creation without authentication', async () => {
      const response = await request(app)
        .post('/api/movies')
        .send(validMovieData)
        .expect(401);

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should validate required fields', async () => {
      const requiredFields = ['title', 'description', 'genre', 'language', 'duration_minutes', 'release_date'];

      for (const field of requiredFields) {
        const incompleteData = { ...validMovieData };
        delete incompleteData[field];

        const response = await apiHelper.createMovie(incompleteData, adminUser.user_id, 400);

        ResponseValidator.validateErrorResponse(response);
        expect(response.body.error.message.toLowerCase()).toContain(field.toLowerCase().replace('_', ' '));
      }
    });

    it('should validate genre values', async () => {
      const invalidData = { ...validMovieData, genre: 'INVALID_GENRE' };

      const response = await apiHelper.createMovie(invalidData, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'Invalid genre');
    });

    it('should validate rating values', async () => {
      const invalidData = { ...validMovieData, rating: 'INVALID_RATING' };

      const response = await apiHelper.createMovie(invalidData, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'Invalid rating');
    });

    it('should validate duration range', async () => {
      const invalidData1 = { ...validMovieData, duration_minutes: 0 };
      const invalidData2 = { ...validMovieData, duration_minutes: 501 };

      const response1 = await apiHelper.createMovie(invalidData1, adminUser.user_id, 400);
      const response2 = await apiHelper.createMovie(invalidData2, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response1, 'Duration must be between 1 and 500');
      ResponseValidator.validateErrorResponse(response2, 'Duration must be between 1 and 500');
    });

    it('should validate date format', async () => {
      const invalidData = { ...validMovieData, release_date: 'invalid-date' };

      const response = await apiHelper.createMovie(invalidData, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'Valid release date is required');
    });

    it('should validate poster URL format', async () => {
      const invalidData = { ...validMovieData, poster_url: 'not-a-url' };

      const response = await apiHelper.createMovie(invalidData, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'Poster URL must be a valid URL');
    });

    it('should handle optional fields correctly', async () => {
      const minimalData = {
        title: 'Minimal Movie',
        description: 'A movie with minimal data',
        genre: 'DRAMA',
        language: 'English',
        duration_minutes: 90,
        release_date: '2024-01-01'
        // rating and poster_url are optional
      };

      const response = await apiHelper.createMovie(minimalData, adminUser.user_id, 201);

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.title).toBe(minimalData.title);
    });
  });

  describe('PUT /api/movies/:id - Admin Only', () => {

    let testMovie;

    beforeEach(async () => {
      testMovie = await TestDataFactory.createMovie({
        title: 'Original Movie',
        genre: 'ACTION'
      });
    });

    const updateData = {
      title: 'Updated Movie Title',
      description: 'Updated description',
      genre: 'COMEDY',
      language: 'Spanish',
      duration_minutes: 135,
      release_date: '2024-07-01',
      rating: 'R',
      poster_url: 'https://example.com/updated-poster.jpg'
    };

    it('should update movie as admin', async () => {
      const response = await apiHelper.put(`/api/movies/${testMovie.movie_id}`, updateData, adminUser.user_id);

      ResponseValidator.validateSuccessResponse(response);
      const movie = response.body.data;
      expect(movie.title).toBe(updateData.title);
      expect(movie.genre).toBe(updateData.genre);
      expect(movie.duration_minutes).toBe(updateData.duration_minutes);
    });

    it('should reject movie update as regular user', async () => {
      const response = await apiHelper.put(
        `/api/movies/${testMovie.movie_id}`,
        updateData,
        regularUser.user_id,
        403
      );

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/movies/${testMovie.movie_id}`)
        .send(updateData)
        .expect(401);

      ResponseValidator.validateErrorResponse(response);
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await apiHelper.put('/api/movies/999', updateData, adminUser.user_id, 404);

      ResponseValidator.validateErrorResponse(response, 'Movie not found');
    });

    it('should validate movie ID in URL', async () => {
      const response = await apiHelper.put('/api/movies/invalid', updateData, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'Invalid movie ID');
    });

    it('should allow partial updates', async () => {
      const partialUpdate = { title: 'Partially Updated Title' };

      const response = await apiHelper.put(
        `/api/movies/${testMovie.movie_id}`,
        partialUpdate,
        adminUser.user_id
      );

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.title).toBe(partialUpdate.title);
      expect(response.body.data.genre).toBe(testMovie.genre); // Unchanged
    });
  });

  describe('DELETE /api/movies/:id - Admin Only', () => {

    let testMovie;

    beforeEach(async () => {
      testMovie = await TestDataFactory.createMovie({
        title: 'Movie to Delete'
      });
    });

    it('should soft delete movie as admin', async () => {
      const response = await apiHelper.delete(`/api/movies/${testMovie.movie_id}`, adminUser.user_id);

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify movie is not returned in list
      const listResponse = await apiHelper.get('/api/movies');
      const movieExists = listResponse.body.data.some(m => m.movie_id === testMovie.movie_id);
      expect(movieExists).toBe(false);
    });

    it('should reject delete as regular user', async () => {
      const response = await apiHelper.delete(
        `/api/movies/${testMovie.movie_id}`,
        regularUser.user_id,
        403
      );

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await apiHelper.delete('/api/movies/999', adminUser.user_id, 404);

      ResponseValidator.validateErrorResponse(response, 'Movie not found');
    });

    it('should prevent deletion of movie with active shows', async () => {
      // Create shows for the movie
      const theatres = await TestDataFactory.createTheatres(1);
      await TestDataFactory.createShows([testMovie], theatres.flatMap(t => t.screens), 1);

      const response = await apiHelper.delete(`/api/movies/${testMovie.movie_id}`, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'Cannot delete movie with active shows');
    });
  });

  describe('Performance Tests', () => {

    beforeEach(async () => {
      // Create a larger dataset for performance testing
      await TestDataFactory.createMovies(20);
    });

    it('should handle movie list request within reasonable time', async () => {
      const startTime = Date.now();

      await apiHelper.get('/api/movies');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // 500ms limit
    });

    it('should handle search request within reasonable time', async () => {
      const startTime = Date.now();

      await apiHelper.get('/api/movies/search?q=Test');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // 500ms limit
    });

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now();

      await apiHelper.get('/api/movies?limit=10&offset=5');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(300); // Pagination should be fast
    });
  });

  describe('Edge Cases', () => {

    it('should handle empty database gracefully', async () => {
      await DatabaseCleaner.cleanAll();

      const response = await apiHelper.get('/api/movies');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data).toEqual([]);
    });

    it('should handle very long movie titles', async () => {
      const longTitle = 'A'.repeat(255); // Maximum allowed length

      const movieData = {
        title: longTitle,
        description: 'A movie with a very long title',
        genre: 'DRAMA',
        language: 'English',
        duration_minutes: 120,
        release_date: '2024-01-01'
      };

      const response = await apiHelper.createMovie(movieData, adminUser.user_id, 201);

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.title).toBe(longTitle);
    });

    it('should reject movie title exceeding maximum length', async () => {
      const tooLongTitle = 'A'.repeat(256); // One character too long

      const movieData = {
        title: tooLongTitle,
        description: 'A movie with a title that is too long',
        genre: 'DRAMA',
        language: 'English',
        duration_minutes: 120,
        release_date: '2024-01-01'
      };

      const response = await apiHelper.createMovie(movieData, adminUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'Title must be between 1 and 255 characters');
    });

    it('should handle special characters in search', async () => {
      await TestDataFactory.createMovie({
        title: 'Movie: The Special Edition!',
        description: 'A movie with special characters & symbols'
      });

      const response = await apiHelper.get('/api/movies/search?q=Special Edition');

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data.length).toBe(1);
    });
  });
});