import { useState } from "react";
import { Upload, FileCheck, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner@2.0.3";
import { paymentAPI } from "../api/payment";

interface ReceiptUploadProps {
    paymentType: 'membership' | 'booking' | 'order';
    entityId: number;
    amount: number;
    onSuccess?: (paymentId: number) => void;
    onCancel?: () => void;
    isOpen?: boolean;
    memberName?: string;
}

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ReceiptUpload({
    paymentType,
    entityId,
    amount,
    onSuccess,
    onCancel,
    isOpen = true,
    memberName
}: ReceiptUploadProps) {
    const [receipt, setReceipt] = useState<File | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            toast.error('Invalid file type. Please upload an image (JPG, PNG, GIF, WebP) or PDF.');
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error('File is too large. Maximum size is 10MB.');
            return;
        }

        setReceipt(file);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null);
        }

        toast.success('File selected successfully');
    };

    const handleUpload = async () => {
        if (!receipt) {
            toast.error('Please select a receipt file');
            return;
        }

        if (!paymentMethod) {
            toast.error('Please select a payment method');
            return;
        }

        setUploading(true);
        try {
            let response;

            switch (paymentType) {
                case 'membership':
                    response = await paymentAPI.uploadMembershipReceipt(entityId, {
                        amount,
                        paymentMethod,
                        receipt
                    });
                    break;
                case 'booking':
                    response = await paymentAPI.uploadBookingReceipt(entityId, {
                        amount,
                        paymentMethod,
                        receipt
                    });
                    break;
                case 'order':
                    response = await paymentAPI.uploadOrderReceipt(entityId, {
                        amount,
                        paymentMethod,
                        receipt
                    });
                    break;
            }

            toast.success('Receipt uploaded successfully! Awaiting admin verification.');
            if (onSuccess && response?.payment?.id) {
                onSuccess(response.payment.id);
            }

            // Reset form
            setReceipt(null);
            setPreviewUrl(null);
            setPaymentMethod('Bank Transfer');

        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Failed to upload receipt';
            toast.error(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    const getTitle = () => {
        switch (paymentType) {
            case 'membership': return 'Upload Membership Payment Receipt';
            case 'booking': return 'Upload Booking Payment Receipt';
            case 'order': return 'Upload Order Payment Receipt';
        }
    };

    const getDescription = () => {
        switch (paymentType) {
            case 'membership': return `Upload a clear image or PDF of your bank transfer receipt for the membership payment of Rs. ${amount.toLocaleString()}`;
            case 'booking': return `Upload a clear image or PDF of your bank transfer receipt for the venue booking payment of Rs. ${amount.toLocaleString()}`;
            case 'order': return `Upload a clear image or PDF of your payment receipt for the order of Rs. ${amount.toLocaleString()}`;
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto p-6">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold">{getTitle()}</h2>
                    <p className="text-gray-600 mt-2">{getDescription()}</p>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                    <Label htmlFor="paymentMethod" className="font-semibold">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger id="paymentMethod">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Card">Card Payment</SelectItem>
                            <SelectItem value="Online">Online Payment</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="eZCash">eZCash</SelectItem>
                            <SelectItem value="FriMi">FriMi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* File Upload Area */}
                <div className="space-y-3">
                    <Label className="font-semibold">Receipt File *</Label>

                    {receipt ? (
                        <div className="space-y-3">
                            {/* Preview for Images */}
                            {previewUrl && (
                                <div className="bg-gray-100 rounded-lg overflow-hidden">
                                    <img
                                        src={previewUrl}
                                        alt="Receipt preview"
                                        className="w-full h-auto max-h-64 object-contain"
                                    />
                                </div>
                            )}

                            {/* File Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                <FileCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold text-blue-900">{receipt.name}</p>
                                    <p className="text-sm text-blue-700">
                                        {(receipt.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setReceipt(null);
                                        setPreviewUrl(null);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Remove file"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
                            <input
                                type="file"
                                onChange={handleFileSelect}
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                className="hidden"
                                id="receipt-input"
                            />
                            <label htmlFor="receipt-input" className="cursor-pointer block">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="font-semibold text-gray-900">Click to upload or drag and drop</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    JPG, PNG, GIF, WebP or PDF up to 10MB
                                </p>
                            </label>
                        </div>
                    )}
                </div>

                {/* Information Alert */}
                <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-sm">
                        <strong>Important:</strong> Ensure the receipt clearly shows the transaction amount, payment method, date, and bank/payment service details. Your receipt will be reviewed by admin for verification.
                    </AlertDescription>
                </Alert>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Payment Amount:</span>
                        <span className="font-semibold">Rs. {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-semibold">{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-semibold text-amber-600">Awaiting Verification</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4">
                    {onCancel && (
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleUpload}
                        disabled={!receipt || uploading}
                        className="gap-2"
                    >
                        {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {uploading ? 'Uploading...' : 'Submit Receipt'}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
