const PDFDocument = require('pdfkit');

/**
 * Generates a PDF receipt and streams it to the response
 * @param {Object} payment - The payment record
 * @param {string} type - 'membership', 'booking', or 'order'
 * @param {Object} member - The member details
 * @param {Object} details - Additional details (e.g. venue name, order items)
 * @param {Object} res - Express response object
 */
function generateReceipt(payment, type, member, details, res) {
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${type}-${payment.id}.pdf`);

    doc.pipe(res);

    // --- Header ---
    doc.fontSize(24).font('Helvetica-Bold').text('OWSC', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Old Wesleyites Sports Club', { align: 'center' });
    doc.text('Guildford Crescent, Colombo 07', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // --- Receipt Info ---
    const startY = doc.y;
    doc.fontSize(12).font('Helvetica-Bold').text('OFFICIAL RECEIPT');
    doc.fontSize(10).font('Helvetica');

    doc.text(`Receipt No: ${type.toUpperCase().substring(0, 3)}-${payment.id.toString().padStart(6, '0')}`);
    doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString()}`);
    doc.text(`Status: ${payment.paymentStatus}`);

    // --- Bill To ---
    doc.font('Helvetica-Bold').text('Received From:', 300, startY);
    doc.font('Helvetica').text(member.fullName, 300, doc.y);
    doc.text(member.email, 300, doc.y);
    doc.text(`Member ID: ${member.id}`, 300, doc.y);

    doc.moveDown(2);

    // --- Line Items Header ---
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Amount (LKR)', 400, tableTop, { align: 'right' });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.font('Helvetica');

    // --- Content ---
    let description = '';
    if (type === 'membership') description = 'Membership Fee Payment';
    else if (type === 'booking') description = `Venue Booking Payment${details?.venue ? ` - ${details.venue.name}` : ''}`;
    else if (type === 'order') description = `Food & Beverage Order #${details?.id || payment.orderId}`;

    const amount = payment.amount || 0;

    doc.text(description, 50, tableTop + 30);
    doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), 400, tableTop + 30, { align: 'right' });

    // --- Total ---
    const totalY = tableTop + 60;
    doc.moveTo(350, totalY).lineTo(550, totalY).stroke();
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 300, totalY + 10, { align: 'right', width: 90 });
    doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), 400, totalY + 10, { align: 'right' });

    doc.fontSize(10).font('Helvetica');
    doc.text(`Payment Method: ${payment.paymentMethod || 'Unknown'}`, 50, totalY + 30);

    // --- Footer ---
    doc.moveDown(4);
    doc.fontSize(10).text('Thank you for your payment!', { align: 'center' });
    doc.text('This is a computer generated receipt.', { align: 'center', oblique: true });

    doc.end();
}

module.exports = { generateReceipt };
