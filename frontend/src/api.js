import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Get current userId from localStorage
let currentUserId = localStorage.getItem('userId');

// Function to set userId (call this after user login)
export function setUserId(userId) {
  currentUserId = userId;
  localStorage.setItem('userId', userId);
  if (userId) {
    axios.defaults.headers.common['x-user-id'] = userId;
    console.log(`[API] userId set to: ${userId}`);
  }
}

// Function to get current userId
export function getUserId() {
  return currentUserId;
}

// Function to clear userId (call this on logout)
export function clearUserId() {
  currentUserId = null;
  localStorage.removeItem('userId');
  delete axios.defaults.headers.common['x-user-id'];
  console.log('[API] userId cleared');
}

// Initialize userId header if it exists in localStorage
if (currentUserId) {
  axios.defaults.headers.common['x-user-id'] = currentUserId;
}

// Request interceptor
axios.interceptors.request.use(
  config => {
    // Ensure userId is included in every request
    if (currentUserId) {
      config.headers['x-user-id'] = currentUserId;
    }
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, { userId: currentUserId });
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axios.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  error => {
    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.data?.message}`);
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Company API
export const getCompanies = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/companies`);
    return response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
};

export const getCompanyById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching company:', error);
    throw error;
  }
};

export const createCompany = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/companies`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
};

export const updateCompany = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/companies/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating company:', error);
    throw error;
  }
};

export const deleteCompany = async (id, deleteData) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/companies/${id}`, { data: deleteData });
    return response.data;
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
};

// Customer API
export const getCustomers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

export const getCustomerById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw error;
  }
};

export const createCustomer = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/customers`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

export const updateCustomer = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/customers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCustomer = async (id, deleteData) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/customers/${id}`, { data: deleteData });
    return response.data;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

export const getCustomersByBranch = async (branchId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customers/branch/${branchId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customers by branch:', error);
    throw error;
  }
};

// Vehicle Manufacturer API
export const getVehicleManufacturers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicle-manufacturers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle manufacturers:', error);
    throw error;
  }
};

export const getVehicleManufacturerById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicle-manufacturers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle manufacturer:', error);
    throw error;
  }
};

export const createVehicleManufacturer = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/vehicle-manufacturers`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating vehicle manufacturer:', error);
    throw error;
  }
};

export const updateVehicleManufacturer = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/vehicle-manufacturers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating vehicle manufacturer:', error);
    throw error;
  }
};

export const deleteVehicleManufacturer = async (id, deleteData) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/vehicle-manufacturers/${id}`, { data: deleteData });
    return response.data;
  } catch (error) {
    console.error('Error deleting vehicle manufacturer:', error);
    throw error;
  }
};

// Vehicle API
export const getVehicles = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicles`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    throw error;
  }
};

export const getVehicleById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    throw error;
  }
};

export const getVehiclesByCustomerId = async (customerId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/vehicles`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicles by customer:', error);
    throw error;
  }
};

export const createVehicle = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/vehicles`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

// Vehicle Detail API
export const createVehicleDetail = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/vehicle-details`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating vehicle detail:', error);
    throw error;
  }
};

export const getVehicleDetailsByCustomerId = async (customerId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/vehicle-details`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle details for customer:', error);
    throw error;
  }
};

export const getAllVehicleDetails = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicle-details`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    throw error;
  }
};

export const updateVehicleDetail = async (vehicleDetailId, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/vehicle-details/${vehicleDetailId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating vehicle detail:', error);
    throw error;
  }
};

export const updateVehicle = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/vehicles/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

export const deleteVehicle = async (id, deleteData) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/vehicles/${id}`, { data: deleteData });
    return response.data;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

// Unique vehicle data API
export const getUniqueVehicleModels = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicles/unique/models`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unique vehicle models:', error);
    throw error;
  }
};

export const getUniqueVehicleColors = async (model) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicles/unique/colors`, {
      params: { model }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching unique vehicle colors:', error);
    throw error;
  }
};

// Employee API
export const getAllEmployees = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/employees/all`);
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching all employees:', error);
    return [];
  }
};

export const searchEmployees = async (query) => {
  if (!query || query.length < 2) return [];
  const response = await axios.get(`${API_BASE_URL}/employees/search`, { params: { q: query } });
  return response.data;
};

// Item API
export const getAllItems = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/items`);
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching all items:', error);
    return [];
  }
};

export const searchItems = async (query) => {
  try {
    if (!query || query.length < 2) return [];
    const response = await axios.get(`${API_BASE_URL}/items/search`, { params: { q: query } });
    return response.data.data || [];
  } catch (error) {
    console.error('Error searching items:', error);
    return [];
  }
};

// Service API
export const getAllServices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/services`);
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching all services:', error);
    return [];
  }
};

export const searchServices = async (query) => {
  try {
    if (!query || query.length < 2) return [];
    const response = await axios.get(`${API_BASE_URL}/services/search`, { params: { q: query } });
    return response.data.data || [];
  } catch (error) {
    console.error('Error searching services:', error);
    return [];
  }
};

// Combined Items and Services Search
export const searchItemsAndServices = async (query) => {
  try {
    if (!query || query.length < 2) return [];
    const response = await axios.get(`${API_BASE_URL}/items-services/search`, { params: { q: query } });
    return response.data.data || [];
  } catch (error) {
    console.error('Error searching items and services:', error);
    return [];
  }
};

// Invoice API
export const saveInvoice = async (invoiceData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/invoices`, invoiceData);
    return response.data;
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
};

export const getAllInvoices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/invoices`);
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

export const getInvoiceById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/invoices/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
};

export const updateInvoice = async (id, invoiceData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/invoices/${id}`, invoiceData);
    return response.data;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

export const deleteInvoice = async (id, deleteData) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/invoices/${id}`, { data: deleteData });
    return response.data;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};

// Payment Method API
export const getPaymentMethods = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/payments/methods/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};

export const getActivePaymentMethods = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/payments/methods/active`);
    return response.data;
  } catch (error) {
    console.error('Error fetching active payment methods:', error);
    throw error;
  }
};

// Get next invoice number (determines running number based on database state)
export const getNextInvoiceNumber = async () => {
  try {
    const invoices = await getAllInvoices();
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const currentYearMonth = `${year}${month}`;
    const prefix = `INV${currentYearMonth}`;
    
    console.log('Getting next invoice number for:', prefix);
    
    // Extract invoices array from response
    const invoiceList = Array.isArray(invoices) ? invoices : (invoices.data || []);
    console.log('Total invoices in system:', invoiceList.length);
    
    // Filter invoices for current month/year
    const currentInvoices = invoiceList.filter(inv => {
      const invNumber = inv.invoicenumber || inv.InvoiceNumber || '';
      const matches = invNumber.startsWith(prefix);
      if (matches) {
        console.log('Found current month invoice:', invNumber);
      }
      return matches;
    });
    
    console.log('Invoices for current month:', currentInvoices.length);
    
    if (currentInvoices.length === 0) {
      // No invoices for this month, start at 1
      console.log('No invoices for this month, returning 1');
      return { runningNumber: 1, yearMonth: currentYearMonth };
    }
    
    // Find the highest running number
    let highestRunning = 0;
    currentInvoices.forEach(inv => {
      const invNumber = inv.invoicenumber || inv.InvoiceNumber || '';
      // Extract the last 3 characters which should be the running number
      const runningPart = invNumber.substring(invNumber.length - 3);
      const runningNum = parseInt(runningPart, 10);
      
      if (!isNaN(runningNum) && runningNum > highestRunning) {
        console.log('Found invoice:', invNumber, 'running number:', runningNum);
        highestRunning = runningNum;
      }
    });
    
    // Return next running number
    const nextRunning = highestRunning + 1;
    console.log('Next running number to use:', nextRunning);
    return { runningNumber: nextRunning, yearMonth: currentYearMonth };
  } catch (error) {
    console.error('Error getting next invoice number:', error);
    // Return default values on error
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const defaultYearMonth = `${year}${month}`;
    console.log('Returning default values due to error:', defaultYearMonth, 1);
    return { runningNumber: 1, yearMonth: defaultYearMonth };
  }
};

// Payment API
export const getUnpaidInvoices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/payments/unpaid`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    throw error;
  }
};

export const getUnpaidInvoicesByVehicle = async (vehicleId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/payments/unpaid/vehicle/${vehicleId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unpaid invoices by vehicle:', error);
    throw error;
  }
};

export const getPaymentSummary = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/payments/summary`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    throw error;
  }
};

export const updatePaymentStatus = async (invoiceId, paymentData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/payments/${invoiceId}`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

export const recordAdvancePayment = async (advancePaymentData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/payments/advance`, advancePaymentData);
    return response.data;
  } catch (error) {
    console.error('Error recording advance payment:', error);
    throw error;
  }
};
