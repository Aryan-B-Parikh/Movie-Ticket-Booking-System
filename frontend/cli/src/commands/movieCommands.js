const chalk = require('chalk');
const APIClient = require('../api');
const Utils = require('../utils');

/**
 * Movie command handlers
 */
class MovieCommands {
  static async list(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      Utils.header('Movies', 'Fetching available movies...');

      const filters = {
        genre: options.genre,
        language: options.language,
        rating: options.rating,
        limit: parseInt(options.limit),
        offset: parseInt(options.offset)
      };

      const spinner = Utils.spinner('Loading movies...');
      spinner.start();

      try {
        const movies = await api.getMovies(filters);
        spinner.stop();

        if (!movies || movies.length === 0) {
          Utils.warning('No movies found matching your criteria.');
          return;
        }

        Utils.displayMovies(movies, { showCount: true });

        // Show applied filters
        const appliedFilters = [];
        if (options.genre) appliedFilters.push(`Genre: ${options.genre}`);
        if (options.language) appliedFilters.push(`Language: ${options.language}`);
        if (options.rating) appliedFilters.push(`Rating: ${options.rating}`);

        if (appliedFilters.length > 0) {
          console.log(chalk.gray('\nApplied filters: ' + appliedFilters.join(', ')));
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch movies: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list movies: ${error.message}`);
      process.exit(1);
    }
  }

  static async search(query, options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      Utils.header('Movie Search', `Searching for "${query}"...`);

      const spinner = Utils.spinner('Searching movies...');
      spinner.start();

      try {
        const movies = await api.searchMovies(query, parseInt(options.limit));
        spinner.stop();

        if (!movies || movies.length === 0) {
          Utils.warning(`No movies found matching "${query}".`);
          return;
        }

        Utils.displayMovies(movies, { showCount: true });

      } catch (error) {
        spinner.stop();
        Utils.error(`Search failed: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Movie search failed: ${error.message}`);
      process.exit(1);
    }
  }

  static async show(id, options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      const spinner = Utils.spinner('Loading movie details...');
      spinner.start();

      try {
        const movie = await api.getMovie(id, options.includeShows);
        spinner.stop();

        Utils.displayMovieDetails(movie);

        // Display shows if requested
        if (options.includeShows && movie.shows && movie.shows.length > 0) {
          console.log(chalk.bold.blue('\n🎭 Upcoming Shows'));
          console.log('');
          Utils.displayShows(movie.shows, { showCount: true });
        } else if (options.includeShows) {
          console.log(chalk.gray('\nNo upcoming shows available for this movie.'));
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch movie details: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to show movie details: ${error.message}`);
      process.exit(1);
    }
  }

  static async genres(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      Utils.header('Available Genres');

      const spinner = Utils.spinner('Loading genres...');
      spinner.start();

      try {
        const genres = await api.getGenres();
        spinner.stop();

        if (!genres || genres.length === 0) {
          Utils.warning('No genres found.');
          return;
        }

        console.log(chalk.blue('Available genres:'));
        genres.forEach(genre => {
          console.log(`  • ${genre}`);
        });
        console.log(chalk.gray(`\nTotal: ${genres.length} genres`));

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch genres: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list genres: ${error.message}`);
      process.exit(1);
    }
  }

  static async languages(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      Utils.header('Available Languages');

      const spinner = Utils.spinner('Loading languages...');
      spinner.start();

      try {
        const languages = await api.getLanguages();
        spinner.stop();

        if (!languages || languages.length === 0) {
          Utils.warning('No languages found.');
          return;
        }

        console.log(chalk.blue('Available languages:'));
        languages.forEach(language => {
          console.log(`  • ${language}`);
        });
        console.log(chalk.gray(`\nTotal: ${languages.length} languages`));

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch languages: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list languages: ${error.message}`);
      process.exit(1);
    }
  }
}

module.exports = MovieCommands;