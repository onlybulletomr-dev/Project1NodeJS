import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import './RoleManagement.css';

function RoleManagement() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [changes, setChanges] = useState({});

  const roles = ['Admin', 'Manager', 'Employee'];

  // Fetch employees and branches on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching from:', `${API_BASE_URL}/roles/employees`);
      console.log('API Base URL:', API_BASE_URL);
      
      const empRes = await fetch(`${API_BASE_URL}/roles/employees`);
      
      if (!empRes.ok) {
        throw new Error(`Failed to fetch employees: ${empRes.status} ${empRes.statusText}`);
      }
      const empData = await empRes.json();

      const branchRes = await fetch(`${API_BASE_URL}/roles/branches`);
      if (!branchRes.ok) {
        throw new Error(`Failed to fetch branches: ${branchRes.status} ${branchRes.statusText}`);
      }
      const branchData = await branchRes.json();

      setEmployees(empData.data || []);
      setBranches(branchData.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (employeeid, newRole) => {
    const currentEmployee = employees.find(e => e.employeeid === employeeid);
    setChanges({
      ...changes,
      [employeeid]: {
        ...changes[employeeid],
        role_type: newRole
      }
    });
  };

  const handleBranchChange = (employeeid, newBranch) => {
    setChanges({
      ...changes,
      [employeeid]: {
        ...changes[employeeid],
        branchid: parseInt(newBranch)
      }
    });
  };

  const handlePasswordChange = (employeeid, newPassword) => {
    setChanges({
      ...changes,
      [employeeid]: {
        ...changes[employeeid],
        password: newPassword
      }
    });
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      const changedEmployees = Object.keys(changes).map(empId => {
        const emp = employees.find(e => e.employeeid === parseInt(empId));
        const update = {
          employeeid: parseInt(empId),
          role_type: changes[empId].role_type || emp?.role_type,
          branchid: changes[empId].branchid || emp?.branchid
        };
        // Only include password if it was changed
        if (changes[empId].password) {
          update.password = changes[empId].password;
        }
        return update;
      });

      if (changedEmployees.length === 0) {
        setMessage('No changes to save');
        return;
      }

      console.log('Saving changes:', changedEmployees);

      const response = await fetch(`${API_BASE_URL}/roles/employees/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('userId') || '1'
        },
        body: JSON.stringify({
          updates: changedEmployees
        })
      });

      const data = await response.json();
      console.log('Save response:', data);

      if (response.ok) {
        setMessage(`✓ ${data.summary.successful} employees updated successfully`);
        setChanges({});
        // Refresh the employee list
        fetchData();
      } else {
        setError(data.message || 'Error saving changes');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Error saving changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setChanges({});
    setMessage('');
    setError('');
  };

  const getDisplayRole = (employeeid) => {
    return changes[employeeid]?.role_type || employees.find(e => e.employeeid === employeeid)?.role_type || 'Employee';
  };

  const getDisplayBranch = (employeeid) => {
    return changes[employeeid]?.branchid || employees.find(e => e.employeeid === employeeid)?.branchid;
  };

  if (loading) {
    return <div className="role-management-container"><p>Loading employees...</p></div>;
  }

  return (
    <div className="role-management-container">
      <div className="role-management-header">
        <h1>Employee Role & Branch Management</h1>
        <p>Assign roles (Admin, Manager, Employee) and branch access to employees</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="role-management-controls">
        <button 
          className="btn-save" 
          onClick={saveChanges}
          disabled={Object.keys(changes).length === 0 || saving}
        >
          {saving ? 'Saving...' : `Save Changes (${Object.keys(changes).length})`}
        </button>
        <button 
          className="btn-reset" 
          onClick={resetChanges}
          disabled={Object.keys(changes).length === 0}
        >
          Discard Changes
        </button>
      </div>

      <div className="employees-table-wrapper">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Employee ID</th>
              <th>Current Role</th>
              <th>Role Assignment</th>
              <th>Current Branch</th>
              <th>Branch Assignment</th>
              <th>Password</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.employeeid} className={changes[emp.employeeid] ? 'changed' : ''}>
                <td className="employee-name">{emp.firstname} {emp.lastname}</td>
                <td className="employee-id">E{emp.employeeid}</td>
                <td className="current-role">
                  <span className={`role-badge role-${emp.role_type?.toLowerCase()}`}>
                    {emp.role_type || 'Employee'}
                  </span>
                </td>
                <td className="role-assignment">
                  <select
                    value={getDisplayRole(emp.employeeid)}
                    onChange={(e) => handleRoleChange(emp.employeeid, e.target.value)}
                    className={changes[emp.employeeid]?.role_type ? 'changed' : ''}
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {changes[emp.employeeid]?.role_type && (
                    <span className="change-indicator">→</span>
                  )}
                </td>
                <td className="current-branch">{emp.branchname || 'N/A'}</td>
                <td className="branch-assignment">
                  <select
                    value={getDisplayBranch(emp.employeeid) || ''}
                    onChange={(e) => handleBranchChange(emp.employeeid, e.target.value)}
                    className={changes[emp.employeeid]?.branchid ? 'changed' : ''}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  {changes[emp.employeeid]?.branchid && (
                    <span className="change-indicator">→</span>
                  )}
                </td>
                <td className="password-assignment">
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={changes[emp.employeeid]?.password || ''}
                    onChange={(e) => handlePasswordChange(emp.employeeid, e.target.value)}
                    className={changes[emp.employeeid]?.password ? 'changed' : ''}
                    maxLength="50"
                  />
                  {changes[emp.employeeid]?.password && (
                    <span className="change-indicator">✓</span>
                  )}
                </td>
                <td className="date">{new Date(emp.dateofjoining).toLocaleDateString()}</td>
                <td className="status">
                  <span className={`status-badge ${emp.isactive ? 'active' : 'inactive'}`}>
                    {emp.isactive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="role-management-footer">
        <p>Total Employees: {employees.length}</p>
        <p>Pending Changes: {Object.keys(changes).length}</p>
      </div>
    </div>
  );
}

export default RoleManagement;
