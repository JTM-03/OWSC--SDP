/**
 * Environment Configuration
 * Centralized configuration for environment-specific URLs and settings
 */

const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || 5000;

  // Determine the base URLs based on environment
  let baseUrl;
  let frontendUrl;
  let apiUrl;

  switch (env) {
    case 'production':
      baseUrl = process.env.BASE_URL || 'https://api.yourdomain.com';
      frontendUrl = process.env.FRONTEND_URL || 'https://yourdomain.com';
      apiUrl = `${baseUrl}/api`;
      break;

    case 'staging':
      baseUrl = process.env.BASE_URL || 'https://staging-api.yourdomain.com';
      frontendUrl = process.env.FRONTEND_URL || 'https://staging.yourdomain.com';
      apiUrl = `${baseUrl}/api`;
      break;

    case 'development':
    default:
      baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
      frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      apiUrl = `${baseUrl}/api`;
      break;
  }

  return {
    env,
    port,
    baseUrl,
    frontendUrl,
    apiUrl,
    // Email service URLs
    emailLoginUrl: `${frontendUrl}/login`,
    emailResetPasswordUrl: `${frontendUrl}/reset-password`,
    emailVerifyUrl: `${frontendUrl}/verify-email`,
    // API endpoints
    apiBaseUrl: apiUrl,
    // CORS settings
    corsOrigin: frontendUrl,
  };
};

const config = getEnvironmentConfig();

module.exports = config;
