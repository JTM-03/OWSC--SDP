// Load environment variables before anything else so all modules see them
const dotenv = require("dotenv")
dotenv.config()

const http = require("http")
const app = require("./app")
const { initializeSocket } = require("./services/socketService")

const PORT = process.env.PORT || 5000

// Wrap Express in a raw HTTP server so Socket.io can share the same port
const server = http.createServer(app)

// Attach Socket.io for real-time order and notification events
initializeSocket(server)

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`)
    console.log(`🔌 Socket.io initialized for real-time notifications`)
})
