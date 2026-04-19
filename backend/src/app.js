const express = require("express")
const cors = require("cors")
const path = require("path")
const cookieParser = require("cookie-parser")
const swaggerUi = require("swagger-ui-express")
const swaggerSpec = require("./config/swagger")
const buildMorganMiddleware = require("./config/morgan")
const prisma = require("./lib/prisma")
const errorHandler = require("./middleware/errorHandler")

const app = express()

// ─── HTTP request logging (must be first) ────────────────────────────────────
app.use(buildMorganMiddleware())

// Allow the frontend origin to send cookies.
// FRONTEND_URL can be a comma-separated list for dev (e.g. http://localhost:5173,http://localhost:3000)
const rawOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (rawOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true   // required for HttpOnly cookies cross-origin
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.static('public')); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Swagger UI ───────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'OWSC API Docs',
  customCss: `
    .swagger-ui .topbar { background-color: #1a2b3c; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { color: #1a2b3c; }
  `,
  swaggerOptions: {
    persistAuthorization: true,   // keeps JWT token between page refreshes
    displayRequestDuration: true, // shows how long each request took
    filter: true                  // enables tag/endpoint search bar
  }
}));

// Expose raw JSON spec at /api/docs.json
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
// ─────────────────────────────────────────────────────────────────────────────

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
app.use("/api/tables", require("./routes/tables"))

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// Global error handler (must be last)
app.use(errorHandler)

module.exports = app
