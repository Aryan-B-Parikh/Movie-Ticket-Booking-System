const chalk = require('chalk');
const APIClient = require('../api');
const Utils = require('../utils');

/**
 * Authentication command handlers
 */
class AuthCommands {
  static async login(options, command) {
    try {
      const globalOpts = command.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      // Check if already logged in
      if (api.isAuthenticated()) {
        const user = api.getCurrentUser();
        Utils.warning(`Already logged in as ${user.username} (${user.email})`);
        const shouldLogout = await Utils.promptConfirm('Do you want to logout and login as a different user?');
        if (!shouldLogout) {
          return;
        }
        api.clearAuthToken();
      }

      let credentials;

      if (options.interactive && !options.email && !options.password) {
        // Interactive mode
        Utils.header('Login to Movie Booking System');
        credentials = await Utils.promptAuth('login');
      } else {
        // Command line mode
        credentials = {
          email: options.email,
          password: options.password
        };

        // Prompt for missing credentials
        if (!credentials.email) {
          credentials.email = await Utils.promptInput('Email:');
        }
        if (!credentials.password) {
          credentials.password = await Utils.promptInput('Password:', null);
        }
      }

      const spinner = Utils.spinner('Logging in...');
      spinner.start();

      try {
        const result = await api.login(credentials.email, credentials.password);
        spinner.stop();

        Utils.success(`Successfully logged in as ${result.user.username}`);
        console.log(chalk.gray(`Welcome back, ${result.user.username}!`));

      } catch (error) {
        spinner.stop();
        Utils.error(`Login failed: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Login failed: ${error.message}`);
      process.exit(1);
    }
  }

  static async register(options, command) {
    try {
      const globalOpts = command.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      // Check if already logged in
      if (api.isAuthenticated()) {
        const user = api.getCurrentUser();
        Utils.warning(`Already logged in as ${user.username} (${user.email})`);
        const shouldContinue = await Utils.promptConfirm('Do you want to register a new account anyway?');
        if (!shouldContinue) {
          return;
        }
      }

      let userData;

      if (options.interactive && !options.username && !options.email && !options.password) {
        // Interactive mode
        Utils.header('Register for Movie Booking System');
        userData = await Utils.promptAuth('register');
      } else {
        // Command line mode
        userData = {
          username: options.username,
          email: options.email,
          password: options.password
        };

        // Prompt for missing data
        if (!userData.username) {
          userData.username = await Utils.promptInput('Username:', input => {
            if (input.length < 3) return 'Username must be at least 3 characters long';
            if (!/^[a-zA-Z0-9_]+$/.test(input)) return 'Username can only contain letters, numbers, and underscores';
            return true;
          });
        }
        if (!userData.email) {
          userData.email = await Utils.promptInput('Email:', input =>
            input.includes('@') || 'Please enter a valid email address'
          );
        }
        if (!userData.password) {
          userData.password = await Utils.promptInput('Password:', input => {
            if (input.length < 8) return 'Password must be at least 8 characters long';
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(input)) {
              return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
            }
            return true;
          });
        }
      }

      const spinner = Utils.spinner('Creating account...');
      spinner.start();

      try {
        const result = await api.register(userData.username, userData.email, userData.password);
        spinner.stop();

        Utils.success(`Successfully registered as ${result.user.username}`);
        console.log(chalk.gray(`Welcome to Movie Booking System, ${result.user.username}!`));

      } catch (error) {
        spinner.stop();
        Utils.error(`Registration failed: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Registration failed: ${error.message}`);
      process.exit(1);
    }
  }

  static async logout(options, command) {
    try {
      const globalOpts = command.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        debug: globalOpts.debug
      });

      if (!api.isAuthenticated()) {
        Utils.warning('You are not logged in.');
        return;
      }

      const user = api.getCurrentUser();
      const confirmed = await Utils.promptConfirm(`Are you sure you want to logout ${user.username}?`, true);

      if (!confirmed) {
        Utils.info('Logout cancelled.');
        return;
      }

      await api.logout();
      Utils.success('Successfully logged out.');

    } catch (error) {
      Utils.error(`Logout failed: ${error.message}`);
      process.exit(1);
    }
  }

  static async status(options, command) {
    try {
      const globalOpts = command.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        debug: globalOpts.debug
      });

      Utils.header('Authentication Status');

      if (api.isAuthenticated()) {
        const user = api.getCurrentUser();

        console.log(chalk.green('✓'), 'Logged in');
        console.log(chalk.blue('Username:'), user.username);
        console.log(chalk.blue('Email:'), user.email);
        console.log(chalk.blue('Role:'), user.role || 'USER');

        if (api.authData?.createdAt) {
          console.log(chalk.blue('Login Time:'), Utils.formatDateTime(api.authData.createdAt));
        }

        // Test API connection
        const spinner = Utils.spinner('Testing API connection...');
        spinner.start();

        try {
          await api.healthCheck();
          spinner.stop();
          console.log(chalk.green('✓'), 'API connection successful');
        } catch (error) {
          spinner.stop();
          console.log(chalk.red('✗'), 'API connection failed:', error.message);
        }

      } else {
        console.log(chalk.red('✗'), 'Not logged in');
        console.log(chalk.gray('Use'), chalk.cyan('movie-booking auth login'), chalk.gray('to sign in'));
      }

    } catch (error) {
      Utils.error(`Status check failed: ${error.message}`);
      process.exit(1);
    }
  }
}

module.exports = AuthCommands;