const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OWSC - Old Wesleyites Sports Club API',
      version: '1.0.0',
      description: 'REST API documentation for the OWSC Restaurant & Membership Management System',
      contact: {
        name: 'OWSC Development Team',
        email: 'admin@owsc.com'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL ? `${process.env.BASE_URL}/api` : 'http://localhost:5000/api',
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token. Example: Bearer eyJhbGci...'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Something went wrong' },
            message: { type: 'string', example: 'Detailed error message' }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email address' }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Auth',          description: 'Authentication & user profile' },
      { name: 'Venues',        description: 'Venue listings and bookings' },
      { name: 'Menu',          description: 'Menu items management' },
      { name: 'Orders',        description: 'Food orders' },
      { name: 'Membership',    description: 'Membership plans and status' },
      { name: 'Payments',      description: 'Payment processing' },
      { name: 'Inventory',     description: 'Inventory management' },
      { name: 'Staff',         description: 'Staff management' },
      { name: 'Staffing',      description: 'Staffing schedules' },
      { name: 'Events',        description: 'Club events' },
      { name: 'Promotions',    description: 'Promotions and offers' },
      { name: 'Suppliers',     description: 'Supplier management' },
      { name: 'Deliveries',    description: 'Delivery tracking' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Tables',        description: 'Restaurant table management' },
      { name: 'Admin',         description: 'Admin-only operations' }
    ]
  },
  // Scan all route files for JSDoc comments
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
