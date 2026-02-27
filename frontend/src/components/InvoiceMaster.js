import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { searchEmployees, saveInvoice, getNextInvoiceNumber, getCustomers, getAllVehicleDetails, getAllEmployees, getAllItems, searchItemsAndServices, getCompanies, getCompanyById, getBranchId } from '../api';

// Search all vehicles by vehicle number and return with customer details
async function searchVehiclesByNumber(query) {
  if (!query || query.length < 2) return []; // Require at least 2 characters
  
  try {
    const [vehiclesRes, customersRes] = await Promise.all([
      getAllVehicleDetails(),
      getCustomers()
    ]);
    
    const allVehicles = Array.isArray(vehiclesRes) ? vehiclesRes : (vehiclesRes?.data || []);
    const allCustomers = Array.isArray(customersRes) ? customersRes : (customersRes?.data || []);
    
    if (!Array.isArray(allVehicles)) {
      return [];
    }
    
    const customerMap = {};
    allCustomers?.forEach(c => {
      customerMap[c.CustomerID] = c;
    });
    
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
  const location = useLocation();
    const buildDefaultStaffFields = (defaultEmployeeName = '') => ({
      technician1: defaultEmployeeName || '',
      technician2: 'N/A',
      serviceadvisor: defaultEmployeeName || '',
      deliveryadvisor: defaultEmployeeName || '',
      testdriver: 'N/A',
      cleaner: 'N/A',
      waterwash: 'N/A'
    });
    // --- State hooks for all variables used in this component ---
    const [allEmployees, setAllEmployees] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [invoiceRunningNumber, setInvoiceRunningNumber] = useState(1);
    const [invoiceYearMonth, setInvoiceYearMonth] = useState('');
    const [branchCode, setBranchCode] = useState('');
    const [branchCompany, setBranchCompany] = useState(null);
    const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState('');
    const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [jobCardInput, setJobCardInput] = useState('');
    const [staffFields, setStaffFields] = useState(buildDefaultStaffFields());
    const [staffResults, setStaffResults] = useState({
      technician1: [], technician2: [], serviceadvisor: [], deliveryadvisor: [], testdriver: [], cleaner: [], waterwash: []
    });
    const [showStaffPopup, setShowStaffPopup] = useState({
      technician1: false, technician2: false, serviceadvisor: false, deliveryadvisor: false, testdriver: false, cleaner: false, waterwash: false
    });
    const [, setSelectedStaff] = useState({
      technician1: null, technician2: null, serviceadvisor: null, deliveryadvisor: null, testdriver: null, cleaner: null, waterwash: null
    });
    const [staffPopupIndex, setStaffPopupIndex] = useState({
      technician1: -1, technician2: -1, serviceadvisor: -1, deliveryadvisor: -1, testdriver: -1, cleaner: -1, waterwash: -1
    });
    const [itemInput, setItemInput] = useState('');
    const [itemResults, setItemResults] = useState([]);
    const [showItemPopup, setShowItemPopup] = useState(false);
    const [itemPopupIndex, setItemPopupIndex] = useState(-1);
    const [itemPopupPosition, setItemPopupPosition] = useState({ top: 0, left: 0 });
    const [qtyInput, setQtyInput] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [gridRows, setGridRows] = useState([]);
    const [notes, setNotes] = useState('');
    const [odometer, setOdometer] = useState('');
    const [discount, setDiscount] = useState('');
    const [gsChecked, setGsChecked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const itemRowRefs = React.useRef({});
    const qtyInputRef = React.useRef(null);
    const itemPopupRef = React.useRef(null);
    const itemInputRef = React.useRef(null);


    // Load all employees for dropdown selection
    React.useEffect(() => {
      const fetchAllEmployees = async () => {
        try {
          const employees = await getAllEmployees();
          console.log('Loaded employees:', employees.length, employees);
          const normalizedEmployees = Array.isArray(employees) ? employees : [];
          setAllEmployees(normalizedEmployees);

          if (normalizedEmployees.length > 0) {
            const defaultName = normalizedEmployees[0].firstName || normalizedEmployees[0].firstname || '';
            if (defaultName) {
              const defaultFields = buildDefaultStaffFields(defaultName);
              setStaffFields(prev => ({
                technician1: prev.technician1 || defaultFields.technician1,
                technician2: prev.technician2 || defaultFields.technician2,
                serviceadvisor: prev.serviceadvisor || defaultFields.serviceadvisor,
                deliveryadvisor: prev.deliveryadvisor || defaultFields.deliveryadvisor,
                testdriver: prev.testdriver || defaultFields.testdriver,
                cleaner: prev.cleaner || defaultFields.cleaner,
                waterwash: prev.waterwash || defaultFields.waterwash,
              }));
            }
          }
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
              setBranchCompany(company);
              console.log('Branch code from companies list:', code);
            } else {
              setBranchCode('HO');
              setBranchCompany(null);
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
            setBranchCompany(company || null);
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
              setBranchCompany(matchedCompany);
              console.log('Branch code from companies list (fallback):', code);
            } else {
              setBranchCode('HO');
              setBranchCompany(null);
            }
          }
        } catch (error) {
          console.error('Error fetching branch code:', error);
          setBranchCode('HO'); // Default fallback
          setBranchCompany(null);
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
        const previewNumber = `${branchCode}${year}${month}${running}`;
        setPreviewInvoiceNumber(previewNumber);
      }
    }, [invoiceRunningNumber, invoiceYearMonth, branchCode]);

    // ...existing code...

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

    // Generate invoice number
    const generateInvoiceNumberForSave = async () => {
      try {
        // Query backend for next invoice number based on current month/year
        const { runningNumber, yearMonth } = await getNextInvoiceNumber();
        
        const year = yearMonth.substring(0, 2);
        const month = yearMonth.substring(2, 5);
        const running = String(runningNumber).padStart(3, '0');
        const invoiceNumber = `${branchCode}${year}${month}${running}`;
        
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
          const fallbackNumber = `${code}${year}${month}${running}`;
          console.log('Using fallback invoice number:', fallbackNumber);
          return fallbackNumber;
        } else {
          const running = String(invoiceRunningNumber).padStart(3, '0');
          setInvoiceRunningNumber(prev => prev + 1);
          const fallbackNumber = `${code}${year}${month}${running}`;
          console.log('Using fallback invoice number:', fallbackNumber);
          return fallbackNumber;
        }
      }
    };

    const validateMandatoryFields = () => {
      if (!selectedVehicle || !selectedVehicle.vehiclenumber) {
        alert('Please select a vehicle');
        return false;
      }
      if (!jobCardInput.trim()) {
        alert('Please enter the Job Card number');
        return false;
      }
      if (!odometer.trim()) {
        alert('Please enter KMs');
        return false;
      }
      if (!String(staffFields.technician1 || '').trim()) {
        alert('Please select Technician');
        return false;
      }
      if (!String(staffFields.serviceadvisor || '').trim()) {
        alert('Please select Service Advisor');
        return false;
      }
      if (activeGridRows.length === 0) {
        alert('Please add at least one item to the invoice');
        return false;
      }
      return true;
    };
    
    const handleSaveInvoice = async () => {
      try {
        // Prevent concurrent saves
        if (isSaving) {
          alert('Save is already in progress. Please wait...');
          return;
        }

        if (!validateMandatoryFields()) {
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
          const resetDefaultName = allEmployees[0]?.firstName || allEmployees[0]?.firstname || '';
          setStaffFields(buildDefaultStaffFields(resetDefaultName));
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

    const getInvoiceDocumentData = (mode = 'print') => {
      if (!validateMandatoryFields()) {
        return null;
      }

      const safe = (value) => (value ?? '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const companyName = branchCompany?.CompanyName || branchCompany?.companyname || 'ONLY BULLET';
      const companyPhone = branchCompany?.PhoneNumber1 || branchCompany?.phonenumber1 || '';
      const companyEmail = branchCompany?.EmailAddress || branchCompany?.emailaddress || '';
      const companyAddressLines = [
        branchCompany?.AddressLine1 || branchCompany?.addressline1,
        branchCompany?.AddressLine2 || branchCompany?.addressline2,
        [branchCompany?.City || branchCompany?.city, branchCompany?.State || branchCompany?.state]
          .filter(Boolean)
          .join(', '),
        branchCompany?.PostalCode || branchCompany?.postalcode,
      ].filter((line) => line && String(line).trim().length > 0);

      const companyHeaderPhoneLine = companyPhone
        ? `${branchCode || 'BRANCH'} - ${companyPhone}`
        : '';

      const companyAddressHtml = (companyAddressLines.length > 0
        ? companyAddressLines
        : [
            '190, Ponniyaman Kovil 2nd St,',
            'Behind South Indian Bank, & Sholinganallur,',
          ]
      ).map((line) => `<div>${safe(line)}</div>`).join('');

      const printableInvoiceNumber = generatedInvoiceNumber || previewInvoiceNumber || 'DRAFT';
      const printableDate = invoiceDate
        ? new Date(invoiceDate).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB');

      const rowsHtml = activeGridRows.map((row) => `
        <tr>
          <td>${safe(row.ItemNumber || row.partnumber || row.serviceid || '')}</td>
          <td>${safe(row.ItemName || row.itemname || row.servicename || '')}</td>
          <td style="text-align:right;">${Number(row.Qty || 0).toFixed(0)}</td>
          <td style="text-align:right;">₹${Number(row.UnitPrice || 0).toFixed(0)}</td>
          <td style="text-align:right;">₹${Number(row.Total || 0).toFixed(0)}</td>
        </tr>
      `).join('');

      const blankRowsHtml = Array.from({ length: Math.max(0, 18 - activeGridRows.length) })
        .map(() => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>')
        .join('');

      const staffSummary = [
        staffFields.technician1 && `Technician: ${staffFields.technician1}`,
        staffFields.technician2 && `Assistant: ${staffFields.technician2}`,
        staffFields.serviceadvisor && `Service Advisor: ${staffFields.serviceadvisor}`,
        staffFields.deliveryadvisor && `Delivery Advisor: ${staffFields.deliveryadvisor}`,
        staffFields.testdriver && `Test Driver: ${staffFields.testdriver}`,
        staffFields.cleaner && `Cleaner: ${staffFields.cleaner}`,
        staffFields.waterwash && `WaterWash: ${staffFields.waterwash}`,
      ].filter(Boolean).join(' | ');

      const totalAmountValue = Number(total || 0);
      const upiId = process.env.REACT_APP_UPI_ID || '';
      const upiPayeeName = process.env.REACT_APP_UPI_PAYEE_NAME || 'ONLY BULLET';
      const qrPayload = upiId
        ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiPayeeName)}&am=${totalAmountValue.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${printableInvoiceNumber}`)}`
        : `PAY|INR|${totalAmountValue.toFixed(2)}|${printableInvoiceNumber}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrPayload)}`;

      const previewToolbarHtml = mode === 'preview'
        ? `
            <div class="preview-toolbar">
              <button type="button" onclick="window.print()">Print</button>
              <button type="button" onclick="window.close()">Close</button>
            </div>
          `
        : '';

      const html = `
        <html>
          <head>
            <title>Invoice ${safe(printableInvoiceNumber)}</title>
            <style>
              @page { size: A4; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; background: #ebebeb; color: #111; }
              .preview-toolbar { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px 0; }
              .preview-toolbar button { border: 1px solid #666; background: #fff; color: #111; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
              .sheet { width: 760px; min-height: 1080px; margin: 12px auto; background: #fff; border: 2px solid #7a7a7a; padding: 14px 16px; box-sizing: border-box; }
              .top { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .company { width: 52%; font-size: 12px; line-height: 1.3; }
              .brand { font-weight: 700; font-size: 24px; margin-bottom: 4px; letter-spacing: 0.3px; }
              .meta { width: 45%; font-size: 12px; }
              .meta-row { display: flex; margin-bottom: 2px; }
              .meta-label { width: 98px; }
              .customer { margin-top: 8px; margin-left: 10px; line-height: 1.3; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
              th, td { border-left: 2px solid #666; border-right: 2px solid #666; padding: 3px 5px; font-size: 11px; }
              thead th { background: #6a6a6a; color: #fff; border-top: 2px solid #666; border-bottom: 2px solid #666; text-align: left; }
              tbody tr:last-child td { border-bottom: 2px solid #666; }
              .col-item { width: 13%; }
              .col-desc { width: 48%; }
              .col-qty { width: 8%; text-align: right; }
              .col-rate { width: 15%; text-align: right; }
              .col-total { width: 16%; text-align: right; }
              .totals { display: flex; justify-content: flex-end; margin-top: 8px; }
              .totals-box { width: 260px; font-size: 14px; font-weight: 700; }
              .totals-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
              .bottom { margin-top: 12px; display: flex; justify-content: space-between; gap: 16px; }
              .notes-bank { flex: 1; font-size: 12px; line-height: 1.3; white-space: pre-line; }
              .qr-area { width: 180px; text-align: center; }
              .qr-area img { width: 130px; height: 130px; border: 1px solid #999; padding: 4px; }
              .tech { margin-top: 10px; font-size: 13px; font-weight: 700; }
              @media print {
                .preview-toolbar { display: none; }
                body { background: #fff; }
              }
            </style>
          </head>
          <body>
            ${previewToolbarHtml}
            <div class="sheet">
              <div class="top">
                <div class="company">
                  <div class="brand">${safe(companyName)}</div>
                  ${companyHeaderPhoneLine ? `<div>${safe(companyHeaderPhoneLine)}</div>` : ''}
                  ${companyAddressHtml}
                  ${companyEmail ? `<div>${safe(companyEmail)}</div>` : ''}
                </div>
                <div class="meta">
                  <div class="meta-row"><div class="meta-label">Date:</div><div>${safe(printableDate)}</div></div>
                  <div class="meta-row"><div class="meta-label">Invoice No :</div><div>${safe(printableInvoiceNumber)}</div></div>
                  <div class="meta-row"><div class="meta-label">Vehicle No:</div><div>${safe(selectedVehicle.vehiclenumber || '-')}</div></div>
                  <div class="meta-row"><div class="meta-label">PO No:</div><div>${safe(jobCardInput || '-')}</div></div>

                  <div class="customer">
                    <div>${safe(selectedVehicle.customername || 'N/A')}</div>
                    <div>${safe(selectedVehicle.vehiclemodel || '')} ${safe(selectedVehicle.vehiclecolor || '')}</div>
                  </div>
                </div>
              </div>

            <table>
              <thead>
                <tr>
                  <th class="col-item">Item</th>
                  <th class="col-desc">Description</th>
                  <th class="col-qty">Qty</th>
                  <th class="col-rate">Unit Price</th>
                  <th class="col-total">Total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}${blankRowsHtml}</tbody>
            </table>

            <div class="totals">
              <div class="totals-box">
                <div class="totals-line"><span>Total</span><span>₹${Number(total).toFixed(0)}</span></div>
                <div class="totals-line"><span>Balance Due</span><span>₹${Number(total).toFixed(0)}</span></div>
              </div>
            </div>

            <div class="bottom">
              <div class="notes-bank">
ODO : ${safe(odometer || '-') } Kms
Observation:
${safe(notes || '-')}

Bank Details :
A/C No            : 344 002 000 285538
NAME              : ONLY BULLET
IFSC Code         : IOBA0003400
Bank /Branch      : INDIAN OVERSEAS BANK / SEMMANCHERRY
A/c Type          : Current Account
              </div>
              <div class="qr-area">
                <img src="${qrImageUrl}" alt="Invoice Amount QR" crossorigin="anonymous" />
                <div style="font-size:11px; margin-top:4px;">Scan &amp; Pay ₹${Number(total).toFixed(2)}</div>
              </div>
            </div>

            <div class="tech">Technician: ${safe(staffFields.technician1 || staffSummary || '-')}</div>
            </div>
          </body>
        </html>
      `;

      return {
        html,
        printableInvoiceNumber,
      };
    };

    const savePdfWithPickerOrDownload = async (doc, fileName) => {
      try {
        if (window.showSaveFilePicker) {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'PDF Document',
                accept: { 'application/pdf': ['.pdf'] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(doc.output('blob'));
          await writable.close();
          return;
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
      }

      doc.save(fileName);
    };

    const handleInvoiceDocument = (mode = 'print') => {
      const invoiceDocumentData = getInvoiceDocumentData(mode);
      if (!invoiceDocumentData) {
        return;
      }

      const printWindow = window.open('', '_blank', 'width=980,height=720');
      if (!printWindow) {
        alert('Popup blocked. Please allow popups to print invoice.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(invoiceDocumentData.html);
      printWindow.document.close();
      printWindow.focus();

      if (mode === 'preview') {
        return;
      }

      setTimeout(() => {
        printWindow.print();
      }, 300);
    };

    const handlePrintInvoice = () => {
      handleInvoiceDocument('print');
    };

    const handlePreviewInvoice = () => {
      handleInvoiceDocument('preview');
    };

    const handleSavePdfInvoice = async () => {
      const invoiceDocumentData = getInvoiceDocumentData('pdf');
      if (!invoiceDocumentData) {
        return;
      }

      const rawVehicleNumber = selectedVehicle?.vehiclenumber || '';
      const vehicleDigits = String(rawVehicleNumber).replace(/\D/g, '');
      const last4VehicleDigits = vehicleDigits.slice(-4) || String(rawVehicleNumber).slice(-4);

      const rawCustomerFirstName =
        selectedVehicle?.customerfirstname ||
        (selectedVehicle?.customername ? String(selectedVehicle.customername).trim().split(/\s+/)[0] : 'Customer');

      const safeLast4 = String(last4VehicleDigits || '0000').replace(/[^a-zA-Z0-9]/g, '');
      const safeFirstName = String(rawCustomerFirstName || 'Customer').replace(/[^a-zA-Z0-9]/g, '');
      const fileNameCore = `${safeLast4}${safeFirstName}` || `Invoice${invoiceDocumentData.printableInvoiceNumber}`;
      const fileName = `${fileNameCore}.pdf`;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = '820px';
      iframe.style.height = '1120px';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);

      try {
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Timed out while preparing invoice PDF view.')), 15000);
          iframe.onload = () => {
            clearTimeout(timeoutId);
            resolve();
          };
          iframe.srcdoc = invoiceDocumentData.html;
        });

        const iframeDocument = iframe.contentDocument;
        const invoiceSheet = iframeDocument?.querySelector('.sheet');
        if (!invoiceSheet) {
          throw new Error('Unable to render invoice sheet for PDF.');
        }

        const images = Array.from(iframeDocument?.images || []);
        await Promise.all(
          images.map((img) => {
            if (img.complete) {
              return Promise.resolve();
            }
            return new Promise((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          })
        );

        const canvas = await html2canvas(invoiceSheet, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidthMm = 210;
        const pageHeightMm = 297;
        const pageHeightPx = (canvas.width * pageHeightMm) / pageWidthMm;
        let renderedHeightPx = 0;
        let isFirstPage = true;

        while (renderedHeightPx < canvas.height) {
          const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;

          const pageContext = pageCanvas.getContext('2d');
          pageContext.drawImage(
            canvas,
            0,
            renderedHeightPx,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );

          const pageImage = pageCanvas.toDataURL('image/png');
          const pageImageHeightMm = (sliceHeightPx * pageWidthMm) / canvas.width;

          if (!isFirstPage) {
            pdf.addPage();
          }
          pdf.addImage(pageImage, 'PNG', 0, 0, pageWidthMm, pageImageHeightMm);

          renderedHeightPx += sliceHeightPx;
          isFirstPage = false;
        }

        await savePdfWithPickerOrDownload(pdf, fileName);
      } catch (error) {
        console.error('Error saving invoice PDF:', error);
        alert(`Failed to save invoice PDF. ${error.message || ''}`.trim());
      } finally {
        iframe.remove();
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

    // ...existing code...

  // Vehicle search state
  const [vehicleInput, setVehicleInput] = useState('');
  const [vehicleResults, setVehicleResults] = useState([]);
  const [showVehiclePopup, setShowVehiclePopup] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehiclePopupIndex, setVehiclePopupIndex] = useState(-1);
  const vehiclePopupRef = React.useRef(null);
  const vehicleInputRef = React.useRef(null);
  const jobCardInputRef = React.useRef(null);
  const vehicleItemRefs = React.useRef({});
  const lastAppliedVehicleRef = React.useRef('');
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

  React.useEffect(() => {
    const prefillVehicleNumber = location.state?.prefillVehicleNumber;
    const prefillCustomerId = location.state?.prefillCustomerId;

    if (!prefillVehicleNumber || lastAppliedVehicleRef.current === prefillVehicleNumber) {
      return;
    }

    lastAppliedVehicleRef.current = prefillVehicleNumber;
    setVehicleInput(prefillVehicleNumber);

    const applyVehiclePrefill = async () => {
      try {
        const results = await searchVehiclesByNumber(prefillVehicleNumber);
        if (!Array.isArray(results) || results.length === 0) {
          return;
        }

        const exactMatchByCustomer = results.find(
          (vehicle) =>
            String(vehicle.customerid) === String(prefillCustomerId) &&
            String(vehicle.vehiclenumber).toLowerCase() === String(prefillVehicleNumber).toLowerCase()
        );

        const exactMatchByNumber = results.find(
          (vehicle) => String(vehicle.vehiclenumber).toLowerCase() === String(prefillVehicleNumber).toLowerCase()
        );

        handleSelectVehicle(exactMatchByCustomer || exactMatchByNumber || results[0]);
      } catch (error) {
        console.error('Error applying vehicle prefill:', error);
      }
    };

    applyVehiclePrefill();

    setTimeout(() => {
      if (jobCardInputRef.current) {
        jobCardInputRef.current.focus();
      }
    }, 0);
  }, [location.state]);

  return (
    <>
      <div style={{ height: '100vh', width: '100vw', background: '#f8f9fa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top 18%: Vehicle and Invoice Info */}
        <div style={{ flex: '0 0 auto', display: 'flex', borderBottom: '1px solid #ddd', background: '#fff', overflow: 'hidden' }}>
          {/* Left: Vehicle Details */}
          <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #eee', minWidth: 0 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Vehicle Details</div>
            
            {/* All inputs on ONE LINE: Vehicle, JobCard, KMs */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
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
                <label htmlFor="jobCardInput" style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>JobCard *:</label>
                <input
                  ref={jobCardInputRef}
                  id="jobCardInput"
                  type="text"
                  placeholder="Enter JobCard"
                  value={jobCardInput}
                  onChange={e => setJobCardInput(e.target.value)}
                  required
                  style={{ width: '100px', padding: 4, fontSize: 14 }}
                />
              </div>

              {/* KMs (Odometer) */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="odometerInput" style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>KMs *:</label>
                <input
                  id="odometerInput"
                  type="text"
                  placeholder="Enter KM"
                  value={odometer}
                  onChange={e => setOdometer(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  style={{ width: '70px', padding: 4, fontSize: 14 }}
                />
              </div>
            </div>

            {/* Customer Details - Second Line (when vehicle is selected) */}
            {selectedVehicle && (
              <div style={{ fontSize: 12, color: '#555', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span>{selectedVehicle.customername || 'N/A'}</span>
                <span>{selectedVehicle.mobilenumber1 || selectedVehicle.MobileNumber1 || '-'}</span>
                <span>{selectedVehicle.vehiclemodel || '-'}</span>
                <span>{selectedVehicle.vehiclecolor || '-'}</span>
              </div>
            )}
          </div>

          {/* Right: Invoice Info */}
          <div style={{ flex: 1, padding: '8px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginRight: '10%' }}>
            {generatedInvoiceNumber ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                  {generatedInvoiceNumber}
                </div>
                <div style={{ fontSize: 13, color: '#999' }}>
                  {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A'}
                </div>
              </div>
            ) : previewInvoiceNumber ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
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

        {/* Main Content Area - Grid and Employee Fields */}
        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', gap: 12, overflow: 'hidden' }}>
          {/* Left: Invoice Grid and Employee Fields */}
          <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Invoice Grid */}
          <div style={{ marginBottom: 2, flex: '0 0 270px', overflow: 'auto' }}>
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
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '2px' }}>
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
                {activeGridRows.map((row, actualIdx) => (
                  <tr key={actualIdx}>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{row.PartNo}</td>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{row.ItemName}</td>
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
                ))}
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
          <div style={{ display: 'flex', gap: 2, marginTop: 0, justifyContent: 'flex-start', flexWrap: 'nowrap', overflow: 'auto', flex: '0 0 auto' }}>
            <div style={{ flex: 1, minWidth: 0, minWidth: '100px' }}>
              <div style={{ fontSize: 9, marginBottom: 1, fontWeight: 600 }}>Technician</div>
              <select
                value={staffFields.technician1}
                onChange={e => setStaffFields(f => ({ ...f, technician1: e.target.value }))}
                style={{ width: '100%', padding: 1, fontSize: 10 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0, minWidth: '100px' }}>
              <div style={{ fontSize: 9, marginBottom: 1, fontWeight: 600 }}>Assistant</div>
              <select
                value={staffFields.technician2}
                onChange={e => setStaffFields(f => ({ ...f, technician2: e.target.value }))}
                style={{ width: '100%', padding: 1, fontSize: 10 }}
              >
                <option value="">-- Select --</option>
                <option value="N/A">N/A</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0, minWidth: '100px' }}>
              <div style={{ fontSize: 9, marginBottom: 1, fontWeight: 600 }}>Service Advisor</div>
              <select
                value={staffFields.serviceadvisor}
                onChange={e => setStaffFields(f => ({ ...f, serviceadvisor: e.target.value }))}
                style={{ width: '100%', padding: 1, fontSize: 10 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0, minWidth: '100px' }}>
              <div style={{ fontSize: 9, marginBottom: 1, fontWeight: 600 }}>Delivery Advisor</div>
              <select
                value={staffFields.deliveryadvisor}
                onChange={e => setStaffFields(f => ({ ...f, deliveryadvisor: e.target.value }))}
                style={{ width: '100%', padding: 1, fontSize: 10 }}
              >
                <option value="">-- Select --</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0, minWidth: '100px' }}>
              <div style={{ fontSize: 9, marginBottom: 1, fontWeight: 600 }}>Test Driver</div>
              <select
                value={staffFields.testdriver}
                onChange={e => setStaffFields(f => ({ ...f, testdriver: e.target.value }))}
                style={{ width: '100%', padding: 1, fontSize: 10 }}
              >
                <option value="">-- Select --</option>
                <option value="N/A">N/A</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0, minWidth: '100px' }}>
              <div style={{ fontSize: 9, marginBottom: 1, fontWeight: 600 }}>Cleaner</div>
              <select
                value={staffFields.cleaner}
                onChange={e => setStaffFields(f => ({ ...f, cleaner: e.target.value }))}
                style={{ width: '100%', padding: 1, fontSize: 10 }}
              >
                <option value="">-- Select --</option>
                <option value="N/A">N/A</option>
                {allEmployees.map((emp) => (
                  <option key={emp.employeeid} value={emp.firstname}>
                    {emp.firstName || emp.firstname || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0, minWidth: '100px' }}>
              <div style={{ fontSize: 9, marginBottom: 1, fontWeight: 600 }}>WaterWash</div>
              <select
                value={staffFields.waterwash}
                onChange={e => setStaffFields(f => ({ ...f, waterwash: e.target.value }))}
                style={{ width: '100%', padding: 1, fontSize: 10 }}
              >
                <option value="">-- Select --</option>
                <option value="N/A">N/A</option>
                <option value="Outside">Outside</option>
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
        <div style={{ flex: 1, minWidth: 0, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', overflow: 'auto', height: '100%' }}>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 4, padding: 12, minWidth: 220, maxWidth: 320, flex: '0 0 auto' }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
              <span>Discount</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount}
                onChange={e => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                style={{ width: 50, textAlign: 'right', fontSize: 13, padding: 2 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 15, marginTop: 6 }}>
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
                marginTop: 8,
                padding: 6,
                fontSize: 12,
                resize: 'none',
                border: '1px solid #ddd',
                borderRadius: 4,
              }}
            />
            {/* Payment button removed as per requirements */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={handleSaveInvoice}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: 7,
                  backgroundColor: isSaving ? '#ccc' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'Saving...' : 'Save Invoice'}
              </button>
              <button
                onClick={handlePrintInvoice}
                style={{
                  flex: 1,
                  padding: 7,
                  backgroundColor: '#1565c0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Print Invoice
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={handlePreviewInvoice}
                style={{
                  flex: 1,
                  padding: 7,
                  backgroundColor: '#546e7a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Preview
              </button>
              <button
                onClick={handleSavePdfInvoice}
                style={{
                  flex: 1,
                  padding: 7,
                  backgroundColor: '#2e7d32',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save PDF
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
      </>
    );
}


