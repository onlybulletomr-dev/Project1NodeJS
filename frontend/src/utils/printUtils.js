/**
 * Centralized Invoice Print Template Generator
 * Used by both InvoiceForm and InvoiceList components
 */

const safe = (value) => (value ?? '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const generateInvoicePrintTemplate = (invoiceData, source = 'form') => {
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
    branchAddress,
    companyLogo,
    bankName,
    bankAccount,
    bankIFSC,
    odometer,
    notes,
    items,
    total,
    subtotal = 0,
    tax = 0,
    discount = 0,
    paidAmount = 0,
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
  const discountAmount = Number(discount || 0);
  const paidAmountValue = Number(paidAmount || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmountValue);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${safe(invoiceNumber)}</title>
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #ebebeb; color: #111; }
          .page { width: 210mm; height: 297mm; margin: 12px auto; background: #fff; display: flex; flex-direction: column; border: 2px solid #000; }
          .header-section { height: 25%; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; }
          .logo-center { text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 5px; }
          .logo { font-size: 32px; font-weight: 700; letter-spacing: 2px; }
          .logo-company { display: none; }
          .company-logo { max-width: 100px; max-height: 100px; object-fit: contain; }
          .branch-info { flex: 0.95; font-size: 11px; line-height: 1.3; }
          .right-info { flex: 1.05; font-size: 11px; line-height: 1.3; text-align: left; padding-left: 8px; }
          .right-info-line { margin-bottom: 2px; min-height: 12px; }
          .empty-line { height: 12px; }
          .content-section { height: 50%; padding: 15px 20px; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          thead th { background: #6a6a6a; color: #fff; border-left: 1px solid #666; border-right: 1px solid #666; border-top: 1px solid #666; border-bottom: 1px solid #666; padding: 4px 3px; text-align: center; font-weight: 700; font-size: 12px; }
          tbody td { border-left: 1px solid #666; border-right: 1px solid #666; padding: 3px 5px; }
          tbody tr:nth-child(odd) { background: #fff; }
          tbody tr:nth-child(even) { background: #f9f9f9; }
          tbody tr:last-child td { border-bottom: 1px solid #666; }
          .col-item { width: 10%; text-align: left; }
          .col-desc { width: 50%; text-align: left; }
          .col-qty { width: 8%; text-align: center; }
          .col-rate { width: 12%; text-align: right; }
          .col-total { width: 12%; text-align: right; }
          .footer-section { height: 25%; padding: 15px 20px; display: flex; justify-content: space-between; align-items: flex-start; border-top: 2px solid #000; gap: 15px; }
          .notes-area { flex: 0.8; font-size: 11px; line-height: 1.3; white-space: pre-wrap; }
          .qr-middle { width: 140px; text-align: center; display: flex; flex-direction: column; align-items: center; }
          .qr-area img { width: 110px; height: 110px; border: 1px solid #999; margin-bottom: 4px; }
          .qr-text { font-size: 11px; line-height: 1.2; text-align: center; }
          .totals-area { flex: 0.8; font-size: 14px; text-align: right; }
          .totals-line { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: 600; gap: 20px; line-height: 1.2; font-size: 14px; }
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
            <div class="branch-info">
              <div><strong>${safe(companyName || 'ONLY BULLET')}</strong></div>
              ${branchAddress ? `<div>${safe(branchAddress)}</div>` : ''}
              ${companyAddress ? `<div>${safe(companyAddress)}</div>` : ''}
              ${companyEmail ? `<div style="margin-top: 4px;">${safe(companyEmail)}</div>` : ''}
              ${companyPhone ? `<div>${safe(companyPhone)}</div>` : ''}
              ${customerName ? `<div style="margin-top: 6px; border-top: 1px solid #ccc; padding-top: 4px;"><strong>${safe(customerName)}</strong></div>` : ''}
              ${area ? `<div>${safe(area)}</div>` : ''}
              ${phoneNumber ? `<div>${safe(phoneNumber)}</div>` : ''}
            </div>
            <div class="logo-center">
              ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" class="company-logo" />` : '<div class="logo">OB</div>'}
            </div>
            <div class="right-info">
              <div class="right-info-line"><strong>${safe(invoiceDate)}</strong></div>
              <div class="right-info-line"><strong>${safe(invoiceNumber)}</strong></div>
              <div class="right-info-line">${safe(vehicleNumber)}</div>
              <div class="right-info-line">${safe(vehicleModel)}</div>
              <div class="right-info-line">${safe(vehicleColor)}</div>
              <div class="right-info-line">${safe(jobCard)}</div>
              <div class="right-info-line" style="min-height: 1px; margin: 2px 0;"></div>
              <div class="right-info-line"><strong>Service due</strong></div>
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

            </div>
            <div class="totals-area">
              <div class="totals-line">
                <span>Total</span>
                <span>₹${Number(totalAmount).toFixed(0)}</span>
              </div>
              <div class="totals-line">
                <span>Discount</span>
                <span>₹${Number(discountAmount).toFixed(0)}</span>
              </div>
              <div class="totals-line">
                <span>Adv. Paid</span>
                <span>₹${Number(paidAmountValue).toFixed(0)}</span>
              </div>
              <div class="totals-line">
                <span>Balance Due</span>
                <span>₹${Number(balanceDue).toFixed(0)}</span>
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

/**
 * Centralized print function - used by both InvoiceList and InvoiceForm
 * Fetches company config and generates print window
 */
export const printInvoiceWithConfig = async (invoiceData, companyId, API_BASE_URL) => {
  try {
    // Fetch company config
    console.log('Fetching company config for ID:', companyId);
    const configResponse = await fetch(`${API_BASE_URL}/companies/${companyId}/config`);
    const configResult = await configResponse.json();
    const config = configResult.data || {};
    
    console.log('Company config received:', config);

    // Build address string
    const branchAddressStr = [
      config.addressline1,
      config.addressline2,
      config.city
    ].filter(line => line && line.trim()).join(', ');

    // Merge config data with invoice data
    const completeInvoiceData = {
      ...invoiceData,
      companyName: config.companyname || invoiceData.companyName || 'ONLY BULLET',
      branchAddress: branchAddressStr || invoiceData.branchAddress || '',
      companyLogo: config.logoimagepath || invoiceData.companyLogo || '',
      companyEmail: config.emailaddress || invoiceData.companyEmail || 'info@onlybullet.com',
      companyPhone: config.phonenumber1 || invoiceData.companyPhone || '-',
    };

    console.log('Complete invoice data for print:', completeInvoiceData);

    // Generate HTML and open print
    const { html } = generateInvoicePrintTemplate(completeInvoiceData, 'unified');
    openPrintWindow(html, completeInvoiceData.invoiceNumber);
  } catch (error) {
    console.error('Error in printInvoiceWithConfig:', error);
    // Fallback: print with whatever data is available
    const { html } = generateInvoicePrintTemplate(invoiceData, 'unified');
    openPrintWindow(html, invoiceData.invoiceNumber);
  }
};
