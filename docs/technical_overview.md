# Technical Documentation: Validation, Authentication & Stack

## 1. Authentication & Security
The system implements a secure, stateless authentication mechanism using industry-standard protocols.

### **Authentication Method**
*   **JWT (JSON Web Tokens)**: Used for managing user sessions. When a user logs in, the server issues a signed JWT containing the user's ID and Role. This token must be included in the `Authorization` header (`Bearer <token>`) of subsequent requests.
*   **BCrypt**: Used for securely hashing passwords before storing them in the database. Raw passwords are never stored.

### **Authorization & Access Control**
*   **Middleware (`auth.js`)**:
    *   `authenticate`: Verifies the JWT signature and checks if the user account is active.
    *   `requireRole(...)`: A higher-order function that restricts routes to specific user roles (e.g., `Admin`, `Staff`, `Member`).
    *   `optionalAuth`: Allows endpoints to behave differently for guests vs. logged-in users without blocking guests.

## 2. Data Validation
Data integrity and input sanitization are enforced using **Zod**, a TypeScript-first schema declaration and validation library.

### **Validation Strategy**
*   **Schema-Based Validation**: Request bodies (e.g., login credentials, registration forms, booking details) are validated against strict Zod schemas defined in `src/validation/schemas.js`.
*   **Runtime Checks**: Zod ensures that:
    *   Required fields are present.
    *   Data types are correct (e.g., numbers vs. strings).
    *   Formats are valid (e.g., email addresses, password complexity).
*   **Error Handling**: Invalid data triggers a structured 400 Bad Request error response, preventing malformed data from reaching the database.

## 3. Technology Stack

### **Backend**
*   **Runtime**: Node.js
*   **Framework**: Express.js (REST API)
*   **Database ORM**: Prisma (Type-safe database client)
*   **Database**: SQLite (Development) / PostgreSQL (Production ready)
*   **PDF Generation**: PDFKit (for dynamic receipt generation)
*   **File Handling**: Multer (for image uploads)

### **Frontend**
*   **Framework**: React 18 (via Vite)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4 (Utility-first CSS)
*   **Component Library**: Radix UI (Headless, accessible components) & custom Shadcn/UI-like components.
*   **State Management**: React Query (Server state), React Context (Auth state)
*   **Notifications**: Sonner (Toast notifications)
*   **Icons**: Lucide React
*   **Charts**: Recharts (Admin dashboard analytics)

## 4. Key Workflows
*   **Payment Processing**: Payments are recorded via `POST /api/payments` and trigger automated system notifications. Receipts can be generated on-demand as PDFs.
*   **Booking System**: Venue bookings utilize complex validation to prevent double-booking and ensure capacity limits are respected.
*   **Notification System**: Real-time alerts are persisted to the database, ensuring users never miss important updates (e.g., payment confirmations, booking status changes).
