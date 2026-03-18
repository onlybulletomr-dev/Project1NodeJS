import React, { useState, useEffect } from 'react';
import { getShelfSerialNumbersByItem } from '../api';

/**
 * SerialNumberSelectionPopup
 * 
 * Allows user to select which serial numbers to invoice for an item.
 * Used when adding items with serialnumbertracking=true to an invoice.
 * 
 * Props:
 *   itemId: The item ID to fetch serials for
 *   itemName: Display name of the item
 *   itemPartNumber: Part number for display
 *   onClose: Callback when user closes popup
 *   onSelectSerials: Callback when user confirms selection - receives array of selected serials
 */
export default function SerialNumberSelectionPopup({ itemId, itemName, itemPartNumber, onClose, onSelectSerials }) {
  const [shelfSerials, setShelfSerials] = useState([]);
  const [selectedSerials, setSelectedSerials] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load shelf serials when popup opens
  useEffect(() => {
    const loadSerials = async () => {
      try {
        setLoading(true);
        setError('');
        const serials = await getShelfSerialNumbersByItem(itemId);
        
        if (!serials || serials.length === 0) {
          setError(`No available serials for ${itemName}. Item must be recorded first.`);
          setShelfSerials([]);
        } else {
          setShelfSerials(serials);
        }
      } catch (err) {
        console.error('Error loading shelf serials:', err);
        setError(`Failed to load serials for ${itemName}`);
        setShelfSerials([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadSerials();
  }, [itemId, itemName]);

  // Toggle serial selection
  const handleToggleSerial = (serialId) => {
    const newSelected = new Set(selectedSerials);
    if (newSelected.has(serialId)) {
      newSelected.delete(serialId);
    } else {
      newSelected.add(serialId);
    }
    setSelectedSerials(newSelected);
    setMessage('');
  };

  // Handle confirm
  const handleConfirm = () => {
    if (selectedSerials.size === 0) {
      setMessage('❌ Please select at least one serial number');
      return;
    }

    // Get selected serial records
    const selectedRecords = shelfSerials.filter(s => selectedSerials.has(s.serialnumberid));
    onSelectSerials(selectedRecords);
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          width: '90%',
          maxWidth: '600px',
          padding: '40px',
          textAlign: 'center'
        }} onClick={e => e.stopPropagation()}>
          <p>Loading available serial numbers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          width: '90%',
          maxWidth: '600px',
          padding: '20px'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Select Serial Numbers</h2>
            <button onClick={onClose} style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              padding: 0,
              width: '30px',
              height: '30px'
            }}>×</button>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
            <p>{error}</p>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Back to Invoice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        width: '95%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Select Serial Numbers - {itemName}</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer',
            padding: 0,
            width: '30px',
            height: '30px'
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {/* Instruction */}
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#1976d2' }}>
              ✓ Select the serial number(s) to invoice for this item
              <br/>
              Currently selected: <strong>{selectedSerials.size}</strong>
            </p>
          </div>

          {/* Message */}
          {message && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fff3e0',
              borderRadius: '4px',
              border: '1px solid #ff9800',
              color: '#e65100',
              fontSize: '13px'
            }}>
              {message}
            </div>
          )}

          {/* Serials List */}
          {shelfSerials.length > 0 ? (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>Select</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>Serial Number</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>Batch</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>MRP</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>Condition</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>Purchased From</th>
                  </tr>
                </thead>
                <tbody>
                  {shelfSerials.map((serial, idx) => (
                    <tr key={serial.serialnumberid} style={{ 
                      backgroundColor: selectedSerials.has(serial.serialnumberid) ? '#e8f5e9' : (idx % 2 === 0 ? '#fafafa' : 'white'),
                      borderBottom: '1px solid #eee'
                    }}>
                      <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={selectedSerials.has(serial.serialnumberid)}
                          onChange={() => handleToggleSerial(serial.serialnumberid)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', fontSize: '13px' }}>
                        <strong>{serial.serialnumber}</strong>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', fontSize: '13px' }}>
                        {serial.batch || '-'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', fontSize: '13px' }}>
                        ₹{serial.mrp ? parseFloat(serial.mrp).toFixed(2) : '0.00'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', fontSize: '13px' }}>
                        {serial.condition || 'New'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '12px', fontSize: '13px' }}>
                        {serial.vendorname || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <p>No serial numbers available for invoicing</p>
            </div>
          )}
        </div>

        {/* Footer - Buttons */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #ddd', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={shelfSerials.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: shelfSerials.length === 0 ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: shelfSerials.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Add Selected Serials ({selectedSerials.size})
          </button>
        </div>
      </div>
    </div>
  );
}
