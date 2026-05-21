const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } = require("../utils/errors")
const { setTokenCookie, clearTokenCookie } = require("../utils/cookie")

// ─── Membership plan pricing (LKR) ───────────────────────────────────────────
const PLANS = {
    'full':      15000,
    'associate': 10000,
    'sport':     5000,
    'social':    10000,
    'lifetime':  25000
}

/**
 * Remove expired OTP records for a given email to keep the table clean.
 * Failures are swallowed — this is a best-effort cleanup.
 * @param {string} email
 */
async function cleanupExpiredOtps(email) {
    try {
        await prisma.passwordResetOtp.deleteMany({
            where: { email, expiresAt: { lte: new Date() } }
        })
    } catch (e) { /* silent */ }
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register a new member or staff account.
 * - Validates minimum age (21+) for members
 * - Checks for duplicate email/username
 * - Creates member + membership + payment records in a single transaction
 * - Issues a JWT cookie on success and fires a confirmation email
 * @route POST /api/auth/register
 */
exports.register = async (req, res, next) => {
    try {
        const {
            fullName, email, username, password, phone, address, nic,
            emergencyContact, emergencyPhone, role, membershipType, dateOfBirth
        } = req.validatedData

        // Resolve uploaded file paths (multer stores them under /uploads)
        const files = req.files || {}
        const paymentSlipUrl = files.paymentSlip?.[0] ? `/uploads/${files.paymentSlip[0].filename}` : null
        const nicImageUrl    = files.nicImage?.[0]    ? `/uploads/${files.nicImage[0].filename}`    : null

        // OWSC business rule: members must be at least 21 years old
        if (dateOfBirth) {
            const dob = new Date(dateOfBirth)
            const today = new Date()
            let age = today.getFullYear() - dob.getFullYear()
            const monthDiff = today.getMonth() - dob.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--
            if (age < 21) throw new BadRequestError('You must be at least 21 years old to become a member of OWSC.')
        }

        // Uniqueness checks before hashing to fail fast
        const existingEmail = await prisma.member.findUnique({ where: { email } })
        if (existingEmail) throw new ConflictError('Email already registered')

        const existingUsername = await prisma.member.findUnique({ where: { username } })
        if (existingUsername) throw new ConflictError('Username already taken')

        const passwordHash = await bcrypt.hash(password, 10)

        // Wrap member + membership + payment creation in a transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.member.create({
                data: {
                    fullName, email, username, passwordHash, phone,
                    address: address || 'N/A',
                    // Use a system-generated NIC placeholder if not provided
                    nic: nic || `SYSTEM-${Date.now()}`,
                    ...(emergencyContact && { emergencyContact }),
                    ...(emergencyPhone   && { emergencyPhone }),
                    paymentSlipUrl, nicImageUrl,
                    ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
                    role: role || 'member',
                    // Staff/admin accounts are immediately Active; members start Pending until approved
                    status: (role === 'staff' || role === 'admin') ? 'Active' : 'Pending'
                },
                select: {
                    id: true, fullName: true, email: true, username: true, role: true,
                    loyaltyPoints: true, registrationDate: true, emergencyContact: true, emergencyPhone: true
                }
            })

            // Create membership record for regular members who selected a plan
            if (user.role === 'member' && membershipType) {
                const price = PLANS[membershipType] || 0
                const endDate = new Date()
                // Lifetime memberships expire 100 years out; all others are annual
                if (membershipType === 'lifetime') endDate.setFullYear(endDate.getFullYear() + 100)
                else endDate.setFullYear(endDate.getFullYear() + 1)

                const userMembership = await tx.user.create({
                    data: { memberId: user.id, startDate: new Date(), endDate, status: 'Pending', membershipFee: price, membershipType }
                })

                // Record the bank transfer payment slip if one was uploaded
                if (paymentSlipUrl && price > 0) {
                    await tx.membershipPayment.create({
                        data: { membershipId: userMembership.id, memberId: user.id, amount: price, paymentMethod: 'Bank Transfer', paymentStatus: 'Pending Verification', paymentDate: new Date() }
                    })
                }
            }
            return user
        })

        // Issue JWT as an HttpOnly cookie so the client never touches the token directly
        const token = jwt.sign(
            { id: result.id, email: result.email, role: result.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )
        setTokenCookie(res, token)

        // Send confirmation email asynchronously — don't block the response
        if (result.role === 'member') {
            const { sendRegistrationConfirmationEmail } = require('../services/emailService')
            sendRegistrationConfirmationEmail({ fullName: result.fullName, email: result.email })
                .catch(err => console.error('Registration confirmation email failed:', err.message))
        }

        res.status(201).json({ message: 'Registration successful! Your application is pending approval.', user: result })
    } catch (error) {
        // Log registration errors to a dedicated file for debugging
        const fs = require('fs')
        const path = require('path')
        const logDir = path.join(__dirname, '../../logs')
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
        fs.appendFileSync(path.join(logDir, 'debug_error.log'), `\n[${new Date().toISOString()}] REGISTRATION ERROR:\n${error.stack || error}\n`)
        next(error)
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate a member by email/username + password.
 * - Accepts either email or username in the email field (case-insensitive)
 * - Blocks Pending members and Suspended/Inactive accounts
 * - Issues a JWT HttpOnly cookie on success
 * @route POST /api/auth/login
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.validatedData

        // Allow login with either email or username
        const user = await prisma.member.findFirst({
            where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { username: { equals: email, mode: 'insensitive' } }] }
        })

        // Use a generic error message to avoid leaking whether the email exists
        if (!user) throw new UnauthorizedError('Invalid email or password')

        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) throw new UnauthorizedError('Invalid email or password')

        // Members whose application hasn't been approved yet cannot log in
        if (user.role === 'member' && user.status === 'Pending') {
            throw new UnauthorizedError('Your application is pending admin approval. You will receive an email once your membership has been verified.')
        }

        if (user.status === 'Suspended' || user.status === 'Inactive') {
            throw new UnauthorizedError('Your account has been suspended. Please contact administration.')
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )
        setTokenCookie(res, token)

        res.json({ message: 'Login successful', user: { id: user.id, fullName: user.fullName, email: user.email, username: user.username, role: user.role, loyaltyPoints: user.loyaltyPoints } })
    } catch (error) {
        next(error)
    }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Return the authenticated user's full profile.
 * @route GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
    try {
        const user = await prisma.member.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, fullName: true, email: true, username: true, phone: true,
                address: true, nic: true, role: true, loyaltyPoints: true, status: true,
                registrationDate: true, notificationPreference: true, emergencyContact: true,
                emergencyPhone: true, profileImageUrl: true
            }
        })
        if (!user) throw new NotFoundError('User not found')
        res.json({ user })
    } catch (error) {
        next(error)
    }
}

/**
 * Update the authenticated user's own profile fields.
 * Only provided fields are updated (partial update pattern).
 * @route PUT /api/auth/me
 */
exports.updateMe = async (req, res, next) => {
    try {
        const { fullName, phone, address, nic, emergencyContact, emergencyPhone, notificationPreference, username, password } = req.validatedData || req.body

        // Ensure the new username isn't already taken by another account
        if (username) {
            const existingUser = await prisma.member.findFirst({ where: { username, id: { not: req.user.id } } })
            if (existingUser) throw new ConflictError('Username already taken')
        }

        // Hash the new password only if one was provided
        let passwordHash = undefined
        if (password) passwordHash = await bcrypt.hash(password, 10)

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
            select: { id: true, fullName: true, email: true, username: true, phone: true, address: true, nic: true, emergencyContact: true, emergencyPhone: true, role: true }
        })

        res.json({ message: 'Profile updated successfully', user: updatedUser })
    } catch (error) {
        next(error)
    }
}

/**
 * Upload and save a profile picture for the authenticated user.
 * @route POST /api/auth/me/picture
 */
exports.uploadPicture = async (req, res, next) => {
    try {
        if (!req.file) throw new BadRequestError('No image uploaded')
        const profileImageUrl = `/uploads/${req.file.filename}`
        await prisma.member.update({ where: { id: req.user.id }, data: { profileImageUrl } })
        res.json({ profileImageUrl })
    } catch (error) {
        next(error)
    }
}

/**
 * Refresh the JWT cookie without requiring re-login.
 * Useful for extending sessions on active users.
 * @route POST /api/auth/refresh
 */
exports.refresh = async (req, res, next) => {
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
}

/**
 * Clear the JWT cookie to log the user out.
 * @route POST /api/auth/logout
 */
exports.logout = (req, res) => {
    clearTokenCookie(res)
    res.json({ message: 'Logged out successfully' })
}

// ─── Password Reset (OTP flow) ────────────────────────────────────────────────

/**
 * Initiate a password reset by verifying username + NIC, then emailing a 6-digit OTP.
 * Always returns the same generic message to prevent user enumeration.
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { username, nic } = req.validatedData || req.body
        if (!username || !nic) return res.status(400).json({ message: 'Username and NIC number are required' })

        // Generic response prevents leaking whether the account exists
        const genericMsg = 'If a matching account is found, an OTP will be sent to the registered email.'
        const member = await prisma.member.findFirst({ where: { username: username.trim(), nic: nic.trim() } })
        if (!member || !member.email) return res.json({ message: genericMsg })

        // Remove stale OTPs before creating a new one
        await cleanupExpiredOtps(member.email)
        // Also invalidate any still-valid OTPs so only one is active at a time
        await prisma.passwordResetOtp.deleteMany({ where: { email: member.email, expiresAt: { gt: new Date() } } })

        const plainOtp  = String(Math.floor(100000 + Math.random() * 900000))
        const otpHash   = await bcrypt.hash(plainOtp, 10)
        const expiresAt = new Date(Date.now() + 12 * 60 * 1000) // OTP valid for 12 minutes

        await prisma.passwordResetOtp.create({ data: { email: member.email, otp: otpHash, expiresAt } })

        const { sendPasswordResetOTP } = require('../services/emailService')
        sendPasswordResetOTP(member.email, plainOtp, member.fullName).catch(err => console.error('OTP email send failed:', err))

        res.json({ message: genericMsg })
    } catch (error) {
        next(error)
    }
}

/**
 * Verify the OTP submitted by the user and return a short-lived reset token.
 * The reset token is a JWT with purpose='password-reset', valid for 5 minutes.
 * @route POST /api/auth/verify-otp
 */
exports.verifyOtp = async (req, res, next) => {
    try {
        const { username, nic, otp } = req.validatedData || req.body
        if (!username || !nic || !otp) return res.status(400).json({ message: 'Username, NIC, and OTP are required' })

        const member = await prisma.member.findFirst({ where: { username: username.trim(), nic: nic.trim() } })
        if (!member) return res.status(400).json({ message: 'Invalid credentials. Please try again.' })

        await cleanupExpiredOtps(member.email)

        // Fetch the most recent non-expired OTP for this email
        const record = await prisma.passwordResetOtp.findFirst({
            where: { email: member.email, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' }
        })
        if (!record) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' })

        const isValid = await bcrypt.compare(otp.trim(), record.otp)
        if (!isValid) return res.status(400).json({ message: 'Incorrect OTP. Please check your email and try again.' })

        // Consume the OTP so it cannot be reused
        await prisma.passwordResetOtp.delete({ where: { id: record.id } })

        // Issue a short-lived token scoped specifically to password reset
        const resetToken = jwt.sign({ memberId: member.id, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '5m' })
        res.json({ message: 'OTP verified successfully', resetToken })
    } catch (error) {
        next(error)
    }
}

/**
 * Complete the password reset using the token issued by verifyOtp.
 * Validates the token's purpose claim to prevent misuse of regular JWTs.
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { resetToken, newPassword } = req.validatedData || req.body
        if (!resetToken || !newPassword) return res.status(400).json({ message: 'Reset token and new password are required' })
        if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long' })

        let payload
        try { payload = jwt.verify(resetToken, process.env.JWT_SECRET) }
        catch { return res.status(400).json({ message: 'Your reset session has expired. Please start over.' }) }

        // Reject tokens that weren't issued specifically for password reset
        if (payload.purpose !== 'password-reset') return res.status(400).json({ message: 'Invalid reset token' })

        const member = await prisma.member.findUnique({ where: { id: payload.memberId } })
        if (!member) return res.status(404).json({ message: 'Account not found' })

        const passwordHash = await bcrypt.hash(newPassword, 10)
        await prisma.member.update({ where: { id: member.id }, data: { passwordHash } })

        res.json({ message: 'Password reset successfully. You can now log in with your new password.' })
    } catch (error) {
        next(error)
    }
}
