const express = require("express")
const cors = require("cors")
const prisma = require("./lib/prisma")
const errorHandler = require("./middleware/errorHandler")

const app = express()

const path = require("path")

app.use(cors())
app.use(express.json())
app.use(express.static('public')); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`
        res.json({ status: "Backend is running", database: "connected" })
    } catch (error) {
        res.status(500).json({ status: "Backend is running", database: "disconnected", error: error.message })
    }
})

// API Routes
const authRoutes = require("./routes/auth")
const venueRoutes = require("./routes/venues")

app.use("/api/auth", authRoutes)
app.use("/api/venues", venueRoutes)
app.use("/api/menu", require("./routes/menu"))
app.use("/api/orders", require("./routes/orders"))
app.use("/api/membership", require("./routes/memberships"))
app.use("/api/admin", require("./routes/admin"))
app.use("/api/inventory", require("./routes/inventory"))
app.use("/api/staff", require("./routes/staff"))
app.use("/api/promotions", require("./routes/promotions"))
app.use("/api/staffing", require("./routes/staffing"))
app.use("/api/events", require("./routes/events"))
app.use("/api/payments", require("./routes/payments"))
app.use("/api/suppliers", require("./routes/suppliers"))
app.use("/api/deliveries", require("./routes/deliveries"))
app.use("/api/notifications", require("./routes/notifications"))


// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// Global error handler (must be last)
app.use(errorHandler)

module.exports = app
