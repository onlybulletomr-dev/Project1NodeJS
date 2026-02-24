import React, { useState, useEffect } from 'react';
import { getUnpaidInvoices, getPaymentSummary, updatePaymentStatus, getPaymentMethods, recordAdvancePayment } from '../api';
import PaymentModal from './PaymentModal';
import '../styles/Payment.css';

function Payment() {
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  useEffect(() => {
    fetchUnpaidInvoices();
    fetchPaymentSummary();
    fetchPaymentMethods();
  }, []);

  const fetchUnpaidInvoices = async () => {
    setLoading(true);
    try {
      const result = await getUnpaidInvoices();
      if (result.success) {
        setUnpaidInvoices(result.data || []);
        setError(null);
      } else {
        setError(result.message || 'Failed to load invoices');
      }
    } catch (err) {
      setError('Error fetching invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSummary = async () => {
    try {
      const result = await getPaymentSummary();
      if (result.success) {
        setPaymentSummary(result.data);
      }
    } catch (err) {
      console.error('Error fetching payment summary:', err);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const result = await getPaymentMethods();
      if (result.success) {
        setPaymentMethods(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }
  };

  const handlePayment = (invoice) => {
    if (!invoice.vehicleid) {
      setError('Error: Vehicle information not found for this invoice. Cannot process payment.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setSelectedInvoiceForPayment(null);
  };

  const handleProcessPaymentFromModal = async (paymentData) => {
    if (!paymentData || !paymentData.invoices || paymentData.invoices.length === 0) return;

    try {
      // Update all invoices that received payment allocation with payment details
      const paymentDate = new Date().toISOString().split('T')[0];
      
      console.log('[PAYMENT DEBUG] Payment Data:', {
        totalAmount: paymentData.totalAmount,
        vehicleId: paymentData.vehicleId,
        allocations: paymentData.allocations,
        invoiceCount: paymentData.invoices.length
      });
      
      // Calculate total allocated across all invoices
      const allocatedTotal = Object.values(paymentData.allocations).reduce(
        (sum, amt) => sum + (Number(amt) || 0), 0
      );
      
      // Calculate advance amount (if any)
      const advanceAmount = Math.max(0, paymentData.totalAmount - allocatedTotal);
      
      console.log('[PAYMENT DEBUG] Advance Calculation:', {
        totalAmount: paymentData.totalAmount,
        allocatedTotal: allocatedTotal,
        advanceAmount: advanceAmount
      });

      const updatePromises = paymentData.invoices.map(invoice => 
        updatePaymentStatus(invoice.invoiceid, {
          PaymentStatus: 'Paid',
          PaymentDate: paymentDate,
          // Send the ALLOCATION amount for this specific invoice (not total)
          PaymentMethodID: paymentData.paymentMethod,
          Amount: paymentData.allocations[invoice.invoiceid],
          TransactionReference: paymentData.transactionReference,
          Notes: paymentData.notes
        })
      );

      const results = await Promise.all(updatePromises);
      console.log('[PAYMENT DEBUG] Invoice update results:', results);
      
      // Check if all updates were successful
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        // If there's an advance amount, create it as a separate record
        if (advanceAmount > 0) {
          try {
            console.log('[PAYMENT DEBUG] Creating advance payment record:', {
              amount: advanceAmount,
              paymentmethodid: paymentData.paymentMethod,
              paymentdate: paymentDate
            });
            
            // Get the first invoice's ID to link to vehicle (ensures valid vehicle ID from database)
            const firstInvoiceId = paymentData.invoices[0]?.invoiceid || null;
            
            const advanceResult = await recordAdvancePayment({
              invoiceid: firstInvoiceId,  // Use invoice ID to get vehicle ID from database
              amount: advanceAmount,
              paymentmethodid: paymentData.paymentMethod,
              paymentdate: paymentDate,
              transactionreference: paymentData.transactionReference,
              notes: `Advance payment from overpayment across ${paymentData.invoices.length} invoice(s)`
            });
            
            console.log('[PAYMENT DEBUG] Advance result:', advanceResult);
            
            if (!advanceResult.success) {
              console.warn('[PAYMENT ERROR] Failed to record advance payment, but invoice payments succeeded');
            } else {
              console.log('[PAYMENT DEBUG] Advance payment recorded successfully');
            }
          } catch (advError) {
            console.error('[PAYMENT ERROR] Error creating advance payment:', advError);
            // Don't fail the entire operation if advance creation fails
          }
        } else {
          console.log('[PAYMENT DEBUG] No advance amount to record');
        }

        const invoiceCount = paymentData.invoices.length;
        const advanceText = advanceAmount > 0 ? ` with ₹${advanceAmount.toFixed(2)} advance` : '';
        setSuccess(`${invoiceCount} invoice(s) marked as paid successfully${advanceText}!`);
        
        // Refresh the list
        fetchUnpaidInvoices();
        fetchPaymentSummary();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Some invoices failed to update. Please try again.');
      }
    } catch (err) {
      setError('Error updating payment: ' + err.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="payment-container">
      <h2>Payment Management</h2>

      {/* Payment Summary Cards */}
      {paymentSummary && (
        <div className="payment-summary">
          <div className="summary-card paid">
            <h3>Paid Invoices</h3>
            <p className="count">{paymentSummary.paidcount || 0}</p>
            <p className="amount">{formatCurrency(paymentSummary.paidamount || 0)}</p>
          </div>
          <div className="summary-card unpaid">
            <h3>Pending Invoices</h3>
            <p className="count">{paymentSummary.unpaidcount || 0}</p>
            <p className="amount">{formatCurrency(paymentSummary.unpaidamount || 0)}</p>
          </div>
          <div className="summary-card partial">
            <h3>Partial Payments</h3>
            <p className="count">{paymentSummary.partialcount || 0}</p>
            <p className="amount">{formatCurrency(paymentSummary.partialamount || 0)}</p>
          </div>
          <div className="summary-card total">
            <h3>Total Amount</h3>
            <p className="amount">{formatCurrency(paymentSummary.totalamount || 0)}</p>
          </div>
        </div>
      )}

      {/* Error and Success Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Loading State */}
      {loading && <div className="loading">Loading invoices...</div>}

      {/* Unpaid & Partially Paid Invoices Table */}
      {!loading && (
        <div className="invoices-section">
          <h3>Pending Invoices ({unpaidInvoices.length})</h3>
          {unpaidInvoices.length === 0 ? (
            <p className="no-data">No pending invoices found.</p>
          ) : (
            <div className="table-responsive">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Vehicle Number</th>
                    <th>Customer Name</th>
                    <th>Phone Number</th>
                    <th>Invoice Amount</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Invoice Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidInvoices.map((invoice) => (
                    <tr key={invoice.invoiceid}>
                      <td className="invoice-number">{invoice.invoicenumber}</td>
                      <td>{invoice.vehiclenumber}</td>
                      <td>{invoice.customername}</td>
                      <td>{invoice.phonenumber}</td>
                      <td className="amount-cell">{formatCurrency(invoice.totalamount)}</td>
                      <td className="amount-cell amount-paid">{formatCurrency(invoice.amountpaid || 0)}</td>
                      <td className="amount-cell amount-pending">{formatCurrency(invoice.amounttobepaid || 0)}</td>
                      <td>{formatDate(invoice.createdat)}</td>
                      <td className="action-cell">
                        <button
                          className="pay-button"
                          onClick={() => handlePayment(invoice)}
                        >
                          Pay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentModalClose}
        vehicleId={selectedInvoiceForPayment?.vehicleid}
        onProcessPayment={handleProcessPaymentFromModal}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}

export default Payment;
