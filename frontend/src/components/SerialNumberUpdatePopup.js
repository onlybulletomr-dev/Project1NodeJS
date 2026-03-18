import React, { useState, useEffect } from 'react';
import { getItemsWithSerialTracking, getLatestSerialNumberForItem, batchCreateSerialNumbers } from '../api';

// Utility function to capitalize first letter of each word
const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Utility function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SerialNumberUpdatePopup({ onClose, onSuccess }) {
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [vendorname, setVendorname] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [mrp, setMrp] = useState('');
  const [purchaseinvoiceid, setPurchaseinvoiceid] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load items with serial tracking on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        const items = await getItemsWithSerialTracking();
        setAvailableItems(items);
      } catch (error) {
        console.error('Error loading items:', error);
        setAvailableItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadItems();
  }, []);

  // Load purchase details when item selected
  useEffect(() => {
    if (!selectedItemId) return;

    const loadPurchaseData = async () => {
      try {
        const item = availableItems.find(i => i.itemid === parseInt(selectedItemId));
        setItemDetails(item);
        
        const latestRecord = await getLatestSerialNumberForItem(selectedItemId);
        if (latestRecord) {
          setVendorname(latestRecord.vendorname || '');
          setManufacturer(latestRecord.remarks || latestRecord.manufacturer || '');
          setMrp(latestRecord.mrp || '');
        } else {
          setVendorname('');
          setManufacturer('');
          setMrp('');
        }
        
        setPurchaseinvoiceid('');
        setQuantity(1);
        setSerialNumbers([]);
      } catch (error) {
        console.error('Error loading purchase data:', error);
      }
    };
    loadPurchaseData();
  }, [selectedItemId, availableItems]);

  // Generate serial number rows when quantity changes
  useEffect(() => {
    if (quantity && quantity > 0) {
      const todayDate = getTodayDate();
      const rows = Array.from({ length: parseInt(quantity) }, (_, i) => ({
        serialnumber: '',
        model: '',
        batch: '',
        manufacturingdate: todayDate,
        expirydate: todayDate,
        warrexpiry: todayDate,
        condition: 'New'
      }));
      setSerialNumbers(rows);
    }
  }, [quantity]);

  const handleSerialNumberChange = (index, field, value) => {
    const updated = [...serialNumbers];
    updated[index][field] = value;
    
    // Auto-fill from first row
    if (index === 0 && field !== 'serialnumber') {
      updated.forEach((row, i) => {
        if (i > 0) {
          row[field] = value;
        }
      });
    }
    
    setSerialNumbers(updated);
  };

  const handleSaveSerialNumbers = async () => {
    setMessage('');
    
    // Validate
    if (!selectedItemId || serialNumbers.length === 0) {
      setMessageType('error');
      setMessage('❌ Please select an item and add serial numbers');
      return;
    }

    const emptySerials = serialNumbers.filter(s => !s.serialnumber.trim());
    if (emptySerials.length > 0) {
      setMessageType('error');
      setMessage(`❌ All serial numbers are required (missing: ${emptySerials.length})`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await batchCreateSerialNumbers(
        selectedItemId,
        quantity,
        null, // vendor ID not required for this simple workflow
        mrp || 0,
        '',
        manufacturer,
        '',
        serialNumbers[0]?.condition || 'New',
        serialNumbers,
        purchaseinvoiceid || null, // Purchase invoice / PO ID
        vendorname || null // Vendor name
      );

      if (response.created > 0) {
        setMessageType('success');
        setMessage(`✅ Successfully created ${response.created} serial records`);
        
        // Reset form
        setTimeout(() => {
          setSelectedItemId(null);
          setItemDetails(null);
          setVendorname('');
          setManufacturer('');
          setMrp('');
          setPurchaseinvoiceid('');
          setQuantity(1);
          setSerialNumbers([]);
          setMessage('');
          
          if (onSuccess) onSuccess();
        }, 1500);
      } else if (response.failed > 0) {
        setMessageType('error');
        setMessage(`❌ Failed to create ${response.failed} records. ${response.errors?.[0] || ''}`);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(`❌ Error saving serials: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'auto'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Record Serial Numbers</h2>
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
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Loading available items...</p>
          </div>
        </div>
      </div>
    );
  }

  if (availableItems.length === 0) {
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
          maxWidth: '600px'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Record Serial Numbers</h2>
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
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>No Items Available - No items configured with serial number tracking</p>
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
        maxWidth: '1100px',
        maxHeight: '90vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Record Serial Numbers - Inventory Receipt</h2>
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

        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {/* Item Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Select Item <span style={{ color: 'red' }}>*</span>
            </label>
            <select 
              value={selectedItemId || ''} 
              onChange={e => setSelectedItemId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">-- Select Item --</option>
              {availableItems.map(item => (
                <option key={item.itemid} value={item.itemid}>
                  {item.itemid} - {item.description || item.itemname}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Details - Show only if item selected */}
          {selectedItemId && itemDetails && (
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Purchase Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#666' }}>Vendor Name</label>
                  <input 
                    type="text" 
                    value={vendorname} 
                    onChange={e => setVendorname(toTitleCase(e.target.value))}
                    placeholder="Auto-loaded from latest record"
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '3px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#666' }}>Manufacturer</label>
                  <input 
                    type="text" 
                    value={manufacturer} 
                    onChange={e => setManufacturer(toTitleCase(e.target.value))}
                    placeholder="Auto-loaded from latest record"
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '3px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#666' }}>MRP</label>
                  <input 
                    type="number" 
                    value={mrp} 
                    onChange={e => setMrp(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '3px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#666' }}>Purchase Invoice ID</label>
                <input 
                  type="text" 
                  value={purchaseinvoiceid} 
                  onChange={e => setPurchaseinvoiceid(e.target.value)}
                  placeholder="PO / Purchase Invoice Number"
                  style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '3px', border: '1px solid #ddd' }}
                />
                <small style={{ display: 'block', marginTop: '4px', color: '#999' }}>
                  Link to vendor purchase order or invoice
                </small>
              </div>
            </div>
          )}

          {/* Quantity */}
          {selectedItemId && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Quantity <span style={{ color: 'red' }}>*</span>
              </label>
              <input 
                type="number" 
                min="1" 
                max="100"
                value={quantity} 
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                style={{ width: '150px', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <small style={{ display: 'block', marginTop: '4px', color: '#999' }}>
                This will generate {quantity} rows for serial number entry
              </small>
            </div>
          )}

          {/* Serial Numbers Table */}
          {selectedItemId && serialNumbers.length > 0 && (
            <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Serial Numbers ({serialNumbers.length})</h4>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                fontSize: '13px',
                border: '1px solid #ddd'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #999' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', width: '40px' }}>#</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Serial Number <span style={{ color: 'red' }}>*</span></th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Model</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Batch</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Manufacturing Date</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Expiry Date</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Warranty Expiry</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {serialNumbers.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <input 
                          type="text" 
                          value={row.serialnumber}
                          onChange={e => handleSerialNumberChange(idx, 'serialnumber', e.target.value)}
                          placeholder="Required"
                          style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ddd' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <input 
                          type="text" 
                          value={row.model}
                          onChange={e => handleSerialNumberChange(idx, 'model', e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ddd' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <input 
                          type="text" 
                          value={row.batch}
                          onChange={e => handleSerialNumberChange(idx, 'batch', e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ddd' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <input 
                          type="date" 
                          value={row.manufacturingdate}
                          onChange={e => handleSerialNumberChange(idx, 'manufacturingdate', e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ddd' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <input 
                          type="date" 
                          value={row.expirydate}
                          onChange={e => handleSerialNumberChange(idx, 'expirydate', e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ddd' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <input 
                          type="date" 
                          value={row.warrexpiry}
                          onChange={e => handleSerialNumberChange(idx, 'warrexpiry', e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ddd' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <select 
                          value={row.condition}
                          onChange={e => handleSerialNumberChange(idx, 'condition', e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ddd' }}
                        >
                          <option>New</option>
                          <option>Refurbished</option>
                          <option>Used</option>
                          <option>Damaged</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Message */}
          {message && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '10px', 
              borderRadius: '4px',
              backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
              color: messageType === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px', justifyContent: 'flex-end', backgroundColor: '#f5f5f5' }}>
          <button 
            onClick={onClose}
            disabled={isSaving}
            style={{ 
              padding: '8px 16px', 
              fontSize: '14px', 
              cursor: isSaving ? 'not-allowed' : 'pointer',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Close
          </button>
          {selectedItemId && (
            <button 
              onClick={handleSaveSerialNumbers}
              disabled={isSaving || serialNumbers.length === 0}
              style={{ 
                padding: '8px 16px', 
                fontSize: '14px',
                cursor: isSaving || serialNumbers.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSaving || serialNumbers.length === 0 ? 0.6 : 1,
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Serial Numbers'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
