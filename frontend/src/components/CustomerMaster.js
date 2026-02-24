import React, { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getUniqueVehicleModels, getUniqueVehicleColors } from '../api';
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
    VehicleNumber: '',
    VehicleModel: '',
    VehicleColor: '',
    BranchID: '',
    CreatedBy: 1,
    CreatedAt: new Date().toISOString().split('T')[0],
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('customer1');

  // Fetch customers and vehicle data on component mount
  useEffect(() => {
    fetchCustomers();
    fetchUniqueModels();
    fetchUniqueColors();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await getCustomers();
      if (response.data && Array.isArray(response.data)) {
        setCustomers(response.data);
      } else {
        setError('Failed to load customers');
      }
      setError(null);
    } catch (err) {
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

  const fetchUniqueColors = async () => {
    if (!formData.VehicleModel) {
      setUniqueColors([]);
      return;
    }
    try {
      const response = await getUniqueVehicleColors(formData.VehicleModel);
      if (response.data && Array.isArray(response.data)) {
        setUniqueColors(response.data);
      } else {
        setError('Failed to load unique vehicle colors');
      }
    } catch (err) {
      setError('Unable to load unique vehicle colors. Please refresh the page.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    // If vehicle model changes, reload colors
    if (name === 'VehicleModel') {
      setFormData(prev => ({ ...prev, VehicleColor: '' }));
      fetchUniqueColors();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.FirstName.trim()) {
      setError('First Name is required');
      return;
    }
    if (!formData.MobileNumber1.trim()) {
      setError('Mobile Number 1 is required');
      return;
    }
    if (!formData.VehicleModel.trim()) {
      setError('Vehicle Model is required');
      return;
    }
    if (!formData.VehicleColor.trim()) {
      setError('Vehicle Color is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        const updateData = {
          ...formData,
          UpdatedBy: 1,
          UpdatedAt: new Date().toISOString().split('T')[0],
        };
        const response = await updateCustomer(editingId, updateData);
        if (response && response.success) {
          setSuccess(response.message || 'Customer updated successfully!');
          setEditingId(null);
        } else {
          setError(response?.message || 'Failed to update customer.');
          return;
        }
      } else {
        const response = await createCustomer(formData);
        if (response && response.success) {
          setSuccess(response.message || 'Customer created successfully!');
        } else {
          setError(response?.message || 'Failed to create customer.');
          return;
        }
      }
      fetchCustomers();
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
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
    setFormData(customer);
    setEditingId(customer.CustomerID);
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
      VehicleNumber: '',
      VehicleModel: '',
      VehicleColor: '',
      CreatedBy: 1,
      CreatedAt: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setActiveTab('customer1');
  };

  return (
    <div className="customer-master">
      <h1>Customer Master</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}


      <form onSubmit={handleSubmit} className="customer-form">
        <div className="tabs-container">
          <div className="tabs">
            <button 
              type="button"
              className={`tab-btn ${activeTab === 'customer1' ? 'active' : ''}`}
              onClick={() => setActiveTab('customer1')}
            >
              Customer1
            </button>
          </div>
        </div>

        {/* Customer1 Tab */}
        {activeTab === 'customer1' && (
          <div className="tab-content">
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="FirstName"
                  value={formData.FirstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mobile Number 1 *</label>
                <input
                  type="tel"
                  name="MobileNumber1"
                  value={formData.MobileNumber1}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Address Line 1</label>
                <input
                  type="text"
                  name="AddressLine1"
                  value={formData.AddressLine1}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Area</label>
                <input
                  type="text"
                  name="AddressLine2"
                  value={formData.AddressLine2}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="City"
                  value={formData.City}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="State"
                  value={formData.State}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender</label>
                <select name="Gender" value={formData.Gender} onChange={handleInputChange}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Number</label>
                <input
                  type="text"
                  name="VehicleNumber"
                  value={formData.VehicleNumber}
                  onChange={handleInputChange}
                  placeholder="Enter vehicle registration number"
                />
              </div>
              <div className="form-group">
                <label>Vehicle Model ({uniqueModels.length})</label>
                <select
                  name="VehicleModel"
                  value={formData.VehicleModel}
                  onChange={handleInputChange}
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Color ({uniqueColors.length}) *</label>
                <select
                  name="VehicleColor"
                  value={formData.VehicleColor}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.VehicleModel}
                >
                  <option value="">
                    {!formData.VehicleModel
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
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : editingId ? 'Update Customer' : 'Create Customer'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="cancel-btn">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="customers-list">
        <div className="list-header">
          <h2>Customers List</h2>
          <button onClick={fetchCustomers} className="refresh-btn" disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : customers.length === 0 ? (
          <p>No customers found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Vehicle</th>
                <th>Active</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                return (
                  <tr key={customer.CustomerID}>
                    <td>{customer.CustomerID}</td>
                    <td>{customer.FirstName} {customer.LastName}</td>
                    <td>{customer.EmailAddress}</td>
                    <td>{customer.MobileNumber1}</td>
                    <td>{customer.VehicleNumber || 'N/A'}</td>
                    <td>{customer.IsActive ? 'Yes' : 'No'}</td>
                    <td>
                      <button onClick={() => handleEdit(customer)} className="edit-btn">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(customer.CustomerID)} className="delete-btn">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CustomerMaster;
