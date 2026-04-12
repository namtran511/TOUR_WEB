const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Travel Spot Finder API',
      version: '1.0.0',
      description: 'REST API for Travel Spot Finder project'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string', example: 'Request successful' },
            data: { nullable: true }
          }
        },
        RegisterInput: {
          type: 'object',
          required: ['full_name', 'email', 'password'],
          properties: {
            full_name: { type: 'string', example: 'Nguyen Van A' },
            email: { type: 'string', example: 'vana@example.com' },
            password: { type: 'string', example: '123456' },
            avatar_url: { type: 'string', example: 'https://example.com/avatar.jpg' }
          }
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@travelspot.com' },
            password: { type: 'string', example: 'admin123' }
          }
        },
        CategoryInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Beach' },
            description: { type: 'string', example: 'Beautiful beach destinations' },
            icon: { type: 'string', example: 'beach' }
          }
        },
        SpotInput: {
          type: 'object',
          required: ['name', 'address', 'city', 'latitude', 'longitude', 'category_id'],
          properties: {
            name: { type: 'string', example: 'Da Nang Beach' },
            description: { type: 'string', example: 'Beautiful coastal destination' },
            address: { type: 'string', example: 'Vo Nguyen Giap, Da Nang' },
            city: { type: 'string', example: 'Da Nang' },
            latitude: { type: 'number', example: 16.0471 },
            longitude: { type: 'number', example: 108.2068 },
            category_id: { type: 'integer', example: 1 },
            image_url: { type: 'string', example: 'https://example.com/beach.jpg' },
            opening_hours: { type: 'string', example: '06:00-22:00' },
            ticket_price: { type: 'number', example: 0 }
          }
        },
        ReviewInput: {
          type: 'object',
          required: ['rating'],
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', example: 'Spot rat dep' }
          }
        }
      }
    }
  },
  apis: [path.join(__dirname, '..', 'routes', '*.js')]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
