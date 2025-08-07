# Multi-Tenant Point of Sale System

A production-ready, multi-tenant Point of Sale (POS) system built with Node.js, Express, and MongoDB. Each tenant operates with complete data isolation through separate databases while maintaining centralized authentication.

## 🏗️ Architecture Overview

- **Global Database**: Centralized user authentication and tenant management
- **Tenant Databases**: Isolated data storage for each client's business operations
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Dynamic Connections**: Automatic tenant database routing based on user context

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd point-of-sale-server-MERN-
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:
```env
PORT=3000
MONGO_URI_BASE=mongodb+srv://username:password@cluster.mongodb.net
MONGO_URI_ENDPOINT=?retryWrites=true&w=majority&appName=YourApp
GLOBAL_DB_NAME=pos_global
SECRET_KEY=your-super-secure-jwt-secret-key-min-32-chars
```

### 3. Initialize Database
```bash
npm run setup
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## 👥 Default Users

After running `npm run setup`:

**Super Admin**:
- Username: `admin`
- Password: `Admin123!@#`
- Email: `admin@pos-system.com`
- Access: Full system administration

**Demo User**:
- Username: `demo`
- Password: `Demo123!@#`
- Email: `demo@company.com`
- Access: Limited tenant operations

## 🔐 API Endpoints

### Authentication
- `POST /auth/register` - Create new tenant and user
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Refresh JWT token
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user

### Admin (Super Admin Only)
- `GET /admin/tenants` - List all tenants
- `GET /admin/users` - List all users
- `GET /admin/stats` - System statistics
- `PUT /admin/tenants/:id` - Update tenant
- `POST /admin/tenants/:id/suspend` - Suspend tenant

### Tenant Operations
All existing POS endpoints work within tenant context:
- `/product/*` - Product management
- `/category/*` - Category management
- `/customer/*` - Customer management
- `/invoice/*` - Sales and invoicing
- `/purchase/*` - Purchase management
- And more...

## 📝 Usage Examples

### Register New Tenant
```javascript
POST /auth/register
{
  "userName": "company_admin",
  "email": "admin@mycompany.com",
  "password": "SecurePass123!",
  "tenantName": "My Company",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login and Get Token
```javascript
POST /auth/login
{
  "userName": "company_admin",
  "password": "SecurePass123!"
}
```

### Access Tenant Data
```javascript
GET /product
Headers: {
  "Authorization": "Bearer <jwt-token>"
}
```

## 🧪 Testing

### Mock Server Testing (No Database Required)
```bash
npm run test:mock
```

### API Integration Tests
```bash
npm test
```

### Manual Testing
```bash
# Start mock server
npm run test:mock

# In another terminal
curl http://localhost:3001/health
```

## 📊 Database Structure

### Global Database (`pos_global`)
- `globalusers` - User credentials and tenant mapping
- `tenants` - Tenant configurations and metadata

### Tenant Databases (`tenant_<tenantId>`)
- `users` - Tenant-specific user roles and permissions
- `products`, `customers`, `invoices` - Business data
- `categories`, `suppliers`, `purchases` - Inventory management
- All existing POS collections

## 🛠️ Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run setup` - Initialize database with default data
- `npm test` - Run API integration tests
- `npm run test:mock` - Start mock server for testing

### Project Structure
```
├── db/                     # Database connections
│   ├── globalConnection.js # Global database connection
│   └── connectionManager.js # Tenant database connections
├── middlewares/            # Authentication and routing
│   ├── globalAuthMiddleware.js
│   └── tenantMiddleware.js
├── routes/                 # API endpoints
│   ├── auth.js            # Authentication routes
│   ├── admin.js           # Admin management
│   └── [existing routes]  # Tenant-specific routes
├── schemas/               # Database schemas
│   ├── globalUserSchema.js
│   ├── tenantSchema.js
│   └── [existing schemas]
├── scripts/               # Utility scripts
│   ├── setup.js          # Database initialization
│   ├── test-api.js       # API testing
│   └── test-server.js    # Mock server
└── model/                # Model registration
    └── tenantModels.js   # Dynamic tenant models
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: 7-day access, 30-day refresh tokens
- **Account Lockout**: 5 failed attempts = 30-minute lock
- **Data Isolation**: Complete database separation per tenant
- **Input Validation**: All endpoints validate input
- **CORS Protection**: Configurable CORS settings

## 📈 Performance Features

- **Connection Pooling**: Optimized database connections
- **Connection Caching**: Reuse tenant connections
- **Model Caching**: Cache tenant models
- **Automatic Cleanup**: Remove unused connections

## 🔧 Production Deployment

1. **MongoDB Setup**: Create Atlas cluster or MongoDB instance
2. **Environment Variables**: Configure production .env
3. **Database Initialization**: Run setup script
4. **Process Management**: Use PM2 or similar
5. **Monitoring**: Set up logging and health checks

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'pos-server',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Documentation

- [Multi-Tenant Architecture Guide](./MULTI_TENANT_ARCHITECTURE.md) - Complete technical documentation
- [Environment Configuration](./.env.example) - Environment variables template

## ❗ Troubleshooting

### Common Issues

1. **Connection Refused**: Check MongoDB connection string
2. **Authentication Failed**: Verify MongoDB credentials
3. **Tenant Not Found**: Ensure tenant exists and is active
4. **JWT Errors**: Check SECRET_KEY configuration

### Debug Commands
```bash
# Check connection
node -e "console.log(process.env.MONGO_URI_BASE)"

# Test database
npm run setup

# Check health
curl http://localhost:3000/health
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section in documentation
- Review the API testing scripts for examples

---

**Built with ❤️ for scalable multi-tenant applications**