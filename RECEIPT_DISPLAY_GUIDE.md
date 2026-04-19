# Professional Receipt Display - Visual Guide

## Admin Dashboard Layout

### Summary Cards (Top of Page)
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ 📋 PENDING       │  │ 📋 PENDING       │  │ 📋 PENDING       │
│   MEMBERSHIPS    │  │   BOOKINGS       │  │   ORDERS         │
│                  │  │                  │  │                  │
│        3         │  │        5         │  │        2         │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Pending Payments List
```
╔════════════════════════════════════════════════════════════════════════╗
║ PAYMENT RECEIPTS AWAITING VERIFICATION                                ║
║ Review and approve/reject member payment receipts                      ║
╠════════════════════════════════════════════════════════════════════════╣
║ ┌────────────────────────────────────────────────────────────────────┐ ║
║ │ 🏷️ MEMBERSHIP      John Smith                                     │ ║
║ │                                                                     │ ║
║ │ Amount:           Rs. 15,000.00                                     │ ║
║ │ Payment Method:   Bank Transfer                                     │ ║
║ │ Submitted:        Mar 15, 2026 02:30 PM                            │ ║
║ │ Email:            john@example.com                                  │ ║
║ │                                                                     │ ║
║ │ [👁️ View] [💾 Download] [✓ Approve] [✗ Reject]                   │ ║
║ └────────────────────────────────────────────────────────────────────┘ ║
║ ┌────────────────────────────────────────────────────────────────────┐ ║
║ │ 🎪 BOOKING        Sarah Williams                                   │ ║
║ │                                                                     │ ║
║ │ Amount:           Rs. 25,000.00                                     │ ║
║ │ Payment Method:   Card Payment                                      │ ║
║ │ Submitted:        Mar 15, 2026 01:45 PM                            │ ║
║ │ Venue:            Presidential Lounge                              │ ║
║ │ Event Date:       Mar 20, 2026 06:00 PM                            │ ║
║ │ Email:            sarah@example.com                                 │ ║
║ │                                                                     │ ║
║ │ [👁️ View] [💾 Download] [✓ Approve] [✗ Reject]                   │ ║
║ └────────────────────────────────────────────────────────────────────┘ ║
║ ┌────────────────────────────────────────────────────────────────────┐ ║
║ │ 🍽️ ORDER         Mike Johnson                                      │ ║
║ │                                                                     │ ║
║ │ Amount:           Rs. 3,500.00                                      │ ║
║ │ Payment Method:   Online Payment                                    │ ║
║ │ Submitted:        Mar 15, 2026 12:15 PM                            │ ║
║ │                                                                     │ ║
║ │ [👁️ View] [💾 Download] [✓ Approve] [✗ Reject]                   │ ║
║ └────────────────────────────────────────────────────────────────────┘ ║
╚════════════════════════════════════════════════════════════════════════╝
```

## View Receipt Modal

### When Clicking "View" Button

```
╔═══════════════════════════════════════════════════════════════╗
║ VIEW RECEIPT                                                  ║
║ Membership Payment from John Smith                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ PAYMENT DETAILS                                         │  ║
║ │                                                         │  ║
║ │ Type:              Membership                           │  ║
║ │ Amount:            Rs. 15,000.00                       │  ║
║ │ Payment Method:    Bank Transfer                       │  ║
║ │ Submitted:         Mar 15, 2026 02:30 PM              │  ║
║ │                                                         │  ║
║ │ Member:            John Smith                          │  ║
║ │ Email:             john@example.com                    │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ RECEIPT IMAGE                                           │  ║
║ │                                                         │  ║
║ │  ┌──────────────────────────────────────────────────┐  │  ║
║ │  │                                                  │  │  ║
║ │  │    [BANK RECEIPT IMAGE PREVIEW]                 │  │  ║
║ │  │    Shows:                                        │  │  ║
║ │  │    - Amount: Rs. 15,000                         │  │  ║
║ │  │    - Date: 15-03-2026                           │  │  ║
║ │  │    - Bank: Commercial Bank                      │  │  ║
║ │  │    - Ref: TXN123456789                          │  │  ║
║ │  │    - Account: XXXXX1234                          │  │  ║
║ │  │                                                  │  │  ║
║ │  └──────────────────────────────────────────────────┘  │  ║
║ │                                                         │  ║
║ │  [Download Full Image]                                │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Approve Modal

### When Clicking "Approve" Button

```
╔═══════════════════════════════════════════════════════════════╗
║ APPROVE PAYMENT                                               ║
║ Membership Payment from John Smith                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ PAYMENT DETAILS                                         │  ║
║ │                                                         │  ║
║ │ Type:              Membership                           │  ║
║ │ Amount:            Rs. 15,000.00                       │  ║
║ │ Payment Method:    Bank Transfer                       │  ║
║ │ Submitted:         Mar 15, 2026 02:30 PM              │  ║
║ │                                                         │  ║
║ │ Member:            John Smith                          │  ║
║ │ Email:             john@example.com                    │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ ✓ This action will:                                     │  ║
║ │                                                         │  ║
║ │ • Mark payment as COMPLETED                            │  ║
║ │ • Activate the membership                              │  ║
║ │ • Send approval notification to member                 │  ║
║ │                                                         │  ║
║ │ The membership status will change to "Active"           │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║ ┌─────────────ORIGINALOADERROROFNo ORIGINALS────┐  ║ ║ │ [Cancel]  [✓ Approve Payment]      │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Reject Modal

### When Clicking "Reject" Button

```
╔═══════════════════════════════════════════════════════════════╗
║ REJECT PAYMENT                                                ║
║ Membership Payment from John Smith                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ PAYMENT DETAILS                                         │  ║
║ │                                                         │  ║
║ │ Type:              Membership                           │  ║
║ │ Amount:            Rs. 15,000.00                       │  ║
║ │ Payment Method:    Bank Transfer                       │  ║
║ │ Submitted:         Mar 15, 2026 02:30 PM              │  ║
║ │                                                         │  ║
║ │ Member:            John Smith                          │  ║
║ │ Email:             john@example.com                    │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ REASON FOR REJECTION (Optional)                         │  ║
║ │                                                         │  ║
║ │ ┌───────────────────────────────────────────────────┐  │  ║
║ │ │ Receipt text is not clear. Please provide a      │  │  ║
║ │ │ clearer image showing transaction details and    │  │  ║
║ │ │ amount.                                           │  │  ║
║ │ │                                                   │  │  ║
║ │ │                                                   │  │  ║
║ │ └───────────────────────────────────────────────────┘  │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ ✗ This action will:                                     │  ║
║ │                                                         │  ║
║ │ • Mark payment as REJECTED                              │  ║
║ │ • Send rejection notification with reason               │  ║
║ │ • Member can resubmit with new receipt                  │  ║
║ │                                                         │  ║
║ │ Membership will remain in "Pending" status              │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║ ┌─────────────────────────────────────────────────────────┐  ║
║ │ [Cancel]  [✗ Reject Payment]                            │  ║
║ └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## User Receipt Upload Interface

### Initial State

```
╔═══════════════════════════════════════════════════════════════╗
║ UPLOAD BOOKING PAYMENT RECEIPT                                ║
║ Upload a clear image or PDF of your bank transfer receipt    ║
║ for the venue booking payment of Rs. 25,000                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ PAYMENT METHOD *                                              ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │ Bank Transfer                              ▼          │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║ RECEIPT FILE *                                                ║
║                                                               ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │                                                      │    ║
║ │              📤 UPLOAD                               │    ║
║ │                                                      │    ║
║ │     Click to upload or drag and drop                 │    ║
║ │                                                      │    ║
║ │     JPG, PNG, GIF, WebP or PDF up to 10MB           │    ║
║ │                                                      │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║ ⚠️ IMPORTANT:                                                 ║
║ Ensure the receipt clearly shows the transaction amount,     ║
║ payment method, date, and bank/payment service details.      ║
║                                                               ║
║ SUMMARY                                                       ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │ Payment Amount:    Rs. 25,000.00                      │    ║
║ │ Payment Method:    Bank Transfer                      │    ║
║ │ Status:            Awaiting Verification             │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │                      [Submit Receipt]                │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### After File Selected

```
╔═══════════════════════════════════════════════════════════════╗
║ UPLOAD BOOKING PAYMENT RECEIPT                                ║
║ Upload a clear image or PDF of your bank transfer receipt    ║
║ for the venue booking payment of Rs. 25,000                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ PAYMENT METHOD *                                              ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │ Bank Transfer                              ▼          │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║ RECEIPT FILE *                                                ║
║                                                               ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │  [RECEIPT IMAGE PREVIEW]                             │    ║
║ │  Shows the bank receipt image user selected          │    ║
║ │                                                      │    ║
║ │  ┌──────────────────────────────────────────────┐   │    ║
║ │  │                                              │   │    ║
║ │  │      [BANK RECEIPT PREVIEW IMAGE]            │   │    ║
║ │  │      Shows amount, date, reference #         │   │    ║
║ │  │                                              │   │    ║
║ │  └──────────────────────────────────────────────┘   │    ║
║ │                                                      │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║ ✓ FILE SELECTED: bank-transfer-2026-03-15.jpg (256 KB)       ║
║                                                         [✕]   ║
║                                                               ║
║ ⚠️ IMPORTANT:                                                 ║
║ Ensure the receipt clearly shows the transaction amount,     ║
║ payment method, date, and bank/payment service details.      ║
║                                                               ║
║ SUMMARY                                                       ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │ Payment Amount:    Rs. 25,000.00                      │    ║
║ │ Payment Method:    Bank Transfer                      │    ║
║ │ Status:            Awaiting Verification             │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║ ┌──────────────────────────────────────────────────────┐    ║
║ │                 [⏳ Uploading...]                    │    ║
║ └──────────────────────────────────────────────────────┘    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### After Successful Upload

```
Success Toast (Top Right):
┌──────────────────────────────────────────┐
│ ✓ Receipt uploaded successfully!         │
│   Awaiting admin verification.           │
└──────────────────────────────────────────┘

User sees: "Booking Created - Pending Payment Verification"
```

## Color Coding & Badges

### Status Badges
```
MEMBERSHIP:   [BLUE] Membership
BOOKING:      [PURPLE] Venue Booking  
ORDER:        [GREEN] Order

PAYMENT STATUSES:
[YELLOW] Pending
[GREEN] Completed
[RED] Rejected
```

## Notification Examples

### When User Submits Receipt
```
📧 Email Notification
Subject: Booking Payment Submitted
Body: Your booking payment receipt has been uploaded 
      and is pending admin verification.
      
🔔 In-app Notification
"Receipt uploaded successfully! Awaiting admin verification."
```

### When Admin Approves
```
📧 Email Notification
Subject: Booking Payment Approved ✓
Body: Your booking payment has been verified and approved.
      Your booking is now confirmed for March 20, 2026.
      
🔔 In-app Notification
"Booking Payment Approved - Your booking is now confirmed!"
```

### When Admin Rejects
```
📧 Email Notification
Subject: Booking Payment Rejected
Body: Your booking payment was rejected. 
      Reason: Receipt text is not clear. Please provide 
              a clearer image showing transaction details.
      
      Please resubmit with a new receipt image.
      
🔔 In-app Notification
"Payment Rejected - Please resubmit with clearer receipt"
```

---

## Report Example (Professional Format)

When exported/printed:

```
════════════════════════════════════════════════════════════════════
                    PAYMENT VERIFICATION REPORT
                    Old Wesleyites Sports Club
════════════════════════════════════════════════════════════════════

Report Date: March 15, 2026
Generated by: Admin Dashboard
Period: March 1 - March 15, 2026

────────────────────────────────────────────────────────────────────
SUMMARY
────────────────────────────────────────────────────────────────────

Total Pending Payments:         10
├── Membership Payments:         3
├── Booking Payments:            5
└── Order Payments:              2

Total Amount Pending:        Rs. 77,500.00
Avg. Amount per Payment:     Rs. 7,750.00

────────────────────────────────────────────────────────────────────
PENDING PAYMENTS DETAIL
────────────────────────────────────────────────────────────────────

1. MEMBERSHIP PAYMENT
   Member:         John Smith (ID: 123)
   Amount:         Rs. 15,000.00
   Payment Method: Bank Transfer
   Submitted:      Mar 15, 2026 02:30 PM
   Status:         Pending Verification
   Notes:          Clear receipt, ready to approve

2. BOOKING PAYMENT
   Member:         Sarah Williams (ID: 456)
   Venue:          Presidential Lounge
   Event Date:     Mar 20, 2026 06:00 PM
   Amount:         Rs. 25,000.00
   Payment Method: Card Payment
   Submitted:      Mar 15, 2026 01:45 PM
   Status:         Pending Verification
   Notes:          Requires closer review

3. ORDER PAYMENT
   Member:         Mike Johnson (ID: 789)
   Amount:         Rs. 3,500.00
   Payment Method: Online Payment
   Submitted:      Mar 15, 2026 12:15 PM
   Status:         Pending Verification

════════════════════════════════════════════════════════════════════
```

---

This visual guide shows exactly how professional the receipt system looks and functions for both users and admins.
