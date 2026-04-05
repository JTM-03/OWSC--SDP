import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Calendar, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { paymentAPI, PaymentRecord } from "../api/payment";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

interface PaymentHistoryProps {
    onBack: () => void;
}

export function PaymentHistory({ onBack }: PaymentHistoryProps) {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<{ membership: PaymentRecord[], booking: PaymentRecord[], order: PaymentRecord[] }>({
        membership: [],
        booking: [],
        order: []
    });

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const data = await paymentAPI.getMyPayments();
                setPayments(data);
            } catch (error) {
                toast.error("Failed to load payment history");
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, []);

    const generateReceipt = async (payment: PaymentRecord, type: string) => {
        try {
            // Initiate download
            // We use standard window.location for download or fetch blob
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/payments/receipt/${type}/${payment.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to generate receipt');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Receipt-${type}-${payment.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Receipt downloaded successfully`);
        } catch (error) {
            toast.error("Failed to download receipt");
        }
    };

    const PaymentsTable = ({ data, type }: { data: PaymentRecord[], type: string }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No payment records found
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    {type === 'membership' && `Membership Payment`}
                                    {type === 'booking' && `Venue Booking #${payment.bookingId}`}
                                    {type === 'order' && `Food Order #${payment.orderId}`}
                                </TableCell>
                                <TableCell>{payment.paymentMethod}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        {payment.paymentStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    Rs. {payment.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => generateReceipt(payment, type)}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Receipt
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-primary text-white shadow-lg">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <img src={logo} alt="OWSC Logo" className="h-10 w-10 object-contain" />
                        <div>
                            <h1>Payment History</h1>
                            <p className="text-white/80 mt-1">View and download your payment receipts</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="all">All Payments</TabsTrigger>
                            <TabsTrigger value="venue">Venue Bookings</TabsTrigger>
                            <TabsTrigger value="food">Food Orders</TabsTrigger>
                            <TabsTrigger value="membership">Membership</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Recent Transactions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <PaymentsTable
                                        data={[...payments.membership, ...payments.booking, ...payments.order].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())}
                                        type="mixed"
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="venue">
                            <Card>
                                <CardHeader><CardTitle>Venue Booking Payments</CardTitle></CardHeader>
                                <CardContent><PaymentsTable data={payments.booking} type="booking" /></CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="food">
                            <Card>
                                <CardHeader><CardTitle>Food Order Payments</CardTitle></CardHeader>
                                <CardContent><PaymentsTable data={payments.order} type="order" /></CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="membership">
                            <Card>
                                <CardHeader><CardTitle>Membership Payments</CardTitle></CardHeader>
                                <CardContent><PaymentsTable data={payments.membership} type="membership" /></CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}
