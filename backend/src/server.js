const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const app = require("./app");
const { initializeSocket } = require("./services/socketService");

const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔌 Socket.io initialized for real-time notifications`);
});
