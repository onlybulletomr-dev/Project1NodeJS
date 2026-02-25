import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import './PasswordManagement.css';

function SetPassword() {
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const setToken = searchParams.get('token');
    if (!setToken) {
      setError('Invalid or missing setup link. Contact your administrator.');
    } else {
      setToken(setToken);
      // Fetch employee info using the token
      fetchEmployeeInfo(setToken);
    }
  }, [searchParams]);

  const fetchEmployeeInfo = async (setupToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/employee-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Setup-Token': setupToken,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setEmployeeInfo(data.employee);
      } else {
        setError(data.message || 'Unable to fetch employee information');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error fetching employee information');
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newPassword) {
      setError('Please enter a password');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setupToken: token,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Password set successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Error setting password. Please try again.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error connecting to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength < 2) return { text: 'Weak', color: '#f44336' };
    if (strength < 4) return { text: 'Fair', color: '#ff9800' };
    if (strength < 5) return { text: 'Good', color: '#4caf50' };
    return { text: 'Strong', color: '#2196f3' };
  };

  if (!employeeInfo && !error) {
    return (
      <div className="password-container">
        <div className="password-box">
          <p className="loading-text">Loading employee information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="password-container">
      <div className="password-box">
        <div className="password-header">
          <h1>Only Bullet - ERP System</h1>
          <p>Set Your Password</p>
        </div>

        {error && !employeeInfo ? (
          <div className="error-box">
            <p>{error}</p>
            <Link to="/login" className="link">Back to Login</Link>
          </div>
        ) : (
          <>
            <div className="employee-info-display">
              {employeeInfo && (
                <>
                  <p><strong>Employee ID:</strong> {employeeInfo.employeeid}</p>
                  <p><strong>Name:</strong> {employeeInfo.firstname} {employeeInfo.lastname}</p>
                  <p><strong>Department:</strong> {employeeInfo.department || 'N/A'}</p>
                </>
              )}
            </div>

            <form onSubmit={handleSetPassword} className="password-form">
              <p className="form-description">
                Please set a strong password for your account. You'll use this to log in to the system.
              </p>

              <div className="form-group">
                <label htmlFor="newPassword">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div
                        className="strength-fill"
                        style={{
                          width: `${(Object.values(getPasswordStrength(newPassword))[1] || 0) * 20}%`,
                          backgroundColor: getPasswordStrength(newPassword).color,
                        }}
                      />
                    </div>
                    <p style={{ color: getPasswordStrength(newPassword).color }}>
                      Strength: {getPasswordStrength(newPassword).text}
                    </p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li style={{ color: newPassword.length >= 8 ? '#4caf50' : '#999' }}>
                    ✓ At least 8 characters
                  </li>
                  <li style={{ color: /[A-Z]/.test(newPassword) ? '#4caf50' : '#999' }}>
                    ✓ At least one uppercase letter
                  </li>
                  <li style={{ color: /[a-z]/.test(newPassword) ? '#4caf50' : '#999' }}>
                    ✓ At least one lowercase letter
                  </li>
                  <li style={{ color: /[0-9]/.test(newPassword) ? '#4caf50' : '#999' }}>
                    ✓ At least one number
                  </li>
                </ul>
              </div>

              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}

              <button type="submit" className="submit-button" disabled={loading || !newPassword || !confirmPassword}>
                {loading ? 'Setting Password...' : 'Set Password & Login'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default SetPassword;
