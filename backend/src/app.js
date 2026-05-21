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

// ─── Request Logging ──────────────────────────────────────────────────────────
// Morgan must be first so every request is logged, including those that fail
app.use(buildMorganMiddleware())

// ─── CORS ─────────────────────────────────────────────────────────────────────
// FRONTEND_URL supports a comma-separated list so multiple dev origins work
const rawOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server calls)
        if (!origin) return callback(null, true)
        if (rawOrigins.includes(origin)) return callback(null, true)
        callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true  // required so the browser sends the HttpOnly JWT cookie
}))

// ─── Body Parsing & Static Files ──────────────────────────────────────────────
app.use(cookieParser())          // parse HttpOnly cookies for JWT auth
app.use(express.json())          // parse JSON request bodies
app.use(express.static('public')) // serve public/ (e.g. venue images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))) // serve uploaded files

// ─── API Documentation ────────────────────────────────────────────────────────
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
}))

// Expose the raw OpenAPI JSON spec for tooling (e.g. Postman import)
app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
})

// ─── Health Check ─────────────────────────────────────────────────────────────
// Used by Docker/load balancers to verify the service is up and DB is reachable
app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`
        res.json({ status: "Backend is running", database: "connected" })
    } catch (error) {
        res.status(500).json({ status: "Backend is running", database: "disconnected", error: error.message })
    }
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth"))
app.use("/api/venues",        require("./routes/venues"))
app.use("/api/menu",          require("./routes/menu"))
app.use("/api/orders",        require("./routes/orders"))
app.use("/api/membership",    require("./routes/memberships"))
app.use("/api/admin",         require("./routes/admin"))
app.use("/api/inventory",     require("./routes/inventory"))
app.use("/api/staff",         require("./routes/staff"))
app.use("/api/promotions",    require("./routes/promotions"))
app.use("/api/staffing",      require("./routes/staffing"))
app.use("/api/events",        require("./routes/events"))
app.use("/api/payments",      require("./routes/payments"))
app.use("/api/suppliers",     require("./routes/suppliers"))
app.use("/api/deliveries",    require("./routes/deliveries"))
app.use("/api/notifications", require("./routes/notifications"))
app.use("/api/tables",        require("./routes/tables"))

// ─── 404 Fallback ─────────────────────────────────────────────────────────────
// Catches any request that didn't match a registered route
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered last — Express identifies error handlers by their 4-argument signature
app.use(errorHandler)

module.exports = app
