-- Add receiptUrl column to MembershipPayment table if it doesn't exist
ALTER TABLE "MembershipPayment"
ADD COLUMN IF NOT EXISTS "ReceiptUrl" TEXT;

-- Add receiptUrl column to OrderPayment table if it doesn't exist
ALTER TABLE "OrderPayment"
ADD COLUMN IF NOT EXISTS "ReceiptUrl" TEXT;

-- BookingPayment already has ReceiptUrl from previous changes
-- Verify by running: SELECT column_name FROM information_schema.columns WHERE table_name = 'BookingPayment' AND column_name = 'ReceiptUrl';
