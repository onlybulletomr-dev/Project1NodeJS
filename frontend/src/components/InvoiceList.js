import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleSearchInput, setVehicleSearchInput] = useState('');
  const [activeVehicleFilter, setActiveVehicleFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'invoicedate',
    direction: 'desc', // default to descending (newest first)
  });

  const fetchInvoices = async (vehicleNumber = '') => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');

      if (!userId) {
        throw new Error('Session expired. Please login again.');
      }

      const cleanVehicleNumber = (vehicleNumber || '').trim();
      const endpoint = cleanVehicleNumber
        ? `${API_BASE_URL}/invoices?vehicleNumber=${encodeURIComponent(cleanVehicleNumber)}`
        : `${API_BASE_URL}/invoices`;

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

      setInvoices(transformedInvoices);
      setActiveVehicleFilter(cleanVehicleNumber);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
      alert('Failed to load invoices: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices('');
  }, []);

  const handleVehicleSearch = async () => {
    await fetchInvoices(vehicleSearchInput);
  };

  const handleShowAllInvoices = async () => {
    setVehicleSearchInput('');
    await fetchInvoices('');
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
          {activeVehicleFilter ? ` for vehicle ${activeVehicleFilter}` : ''}
        </p>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
        <input
          type="text"
          value={vehicleSearchInput}
          onChange={(e) => setVehicleSearchInput(e.target.value.toUpperCase())}
          placeholder="Enter Vehicle Number"
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
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f4ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9fafb';
                    }}
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
    </div>
  );
};

export default InvoiceList;
