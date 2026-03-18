import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import SerialNumberUpdatePopup from './SerialNumberUpdatePopup';
import SerialNumberSelectionPopup from './SerialNumberSelectionPopup';
import { searchEmployees, saveInvoice, updateInvoice, getNextInvoiceNumber, getCustomers, getAllVehicleDetails, getAllEmployees, searchItemsAndServices, searchItemsInvoiceMode, getAllItemsAndServices, getAllItemsAndServicesInvoicePlus, getCompanies, getCompanyById, getBranchId, getInvoiceById, getAllItems, getAllServices, updateItemDetailQuantity, validateVendorInvoice, verifyDuplicatePassword } from '../api';
import { generateInvoicePrintTemplate, openPrintWindow } from '../utils/printUtils';

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

export default function InvoiceForm({ mode = 'invoice' }) {
  // mode: 'invoice' = standard invoice (no qty checks)
  //       'invoice-plus' = advanced invoice (restore qty validation)
  const location = useLocation();
    const editInvoiceId = location.state?.editInvoiceId || location.state?.invoiceId;
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
    const [itemMessage, setItemMessage] = useState('');
    const [allServices, setAllServices] = useState([]); // Cache all services for lookup
    const [selectedItem, setSelectedItem] = useState(null);
    const [gridRows, setGridRows] = useState([]);
    const [notes, setNotes] = useState('');
    const [odometer, setOdometer] = useState('');
    const [discount, setDiscount] = useState('');
    const [gsChecked, setGsChecked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showUpdateItemsPopup, setShowUpdateItemsPopup] = useState(false);
    const [showUpdateSerialNumberPopup, setShowUpdateSerialNumberPopup] = useState(false);
    const [showSerialNumberSelectionPopup, setShowSerialNumberSelectionPopup] = useState(false);
    const [serialNumberSelectionItem, setSerialNumberSelectionItem] = useState(null);
    const [updateItemsRows, setUpdateItemsRows] = useState(Array(5).fill({ partnumber: '', description: '', qtyToAdd: '' }));
    const [updateItemsMessage, setUpdateItemsMessage] = useState('');
    const [allItemsList, setAllItemsList] = useState([]);
    const [updateItemsDropdownOpen, setUpdateItemsDropdownOpen] = useState(Array(5).fill(false));
    const [updateItemsDropdownResults, setUpdateItemsDropdownResults] = useState(Array(5).fill([]));
    const [updateItemsDropdownIndex, setUpdateItemsDropdownIndex] = useState(Array(5).fill(-1));
    const itemRowRefs = React.useRef({});
    // File-based update mode state
    const [updateItemsMode, setUpdateItemsMode] = useState('manual'); // 'manual' or 'file'
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [parsedInvoiceItems, setParsedInvoiceItems] = useState([]);
    const [isValidatingFile, setIsValidatingFile] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [duplicatePassword, setDuplicatePassword] = useState('');
    const [duplicateBillNo, setDuplicateBillNo] = useState(null);
    const [passwordVerified, setPasswordVerified] = useState(false);
    const qtyInputRef = React.useRef(null);
    const itemPopupRef = React.useRef(null);
    const itemInputRef = React.useRef(null);
    const updateItemsDropdownRefs = React.useRef({});
    const updateItemsInputRefs = React.useRef({});


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

          // Load all services for service charge lookups
          try {
            const services = await getAllServices();
            setAllServices(Array.isArray(services) ? services : []);
            console.log('Loaded all services for charge lookups:', services.length);
          } catch (error) {
            console.error('Error loading all services:', error);
          }

          // Load all items for update items popup (invoice+ mode only)
          if (mode === 'invoice-plus') {
            try {
              const items = await getAllItems();
              setAllItemsList(Array.isArray(items) ? items : []);
              console.log('Loaded all items for update popup:', items.length);
            } catch (error) {
              console.error('Error loading all items:', error);
            }
          }
        } catch (error) {
          console.error('Error fetching employees:', error);
          setAllEmployees([]);
        }
      };
      fetchAllEmployees();
    }, [mode]);

    // Load all items and services for invoice mode
    React.useEffect(() => {
      if (mode === 'invoice') {
        const loadAllItems = async () => {
          try {
            const items = await getAllItemsAndServices();
            console.log('Loaded all items and services:', items.length);
            setItemResults(items);
          } catch (error) {
            console.error('Error loading all items and services:', error);
          }
        };
        loadAllItems();
      }
    }, [mode]);

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


    const getRemainingQtyForItem = React.useCallback((item, rows = gridRows) => {
      if (!item || item.source !== 'item') return null;

      const baseQty = Number(item.availableqty ?? 0);
      const consumedQty = rows
        .filter(row => !row.isDeleted && row.source === 'item' && Number(row.itemid) === Number(item.itemid))
        .reduce((sum, row) => sum + Number(row.Qty || 0), 0);

      return Math.max(baseQty - consumedQty, 0);
    }, [gridRows]);

    // Subtotal calculation (only active rows)
    const activeGridRows = gridRows
      .map((row, originalIndex) => ({ ...row, originalIndex }))
      .filter(row => !row.isDeleted);
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

        // Calculate PartsIncome and ServiceIncome based on item source
        let partsIncome = 0;
        let serviceIncome = 0;
        
        activeGridRows.forEach(row => {
          const rowTotal = Number(row.Total || 0);
          if (row.source === 'service') {
            serviceIncome += rowTotal;
          } else {
            // Default to parts income for items and unknown sources
            partsIncome += rowTotal;
          }
        });

        // Prepare invoice data with correct field names for the database schema
        // Note: InvoiceNumber is auto-generated by the backend with branch code
        const invoiceData = {
          BranchId: 1, // Default branch
          CustomerId: selectedVehicle.customerid || 1,
          VehicleId: selectedVehicle.vehicleid || selectedVehicle.vehicledetailid || 1,
          VehicleNumber: selectedVehicle.vehiclenumber,
          JobCardId: jobCardInput || 0,
          SubTotal: subTotal,
          TotalDiscount: totalDiscount,
          PartsIncome: partsIncome,
          ServiceIncome: serviceIncome,
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
            PartNumber: row.partnumber || '', // Include screen PartNumber snapshot
            ItemName: row.ItemName || '', // Include screen ItemName snapshot
            Qty: row.Qty,
            UnitPrice: row.UnitPrice,
            Discount: row.Discount || 0,
            Total: row.Total,
            source: row.source || 'item', // Include source field to identify items vs services
            serialnumberid: row.serialnumberid || null, // Include serial number ID if this is a serial-tracked item
          })),
          CreatedBy: 1, // Replace with actual user ID
        };

        console.log('Invoice data to be saved:', invoiceData);

        // Call API to save or update invoice
        const response = editInvoiceId
          ? await updateInvoice(editInvoiceId, invoiceData)
          : await saveInvoice(invoiceData);

        if (response.success) {
          const responseInvoiceMaster = response?.data?.invoiceMaster || response?.data || {};
          if (responseInvoiceMaster.invoicenumber) {
            setGeneratedInvoiceNumber(responseInvoiceMaster.invoicenumber);
          }
          if (responseInvoiceMaster.invoicedate) {
            setInvoiceDate(responseInvoiceMaster.invoicedate);
          }

          if (editInvoiceId) {
            alert('Invoice updated successfully! Invoice Number: ' + (responseInvoiceMaster.invoicenumber || generatedInvoiceNumber || previewInvoiceNumber));
          } else {
            alert('Invoice saved successfully! Invoice Number: ' + responseInvoiceMaster.invoicenumber);
            // Reset form only after create
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
          }
        } else {
          alert(`Error ${editInvoiceId ? 'updating' : 'saving'} invoice: ` + response.message);
        }
      } catch (error) {
        console.error(`Error ${editInvoiceId ? 'updating' : 'saving'} invoice:`, error);
        
        // Check for duplicate key error
        if (error.response?.data?.message?.includes('duplicate key') || error.message?.includes('duplicate key')) {
          alert('Invoice number already exists! This may be due to multiple simultaneous save attempts. Please refresh and try again.');
        } else if (error.response?.data?.message) {
          const backendError = error.response?.data?.error ? ` (${error.response.data.error})` : '';
          alert(`Error ${editInvoiceId ? 'updating' : 'saving'} invoice: ` + error.response.data.message + backendError);
        } else {
          alert(`Failed to ${editInvoiceId ? 'update' : 'save'} invoice. Error: ` + error.message);
        }
      } finally {
        setIsSaving(false);
      }
    };

    const getInvoiceDocumentData = (mode = 'print') => {
      if (!validateMandatoryFields()) {
        return null;
      }

      const companyAddressLines = [
        branchCompany?.AddressLine1 || branchCompany?.addressline1,
        branchCompany?.AddressLine2 || branchCompany?.addressline2,
        [branchCompany?.City || branchCompany?.city, branchCompany?.State || branchCompany?.state]
          .filter(Boolean)
          .join(', '),
        branchCompany?.PostalCode || branchCompany?.postalcode,
      ].filter((line) => line && String(line).trim().length > 0);

      const companyAddressHtml = (companyAddressLines.length > 0
        ? companyAddressLines
        : [
            '190, Ponniyaman Kovil 2nd St,',
            'Behind South Indian Bank, & Sholinganallur,',
          ]
      ).map((line) => `<div>${line}</div>`).join('');

      const invoiceData = {
        invoiceNumber: generatedInvoiceNumber || previewInvoiceNumber || 'DRAFT',
        invoiceDate: invoiceDate
          ? new Date(invoiceDate).toLocaleDateString('en-GB')
          : new Date().toLocaleDateString('en-GB'),
        vehicleNumber: selectedVehicle.vehiclenumber || '-',
        vehicleModel: selectedVehicle.vehiclemodel || selectedVehicle.model || selectedVehicle.carmodel || selectedVehicle.modelname || '-',
        vehicleColor: selectedVehicle.vehiclecolor || selectedVehicle.color || selectedVehicle.carcolor || selectedVehicle.colorname || '-',
        jobCard: jobCardInput || '-',
        customerName: selectedVehicle.customername || '-',
        area: selectedVehicle.area || selectedVehicle.custArea || selectedVehicle.location || '-',
        phoneNumber: selectedVehicle.phonenumber || selectedVehicle.customer_phonenumber || selectedVehicle.custphonenumber || '-',
        companyName: branchCompany?.CompanyName || branchCompany?.companyname || 'ONLY BULLET',
        companyEmail: branchCompany?.EmailAddress || branchCompany?.emailaddress || '',
        companyPhone: branchCompany?.PhoneNumber1 || branchCompany?.phonenumber1 || '',
        companyAddress: companyAddressHtml,
        odometer: odometer || '-',
        notes: notes || '-',
        items: activeGridRows,
        total: total || 0,
      };

      const { html } = generateInvoicePrintTemplate(invoiceData);
      return { html, printableInvoiceNumber: invoiceData.invoiceNumber };
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
      setItemMessage('');
      setSelectedItem(null);
      setItemPopupIndex(-1);
      
      let results = [];
      
      if (mode === 'invoice') {
        // For invoice mode: use simplified search (itemmaster only, no qty)
        if (value.length === 0) {
          results = await getAllItemsAndServices();
        } else if (value.length >= 1) {
          results = await searchItemsInvoiceMode(value);
        }
      } else {
        // For invoice+ mode: use itemdetail search (with qty validation enabled)
        if (value.length === 0) {
          results = await getAllItemsAndServicesInvoicePlus();
        } else if (value.length >= 1) {
          results = await searchItemsAndServices(value);
        }
      }
      
      setItemResults(results);
      
      if (results.length > 0 && itemInputRef.current) {
        const rect = itemInputRef.current.getBoundingClientRect();
        setItemPopupPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
        setShowItemPopup(true);
      } else {
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
      setItemMessage('');
      
      // Format display based on source (item or service)
      const displayText = item.source === 'item' 
        ? `${item.partnumber} - ${item.itemdescription || item.itemname}`
        : `${item.itemnumber || item.servicenumber} - ${item.servicename || item.itemdescription}`;
      setItemInput(displayText);
      setShowItemPopup(false);
      setItemPopupIndex(-1);
      itemRowRefs.current = {};
      
      // Set qty to 1 by default
      setQtyInput('1');
      
      // For invoice+ mode
      if (mode === 'invoice-plus' && item.source === 'item') {
        // If item has serial number tracking, skip qty check and go directly to serial popup
        // Serial-tracked items manage qty via serialnumber table, not itemdetail
        if (item.serialnumbertracking) {
          setSerialNumberSelectionItem({
            ...item,
            requestedQty: 1
          });
          setShowSerialNumberSelectionPopup(true);
          return;
        }

        // For non-serial items, check qty availability from itemdetail
        const remainingQty = getRemainingQtyForItem(item);
        if (Number(remainingQty) <= 0) {
          setItemMessage('Item cannot be added due to insufficient qty.');
          // Still focus on qty field if qty is not available
          setTimeout(() => {
            if (qtyInputRef.current) qtyInputRef.current.focus();
          }, 0);
          return;
        }
      }
      
      // Focus qty input after item selection (for non-serial items or non-invoice+ mode)
      setTimeout(() => {
        if (qtyInputRef.current) qtyInputRef.current.focus();
      }, 0);
    };

    // Handle quantity input change
    const handleQtyInputChange = (e) => {
      setItemMessage('');
      setQtyInput(e.target.value.replace(/[^0-9]/g, ''));
    };

    // Add item to grid
    const addItemToGrid = () => {
      if (selectedItem && qtyInput) {
        // For Invoice+ mode, enforce quantity checks; for standard Invoice, allow any qty
        if (mode === 'invoice-plus' && selectedItem.source === 'item') {
          const availableQty = getRemainingQtyForItem(selectedItem);
          const requestedQty = Number(qtyInput);

          if (availableQty <= 0) {
            setItemMessage('Item cannot be added due to insufficient qty.');
            return;
          }

          if (requestedQty > availableQty) {
            setItemMessage(`Item cannot be added due to insufficient qty. Available qty: ${availableQty.toFixed(0)}.`);
            return;
          }
        }

        // Check if item has serial number tracking (Invoice+ mode only)
        if (mode === 'invoice-plus' && selectedItem.source === 'item' && selectedItem.serialnumbertracking && Number(qtyInput) > 0) {
          // Show serial number selection popup for items with serial tracking
          setSerialNumberSelectionItem({
            ...selectedItem,
            requestedQty: Number(qtyInput)
          });
          setShowSerialNumberSelectionPopup(true);
          return;
        }

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
            !row.isDeleted &&
            row.source === selectedItem.source && 
            (row.itemid === itemId || row.serviceid === itemId)
          );
          
          // Get unit price based on source
          let unitPrice = selectedItem.source === 'item' 
            ? Number(selectedItem.mrp) || 0
            : Number(selectedItem.defaultrate) || 0;
          
          // Get item name for display
          let itemName = selectedItem.source === 'item'
            ? (selectedItem.itemdescription || selectedItem.itemname)
            : selectedItem.servicename;
          
          let newRowsToAdd = [];
          
          // Handle service charges for Invoice+ mode only
          if (mode === 'invoice-plus' && selectedItem.source === 'item' && selectedItem.servicechargeid && selectedItem.servicechargeid > 0) {
            const chargeService = allServices.find(s => String(s.serviceid) === String(selectedItem.servicechargeid));
            
            if (selectedItem.servicechargemethod === 'Add' && chargeService) {
              // "Add" method: add item normally, then add service as separate line item
              const serviceRow = {
                source: 'service',
                serviceid: chargeService.serviceid,
                ItemNumber: chargeService.servicenumber,
                ItemName: chargeService.servicename,
                Qty: Number(qtyInput),
                Discount: 0,
                UnitPrice: Number(chargeService.defaultrate) || 0,
                Total: (Number(chargeService.defaultrate) || 0) * Number(qtyInput),
                isDeleted: false,
              };
              
              if (idx !== -1) {
                // Item already exists: update qty and add service row if it doesn't exist
                const updatedRows = prevRows.map((row, i) =>
                  i === idx
                    ? {
                        ...row,
                        Qty: row.Qty + Number(qtyInput),
                        Total: (row.Qty + Number(qtyInput)) * row.UnitPrice * (1 - (row.Discount || 0) / 100),
                      }
                    : row
                );
                
                // Check if service row already exists for this item
                const serviceRowIndex = updatedRows.findIndex(row =>
                  row.source === 'service' &&
                  row.serviceid === chargeService.serviceid &&
                  prevRows[idx].partnumber === prevRows.find(r => r === prevRows[idx]).partnumber
                );
                
                if (serviceRowIndex !== -1) {
                  // Service row exists: keep qty at 1 (service charge only applies once)
                  // Don't increment the service row qty
                } else {
                  // Service row doesn't exist: add it with qty = 1
                  updatedRows.push(serviceRow);
                }
                
                return updatedRows;
              } else {
                // New item: add both item and service rows
                return [
                  ...prevRows,
                  {
                    ...selectedItem,
                    ItemNumber: selectedItem.partnumber,
                    ItemName: itemName,
                    Qty: Number(qtyInput),
                    Discount: 0,
                    UnitPrice: unitPrice,
                    Total: unitPrice * Number(qtyInput),
                    isDeleted: false,
                  },
                  serviceRow,
                ];
              }
            } else if ((selectedItem.servicechargemethod === 'RR' || selectedItem.servicechargemethod === 'Overhauling') && chargeService) {
              // "RR" or "Overhauling" method: append to itemname, service charge applies once
              itemName = `${itemName} + ${selectedItem.servicechargemethod}`;
              const serviceRate = Number(chargeService.defaultrate) || 0;
              const basePrice = unitPrice; // Store original item price (105)
              const displayPrice = unitPrice + serviceRate; // Display price for UI (105 + 280 = 385)
              
              if (idx !== -1) {
                // Item exists: update qty only (service charge stays same, doesn't multiply)
                return prevRows.map((row, i) =>
                  i === idx
                    ? {
                        ...row,
                        Qty: row.Qty + Number(qtyInput),
                        // Total = (base_price * new_qty) + service_charge
                        Total: (row.basePriceForServiceCharge * (row.Qty + Number(qtyInput))) + row.serviceChargeForRow,
                      }
                    : row
                );
              } else {
                // New item: add to grid with base price and service charge stored separately
                const newQty = Number(qtyInput);
                return [
                  ...prevRows,
                  {
                    ...selectedItem,
                    ItemNumber: selectedItem.partnumber,
                    ItemName: itemName,
                    Qty: newQty,
                    Discount: 0,
                    UnitPrice: displayPrice, // Display: 385 (for reference)
                    basePriceForServiceCharge: basePrice, // Store: 105 (for recalculation)
                    serviceChargeForRow: serviceRate, // Store: 280 (for recalculation)
                    // Total = (base_price * qty) + service_charge
                    Total: (basePrice * newQty) + serviceRate,
                    isDeleted: false,
                  },
                ];
              }
            } else {
              // No service charge logic applies
              if (idx !== -1) {
                // Item exists: update qty and total
                return prevRows.map((row, i) =>
                  i === idx
                    ? {
                        ...row,
                        Qty: row.Qty + Number(qtyInput),
                        Total: (row.Qty + Number(qtyInput)) * row.UnitPrice * (1 - (row.Discount || 0) / 100),
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
                    ItemName: itemName,
                    Qty: Number(qtyInput),
                    Discount: 0,
                    UnitPrice: unitPrice,
                    Total: unitPrice * Number(qtyInput),
                    isDeleted: false,
                  },
                ];
              }
            }
          } else {
            // No service charge setup
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
                  ItemNumber: selectedItem.source === 'item' ? selectedItem.partnumber : (selectedItem.itemnumber || selectedItem.servicenumber),
                  ItemName: itemName,
                  Qty: Number(qtyInput),
                  Discount: 0,
                  UnitPrice: unitPrice,
                  Total: unitPrice * Number(qtyInput),
                  isDeleted: false,
                },
              ];
            }
          }
        });
        setItemInput('');
        setQtyInput('');
        setSelectedItem(null);
        setItemMessage('');
        // Focus back to item input for quick entry
        if (itemInputRef.current) {
          itemInputRef.current.focus();
        }
      }
    };

    // Handle serial number selection from popup
    const handleSerialNumbersSelected = (selectedSerials) => {
      if (!serialNumberSelectionItem || selectedSerials.length === 0) {
        return;
      }

      const item = serialNumberSelectionItem;
      
      // Add a row for each selected serial number
      setGridRows(prevRows => {
        const newRows = [...prevRows];
        
        selectedSerials.forEach(serial => {
          // Format item name: itemname - serialnumber | batch | model | manufacturername
          const parts = [
            item.itemname || item.itemdescription,
            `SN: ${serial.serialnumber}`,
          ];
          if (serial.batch) parts.push(`Batch: ${serial.batch}`);
          if (serial.model) parts.push(`Model: ${serial.model}`);
          if (serial.manufacturername) parts.push(`Mfg: ${serial.manufacturername}`);
          
          const formattedItemName = parts.join(' | ');
          
          // Use MRP from serialnumber table, not fro itemmaster
          const unitPrice = serial.mrp || item.mrp || 0;
          
          newRows.push({
            ...item,
            serialnumberid: serial.serialnumberid,
            serialnumber: serial.serialnumber,
            ItemNumber: item.partnumber,
            ItemName: formattedItemName,
            Qty: 1,
            Discount: 0,
            UnitPrice: unitPrice,
            Total: unitPrice * 1,
            isDeleted: false,
          });
        });
        
        return newRows;
      });

      // Reset states
      setShowSerialNumberSelectionPopup(false);
      setSerialNumberSelectionItem(null);
      setItemInput('');
      setQtyInput('');
      setSelectedItem(null);
      setItemMessage('');
      
      // Focus back to item input for quick entry
      if (itemInputRef.current) {
        itemInputRef.current.focus();
      }
    };

    // Handle GS checkbox - add Water Wash, Chemical Charges, General Service
    const handleGsCheckboxChange = (e) => {
      const checked = e.target.checked;
      setGsChecked(checked);
      
      if (checked) {
        // Define the three services to add - using serviceid 1, 2, 3 as per requirement
        const gsServices = [
          { serviceid: 1, servicename: 'Water Wash', defaultrate: 150.00, source: 'service' },
          { serviceid: 2, servicename: 'Chemical Charges', defaultrate: 180.00, source: 'service' },
          { serviceid: 3, servicename: 'General Service', defaultrate: 880.00, source: 'service' }
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
            !(row.serviceid === 1 || row.serviceid === 2 || row.serviceid === 3)
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
                ? row.basePriceForServiceCharge
                  ? ((row.basePriceForServiceCharge * Number(value)) + (row.serviceChargeForRow || 0)) * (1 - (row.Discount || 0) / 100)
                  : row.UnitPrice * Number(value) * (1 - (row.Discount || 0) / 100)
                : row.basePriceForServiceCharge
                  ? ((row.basePriceForServiceCharge * row.Qty) + (row.serviceChargeForRow || 0)) * (1 - (field === 'Discount' ? Number(value) : (row.Discount || 0)) / 100)
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

    // Handle update items popup row change
    const handleUpdateItemsRowChange = (rowIdx, field, value) => {
      setUpdateItemsRows(rows => rows.map((row, i) =>
        i === rowIdx ? { ...row, [field]: value } : row
      ));

      // If partnumber field is changed, show dropdown with filtered results
      if (field === 'partnumber') {
        if (value.length >= 1) {
          const filtered = allItemsList.filter(item =>
            (item.partnumber || item.itemnumber || '').toLowerCase().includes(value.toLowerCase()) ||
            (item.itemname || item.description || '').toLowerCase().includes(value.toLowerCase())
          );
          setUpdateItemsDropdownResults(results => results.map((r, i) => i === rowIdx ? filtered : r));
          setUpdateItemsDropdownOpen(open => open.map((o, i) => i === rowIdx ? filtered.length > 0 : false));
          setUpdateItemsDropdownIndex(index => index.map((idx, i) => i === rowIdx ? -1 : idx));
        } else {
          setUpdateItemsDropdownOpen(open => open.map((o, i) => i === rowIdx ? false : o));
          setUpdateItemsDropdownResults(results => results.map((r, i) => i === rowIdx ? [] : r));
        }
      }
    };

    // Handle update items dropdown selection
    const handleUpdateItemsSelectItem = (rowIdx, item) => {
      setUpdateItemsRows(rows => rows.map((row, i) =>
        i === rowIdx ? { ...row, partnumber: item.partnumber || item.itemnumber, description: item.itemname || item.description || '' } : row
      ));
      setUpdateItemsDropdownOpen(open => open.map((o, i) => i === rowIdx ? false : o));
      setUpdateItemsDropdownResults(results => results.map((r, i) => i === rowIdx ? [] : r));
      setUpdateItemsDropdownIndex(index => index.map((idx, i) => i === rowIdx ? -1 : idx));
    };

    // Handle update items dropdown keyboard navigation
    const handleUpdateItemsPartNumberKeyDown = (rowIdx, e) => {
      const dropdownOpen = updateItemsDropdownOpen[rowIdx];
      const dropdownResults = updateItemsDropdownResults[rowIdx];
      const currentIndex = updateItemsDropdownIndex[rowIdx];

      if (!dropdownOpen || dropdownResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = (currentIndex + 1) % dropdownResults.length;
        setUpdateItemsDropdownIndex(index => index.map((idx, i) => i === rowIdx ? newIndex : idx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = (currentIndex - 1 + dropdownResults.length) % dropdownResults.length;
        setUpdateItemsDropdownIndex(index => index.map((idx, i) => i === rowIdx ? newIndex : idx));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex >= 0 && currentIndex < dropdownResults.length) {
          handleUpdateItemsSelectItem(rowIdx, dropdownResults[currentIndex]);
        }
      } else if (e.key === 'Escape') {
        setUpdateItemsDropdownOpen(open => open.map((o, i) => i === rowIdx ? false : o));
      }
    };

    // Handle file upload for Invoice PDF
    const handleInvoiceFileSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        setUpdateItemsMessage('❌ Please select a PDF file only');
        return;
      }

      try {
        setIsValidatingFile(true);
        setUpdateItemsMessage('📄 Validating invoice...');
        
        const branchId = getBranchId() || 1;
        const response = await validateVendorInvoice(file, branchId);

        if (response.success && response.data.items) {
          setParsedInvoiceItems(response.data.items);
          setInvoiceFile(file);
          setUpdateItemsMode('file');
          setUpdateItemsMessage(`✅ Successfully parsed ${response.data.items.length} items from invoice`);
        } else {
          setUpdateItemsMessage(`❌ ${response.message || 'Failed to parse invoice'}`);
        }
      } catch (error) {
        // Check if it's a duplicate file error
        if (error.response?.status === 409 && error.response?.data?.isDuplicate) {
          console.log('⚠️  Duplicate invoice detected. Requesting password...');
          const billNo = error.response.data.billNo;
          setUpdateItemsMessage(`⚠️  ${error.response.data.message}\n\nEnter your password to proceed with reprocessing.`);
          setShowPasswordDialog(true);
          setDuplicateBillNo(billNo);
          setInvoiceFile(file); // Store file for later use
        } else {
          setUpdateItemsMessage(`❌ Error: ${error.message}`);
          console.error('Error validating invoice:', error);
        }
      } finally {
        setIsValidatingFile(false);
      }
    };

    // Handle submit update items from file
    const handleSubmitUpdateItemsFromFile = async () => {
      try {
        setUpdateItemsMessage('📤 Updating inventory...');

        const branchId = getBranchId() || 1;
        const messages = [];

        // Process each parsed item
        for (const item of parsedInvoiceItems) {
          try {
            const qtyToAdd = item.qtyReceived;
            const response = await updateItemDetailQuantity(item.itemid, branchId, qtyToAdd);

            if (response.success) {
              const newQty = response.data.quantityonhand || 0;
              const action = response.action === 'created' ? '(New)' : '(Updated)';
              const displayText = item.description ? `${item.partnumber} - ${item.description}` : item.partnumber;
              messages.push(`✓ ${displayText}: Added ${qtyToAdd}, Total qty now ${newQty} ${action}`);
            } else {
              const displayText = item.description ? `${item.partnumber} - ${item.description}` : item.partnumber;
              messages.push(`❌ ${displayText}: ${response.message}`);
            }
          } catch (error) {
            const displayText = item.description ? `${item.partnumber} - ${item.description}` : item.partnumber;
            messages.push(`❌ ${displayText}: ${error.message}`);
          }
        }

        setUpdateItemsMessage(messages.join('\n'));
        
        // Reset after 3 seconds
        setTimeout(() => {
          setParsedInvoiceItems([]);
          setInvoiceFile(null);
          setUpdateItemsMode('manual');
          setUpdateItemsMessage('');
        }, 3000);
      } catch (error) {
        setUpdateItemsMessage(`❌ Error: ${error.message}`);
      }
    };

    // Handle password submission for duplicate invoice reprocessing
    const handlePasswordSubmit = async () => {
      if (!duplicatePassword.trim()) {
        setUpdateItemsMessage('❌ Please enter a password');
        return;
      }

      try {
        // Call API to verify password
        const response = await verifyDuplicatePassword(duplicatePassword, duplicateBillNo);
        
        if (response.success && response.authorized) {
          console.log('✓ Password verified. Ready to reprocess invoice.');
          setPasswordVerified(true);
          setDuplicatePassword('');
        } else {
          setUpdateItemsMessage(`❌ ${response.message || 'Password verification failed'}`);
        }
      } catch (error) {
        console.error('Error verifying password:', error);
        
        if (error.response?.status === 401) {
          setUpdateItemsMessage('❌ Incorrect password. Please try again.');
        } else {
          setUpdateItemsMessage(`❌ Error: ${error.message || 'Password verification failed'}`);
        }
      }
    };

    // Handle proceeding after password verification
    const handleProceedAfterPasswordVerification = async () => {
      if (invoiceFile) {
        try {
          const branchId = getBranchId() || 1;
          const validateResponse = await validateVendorInvoice(invoiceFile, branchId);
          
          if (validateResponse.success && validateResponse.data.items) {
            setShowPasswordDialog(false);
            setPasswordVerified(false);
            setParsedInvoiceItems(validateResponse.data.items);
            setUpdateItemsMode('file');
            setUpdateItemsMessage(`✅ Successfully parsed ${validateResponse.data.items.length} items from invoice`);
          } else {
            setUpdateItemsMessage(`❌ ${validateResponse.message || 'Failed to parse invoice'}`);
          }
        } catch (error) {
          setUpdateItemsMessage(`❌ Error: ${error.message}`);
        }
      }
    };

    // Handle close password dialog
    // Handle close password dialog
    const handleClosePasswordDialog = () => {
      setShowPasswordDialog(false);
      setDuplicatePassword('');
      setPasswordVerified(false);
      setUpdateItemsMessage('');
      setDuplicateBillNo(null);
    };

    // Handle keyboard enter key in password input
    const handlePasswordKeyPress = (e) => {
      if (e.key === 'Enter') {
        handlePasswordSubmit();
      }
    };

    // Handle submit update items
    const handleSubmitUpdateItems = async () => {
      try {
        setUpdateItemsMessage('');
        
        // Collect non-empty rows
        const updateRows = updateItemsRows.filter(row => row.partnumber && row.qtyToAdd);
        
        if (updateRows.length === 0) {
          setUpdateItemsMessage('Please enter at least one item with quantity');
          return;
        }

        // Get branch ID for the logged-in user
        const branchId = getBranchId() || 1;

        // Process updates via API
        const messages = [];
        for (const updateRow of updateRows) {
          try {
            const item = allItemsList.find(i => 
              (i.partnumber || i.itemnumber || '').toLowerCase() === updateRow.partnumber.toLowerCase()
            );

            if (!item) {
              messages.push(`❌ Item ${updateRow.partnumber} not found`);
              continue;
            }

            const qtyToAdd = Number(updateRow.qtyToAdd || 0);
            const itemId = item.itemid || item.id;

            // Call API to update or create item detail
            const response = await updateItemDetailQuantity(itemId, branchId, qtyToAdd);

            if (response.success) {
              const newQty = response.data.quantityonhand || 0;
              const action = response.action === 'created' ? '(New)' : '(Updated)';
              const description = updateRow.description || item.itemname || item.description || '';
              const displayText = description ? `${item.partnumber} - ${description}` : item.partnumber;
              messages.push(`✓ ${displayText}: Updated qty to ${newQty} ${action}`);
            } else {
              const description = updateRow.description || item.itemname || item.description || '';
              const displayText = description ? `${item.partnumber} - ${description}` : item.partnumber;
              messages.push(`❌ ${displayText}: ${response.message}`);
            }
          } catch (error) {
            const description = updateRow.description || '';
            const displayText = description ? `${updateRow.partnumber} - ${description}` : updateRow.partnumber;
            messages.push(`❌ ${displayText}: ${error.message}`);
            console.error(`Error updating item ${updateRow.partnumber}:`, error);
          }
        }

        setUpdateItemsMessage(messages.join('\n'));
        
        // Clear form after 3 seconds
        setTimeout(() => {
          setUpdateItemsRows(Array(5).fill({ partnumber: '', description: '', qtyToAdd: '' }));
        }, 3000);
      } catch (error) {
        console.error('Error submitting item updates:', error);
        setUpdateItemsMessage('Error: ' + error.message);
      }
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
  const lastAppliedEditInvoiceRef = React.useRef(null);
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

  React.useEffect(() => {
    if (!editInvoiceId || String(lastAppliedEditInvoiceRef.current) === String(editInvoiceId)) {
      return;
    }

    lastAppliedEditInvoiceRef.current = editInvoiceId;

    const applyInvoiceEditPrefill = async () => {
      try {
        const invoiceResponse = await getInvoiceById(editInvoiceId);
        const invoiceData = invoiceResponse?.data?.invoiceMaster
          ? invoiceResponse.data
          : (invoiceResponse?.data && invoiceResponse?.data?.data
              ? invoiceResponse.data.data
              : (invoiceResponse?.invoiceMaster
                  ? invoiceResponse
                  : (invoiceResponse?.data || {})));
        const invoiceMaster = invoiceData.invoiceMaster || {};
        const invoiceDetails = Array.isArray(invoiceData.invoiceDetails) ? invoiceData.invoiceDetails : [];

        if (!invoiceMaster || !invoiceMaster.invoiceid) {
          throw new Error('Invoice master data not found in response');
        }

        const [allItems, allServices] = await Promise.all([getAllItems(), getAllServices()]);
        const itemMap = new Map((allItems || []).map(item => [String(item.itemid), item]));
        const serviceMap = new Map((allServices || []).map(service => [String(service.serviceid), service]));

        const prefilledRows = invoiceDetails.map((detail) => {
          const rawItemId = String(detail.itemid || '');
          const itemInfo = itemMap.get(rawItemId);
          const serviceInfo = serviceMap.get(rawItemId);
          const source = itemInfo ? 'item' : (serviceInfo ? 'service' : 'item');

          // USE ONLY STORED SNAPSHOTS from invoicedetail
          // If snapshot is null, show null instead of fetching from itemmaster
          const itemNumber = detail.partnumber || null;
          // ItemName already contains serial info if applicable, don't append again
          const itemName = detail.itemname || null;

          const qty = Number(detail.qty || 0);
          const unitPrice = Number(detail.unitprice || 0);
          const discountValue = Number(detail.linediscount || 0);
          const lineTotal = Number(detail.linetotal || (qty * unitPrice * (1 - discountValue / 100)));

          return {
            source,
            itemid: source === 'item' ? (itemInfo?.itemid || rawItemId) : undefined,
            serviceid: source === 'service' ? (serviceInfo?.serviceid || rawItemId) : undefined,
            ItemNumber: itemNumber,
            partnumber: itemNumber,
            ItemName: itemName,
            Qty: qty,
            Discount: discountValue,
            UnitPrice: unitPrice,
            Total: lineTotal,
            isDeleted: false,
          };
        });

        setGridRows(prefilledRows);

        const gsServiceIds = new Set(
          prefilledRows
            .filter(row => row.source === 'service')
            .map(row => String(row.serviceid || ''))
        );
        setGsChecked(['13', '14', '15'].every(id => gsServiceIds.has(id)));

        setJobCardInput(invoiceMaster.jobcardid && Number(invoiceMaster.jobcardid) !== 0 ? String(invoiceMaster.jobcardid) : '');
        setOdometer(invoiceMaster.odometer ? String(invoiceMaster.odometer) : '');
        setNotes(invoiceMaster.notes || '');
        setDiscount(String(Number(invoiceMaster.totaldiscount || 0)));

        setStaffFields(prev => ({
          ...prev,
          technician1: invoiceMaster.technicianmain || prev.technician1,
          technician2: invoiceMaster.technicianassistant || prev.technician2,
          serviceadvisor: invoiceMaster.serviceadvisorin || prev.serviceadvisor,
          deliveryadvisor: invoiceMaster.serviceadvisordeliver || prev.deliveryadvisor,
          testdriver: invoiceMaster.testdriver || prev.testdriver,
          cleaner: invoiceMaster.cleaner || prev.cleaner,
          waterwash: invoiceMaster.waterwash || prev.waterwash,
        }));

        if (invoiceMaster.invoicenumber) {
          setGeneratedInvoiceNumber(invoiceMaster.invoicenumber);
        }
        if (invoiceMaster.invoicedate) {
          setInvoiceDate(invoiceMaster.invoicedate);
        }

        const invoiceVehicleNumber = invoiceMaster.vehiclenumber;
        const invoiceVehicleId = invoiceMaster.vehicleid;

        if (invoiceVehicleNumber) {
          setVehicleInput(invoiceVehicleNumber);
          const matchedVehicles = await searchVehiclesByNumber(invoiceVehicleNumber);
          if (Array.isArray(matchedVehicles) && matchedVehicles.length > 0) {
            const exactVehicle = matchedVehicles.find(
              vehicle => String(vehicle.vehicledetailid) === String(invoiceVehicleId)
            ) || matchedVehicles.find(
              vehicle => String(vehicle.vehiclenumber).toLowerCase() === String(invoiceVehicleNumber).toLowerCase()
            ) || matchedVehicles[0];

            handleSelectVehicle(exactVehicle);
          } else {
            setSelectedVehicle({
              vehicleid: invoiceVehicleId,
              vehicledetailid: invoiceVehicleId,
              customerid: invoiceMaster.customerid,
              vehiclenumber: invoiceVehicleNumber,
            });
          }
        }
      } catch (error) {
        console.error('Error loading invoice for edit:', error);
        alert('Unable to load invoice details for edit. Please try again.');
      }
    };

    applyInvoiceEditPrefill();
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
                  placeholder="Enter item/service number or description"
                  value={itemInput}
                  onChange={handleItemInputChange}
                  onKeyDown={handleItemInputKeyDown}
                  onBlur={() => setTimeout(() => setShowItemPopup(false), 200)}
                  style={{ width: 220, padding: 4, fontSize: 14 }}
                />
                {showItemPopup && (
                  <div ref={itemPopupRef} style={{ position: 'fixed', top: `${itemPopupPosition.top}px`, left: `${itemPopupPosition.left}px`, background: '#fff', border: '1px solid #ccc', width: mode === 'invoice' ? '290px' : '344px', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10000 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: mode === 'invoice' ? '25% 65% 10%' : '25% 55% 10% 10%', padding: '6px 10px', fontSize: '10px', fontWeight: 700, background: '#f4f6f8', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 1 }}>
                      <span>PartNo</span>
                      <span>Item Description</span>
                      <span>Price</span>
                      {mode !== 'invoice' && <span>qty</span>}
                    </div>
                    {itemResults.map((result, i) => (
                      <div
                        ref={el => itemRowRefs.current[i] = el}
                        key={`${result.source}-${result.itemid || result.serviceid}`}
                        style={{ display: 'grid', gridTemplateColumns: mode === 'invoice' ? '25% 65% 10%' : '25% 55% 10% 10%', gap: 0, padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', background: i === itemPopupIndex ? '#e3f2fd' : (i % 2 === 0 ? '#f9f9f9' : '#fff'), fontSize: '11px', alignItems: 'center' }}
                        onClick={() => handleSelectItem(result)}
                        title={`${result.itemnumber || (result.source === 'item' ? result.partnumber : result.serviceid)} - ${result.itemdescription || (result.source === 'item' ? result.itemname : result.servicename)} - ₹${result.itemprice ?? (result.source === 'item' ? result.mrp : result.defaultrate)}`}
                      >
                        <span>{result.itemnumber || (result.source === 'item' ? result.partnumber : result.serviceid)}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.itemdescription || (result.source === 'item' ? (result.itemdescription || result.itemname) : result.servicename)}</span>
                        <span style={{ color: '#666' }}>₹{Number((result.itemprice ?? (result.source === 'item' ? result.mrp : result.defaultrate)) || 0).toFixed(0)}</span>
                        {mode !== 'invoice' && (
                          <span style={{ color: '#666' }}>
                            {result.source === 'item'
                              ? Number(getRemainingQtyForItem(result) ?? 0).toFixed(0)
                              : '-'}
                          </span>
                        )}
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
              {itemMessage && (
                <span style={{ marginLeft: 8, color: '#c62828', fontSize: 12 }}>
                  {itemMessage}
                </span>
              )}
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
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{row.ItemNumber || row.partnumber || row.serviceid || ''}</td>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{row.ItemName}</td>
                    <td style={{ border: '1px solid #eee', padding: 2 }}>
                      <input
                        type="number"
                        min="1"
                        value={row.Qty}
                        onChange={e => handleGridChange(row.originalIndex, 'Qty', e.target.value)}
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
                        onChange={e => handleGridChange(row.originalIndex, 'Discount', e.target.value)}
                        style={{ width: 40, textAlign: 'right', fontSize: '12px', padding: 2 }}
                      />
                    </td>
                    <td style={{ border: '1px solid #eee', padding: 2, fontSize: '12px' }}>{row.Total.toFixed(2)}</td>
                    <td style={{ border: '1px solid #eee', padding: 3, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.originalIndex)}
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
            {/* Dual buttons: Update Items and Update Serial No */}
            {mode === 'invoice-plus' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => {
                    setShowUpdateItemsPopup(true);
                    setUpdateItemsMessage('');
                    setUpdateItemsRows(Array(5).fill({ partnumber: '', description: '', qtyToAdd: '' }));
                  }}
                  style={{
                    flex: 1,
                    padding: 7,
                    backgroundColor: '#FF9800',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Update Items
                </button>
                <button
                  onClick={() => {
                    setShowUpdateSerialNumberPopup(true);
                  }}
                  style={{
                    flex: 1,
                    padding: 7,
                    backgroundColor: '#2196F3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Update Serial No
                </button>
              </div>
            )}
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
                {isSaving ? (editInvoiceId ? 'Updating...' : 'Saving...') : (editInvoiceId ? 'Update Invoice' : 'Save Invoice')}
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
            <div
              style={{
                marginTop: 10,
                borderTop: '1px solid #e0e0e0',
                paddingTop: 8,
                fontSize: 12,
                color: '#333'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Item backlog</div>
              <ol style={{ margin: 0, paddingLeft: 16 }}>
                <li>✓ Items with qty &lt;= 0 can be billed (inventory ignored)</li>
                <li>✓ All items from itemmaster listed by default</li>
                <li>Serail number must be enabled</li>
                <li>Quantity Update - log must be enabled</li>
              </ol>
            </div>
          </div>
        </div>
        </div>

      {/* Update Items Popup - Invoice+ Mode Only */}
      {showUpdateItemsPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 8,
            padding: 20,
            width: '90%',
            maxWidth: 700,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Update Item Quantities</h2>
            
            {/* Mode Selector Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #eee' }}>
              <button
                onClick={() => setUpdateItemsMode('file')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: updateItemsMode === 'file' ? '#FF9800' : '#f5f5f5',
                  color: updateItemsMode === 'file' ? '#fff' : '#333',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                📄 Upload Invoice
              </button>
              <button
                onClick={() => setUpdateItemsMode('manual')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: updateItemsMode === 'manual' ? '#FF9800' : '#f5f5f5',
                  color: updateItemsMode === 'manual' ? '#fff' : '#333',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ✎ Manual Entry
              </button>
            </div>

            {/* File Upload Mode */}
            {updateItemsMode === 'file' && (
              <div style={{ marginBottom: 16 }}>
                {parsedInvoiceItems.length === 0 ? (
                  <>
                    <label htmlFor="vendor-invoice-pdf" style={{
                      display: 'block',
                      padding: 20,
                      border: '2px dashed #FF9800',
                      borderRadius: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#fffef5',
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📁 Select Vendor Invoice PDF</div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Click to upload or drag and drop</div>
                      <input
                        id="vendor-invoice-pdf"
                        type="file"
                        accept=".pdf"
                        onChange={handleInvoiceFileSelect}
                        disabled={isValidatingFile}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: 11, color: '#999' }}>{isValidatingFile ? 'Validating...' : 'PDF files only'}</div>
                    </label>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 12, padding: 10, background: '#f0f7ff', borderRadius: 4, borderLeft: '4px solid #1976d2' }}>
                      <div style={{ fontSize: 12, color: '#333' }}>
                        📄 <strong>{invoiceFile?.name}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                        {parsedInvoiceItems.length} items found
                      </div>
                    </div>
                    
                    {/* Items Table */}
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: 12,
                      fontSize: 12,
                    }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Part Number</th>
                          <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Description</th>
                          <th style={{ padding: 8, textAlign: 'center', fontWeight: 600, width: 70 }}>Current Qty</th>
                          <th style={{ padding: 8, textAlign: 'center', fontWeight: 600, width: 70 }}>Qty Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedInvoiceItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                            <td style={{ padding: 8, fontWeight: 600 }}>{item.partnumber}</td>
                            <td style={{ padding: 8, color: '#666', fontSize: 11 }}>{item.description}</td>
                            <td style={{ padding: 8, textAlign: 'center', color: '#999' }}>{item.currentQty}</td>
                            <td style={{ padding: 8, textAlign: 'center', fontWeight: 600, color: '#2196F3' }}>{item.qtyReceived}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <button
                      onClick={() => { setParsedInvoiceItems([]); setInvoiceFile(null); setUpdateItemsMessage(''); }}
                      style={{
                        padding: '6px 12px',
                        background: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#666',
                      }}
                    >
                      Select Different File
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Manual Entry Mode */}
            {updateItemsMode === 'manual' && (
              <div style={{ marginBottom: 16, maxHeight: '400px', overflowY: 'auto' }}>
                {updateItemsRows.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start', position: 'relative' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ width: '100%' }}>
                        <input
                          ref={el => updateItemsInputRefs.current[idx] = el}
                          type="text"
                          placeholder="Part Number"
                          value={row.partnumber}
                          onChange={e => handleUpdateItemsRowChange(idx, 'partnumber', e.target.value)}
                          onKeyDown={e => handleUpdateItemsPartNumberKeyDown(idx, e)}
                          onBlur={() => setTimeout(() => setUpdateItemsDropdownOpen(open => open.map((o, i) => i === idx ? false : o)), 200)}
                          style={{
                            width: '100%',
                            padding: 8,
                            border: '1px solid #ddd',
                            borderRadius: 4,
                            fontSize: 12,
                            marginBottom: 4,
                          }}
                        />
                        {row.description && (
                          <div style={{
                            fontSize: 11,
                            color: '#666',
                            padding: '4px 8px',
                            background: '#f9f9f9',
                            borderRadius: 3,
                            marginBottom: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {row.description}
                          </div>
                        )}
                      </div>
                      {updateItemsDropdownOpen[idx] && (
                        <div
                          ref={el => updateItemsDropdownRefs.current[idx] = el}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderTop: 'none',
                            borderRadius: '0 0 4px 4px',
                            maxHeight: 150,
                            overflowY: 'auto',
                            zIndex: 10002,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        >
                          {updateItemsDropdownResults[idx].map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              style={{
                                padding: 8,
                                cursor: 'pointer',
                                background: itemIdx === updateItemsDropdownIndex[idx] ? '#e3f2fd' : (itemIdx % 2 === 0 ? '#f9f9f9' : '#fff'),
                                borderBottom: '1px solid #f0f0f0',
                                fontSize: 11,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              onClick={() => handleUpdateItemsSelectItem(idx, item)}
                              title={`${item.partnumber || item.itemnumber} - ${item.itemname || item.description}`}
                            >
                              <span style={{ fontWeight: 600 }}>{item.partnumber || item.itemnumber}</span>
                              {' - '}
                              <span>{item.itemname || item.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      placeholder="Qty to Add"
                      value={row.qtyToAdd}
                      onChange={e => handleUpdateItemsRowChange(idx, 'qtyToAdd', e.target.value.replace(/[^0-9]/g, ''))}
                      style={{
                        width: 100,
                        padding: 8,
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        fontSize: 12,
                        textAlign: 'right',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Message Display */}
            {updateItemsMessage && (
              <div style={{
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: 10,
                marginBottom: 16,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                maxHeight: 150,
                overflowY: 'auto',
                color: '#333',
              }}>
                {updateItemsMessage}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={updateItemsMode === 'file' ? handleSubmitUpdateItemsFromFile : handleSubmitUpdateItems}
                disabled={isValidatingFile || (updateItemsMode === 'file' && parsedInvoiceItems.length === 0)}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor: isValidatingFile || (updateItemsMode === 'file' && parsedInvoiceItems.length === 0) ? '#ccc' : '#FF9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isValidatingFile || (updateItemsMode === 'file' && parsedInvoiceItems.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {isValidatingFile ? 'Validating...' : 'Submit'}
              </button>
              <button
                onClick={() => {
                  setShowUpdateItemsPopup(false);
                  setParsedInvoiceItems([]);
                  setInvoiceFile(null);
                  setUpdateItemsMode('manual');
                  setUpdateItemsMessage('');
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor: '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Update Serial Numbers Popup - Invoice+ Mode Only */}
      {showUpdateSerialNumberPopup && (
        <SerialNumberUpdatePopup
          invoiceId={editInvoiceId}
          invoiceNumber={previewInvoiceNumber || generatedInvoiceNumber}
          gridRows={gridRows}
          onClose={() => setShowUpdateSerialNumberPopup(false)}
          onSuccess={() => {
            // Refresh invoice data after serial numbers are saved
            console.log('Serial numbers updated successfully');
          }}
        />
      )}

      {/* Serial Number Selection Popup - For Invoicing Serials */}
      {showSerialNumberSelectionPopup && serialNumberSelectionItem && (
        <SerialNumberSelectionPopup
          itemId={serialNumberSelectionItem.itemid}
          itemName={serialNumberSelectionItem.itemname || serialNumberSelectionItem.itemdescription}
          itemPartNumber={serialNumberSelectionItem.partnumber}
          quantity={serialNumberSelectionItem.requestedQty}
          onClose={() => {
            setShowSerialNumberSelectionPopup(false);
            setSerialNumberSelectionItem(null);
          }}
          onSelectSerials={handleSerialNumbersSelected}
        />
      )}

      {/* Password Dialog for Duplicate Invoice */}
      {showPasswordDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10002,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 30,
            maxWidth: 450,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
          }}>
            {!passwordVerified ? (
              <>
                <h3 style={{
                  color: '#d32f2f',
                  marginBottom: 15,
                  fontSize: 18,
                  margin: '0 0 15px 0',
                }}>
                  🔐 Invoice Already Processed
                </h3>
                
                <p style={{
                  color: '#666',
                  marginBottom: 10,
                  fontSize: 14,
                  lineHeight: 1.5,
                  margin: '0 0 10px 0',
                }}>
                  This invoice (Bill No: <strong>{duplicateBillNo}</strong>) has already been processed.
                </p>

                <p style={{
                  color: '#666',
                  marginBottom: 25,
                  fontSize: 13,
                  fontStyle: 'italic',
                  margin: '0 0 25px 0',
                }}>
                  Please enter the password for <strong>Ashok</strong> to proceed with reprocessing.
                </p>

                <input
                  type="password"
                  placeholder="Enter Ashok's password"
                  value={duplicatePassword}
                  onChange={(e) => setDuplicatePassword(e.target.value)}
                  onKeyPress={handlePasswordKeyPress}
                  style={{
                    width: '100%',
                    padding: 12,
                    marginBottom: 20,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />

                {updateItemsMessage && (
                  <div style={{
                    marginBottom: 20,
                    padding: 10,
                    backgroundColor: updateItemsMessage.includes('❌') ? '#ffebee' : '#f5f5f5',
                    borderRadius: 4,
                    color: updateItemsMessage.includes('❌') ? '#c62828' : '#333',
                    fontSize: 13,
                  }}>
                    {updateItemsMessage}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: 10,
                }}>
                  <button
                    onClick={handlePasswordSubmit}
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: '#4CAF50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
                  >
                    Verify Password
                  </button>
                  <button
                    onClick={handleClosePasswordDialog}
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: '#999',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#777'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#999'}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{
                  color: '#4CAF50',
                  marginBottom: 15,
                  fontSize: 18,
                  margin: '0 0 15px 0',
                }}>
                  ✅ Password Verified
                </h3>
                
                <p style={{
                  color: '#666',
                  marginBottom: 25,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}>
                  Your password has been verified successfully. You can now proceed to reprocess this invoice.
                </p>

                <div style={{
                  display: 'flex',
                  gap: 10,
                }}>
                  <button
                    onClick={handleProceedAfterPasswordVerification}
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: '#4CAF50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
                  >
                    ✓ Proceed with Reprocessing
                  </button>
                  <button
                    onClick={handleClosePasswordDialog}
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: '#999',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#777'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#999'}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </>
    );
}


