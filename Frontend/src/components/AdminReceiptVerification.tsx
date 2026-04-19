import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Loader2, CheckCircle2, XCircle, Download, Eye } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { paymentAPI, PaymentRecord } from "../api/payment";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { getFileUrl, getImageUrl } from "../utils/image";

interface PendingPayment extends PaymentRecord {
    type: 'membership' | 'booking' | 'order';
}

export function AdminReceiptVerification() {
    const [loading, setLoading] = useState(true);
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'view'>('view');

    useEffect(() => {
        fetchPendingPayments();
    }, []);

    const fetchPendingPayments = async () => {
        try {
            setLoading(true);
            const data = await paymentAPI.getPendingPayments();
            
            // Flatten the response into a single array with type indicators
            const all: PendingPayment[] = [
                ...data.membership.map(p => ({ ...p, type: 'membership' as const })),
                ...data.booking.map(p => ({ ...p, type: 'booking' as const })),
                ...data.order.map(p => ({ ...p, type: 'order' as const }))
            ];
            
            // Sort by payment date (newest first)
            all.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
            
            setPendingPayments(all);
        } catch (error) {
            toast.error("Failed to fetch pending payments");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPayment = async () => {
        if (!selectedPayment) return;

        try {
            setVerifying(true);
            const approved = actionType === 'approve';

            await paymentAPI.verifyPayment(
                selectedPayment.type,
                selectedPayment.id,
                approved,
                rejectionReason
            );

            toast.success(`Payment ${approved ? 'approved' : 'rejected'} successfully`);
            setShowModal(false);
            setRejectionReason("");
            setSelectedPayment(null);

            // Refresh the list
            await fetchPendingPayments();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to verify payment");
        } finally {
            setVerifying(false);
        }
    };

    const openModal = (payment: PendingPayment, action: 'approve' | 'reject' | 'view') => {
        setSelectedPayment(payment);
        setActionType(action);
        setRejectionReason("");
        setShowModal(true);
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'membership': return 'Membership';
            case 'booking': return 'Venue Booking';
            case 'order': return 'Order';
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'membership': return 'bg-blue-100 text-blue-800';
            case 'booking': return 'bg-purple-100 text-purple-800';
            case 'order': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Pending Memberships</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {pendingPayments.filter(p => p.type === 'membership').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Pending Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">
                            {pendingPayments.filter(p => p.type === 'booking').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Pending Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {pendingPayments.filter(p => p.type === 'order').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Payments List */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Receipts Awaiting Verification</CardTitle>
                    <CardDescription>
                        Review and approve/reject member payment receipts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingPayments.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <p className="text-gray-600">All payment receipts have been verified!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingPayments.map((payment) => (
                                <div
                                    key={`${payment.type}-${payment.id}`}
                                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {/* Left Content */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <Badge className={getTypeColor(payment.type)}>
                                                {getTypeLabel(payment.type)}
                                            </Badge>
                                            {payment.member && (
                                                <span className="font-semibold">{payment.member.fullName}</span>
                                            )}
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>
                                                <span className="font-medium">Amount:</span> {formatCurrency(payment.amount)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Payment Method:</span> {payment.paymentMethod}
                                            </p>
                                            <p>
                                                <span className="font-medium">Submitted:</span> {formatDate(payment.paymentDate)}
                                            </p>

                                            {/* Type-specific details */}
                                            {payment.type === 'booking' && payment.booking && (
                                                <p>
                                                    <span className="font-medium">Venue:</span> {payment.booking.venue.name} ({formatDate(payment.booking.bookingDate)})
                                                </p>
                                            )}

                                            {payment.member && (
                                                <p>
                                                    <span className="font-medium">Email:</span> {payment.member.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Actions */}
                                    <div className="flex gap-2 ml-4">
                                        {payment.receiptUrl && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openModal(payment, 'view')}
                                                    title="View receipt"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <a
                                                    href={getFileUrl(payment.receiptUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download
                                                    className="inline-flex items-center justify-center h-9 w-9 px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium"
                                                    title="Download receipt"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </>
                                        )}
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => openModal(payment, 'approve')}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => openModal(payment, 'reject')}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'view' && 'View Receipt'}
                            {actionType === 'approve' && 'Approve Payment'}
                            {actionType === 'reject' && 'Reject Payment'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedPayment && `${getTypeLabel(selectedPayment.type)} Payment from ${selectedPayment.member?.fullName}`}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPayment && (
                        <div className="space-y-6">
                            {/* Payment Details */}
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <h3 className="font-semibold">Payment Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Type:</span>
                                        <p className="font-medium">{getTypeLabel(selectedPayment.type)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Amount:</span>
                                        <p className="font-medium">{formatCurrency(selectedPayment.amount)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Payment Method:</span>
                                        <p className="font-medium">{selectedPayment.paymentMethod}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Submitted:</span>
                                        <p className="font-medium">{formatDate(selectedPayment.paymentDate)}</p>
                                    </div>
                                    {selectedPayment.member && (
                                        <>
                                            <div>
                                                <span className="text-gray-600">Member:</span>
                                                <p className="font-medium">{selectedPayment.member.fullName}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Email:</span>
                                                <p className="font-medium text-sm">{selectedPayment.member.email}</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Booking specific info */}
                                {selectedPayment.type === 'booking' && selectedPayment.booking && (
                                    <div className="border-t pt-3">
                                        <span className="text-gray-600">Venue Details:</span>
                                        <p className="font-medium">{selectedPayment.booking.venue.name}</p>
                                        <p className="text-sm text-gray-600">{formatDate(selectedPayment.booking.bookingDate)}</p>
                                    </div>
                                )}
                            </div>

                            {/* Receipt Preview */}
                            {selectedPayment.receiptUrl && actionType === 'view' && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold">Receipt Image</h3>
                                    <div className="bg-gray-100 rounded-lg overflow-hidden">
                                        <img
                                            src={getImageUrl(selectedPayment.receiptUrl) || undefined}
                                            alt="Payment receipt"
                                            className="w-full max-h-96 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <a
                                        href={getFileUrl(selectedPayment.receiptUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="text-primary hover:underline text-sm"
                                    >
                                        Download Full Image
                                    </a>
                                </div>
                            )}

                            {/* Rejection Reason Field */}
                            {actionType === 'reject' && (
                                <div className="space-y-3">
                                    <Label htmlFor="reason">Reason for Rejection (Optional)</Label>
                                    <Textarea
                                        id="reason"
                                        placeholder="Explain why you're rejecting this payment (member will be notified)"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="min-h-24"
                                    />
                                </div>
                            )}

                            {/* Confirmation Message */}
                            {actionType === 'approve' && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-green-800">
                                        The payment will be marked as <strong>Completed</strong> and the member will be notified.
                                    </p>
                                    {selectedPayment.type === 'membership' && (
                                        <p className="text-green-800 mt-2">The membership will be <strong>activated</strong>.</p>
                                    )}
                                    {selectedPayment.type === 'booking' && (
                                        <p className="text-green-800 mt-2">The booking will be <strong>confirmed</strong>.</p>
                                    )}
                                    {selectedPayment.type === 'order' && (
                                        <p className="text-green-800 mt-2">The order will move to <strong>Preparing</strong> status.</p>
                                    )}
                                </div>
                            )}

                            {actionType === 'reject' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-800">
                                        The payment will be marked as <strong>Rejected</strong> and the member will be notified.
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {actionType !== 'view' && (
                                <div className="flex gap-3 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowModal(false)}
                                        disabled={verifying}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleVerifyPayment}
                                        disabled={verifying}
                                        className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                                        variant={actionType === 'reject' ? 'destructive' : 'default'}
                                    >
                                        {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
