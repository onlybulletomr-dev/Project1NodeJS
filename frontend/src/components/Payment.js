import React, { useState, useEffect } from 'react';
import { getPaymentInvoicesByStatus, getPaymentSummary, updatePaymentStatus, getPaymentMethods, recordAdvancePayment } from '../api';
import PaymentModal from './PaymentModal';
import '../styles/Payment.css';

function Payment() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('Unpaid');
  const [sortField, setSortField] = useState('createdat');
  const [sortDirection, setSortDirection] = useState('desc');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  useEffect(() => {
    fetchPaymentSummary();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    fetchInvoicesByStatus(selectedStatus);
  }, [selectedStatus]);

  const fetchInvoicesByStatus = async (statusValue) => {
    setLoading(true);
    try {
      const result = await getPaymentInvoicesByStatus(statusValue);
      if (result.success) {
        setInvoices(result.data || []);
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
    console.log('[PAYMENT] handlePayment called with invoice:', invoice);
    console.log('[PAYMENT] Invoice vehicleid:', invoice.vehicleid);
    if (!invoice.vehicleid) {
      setError('Error: Vehicle information not found for this invoice. Cannot process payment.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    console.log('[PAYMENT] Setting selected invoice and opening modal');
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
        fetchInvoicesByStatus(selectedStatus);
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
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const toDateOnly = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const toSortableValue = (row, field) => {
    switch (field) {
      case 'totalamount':
      case 'amountpaid':
      case 'amounttobepaid':
      case 'paymentamount':
        return Number(row[field] || 0);
      case 'createdat':
      case 'paymentdate':
        return toDateOnly(row[field] || row.invoicepaymentdate || '');
      default:
        return (row[field] || '').toString().toLowerCase();
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    const left = toSortableValue(a, sortField);
    const right = toSortableValue(b, sortField);

    if (left < right) return sortDirection === 'asc' ? -1 : 1;
    if (left > right) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusLabel = () => {
    if (selectedStatus === 'Paid') return 'Paid Invoices';
    if (selectedStatus === 'Partial') return 'Partial Invoices';
    return 'Pending Invoices';
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return ' ↕';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="payment-container">
      <h2>Payment Management</h2>

      {/* Payment Summary Cards */}
      {paymentSummary && (
        <div className="payment-summary">
          <div
            className={`summary-card paid ${selectedStatus === 'Paid' ? 'selected' : ''}`}
            onClick={() => setSelectedStatus('Paid')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedStatus('Paid')}
          >
            <h3>Paid Invoices</h3>
            <p className="count">{paymentSummary.paidcount || 0}</p>
            <p className="amount">{formatCurrency(paymentSummary.paidamount || 0)}</p>
          </div>
          <div
            className={`summary-card unpaid ${selectedStatus === 'Unpaid' ? 'selected' : ''}`}
            onClick={() => setSelectedStatus('Unpaid')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedStatus('Unpaid')}
          >
            <h3>Pending Invoices</h3>
            <p className="count">{paymentSummary.unpaidcount || 0}</p>
            <p className="amount">{formatCurrency(paymentSummary.unpaidamount || 0)}</p>
          </div>
          <div
            className={`summary-card partial ${selectedStatus === 'Partial' ? 'selected' : ''}`}
            onClick={() => setSelectedStatus('Partial')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedStatus('Partial')}
          >
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
          <h3>{getStatusLabel()} ({sortedInvoices.length})</h3>



          {sortedInvoices.length === 0 ? (
            <p className="no-data">No {getStatusLabel().toLowerCase()} found.</p>
          ) : (
            <div className="table-responsive">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('invoicenumber')}>Invoice Number{renderSortIndicator('invoicenumber')}</th>
                    <th className="sortable" onClick={() => handleSort('vehiclenumber')}>Vehicle Number{renderSortIndicator('vehiclenumber')}</th>
                    <th className="sortable" onClick={() => handleSort('customername')}>Customer Name{renderSortIndicator('customername')}</th>
                    <th className="sortable" onClick={() => handleSort('phonenumber')}>Phone Number{renderSortIndicator('phonenumber')}</th>
                    <th className="sortable amount-header" onClick={() => handleSort('totalamount')}>Invoice Amount{renderSortIndicator('totalamount')}</th>
                    <th className="sortable amount-header" onClick={() => handleSort('amountpaid')}>Paid{renderSortIndicator('amountpaid')}</th>
                    <th className="sortable amount-header" onClick={() => handleSort('amounttobepaid')}>Pending{renderSortIndicator('amounttobepaid')}</th>
                    <th className="sortable" onClick={() => handleSort('createdat')}>Invoice Date{renderSortIndicator('createdat')}</th>
                    <th className="sortable" onClick={() => handleSort('paymentdate')}>Paid Date{renderSortIndicator('paymentdate')}</th>
                    <th className="sortable" onClick={() => handleSort('paymentmode')}>Mode{renderSortIndicator('paymentmode')}</th>
                    <th className="sortable amount-header" onClick={() => handleSort('paymentamount')}>Payment Amount{renderSortIndicator('paymentamount')}</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((invoice, index) => (
                    <tr key={`${invoice.invoiceid}-${invoice.paymentreceivedid || 'np'}-${index}`}>
                      <td className="invoice-number">{invoice.invoicenumber}</td>
                      <td>{invoice.vehiclenumber}</td>
                      <td>{invoice.customername}</td>
                      <td>{invoice.phonenumber}</td>
                      <td className="amount-cell">{formatCurrency(invoice.totalamount)}</td>
                      <td className="amount-cell amount-paid">{formatCurrency(invoice.amountpaid || 0)}</td>
                      <td className="amount-cell amount-pending">{formatCurrency(invoice.amounttobepaid || 0)}</td>
                      <td>{formatDate(invoice.createdat)}</td>
                      <td>{formatDate(invoice.paymentdate || invoice.invoicepaymentdate)}</td>
                      <td>{invoice.paymentmode || '-'}</td>
                      <td className="amount-cell">{invoice.paymentreceivedid ? formatCurrency(invoice.paymentamount || 0) : '-'}</td>
                      <td className="action-cell">
                        {selectedStatus !== 'Paid' ? (
                          <button
                            className="pay-button"
                            onClick={() => handlePayment(invoice)}
                          >
                            Pay
                          </button>
                        ) : (
                          <span>-</span>
                        )}
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
        vehicleNumber={selectedInvoiceForPayment?.vehiclenumber}
        customername={selectedInvoiceForPayment?.customername}
        amountToPay={selectedInvoiceForPayment?.amounttobepaid}
        totalAmount={selectedInvoiceForPayment?.totalamount}
        invoiceNumber={selectedInvoiceForPayment?.invoicenumber}
        invoiceId={selectedInvoiceForPayment?.invoiceid}
        onProcessPayment={handleProcessPaymentFromModal}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}

export default Payment;
