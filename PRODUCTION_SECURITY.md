# 🔒 Production Security & Optimization Guide

## 🛡️ Security Features Implemented

### 1. **DDoS & Rate Limiting Protection**
- **General Rate Limit**: 100 requests per 15 minutes per IP
- **Auth Rate Limit**: 5 login attempts per 15 minutes
- **API Rate Limit**: 60 requests per minute for tenant operations
- **Automatic IP blocking after excessive attempts**

### 2. **Security Headers (Helmet.js)**
- **CSP (Content Security Policy)**: Prevents XSS attacks
- **X-Frame-Options**: DENY - Prevents clickjacking
- **X-Content-Type-Options**: nosniff - Prevents MIME sniffing
- **Strict-Transport-Security**: Forces HTTPS
- **X-XSS-Protection**: Additional XSS protection

### 3. **Input Validation & Sanitization**
- **MongoDB Injection Prevention**: express-mongo-sanitize
- **XSS Protection**: All inputs sanitized with xss library
- **SQL Injection Prevention**: Parameterized queries
- **Path Traversal Protection**: Blocked ../ patterns
- **File Upload Security**: MIME type & extension validation

### 4. **Authentication Security**
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: 7-day access, 30-day refresh
- **Account Lockout**: 30-minute lock after 5 failed attempts
- **Session Management**: Automatic timeout after 24 hours

### 5. **CORS Configuration**
```javascript
// Allowed Origins (configure in .env)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 6. **Request Security**
- **Body Size Limit**: 10MB maximum
- **HTTP Parameter Pollution Prevention**: hpp middleware
- **Suspicious Pattern Detection**: Blocks malicious patterns
- **Double Extension Prevention**: Blocks .php.jpg type attacks

## 📊 Monitoring & Logging

### Winston Logger Configuration
```
logs/
├── error-YYYY-MM-DD.log      # Error logs (30 days retention)
├── combined-YYYY-MM-DD.log   # All logs (30 days retention)
├── security-YYYY-MM-DD.log   # Security events (90 days retention)
└── validation-errors.log      # Input validation failures
```

### Health Check Endpoints
- `/health` - Basic health check
- `/health/detailed` - Detailed system metrics
- `/ready` - Readiness probe for load balancers
- `/live` - Liveness probe for containers
- `/metrics` - Application metrics

## 🚀 Production Deployment

### 1. **Migration to Production Server**
```bash
# Run the migration script
npm run migrate:production

# This will:
# - Backup current server.js
# - Deploy production server with all security features
# - Create logs directory
# - Update package.json scripts
```

### 2. **Environment Configuration**
```env
NODE_ENV=production
PORT=3000

# MongoDB
MONGO_URI_BASE=mongodb+srv://username:password@cluster.mongodb.net
MONGO_URI_ENDPOINT=?retryWrites=true&w=majority
GLOBAL_DB_NAME=pos_global

# Security
SECRET_KEY=<64-character-secure-key>
ALLOWED_ORIGINS=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

### 3. **PM2 Process Management**
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs

# Auto-start on system reboot
pm2 startup
pm2 save
```

### 4. **Nginx Configuration** (Recommended)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Force HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔐 Security Best Practices

### 1. **Database Security**
- ✅ Use connection strings with authentication
- ✅ Enable MongoDB access control
- ✅ Implement IP whitelisting
- ✅ Regular backups with encryption
- ✅ Use read-only replicas for analytics

### 2. **API Security**
- ✅ Always use HTTPS in production
- ✅ Implement API versioning
- ✅ Use API keys for third-party access
- ✅ Monitor and log all API access
- ✅ Implement request signing for sensitive operations

### 3. **Infrastructure Security**
- ✅ Use firewall (UFW/iptables)
- ✅ Disable root SSH access
- ✅ Use SSH keys instead of passwords
- ✅ Regular security updates
- ✅ Implement fail2ban for SSH protection

### 4. **Application Security**
- ✅ Keep dependencies updated
- ✅ Regular security audits with `npm audit`
- ✅ Use environment variables for secrets
- ✅ Implement CSRF protection for forms
- ✅ Regular penetration testing

## 🚨 Error Handling

### Uncaught Exception Handler
```javascript
process.on('uncaughtException', (error) => {
  // Logs error and gracefully shuts down
  // Prevents application crash
});
```

### Unhandled Rejection Handler
```javascript
process.on('unhandledRejection', (reason, promise) => {
  // Logs rejection and gracefully shuts down
  // Prevents memory leaks
});
```

### Graceful Shutdown
```javascript
process.on('SIGTERM', () => {
  // Closes database connections
  // Completes pending requests
  // Exits cleanly
});
```

## 📈 Performance Optimization

### 1. **Compression**
- Gzip compression enabled for all responses
- Reduces bandwidth by up to 70%

### 2. **Caching**
- Static files cached for 7 days
- Database connection pooling
- Model caching for tenant operations

### 3. **Cluster Mode**
- PM2 cluster mode utilizes all CPU cores
- Automatic load balancing
- Zero-downtime deployments

### 4. **Database Optimization**
- Connection pooling (10 connections per tenant)
- Indexed queries for common operations
- Aggregation pipelines for complex queries

## 🔍 Monitoring Commands

### Check Application Health
```bash
curl http://localhost:3000/health
```

### View Detailed Metrics
```bash
curl http://localhost:3000/health/detailed
```

### Monitor with PM2
```bash
pm2 monit
pm2 status
pm2 logs --lines 100
```

### Check Error Logs
```bash
tail -f logs/error-*.log
```

### Security Audit
```bash
npm audit
npm audit fix
```

## 🆘 Troubleshooting

### High Memory Usage
```bash
# Check memory usage
pm2 describe pos-server

# Restart with memory limit
pm2 restart pos-server --max-memory-restart 1G
```

### Connection Errors
```bash
# Check database connection
node -e "require('./db/globalConnection').getGlobalConnection()"

# Check network connectivity
netstat -an | grep 3000
```

### Performance Issues
```bash
# Enable debug mode
DEBUG=* npm start

# Profile application
node --inspect server.js
```

## 🔄 Rollback Procedure

If issues occur after migration:

```bash
# Rollback to previous version
npm run migrate:rollback

# Start backup server
npm run start:backup
```

## 📋 Production Checklist

Before going live:

- [ ] Set NODE_ENV=production
- [ ] Configure ALLOWED_ORIGINS
- [ ] Generate secure SECRET_KEY (64+ characters)
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring (PM2/NewRelic/Datadog)
- [ ] Configure backup strategy
- [ ] Test rate limiting
- [ ] Verify error logging
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team trained on procedures

## 🎯 Security Metrics

Monitor these metrics regularly:

1. **Failed login attempts per hour**
2. **Rate limit violations per day**
3. **Malicious pattern detections**
4. **Average response time**
5. **Error rate percentage**
6. **Database connection pool usage**
7. **Memory and CPU utilization**
8. **Active tenant connections**

## 🚀 Quick Start Commands

```bash
# Development
npm run dev

# Production
npm run start:production

# With PM2
pm2 start ecosystem.config.js --env production

# Migration
npm run migrate:production

# Rollback
npm run migrate:rollback

# Monitoring
pm2 monit

# Logs
pm2 logs --lines 100
```

---

**⚠️ IMPORTANT**: This production server includes enterprise-grade security features. Always test thoroughly in a staging environment before deploying to production. Keep all dependencies updated and monitor security advisories regularly.

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready ✅