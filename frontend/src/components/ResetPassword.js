import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import './PasswordManagement.css';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('resetToken');
    if (!token) {
      setError('Invalid or expired reset link. Please request a new one.');
      navigate('/forgot-password');
    } else {
      setResetToken(token);
    }
  }, [navigate]);

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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (!newPassword) {
      setError('Please enter a new password');
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
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resetToken: resetToken,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Password reset successfully! Redirecting to login...');
        localStorage.removeItem('resetToken');
        localStorage.removeItem('resetUserId');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Error resetting password. Please try again.');
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

  return (
    <div className="password-container">
      <div className="password-box">
        <div className="password-header">
          <h1>Only Bullet - ERP System</h1>
          <p>Set New Password</p>
        </div>

        <form onSubmit={handleResetPassword} className="password-form">
          <p className="form-description">
            Enter a strong password for your account.
          </p>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
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
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="password-footer">
          <p>
            <Link to="/login" className="link">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
