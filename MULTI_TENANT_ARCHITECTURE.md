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

## Performance Optimization

1. **Connection Pooling**: Configure appropriate pool sizes
2. **Caching**: Implement Redis for session and query caching
3. **Indexing**: Ensure proper indexes on tenant databases
4. **Query Optimization**: Use aggregation pipelines for complex queries
5. **Connection Cleanup**: Regular cleanup of unused tenant connections

## Future Enhancements

1. **Database Sharding**: For large-scale deployments
2. **Read Replicas**: For improved read performance
3. **Tenant Migration**: Tools for moving tenants between databases
4. **Analytics Dashboard**: Cross-tenant analytics for super admins
5. **API Rate Limiting**: Per-tenant API quotas
6. **Automated Backup**: Tenant-specific backup scheduling

---

This multi-tenant architecture provides complete data isolation, scalable authentication, and efficient resource utilization while maintaining the existing application functionality.