const express = require("express")
const { validate } = require("../middleware/validate")
const { authenticate, requireRole } = require("../middleware/auth")
const { registerSchema, loginSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema, profileUpdateSchema } = require("../validation/schemas")
const upload = require("../config/upload")
const ctrl = require("../controllers/authController")

const router = express.Router()

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new member
 *     tags: [Auth]
 * /auth/login:
 *   post:
 *     summary: Login with email/username and password
 *     tags: [Auth]
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *   put:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Auth]
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP and receive a reset token
 *     tags: [Auth]
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using the reset token
 *     tags: [Auth]
 */

router.post("/register", upload.fields([{ name: 'paymentSlip', maxCount: 1 }, { name: 'nicImage', maxCount: 1 }]), validate(registerSchema), ctrl.register)
router.post("/login",    validate(loginSchema), ctrl.login)
router.get("/me",        authenticate, ctrl.getMe)
router.put("/me",        authenticate, validate(profileUpdateSchema), ctrl.updateMe)
router.post("/me/picture", authenticate, upload.single('image'), ctrl.uploadPicture)
router.post("/refresh",  authenticate, ctrl.refresh)
router.post("/logout",   ctrl.logout)
router.post("/forgot-password", validate(forgotPasswordSchema), ctrl.forgotPassword)
router.post("/verify-otp",      validate(verifyOtpSchema), ctrl.verifyOtp)
router.post("/reset-password",  validate(resetPasswordSchema), ctrl.resetPassword)

module.exports = router
