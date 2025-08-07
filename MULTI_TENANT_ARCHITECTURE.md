# Multi-Tenant Architecture Documentation

## Overview

This Point of Sale (POS) system has been architected as a multi-tenant application where each client (tenant) operates with complete data isolation through separate databases, while maintaining centralized authentication and tenant management.

## Architecture Components

### 1. Global Database (`pos_global`)
**Purpose**: Centralized storage for authentication credentials and tenant metadata

**Collections**:
- `globalusers` - User credentials and tenant mapping
- `tenants` - Tenant configurations and metadata

### 2. Tenant Databases (`tenant_<tenantId>`)
**Purpose**: Isolated data storage for each tenant's business operations

**Collections** (per tenant):
- `users` - Tenant-specific user roles and permissions
- `products` - Product catalog
- `categories` - Product categories
- `customers` - Customer information
- `suppliers` - Supplier information
- `invoices` - Sales transactions
- `purchases` - Purchase orders
- `quotations` - Price quotations
- `expenses` - Expense records
- `settings` - Store configurations
- `roles` - User roles
- `counters` - Auto-increment counters

## Database Schemas

### Global Database Schemas

#### GlobalUser Schema
```javascript
{
  userName: String,           // Unique username
  email: String,             // Unique email
  password: String,          // Hashed password
  tenantId: String,          // Tenant identifier
  tenantDatabase: String,    // Database name for this tenant
  isActive: Boolean,         // Account status
  isSuperAdmin: Boolean,     // Super admin privileges
  lastLogin: Date,           // Last login timestamp
  loginAttempts: Number,     // Failed login attempts
  lockUntil: Date,          // Account lock expiration
  refreshToken: String,      // JWT refresh token
  metadata: {
    firstName: String,
    lastName: String,
    phone: String,
    profilePicture: String
  }
}
```

#### Tenant Schema
```javascript
{
  tenantId: String,          // Unique tenant identifier
  tenantName: String,        // Display name
  databaseName: String,      // Database name
  plan: String,              // Subscription plan
  features: {
    maxUsers: Number,
    maxProducts: Number,
    maxInvoices: Number,
    hasSMS: Boolean,
    hasReporting: Boolean,
    hasMultipleStores: Boolean
  },
  subscription: {
    status: String,          // active, suspended, cancelled, trial
    startDate: Date,
    endDate: Date,
    trialEndsAt: Date
  },
  billing: {
    contactEmail: String,
    contactPhone: String,
    address: String,
    city: String,
    country: String
  },
  settings: {
    language: String,
    timezone: String,
    currency: String,
    dateFormat: String
  },
  isActive: Boolean
}
```

## Authentication Flow

### 1. User Registration
1. User provides credentials and tenant information
2. System creates entry in global database
3. Tenant database is created (if new tenant)
4. User entry is created in tenant database with roles/permissions
5. JWT tokens are issued

### 2. User Login
1. Credentials validated against global database
2. User's tenant database is identified
3. JWT token contains user ID and tenant information
4. Subsequent requests use tenant-specific database

### 3. Request Flow
```
Client Request
    ↓
Global Auth Middleware (validates JWT, gets user info)
    ↓
Tenant Middleware (connects to tenant database)
    ↓
Route Handler (operates on tenant data)
```

## Connection Management

### Global Connection
- Single connection to global database
- Manages user authentication and tenant metadata
- Persistent connection with connection pooling

### Tenant Connections
- Dynamic connections based on authenticated user's tenant
- Connection caching for performance
- Automatic connection cleanup for inactive tenants

## API Endpoints

### Authentication Endpoints (`/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh-token` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### Admin Endpoints (`/admin`) - Super Admin Only
- `GET /admin/tenants` - List all tenants
- `GET /admin/tenants/:tenantId` - Get tenant details
- `PUT /admin/tenants/:tenantId` - Update tenant
- `POST /admin/tenants/:tenantId/suspend` - Suspend tenant
- `POST /admin/tenants/:tenantId/activate` - Activate tenant
- `GET /admin/users` - List all users
- `GET /admin/stats` - System statistics

### Tenant-Specific Endpoints
All existing endpoints remain the same but operate on tenant-specific data:
- `/product/*` - Product management
- `/category/*` - Category management
- `/customer/*` - Customer management
- `/invoice/*` - Invoice management
- etc.

## Security Features

### Authentication Security
- Password hashing with bcrypt
- JWT tokens with configurable expiration
- Refresh token mechanism
- Account lockout after failed attempts
- Rate limiting on login attempts

### Data Isolation
- Complete database separation between tenants
- No cross-tenant data access possible
- Tenant validation on every request
- Connection-level isolation

### Authorization
- Role-based permissions within each tenant
- Super admin access for system management
- Granular permissions for each module

## Environment Configuration

```bash
PORT=3000
MONGO_URI_BASE=mongodb+srv://username:password@cluster.mongodb.net
MONGO_URI_ENDPOINT=?retryWrites=true&w=majority&appName=Cluster0
GLOBAL_DB_NAME=pos_global
SECRET_KEY=your-jwt-secret-key
```

## Usage Examples

### 1. New Tenant Registration
```javascript
POST /auth/register
{
  "userName": "admin",
  "email": "admin@company.com",
  "password": "securePassword",
  "tenantName": "My Company",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "01234567890"
}
```

### 2. User Login
```javascript
POST /auth/login
{
  "userName": "admin",
  "password": "securePassword"
}
```

### 3. Making Tenant-Specific Requests
```javascript
// Headers required for tenant-specific operations
Authorization: Bearer <jwt-token>

// The JWT token contains tenant information, so no additional headers needed
// The middleware automatically routes to the correct tenant database
```

## Deployment Considerations

### Database Setup
1. Create global database (`pos_global`)
2. Tenant databases are created automatically during registration
3. Ensure proper MongoDB Atlas or cluster configuration

### Scaling
- Horizontal scaling through MongoDB sharding
- Load balancing for application servers
- Connection pooling for database efficiency

### Monitoring
- Track active connections per tenant
- Monitor database usage and performance
- Log authentication attempts and failures

### Backup Strategy
- Regular backups of global database (critical)
- Automated backups of tenant databases
- Point-in-time recovery capabilities

## Migration from Single-Tenant

If migrating from a single-tenant setup:

1. **Backup existing data**
2. **Set up global database** with tenant and user records
3. **Migrate existing users** to global database format
4. **Create tenant record** for existing data
5. **Update application** to use new middleware
6. **Test authentication flow** thoroughly

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check MongoDB connection strings
   - Verify network connectivity
   - Ensure database exists

2. **Authentication Failures**
   - Verify JWT secret key
   - Check token expiration
   - Validate user account status

3. **Tenant Data Access**
   - Confirm tenant database exists
   - Verify user-tenant mapping
   - Check tenant active status

### Debug Tools

- Check `/health` endpoint for server status
- Use `/auth/me` to verify authentication
- Monitor server logs for connection issues

## Database Creation Process

### Automatic Database Creation

The system automatically creates tenant databases during user registration:

1. **New Tenant Registration**:
   ```javascript
   POST /auth/register
   {
     "userName": "admin",
     "email": "admin@company.com", 
     "password": "SecurePass123!",
     "tenantName": "My Company"
   }
   ```

2. **Process**:
   - Creates tenant record in global database
   - Generates unique `tenantId` and `databaseName`
   - Creates MongoDB connection to new tenant database
   - Initializes tenant-specific collections
   - Creates first tenant user with admin privileges

3. **Database Naming Convention**:
   - Global Database: `pos_global`
   - Tenant Databases: `tenant_<tenantId>`
   - Example: `tenant_my_company`

### Manual Database Setup

For development/testing, use the setup script:

```bash
npm run setup
```

This creates:
- Global database with system collections
- Master tenant for super admin
- Demo tenant for testing

## Production Setup Guide

### 1. Environment Configuration

Create `.env` file with production settings:

```env
PORT=3000
# MongoDB Atlas (Production)
MONGO_URI_BASE=mongodb+srv://username:password@cluster.mongodb.net
MONGO_URI_ENDPOINT=?retryWrites=true&w=majority&appName=YourApp
GLOBAL_DB_NAME=pos_global

# Security
SECRET_KEY=your-super-secure-jwt-secret-key-min-32-chars

# SMS Service (Optional)
BULKSMS_API=your_api_key
BULKSMS_SENDER=your_sender_id
```

### 2. Database Setup

1. **Create MongoDB Atlas Cluster** (or set up local MongoDB)
2. **Configure Network Access** (whitelist server IPs)
3. **Create Database User** with read/write permissions
4. **Run Setup Script**:
   ```bash
   npm run setup
   ```

### 3. Initial Users

After setup, the following users are available:

**Super Admin**:
- Username: `admin`
- Password: `Admin123!@#`
- Email: `admin@pos-system.com`
- Tenant: `master`
- Permissions: Full system access

**Demo User** (for testing):
- Username: `demo`
- Password: `Demo123!@#`
- Email: `demo@company.com`
- Tenant: `demo`
- Permissions: Limited access

### 4. Testing

Run comprehensive tests:

```bash
# Test with mock server (no database required)
npm run test:mock

# Test with real database
TEST_URL=http://localhost:3000 npm test

# Start development server
npm run dev
```

## Code Changes Made (Production Fixes)

### 1. Connection Improvements
- **Fixed**: Removed deprecated MongoDB connection options
- **Fixed**: Added proper error handling and connection pooling
- **Added**: Connection state validation and cleanup

### 2. Authentication Security
- **Fixed**: Account locking mechanism
- **Added**: JWT refresh tokens
- **Added**: Password strength requirements in documentation

### 3. Schema Consistency
- **Fixed**: All schemas now export schema objects (not models)
- **Fixed**: Consistent model registration in tenant connections
- **Added**: Proper pre-save hooks and validation

### 4. Error Handling
- **Added**: Comprehensive error responses
- **Added**: Proper HTTP status codes
- **Added**: Request validation

### 5. Development Tools
- **Added**: Setup script for database initialization
- **Added**: Mock server for testing without database
- **Added**: API testing scripts
- **Added**: Environment configuration examples

## API Testing Examples

### Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "company_admin",
    "email": "admin@mycompany.com",
    "password": "SecurePass123!",
    "tenantName": "My Company",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "company_admin",
    "password": "SecurePass123!"
  }'
```

### Tenant-Specific Operations
```bash
# Get products (requires authentication)
curl -X GET http://localhost:3000/product \
  -H "Authorization: Bearer <your-jwt-token>"

# Create category
curl -X POST http://localhost:3000/category \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryName": "Electronics",
    "status": "Active"
  }'
```

## Performance Optimization

1. **Connection Pooling**: Configure appropriate pool sizes (10 per tenant)
2. **Caching**: Implement Redis for session and query caching
3. **Indexing**: Ensure proper indexes on tenant databases
4. **Query Optimization**: Use aggregation pipelines for complex queries
5. **Connection Cleanup**: Automatic cleanup of unused tenant connections

## Security Best Practices

1. **Password Policy**: Minimum 8 characters with special characters
2. **JWT Security**: 7-day access tokens, 30-day refresh tokens
3. **Account Lockout**: 5 failed attempts = 30-minute lock
4. **Input Validation**: All endpoints validate input data
5. **CORS Configuration**: Properly configured for production domains

## Monitoring & Logging

### Production Logging
```javascript
// Add to server.js for production
const morgan = require('morgan');
app.use(morgan('combined'));

// Log tenant connections
console.log(`Tenant ${tenantId} connected to ${databaseName}`);
```

### Health Monitoring
```bash
# Check server health
curl http://localhost:3000/health

# Check admin stats (super admin required)
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3000/admin/stats
```

## Troubleshooting Guide

### Common Issues

1. **"Authentication failed"**
   - Check MongoDB credentials in .env
   - Verify network access in MongoDB Atlas
   - Ensure user has proper permissions

2. **"Tenant not found"**
   - Verify tenant exists in global database
   - Check tenant is active
   - Validate JWT token contains correct tenant info

3. **"Connection refused"**
   - Check MongoDB server is running
   - Verify connection string format
   - Test network connectivity

### Debug Commands

```bash
# Check environment variables
node -e "console.log(process.env.MONGO_URI_BASE)"

# Test database connection
node -e "
const mongoose = require('mongoose');
mongoose.connect('your-connection-string')
  .then(() => console.log('Connected'))
  .catch(err => console.error('Error:', err));
"
```

## Future Enhancements

1. **Database Sharding**: For large-scale deployments
2. **Read Replicas**: For improved read performance  
3. **Tenant Migration**: Tools for moving tenants between databases
4. **Analytics Dashboard**: Cross-tenant analytics for super admins
5. **API Rate Limiting**: Per-tenant API quotas
6. **Automated Backup**: Tenant-specific backup scheduling
7. **Multi-Region Support**: Geographic distribution of tenant data

---

This multi-tenant architecture provides complete data isolation, scalable authentication, and efficient resource utilization while maintaining the existing application functionality. The system is production-ready with comprehensive error handling, security measures, and monitoring capabilities.