const { z } = require('zod')

// Authentication schemas
const registerSchema = z.object({
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
    email: z.string()
        .email('Invalid email address')
        .refine(val => val.includes('@'), {
            message: 'Email must contain "@" symbol'
        }),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    phone: z.string().regex(/^07\d{8}$/, 'Phone number must be 10 digits and start with 07'),
    address: z.string().optional(),
    nic: z.string().optional(),
    emergencyContact: z.string()
        .regex(/^[a-zA-Z\s]*$/, 'Emergency contact name can only contain letters and spaces')
        .optional(),
    emergencyPhone: z.string().optional(),
    membershipType: z.string().optional(),
    role: z.enum(['member', 'staff', 'admin']).default('member')
})

const loginSchema = z.object({
    email: z.string().min(1, 'Email or Username is required'),
    password: z.string().min(1, 'Password is required')
})

// Venue schemas
const venueSchema = z.object({
    name: z.string().min(1, 'Venue name is required'),
    capacity: z.number().int().positive('Capacity must be a positive number'),
    facilities: z.string().optional(),
    atmosphere: z.string().optional(),
    charge: z.number().positive('Charge must be a positive number')
})

// Booking schemas
const bookingSchema = z.object({
    venueId: z.number().int().positive('Invalid venue ID'),
    bookingDate: z.string().datetime('Invalid date format'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid start time format (HH:MM)'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid end time format (HH:MM)'),
    // Optional timeSlot for backward compatibility or removal
    timeSlot: z.string().optional()
}).refine(data => {
    const start = parseInt(data.startTime.replace(':', ''));
    const end = parseInt(data.endTime.replace(':', ''));
    return end > start;
}, {
    message: "End time must be after start time",
    path: ["endTime"]
})

const bookingPaymentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.string().min(1, 'Payment method is required')
})

const feedbackSchema = z.object({
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    comment: z.string().optional()
})

// Menu schemas
const menuItemSchema = z.object({
    name: z.string().min(1, 'Menu item name is required'),
    category: z.string().min(1, 'Category is required'),
    price: z.coerce.number().positive('Price must be positive'),
    description: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable().or(z.string().length(0)),
    isPopular: z.preprocess(val => val === 'true' || val === true, z.boolean().default(false)),
    availabilityStatus: z.string().default('Available')
})

// Order schemas
const orderSchema = z.object({
    orderType: z.enum(['Dine-in', 'Takeaway'], {
        errorMap: () => ({ message: 'Order type must be Dine-in or Takeaway' })
    }),
    items: z.array(z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().positive()
    })).min(1, 'Order must contain at least one item')
})

const orderPaymentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.string().min(1, 'Payment method is required')
})

module.exports = {
    registerSchema,
    loginSchema,
    venueSchema,
    bookingSchema,
    bookingPaymentSchema,
    feedbackSchema,
    menuItemSchema,
    orderSchema,
    orderPaymentSchema
}
