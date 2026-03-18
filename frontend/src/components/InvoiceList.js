import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import { generateInvoicePrintTemplate, openPrintWindow } from '../utils/printUtils';

const InvoiceList = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBranchId, setCurrentBranchId] = useState(null);
  const [vehicleSearchInput, setVehicleSearchInput] = useState('');
  const [activeSearchFilter, setActiveSearchFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'invoicedate',
    direction: 'desc', // default to descending (newest first)
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchInvoices = async (searchText = '') => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');

      if (!userId) {
        throw new Error('Session expired. Please login again.');
      }

      const cleanSearchText = (searchText || '').trim();
      const endpoint = `${API_BASE_URL}/invoices`;

      const response = await fetch(endpoint, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch invoices');

      const result = await response.json();
      console.log('Fetched invoices:', result);

      const transformedInvoices = (result.data || result || []).map(inv => ({
        ...inv,
        dueAmount: (parseFloat(inv.totalamount) || 0) - (parseFloat(inv.paidamount) || 0),
        invoiceDate: inv.invoicedate ? new Date(inv.invoicedate).toLocaleDateString('en-IN') : '-',
        totalAmount: parseFloat(inv.totalamount) || 0,
        paidAmount: parseFloat(inv.paidamount) || 0,
      }));

      const filteredInvoices = !cleanSearchText
        ? transformedInvoices
        : transformedInvoices.filter(inv => {
            const searchValue = cleanSearchText.toLowerCase();
            const vehicleNumber = (inv.vehiclenumber || '').toString().toLowerCase();
            const customerName = (inv.customername || '').toString().toLowerCase();
            return vehicleNumber.includes(searchValue) || customerName.includes(searchValue);
          });

      setInvoices(filteredInvoices);
      setActiveSearchFilter(cleanSearchText);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
      alert('Failed to load invoices: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const branchId = localStorage.getItem('branchId');
    setCurrentBranchId(branchId ? Number(branchId) : null);
    fetchInvoices('');

    // Add Ctrl+P keyboard shortcut for printing
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        
        if (selectedInvoice && invoiceDetails) {
          handlePrintInvoice(selectedInvoice);
        } else if (selectedInvoice) {
          // If modal is open but details not fully loaded, prompt user
          alert('Please wait for invoice details to load before printing.');
        } else {
          alert('Please select an invoice to print. Click View on any invoice to open it.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedInvoice, invoiceDetails]);

  const canEditInvoice = (invoice) => {
    if (!invoice) return false;
    if (currentBranchId === null || currentBranchId === undefined) return false;
    return Number(invoice.branchid) === Number(currentBranchId);
  };

  const handleEditInvoice = (invoice) => {
    if (!canEditInvoice(invoice)) return;
    const editInvoiceId = invoice?.invoiceid || invoice?.InvoiceID || invoice?.id;
    if (!editInvoiceId) {
      alert('Unable to open invoice for edit: invoice ID not found.');
      return;
    }
    navigate('/invoices', {
      state: {
        editInvoiceId,
        editInvoiceData: invoice,
      },
    });
  };

  const handlePrintInvoice = (invoice) => {
    if (!invoiceDetails) {
      alert('Please open the invoice first to print it.');
      return;
    }

    const invoiceData = {
      invoiceNumber: invoiceDetails.invoicenumber || invoice.invoicenumber || 'DRAFT',
      invoiceDate: invoiceDetails.invoiceDate || invoice.invoiceDate || new Date().toLocaleDateString('en-GB'),
      vehicleNumber: invoiceDetails.vehiclenumber || invoice.vehiclenumber || '-',
      vehicleModel: invoiceDetails.vehiclemodel || invoiceDetails.model || invoiceDetails.carmodel || invoiceDetails.modelname || invoice.vehiclemodel || invoice.model || invoice.carmodel || '-',
      vehicleColor: invoiceDetails.vehiclecolor || invoiceDetails.color || invoiceDetails.carcolor || invoiceDetails.colorname || invoice.vehiclecolor || invoice.color || invoice.carcolor || '-',
      jobCard: invoiceDetails.jobcard || invoiceDetails.poNumber || '-',
      customerName: invoiceDetails.customername || invoice.customername || 'N/A',
      area: invoiceDetails.area || invoiceDetails.custArea || invoiceDetails.location || invoice.area || '-',
      phoneNumber: invoiceDetails.customer_phonenumber || invoiceDetails.customerphonenumber || invoiceDetails.phonenumber || invoice.customer_phonenumber || '-',
      companyName: 'ONLY BULLET',
      companyEmail: 'info@onlybullet.com',
      companyPhone: 'Branch',
      companyAddress: `
        <div>190, Ponniyaman Kovil 2nd St,</div>
        <div>Behind South Indian Bank, Sholinganallur,</div>
        <div>Chennai - 600119</div>
      `,
      odometer: invoiceDetails.odometer || '-',
      notes: invoiceDetails.observation || invoiceDetails.notes || '-',
      items: invoiceDetails.items || [],
      total: invoiceDetails.totalAmount || 0,
    };

    const { html } = generateInvoicePrintTemplate(invoiceData);
    openPrintWindow(html, invoiceData.invoiceNumber);
  };

  const handlePrintButtonClick = async (invoice) => {
    // Open the modal and load invoice details, then print
    setSelectedInvoice(invoice);
    setDetailsLoading(true);
    
    try {
      const userId = localStorage.getItem('userId');
      const invoiceId = invoice.invoiceid || invoice.InvoiceID || invoice.id;
      
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch invoice details');
      
      const result = await response.json();
      
      if (result.data && result.data.invoiceMaster) {
        const { invoiceMaster, invoiceDetails: details } = result.data;
        
        const flatData = {
          ...invoiceMaster,
          invoiceDate: invoiceMaster.invoicedate 
            ? new Date(invoiceMaster.invoicedate).toLocaleDateString('en-IN')
            : '-',
          paymentDate: invoiceMaster.paymentdate
            ? new Date(invoiceMaster.paymentdate).toLocaleDateString('en-IN')
            : '-',
          subtotal: parseFloat(invoiceMaster.subtotal || invoiceMaster.partsincome || 0),
          totalAmount: parseFloat(invoiceMaster.totalamount || 0),
          taxAmount: parseFloat((invoiceMaster.tax1 || 0) + (invoiceMaster.tax2 || 0)),
          discountAmount: parseFloat(invoiceMaster.totaldiscount || 0),
          items: (details || []).map(item => ({
            ...item,
            description: item.description || item.itemname || `Item ${item.itemid || 'N/A'}`,
            quantity: item.qty || item.quantity || 0,
            rate: parseFloat(item.unitprice || item.rate || 0),
            amount: parseFloat(item.linetotal || 0),
          })),
          paymentstatus: invoiceMaster.paymentstatus || 'Pending',
        };
        
        setInvoiceDetails(flatData);
        // Trigger print after state is updated
        setTimeout(() => {
          handlePrintInvoice(invoice);
        }, 300);
      }
    } catch (error) {
      console.error('Error fetching invoice details for print:', error);
      alert('Failed to load invoice details for printing: ' + error.message);
      setSelectedInvoice(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVehicleSearch = async () => {
    await fetchInvoices(vehicleSearchInput);
  };

  const handleShowAllInvoices = async () => {
    setVehicleSearchInput('');
    await fetchInvoices('');
  };

  // Fetch invoice details for viewing
  const fetchInvoiceDetails = async (invoiceId) => {
    try {
      setDetailsLoading(true);
      const userId = localStorage.getItem('userId');
      
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch invoice details');
      
      const result = await response.json();
      
      // API returns { success, message, data: { invoiceMaster, invoiceDetails } }
      if (result.data && result.data.invoiceMaster) {
        const { invoiceMaster, invoiceDetails } = result.data;
        
        // Flatten the invoice master data
        const flatData = {
          // Copy all invoiceMaster properties
          ...invoiceMaster,
          
          // Format date fields
          invoiceDate: invoiceMaster.invoicedate 
            ? new Date(invoiceMaster.invoicedate).toLocaleDateString('en-IN')
            : '-',
          paymentDate: invoiceMaster.paymentdate
            ? new Date(invoiceMaster.paymentdate).toLocaleDateString('en-IN')
            : '-',
          
          // Ensure numeric amounts
          subtotal: parseFloat(invoiceMaster.subtotal || invoiceMaster.partsincome || 0),
          totalAmount: parseFloat(invoiceMaster.totalamount || 0),
          taxAmount: parseFloat((invoiceMaster.tax1 || 0) + (invoiceMaster.tax2 || 0)),
          discountAmount: parseFloat(invoiceMaster.totaldiscount || 0),
          
          // Store items array
          items: (invoiceDetails || []).map(item => ({
            ...item,
            description: item.description || item.itemname || `Item ${item.itemid || 'N/A'}`,
            quantity: item.qty || item.quantity || 0,
            rate: parseFloat(item.unitprice || item.rate || 0),
            amount: parseFloat(item.linetotal || 0),
          })),
          
          // Payment info (will come from parent invoice list if available)
          paymentstatus: invoiceMaster.paymentstatus || 'Pending',
        };
        
        setInvoiceDetails(flatData);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      alert('Failed to load invoice details: ' + error.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle View button click
  const handleViewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    await fetchInvoiceDetails(invoice.invoiceid || invoice.InvoiceID || invoice.id);
  };

  // Close modal
  const closeModal = () => {
    setSelectedInvoice(null);
    setInvoiceDetails(null);
  };

  // Handle column header click for sorting
  const handleSort = (key) => {
    let direction = 'asc';
    
    // If already sorted by this key, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Sort invoices based on current sort config
  const sortedInvoices = React.useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle date sorting
      if (sortConfig.key === 'invoicedate') {
        aVal = new Date(a.invoicedate).getTime();
        bVal = new Date(b.invoicedate).getTime();
      }
      // Handle numeric sorting
      else if (sortConfig.key === 'totalAmount' || sortConfig.key === 'dueAmount' || sortConfig.key === 'paidAmount') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      // Handle string sorting
      else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      // Compare values
      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return sorted;
  }, [invoices, sortConfig]);

  // Column header component with sort indicator
  const SortableHeader = ({ label, sortKey }) => {
    const isActive = sortConfig.key === sortKey;
    const arrow = isActive 
      ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')
      : '';
    
    return (
      <th
        onClick={() => handleSort(sortKey)}
        style={{
          cursor: 'pointer',
          backgroundColor: isActive ? '#e8f0fe' : '#f8f9fa',
          fontWeight: isActive ? '700' : '600',
          userSelect: 'none',
          padding: '12px 8px',
          borderBottom: '2px solid #dee2e6',
          transition: 'background-color 0.2s',
        }}
        title="Click to sort"
      >
        {label}{arrow}
      </th>
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
          Invoice List
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
          {activeSearchFilter ? ` for search "${activeSearchFilter}"` : ''}
        </p>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
        <input
          type="text"
          value={vehicleSearchInput}
          onChange={(e) => setVehicleSearchInput(e.target.value)}
          placeholder="Enter Vehicle Number / Customer Name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleVehicleSearch();
            }
          }}
          style={{
            width: '260px',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
        <button
          type="button"
          onClick={handleVehicleSearch}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            background: '#2563eb',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleShowAllInvoices}
          style={{
            padding: '10px 16px',
            border: '1px solid #2563eb',
            borderRadius: '6px',
            background: '#fff',
            color: '#2563eb',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#666' }}>Loading invoices...</p>
        </div>
      )}

      {/* Invoice Grid */}
      {!loading && invoices.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <SortableHeader label="Date" sortKey="invoicedate" />
                  <SortableHeader label="Invoice #" sortKey="invoicenumber" />
                  <SortableHeader label="Customer Name" sortKey="customername" />
                  <SortableHeader label="Vehicle Number" sortKey="vehiclenumber" />
                  <SortableHeader label="Amount" sortKey="totalAmount" />
                  <SortableHeader label="Paid" sortKey="paidAmount" />
                  <SortableHeader label="Due" sortKey="dueAmount" />
                  <th style={{ padding: '12px 8px', borderBottom: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.map((invoice, index) => (
                  <tr
                    key={invoice.invoiceid || index}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb',
                      transition: 'background-color 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f4ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9fafb';
                    }}
                    onDoubleClick={() => handleViewInvoice(invoice)}
                  >
                    {/* Date */}
                    <td style={{ padding: '12px 8px', fontWeight: '500', color: '#374151' }}>
                      {invoice.invoiceDate}
                    </td>

                    {/* Invoice Number */}
                    <td style={{ padding: '12px 8px', fontWeight: '600', color: '#1f2937' }}>
                      {invoice.invoicenumber || '-'}
                    </td>

                    {/* Customer Name */}
                    <td style={{ padding: '12px 8px', color: '#374151' }}>
                      {invoice.customername || '-'}
                    </td>

                    {/* Vehicle Number */}
                    <td style={{ padding: '12px 8px', color: '#374151', fontFamily: 'monospace', fontWeight: '500' }}>
                      {invoice.vehiclenumber || '-'}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#0f766e' }}>
                      ₹{invoice.totalAmount.toFixed(2)}
                    </td>

                    {/* Paid */}
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500', color: '#059669' }}>
                      ₹{invoice.paidAmount.toFixed(2)}
                    </td>

                    {/* Due */}
                    <td
                      style={{
                        padding: '12px 8px',
                        textAlign: 'right',
                        fontWeight: '700',
                        color: invoice.dueAmount > 0 ? '#dc2626' : '#059669',
                        backgroundColor: invoice.dueAmount > 0 ? 'rgba(220,38,38,0.05)' : 'rgba(5,150,105,0.05)',
                      }}
                    >
                      ₹{invoice.dueAmount.toFixed(2)}
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(invoice)}
                          title="View invoice details (or double-click row)"
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #16a34a',
                            borderRadius: '6px',
                            background: '#fff',
                            color: '#16a34a',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0fdf4';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                          }}
                        >
                          View
                        </button>
                        {canEditInvoice(invoice) && (
                          <button
                            type="button"
                            onClick={() => handleEditInvoice(invoice)}
                            style={{
                              padding: '6px 10px',
                              border: '1px solid #2563eb',
                              borderRadius: '6px',
                              background: '#fff',
                              color: '#2563eb',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f0f4ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fff';
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePrintButtonClick(invoice)}
                          title="Print invoice (or press Ctrl+P when viewing)"
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #9333ea',
                            borderRadius: '6px',
                            background: '#fff',
                            color: '#9333ea',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3e8ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                          }}
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && invoices.length === 0 && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '60px 20px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <p style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '8px' }}>
            No invoices found
          </p>
          <p style={{ fontSize: '13px', color: '#d1d5db' }}>
            Create your first invoice to see it listed here
          </p>
        </div>
      )}

      {/* View Invoice Modal */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Invoice Details
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1f2937'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              padding: '24px',
            }}>
              {detailsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                  <p>Loading invoice details...</p>
                </div>
              ) : invoiceDetails ? (
                <div>
                  {/* Invoice Header Info */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                    marginBottom: '24px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid #e5e7eb',
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, margin: '0 0 4px 0' }}>Invoice Number</p>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0, fontFamily: 'monospace' }}>
                        {invoiceDetails.invoicenumber || selectedInvoice.invoicenumber || '-'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, margin: '0 0 4px 0' }}>Invoice Date</p>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                        {invoiceDetails.invoiceDate || selectedInvoice.invoiceDate || '-'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, margin: '0 0 4px 0' }}>Customer Name</p>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                        {invoiceDetails.customername || selectedInvoice.customername || '-'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, margin: '0 0 4px 0' }}>Phone Number</p>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0, fontFamily: 'monospace' }}>
                        {invoiceDetails.customer_phonenumber || selectedInvoice.customer_phonenumber || '-'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, margin: '0 0 4px 0' }}>Vehicle Number</p>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0, fontFamily: 'monospace' }}>
                        {invoiceDetails.vehiclenumber || selectedInvoice.vehiclenumber || '-'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, margin: '0 0 4px 0' }}>Invoice Status</p>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f766e', margin: 0 }}>
                        {invoiceDetails.status || selectedInvoice.status || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  {(invoiceDetails.items || invoiceDetails.InvoiceDetail || []).length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', marginTop: 0, marginBottom: '12px' }}>
                        Invoice Items
                      </h3>
                      <div style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        overflow: 'hidden',
                      }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '13px',
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Part/Service #</th>
                              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Description</th>
                              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Qty</th>
                              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Rate</th>
                              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(invoiceDetails.items || invoiceDetails.InvoiceDetail || []).map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                <td style={{ padding: '10px 8px', color: '#374151', fontWeight: '600', fontFamily: 'monospace' }}>{item.partnumber || item.servicenumber || item.itemid || '-'}</td>
                                <td style={{ padding: '10px 8px', color: '#374151' }}>{item.description || item.itemname || '-'}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{item.quantity || item.qty || 0}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>₹{(item.rate || item.unitPrice || 0).toFixed(2)}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>₹{((item.quantity || item.qty || 0) * (item.rate || item.unitPrice || 0)).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Summary Section */}
                  <div style={{
                    paddingTop: '20px',
                    borderTop: '1px solid #e5e7eb',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                      <div style={{ width: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: '#6b7280' }}>Subtotal:</span>
                          <span style={{ fontWeight: '600', color: '#374151' }}>₹{(invoiceDetails.subtotal || invoiceDetails.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        {(invoiceDetails.taxAmount || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#6b7280' }}>Tax:</span>
                            <span style={{ fontWeight: '600', color: '#374151' }}>₹{(invoiceDetails.taxAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {(invoiceDetails.discountAmount || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#6b7280' }}>Discount:</span>
                            <span style={{ fontWeight: '600', color: '#dc2626' }}>-₹{(invoiceDetails.discountAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '16px', fontWeight: '700' }}>
                          <span style={{ color: '#1f2937' }}>Total:</span>
                          <span style={{ color: '#0f766e' }}>₹{(invoiceDetails.totalAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Amount Paid:</p>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: '#059669', margin: 0 }}>₹{(invoiceDetails.paidAmount || selectedInvoice.paidAmount || 0).toFixed(2)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Amount Due:</p>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: (invoiceDetails.dueAmount || selectedInvoice.dueAmount || 0) > 0 ? '#dc2626' : '#059669', margin: 0 }}>
                          ₹{(invoiceDetails.dueAmount || selectedInvoice.dueAmount || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                  <p>Unable to load invoice details</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <button
                type="button"
                onClick={() => handlePrintInvoice(selectedInvoice)}
                disabled={detailsLoading}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #9333ea',
                  borderRadius: '6px',
                  background: '#9333ea',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: detailsLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: detailsLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!detailsLoading) {
                    e.currentTarget.style.backgroundColor = '#7c3aed';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!detailsLoading) {
                    e.currentTarget.style.backgroundColor = '#9333ea';
                  }
                }}
              >
                🖨 Print
              </button>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
