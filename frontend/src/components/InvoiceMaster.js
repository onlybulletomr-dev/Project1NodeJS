import React, { useState } from 'react';
import { searchEmployees, searchItems, saveInvoice, getPaymentMethods, getNextInvoiceNumber, getCustomers, getVehicles, getAllVehicleDetails, getAllEmployees, getAllItems, searchItemsAndServices, getCompanies, getCompanyById, getBranchId } from '../api';

// Search all vehicles by vehicle number and return with customer details
async function searchVehiclesByNumber(query) {
  if (!query || query.length < 2) return []; // Require at least 2 characters
  
  try {
    // Fetch all vehicle details and customers
    const [vehiclesRes, customersRes] = await Promise.all([
      getAllVehicleDetails(),
      getCustomers()
    ]);
    
    console.log('Vehicle response:', vehiclesRes);
    console.log('Customers response:', customersRes);
    
    // Extract arrays from responses
    const allVehicles = Array.isArray(vehiclesRes) ? vehiclesRes : (vehiclesRes?.data || []);
    const allCustomers = Array.isArray(customersRes) ? customersRes : (customersRes?.data || []);
    
    console.log('Extracted allVehicles:', allVehicles);
    console.log('Extracted allCustomers:', allCustomers);
    
    if (!Array.isArray(allVehicles)) {
      console.log('allVehicles is not an array, returning []');
      return [];
    }
    
    // Create customer lookup map
    const customerMap = {};
    allCustomers?.forEach(c => {
      customerMap[c.CustomerID] = c;
    });
    
    console.log('Customer map:', customerMap);
    
    // Filter by vehicle number and enhance with customer data
    const results = allVehicles
      .filter(v => 
        v.vehiclenumber && v.vehiclenumber.toLowerCase().includes(query.toLowerCase())
      )
      .map(v => {
        const customer = customerMap[v.customerid];
        return {
          ...v,
          customername: customer ? `${customer.firstname || customer.FirstName || ''} ${customer.lastname || customer.LastName || ''}`.trim() : 'N/A',
          customerfirstname: customer?.firstname || customer?.FirstName || 'N/A',
          mobilenumber1: customer?.mobilenumber1 || customer?.MobileNumber1 || customer?.phonenumber || customer?.PhoneNumber || '-'
        };
      });
    
    console.log('Vehicle search results for query "' + query + '":', results);
    return results;
  } catch (error) {
    console.error('Error searching vehicles:', error);
    return [];
  }
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
    const itemInputRef = React.useRef(null);
    const itemRowRefs = React.useRef({});
    // Invoice grid state
    const [itemInput, setItemInput] = useState('');
    const [itemResults, setItemResults] = useState([]);
    const [showItemPopup, setShowItemPopup] = useState(false);
    const [itemPopupPosition, setItemPopupPosition] = useState({ top: 0, left: 0 });
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
    const [allEmployees, setAllEmployees] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [gsChecked, setGsChecked] = useState(false);
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
    // Generated invoice number and date from backend
    const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState(null);
    const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState(null);
    // Branch code from company master
    const [branchCode, setBranchCode] = useState('');
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
          const methods = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
          const formatted = methods.map(method => ({
            id: method.paymentmethodid,
            paymentmethodname: method.methodname
          }));
          setPaymentMethods(formatted);
        } catch (error) {
          console.error('Error fetching payment methods:', error);
          // Fallback to default methods if API fails
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

    // Load all employees for dropdown selection
    React.useEffect(() => {
      const fetchAllEmployees = async () => {
        try {
          const employees = await getAllEmployees();
          console.log('Loaded employees:', employees.length, employees);
          setAllEmployees(Array.isArray(employees) ? employees : []);
        } catch (error) {
          console.error('Error fetching employees:', error);
          setAllEmployees([]);
        }
      };
      fetchAllEmployees();
    }, []);

    // Load all items for item dropdown selection
    React.useEffect(() => {
      const fetchAllItems = async () => {
        try {
          const items = await getAllItems();
          console.log('Loaded items:', items.length, items);
          setAllItems(Array.isArray(items) ? items : []);
        } catch (error) {
          console.error('Error fetching items:', error);
          setAllItems([]);
        }
      };
      fetchAllItems();
    }, []);

    // Fetch the next invoice number on component mount
    React.useEffect(() => {
      const fetchNextInvoiceNumber = async () => {
        try {
          const { runningNumber, yearMonth } = await getNextInvoiceNumber();
          console.log('Fetched next invoice number:', runningNumber, yearMonth);
          setInvoiceRunningNumber(runningNumber);
          setInvoiceYearMonth(yearMonth);
        } catch (error) {
          console.error('Error fetching next invoice number:', error);
          // Keep default values (1 and current year-month)
        }
      };
      fetchNextInvoiceNumber();
    }, []);

    // Fetch branch code from company master based on logged-in user's company ID
    React.useEffect(() => {
      const fetchBranchCode = async () => {
        try {
          const userBranchId = getBranchId();
          console.log('User Branch ID from localStorage:', userBranchId);
          
          if (!userBranchId) {
            // If no branchId from login, try to fetch from companies list
            console.log('No branchId found, trying getCompanies...');
            const companies = await getCompanies();
            const companyList = Array.isArray(companies) ? companies : (companies?.data || []);
            console.log('Companies fetched:', companyList);
            if (companyList.length > 0) {
              const company = companyList[0];
              const code = company.ExtraVar1 || company.extravar1 || 'HO';
              setBranchCode(code.toUpperCase().substring(0, 3));
              console.log('Branch code from companies list:', code);
            } else {
              setBranchCode('HO');
            }
            return;
          }
          
          // Fetch the company details for the user's branch
          try {
            const companyResponse = await getCompanyById(userBranchId);
            // Extract the actual company data (API returns {success: true, data: {...}})
            const company = companyResponse?.data || companyResponse;
            const code = company?.ExtraVar1 || company?.extravar1 || 'HO';
            setBranchCode(code.toUpperCase().substring(0, 3));
            console.log('Branch code fetched for company', userBranchId, ':', code);
          } catch (companyError) {
            console.error('Failed to fetch company by ID, trying companies list...', companyError);
            // Fallback: fetch all companies and find the matching one
            const companies = await getCompanies();
            const companyList = Array.isArray(companies) ? companies : (companies?.data || []);
            console.log('All companies from fallback:', companyList);
            const matchedCompany = companyList.find(c => c.companyid === userBranchId || c.CompanyID === userBranchId);
            if (matchedCompany) {
              const code = matchedCompany.ExtraVar1 || matchedCompany.extravar1 || 'HO';
              setBranchCode(code.toUpperCase().substring(0, 3));
              console.log('Branch code from companies list (fallback):', code);
            } else {
              setBranchCode('HO');
            }
          }
        } catch (error) {
          console.error('Error fetching branch code:', error);
          setBranchCode('HO'); // Default fallback
        }
      };
      fetchBranchCode();
    }, []);

    // Generate preview invoice number based on invoiceRunningNumber, invoiceYearMonth, and branchCode
    React.useEffect(() => {
      if (invoiceRunningNumber && invoiceYearMonth && branchCode) {
        const year = invoiceYearMonth.substring(0, 2);
        const month = invoiceYearMonth.substring(2, 5);
        const running = String(invoiceRunningNumber).padStart(3, '0');
        const previewNumber = `INV${branchCode}${year}${month}${running}`;
        setPreviewInvoiceNumber(previewNumber);
      }
    }, [invoiceRunningNumber, invoiceYearMonth, branchCode]);

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
        const invoiceNumber = `INV${branchCode}${year}${month}${running}`;
        
        console.log('Generated invoice number:', invoiceNumber);
        console.log('Branch code:', branchCode, 'Running number:', runningNumber, 'Year-Month:', yearMonth);
        
        return invoiceNumber;
      } catch (error) {
        console.error('Error generating invoice number:', error);
        // Fallback to local state if API fails
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const currentYearMonth = `${year}${month}`;
        const code = branchCode || 'HO';
        
        if (currentYearMonth !== invoiceYearMonth) {
          setInvoiceYearMonth(currentYearMonth);
          setInvoiceRunningNumber(2);
          const running = String(1).padStart(3, '0');
          const fallbackNumber = `INV${code}${year}${month}${running}`;
          console.log('Using fallback invoice number:', fallbackNumber);
          return fallbackNumber;
        } else {
          const running = String(invoiceRunningNumber).padStart(3, '0');
          setInvoiceRunningNumber(prev => prev + 1);
          const fallbackNumber = `INV${code}${year}${month}${running}`;
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
        if (!selectedVehicle || !selectedVehicle.vehiclenumber) {
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
        // Note: InvoiceNumber is auto-generated by the backend with branch code
        const invoiceData = {
          BranchId: 1, // Default branch
          CustomerId: selectedVehicle.customerid || 1,
          VehicleId: selectedVehicle.vehicledetailid || 1,
          VehicleNumber: selectedVehicle.vehiclenumber,
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
            source: row.source || 'item', // Include source field to identify items vs services
          })),
          CreatedBy: 1, // Replace with actual user ID
        };

        console.log('Invoice data to be saved:', invoiceData);

        // Call API to save invoice
        const response = await saveInvoice(invoiceData);

        if (response.success) {
          // Store the generated invoice number and date
          setGeneratedInvoiceNumber(response.data.invoiceMaster.invoicenumber);
          setInvoiceDate(response.data.invoiceMaster.invoicedate);
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

    // Handle item input change
    const handleItemInputChange = async (e) => {
      const value = e.target.value;
      setItemInput(value);
      setSelectedItem(null);
      setItemPopupIndex(-1);
      if (value.length >= 2) {
        const results = await searchItemsAndServices(value);
        setItemResults(results);
        if (results.length > 0 && itemInputRef.current) {
          const rect = itemInputRef.current.getBoundingClientRect();
          setItemPopupPosition({
            top: rect.bottom + 5,
            left: rect.left
          });
          setShowItemPopup(true);
        }
      } else if (value.length > 0) {
        // Show all items if user types any character (even 1 char)
        if (allItems.length > 0 && itemInputRef.current) {
          const rect = itemInputRef.current.getBoundingClientRect();
          setItemPopupPosition({
            top: rect.bottom + 5,
            left: rect.left
          });
          setShowItemPopup(true);
        }
        setItemResults(allItems);
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
      // Format display based on source (item or service)
      const displayText = item.source === 'item' 
        ? `${item.partnumber} - ${item.itemname}`
        : `${item.serviceid} - ${item.servicename}`;
      setItemInput(displayText);
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
          // Create unique key based on source and ID
          const uniqueKey = selectedItem.source === 'item' 
            ? `item-${selectedItem.itemid}`
            : `service-${selectedItem.serviceid}`;
          
          // Create item identifier for finding duplicates
          const itemId = selectedItem.source === 'item' 
            ? selectedItem.itemid
            : selectedItem.serviceid;
          
          const idx = prevRows.findIndex(row => 
            row.source === selectedItem.source && 
            (row.itemid === itemId || row.serviceid === itemId)
          );
          
          // Get unit price based on source
          const unitPrice = selectedItem.source === 'item' 
            ? selectedItem.mrp
            : selectedItem.defaultrate;
          
          // Get item name for display
          const itemName = selectedItem.source === 'item'
            ? selectedItem.itemname
            : selectedItem.servicename;
          
          if (idx !== -1) {
            // Item exists: update qty and total
            return prevRows.map((row, i) =>
              i === idx
                ? {
                    ...row,
                    Qty: row.Qty + Number(qtyInput),
                    Total: (row.Qty + Number(qtyInput)) * unitPrice * (1 - (row.Discount || 0) / 100),
                  }
                : row
            );
          } else {
            // New item: add to grid
            return [
              ...prevRows,
              {
                ...selectedItem,
                ItemNumber: selectedItem.source === 'item' ? selectedItem.partnumber : selectedItem.serviceid,
                ItemName: itemName,
                Qty: Number(qtyInput),
                Discount: 0,
                UnitPrice: unitPrice,
                Total: unitPrice * Number(qtyInput),
                isDeleted: false,
              },
            ];
          }
        });
        setItemInput('');
        setQtyInput('');
        setSelectedItem(null);
        // Focus back to item input for quick entry
        if (itemInputRef.current) {
          itemInputRef.current.focus();
        }
      }
    };

    // Handle GS checkbox - add Water Wash, Chemical Charges, General Service
    const handleGsCheckboxChange = (e) => {
      const checked = e.target.checked;
      setGsChecked(checked);
      
      if (checked) {
        // Define the three services to add
        const gsServices = [
          { serviceid: 13, servicename: 'Water Wash', defaultrate: 150.00, source: 'service' },
          { serviceid: 15, servicename: 'Chemical Charges', defaultrate: 180.00, source: 'service' },
          { serviceid: 14, servicename: 'General Service', defaultrate: 880.00, source: 'service' }
        ];

        // Add all three services to grid
        setGridRows(prevRows => {
          let newRows = [...prevRows];
          gsServices.forEach(service => {
            // Check if service already exists
            const exists = newRows.some(row => row.serviceid === service.serviceid);
            if (!exists) {
              newRows.push({
                ...service,
                ItemNumber: service.serviceid,
                ItemName: service.servicename,
                Qty: 1,
                Discount: 0,
                UnitPrice: parseFloat(service.defaultrate),
                Total: parseFloat(service.defaultrate) * 1,
                isDeleted: false,
              });
            }
          });
          return newRows;
        });
      } else {
        // Remove the three GS services from grid when unchecked
        setGridRows(prevRows =>
          prevRows.filter(row => 
            !(row.serviceid === 13 || row.serviceid === 15 || row.serviceid === 14)
          )
        );
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
  const vehicleInputRef = React.useRef(null);
  const vehicleItemRefs = React.useRef({});
  const [vehiclePopupPosition, setVehiclePopupPosition] = useState({ top: 0, left: 0 });



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
      if (results.length > 0 && vehicleInputRef.current) {
        const rect = vehicleInputRef.current.getBoundingClientRect();
        setVehiclePopupPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
        setShowVehiclePopup(true);
      }
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
    setVehicleInput(vehicle.vehiclenumber);
    setShowVehiclePopup(false);
    setVehiclePopupIndex(-1);
    vehicleItemRefs.current = {};
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#f8f9fa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top 18%: Vehicle and Invoice Info */}
      <div style={{ flex: '0 0 18%', display: 'flex', borderBottom: '1px solid #ddd', background: '#fff', overflow: 'hidden' }}>
        {/* Left: Vehicle Details */}
        <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid #eee', minWidth: 0 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>Vehicle Details</div>
          
          {/* Vehicle Number and JobCard - Same Line */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
            {/* Vehicle Number Selection */}
            <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>Vehicle *:</label>
              <input
                ref={vehicleInputRef}
                type="text"
                placeholder="Search vehicle"
                value={vehicleInput}
                onChange={handleVehicleInputChange}
                onKeyDown={handleVehicleInputKeyDown}
                onBlur={() => setTimeout(() => setShowVehiclePopup(false), 200)}
                style={{ width: '140px', padding: 4, fontSize: 14 }}
              />
              {showVehiclePopup && (
                <div ref={vehiclePopupRef} style={{ position: 'fixed', top: `${vehiclePopupPosition.top}px`, left: `${vehiclePopupPosition.left}px`, zIndex: 10000, background: '#fff', border: '1px solid #ccc', width: '750px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {vehicleResults.map((v, i) => (
                    <div
                      ref={el => vehicleItemRefs.current[i] = el}
                      key={v.vehicledetailid || v.vehicleid}
                      style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', background: i === vehiclePopupIndex ? '#e3f2fd' : (i % 2 === 0 ? '#f9f9f9' : '#fff'), fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={() => handleSelectVehicle(v)}
                      title={`${v.vehiclenumber} - ${v.vehiclemodel} (${v.vehiclecolor}) | ${v.customername || 'N/A'} | ${v.mobilenumber1 || v.MobileNumber1 || '-'}`}
                    >
                      <span style={{ fontWeight: 500 }}>{v.vehiclenumber}</span> - <span>{v.vehiclemodel}</span> (<span>{v.vehiclecolor}</span>) | <span style={{ color: '#666' }}>{v.customername || 'N/A'}</span> | <span style={{ color: '#666' }}>{v.mobilenumber1 || v.MobileNumber1 || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JobCard */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="jobCardInput" style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>JobCard:</label>
              <input
                id="jobCardInput"
                type="text"
                placeholder="Enter JobCard"
                value={jobCardInput}
                onChange={e => setJobCardInput(e.target.value)}
                style={{ width: '100px', padding: 4, fontSize: 14 }}
              />
            </div>

            {/* KMs (Odometer) */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="odometerInput" style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>KMs:</label>
              <input
                id="odometerInput"
                type="text"
                placeholder="Enter KMs"
                value={odometer}
                onChange={e => setOdometer(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ width: '70px', padding: 4, fontSize: 14 }}
              />
            </div>
          </div>

          {/* Vehicle and Customer Info - Single Line (when vehicle is selected) */}
          {selectedVehicle && (
            <div style={{ fontSize: 14, color: '#333', display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0' }}>
              <span>{selectedVehicle.customername || 'N/A'}</span>
              <span>{selectedVehicle.mobilenumber1 || selectedVehicle.MobileNumber1 || '-'}</span>
              <span>{selectedVehicle.vehiclemodel || '-'}</span>
              <span>{selectedVehicle.vehiclecolor || '-'}</span>
            </div>
          )}


        </div>
        {/* Right: Invoice Info */}
        <div style={{ flex: 1, padding: '12px 16px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
          {generatedInvoiceNumber ? (
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                {generatedInvoiceNumber}
              </div>
              <div style={{ fontSize: 13, color: '#999' }}>
                {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
          ) : previewInvoiceNumber ? (
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a7a08', background: '#f0f8f0', padding: '8px 12px', borderRadius: 4 }}>
                {previewInvoiceNumber}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#999' }}>Loading invoice number...</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 82%: Invoice Grid and Details */}
      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', gap: 12, overflow: 'hidden' }}>
        {/* Left: Invoice Grid and Employee Fields */}
        <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Invoice Grid */}
          <div style={{ marginBottom: 4, flex: '0 0 210px', overflow: 'auto' }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={itemInputRef}
                  type="text"
                  placeholder="Enter item number or description"
                  value={itemInput}
                  onChange={handleItemInputChange}
                  onKeyDown={handleItemInputKeyDown}
                  onBlur={() => setTimeout(() => setShowItemPopup(false), 200)}
                  style={{ width: 220, padding: 4, fontSize: 14 }}
                />
                {showItemPopup && (
                  <div ref={itemPopupRef} style={{ position: 'fixed', top: `${itemPopupPosition.top}px`, left: `${itemPopupPosition.left}px`, background: '#fff', border: '1px solid #ccc', width: '700px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10000 }}>
                    {itemResults.map((result, i) => (
                      <div
                        ref={el => itemRowRefs.current[i] = el}
                        key={`${result.source}-${result.itemid || result.serviceid}`}
                        style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', background: i === itemPopupIndex ? '#e3f2fd' : (i % 2 === 0 ? '#f9f9f9' : '#fff'), fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        onClick={() => handleSelectItem(result)}
                        title={`${result.source === 'item' ? result.partnumber : result.serviceid} - ${result.source === 'item' ? result.itemname : result.servicename} - ₹${result.source === 'item' ? result.mrp : result.defaultrate} (${result.source})`}
                      >
                        <span style={{ fontWeight: 500 }}>{result.source === 'item' ? result.partnumber : result.serviceid}</span> | <span>{result.source === 'item' ? result.itemname : result.servicename}</span> | <span style={{ color: '#666' }}>₹{result.source === 'item' ? result.mrp : result.defaultrate}</span> | <span style={{ fontSize: '10px', color: '#999' }}>({result.source})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Qty"
                value={qtyInput}
                onChange={handleQtyInputChange}
                style={{ width: 50, textAlign: 'right', fontSize: 14, padding: 4 }}
                disabled={!selectedItem}
                ref={qtyInputRef}
                onKeyDown={handleQtyKeyDown}
              />
              <button type="button" onClick={addItemToGrid} disabled={!selectedItem || !qtyInput} style={{ padding: '4px 8px', fontSize: 14 }}>Add</button>
              <label style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: 14 }}>
                <input 
                  type="checkbox" 
                  checked={gsChecked} 
                  onChange={handleGsCheckboxChange}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '16px', fontWeight: '500' }}>GS</span>
              </label>
            </div>
            <div style={{ maxHeight: '210px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '2px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: '1em' }}>
              <thead>
                <tr style={{ background: '#f1f3f4' }}>
                  <th style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>PartNo</th>
                  <th style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>Item Name</th>
                  <th style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>Qty</th>
                  <th style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>Unit Price</th>
                  <th style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>Discount %</th>
                  <th style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>Total</th>
                  <th style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeGridRows.map((row) => {
                  const actualIdx = gridRows.findIndex(r => r === row);
                  const itemNumber = row.ItemNumber || row.partnumber || row.serviceid;
                  const itemName = row.ItemName || row.itemname || row.servicename;
                  return (
                  <tr key={actualIdx}>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{itemNumber}</td>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{itemName}</td>
                    <td style={{ border: '1px solid #eee', padding: 2 }}>
                      <input
                        type="number"
                        min="1"
                        value={row.Qty}
                        onChange={e => handleGridChange(actualIdx, 'Qty', e.target.value)}
                        style={{ width: 40, textAlign: 'right', fontSize: '12px', padding: 2 }}
                      />
                    </td>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{row.UnitPrice}</td>
                    <td style={{ border: '1px solid #eee', padding: 2 }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.Discount}
                        onChange={e => handleGridChange(actualIdx, 'Discount', e.target.value)}
                        style={{ width: 40, textAlign: 'right', fontSize: '12px', padding: 2 }}
                      />
                    </td>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{row.Total.toFixed(2)}</td>
                    <td style={{ border: '1px solid #eee', padding: 3, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(actualIdx)}
                        title="Delete this item"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 16,
                          padding: 2,
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
                    <td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: 3, fontSize: '12px' }}>No items added</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
          {/* Employee Fields - Single Row Below Grid - Left Side */}
          <div style={{ display: 'flex', gap: 3, marginTop: 2, justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, marginBottom: 1, fontWeight: 600 }}>Technician 1</div>
              <select
                value={staffFields.technician1}
                onChange={e => setStaffFields(f => ({ ...f, technician1: e.target.value }))}
                style={{ width: '100%', padding: 2, fontSize: 11 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, marginBottom: 1, fontWeight: 600 }}>Technician 2</div>
              <select
                value={staffFields.technician2}
                onChange={e => setStaffFields(f => ({ ...f, technician2: e.target.value }))}
                style={{ width: '100%', padding: 2, fontSize: 11 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, marginBottom: 1, fontWeight: 600 }}>Service Advisor</div>
              <select
                value={staffFields.serviceadvisor}
                onChange={e => setStaffFields(f => ({ ...f, serviceadvisor: e.target.value }))}
                style={{ width: '100%', padding: 2, fontSize: 11 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, marginBottom: 1, fontWeight: 600 }}>Delivery Advisor</div>
              <select
                value={staffFields.deliveryadvisor}
                onChange={e => setStaffFields(f => ({ ...f, deliveryadvisor: e.target.value }))}
                style={{ width: '100%', padding: 2, fontSize: 11 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, marginBottom: 1, fontWeight: 600 }}>Test Driver</div>
              <select
                value={staffFields.testdriver}
                onChange={e => setStaffFields(f => ({ ...f, testdriver: e.target.value }))}
                style={{ width: '100%', padding: 2, fontSize: 11 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, marginBottom: 1, fontWeight: 600 }}>Cleaner</div>
              <select
                value={staffFields.cleaner}
                onChange={e => setStaffFields(f => ({ ...f, cleaner: e.target.value }))}
                style={{ width: '100%', padding: 2, fontSize: 11 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, marginBottom: 1, fontWeight: 600 }}>WaterWash</div>
              <select
                value={staffFields.waterwash}
                onChange={e => setStaffFields(f => ({ ...f, waterwash: e.target.value }))}
                style={{ width: '100%', padding: 2, fontSize: 11 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Right: Summary, Payment, Save Button */}
        <div style={{ flex: 1, minWidth: 0, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 4, padding: 12, minWidth: 220, maxWidth: 280, flex: '0 0 auto' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span>Discount</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount}
                onChange={e => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                style={{ width: 50, textAlign: 'right', fontSize: 14, padding: 2 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14, marginTop: 6 }}>
              <span>Total</span>
              <span>{total.toFixed(2)}</span>
            </div>
            <textarea
              rows={3}
              placeholder="Notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%',
                marginTop: 7,
                padding: 6,
                fontSize: 13,
                resize: 'none',
                border: '1px solid #ddd',
                borderRadius: 4,
              }}
            />
            <button
              onClick={handleOpenPaymentPopup}
              style={{
                width: '100%',
                marginTop: 7,
                padding: 6,
                backgroundColor: '#FF9800',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
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
                marginTop: 7,
                padding: 6,
                backgroundColor: isSaving ? '#ccc' : '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
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
