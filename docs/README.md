# UI-Design-Lexora

LEXORA is a modern and user-friendly E-Library Management System designed with a clean, structured, and responsive interface. The UI focuses on simplicity, accessibility, and efficient navigation for administrators managing books, students, and borrowing records.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MySQL Server (v8.0+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd c:/wamp64/www/OCR-Integration
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Configure environment variables**

   Copy the example env file and update with your settings:
   ```bash
   cd ../server
   copy .env.example .env
   ```

   Edit `.env` with your database credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=lexora
   PORT=3001
   CLIENT_ORIGIN=http://localhost:5173
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Start the client**
   ```bash
   cd ../client
   npm run dev
   ```

7. **Access the application**
   - Client: http://localhost:5173
   - Server API: http://localhost:3001

---

## 🔧 API Configuration (Forwarded Port / Remote Access)

If you're accessing the application through a **forwarded port** (e.g., SSH port forwarding, VPN, or remote desktop port forwarding), you need to configure the client to connect to the correct server address.

### Understanding the Problem

When using a forwarded port, the client cannot connect to `localhost:3001` because the port is forwarded to a different host/IP. For example:
- Your local port `5173` is forwarded to the remote server's `5173`
- Your local port `3001` is forwarded to the remote server's `3001`
- The client still tries to connect to `localhost:3001` which fails

### Solution

1. **Edit the client environment file:**
   
   Open `client/.env` and update the `VITE_API_URL` to point to the actual server address:

   ```
   # For local development (default)
   VITE_API_URL=http://localhost:3001

   # For forwarded port - use the actual server IP/hostname
   VITE_API_URL=http://192.168.1.100:3001
   # or
   VITE_API_URL=http://your-server-hostname:3001
   ```

2. **Restart the client** to apply the changes:
   ```bash
   cd client
   npm run dev
   ```

### Finding the Correct Server Address

- **For LAN access**: Use the server's local IP address (e.g., `192.168.x.x`)
- **For SSH port forwarding**: Use `localhost` or `127.0.0.1` if the port is forwarded locally
- **For VPN/Remote**: Use the VPN-assigned IP or hostname

### Server CORS Configuration

If accessing from a different origin, also update the server's `CLIENT_ORIGIN` in `server/.env`:

```
# Allow specific origin
CLIENT_ORIGIN=http://localhost:5173

# Or allow any origin (not recommended for production)
CLIENT_ORIGIN=*
```

---

## 📁 Project Structure

```
OCR-Integration/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── styles/        # CSS styles
│   │   └── utils/         # Utility functions
│   ├── .env               # Client environment variables
│   └── vite.config.js     # Vite configuration
│
├── server/                 # Express backend
│   ├── config/           # Database configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── .env              # Server environment variables
│   └── index.js          # Server entry point
│
└── docs/                  # Documentation
```

---

## 🔨 Troubleshooting

### "Could not connect to server" Error

1. **Check if server is running:**
   ```bash
   # Server should be running on port 3001
   curl http://localhost:3001/api/health
   ```

2. **Verify API URL in client:**
   - Check `client/.env` has correct `VITE_API_URL`
   - Restart the client after changing `.env`

3. **Check CORS settings:**
   - Ensure `CLIENT_ORIGIN` in `server/.env` matches your client URL

4. **For forwarded ports:**
   - Use the actual server IP, not `localhost`
   - Example: `VITE_API_URL=http://192.168.1.100:3001`

### Database Connection Issues

1. Verify MySQL is running
2. Check database credentials in `server/.env`
3. Ensure the `lexora` database exists:
   ```sql
   CREATE DATABASE lexora;
   ```

---

## 📄 License

This project is for educational purposes.

