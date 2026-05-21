const { z } = require('zod');
const { sanitizeString, sanitizeEmail, sanitizePhone } = require('../utils/sanitize');

// Authentication schemas
const registerSchema = z.object({
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must not exceed 100 characters')
        .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces')
        .transform(val => sanitizeString(val)),
    email: z.string()
        .email('Invalid email address')
        .max(150, 'Email must not exceed 150 characters')
        .transform(val => sanitizeEmail(val)),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must not exceed 50 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .transform(val => sanitizeString(val)),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    phone: z.string()
        .regex(/^0\d{9}$/, 'Phone number must be 10 digits and start with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)')
        .transform(val => sanitizePhone(val)),
    address: z.string()
        .max(255, 'Address must not exceed 255 characters')
        .transform(val => sanitizeString(val))
        .optional(),
    nic: z.string()
        .max(20, 'NIC must not exceed 20 characters')
        .regex(/^(\d{9}[VvXx]|\d{12})$/, 'NIC must be in format 123456789V or 123456789012')
        .transform(val => sanitizeString(val))
        .optional(),
    emergencyContact: z.string()
        .max(100, 'Emergency contact name must not exceed 100 characters')
        .regex(/^[a-zA-Z\s]*$/, 'Emergency contact name can only contain letters and spaces')
        .transform(val => sanitizeString(val))
        .optional(),
    emergencyPhone: z.string()
        .regex(/^0\d{9}$/, 'Emergency phone must be 10 digits and start with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)')
        .transform(val => sanitizePhone(val))
        .optional()
        .or(z.literal('')),
    membershipType: z.enum(['full', 'associate', 'sport', 'social', 'lifetime'], {
        errorMap: () => ({ message: 'Invalid membership type' })
    }).optional(),
    role: z.enum(['member', 'staff', 'admin']).default('member'),
    dateOfBirth: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
        .optional()
});

const loginSchema = z.object({
    email: z.string()
        .min(1, 'Email or Username is required')
        .max(150, 'Input too long')
        .transform(val => val.trim()),
    password: z.string()
        .min(1, 'Password is required')
        .max(128, 'Password too long')
});

// Profile update schema
const profileUpdateSchema = z.object({
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must not exceed 100 characters')
        .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces')
        .transform(val => sanitizeString(val))
        .optional(),
    phone: z.string()
        .regex(/^0\d{9}$/, 'Phone number must be 10 digits and start with 0')
        .optional(),
    address: z.string()
        .max(255, 'Address must not exceed 255 characters')
        .transform(val => sanitizeString(val))
        .optional(),
    nic: z.string()
        .max(20, 'NIC must not exceed 20 characters')
        .transform(val => sanitizeString(val))
        .optional(),
    emergencyContact: z.string()
        .max(100, 'Emergency contact name must not exceed 100 characters')
        .regex(/^[a-zA-Z\s]*$/, 'Emergency contact name can only contain letters and spaces')
        .transform(val => sanitizeString(val))
        .optional(),
    emergencyPhone: z.string()
        .regex(/^0\d{9}$/, 'Emergency phone must be 10 digits and start with 0')
        .optional()
        .or(z.literal('')),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must not exceed 50 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
        .optional(),
    notificationPreference: z.enum(['Email', 'SMS', 'Both', 'None']).optional(),
    profileImageUrl: z.string().url('Invalid image URL').optional().or(z.literal(''))
});

// Password reset schemas
const forgotPasswordSchema = z.object({
    username: z.string()
        .min(1, 'Username is required')
        .max(50, 'Username too long')
        .transform(val => val.trim()),
    nic: z.string()
        .min(1, 'NIC is required')
        .max(20, 'NIC too long')
        .transform(val => val.trim())
});

const verifyOtpSchema = z.object({
    username: z.string().min(1, 'Username is required').transform(val => val.trim()),
    nic: z.string().min(1, 'NIC is required').transform(val => val.trim()),
    otp: z.string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must contain only digits')
        .transform(val => val.trim())
});

const resetPasswordSchema = z.object({
    resetToken: z.string().min(1, 'Reset token is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

// Venue schemas
const venueSchema = z.object({
    name: z.string()
        .min(1, 'Venue name is required')
        .max(100, 'Venue name must not exceed 100 characters')
        .transform(val => sanitizeString(val)),
    capacity: z.number()
        .int('Capacity must be a whole number')
        .positive('Capacity must be a positive number')
        .max(10000, 'Capacity seems unrealistically large'),
    facilities: z.string()
        .max(500, 'Facilities description must not exceed 500 characters')
        .transform(val => sanitizeString(val))
        .optional(),
    atmosphere: z.string()
        .max(200, 'Atmosphere must not exceed 200 characters')
        .transform(val => sanitizeString(val))
        .optional(),
    charge: z.number()
        .positive('Charge must be a positive number')
        .max(1000000, 'Charge amount seems unrealistically large')
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
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be between 1 and 5'),
    comment: z.string()
        .max(1000, 'Comment must not exceed 1000 characters')
        .transform(val => sanitizeString(val))
        .optional()
});

// Table booking schema
const tableBookingSchema = z.object({
    location: z.enum(['Indoor', 'Outdoor'], {
        errorMap: () => ({ message: 'Location must be Indoor or Outdoor' })
    }),
    tableCount: z.coerce.number()
        .int('Table count must be a whole number')
        .positive('Table count must be at least 1')
        .max(20, 'Cannot book more than 20 tables at once'),
    reservationDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}/, 'Reservation date must be in YYYY-MM-DD format'),
    reservationTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Reservation time must be in HH:MM format')
});

// Menu schemas
const menuItemSchema = z.object({
    name: z.string()
        .min(1, 'Menu item name is required')
        .max(100, 'Menu item name must not exceed 100 characters')
        .transform(val => sanitizeString(val)),
    category: z.string()
        .min(1, 'Category is required')
        .max(50, 'Category must not exceed 50 characters')
        .transform(val => sanitizeString(val)),
    price: z.coerce.number()
        .positive('Price must be positive')
        .max(100000, 'Price seems unrealistically large'),
    description: z.string()
        .max(500, 'Description must not exceed 500 characters')
        .transform(val => sanitizeString(val))
        .optional()
        .nullable(),
    imageUrl: z.string().trim().optional().nullable().or(z.string().length(0)),
    isPopular: z.preprocess(val => val === 'true' || val === true, z.boolean().default(false)),
    availabilityStatus: z.enum(['Available', 'Unavailable'], {
        errorMap: () => ({ message: 'Status must be Available or Unavailable' })
    }).default('Available')
});

const menuItemPartialSchema = z.object({
    name: z.string()
        .min(1, 'Menu item name is required')
        .max(100, 'Menu item name must not exceed 100 characters')
        .transform(val => sanitizeString(val))
        .optional(),
    category: z.string()
        .min(1, 'Category is required')
        .max(50, 'Category must not exceed 50 characters')
        .transform(val => sanitizeString(val))
        .optional(),
    price: z.coerce.number()
        .positive('Price must be positive')
        .max(100000, 'Price seems unrealistically large')
        .optional(),
    description: z.string()
        .max(500, 'Description must not exceed 500 characters')
        .transform(val => sanitizeString(val))
        .optional()
        .nullable(),
    imageUrl: z.string().trim().optional().nullable().or(z.string().length(0)),
    isPopular: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
    availabilityStatus: z.enum(['Available', 'Unavailable']).optional()
});

// Order schemas
const orderSchema = z.object({
    orderType: z.enum(['Dine-in', 'Takeaway'], {
        errorMap: () => ({ message: 'Order type must be Dine-in or Takeaway' })
    }),
    paymentMethod: z.enum(['cash', 'online']).optional(),
    tableNumber: z.string().max(20, 'Table number too long').optional(),
    checkoutId: z.string().uuid('checkoutId must be a valid UUID').optional(),
    items: z.array(z.object({
        menuItemId: z.number().int().positive('Invalid menu item ID'),
        quantity: z.number()
            .int('Quantity must be a whole number')
            .positive('Quantity must be at least 1')
            .max(50, 'Quantity cannot exceed 50 per item')
    }))
    .min(1, 'Order must contain at least one item')
    .max(20, 'An order cannot contain more than 20 distinct items')
});

const orderPaymentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.string().min(1, 'Payment method is required')
});

// Staff role update schema
const staffRoleSchema = z.object({
    role: z.enum(['member', 'staff', 'admin'], {
        errorMap: () => ({ message: 'Role must be member, staff, or admin' })
    })
});

// Member status update schema
const memberStatusSchema = z.object({
    status: z.enum(['Active', 'Inactive', 'Suspended', 'Pending'], {
        errorMap: () => ({ message: 'Status must be Active, Inactive, Suspended, or Pending' })
    })
});

// Upgrade request status schema
const upgradeRequestStatusSchema = z.object({
    status: z.enum(['Approved', 'Rejected'], {
        errorMap: () => ({ message: 'Status must be Approved or Rejected' })
    })
});

// Notification send schema
const notificationSendSchema = z.object({
    memberId: z.number().int().positive('Invalid member ID'),
    title: z.string()
        .min(1, 'Title is required')
        .max(100, 'Title must not exceed 100 characters')
        .transform(val => sanitizeString(val)),
    message: z.string()
        .min(1, 'Message is required')
        .max(500, 'Message must not exceed 500 characters')
        .transform(val => sanitizeString(val)),
    type: z.enum(['info', 'alert', 'success', 'error']).default('info')
});

// Inventory product schema
const inventoryProductSchema = z.object({
    productName: z.string()
        .min(1, 'Product name is required')
        .max(100, 'Product name must not exceed 100 characters')
        .transform(val => sanitizeString(val)),
    category: z.string()
        .min(1, 'Category is required')
        .max(50, 'Category must not exceed 50 characters')
        .transform(val => sanitizeString(val)),
    unit: z.string()
        .min(1, 'Unit is required')
        .max(20, 'Unit must not exceed 20 characters')
        .transform(val => sanitizeString(val)),
    reorderLevel: z.coerce.number()
        .nonnegative('Reorder level must be 0 or greater')
        .optional(),
    initialQuantity: z.coerce.number()
        .nonnegative('Initial quantity must be 0 or greater')
        .optional(),
    supplierId: z.coerce.number().int().positive().optional()
});

// Inventory stock update schema
const inventoryUpdateSchema = z.object({
    productId: z.coerce.number().int().positive('Invalid product ID'),
    quantity: z.coerce.number()
        .positive('Quantity must be greater than 0')
        .max(100000, 'Quantity seems unrealistically large'),
    type: z.enum(['delivery', 'used'], {
        errorMap: () => ({ message: 'Type must be delivery or used' })
    }),
    supplierId: z.coerce.number().int().positive().optional(),
    reason: z.string()
        .max(255, 'Reason must not exceed 255 characters')
        .transform(val => sanitizeString(val))
        .optional()
});

// Inventory return schema
const inventoryReturnSchema = z.object({
    productId: z.coerce.number().int().positive('Invalid product ID'),
    supplierId: z.coerce.number().int().positive('Invalid supplier ID'),
    quantity: z.coerce.number()
        .positive('Return quantity must be greater than 0')
        .max(100000, 'Quantity seems unrealistically large'),
    reason: z.string()
        .min(1, 'Reason is required')
        .max(255, 'Reason must not exceed 255 characters')
        .transform(val => sanitizeString(val))
});

// Staffing assignment update schema
const assignmentUpdateSchema = z.object({
    venueId: z.number().int().positive().optional(),
    staffId: z.number().int().positive().optional(),
    assignmentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
    eventName: z.string().max(100).optional(),
    role: z.string().max(50).optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional()
}).refine(data => {
    if (data.startTime && data.endTime) {
        const start = parseInt(data.startTime.replace(':', ''));
        const end = parseInt(data.endTime.replace(':', ''));
        return end > start;
    }
    return true;
}, { message: 'End time must be after start time', path: ['endTime'] });

module.exports = {
    registerSchema,
    loginSchema,
    profileUpdateSchema,
    forgotPasswordSchema,
    verifyOtpSchema,
    resetPasswordSchema,
    venueSchema,
    bookingSchema,
    bookingPaymentSchema,
    feedbackSchema,
    tableBookingSchema,
    menuItemSchema,
    menuItemPartialSchema,
    orderSchema,
    orderPaymentSchema,
    staffRoleSchema,
    memberStatusSchema,
    upgradeRequestStatusSchema,
    notificationSendSchema,
    inventoryProductSchema,
    inventoryUpdateSchema,
    inventoryReturnSchema,
    assignmentUpdateSchema
};