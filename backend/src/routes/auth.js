const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { registerSchema, loginSchema } = require("../validation/schemas")
const { authenticate } = require("../middleware/auth")
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } = require("../utils/errors")
const upload = require("../config/upload")

const router = express.Router()

// Register new user
router.post("/register", upload.single('paymentSlip'), validate(registerSchema), async (req, res, next) => {
    try {
        console.log('📝 Register request received');
        console.log('   Body:', req.body);
        console.log('   Validated:', req.validatedData);

        const { fullName, email, username, password, phone, address, nic, emergencyContact, emergencyPhone, role } = req.validatedData
        const paymentSlipUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Check if email already exists
        const existingEmail = await prisma.member.findUnique({ where: { email } })
        if (existingEmail) {
            throw new ConflictError('Email already registered')
        }

        // Check if username already exists
        const existingUsername = await prisma.member.findUnique({ where: { username } })
        if (existingUsername) {
            throw new ConflictError('Username already taken')
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10)

        // Helper to get plan details (normally would be in DB)
        const PLANS = {
            'full': 15000,
            'associate': 10000,
            'sport': 5000,
            'social': 10000,
            'lifetime': 25000
        }

        // Create user and membership in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.member.create({
                data: {
                    fullName,
                    email,
                    username,
                    passwordHash,
                    phone,
                    address: address || 'N/A',
                    nic: nic || `SYSTEM-${Date.now()}`,
                    emergencyContact,
                    emergencyPhone,
                    paymentSlipUrl,
                    role: role || 'member',
                    status: 'Active'
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    username: true,
                    role: true,
                    loyaltyPoints: true,
                    registrationDate: true,
                    emergencyContact: true,
                    emergencyPhone: true
                }
            })

            if (user.role === 'member' && req.validatedData.membershipType) {
                const membershipType = req.validatedData.membershipType;
                const price = PLANS[membershipType] || 0
                const endDate = new Date()
                if (membershipType === 'lifetime') {
                    endDate.setFullYear(endDate.getFullYear() + 100)
                } else {
                    endDate.setFullYear(endDate.getFullYear() + 1)
                }

                const userMembership = await tx.user.create({
                    data: {
                        memberId: user.id,
                        startDate: new Date(),
                        endDate,
                        status: 'Pending',
                        membershipFee: price,
                        membershipType: membershipType
                    }
                })

                if (paymentSlipUrl && price > 0) {
                    await tx.membershipPayment.create({
                        data: {
                            membershipId: userMembership.id,
                            memberId: user.id,
                            amount: price,
                            paymentMethod: 'Bank Transfer',
                            paymentStatus: 'Pending Verification',
                            paymentDate: new Date()
                        }
                    })
                }
            }

            return user
        })

        // Generate JWT token
        const token = jwt.sign(
            { id: result.id, email: result.email, role: result.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )

        res.status(201).json({
            message: 'Registration successful! You can now log in.',
            user: result,
            token
        })
    } catch (error) {
        // Log to file for reliability
        const fs = require('fs');
        const logMessage = `\n[${new Date().toISOString()}] REGISTRATION ERROR:\n${error.stack || error}\n`;
        fs.appendFileSync('debug_error.log', logMessage);

        console.error('❌ Registration request failed:', error);
        next(error)
    }
})

// Login user
router.post("/login", validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.validatedData

        // Find user by email or username
        const user = await prisma.member.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: email }
                ]
            }
        })

        if (!user) {
            throw new UnauthorizedError('Invalid email or password')
        }

        // Check if account is active
        if (user.status !== 'Active') {
            throw new UnauthorizedError('Account is not active')
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash)

        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid email or password')
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                username: user.username,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints
            },
            token
        })
    } catch (error) {
        next(error)
    }
})

// Get current user profile
router.get("/me", authenticate, async (req, res, next) => {
    try {
        const user = await prisma.member.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                fullName: true,
                email: true,
                username: true,
                phone: true,
                address: true,
                nic: true,
                role: true,
                loyaltyPoints: true,
                status: true,
                registrationDate: true,
                notificationPreference: true,
                emergencyContact: true,
                emergencyPhone: true,
                profileImageUrl: true
            }
        })

        if (!user) {
            throw new NotFoundError('User not found')
        }

        res.json({ user })
    } catch (error) {
        next(error)
    }
})

// Update current user profile
router.put("/me", authenticate, async (req, res, next) => {
    try {
        const { fullName, phone, address, nic, emergencyContact, emergencyPhone, notificationPreference, username, password } = req.body

        // Check if username is being changed and if it's already taken
        if (username) {
            const existingUser = await prisma.member.findFirst({
                where: {
                    username,
                    id: { not: req.user.id }
                }
            })
            if (existingUser) {
                throw new ConflictError('Username already taken')
            }
        }

        // Hash new password if provided
        let passwordHash = undefined
        if (password) {
            passwordHash = await bcrypt.hash(password, 10)
        }

        const updatedUser = await prisma.member.update({
            where: { id: req.user.id },
            data: {
                ...(fullName && { fullName }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(nic && { nic }),
                ...(emergencyContact && { emergencyContact }),
                ...(emergencyPhone && { emergencyPhone }),
                ...(notificationPreference && { notificationPreference }),
                ...(username && { username }),
                ...(passwordHash && { passwordHash }),
                ...(req.body.profileImageUrl && { profileImageUrl: req.body.profileImageUrl })
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                username: true,
                phone: true,
                address: true,
                nic: true,
                emergencyContact: true,
                emergencyPhone: true,
                role: true
            }
        })

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        })
    } catch (error) {
        next(error)
    }
})

// Upload profile picture
router.post("/me/picture", authenticate, upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) throw new BadRequestError('No image uploaded');
        const profileImageUrl = `/uploads/${req.file.filename}`;
        
        await prisma.member.update({
            where: { id: req.user.id },
            data: { profileImageUrl }
        });

        res.json({ profileImageUrl });
    } catch (error) {
        next(error);
    }
})

// Refresh token
router.post("/refresh", authenticate, async (req, res, next) => {
    try {
        // Generate new token
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )

        res.json({
            message: 'Token refreshed successfully',
            token
        })
    } catch (error) {
        next(error)
    }
})

// ────────────────────────────────────────────────────────────
// FORGOT PASSWORD → OTP FLOW (Secure)
// ────────────────────────────────────────────────────────────

// Helper: delete expired OTP records from DB
async function cleanupExpiredOtps(email) {
    try {
        await prisma.passwordResetOtp.deleteMany({
            where: { email, expiresAt: { lte: new Date() } }
        })
    } catch (e) { /* silent */ }
}

// POST /api/auth/forgot-password
// Body: { username, nic }
// Looks up user by username+NIC, sends OTP to registered email (never exposed to caller).
// Stores a HASHED version of the OTP. Expires in 12 min. Deleted after use or expiry.
router.post("/forgot-password", async (req, res, next) => {
    try {
        const { username, nic } = req.body
        if (!username || !nic) {
            return res.status(400).json({ message: 'Username and NIC number are required' })
        }

        const genericMsg = 'If a matching account is found, an OTP will be sent to the registered email.'

        const member = await prisma.member.findFirst({
            where: { username: username.trim(), nic: nic.trim() }
        })

        if (!member || !member.email) {
            return res.json({ message: genericMsg })
        }

        // Clean up expired OTPs
        await cleanupExpiredOtps(member.email)

        // Remove any still-active OTPs (only one allowed at a time)
        await prisma.passwordResetOtp.deleteMany({
            where: { email: member.email, expiresAt: { gt: new Date() } }
        })

        // Generate plain OTP — hash it before storing
        const plainOtp = String(Math.floor(100000 + Math.random() * 900000))
        const otpHash = await bcrypt.hash(plainOtp, 10)
        const expiresAt = new Date(Date.now() + 12 * 60 * 1000) // 12 minutes

        await prisma.passwordResetOtp.create({
            data: { email: member.email, otp: otpHash, expiresAt }
        })

        // Send the PLAIN otp only via email — never returned in response
        const { sendPasswordResetOTP } = require('../services/emailService')
        sendPasswordResetOTP(member.email, plainOtp, member.fullName).catch(err =>
            console.error('OTP email send failed:', err)
        )

        res.json({ message: genericMsg })
    } catch (error) {
        next(error)
    }
})

// POST /api/auth/verify-otp
// Body: { username, nic, otp }
// Validates OTP by bcrypt compare against stored hash. Deletes record on success.
router.post("/verify-otp", async (req, res, next) => {
    try {
        const { username, nic, otp } = req.body
        if (!username || !nic || !otp) {
            return res.status(400).json({ message: 'Username, NIC, and OTP are required' })
        }

        const member = await prisma.member.findFirst({
            where: { username: username.trim(), nic: nic.trim() }
        })

        if (!member) {
            return res.status(400).json({ message: 'Invalid credentials. Please try again.' })
        }

        await cleanupExpiredOtps(member.email)

        const record = await prisma.passwordResetOtp.findFirst({
            where: { email: member.email, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' }
        })

        if (!record) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' })
        }

        // Compare submitted OTP against stored hash
        const isValid = await bcrypt.compare(otp.trim(), record.otp)
        if (!isValid) {
            return res.status(400).json({ message: 'Incorrect OTP. Please check your email and try again.' })
        }

        // DELETE the OTP — consumed, one-time use only
        await prisma.passwordResetOtp.delete({ where: { id: record.id } })

        // Issue a 5-min reset token carrying memberId (not email)
        const resetToken = jwt.sign(
            { memberId: member.id, purpose: 'password-reset' },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        )

        res.json({ message: 'OTP verified successfully', resetToken })
    } catch (error) {
        next(error)
    }
})

// POST /api/auth/reset-password
// Body: { resetToken, newPassword }
// Hashes new password and replaces old hash. Old password is gone from DB.
router.post("/reset-password", async (req, res, next) => {
    try {
        const { resetToken, newPassword } = req.body
        if (!resetToken || !newPassword) {
            return res.status(400).json({ message: 'Reset token and new password are required' })
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' })
        }

        let payload
        try {
            payload = jwt.verify(resetToken, process.env.JWT_SECRET)
        } catch {
            return res.status(400).json({ message: 'Your reset session has expired. Please start over.' })
        }

        if (payload.purpose !== 'password-reset') {
            return res.status(400).json({ message: 'Invalid reset token' })
        }

        const member = await prisma.member.findUnique({ where: { id: payload.memberId } })
        if (!member) {
            return res.status(404).json({ message: 'Account not found' })
        }

        // Hash new password — replaces old hash in DB
        const passwordHash = await bcrypt.hash(newPassword, 10)
        await prisma.member.update({
            where: { id: member.id },
            data: { passwordHash }
        })

        console.log(`Password reset for member ${member.id} (${member.username})`)
        res.json({ message: 'Password reset successfully. You can now log in with your new password.' })
    } catch (error) {
        next(error)
    }
})

module.exports = router
