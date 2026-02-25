import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import './PasswordManagement.css';

function ForgotPassword() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [step, setStep] = useState(1); // Step 1: Enter phone/ID, Step 2: Verify OTP
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validatePhoneNumber = (phone) => {
    // Accept 10 digit Indian phone numbers or international format
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (!phoneNumber && !employeeId) {
      setError('Please enter either phone number or Employee ID');
      return;
    }

    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber || null,
          employeeId: employeeId || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('OTP sent to your registered mobile number. Check your SMS.');
        setStep(2);
      } else {
        setError(data.message || 'Unable to find account with provided details');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error connecting to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber || null,
          employeeId: employeeId || null,
          otp: otp,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store reset token and redirect to reset password page
        localStorage.setItem('resetToken', data.resetToken);
        localStorage.setItem('resetUserId', data.userId);
        navigate('/reset-password');
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error verifying OTP. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber || null,
          employeeId: employeeId || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('New OTP sent to your mobile number. Check your SMS.');
      } else {
        setError(data.message || 'Unable to resend OTP');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error resending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-container">
      <div className="password-box">
        <div className="password-header">
          <h1>Only Bullet - ERP System</h1>
          <p>Reset Your Password</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="password-form">
            <p className="form-description">
              Enter your mobile number or Employee ID to receive an OTP for password reset.
            </p>

            <div className="form-group">
              <label htmlFor="phoneNumber">Mobile Number</label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                maxLength="10"
              />
              <small className="form-hint">e.g., 9876543210 or +91 9876543210</small>
            </div>

            <div className="form-divider">OR</div>

            <div className="form-group">
              <label htmlFor="employeeId">Employee ID</label>
              <input
                id="employeeId"
                type="text"
                placeholder="Enter your Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="submit-button" disabled={loading || (!phoneNumber && !employeeId)}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndReset} className="password-form">
            <p className="form-description">
              Enter the 6-digit OTP sent to your mobile number.
            </p>

            <div className="otp-display">
              <p>Sent to: <strong>{phoneNumber ? `****${phoneNumber.slice(-4)}` : `Employee ID: ${employeeId}`}</strong></p>
            </div>

            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                autoFocus
              />
              <small className="form-hint">6-digit code</small>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button type="submit" className="submit-button" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify OTP & Reset Password'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleResendOTP}
              disabled={loading}
            >
              Resend OTP
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setPhoneNumber('');
                setEmployeeId('');
                setMessage('');
              }}
            >
              Back
            </button>
          </form>
        )}

        <div className="password-footer">
          <p>
            Remember your password? <Link to="/login" className="link">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
