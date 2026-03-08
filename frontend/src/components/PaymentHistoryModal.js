import React, { useState, useEffect } from 'react';
import { getPaymentHistoryByInvoice } from '../api';

function PaymentHistoryModal({ isOpen, onClose, invoiceId, invoiceNumber }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchPaymentHistory();
    }
  }, [isOpen, invoiceId]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPaymentHistoryByInvoice(invoiceId);
      if (result.success) {
        setHistoryData(result.data);
      } else {
        setError(result.message || 'Failed to fetch payment history');
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('Error loading payment history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const invoice = historyData?.invoice;
  const payments = historyData?.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pending = invoice ? (Number(invoice.totalamount) || 0) - totalPaid : 0;

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
      zIndex: 1500
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: 24,
        width: '90%',
        maxWidth: 800,
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#f0f0f0',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>

        {/* Invoice Header */}
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>
          Invoice: {invoiceNumber}
        </h2>

        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: 12,
            borderRadius: 4,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading payment history...</div>
        ) : invoice ? (
          <>
            {/* Invoice Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 24,
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 4
            }}>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Invoice Amount</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>
                  ₹{(Number(invoice.totalamount) || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Total Paid</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#4CAF50' }}>
                  ₹{totalPaid.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Pending</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: pending > 0 ? '#FF9800' : '#4CAF50' }}>
                  ₹{pending.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Status</div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: invoice.paymentstatus === 'Paid' ? '#4CAF50' : invoice.paymentstatus === 'Partial' ? '#FF9800' : '#2196F3',
                  textTransform: 'capitalize'
                }}>
                  {invoice.paymentstatus}
                </div>
              </div>
            </div>

            {/* Payments Grid */}
            <div style={{ marginTop: 20 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#333' }}>
                Payment Details ({payments.length})
              </h3>
              
              {payments.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 20,
                  color: '#999',
                  background: '#f5f5f5',
                  borderRadius: 4
                }}>
                  No payments recorded for this invoice
                </div>
              ) : (
                <div style={{
                  overflowX: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: 4
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                        <th style={{
                          padding: 12,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#333',
                          borderRight: '1px solid #ddd'
                        }}>
                          Date
                        </th>
                        <th style={{
                          padding: 12,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#333',
                          borderRight: '1px solid #ddd'
                        }}>
                          Amount
                        </th>
                        <th style={{
                          padding: 12,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#333',
                          borderRight: '1px solid #ddd'
                        }}>
                          Mode
                        </th>
                        <th style={{
                          padding: 12,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#333'
                        }}>
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #eee',
                            background: idx % 2 === 0 ? '#fff' : '#fafafa'
                          }}
                        >
                          <td style={{
                            padding: 12,
                            borderRight: '1px solid #eee',
                            color: '#333'
                          }}>
                            {payment.paymentdate
                              ? new Date(payment.paymentdate).toLocaleDateString('en-IN')
                              : 'N/A'
                            }
                          </td>
                          <td style={{
                            padding: 12,
                            textAlign: 'right',
                            fontWeight: 600,
                            borderRight: '1px solid #eee',
                            color: '#4CAF50'
                          }}>
                            ₹{(Number(payment.amount) || 0).toFixed(2)}
                          </td>
                          <td style={{
                            padding: 12,
                            borderRight: '1px solid #eee',
                            color: '#666'
                          }}>
                            {payment.paymentmethod || 'N/A'}
                          </td>
                          <td style={{
                            padding: 12,
                            color: '#666',
                            fontSize: 12
                          }}>
                            {payment.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default PaymentHistoryModal;
