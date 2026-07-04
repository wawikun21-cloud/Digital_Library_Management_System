# Deployment Guide

This guide covers deployment of the Digital Library Management System to production environments.

## Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- A domain name with HTTPS configured (recommended)

## Environment Setup

### 1. Server Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

```bash
cp server/.env.example server/.env
```

Required in production:
- `DB_HOST` - MySQL server hostname
- `DB_PORT` - MySQL port (default: 3006)
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name (default: lexora)
- `SESSION_SECRET` - **Required**: Random secret for session signing (generate with `openssl rand -hex 32`)
- `GMAIL_USER` - Gmail address for email notifications
- `GMAIL_APP_PASSWORD` - Gmail App Password (16 characters, no spaces)

Optional:
- `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` - For first-time setup only
- `RFID_ALLOWED_IPS` - Comma-separated whitelist for RFID kiosk IPs
- `CLIENT_ORIGIN` - Your production client URL (e.g., https://library.yourdomain.com)

### 2. Client Environment Variables

The frontend uses `client/.env.frontend` for production configuration:

```
VITE_API_URL=https://api.yourdomain.com
# Or if frontend and backend are on same domain:
VITE_API_URL=/api
```

### 3. Database Setup

The server will auto-create the database and tables on startup. Ensure MySQL is accessible:

```sql
-- Optional: Create database manually
CREATE DATABASE lexora;
CREATE USER 'lexora_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON lexora.* TO 'lexora_user'@'localhost';
FLUSH PRIVILEGES;
```

## Deployment Options

### Option A: Process Manager (PM2) - Recommended

Using PM2 for production process management:

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cp server/pm2.config.js.example server/pm2.config.js  # if exists
# Or create one:
```

**server/pm2.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'lexora-server',
    script: './index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

Start with PM2:
```bash
pm2 start pm2.config.js
pm2 save
pm2 startup
```

### Option B: Direct Node.js

```bash
NODE_ENV=production node server/index.js
```

## HTTPS/TLS Configuration

### Recommended: Reverse Proxy (Nginx)

Hostinger and most hosting providers handle HTTPS via reverse proxy. Configure Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Node.js HTTPS (Not Recommended)

For development/testing only, you can run with HTTPS in Node.js:

```bash
# Requires SSL certificates
NODE_ENV=production SSL_CERT=/path/to/cert.pem SSL_KEY=/path/to/key.pem node server/index.js
```

## Post-Deployment Checklist

1. **Verify environment variables**
   - `SESSION_SECRET` is set and secure
   - Database credentials are correct
   - `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set for email features

2. **Test security headers**
   ```bash
   curl -I https://yourdomain.com/api/health
   # Should show helmet headers (X-Content-Type-Options, etc.)
   ```

3. **Create admin user**
   - If `DEFAULT_ADMIN_USERNAME` was not set, create an admin user manually via database or register endpoint

4. **Configure RFID kiosk IPs** (if applicable)
   - Set `RFID_ALLOWED_IPS` to restrict access to known kiosk machines

5. **Monitor logs**
   ```bash
   pm2 logs lexora-server
   ```

## Security Notes

- The `/api/rfid/tap` endpoint is public but rate-limited (20/min/IP)
- In production, set `RFID_ALLOWED_IPS` to restrict to known kiosk IPs
- All state-changing routes require CSRF token (obtained via `/api/auth/csrf-token` after login)
- Session cookies are HttpOnly, Secure, and SameSite=Lax
- Security headers via `helmet` middleware are enabled