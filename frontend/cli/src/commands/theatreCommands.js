const chalk = require('chalk');
const APIClient = require('../api');
const Utils = require('../utils');

/**
 * Theatre command handlers
 */
class TheatreCommands {
  static async list(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      const location = options.location;

      Utils.header('Theatres', location ? `Location: ${location}` : 'All locations');

      const spinner = Utils.spinner('Loading theatres...');
      spinner.start();

      try {
        const theatres = await api.getTheatres(location);
        spinner.stop();

        if (!theatres || theatres.length === 0) {
          Utils.warning(location ? `No theatres found in "${location}".` : 'No theatres found.');
          return;
        }

        Utils.displayTheatres(theatres, { showCount: true });

        if (location) {
          console.log(chalk.gray(`\nFiltered by location: ${location}`));
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch theatres: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list theatres: ${error.message}`);
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

      const spinner = Utils.spinner('Loading theatre details...');
      spinner.start();

      try {
        const theatre = await api.getTheatre(id);
        spinner.stop();

        Utils.displayTheatreDetails(theatre, options.includeScreens);

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch theatre details: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to show theatre details: ${error.message}`);
      process.exit(1);
    }
  }

  static async shows(theatreId, options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      // Validate date if provided
      if (options.date && !Utils.validateDate(options.date)) {
        Utils.error('Invalid date format. Please use YYYY-MM-DD format.');
        process.exit(1);
      }

      Utils.header('Theatre Shows', `Theatre ID: ${theatreId}${options.date ? ` - ${options.date}` : ''}`);

      const spinner = Utils.spinner('Loading shows...');
      spinner.start();

      try {
        // Get theatre details first
        const theatre = await api.getTheatre(theatreId);

        // Get shows for the theatre
        const shows = await api.getTheatreShows(theatreId, options.date);
        spinner.stop();

        console.log(chalk.blue('Theatre:'), theatre.name);
        console.log(chalk.blue('Location:'), `${theatre.location}, ${theatre.city}, ${theatre.state}`);
        console.log('');

        if (!shows || shows.length === 0) {
          Utils.warning(options.date ?
            `No shows found for ${options.date} at this theatre.` :
            'No upcoming shows found at this theatre.'
          );
          return;
        }

        Utils.displayShows(shows, { showCount: true });

        if (options.date) {
          console.log(chalk.gray(`\nShowing for date: ${options.date}`));
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch theatre shows: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list theatre shows: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Display detailed theatre information
   */
  static displayTheatreDetails(theatre, includeScreens = false) {
    console.log('');
    console.log(chalk.bold.blue('🏢 Theatre Details'));
    console.log('');

    const details = require('cli-table3')({
      chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
             , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
             , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
             , 'right': '' , 'right-mid': '' },
      style: { 'padding-left': 2, 'padding-right': 2 },
      colWidths: [15, 50]
    });

    details.push(
      [chalk.blue('Theatre ID'), theatre.theatre_id],
      [chalk.blue('Name'), theatre.name],
      [chalk.blue('Location'), theatre.location],
      [chalk.blue('City'), theatre.city],
      [chalk.blue('State'), theatre.state],
      [chalk.blue('Pincode'), theatre.pincode]
    );

    console.log(details.toString());

    // Display screens if requested and available
    if (includeScreens && theatre.Screens && theatre.Screens.length > 0) {
      console.log(chalk.bold.blue('\n🎭 Screens'));
      console.log('');

      const screenTable = require('cli-table3')({
        head: ['Screen ID', 'Name', 'Total Seats'].map(h => chalk.blue(h)),
        style: {
          head: [],
          border: ['grey']
        }
      });

      theatre.Screens.forEach(screen => {
        screenTable.push([
          screen.screen_id,
          screen.screen_name,
          screen.total_seats || screen.Seats?.length || 'N/A'
        ]);
      });

      console.log(screenTable.toString());
      console.log(chalk.gray(`\nTotal screens: ${theatre.Screens.length}`));

    } else if (includeScreens) {
      console.log(chalk.gray('\nNo screen information available.'));
    }
  }
}

// Add the display method to Utils if not already there
if (!Utils.displayTheatreDetails) {
  Utils.displayTheatreDetails = TheatreCommands.displayTheatreDetails;
}

module.exports = TheatreCommands;