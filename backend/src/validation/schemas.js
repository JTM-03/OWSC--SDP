const { z } = require('zod');
const { sanitizeString, sanitizeEmail, sanitizePhone } = require('../utils/sanitize');

// Authentication schemas
const registerSchema = z.object({
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces')
        .transform(val => sanitizeString(val)),
    email: z.string()
        .email('Invalid email address')
        .refine(val => val.includes('@'), { message: 'Email must contain "@" symbol' })
        .transform(val => sanitizeEmail(val)),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .transform(val => sanitizeString(val)),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    phone: z.string()
        .regex(/^0\d{9}$/, 'Phone number must be 10 digits and start with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)')
        .transform(val => sanitizePhone(val)),
    address: z.string()
        .transform(val => sanitizeString(val))
        .optional(),
    nic: z.string()
        .transform(val => sanitizeString(val))
        .optional(),
    emergencyContact: z.string()
        .regex(/^[a-zA-Z\s]*$/, 'Emergency contact name can only contain letters and spaces')
        .transform(val => sanitizeString(val))
        .optional(),
    emergencyPhone: z.string()
        .regex(/^0\d{9}$/, 'Emergency phone must be 10 digits and start with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)')
        .transform(val => sanitizePhone(val))
        .optional()
        .or(z.literal('')),
    membershipType: z.string()
        .transform(val => sanitizeString(val))
        .optional(),
    role: z.enum(['member', 'staff', 'admin']).default('member'),
    dateOfBirth: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
        .optional()
});

const loginSchema = z.object({
    email: z.string()
        .min(1, 'Email or Username is required')
        .transform(val => val.trim()), // trim only — do NOT lowercase, field is also used as username
    password: z.string().min(1, 'Password is required')
});

// Venue schemas
const venueSchema = z.object({
    name: z.string()
        .min(1, 'Venue name is required')
        .transform(val => sanitizeString(val)),
    capacity: z.number().int().positive('Capacity must be a positive number'),
    facilities: z.string()
        .transform(val => sanitizeString(val))
        .optional(),
    atmosphere: z.string()
        .transform(val => sanitizeString(val))
        .optional(),
    charge: z.number().positive('Charge must be a positive number')
});

// Booking schemas
const bookingSchema = z.object({
    venueId: z.number().int().positive('Invalid venue ID'),
    bookingDate: z.string().datetime('Invalid date format'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid start time format (HH:MM)'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid end time format (HH:MM)'),
    timeSlot: z.string().optional()
}).refine(data => {
    const start = parseInt(data.startTime.replace(':', ''));
    const end = parseInt(data.endTime.replace(':', ''));
    return end > start;
}, {
    message: "End time must be after start time",
    path: ["endTime"]
});

const bookingPaymentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.string().min(1, 'Payment method is required')
});

const feedbackSchema = z.object({
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    comment: z.string()
        .transform(val => sanitizeString(val))
        .optional()
});

// Menu schemas
const menuItemSchema = z.object({
    name: z.string()
        .min(1, 'Menu item name is required')
        .transform(val => sanitizeString(val)),
    category: z.string()
        .min(1, 'Category is required')
        .transform(val => sanitizeString(val)),
    price: z.coerce.number().positive('Price must be positive'),
    description: z.string()
        .transform(val => sanitizeString(val))
        .optional()
        .nullable(),
    // imageUrl is a file path — must NOT be HTML-escaped (/ would become &#x2F;)
    imageUrl: z.string().trim().optional().nullable().or(z.string().length(0)),
    isPopular: z.preprocess(val => val === 'true' || val === true, z.boolean().default(false)),
    availabilityStatus: z.string()
        .transform(val => sanitizeString(val))
        .default('Available')
});

// Partial schema for PATCH-style PUT updates (e.g. toggling availability only)
const menuItemPartialSchema = z.object({
    name: z.string()
        .min(1, 'Menu item name is required')
        .transform(val => sanitizeString(val))
        .optional(),
    category: z.string()
        .min(1, 'Category is required')
        .transform(val => sanitizeString(val))
        .optional(),
    price: z.coerce.number().positive('Price must be positive').optional(),
    description: z.string()
        .transform(val => sanitizeString(val))
        .optional()
        .nullable(),
    // imageUrl is a file path — must NOT be HTML-escaped
    imageUrl: z.string().trim().optional().nullable().or(z.string().length(0)),
    isPopular: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
    availabilityStatus: z.string()
        .transform(val => sanitizeString(val))
        .optional()
});

// Order schemas
const orderSchema = z.object({
    orderType: z.enum(['Dine-in', 'Takeaway'], {
        errorMap: () => ({ message: 'Order type must be Dine-in or Takeaway' })
    }),
    // paymentMethod is optional here — backend enforces cash rules separately
    paymentMethod: z.enum(['cash', 'online']).optional(),
    items: z.array(z.object({
        menuItemId: z.number().int().positive(),
        // Hard cap: no single item quantity above 50 at schema level
        quantity: z.number().int().positive().max(50, 'Quantity cannot exceed 50 per item')
    })).min(1, 'Order must contain at least one item')
        .max(20, 'An order cannot contain more than 20 distinct items')
});

const orderPaymentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.string().min(1, 'Payment method is required')
});

module.exports = {
    registerSchema,
    loginSchema,
    venueSchema,
    bookingSchema,
    bookingPaymentSchema,
    feedbackSchema,
    menuItemSchema,
    menuItemPartialSchema,
    orderSchema,
    orderPaymentSchema
};
