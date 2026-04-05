# OWSC Authentication & Login Guide

The Old Wesleyites Sports Club system uses a role-based authentication system with a mandatory administrative approval flow for new members.

## 1. Membership Registration Flow (UC-01)
To prevent unauthorized access, all new registrations follow these steps:
1.  **Selection**: Member picks a plan (Full, Associate, Sport, Social, Lifetime).
2.  **Registration**: Member fills out the form, including a **Security Password**.
3.  **Payment**: Member uploads a payment slip/receipt.
4.  **Pending State**: The account is created with status **'Pending'**.
5.  **Admin Approval**: An administrator reviews the account/slip and clicks **'Approve'**.
6.  **Activation**: Only after approval can the member log in.

> [!IMPORTANT]
> If you register a new account, you **cannot** log in immediately. The login screen will display an "Account Pending Approval" message until an admin activates it.

---

## 2. Default Login Credentials
For testing and initial setup, use the following credentials.

### Admin Access
- **Email**: `admin@owsc.lk`
- **Password**: `admin123`
- **Role**: Full administrative access (Manage Members, Inventory, Menu, etc.)

### Staff Access
- **Email**: `staff@owsc.lk`
- **Password**: `staff123`
- **Role**: Service access (Order Management, Table Management, Inventory)

### Member Access
- **Email**: `member@owsc.lk`
- **Password**: `member123`
- **Status**: Active (Pre-approved for testing)

---

## 3. How Credentials are Formed
- **Members**: Use the **Email** and **Security Password** provided during the 4-step registration process.
- **Username**: While a username is collected for profile display, the **Email** is the primary login identifier.
- **Passwords**: Stored using industry-standard `bcrypt` hashing for maximum security.

## 4. Troubleshooting Login Issues
- **"Invalid Credentials"**: Check that the email and password are typed correctly. Remember that passwords are case-sensitive.
- **"Account Pending Approval"**: Your account is registered but waiting for an administrator to verify your payment.
- **Real-time Sync**: The system polls the database every 30-60 seconds, so status changes (like approval) reflect almost instantly.
