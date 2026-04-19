const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { registerSchema, loginSchema } = require("../validation/schemas")
const { authenticate } = require("../middleware/auth")
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } = require("../utils/errors")
const { setTokenCookie, clearTokenCookie } = require("../utils/cookie")
const upload = require("../config/upload")

const router = express.Router()

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new member
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [fullName, email, username, password, phone]
 *             properties:
 *               fullName:       { type: string, example: John Perera }
 *               email:          { type: string, format: email, example: john@example.com }
 *               username:       { type: string, example: johnp }
 *               password:       { type: string, format: password, example: Secret@123 }
 *               phone:          { type: string, example: "0712345678" }
 *               address:        { type: string, example: "123 Main St, Colombo" }
 *               nic:            { type: string, example: "991234567V" }
 *               emergencyContact: { type: string, example: "Jane Perera" }
 *               emergencyPhone: { type: string, example: "0771234567" }
 *               membershipType: { type: string, enum: [full, associate, sport, social, lifetime] }
 *               paymentSlip:    { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or username already exists
 */

// Register new user
router.post("/register", upload.fields([
    { name: 'paymentSlip', maxCount: 1 },
    { name: 'nicImage',    maxCount: 1 }
]), validate(registerSchema), async (req, res, next) => {
    try {
        console.log('📝 Register request received');

        const {
            fullName,
            email,
            username,
            password,
            phone,
            address,
            nic,
            emergencyContact,
            emergencyPhone,
            role,
            membershipType,
            dateOfBirth
        } = req.validatedData

        const files = req.files || {};
        const paymentSlipUrl = files.paymentSlip?.[0] ? `/uploads/${files.paymentSlip[0].filename}` : null;
        const nicImageUrl    = files.nicImage?.[0]    ? `/uploads/${files.nicImage[0].filename}`    : null;

        // Age check — must be 21 or older
        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            if (age < 21) {
                throw new BadRequestError('You must be at least 21 years old to become a member of OWSC.');
            }
        }

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

        const PLANS = {
            'full':      15000,
            'associate': 10000,
            'sport':     5000,
            'social':    10000,
            'lifetime':  25000
        }

        // Create user and membership in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // FIX: new members start as Pending (not Active) until admin approves
            // Staff and admin accounts are immediately Active — they don't need approval
            // FIX: emergencyContact and emergencyPhone are valid schema fields — include them
            const user = await tx.member.create({
                data: {
                    fullName,
                    email,
                    username,
                    passwordHash,
                    phone,
                    address:  address || 'N/A',
                    nic:      nic || `SYSTEM-${Date.now()}`,
                    ...(emergencyContact && { emergencyContact }),
                    ...(emergencyPhone   && { emergencyPhone }),
                    paymentSlipUrl,
                    nicImageUrl,
                    ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
                    role:   role || 'member',
                    status: (role === 'staff' || role === 'admin') ? 'Active' : 'Pending'
                },
                // FIX: select only fields that actually exist in the Member model
                select: {
                    id:               true,
                    fullName:         true,
                    email:            true,
                    username:         true,
                    role:             true,
                    loyaltyPoints:    true,  // exists in schema line 24
                    registrationDate: true,
                    emergencyContact: true,  // exists in schema line 20
                    emergencyPhone:   true
                }
            })

            // FIX: use correct model name. Schema calls it "User", NOT "Membership"
            // FIX: field is "membershipType" (schema line 37), NOT "type"
            if (user.role === 'member' && membershipType) {
                const price = PLANS[membershipType] || 0
                const endDate = new Date()

                if (membershipType === 'lifetime') {
                    endDate.setFullYear(endDate.getFullYear() + 100)
                } else {
                    endDate.setFullYear(endDate.getFullYear() + 1)
                }

                const userMembership = await tx.user.create({
                    data: {
                        memberId:       user.id,
                        startDate:      new Date(),
                        endDate,
                        status:         'Pending',
                        membershipFee:  price,
                        membershipType: membershipType  // FIX: was "membershipType" (correct) but earlier version had "type" (wrong)
                    }
                })

                if (paymentSlipUrl && price > 0) {
                    await tx.membershipPayment.create({
                        data: {
                            membershipId:  userMembership.id,
                            memberId:      user.id,
                            amount:        price,
                            paymentMethod: 'Bank Transfer',
                            paymentStatus: 'Pending Verification',
                            paymentDate:   new Date()
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

        setTokenCookie(res, token)

        // Send confirmation email (non-blocking — never fails the registration)
        if (result.role === 'member') {
            const { sendRegistrationConfirmationEmail } = require('../services/emailService');
            sendRegistrationConfirmationEmail({ fullName: result.fullName, email: result.email })
                .catch(err => console.error('Registration confirmation email failed:', err.message));
        }

        res.status(201).json({
            message: 'Registration successful! Your application is pending approval.',
            user: result
        })
    } catch (error) {
        const fs = require('fs');
        const logMessage = `\n[${new Date().toISOString()}] REGISTRATION ERROR:\n${error.stack || error}\n`;
        fs.appendFileSync('debug_error.log', logMessage);
        console.error('❌ Registration request failed:', error);
        next(error)
    }
})

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email/username and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: john@example.com, description: "Email or username" }
 *               password: { type: string, format: password, example: Secret@123 }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

// Login user
// FIX: removed the status !== 'Active' block — pending members should still be
// able to log in and see their dashboard (they just won't have an active membership).
router.post("/login", validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.validatedData

        const user = await prisma.member.findFirst({
            where: {
                OR: [
                    { email:    { equals: email, mode: 'insensitive' } },
                    { username: { equals: email, mode: 'insensitive' } }
                ]
            }
        })

        if (!user) {
            throw new UnauthorizedError('Invalid email or password')
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid email or password')
        }

        // Block pending members — they must wait for admin approval
        if (user.role === 'member' && user.status === 'Pending') {
            throw new UnauthorizedError(
                'Your application is pending admin approval. ' +
                'You will receive an email once your membership has been verified.'
            )
        }

        // Block suspended/inactive accounts
        if (user.status === 'Suspended' || user.status === 'Inactive') {
            throw new UnauthorizedError('Your account has been suspended. Please contact administration.')
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )

        setTokenCookie(res, token)

        res.json({
            message: 'Login successful',
            user: {
                id:            user.id,
                fullName:      user.fullName,
                email:         user.email,
                username:      user.username,
                role:          user.role,
                loyaltyPoints: user.loyaltyPoints
            }
        })
    } catch (error) {
        next(error)
    }
})

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */

// Get current user profile
// FIX: all selected fields now match schema exactly (loyaltyPoints, emergencyContact present in schema)
router.get("/me", authenticate, async (req, res, next) => {
    try {
        const user = await prisma.member.findUnique({
            where: { id: req.user.id },
            select: {
                id:                     true,
                fullName:               true,
                email:                  true,
                username:               true,
                phone:                  true,
                address:                true,
                nic:                    true,
                role:                   true,
                loyaltyPoints:          true,
                status:                 true,
                registrationDate:       true,
                notificationPreference: true,
                emergencyContact:       true,
                emergencyPhone:         true,
                profileImageUrl:        true
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
        const {
            fullName,
            phone,
            address,
            nic,
            emergencyContact,
            emergencyPhone,
            notificationPreference,
            username,
            password
        } = req.body

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

        let passwordHash = undefined
        if (password) {
            passwordHash = await bcrypt.hash(password, 10)
        }

        const updatedUser = await prisma.member.update({
            where: { id: req.user.id },
            data: {
                ...(fullName               && { fullName }),
                ...(phone                  && { phone }),
                ...(address                && { address }),
                ...(nic                    && { nic }),
                ...(emergencyContact       && { emergencyContact }),
                ...(emergencyPhone         && { emergencyPhone }),
                ...(notificationPreference && { notificationPreference }),
                ...(username               && { username }),
                ...(passwordHash           && { passwordHash }),
                ...(req.body.profileImageUrl && { profileImageUrl: req.body.profileImageUrl })
            },
            select: {
                id:              true,
                fullName:        true,
                email:           true,
                username:        true,
                phone:           true,
                address:         true,
                nic:             true,
                emergencyContact: true,
                emergencyPhone:  true,
                role:            true
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
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )
        setTokenCookie(res, token)
        res.json({ message: 'Token refreshed successfully' })
    } catch (error) {
        next(error)
    }
})

// Logout
router.post("/logout", (req, res) => {
    clearTokenCookie(res)
    res.json({ message: 'Logged out successfully' })
})

// ────────────────────────────────────────────────────────────
// FORGOT PASSWORD → OTP FLOW
// ────────────────────────────────────────────────────────────

async function cleanupExpiredOtps(email) {
    try {
        await prisma.passwordResetOtp.deleteMany({
            where: { email, expiresAt: { lte: new Date() } }
        })
    } catch (e) { /* silent */ }
}

/**
 * @swagger
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

        await cleanupExpiredOtps(member.email)

        await prisma.passwordResetOtp.deleteMany({
            where: { email: member.email, expiresAt: { gt: new Date() } }
        })

        const plainOtp  = String(Math.floor(100000 + Math.random() * 900000))
        const otpHash   = await bcrypt.hash(plainOtp, 10)
        const expiresAt = new Date(Date.now() + 12 * 60 * 1000)

        await prisma.passwordResetOtp.create({
            data: { email: member.email, otp: otpHash, expiresAt }
        })

        const { sendPasswordResetOTP } = require('../services/emailService')
        sendPasswordResetOTP(member.email, plainOtp, member.fullName).catch(err =>
            console.error('OTP email send failed:', err)
        )

        res.json({ message: genericMsg })
    } catch (error) {
        next(error)
    }
})

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

        const isValid = await bcrypt.compare(otp.trim(), record.otp)
        if (!isValid) {
            return res.status(400).json({ message: 'Incorrect OTP. Please check your email and try again.' })
        }

        await prisma.passwordResetOtp.delete({ where: { id: record.id } })

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