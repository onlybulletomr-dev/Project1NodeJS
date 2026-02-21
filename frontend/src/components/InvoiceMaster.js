import React, { useState } from 'react';
import { searchEmployees, searchItems, saveInvoice, getPaymentMethods, getNextInvoiceNumber } from '../api';

// Placeholder async function to simulate vehicle search from customer master
async function searchVehiclesByNumber(query) {
  // TODO: Replace with real API call
  // Simulate: [{ VehicleNumber, VehicleModel, VehicleColor, CustomerName, CustomerAddress, MobileNumber1, VehicleID, CustomerID, ... }]
  if (!query || query.length < 2) return [];
  return [
    { VehicleNumber: 'TN01AB1234', VehicleModel: 'Swift', VehicleColor: 'Red', CustomerName: 'Amit Kumar', CustomerAddress: 'Chennai', MobileNumber1: '9876543210', VehicleID: 1, CustomerID: 1 },
    { VehicleNumber: 'TN01AC5678', VehicleModel: 'i20', VehicleColor: 'Blue', CustomerName: 'Sunita Sharma', CustomerAddress: 'Chennai', MobileNumber1: '9123456780', VehicleID: 2, CustomerID: 2 },
  ].filter(v => v.VehicleNumber.toLowerCase().includes(query.toLowerCase()));
}

export default function InvoiceMaster() {
  // Item search dropdown navigation state
  const [itemPopupIndex, setItemPopupIndex] = useState(-1);
  // JobCard input state
  const [jobCardInput, setJobCardInput] = useState('');
  // Staff dropdown navigation state (per field)
  const [staffPopupIndex, setStaffPopupIndex] = useState({
    technician1: -1, technician2: -1, serviceadvisor: -1, deliveryadvisor: -1, testdriver: -1, cleaner: -1, waterwash: -1
  });
  // Staff input refs (for focus management)
  const staffInputRefs = {
    technician1: React.useRef(null),
    technician2: React.useRef(null),
    serviceadvisor: React.useRef(null),
    deliveryadvisor: React.useRef(null),
    testdriver: React.useRef(null),
    cleaner: React.useRef(null),
    waterwash: React.useRef(null)
  };

    // Ref for qty input
    const qtyInputRef = React.useRef(null);
    const itemPopupRef = React.useRef(null);
    const itemRowRefs = React.useRef({});
    // Invoice grid state
    const [itemInput, setItemInput] = useState('');
    const [itemResults, setItemResults] = useState([]);
    const [showItemPopup, setShowItemPopup] = useState(false);
    const [qtyInput, setQtyInput] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [gridRows, setGridRows] = useState([]);
    // Notes, staff, odometer, totals state
    const [notes, setNotes] = useState('');
    const [odometer, setOdometer] = useState('');
    const [staffFields, setStaffFields] = useState({
      technician1: '', technician2: '', serviceadvisor: '', deliveryadvisor: '', testdriver: '', cleaner: '', waterwash: ''
    });
    // Staff search popup/results state
    const [staffResults, setStaffResults] = useState({
      technician1: [], technician2: [], serviceadvisor: [], deliveryadvisor: [], testdriver: [], cleaner: [], waterwash: []
    });
    const [showStaffPopup, setShowStaffPopup] = useState({
      technician1: false, technician2: false, serviceadvisor: false, deliveryadvisor: false, testdriver: false, cleaner: false, waterwash: false
    });
    const [selectedStaff, setSelectedStaff] = useState({
      technician1: null, technician2: null, serviceadvisor: null, deliveryadvisor: null, testdriver: null, cleaner: null, waterwash: null
    });
    // Discount state
    const [discount, setDiscount] = useState('');
    // Invoice running number state - resets each month AND year
    // Tracks YYMMM format (e.g., "26FEB", "27JAN") to detect both month and year changes
    const getCurrentYearMonth = () => {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      return `${year}${month}`;
    };
    const [invoiceRunningNumber, setInvoiceRunningNumber] = useState(1);
    const [invoiceYearMonth, setInvoiceYearMonth] = useState(getCurrentYearMonth());
    // Payment popup state
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [openInvoices, setOpenInvoices] = useState([]);
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [invoicePaymentAmounts, setInvoicePaymentAmounts] = useState({});
    
    // Fetch payment methods on component mount
    React.useEffect(() => {
      const fetchPaymentMethods = async () => {
        try {
          const response = await getPaymentMethods();
          setPaymentMethods(response.data || response);
        } catch (error) {
          console.error('Error fetching payment methods:', error);
          // Fallback to mock data if API fails
          setPaymentMethods([
            { id: 1, paymentmethodname: 'Cash' },
            { id: 2, paymentmethodname: 'Check' },
            { id: 3, paymentmethodname: 'Credit Card' },
            { id: 4, paymentmethodname: 'Debit Card' },
            { id: 5, paymentmethodname: 'Bank Transfer' },
            { id: 6, paymentmethodname: 'Online Payment' },
            { id: 7, paymentmethodname: 'Digital Wallet' }
          ]);
        }
      };
      fetchPaymentMethods();
    }, []);

    // Auto-allocate payment amount starting from the latest invoice
    React.useEffect(() => {
      if (!paymentAmount || Number(paymentAmount) <= 0 || openInvoices.length === 0) {
        setInvoicePaymentAmounts({});
        return;
      }

      const newAllocations = {};
      let remainingAmount = Number(paymentAmount);

      // Iterate from the first invoice to the last (invoices are already sorted with latest first)
      for (let i = 0; i < openInvoices.length && remainingAmount > 0; i++) {
        const invoice = openInvoices[i];
        const allocateAmount = Math.min(remainingAmount, invoice.amount);
        newAllocations[invoice.invoiceid] = allocateAmount;
        remainingAmount -= allocateAmount;
      }

      setInvoicePaymentAmounts(newAllocations);
    }, [paymentAmount, openInvoices]);

    // Handle Enter key in qty input
    const handleQtyKeyDown = (e) => {
      if (e.key === 'Enter' && selectedItem && qtyInput) {
        addItemToGrid();
      }
    }
    // Placeholder async function to simulate staff search
    async function searchStaff(field, query) {
      // Use real API call
      return await searchEmployees(query);
    }

    // Debugging: Log staffResults for duplicate/NaN key investigation
    React.useEffect(() => {
      if (staffResults) {
        console.log('Debug staffResults:', JSON.stringify(staffResults));
        ['technician1','technician2','serviceadvisor','deliveryadvisor','testdriver','cleaner','waterwash'].forEach(field => {
          if (Array.isArray(staffResults[field])) {
            staffResults[field].forEach((staff, i) => {
              const key = Number.isFinite(staff.EmployeeID) ? staff.EmployeeID : (staff.FirstName + staff.LastName + i);
              if (!key && key !== 0) {
                console.warn(`Staff popup key is falsy for field ${field} at index ${i}:`, staff);
              } else if (isNaN(key)) {
                console.warn(`Staff popup key is NaN for field ${field} at index ${i}:`, staff);
              }
            });
          }
        });
      }
    }, [staffResults]);

    // Auto-scroll item popup when navigating with arrow keys
    React.useEffect(() => {
      if (itemPopupIndex >= 0 && itemRowRefs.current[itemPopupIndex]) {
        const element = itemRowRefs.current[itemPopupIndex];
        const container = itemPopupRef.current;
        if (element && container) {
          const elementTop = element.offsetTop;
          const elementHeight = element.offsetHeight;
          const containerScroll = container.scrollTop;
          const containerHeight = container.clientHeight;
          
          if (elementTop < containerScroll) {
            container.scrollTop = elementTop;
          } else if (elementTop + elementHeight > containerScroll + containerHeight) {
            container.scrollTop = elementTop + elementHeight - containerHeight;
          }
        }
      }
    }, [itemPopupIndex]);

      // Handle staff input change
      const handleStaffInputChange = async (field, value) => {
        setStaffFields(f => ({ ...f, [field]: value }));
        setSelectedStaff(f => ({ ...f, [field]: null }));
        if (value.length >= 2) {
          const results = await searchStaff(field, value);
          setStaffResults(r => ({ ...r, [field]: results }));
          setShowStaffPopup(p => ({ ...p, [field]: results.length > 0 }));
        } else {
          setStaffResults(r => ({ ...r, [field]: [] }));
          setShowStaffPopup(p => ({ ...p, [field]: false }));
        }
      };

      // Handle staff selection
      const handleSelectStaff = (field, staff) => {
        setSelectedStaff(f => ({ ...f, [field]: staff }));
        setStaffFields(f => ({ ...f, [field]: staff.firstname }));
        setShowStaffPopup(p => ({ ...p, [field]: false }));
      };


    // Subtotal calculation (only active rows)
    const activeGridRows = gridRows.filter(row => !row.isDeleted);
    const subtotal = activeGridRows.reduce((sum, row) => sum + row.Total, 0);
    // Discount validation
    const validDiscount = Math.max(0, Math.min(Number(discount), subtotal));
    // Total calculation
    const total = subtotal - validDiscount;

    // Handle save invoice
    const [isSaving, setIsSaving] = useState(false);
    
    // Generate invoice number
    const generateInvoiceNumberForSave = async () => {
      try {
        // Query backend for next invoice number based on current month/year
        const { runningNumber, yearMonth } = await getNextInvoiceNumber();
        
        const year = yearMonth.substring(0, 2);
        const month = yearMonth.substring(2, 5);
        const running = String(runningNumber).padStart(3, '0');
        const invoiceNumber = `INV${year}${month}${running}`;
        
        console.log('Generated invoice number:', invoiceNumber);
        console.log('Running number:', runningNumber, 'Year-Month:', yearMonth);
        
        return invoiceNumber;
      } catch (error) {
        console.error('Error generating invoice number:', error);
        // Fallback to local state if API fails
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const currentYearMonth = `${year}${month}`;
        
        if (currentYearMonth !== invoiceYearMonth) {
          setInvoiceYearMonth(currentYearMonth);
          setInvoiceRunningNumber(2);
          const running = String(1).padStart(3, '0');
          const fallbackNumber = `INV${year}${month}${running}`;
          console.log('Using fallback invoice number:', fallbackNumber);
          return fallbackNumber;
        } else {
          const running = String(invoiceRunningNumber).padStart(3, '0');
          setInvoiceRunningNumber(prev => prev + 1);
          const fallbackNumber = `INV${year}${month}${running}`;
          console.log('Using fallback invoice number:', fallbackNumber);
          return fallbackNumber;
        }
      }
    };
    
    const handleSaveInvoice = async () => {
      try {
        // Prevent concurrent saves
        if (isSaving) {
          alert('Save is already in progress. Please wait...');
          return;
        }

        // Validate required fields
        if (!selectedVehicle || !selectedVehicle.VehicleNumber) {
          alert('Please select a vehicle');
          return;
        }
        if (activeGridRows.length === 0) {
          alert('Please add at least one item to the invoice');
          return;
        }

        setIsSaving(true);

        // Calculate financial values
        const subTotal = subtotal;
        const totalDiscount = validDiscount;
        const totalAmount = total;

        // Prepare invoice data with correct field names for the database schema
        const invoiceData = {
          InvoiceNumber: await generateInvoiceNumberForSave(),
          BranchId: 1, // Default branch
          CustomerId: selectedVehicle.CustomerID || 1,
          VehicleId: selectedVehicle.VehicleID || 1, // Would need VehicleID from selected vehicle
          JobCardId: jobCardInput || 0,
          SubTotal: subTotal,
          TotalDiscount: totalDiscount,
          PartsIncome: subTotal,
          ServiceIncome: 0,
          Tax1: 0,
          Tax2: 0,
          TotalAmount: totalAmount,
          Technicianmain: staffFields.technician1,
          Technicianassistant: staffFields.technician2,
          ServiceAdvisorIn: staffFields.serviceadvisor,
          ServiceAdvisorDeliver: staffFields.deliveryadvisor,
          TestDriver: staffFields.testdriver,
          Cleaner: staffFields.cleaner,
          WaterWash: staffFields.waterwash,
          Odometer: odometer,
          Notes: notes,
          Notes1: '',
          InvoiceDetails: activeGridRows.map(row => ({
            ItemNumber: row.ItemNumber || row.partnumber,
            ItemID: row.ItemNumber || row.partnumber,
            Qty: row.Qty,
            UnitPrice: row.UnitPrice,
            Discount: row.Discount || 0,
            Total: row.Total,
          })),
          CreatedBy: 1, // Replace with actual user ID
        };

        console.log('Invoice data to be saved:', invoiceData);

        // Call API to save invoice
        const response = await saveInvoice(invoiceData);

        if (response.success) {
          alert('Invoice saved successfully! Invoice Number: ' + response.data.invoiceMaster.invoicenumber);
          // Reset form
          setVehicleInput('');
          setSelectedVehicle(null);
          setJobCardInput('');
          setGridRows([]);
          setNotes('');
          setStaffFields({
            technician1: '', technician2: '', serviceadvisor: '', deliveryadvisor: '', testdriver: '', cleaner: '', waterwash: ''
          });
          setSelectedStaff({
            technician1: null, technician2: null, serviceadvisor: null, deliveryadvisor: null, testdriver: null, cleaner: null, waterwash: null
          });
          setDiscount('');
          setOdometer('');
        } else {
          alert('Error saving invoice: ' + response.message);
        }
      } catch (error) {
        console.error('Error saving invoice:', error);
        
        // Check for duplicate key error
        if (error.response?.data?.message?.includes('duplicate key') || error.message?.includes('duplicate key')) {
          alert('Invoice number already exists! This may be due to multiple simultaneous save attempts. Please refresh and try again.');
        } else if (error.response?.data?.message) {
          alert('Error saving invoice: ' + error.response.data.message);
        } else {
          alert('Failed to save invoice. Error: ' + error.message);
        }
      } finally {
        setIsSaving(false);
      }
    };

    // Load test data
    const handleLoadTestData = async () => {
      // Select vehicle
      const testVehicle = { 
        VehicleNumber: 'TN01AB1234', 
        VehicleModel: 'Swift', 
        VehicleColor: 'Red', 
        CustomerName: 'Amit Kumar',
        CustomerID: 1,
        VehicleID: 1,
        MobileNumber1: '9876543210'
      };
      setSelectedVehicle(testVehicle);
      setVehicleInput(testVehicle.VehicleNumber);

      // JobCard
      setJobCardInput('jc1');

      // Add item to grid
      const testItem = { 
        itemid: 1,
        partnumber: '888414', 
        itemname: 'Test Item',
        mrp: 500,
        ItemNumber: '888414',
        Qty: 2,
        Discount: 1,
        UnitPrice: 500,
        Total: 500 * 2 * (1 - 1 / 100)
      };
      setGridRows([testItem]);

      // Set notes
      setNotes('note1');

      // Set staff (search and simulate selection)
      const staffMap = {
        technician1: 'murali',
        technician2: 'murali1',
        serviceadvisor: 'murali2',
        deliveryadvisor: 'murali3',
        testdriver: 'murali4',
        cleaner: 'Jagatheish',
        waterwash: 'Jagatheish'
      };

      // Set staff fields and simulate search results
      setStaffFields(staffMap);
      
      // Create dummy staff objects with searched names
      const dummyStaffMap = {
        technician1: { employeeid: 1, firstname: 'murali' },
        technician2: { employeeid: 2, firstname: 'murali1' },
        serviceadvisor: { employeeid: 3, firstname: 'murali2' },
        deliveryadvisor: { employeeid: 4, firstname: 'murali3' },
        testdriver: { employeeid: 5, firstname: 'murali4' },
        cleaner: { employeeid: 6, firstname: 'Jagatheish' },
        waterwash: { employeeid: 7, firstname: 'Jagatheish' }
      };
      
      setSelectedStaff(dummyStaffMap);

      // Set odometer
      setOdometer('111');

      // Set discount
      setDiscount('100');

      alert('Test data loaded successfully! Click "Save Invoice" to save.');
    };

    // Handle item input change
    const handleItemInputChange = async (e) => {
      const value = e.target.value;
      setItemInput(value);
      setSelectedItem(null);
      setItemPopupIndex(-1);
      if (value.length >= 2) {
        const results = await searchItems(value);
        setItemResults(results);
        setShowItemPopup(results.length > 0);
      } else {
        setItemResults([]);
        setShowItemPopup(false);
      }
    };

    // Keyboard navigation for item popup
    const handleItemInputKeyDown = (e) => {
      if (!showItemPopup || itemResults.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setItemPopupIndex(idx => (idx + 1) % itemResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setItemPopupIndex(idx => (idx - 1 + itemResults.length) % itemResults.length);
      } else if (e.key === 'Enter') {
        if (itemPopupIndex >= 0 && itemPopupIndex < itemResults.length) {
          handleSelectItem(itemResults[itemPopupIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowItemPopup(false);
      }
    };

    // Keyboard navigation for staff popups
    const handleStaffInputKeyDown = (field, e) => {
      if (!showStaffPopup[field] || !Array.isArray(staffResults[field]) || staffResults[field].length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setStaffPopupIndex(idx => ({ ...idx, [field]: (idx[field] + 1) % staffResults[field].length }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setStaffPopupIndex(idx => ({ ...idx, [field]: (idx[field] - 1 + staffResults[field].length) % staffResults[field].length }));
      } else if (e.key === 'Enter') {
        if (staffPopupIndex[field] >= 0 && staffPopupIndex[field] < staffResults[field].length) {
          handleSelectStaff(field, staffResults[field][staffPopupIndex[field]]);
        }
      } else if (e.key === 'Escape') {
        setShowStaffPopup(p => ({ ...p, [field]: false }));
      }
    };

    // Handle item selection
    const handleSelectItem = (item) => {
      setSelectedItem(item);
      setItemInput(item.partnumber + ' - ' + item.itemname);
      setShowItemPopup(false);
      setItemPopupIndex(-1);
      itemRowRefs.current = {};
      // Focus qty input after item selection
      setTimeout(() => {
        if (qtyInputRef.current) qtyInputRef.current.focus();
      }, 0);
    };

    // Handle quantity input change
    const handleQtyInputChange = (e) => {
      setQtyInput(e.target.value.replace(/[^0-9]/g, ''));
    };

    // Add item to grid
    const addItemToGrid = () => {
      if (selectedItem && qtyInput) {
        setGridRows(prevRows => {
          const idx = prevRows.findIndex(row => row.partnumber === selectedItem.partnumber);
          if (idx !== -1) {
            // Item exists: update qty and total
            return prevRows.map((row, i) =>
              i === idx
                ? {
                    ...row,
                    Qty: row.Qty + Number(qtyInput),
                    Total: (row.Qty + Number(qtyInput)) * row.mrp * (1 - (row.Discount || 0) / 100),
                  }
                : row
            );
          } else {
            // New item: add to grid
            return [
              ...prevRows,
              {
                ...selectedItem,
                ItemNumber: selectedItem.partnumber,
                Qty: Number(qtyInput),
                Discount: 0,
                UnitPrice: selectedItem.mrp,
                Total: selectedItem.mrp * Number(qtyInput),
                isDeleted: false,
              },
            ];
          }
        });
        setItemInput('');
        setQtyInput('');
        setSelectedItem(null);
      }
    };

    // Handle grid quantity/discount change
    const handleGridChange = (idx, field, value) => {
      setGridRows(rows => rows.map((row, i) =>
        i === idx
          ? {
              ...row,
              [field]: field === 'Qty' ? Number(value) : Number(value),
              Total: field === 'Qty'
                ? row.UnitPrice * Number(value) * (1 - (row.Discount || 0) / 100)
                : row.UnitPrice * row.Qty * (1 - (field === 'Discount' ? Number(value) : (row.Discount || 0)) / 100),
            }
          : row
      ));
    };

    // Handle delete row from grid (soft delete)
    const handleDeleteRow = (idx) => {
      setGridRows(rows => rows.map((row, i) => 
        i === idx ? { ...row, isDeleted: true } : row
      ));
    };

    // Handle payment popup open
    const handleOpenPaymentPopup = async () => {
      if (!selectedVehicle) {
        alert('Please select a vehicle first');
        return;
      }
      // TODO: Replace with real API call to fetch open invoices for this vehicle
      // For now, mock data
      const mockInvoices = [
        { invoiceid: 1, invoicenumber: 'INV26FEB001', vehiclenumber: 'TN01AB1234', amount: 5000, duedate: '2026-03-01' },
        { invoiceid: 2, invoicenumber: 'INV26FEB002', vehiclenumber: 'TN01AB1234', amount: 3500, duedate: '2026-03-05' },
        { invoiceid: 3, invoicenumber: 'INV26FEB003', vehiclenumber: 'TN01AB1234', amount: 2000, duedate: '2026-03-10' }
      ];
      // Sort invoices by invoiceid in descending order (latest first)
      const sortedInvoices = mockInvoices.sort((a, b) => b.invoiceid - a.invoiceid);
      setOpenInvoices(sortedInvoices);
      setShowPaymentPopup(true);
      setSelectedInvoiceForPayment(null);
      setPaymentAmount('');
      setSelectedPaymentMethod('');
      setInvoicePaymentAmounts({});
    };

    // Handle payment
    const handlePayment = async () => {
      if (!paymentAmount || Number(paymentAmount) <= 0) {
        alert('Please enter a valid total payment amount');
        return;
      }
      if (!selectedPaymentMethod) {
        alert('Please select a payment method');
        return;
      }
      
      // Calculate sum of individual invoice payments
      const totalInvoicePayments = Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0);
      
      if (totalInvoicePayments === 0) {
        alert('Please enter payment amount for at least one invoice');
        return;
      }
      
      if (totalInvoicePayments > Number(paymentAmount)) {
        alert(`Sum of invoice payments (₹${totalInvoicePayments}) cannot exceed total amount paid (₹${paymentAmount})`);
        return;
      }

      // Check if total allocated is less than amount paid
      if (totalInvoicePayments < Number(paymentAmount)) {
        alert(`You have allocated ₹${totalInvoicePayments} out of ₹${paymentAmount} paid. Please allocate the remaining ₹${Number(paymentAmount) - totalInvoicePayments} or adjust the payment amount.`);
        return;
      }
      
      // TODO: Call API to process payments for each invoice
      const paymentMethod = paymentMethods.find(m => m.id === parseInt(selectedPaymentMethod))?.paymentmethodname;
      alert(`Payment of ₹${paymentAmount} via ${paymentMethod} processed successfully`);
      setShowPaymentPopup(false);
      setPaymentAmount('');
      setSelectedInvoiceForPayment(null);
      setSelectedPaymentMethod('');
      setInvoicePaymentAmounts({});
    };
  // Vehicle search state
  const [vehicleInput, setVehicleInput] = useState('');
  const [vehicleResults, setVehicleResults] = useState([]);
  const [showVehiclePopup, setShowVehiclePopup] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehiclePopupIndex, setVehiclePopupIndex] = useState(-1);
  const vehiclePopupRef = React.useRef(null);
  const vehicleItemRefs = React.useRef({});

  // Auto-scroll vehicle popup when navigating with arrow keys
  React.useEffect(() => {
    if (vehiclePopupIndex >= 0 && vehicleItemRefs.current[vehiclePopupIndex]) {
      const element = vehicleItemRefs.current[vehiclePopupIndex];
      const container = vehiclePopupRef.current;
      if (element && container) {
        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const containerScroll = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        if (elementTop < containerScroll) {
          container.scrollTop = elementTop;
        } else if (elementTop + elementHeight > containerScroll + containerHeight) {
          container.scrollTop = elementTop + elementHeight - containerHeight;
        }
      }
    }
  }, [vehiclePopupIndex]);

  // Handle vehicle input change
  const handleVehicleInputChange = async (e) => {
    const value = e.target.value;
    setVehicleInput(value);
    setSelectedVehicle(null);
    setVehiclePopupIndex(-1);
    if (value.length >= 2) {
      const results = await searchVehiclesByNumber(value);
      setVehicleResults(results);
      setShowVehiclePopup(results.length > 0);
    } else {
      setVehicleResults([]);
      setShowVehiclePopup(false);
    }
  };

  // Handle vehicle input keydown (arrow keys and Enter)
  const handleVehicleInputKeyDown = (e) => {
    if (!showVehiclePopup || vehicleResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setVehiclePopupIndex(idx => (idx + 1) % vehicleResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setVehiclePopupIndex(idx => (idx - 1 + vehicleResults.length) % vehicleResults.length);
    } else if (e.key === 'Enter') {
      if (vehiclePopupIndex >= 0 && vehiclePopupIndex < vehicleResults.length) {
        handleSelectVehicle(vehicleResults[vehiclePopupIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowVehiclePopup(false);
    }
  };

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleInput(vehicle.VehicleNumber);
    setShowVehiclePopup(false);
    setVehiclePopupIndex(-1);
    vehicleItemRefs.current = {};
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* Top 20%: Vehicle and Invoice Info */}
      <div style={{ flex: '0 0 20%', display: 'flex', borderBottom: '1px solid #ddd', background: '#fff' }}>
        {/* Left: Vehicle Details */}
        <div style={{ flex: 1, padding: 24, borderRight: '1px solid #eee', minWidth: 0 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Vehicle Details</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 8 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Enter vehicle number"
                value={vehicleInput}
                onChange={handleVehicleInputChange}
                onKeyDown={handleVehicleInputKeyDown}
                style={{ width: 220, padding: 6, fontSize: 16 }}
              />
              {showVehiclePopup && (
                <div ref={vehiclePopupRef} style={{ position: 'absolute', top: 36, left: 0, zIndex: 10, background: '#fff', border: '1px solid #ccc', width: 260, maxHeight: 200, overflowY: 'auto', boxShadow: '0 2px 8px #0001' }}>
                  {vehicleResults.map((v, i) => (
                    <div
                      ref={el => vehicleItemRefs.current[i] = el}
                      key={v.VehicleNumber}
                      style={{ padding: 8, cursor: 'pointer', borderBottom: '1px solid #eee', background: i === vehiclePopupIndex ? '#e3f2fd' : (i % 2 === 0 ? '#f9f9f9' : '#fff') }}
                      onClick={() => handleSelectVehicle(v)}
                    >
                      {v.VehicleNumber} - {v.VehicleModel} ({v.VehicleColor})
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="jobCardInput" style={{ fontWeight: 500, marginRight: 6 }}>JobCard:</label>
              <input
                id="jobCardInput"
                type="text"
                placeholder="Enter JobCard number"
                value={jobCardInput}
                onChange={e => setJobCardInput(e.target.value)}
                style={{ width: 140, padding: 6, fontSize: 16 }}
              />
            </div>
          </div>
          {/* Vehicle Model and Color */}
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 500 }}>Model: </span>
            {selectedVehicle ? selectedVehicle.VehicleModel : <span style={{ color: '#aaa' }}>-</span>}
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Color: </span>
            {selectedVehicle ? selectedVehicle.VehicleColor : <span style={{ color: '#aaa' }}>-</span>}
          </div>
          {/* Customer Name and Phone Number */}
          <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}></div>
          <div style={{ marginBottom: 2 }}>
            <span style={{ fontWeight: 500 }}>Customer Name: </span>
            {selectedVehicle ? selectedVehicle.CustomerName : <span style={{ color: '#aaa' }}>-</span>}
          </div>
          <div>
            <span style={{ fontWeight: 500 }}>Phone Number: </span>
            {selectedVehicle && selectedVehicle.MobileNumber1 ? selectedVehicle.MobileNumber1 : <span style={{ color: '#aaa' }}>-</span>}
          </div>
        </div>
        {/* Right: Invoice Info */}
        <div style={{ flex: 1, padding: 24, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 16, textAlign: 'center' }}>
            Invoice No: {generateInvoiceNumber(invoiceRunningNumber, invoiceYearMonth)}
          </div>
          <button
            onClick={handleLoadTestData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 'auto'
            }}
          >
            Load Test Data
          </button>
        </div>
      </div>
      {/* Bottom 80%: Invoice Grid and Details (placeholder) */}
      <div style={{ flex: 1, padding: 24, display: 'flex', gap: 24 }}>
        {/* Left: Notes, Staff, Odometer */}
        <div style={{ flex: 2, minWidth: 0 }}>
          {/* Invoice Grid */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Enter item number or description"
                value={itemInput}
                onChange={handleItemInputChange}
                onKeyDown={handleItemInputKeyDown}
                style={{ width: 260, padding: 6, fontSize: 15 }}
              />
              {showItemPopup && (
                <div ref={itemPopupRef} style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: 340, maxHeight: 200, overflowY: 'auto', boxShadow: '0 2px 8px #0001', zIndex: 10 }}>
                  <table style={{ width: '100%', fontSize: '0.95em' }}>
                    <thead>
                      <tr style={{ background: '#e8f0fe' }}>
                        <th>PartNo</th>
                        <th>Item Name</th>
                        <th>UOM</th>
                        <th>MRP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemResults.map((item, i) => (
                        <tr
                          ref={el => itemRowRefs.current[i] = el}
                          key={item.itemid}
                          style={{ cursor: 'pointer', background: i === itemPopupIndex ? '#e3f2fd' : undefined }}
                          onClick={() => handleSelectItem(item)}
                        >
                          <td>{item.partnumber}</td>
                          <td>{item.itemname}</td>
                          <td>{item.uom}</td>
                          <td>{item.mrp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <input
                type="text"
                placeholder="Qty"
                value={qtyInput}
                onChange={handleQtyInputChange}
                style={{ width: 60, textAlign: 'right', fontSize: 15 }}
                disabled={!selectedItem}
                ref={qtyInputRef}
                onKeyDown={handleQtyKeyDown}
              />
              <button type="button" onClick={addItemToGrid} disabled={!selectedItem || !qtyInput}>Add</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f1f3f4' }}>
                  <th style={{ border: '1px solid #eee', padding: 6 }}>PartNo</th>
                  <th style={{ border: '1px solid #eee', padding: 6 }}>Item Name</th>
                  <th style={{ border: '1px solid #eee', padding: 6 }}>Qty</th>
                  <th style={{ border: '1px solid #eee', padding: 6 }}>Unit Price</th>
                  <th style={{ border: '1px solid #eee', padding: 6 }}>Discount %</th>
                  <th style={{ border: '1px solid #eee', padding: 6 }}>Total</th>
                  <th style={{ border: '1px solid #eee', padding: 6 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeGridRows.map((row) => {
                  const actualIdx = gridRows.findIndex(r => r === row);
                  return (
                  <tr key={actualIdx}>
                    <td style={{ border: '1px solid #eee', padding: 6 }}>{row.partnumber}</td>
                    <td style={{ border: '1px solid #eee', padding: 6 }}>{row.itemname}</td>
                    <td style={{ border: '1px solid #eee', padding: 6 }}>
                      <input
                        type="number"
                        min="1"
                        value={row.Qty}
                        onChange={e => handleGridChange(actualIdx, 'Qty', e.target.value)}
                        style={{ width: 50, textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #eee', padding: 6 }}>{row.UnitPrice}</td>
                    <td style={{ border: '1px solid #eee', padding: 6 }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.Discount}
                        onChange={e => handleGridChange(actualIdx, 'Discount', e.target.value)}
                        style={{ width: 50, textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #eee', padding: 6 }}>{row.Total.toFixed(2)}</td>
                    <td style={{ border: '1px solid #eee', padding: 6, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(actualIdx)}
                        title="Delete this item"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 18,
                          padding: 4,
                          color: '#d32f2f',
                          transition: 'transform 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {activeGridRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: 12 }}>No items added</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Notes, Staff, Odometer */}
          <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Notes</div>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', fontSize: 15, padding: 6, resize: 'vertical' }}
              />
            </div>
            <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div>Technician 1</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={staffFields.technician1}
                      onChange={e => handleStaffInputChange('technician1', e.target.value)}
                      style={{ width: '100%' }}
                      ref={staffInputRefs.technician1}
                      onKeyDown={e => handleStaffInputKeyDown('technician1', e)}
                    />
                    {showStaffPopup.technician1 && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', maxHeight: 80, overflowY: 'auto', zIndex: 10 }}>
                        {staffResults.technician1?.map((staff, i) => (
                          <div
                            key={Number.isFinite(staff.employeeid) ? staff.employeeid : (staff.firstname + i)}
                            style={{ padding: 6, cursor: 'pointer', background: i === staffPopupIndex.technician1 ? '#e3f2fd' : undefined }}
                            onClick={() => handleSelectStaff('technician1', staff)}
                          >
                            {staff.employeeid} - {staff.firstname}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div>Technician 2</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={staffFields.technician2}
                      onChange={e => handleStaffInputChange('technician2', e.target.value)}
                      style={{ width: '100%' }}
                      ref={staffInputRefs.technician2}
                      onKeyDown={e => handleStaffInputKeyDown('technician2', e)}
                    />
                    {showStaffPopup.technician2 && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', maxHeight: 80, overflowY: 'auto', zIndex: 10 }}>
                        {staffResults.technician2?.map((staff, i) => (
                          <div
                            key={Number.isFinite(staff.employeeid) ? staff.employeeid : (staff.firstname + i)}
                            style={{ padding: 6, cursor: 'pointer', background: i === staffPopupIndex.technician2 ? '#e3f2fd' : undefined }}
                            onClick={() => handleSelectStaff('technician2', staff)}
                          >
                            {staff.employeeid} - {staff.firstname}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div>Service Advisor</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={staffFields.serviceadvisor}
                      onChange={e => handleStaffInputChange('serviceadvisor', e.target.value)}
                      style={{ width: '100%' }}
                      ref={staffInputRefs.serviceadvisor}
                      onKeyDown={e => handleStaffInputKeyDown('serviceadvisor', e)}
                    />
                    {showStaffPopup.serviceadvisor && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', maxHeight: 80, overflowY: 'auto', zIndex: 10 }}>
                        {staffResults.serviceadvisor?.map((staff, i) => (
                          <div
                            key={Number.isFinite(staff.employeeid) ? staff.employeeid : (staff.firstname + i)}
                            style={{ padding: 6, cursor: 'pointer', background: i === staffPopupIndex.serviceadvisor ? '#e3f2fd' : undefined }}
                            onClick={() => handleSelectStaff('serviceadvisor', staff)}
                          >
                            {staff.employeeid} - {staff.firstname}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div>Delivery Advisor</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={staffFields.deliveryadvisor}
                      onChange={e => handleStaffInputChange('deliveryadvisor', e.target.value)}
                      style={{ width: '100%' }}
                      ref={staffInputRefs.deliveryadvisor}
                      onKeyDown={e => handleStaffInputKeyDown('deliveryadvisor', e)}
                    />
                    {showStaffPopup.deliveryadvisor && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', maxHeight: 80, overflowY: 'auto', zIndex: 10 }}>
                        {staffResults.deliveryadvisor?.map((staff, i) => (
                          <div
                            key={Number.isFinite(staff.employeeid) ? staff.employeeid : (staff.firstname + i)}
                            style={{ padding: 6, cursor: 'pointer', background: i === staffPopupIndex.deliveryadvisor ? '#e3f2fd' : undefined }}
                            onClick={() => handleSelectStaff('deliveryadvisor', staff)}
                          >
                            {staff.employeeid} - {staff.firstname}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div>Test Driver</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={staffFields.testdriver}
                      onChange={e => handleStaffInputChange('testdriver', e.target.value)}
                      style={{ width: '100%' }}
                      ref={staffInputRefs.testdriver}
                      onKeyDown={e => handleStaffInputKeyDown('testdriver', e)}
                    />
                    {showStaffPopup.testdriver && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', maxHeight: 80, overflowY: 'auto', zIndex: 10 }}>
                        {staffResults.testdriver?.map((staff, i) => (
                          <div
                            key={Number.isFinite(staff.employeeid) ? staff.employeeid : (staff.firstname + i)}
                            style={{ padding: 6, cursor: 'pointer', background: i === staffPopupIndex.testdriver ? '#e3f2fd' : undefined }}
                            onClick={() => handleSelectStaff('testdriver', staff)}
                          >
                            {staff.employeeid} - {staff.firstname}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div>Cleaner</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={staffFields.cleaner}
                      onChange={e => handleStaffInputChange('cleaner', e.target.value)}
                      style={{ width: '100%' }}
                      ref={staffInputRefs.cleaner}
                      onKeyDown={e => handleStaffInputKeyDown('cleaner', e)}
                    />
                    {showStaffPopup.cleaner && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', maxHeight: 80, overflowY: 'auto', zIndex: 10 }}>
                        {staffResults.cleaner?.map((staff, i) => (
                          <div
                            key={Number.isFinite(staff.employeeid) ? staff.employeeid : (staff.firstname + i)}
                            style={{ padding: 6, cursor: 'pointer', background: i === staffPopupIndex.cleaner ? '#e3f2fd' : undefined }}
                            onClick={() => handleSelectStaff('cleaner', staff)}
                          >
                            {staff.employeeid} - {staff.firstname}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div>WaterWash</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={staffFields.waterwash}
                      onChange={e => handleStaffInputChange('waterwash', e.target.value)}
                      style={{ width: '100%' }}
                      ref={staffInputRefs.waterwash}
                      onKeyDown={e => handleStaffInputKeyDown('waterwash', e)}
                    />
                    {showStaffPopup.waterwash && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', maxHeight: 80, overflowY: 'auto', zIndex: 10 }}>
                        {staffResults.waterwash?.map((staff, i) => (
                          <div
                            key={Number.isFinite(staff.employeeid) ? staff.employeeid : (staff.firstname + i)}
                            style={{ padding: 6, cursor: 'pointer', background: i === staffPopupIndex.waterwash ? '#e3f2fd' : undefined }}
                            onClick={() => handleSelectStaff('waterwash', staff)}
                          >
                            {staff.employeeid} - {staff.firstname}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div>Odometer Reading</div>
                <input
                  type="text"
                  value={odometer}
                  onChange={e => setOdometer(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ width: 180, fontSize: 15 }}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Right: Subtotal, Discount, Total */}
        <div style={{ flex: 1, minWidth: 0, alignSelf: 'flex-start' }}>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 24, minWidth: 260, maxWidth: 320 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span>Discount</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount}
                onChange={e => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                style={{ width: 80, textAlign: 'right' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 17, marginTop: 18 }}>
              <span>Total</span>
              <span>{total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleOpenPaymentPopup}
              style={{
                width: '100%',
                marginTop: 10,
                padding: 10,
                backgroundColor: '#FF9800',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              💳 Payment
            </button>
            <button
              onClick={handleSaveInvoice}
              disabled={isSaving}
              style={{
                width: '100%',
                marginTop: 20,
                padding: 10,
                backgroundColor: isSaving ? '#ccc' : '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 16,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>
      </div>
      {/* Payment Popup Modal */}
      {showPaymentPopup && (
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
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>💳 Payment</h2>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                  Vehicle: <span style={{ color: '#2196F3' }}>{selectedVehicle?.VehicleNumber}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, fontSize: 14, fontWeight: 600, color: '#333' }}>
                <div>
                  Total Amount: <span style={{ color: '#4CAF50' }}>₹{openInvoices.reduce((sum, inv) => sum + inv.amount, 0)}</span>
                </div>
                <div>
                  Remaining: <span style={{ color: '#FF9800' }}>₹{openInvoices.reduce((sum, inv) => sum + inv.amount, 0) - (Number(paymentAmount) || 0)}</span>
                </div>
              </div>
            </div>
            
            {/* Payment Method Dropdown and Amount Input - Top Left */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {/* Payment Method Dropdown */}
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, fontSize: 14 }}>Payment Method:</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={e => setSelectedPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 14,
                    backgroundColor: '#fff'
                  }}
                >
                  <option value="">-- Select Method --</option>
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.id}>{method.paymentmethodname}</option>
                  ))}
                </select>
              </div>

              {/* Payment Amount Input */}
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, fontSize: 14 }}>Amount:</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Remaining Balance Display */}
            {paymentAmount && (
              <div style={{ padding: 10, background: '#f5f5f5', borderRadius: 4, marginBottom: 20 }}>
                <div style={{ marginBottom: 4 }}>Total Amount: <strong>₹{paymentAmount}</strong></div>
                <div>Allocated: <strong>₹{Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0)}</strong></div>
                <div>Unallocated: <strong style={{ color: Number(paymentAmount) - Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0) < 0 ? '#d32f2f' : '#666' }}>₹{Number(paymentAmount) - Object.values(invoicePaymentAmounts).reduce((sum, amt) => sum + (Number(amt) || 0), 0)}</strong></div>
              </div>
            )}

            <p style={{ marginBottom: 12, color: '#666', fontSize: 14, fontWeight: 600 }}>Allocate payment to invoices:</p>
            
            {/* Invoices List with Individual Payment Inputs - Single Line Format */}
            <div style={{ marginBottom: 20, border: '1px solid #ddd', borderRadius: 4, maxHeight: 300, overflowY: 'auto' }}>
              {/* Header Row */}
              <div style={{
                padding: 10,
                background: '#f9f9f9',
                borderBottom: '2px solid #ddd',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                fontWeight: 600,
                fontSize: 13,
                color: '#333'
              }}>
                <div>Invoice Number</div>
                <div style={{ textAlign: 'right' }}>Invoice Value</div>
                <div style={{ textAlign: 'right' }}>Amount Allocated</div>
              </div>
              
              {/* Data Rows */}
              {openInvoices.map(invoice => (
                <div
                  key={invoice.invoiceid}
                  style={{
                    padding: 10,
                    borderBottom: '1px solid #eee',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    alignItems: 'center',
                    background: '#fff'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.invoicenumber}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#2196F3', fontWeight: 600 }}>₹{invoice.amount}</div>
                  <input
                    type="number"
                    placeholder="0"
                    value={invoicePaymentAmounts[invoice.invoiceid] || ''}
                    onChange={e => {
                      const enteredValue = e.target.value;
                      
                      // Allow clearing the field
                      if (!enteredValue) {
                        setInvoicePaymentAmounts(prev => ({
                          ...prev,
                          [invoice.invoiceid]: ''
                        }));
                        return;
                      }
                      
                      const numValue = Number(enteredValue);
                      if (isNaN(numValue) || numValue < 0) return;
                      
                      // Calculate sum of all other allocated amounts
                      const otherAllocated = Object.entries(invoicePaymentAmounts)
                        .reduce((sum, [id, amt]) => {
                          return id !== String(invoice.invoiceid) ? sum + (Number(amt) || 0) : sum;
                        }, 0);
                      
                      // Constraint 1: Cannot exceed invoice value
                      const maxByInvoice = invoice.amount;
                      
                      // Constraint 2: Cannot exceed remaining paid amount
                      const maxByPayment = Number(paymentAmount) - otherAllocated;
                      
                      // Take the minimum of both constraints
                      const maxAllowed = Math.min(maxByInvoice, maxByPayment);
                      
                      // Cap the value to max allowed
                      const finalValue = numValue > maxAllowed ? maxAllowed : numValue;
                      
                      setInvoicePaymentAmounts(prev => ({
                        ...prev,
                        [invoice.invoiceid]: finalValue
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowPaymentPopup(false)}
                style={{
                  flex: 1,
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
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={!paymentAmount || !selectedPaymentMethod || Object.values(invoicePaymentAmounts).every(amt => !amt)}
                style={{
                  flex: 1,
                  padding: 10,
                  background: !paymentAmount || !selectedPaymentMethod || Object.values(invoicePaymentAmounts).every(amt => !amt) ? '#ccc' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !paymentAmount || !selectedPaymentMethod || Object.values(invoicePaymentAmounts).every(amt => !amt) ? 'not-allowed' : 'pointer'
                }}
              >
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

// Helper to generate invoice number in format INVYYMMMXXX
function generateInvoiceNumber(runningNumber = 1, yearMonth = '') {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const currentYearMonth = `${year}${month}`;
  
  // Use provided yearMonth or current one
  const displayYearMonth = yearMonth || currentYearMonth;
  
  // Use provided running number
  const running = String(runningNumber).padStart(3, '0');
  return `INV${displayYearMonth}${running}`;
}
