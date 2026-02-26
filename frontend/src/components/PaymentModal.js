import React, { useState, useEffect } from 'react';
import { getUnpaidInvoicesByVehicle } from '../api';

function PaymentModal({ 
  isOpen, 
  onClose, 
  vehicleId,
  onProcessPayment,
  paymentMethods = []
}) {
  const [vehicleData, setVehicleData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [invoicePaymentAmounts, setInvoicePaymentAmounts] = useState({});
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch invoices for the vehicle when modal opens
  useEffect(() => {
    if (isOpen && vehicleId) {
      fetchInvoicesForVehicle();
    } else {
      resetState();
    }
  }, [isOpen, vehicleId]);

  const fetchInvoicesForVehicle = async () => {
    setLoading(true);
    console.log('[PAYMENT MODAL] Fetching invoices for vehicleId:', vehicleId);
    try {
      const result = await getUnpaidInvoicesByVehicle(vehicleId);
      console.log('[PAYMENT MODAL] Full API Response:', result);
      console.log('[PAYMENT MODAL] Result data:', result.data);
      if (result.success) {
        const vehicleInfo = result.data?.vehicle;
        const invoicesList = result.data?.invoices || [];
        console.log('[PAYMENT MODAL] Vehicle Data:', vehicleInfo);
        console.log('[PAYMENT MODAL] Invoices:', invoicesList);
        console.log('[PAYMENT MODAL] Invoices length:', invoicesList.length);
        
        // Log first invoice if available
        if (invoicesList.length > 0) {
          console.log('[PAYMENT MODAL] First invoice:', invoicesList[0]);
          console.log('[PAYMENT MODAL] First invoice vehiclenumber:', invoicesList[0].vehiclenumber);
        }
        
        setVehicleData(vehicleInfo || {});
        setInvoices(invoicesList);
        setError(null);
      } else {
        console.error('[PAYMENT MODAL] API Error:', result.message);
        setError(result.message || 'Failed to fetch invoices');
      }
    } catch (err) {
      console.error('[PAYMENT MODAL] Exception:', err);
      console.error('[PAYMENT MODAL] Exception message:', err.message);
      console.error('[PAYMENT MODAL] Exception stack:', err.stack);
      setError('Error fetching invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setVehicleData(null);
    setInvoices([]);
    setSelectedPaymentMethod('');
    setPaymentAmount('');
    setInvoicePaymentAmounts({});
    setTransactionReference('');
    setNotes('');
    setError(null);
  };

  const handlePaymentAmountChange = (invoiceId, value) => {
    if (!value) {
      setInvoicePaymentAmounts(prev => ({
        ...prev,
        [invoiceId]: ''
      }));
      return;
    }

    const numValue = Number(value);
    const invoice = invoices.find(inv => inv.invoiceid === invoiceId);
    const maxAllowed = invoice.amounttobepaid || invoice.totalamount || invoice.amount || 0;

    // Cap allocation at invoice amount (no overpayment per invoice on UI)
    const finalValue = numValue > maxAllowed ? maxAllowed : numValue;

    setInvoicePaymentAmounts(prev => ({
      ...prev,
      [invoiceId]: finalValue
    }));
  };

  const handleTotalAmountChange = (value) => {
    setPaymentAmount(value);

    if (!value || Number(value) === 0) {
      setInvoicePaymentAmounts({});
      return;
    }

    const totalPayment = Number(value);
    let remainingAmount = totalPayment;
    const newAllocations = {};

    // Distribute amount across invoices sequentially, capping each at pending amount
    for (const invoice of invoices) {
      if (remainingAmount <= 0) break;
      
      const pendingAmount = Number(invoice.amounttobepaid) || Number(invoice.totalamount) || Number(invoice.amount) || 0;
      // Cap each allocation at pending amount
      const allocatedAmount = Math.min(remainingAmount, pendingAmount);
      
      newAllocations[invoice.invoiceid] = allocatedAmount;
      remainingAmount -= allocatedAmount;
    }

    setInvoicePaymentAmounts(newAllocations);
  };

  const handleProcessPayment = () => {
    const paymentData = {
      paymentMethod: selectedPaymentMethod,
      totalAmount: Number(paymentAmount),
      allocations: invoicePaymentAmounts,
      invoices: invoices.filter(inv => invoicePaymentAmounts[inv.invoiceid]),
      vehicleId: vehicleId,
      transactionReference: transactionReference,
      notes: notes
    };
    onProcessPayment(paymentData);
    handleClose();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isPaymentValid = paymentAmount && selectedPaymentMethod && Object.values(invoicePaymentAmounts).some(amt => amt);
  const totalPendingAmount = Number(
    invoices.reduce(
      (sum, inv) => sum + (Number(inv.amounttobepaid) || Number(inv.totalamount) || Number(inv.amount) || 0),
      0
    )
  );
  const remainingAmount = Number(
    totalPendingAmount - Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0)
  );
  const upiId = process.env.REACT_APP_UPI_ID || '';
  const upiPayeeName = process.env.REACT_APP_UPI_PAYEE_NAME || 'Project1NodeJS_Production';
  const qrPayload = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiPayeeName)}&am=${totalPendingAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Invoice Payment')}`
    : `PAY|INR|${totalPendingAmount.toFixed(2)}|Invoice Payment`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrPayload)}`;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: 24,
        width: '90%',
        maxWidth: 600,
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#666'
          }}
          title="Close"
        >
          ✕
        </button>

        {!vehicleId ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ color: '#d32f2f', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
              ⚠️ Missing Vehicle Information
            </div>
            <div style={{ color: '#666', marginBottom: 20 }}>
              This invoice does not have associated vehicle information. Payment cannot be processed.
            </div>
            <button
              onClick={handleClose}
              style={{
                padding: 10,
                background: '#999',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading invoices...</div>
        ) : error ? (
          <div style={{ padding: 20 }}>
            <div style={{ color: '#d32f2f', padding: 10, background: '#ffebee', borderRadius: 4, marginBottom: 20 }}>
              {error}
            </div>
            <button
              onClick={handleClose}
              style={{
                padding: 10,
                background: '#999',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {console.log('[PAYMENT MODAL RENDER] vehicleData:', vehicleData, 'invoices:', invoices.length, 'vehicleId prop:', vehicleId)}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>💳 Payment</h2>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                    | Vehicle: <span style={{ color: '#2196F3', fontSize: 16 }}>{vehicleData?.vehiclenumber || invoices[0]?.vehiclenumber || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>{invoices[0]?.customername || 'N/A'}, {invoices[0]?.phonenumber || 'N/A'}</span>, {vehicleData?.vehiclemodel ? `${vehicleData.vehiclemodel}${vehicleData?.vehiclecolor ? ` (${vehicleData.vehiclecolor})` : ''}` : 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Total and Pending Amount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, fontSize: 13, fontWeight: 600, color: '#333', paddingTop: 8, borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={qrImageUrl}
                    alt="Payment QR"
                    style={{ width: 92, height: 92, border: '1px solid #ddd', borderRadius: 6, padding: 4, background: '#fff' }}
                  />
                  <div style={{ fontSize: 11, color: '#555', lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 700, color: '#333' }}>Scan to Pay</div>
                    <div>Amount: ₹{totalPendingAmount.toFixed(2)}</div>
                    {!upiId && <div style={{ color: '#d97706' }}>Set REACT_APP_UPI_ID for direct UPI app payment</div>}
                  </div>
                </div>
                <div>
                  Total Pending: <span style={{ color: '#FF9800', fontSize: 14 }}>₹{totalPendingAmount.toFixed(2)}</span>
                </div>
                <div>
                  Remaining: <span style={{ color: '#2196F3', fontSize: 14 }}>₹{remainingAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* 80% Width Container for Form Fields */}
            <div style={{ width: '80%', margin: '0 auto' }}>
            {/* Payment Method Dropdown and Amount Input */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 15, alignItems: 'center' }}>
              {/* Payment Method Dropdown */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>Payment Method:</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={e => setSelectedPaymentMethod(e.target.value)}
                  style={{
                    flex: 1,
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 12,
                    backgroundColor: '#fff'
                  }}
                >
                  <option value="">-- Select Method --</option>
                  {paymentMethods.map(method => (
                    <option key={method.paymentmethodid} value={method.paymentmethodid}>
                      {method.methodname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Amount Input */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>Amount:</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={e => handleTotalAmountChange(e.target.value)}
                  style={{
                    flex: 1,
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 12,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Remaining Balance Display + Transaction Reference and Notes */}
            {paymentAmount && (
              <div style={{ display: 'flex', gap: 20, marginBottom: 15, alignItems: 'flex-start' }}>
                {/* Left: Balance Display */}
                <div style={{ flex: 1, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  <div style={{ marginBottom: 3, fontSize: 11 }}>Total Amount: <strong>₹{Number(paymentAmount).toFixed(2)}</strong></div>
                  <div style={{ marginBottom: 3, fontSize: 11 }}>Allocated: <strong>₹{Number(Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0)).toFixed(2)}</strong></div>
                  <div style={{ fontSize: 11 }}>Unallocated: <strong style={{ color: Number(paymentAmount) - Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0) < 0 ? '#d32f2f' : '#666' }}>₹{Number(Number(paymentAmount) - Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0)).toFixed(2)}</strong></div>
                </div>
                
                {/* Right: Transaction Reference and Notes */}
                <div style={{ flex: 1.2 }}>
                  {/* Transaction Reference - Label and Input in Same Line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <label style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', minWidth: 100 }}>Transaction Ref:</label>
                    <input
                      type="text"
                      placeholder="(Optional) Cheque/Reference number"
                      value={transactionReference}
                      onChange={e => setTransactionReference(e.target.value)}
                      style={{
                        flex: 1,
                        padding: 8,
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        fontSize: 12,
                        boxSizing: 'border-box',
                        minHeight: 9
                      }}
                    />
                  </div>

                  {/* Notes - Label and Textarea in Same Line */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <label style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', minWidth: 100, paddingTop: 8 }}>Notes:</label>
                    <textarea
                      placeholder="(Optional) Additional payment notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{
                        flex: 1,
                        padding: 8,
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        fontSize: 12,
                        boxSizing: 'border-box',
                        minHeight: 7,
                        fontFamily: 'Arial, sans-serif',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <p style={{ marginBottom: 10, color: '#666', fontSize: 12, fontWeight: 600 }}>Allocate payment to invoices:</p>
            
            {/* Invoices List with Individual Payment Inputs */}
            <div style={{ marginBottom: 15, border: '1px solid #ddd', borderRadius: 4, maxHeight: 300, overflowY: 'auto' }}>
              {/* Header Row */}
              <div style={{
                padding: 8,
                background: '#f9f9f9',
                borderBottom: '2px solid #ddd',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 6,
                fontWeight: 600,
                fontSize: 11,
                color: '#333'
              }}>
                <div>Invoice Number</div>
                <div style={{ textAlign: 'right' }}>Pending Amount</div>
                <div style={{ textAlign: 'right' }}>Pay Now</div>
              </div>
              
              {/* Data Rows */}
              {invoices.length === 0 ? (
                  <div style={{ padding: 15, textAlign: 'center', color: '#999', fontSize: 12 }}>
                  No pending invoices for this vehicle
                </div>
              ) : (
                invoices.map(invoice => (
                  <div
                    key={invoice.invoiceid}
                    style={{
                      padding: 8,
                      borderBottom: '1px solid #eee',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 6,
                      alignItems: 'center',
                      background: '#fff'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 11 }}>{invoice.invoicenumber}</div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#2196F3', fontWeight: 600 }}>
                      ₹{Number(invoice.amounttobepaid || invoice.totalamount || invoice.amount || 0).toFixed(2)}
                    </div>
                    <input
                      type="number"
                      placeholder="0"
                      value={invoicePaymentAmounts[invoice.invoiceid] || ''}
                      onChange={e => handlePaymentAmountChange(invoice.invoiceid, e.target.value)}
                      style={{
                        width: '100%',
                        padding: 5,
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        fontSize: 11,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: 8,
                  background: '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={!isPaymentValid}
                style={{
                  flex: 1,
                  padding: 8,
                  background: !isPaymentValid ? '#ccc' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: !isPaymentValid ? 'not-allowed' : 'pointer'
                }}
              >
                Process Payment
              </button>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentModal;
