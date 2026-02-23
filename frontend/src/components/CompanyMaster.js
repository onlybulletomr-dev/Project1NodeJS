import React, { useState, useEffect } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api';
import '../styles/CompanyMaster.css';

function CompanyMaster() {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    CompanyName: '',
    ParentCompanyID: '',
    LegalStructure: '',
    RegistrationNumber: '',
    TaxID: '',
    AddressLine1: '',
    AddressLine2: '',
    City: '',
    State: '',
    PostalCode: '',
    Country: '',
    ContactPerson: '',
    EmailAddress: '',
    PhoneNumber1: '',
    PhoneNumber2: '',
    WebsiteUrl: '',
    BankName: '',
    BankAccountNumber: '',
    BankSwiftCode: '',
    CreatedBy: 1,
    CreatedAt: new Date().toISOString().split('T')[0],
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch companies on component mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await getCompanies();
      console.log('Companies response:', response);
      if (response.data && Array.isArray(response.data)) {
        setCompanies(response.data);
      } else {
        console.error('Companies data format incorrect:', response);
        setError('Failed to load companies');
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.CompanyName.trim()) {
      setError('Company Name is required');
      return;
    }
    if (!formData.AddressLine1.trim()) {
      setError('Address Line 1 is required');
      return;
    }
    if (!formData.Country.trim()) {
      setError('Country is required');
      return;
    }
    if (!formData.PhoneNumber1.trim()) {
      setError('Phone Number 1 is required');
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
        await updateCompany(editingId, updateData);
        setSuccess('Company updated successfully!');
        setEditingId(null);
      } else {
        await createCompany(formData);
        setSuccess('Company created successfully!');
      }
      fetchCompanies();
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save company. Please try again.';
      setError(errMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      setLoading(true);
      setError(null);
      try {
        await deleteCompany(id, {
          DeletedBy: 1,
          DeletedAt: new Date().toISOString().split('T')[0],
        });
        setSuccess('Company deleted successfully!');
        fetchCompanies();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to delete company';
        setError(errMsg);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (company) => {
    setFormData(company);
    setEditingId(company.CompanyID);
  };

  const resetForm = () => {
    setFormData({
      CompanyName: '',
      ParentCompanyID: '',
      LegalStructure: '',
      RegistrationNumber: '',
      TaxID: '',
      AddressLine1: '',
      AddressLine2: '',
      City: '',
      State: '',
      PostalCode: '',
      Country: '',
      ContactPerson: '',
      EmailAddress: '',
      PhoneNumber1: '',
      PhoneNumber2: '',
      WebsiteUrl: '',
      BankName: '',
      BankAccountNumber: '',
      BankSwiftCode: '',
      CreatedBy: 1,
      CreatedAt: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
  };

  return (
    <div className="company-master">
      <h1>Company Master</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="company-form">
        <div className="form-group">
          <label>Company Name *</label>
          <input
            type="text"
            name="CompanyName"
            value={formData.CompanyName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Parent Company ID</label>
            <input
              type="number"
              name="ParentCompanyID"
              value={formData.ParentCompanyID}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Legal Structure</label>
            <input
              type="text"
              name="LegalStructure"
              value={formData.LegalStructure}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Registration Number</label>
            <input
              type="text"
              name="RegistrationNumber"
              value={formData.RegistrationNumber}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Tax ID</label>
            <input
              type="text"
              name="TaxID"
              value={formData.TaxID}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Address Line 1 *</label>
          <input
            type="text"
            name="AddressLine1"
            value={formData.AddressLine1}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Address Line 2</label>
          <input
            type="text"
            name="AddressLine2"
            value={formData.AddressLine2}
            onChange={handleInputChange}
          />
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
            <label>Postal Code</label>
            <input
              type="text"
              name="PostalCode"
              value={formData.PostalCode}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Country *</label>
            <input
              type="text"
              name="Country"
              value={formData.Country}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Contact Person</label>
          <input
            type="text"
            name="ContactPerson"
            value={formData.ContactPerson}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="EmailAddress"
              value={formData.EmailAddress}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Phone Number 1 *</label>
            <input
              type="tel"
              name="PhoneNumber1"
              value={formData.PhoneNumber1}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone Number 2</label>
            <input
              type="tel"
              name="PhoneNumber2"
              value={formData.PhoneNumber2}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Website URL</label>
            <input
              type="url"
              name="WebsiteUrl"
              value={formData.WebsiteUrl}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Bank Name</label>
            <input
              type="text"
              name="BankName"
              value={formData.BankName}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Bank Account Number</label>
            <input
              type="text"
              name="BankAccountNumber"
              value={formData.BankAccountNumber}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Bank Swift Code</label>
          <input
            type="text"
            name="BankSwiftCode"
            value={formData.BankSwiftCode}
            onChange={handleInputChange}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : editingId ? 'Update Company' : 'Create Company'}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} className="cancel-btn">
            Cancel
          </button>
        )}
      </form>

      <div className="companies-list">
        <div className="list-header">
          <h2>Companies List</h2>
          <button onClick={fetchCompanies} className="refresh-btn" disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : companies.length === 0 ? (
          <p>No companies found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Registration #</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.CompanyID}>
                  <td>{company.CompanyID}</td>
                  <td>{company.CompanyName}</td>
                  <td>{company.RegistrationNumber}</td>
                  <td>{company.EmailAddress}</td>
                  <td>{company.PhoneNumber1}</td>
                  <td>
                    <button onClick={() => handleEdit(company)} className="edit-btn">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(company.CompanyID)} className="delete-btn">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CompanyMaster;
