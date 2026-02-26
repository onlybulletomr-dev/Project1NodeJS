import React, { useState, useEffect, useRef } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getUniqueVehicleModels, getUniqueVehicleColors, createVehicleDetail, getVehicleDetailsByCustomerId, updateVehicleDetail } from '../api';
import '../styles/CustomerMaster.css';

function CustomerMaster() {
  const [customers, setCustomers] = useState([]);
  const [uniqueModels, setUniqueModels] = useState([]);
  const [uniqueColors, setUniqueColors] = useState([]);
  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    EmailAddress: '',
    GSTNumber: '',
    LoyalityPoints: '0',
    IsActive: true,
    MarketingConsent: false,
    Profession: '',
    Gender: 'Male', // Default gender
    DateOfBirth: '',
    DateOfMarriage: '',
    AddressLine1: '',
    AddressLine2: '',
    City: 'Chennai',
    State: 'TamilNadu',
    PostalCode: '',
    MobileNumber1: '',
    MobileNumber2: '',
    BranchID: '',
    CreatedBy: 1,
    CreatedAt: new Date().toISOString().split('T')[0],
  });
  // Separate state for vehicle data
  const [vehicleData, setVehicleData] = useState({
    VehicleNumber: '',
    VehicleModel: '',
    VehicleColor: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Create refs for form fields
  const firstNameRef = useRef(null);
  const mobileNumberRef = useRef(null);
  const emailAddressRef = useRef(null);
  const addressLine1Ref = useRef(null);
  const areaRef = useRef(null);
  const cityRef = useRef(null);
  const stateRef = useRef(null);
  const vehicleNumberRef = useRef(null);
  const vehicleModelRef = useRef(null);
  const vehicleColorRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Fetch customers and vehicle data on component mount, focus on first field
  useEffect(() => {
    fetchCustomers();
    fetchUniqueModels();
    fetchUniqueColors('');
    // Focus on Customer Name field when component loads
    if (firstNameRef.current) {
      firstNameRef.current.focus();
    }
  }, []);

  // Fetch colors when vehicle model changes (as a backup/sync)
  useEffect(() => {
    if (formData.VehicleModel) {
      fetchUniqueColors(formData.VehicleModel);
    } else {
      setUniqueColors([]);
    }
  }, [formData.VehicleModel]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await getCustomers();
      console.log('Fetched customers response:', response);
      
      // Handle different response formats
      let customerList = [];
      if (Array.isArray(response)) {
        // Response is directly an array
        customerList = response;
      } else if (response.data && Array.isArray(response.data)) {
        // Response has data property with array
        customerList = response.data;
      } else if (response.success && response.data && Array.isArray(response.data)) {
        // Response is {success, data: [...]}
        customerList = response.data;
      }
      
      if (customerList.length >= 0) {
        console.log(`Setting ${customerList.length} customers`);
        
        // Fetch vehicle details for each customer
        const customersWithVehicles = await Promise.all(
          customerList.map(async (customer) => {
            const customerId = customer.CustomerID || customer.customerid;
            try {
              console.log(`[DEBUG] Fetching vehicles for customer ${customerId}`);
              const vehicleResponse = await getVehicleDetailsByCustomerId(customerId);
              console.log(`[DEBUG] Vehicle response for customer ${customerId}:`, vehicleResponse);
              const vehicleList = vehicleResponse.data || [];
              
              // Get the first vehicle (if any)
              const firstVehicle = vehicleList.length > 0 ? vehicleList[0] : null;
              console.log(`[DEBUG] First vehicle for customer ${customerId}:`, firstVehicle);
              
              return {
                ...customer,
                vehicles: vehicleList,
                vehiclenumber: firstVehicle?.vehiclenumber || null,
                vehiclemodel: firstVehicle?.vehiclemodel || null,
                vehiclecolor: firstVehicle?.vehiclecolor || null,
              };
            } catch (err) {
              console.error(`[ERROR] Could not fetch vehicles for customer ${customerId}:`, err);
              console.error('Error message:', err.message);
              console.error('Error response:', err.response?.data);
              return { ...customer, vehicles: [] };
            }
          })
        );
        
        setCustomers(customersWithVehicles);
        setError(null);
      } else {
        console.error('Could not parse customer list from response');
        setError('Failed to parse customer data');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniqueModels = async () => {
    try {
      const response = await getUniqueVehicleModels();
      if (response.data && Array.isArray(response.data)) {
        setUniqueModels(response.data);
      } else {
        setError('Failed to load unique vehicle models');
      }
    } catch (err) {
      setError('Unable to load unique vehicle models. Please refresh the page.');
    }
  };

  const fetchUniqueColors = async (modelName) => {
    if (!modelName) {
      setUniqueColors([]);
      return;
    }
    try {
      const response = await getUniqueVehicleColors(modelName);
      if (response.data && Array.isArray(response.data)) {
        setUniqueColors(response.data);
        console.log(`Loaded ${response.data.length} colors for model: ${modelName}`, response.data);
      } else {
        setError('Failed to load unique vehicle colors');
      }
    } catch (err) {
      setError('Unable to load unique vehicle colors. Please refresh the page.');
      console.error('Color fetch error:', err);
    }
  };

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (text) => {
    if (!text) return '';
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    // Apply text transformations based on field
    if (type === 'text' && !['City', 'State'].includes(name)) {
      if (name === 'FirstName') {
        // Customer name: all uppercase
        processedValue = value.toUpperCase();
      } else if (name === 'AddressLine1' || name === 'AddressLine2') {
        // Address & Area: capitalize words
        processedValue = capitalizeWords(value);
      } else if (name === 'VehicleNumber') {
        // Vehicle number: all uppercase
        processedValue = value.toUpperCase();
      }
    }

    // Mobile number: only numbers
    if (name === 'MobileNumber1' || name === 'MobileNumber2') {
      processedValue = value.replace(/[^0-9]/g, '');
    }

    // Check if this is a vehicle field
    if (['VehicleNumber', 'VehicleModel', 'VehicleColor'].includes(name)) {
      setVehicleData({
        ...vehicleData,
        [name]: processedValue,
      });
      // If vehicle model changes, reload colors with the new model value
      if (name === 'VehicleModel') {
        setVehicleData(prev => ({ ...prev, VehicleColor: '' }));
        fetchUniqueColors(processedValue); // Pass the new model value directly
      }
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : processedValue,
      });
    }
  };

  // Handle keyboard navigation with Enter key
  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    }
  };

  // Special handler for submit button
  const handleSubmitKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation - Customer fields
    if (!formData.FirstName.trim()) {
      setError('First Name is required');
      return;
    }
    if (!formData.MobileNumber1.trim()) {
      setError('Mobile Number 1 is required');
      return;
    }
    // Vehicle fields validation
    if (!vehicleData.VehicleModel.trim()) {
      setError('Vehicle Model is required');
      return;
    }
    if (!vehicleData.VehicleColor.trim()) {
      setError('Vehicle Color is required');
      return;
    }
    if (!vehicleData.VehicleNumber.trim()) {
      setError('Vehicle Number is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Prepare customer data ONLY (no vehicle fields)
      const customerData = { ...formData };
      
      let customerId = null;

      if (editingId) {
        // Updating existing customer (customer data only)
        const updateData = { ...customerData };
        
        // Remove non-customer fields
        delete updateData.CustomerID;
        delete updateData.customerid;
        delete updateData.CreatedBy;
        delete updateData.CreatedAt;
        delete updateData.vehicles;
        delete updateData.vehiclenumber;
        delete updateData.vehiclemodel;
        delete updateData.vehiclecolor;
        
        updateData.UpdatedBy = 1;
        updateData.UpdatedAt = new Date().toISOString().split('T')[0];
        
        console.log('Update payload:', updateData);
        const response = await updateCustomer(editingId, updateData);
        if (response && response.success) {
          customerId = editingId;
          setSuccess(response.message || 'Customer updated successfully!');
          setEditingId(null);
        } else {
          setError(response?.message || 'Failed to update customer.');
          return;
        }
      } else {
        // Creating new customer (customer data only)
        try {
          // Remove any non-customer fields
          const cleanCustomerData = { ...customerData };
          delete cleanCustomerData.vehicles;
          delete cleanCustomerData.vehiclenumber;
          delete cleanCustomerData.vehiclemodel;
          delete cleanCustomerData.vehiclecolor;
          
          console.log('Creating customer:', cleanCustomerData);
          const response = await createCustomer(cleanCustomerData);
          console.log('Create customer response:', response);
          
          if (response && response.success) {
            // Extract customer ID from response
            customerId = response.data?.CustomerID || response.data?.customerid;
            if (!customerId) {
              console.warn('No customer ID in response:', response);
              setError('Customer created but ID not found. Please refresh the page.');
              return;
            }
            console.log('Customer created with ID:', customerId);
            setSuccess(response.message || 'Customer created successfully!');
          } else {
            setError(response?.message || 'Failed to create customer.');
            return;
          }
        } catch (createErr) {
          // Check if error is due to duplicate email
          const isDuplicateEmail = createErr.response?.data?.error?.includes('duplicate key') && 
                                   createErr.response?.data?.error?.includes('emailaddress');
          
          if (isDuplicateEmail) {
            // Customer exists in DB - get their ID
            console.log('Customer exists with this email, fetching...');
            try {
              const freshCustomers = await getCustomers();
              const freshCustomerList = Array.isArray(freshCustomers?.data) ? freshCustomers.data : 
                                       Array.isArray(freshCustomers) ? freshCustomers : [];
              
              const searchEmail = formData.EmailAddress.trim().toLowerCase();
              const foundCustomer = freshCustomerList.find(c => 
                (c.EmailAddress || '').trim().toLowerCase() === searchEmail
              );
              
              if (foundCustomer) {
                customerId = foundCustomer.CustomerID || foundCustomer.customerid;
                setSuccess(`Customer "${foundCustomer.FirstName}" already exists. Adding vehicle...`);
                setCustomers(freshCustomerList);
              } else {
                setError('Email exists in system but customer record not found.');
                return;
              }
            } catch (fetchErr) {
              console.error('Error fetching customers:', fetchErr);
              setError('Error updating customer. Please try again.');
              return;
            }
          } else {
            setError(createErr.response?.data?.message || 'Failed to create customer.');
            return;
          }
        }
      }

      // Now save vehicle detail separately if vehicle data provided
      if (customerId && vehicleData.VehicleNumber.trim()) {
        try {
          console.log('Processing vehicle with model:', vehicleData.VehicleModel);
          
          // Use default manufacturer
          const defaultManufacturer = 'Royal Enfield';
          console.log(`Using default manufacturer: ${defaultManufacturer}`);
          
          // Create vehicle detail with correct field names
          const vehiclePayload = {
            CustomerID: customerId,
            RegistrationNumber: vehicleData.VehicleNumber,
            VehicleModel: vehicleData.VehicleModel,
            Color: vehicleData.VehicleColor,
            CreatedBy: 1,
          };
          
          // Check if we're updating an existing customer with existing vehicle
          if (editingId) {
            // Try to find existing vehicle for this customer
            console.log('Checking for existing vehicle for customer:', customerId);
            try {
              const existingVehicles = await getVehicleDetailsByCustomerId(customerId);
              const existingVehicleList = existingVehicles.data || [];
              
              if (existingVehicleList.length > 0) {
                // Update the first vehicle (or find matching by registration number)
                const vehicleToUpdate = existingVehicleList[0];
                const vehicleDetailId = vehicleToUpdate.vehicleid || vehicleToUpdate.vehicledetailid;
                
                console.log('Found existing vehicle:', vehicleDetailId, 'Updating instead of creating');
                
                const updatePayload = {
                  RegistrationNumber: vehicleData.VehicleNumber,
                  VehicleModel: vehicleData.VehicleModel,
                  Color: vehicleData.VehicleColor,
                  UpdatedBy: 1,
                };
                
                // Call API to update vehicle
                const updateVehicleResponse = await updateVehicleDetail(vehicleDetailId, updatePayload);
                
                console.log('Vehicle detail update response:', updateVehicleResponse);
                
                if (updateVehicleResponse && updateVehicleResponse.success) {
                  setSuccess(prev => prev + ` Vehicle "${vehicleData.VehicleNumber}" updated successfully!`);
                  console.log('Vehicle detail updated successfully');
                } else {
                  const errorMsg = updateVehicleResponse?.message || 'Unknown error';
                  console.warn('Vehicle detail update failed:', errorMsg);
                  setError(`Customer saved, but vehicle update failed: ${errorMsg}`);
                }
                return; // Don't try to create if we updated
              }
            } catch (vehicleCheckErr) {
              console.log('No existing vehicle found, will create new one');
            }
          }
          
          // Create new vehicle detail
          console.log('Creating vehicle detail with payload:', vehiclePayload);
          const vehicleResponse = await createVehicleDetail(vehiclePayload);
          console.log('Vehicle detail response:', vehicleResponse);
          
          if (vehicleResponse && vehicleResponse.success) {
            setSuccess(prev => prev + ` Vehicle "${vehicleData.VehicleNumber}" (${defaultManufacturer}) added successfully!`);
            console.log('Vehicle detail created successfully');
          } else {
            const errorMsg = vehicleResponse?.message || vehicleResponse?.error || 'Unknown error';
            console.warn('Vehicle detail creation failed:', errorMsg);
            console.warn('Full response:', vehicleResponse);
            setError(`Customer saved, but vehicle detail creation failed: ${errorMsg}`);
          }
        } catch (vehicleErr) {
          console.error('Vehicle detail error - full error object:', vehicleErr);
          console.error('Error response data:', vehicleErr.response?.data);
          console.error('Error message:', vehicleErr.message);
          const errorMsg = vehicleErr.response?.data?.message || vehicleErr.response?.data?.error || vehicleErr.message || 'Unknown error';
          setError(`Customer saved, but failed to add vehicle detail: ${errorMsg}`);
        }
      } else {
        console.log('Vehicle creation skipped - customerId:', customerId, 'vehicleNumber:', vehicleData.VehicleNumber);
      }

      fetchCustomers();
      resetForm();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      let debugMsg = 'Failed to save customer. Please try again.';
      if (err.response) {
        debugMsg += '\nResponse status: ' + err.response.status;
        debugMsg += '\nResponse data: ' + JSON.stringify(err.response.data);
      } else if (err.request) {
        debugMsg += '\nNo response received. Request: ' + JSON.stringify(err.request);
      } else {
        debugMsg += '\nError: ' + err.message;
      }
      debugMsg += '\nFull error: ' + JSON.stringify(err);
      setError(debugMsg);
      console.error('Customer creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setLoading(true);
      setError(null);
      try {
        await deleteCustomer(id, {
          DeletedBy: 1,
          DeletedAt: new Date().toISOString().split('T')[0],
        });
        setSuccess('Customer deleted successfully!');
        fetchCustomers();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to delete customer';
        setError(errMsg);

      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (customer) => {
    // Extract only customer fields, exclude vehicle data
    const cleanCustomer = {
      FirstName: customer.FirstName || customer.firstname || '',
      LastName: customer.LastName || customer.lastname || '',
      EmailAddress: customer.EmailAddress || customer.emailaddress || '',
      GSTNumber: customer.GSTNumber || customer.gstnumber || '',
      LoyalityPoints: customer.LoyalityPoints || customer.loyalitypoints || '0',
      IsActive: customer.IsActive !== undefined ? customer.IsActive : customer.isactive,
      MarketingConsent: customer.MarketingConsent !== undefined ? customer.MarketingConsent : customer.marketingconsent,
      Profession: customer.Profession || customer.profession || '',
      Gender: customer.Gender || customer.gender || '',
      DateOfBirth: customer.DateOfBirth || customer.dateofbirth || '',
      DateOfMarriage: customer.DateOfMarriage || customer.dateofmarriage || '',
      AddressLine1: customer.AddressLine1 || customer.addressline1 || '',
      AddressLine2: customer.AddressLine2 || customer.addressline2 || '',
      City: customer.City || customer.city || 'Chennai',
      State: customer.State || customer.state || 'TamilNadu',
      PostalCode: customer.PostalCode || customer.postalcode || '',
      MobileNumber1: customer.MobileNumber1 || customer.mobilenumber1 || '',
      MobileNumber2: customer.MobileNumber2 || customer.mobilenumber2 || '',
      ExtraVar1: customer.ExtraVar1 || customer.extravar1 || '',
      ExtraVar2: customer.ExtraVar2 || customer.extravar2 || '',
      ExtraInt1: customer.ExtraInt1 || customer.extraint1 || '',
      CreatedBy: customer.CreatedBy || customer.createdby || 1,
      CreatedAt: customer.CreatedAt || customer.createdat || '',
      BranchID: customer.BranchID || customer.branchid || 1,
    };
    
    // Set vehicle data if available
    if (customer.vehicles && customer.vehicles.length > 0) {
      const firstVehicle = customer.vehicles[0];
      setVehicleData({
        VehicleNumber: firstVehicle.vehiclenumber || '',
        VehicleModel: firstVehicle.vehiclemodel || '',
        VehicleColor: firstVehicle.vehiclecolor || '',
      });
    }
    
    setFormData(cleanCustomer);
    setEditingId(customer.CustomerID || customer.customerid);
  };

  const resetForm = () => {
    setFormData({
      FirstName: '',
      LastName: '',
      EmailAddress: '',
      GSTNumber: '',
      LoyalityPoints: '0',
      IsActive: true,
      MarketingConsent: false,
      Profession: '',
      Gender: '',
      DateOfBirth: '',
      DateOfMarriage: '',
      AddressLine1: '',
      AddressLine2: '',
      City: 'Chennai',
      State: 'TamilNadu',
      PostalCode: '',
      MobileNumber1: '',
      MobileNumber2: '',
      CreatedBy: 1,
      CreatedAt: new Date().toISOString().split('T')[0],
    });
    setVehicleData({
      VehicleNumber: '',
      VehicleModel: '',
      VehicleColor: '',
    });
    setEditingId(null);
  };

  return (
    <div className="customer-master">
      <div className="messages-container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
      
      {/* Main Layout - Form on Left, Customer List on Right */}
      <div className="form-and-list-container">
        {/* Left Column - Form */}
        <form onSubmit={handleSubmit} className="customer-form">
          {/* Customer Details Section */}
          <div className="customer-fields-section">
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                ref={firstNameRef}
                type="text"
                name="FirstName"
                value={formData.FirstName}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, mobileNumberRef)}
                required
              />
            </div>

            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                ref={mobileNumberRef}
                type="tel"
                name="MobileNumber1"
                value={formData.MobileNumber1}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, emailAddressRef)}
                required
              />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select
                name="Gender"
                value={formData.Gender}
                onChange={handleInputChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                ref={emailAddressRef}
                type="email"
                name="EmailAddress"
                value={formData.EmailAddress}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, addressLine1Ref)}
              />
            </div>

            <div className="form-group">
              <label>Apartment/Street</label>
              <input
                ref={addressLine1Ref}
                type="text"
                name="AddressLine1"
                value={formData.AddressLine1}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, areaRef)}
              />
            </div>

            <div className="form-group">
              <label>Area</label>
              <textarea
                ref={areaRef}
                name="AddressLine2"
                value={formData.AddressLine2}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, cityRef)}
                rows="2"
                style={{ resize: 'none' }}
              />
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                ref={cityRef}
                type="text"
                name="City"
                value={formData.City}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, stateRef)}
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                ref={stateRef}
                type="text"
                name="State"
                value={formData.State}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, vehicleNumberRef)}
              />
            </div>

            {/* Spacing: 1 empty row */}
            <div className="spacing-rows"></div>

            {/* Vehicle Details Section - 1 row below State */}
            <div className="vehicle-fields-section">
              <div className="form-group">
                <label>Vehicle Number</label>
                <input
                  ref={vehicleNumberRef}
                  type="text"
                  name="VehicleNumber"
                  value={vehicleData.VehicleNumber}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, vehicleModelRef)}
                  placeholder="Enter vehicle registration number"
                />
              </div>

              <div className="form-group">
                <label>Vehicle Model ({uniqueModels.length})</label>
                <select
                  ref={vehicleModelRef}
                  name="VehicleModel"
                  value={vehicleData.VehicleModel}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, vehicleColorRef)}
                >
                  <option value="">
                    {uniqueModels.length === 0
                      ? '⚠️ No models available'
                      : 'Select Model'}
                  </option>
                  {uniqueModels.length > 0 ? (
                    uniqueModels.map((model, index) => (
                      <option key={index} value={model}>
                        {model}
                      </option>
                    ))
                  ) : (
                    <option disabled>No models found</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Vehicle Color ({uniqueColors.length}) *</label>
                <select
                  ref={vehicleColorRef}
                  name="VehicleColor"
                  value={vehicleData.VehicleColor}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, submitButtonRef)}
                  required
                  disabled={!vehicleData.VehicleModel}
                >
                  <option value="">
                    {!vehicleData.VehicleModel
                      ? 'Select vehicle model first'
                      : uniqueColors.length === 0
                        ? '⚠️ No colors available'
                        : 'Select Color'}
                  </option>
                  {uniqueColors.length > 0 ? (
                    uniqueColors.map((color, index) => (
                      <option key={index} value={color}>
                        {color}
                      </option>
                    ))
                  ) : (
                    <option disabled>No colors found</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              ref={submitButtonRef}
              type="submit" 
              disabled={loading}
              onKeyDown={handleSubmitKeyDown}
            >
              {loading ? 'Saving...' : editingId ? 'Update Customer' : 'Create Customer'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Right Column - Customer Details List */}
        <div className="recent-customer-section">
          <h3>Customer Details</h3>
          {customers.length === 0 ? (
            <div className="customer-item">No customers yet</div>
          ) : (
            <div className="customer-list-simple">
              {customers.map((customer, index) => {
                // Handle both uppercase and lowercase field names from API
                const customerId = customer.CustomerID || customer.customerid;
                const firstName = customer.FirstName || customer.firstname;
                const lastName = customer.LastName || customer.lastname;
                const mobileNumber = customer.MobileNumber1 || customer.mobilenumber1;
                const addressLine2 = customer.AddressLine2 || customer.addressline2;
                const vehicleNumber = customer.VehicleNumber || customer.vehiclenumber;
                const vehicleModel = customer.VehicleModel || customer.vehiclemodel;
                
                return (
                <div key={customerId} className="customer-item">
                  <div className="customer-item-content">
                    <span className="customer-item-number">{index + 1}. </span>
                    <span className="customer-item-name">{firstName} {lastName || ''}</span>
                    <span>. </span>
                    <span className="customer-item-details">
                      {mobileNumber || 'N/A'}, {addressLine2 || 'N/A'}
                      {vehicleNumber && ` | Vehicle: ${vehicleNumber}${vehicleModel ? ` (${vehicleModel})` : ''}`}
                    </span>
                  </div>
                  <div className="customer-item-actions">
                    <button 
                      className="btn-edit" 
                      onClick={() => handleEdit(customer)}
                      title="Edit customer"
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDelete(customerId)}
                      title="Delete customer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerMaster;
