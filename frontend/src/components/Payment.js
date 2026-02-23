import React, { useState, useEffect } from 'react';
import { getUnpaidInvoices, getPaymentSummary, updatePaymentStatus, getPaymentMethods } from '../api';
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
        setError(result.message || 'Failed to load unpaid invoices');
      }
    } catch (err) {
      setError('Error fetching unpaid invoices: ' + err.message);
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
    if (!selectedInvoiceForPayment) return;

    try {
      const result = await updatePaymentStatus(selectedInvoiceForPayment.invoiceid, {
        PaymentStatus: 'Paid',
        PaymentDate: new Date().toISOString().split('T')[0]
      });

      if (result.success) {
        setSuccess(`Invoice ${selectedInvoiceForPayment.invoicenumber} marked as paid successfully!`);
        // Refresh the list
        fetchUnpaidInvoices();
        fetchPaymentSummary();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to update payment status');
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
            <h3>Unpaid Invoices</h3>
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
      {loading && <div className="loading">Loading unpaid invoices...</div>}

      {/* Unpaid Invoices Table */}
      {!loading && (
        <div className="invoices-section">
          <h3>Unpaid Invoices ({unpaidInvoices.length})</h3>
          {unpaidInvoices.length === 0 ? (
            <p className="no-data">No unpaid invoices found.</p>
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
