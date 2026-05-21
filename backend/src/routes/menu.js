const express = require("express")
const { validate } = require("../middleware/validate")
const { menuItemSchema, menuItemPartialSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const upload = require("../config/upload")
const ctrl = require("../controllers/menuController")

const router = express.Router()

/**
 * @swagger
 * /menu:
 *   get:
 *     summary: List all menu items
 *     tags: [Menu]
 *   post:
 *     summary: Add a new menu item (Admin/Staff only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 * /menu/{id}:
 *   get:
 *     summary: Get a menu item by ID
 *     tags: [Menu]
 *   put:
 *     summary: Update a menu item (Admin/Staff only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete a menu item (Admin/Staff only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",    ctrl.listMenuItems)
router.get("/:id", ctrl.getMenuItem)
router.post("/",   authenticate, requireRole('admin', 'staff'), upload.single('image'), validate(menuItemSchema),        ctrl.createMenuItem)
router.put("/:id", authenticate, requireRole('admin', 'staff'), upload.single('image'), validate(menuItemPartialSchema), ctrl.updateMenuItem)
router.delete("/:id", authenticate, requireRole('admin', 'staff'), ctrl.deleteMenuItem)

module.exports = router
