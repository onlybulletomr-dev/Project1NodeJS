/**
 * Centralized Invoice Print Template Generator
 * Used by both InvoiceForm and InvoiceList components
 */

const safe = (value) => (value ?? '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const generateInvoicePrintTemplate = (invoiceData) => {
  const {
    invoiceNumber,
    invoiceDate,
    vehicleNumber,
    vehicleModel,
    vehicleColor,
    jobCard,
    customerName,
    area,
    phoneNumber,
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    odometer,
    notes,
    items,
    total,
  } = invoiceData;

  // Calculate service due date (current date + 4 months)
  const serviceDueDate = new Date();
  serviceDueDate.setMonth(serviceDueDate.getMonth() + 4);
  const serviceDueDateStr = serviceDueDate.toLocaleDateString('en-GB');

  // Calculate service due KMS (current KMS + 4000)
  const odometerValue = parseInt(odometer || 0);
  const serviceDueKms = odometerValue + 4000;

  // Create rows HTML
  const itemList = items || [];
  const rowsHtml = itemList.map((item) => `
    <tr>
      <td>${safe(item.partnumber || item.servicenumber || item.itemid || item.ItemNumber || '')}</td>
      <td>${safe(item.description || item.itemname || item.servicename || item.ItemName || '')}</td>
      <td style="text-align:right;">${Number(item.quantity || item.qty || item.Qty || 0).toFixed(0)}</td>
      <td style="text-align:right;">₹${Number(item.rate || item.unitPrice || item.UnitPrice || 0).toFixed(0)}</td>
      <td style="text-align:right;">₹${Number(item.amount || item.linetotal || item.Total || (Number(item.quantity || item.qty || item.Qty || 0) * Number(item.rate || item.unitPrice || item.UnitPrice || 0))).toFixed(0)}</td>
    </tr>
  `).join('');

  // Pad rows to 18 total
  const blankRowsHtml = Array.from({ length: Math.max(0, 18 - itemList.length) })
    .map(() => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>')
    .join('');

  const totalAmount = Number(total || 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${safe(invoiceNumber)}</title>
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #ebebeb; color: #111; }
          .page { width: 210mm; height: 297mm; margin: 12px auto; background: #fff; display: flex; flex-direction: column; }
          .header-section { height: 25%; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; }
          .logo-center { text-align: center; flex: 1; }
          .logo { font-size: 32px; font-weight: 700; letter-spacing: 1px; }
          .left-info { flex: 0.95; font-size: 9px; line-height: 1.3; }
          .right-info { flex: 1.05; font-size: 9px; line-height: 1.3; text-align: left; padding-left: 8px; }
          .right-info-line { margin-bottom: 2px; min-height: 12px; }
          .empty-line { height: 12px; }
          .content-section { height: 50%; padding: 15px 20px; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          thead th { background: #6a6a6a; color: #fff; border-left: 1px solid #666; border-right: 1px solid #666; border-top: 1px solid #666; border-bottom: 1px solid #666; padding: 4px 3px; text-align: center; font-weight: 600; }
          tbody td { border-left: 1px solid #666; border-right: 1px solid #666; padding: 3px 5px; }
          tbody tr:nth-child(odd) { background: #fff; }
          tbody tr:nth-child(even) { background: #f9f9f9; }
          tbody tr:last-child td { border-bottom: 1px solid #666; }
          .col-item { width: 10%; text-align: left; }
          .col-desc { width: 50%; text-align: left; }
          .col-qty { width: 8%; text-align: center; }
          .col-rate { width: 12%; text-align: right; }
          .col-total { width: 12%; text-align: right; }
          .footer-section { height: 25%; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #000; gap: 15px; }
          .notes-area { flex: 0.8; font-size: 9px; line-height: 1.3; white-space: pre-wrap; }
          .qr-middle { width: 140px; text-align: center; display: flex; flex-direction: column; align-items: center; }
          .qr-area img { width: 110px; height: 110px; border: 1px solid #999; margin-bottom: 4px; }
          .qr-text { font-size: 7px; line-height: 1.2; text-align: center; }
          .totals-area { flex: 0.8; font-size: 10px; text-align: right; }
          .totals-line { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 600; gap: 30px; }
          @media print {
            body { background: #fff; }
            .page { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- HEADER SECTION (25%) -->
          <div class="header-section">
            <div class="left-info">
              ${companyAddress}
              ${companyEmail ? `<div style="margin-top: 4px;">${safe(companyEmail)}</div>` : ''}
              ${companyPhone ? `<div>${safe(companyPhone)}</div>` : ''}
              <div style="margin-top: 4px;"><strong>${safe(customerName)}</strong></div>
              <div>${safe(area)}</div>
              <div>${safe(phoneNumber)}</div>
            </div>
            <div class="logo-center">
              <div class="logo">● ${safe(companyName)}</div>
            </div>
            <div class="right-info">
              <div class="right-info-line">${safe(invoiceDate)}</div>
              <div class="right-info-line">${safe(invoiceNumber)}</div>
              <div class="right-info-line">${safe(vehicleNumber)}</div>
              <div class="right-info-line">${safe(vehicleModel)}</div>
              <div class="right-info-line">${safe(vehicleColor)}</div>
              <div class="right-info-line">${safe(jobCard)}</div>
              <div class="right-info-line" style="min-height: 1px; margin: 2px 0;"></div>
              <div class="right-info-line">Service due</div>
              <div class="right-info-line">${safe(serviceDueDateStr)}</div>
              <div class="right-info-line">${odometerValue > 0 ? safe(serviceDueKms.toString()) : '-'} kms</div>
            </div>
          </div>

          <!-- CONTENT SECTION (50%) -->
          <div class="content-section">
            <table>
              <thead>
                <tr>
                  <th class="col-item">Item</th>
                  <th class="col-desc">Description</th>
                  <th class="col-qty">Qty</th>
                  <th class="col-rate">Unit Price</th>
                  <th class="col-total">Total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}${blankRowsHtml}</tbody>
            </table>
          </div>

          <!-- FOOTER SECTION (25%) -->
          <div class="footer-section">
            <div class="notes-area">
ODO : ${safe(odometer)} Kms

Observation:
${safe(notes)}
            </div>
            <div class="qr-middle">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`PAY|INR|${totalAmount.toFixed(2)}|${invoiceNumber}`)}" alt="QR" />
              <div class="qr-text">Pay ₹${Number(totalAmount).toFixed(0)}
ONLY BULLET
A/C: 344002000285538
IFSC: IOBA0003400</div>
            </div>
            <div class="totals-area">
              <div class="totals-line">
                <span>Total</span>
                <span>₹${Number(totalAmount).toFixed(0)}</span>
              </div>
              <div class="totals-line">
                <span>Adv. Paid</span>
                <span>₹0</span>
              </div>
              <div class="totals-line">
                <span>Balance Due</span>
                <span>₹${Number(totalAmount).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return { html, invoiceNumber };
};

export const openPrintWindow = (html, invoiceNumber) => {
  const printWindow = window.open('', '_blank', 'width=980,height=1200');
  if (!printWindow) {
    alert('Popup blocked. Please allow popups to print invoice.');
    return null;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 250);

  return printWindow;
};
