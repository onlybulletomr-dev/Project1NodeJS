import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerMaster from './components/CustomerMaster';
import InvoiceMaster from './components/InvoiceMaster';
import InvoiceList from './components/InvoiceList';
import Payment from './components/Payment';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import SetPassword from './components/SetPassword';
import RoleManagement from './components/RoleManagement';
import { setUserId, clearUserId, getUserId, setBranchId, clearBranchId, API_BASE_URL } from './api';
import './App.css';

function App() {
  const [activeMenu, setActiveMenu] = useState('customer');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [branchName, setBranchName] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const validateSession = async () => {
      const userId = getUserId();
      if (userId) {
        try {
          // Verify userId is still valid with the server
          const response = await fetch(`${API_BASE_URL}/auth/validate`, {
            method: 'GET',
            headers: {
              'x-user-id': userId,
            },
          });
          
          if (response.ok) {
            // Session is still valid
            setIsAuthenticated(true);
            const storedUserName = localStorage.getItem('userName');
            const storedBranchName = localStorage.getItem('branchName');
            setUserName(storedUserName || 'User');
            setBranchName(storedBranchName || 'Branch');
          } else {
            // Session is invalid, clear localStorage and show login
            clearUserId();
            clearBranchId();
            localStorage.removeItem('userName');
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.error('Session validation error:', err);
          // On error, clear localStorage to be safe
          clearUserId();
          clearBranchId();
          localStorage.removeItem('userName');
          setIsAuthenticated(false);
        }
      }
      // If no userId, stay on login screen (isAuthenticated remains false)
    };
    
    validateSession();
  }, []);

  const handleLoginSuccess = (userId, userName, branchId, branchName) => {
    console.log('Login success - received:', { userId, userName, branchId, branchName });
    
    // Store userId and branchId in localStorage and set in API headers
    setUserId(userId);
    if (branchId) {
      setBranchId(branchId);
    }
    localStorage.setItem('userName', userName);
    localStorage.setItem('branchName', branchName);
    console.log('Stored in localStorage:', { userName, branchName });
    
    setIsAuthenticated(true);
    setUserName(userName);
    setBranchName(branchName);
  };

  const handleLogout = () => {
    clearUserId();
    clearBranchId();
    localStorage.removeItem('userName');
    localStorage.removeItem('branchName');
    setIsAuthenticated(false);
    setUserName('');
    setBranchName('');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      </Router>
    );
  }

  // Show main app if authenticated
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="navbar-container">
            <h1 className="navbar-title">Only Bullet - ERP System</h1>
            <ul className="nav-menu">
              <li>
                <Link 
                  to="/customers" 
                  className={activeMenu === 'customer' ? 'active' : ''}
                  onClick={() => setActiveMenu('customer')}
                >
                  Customer
                </Link>
              </li>
              <li>
                <Link
                  to="/invoices"
                  className={activeMenu === 'invoice' ? 'active' : ''}
                  onClick={() => setActiveMenu('invoice')}
                >
                  Invoice
                </Link>
              </li>
              <li>
                <Link
                  to="/invoice-list"
                  className={activeMenu === 'invoicelist' ? 'active' : ''}
                  onClick={() => setActiveMenu('invoicelist')}
                >
                  Invoice List
                </Link>
              </li>
              <li>
                <Link
                  to="/payments"
                  className={activeMenu === 'payment' ? 'active' : ''}
                  onClick={() => setActiveMenu('payment')}
                >
                  Payment
                </Link>
              </li>
              {userName && userName.toLowerCase() === 'ashok' && (
                <li>
                  <Link
                    to="/role-management"
                    className={activeMenu === 'roles' ? 'active' : ''}
                    onClick={() => setActiveMenu('roles')}
                  >
                    Role Management
                  </Link>
                </li>
              )}
            </ul>
            <div className="user-info">
              <span className="user-name">Welcome, {userName} - {branchName}</span>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/customers" element={<CustomerMaster />} />
            <Route path="/invoices" element={<InvoiceMaster />} />
            <Route path="/invoice-list" element={<InvoiceList />} />
            <Route path="/payments" element={<Payment />} />
            <Route 
              path="/role-management" 
              element={
                userName && userName.toLowerCase() === 'ashok' ? (
                  <RoleManagement />
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Access Denied</h2>
                    <p>You do not have permission to access Role Management.</p>
                  </div>
                )
              } 
            />
            <Route path="/" element={<CustomerMaster />} />
          </Routes>
        </div>

        <footer className="footer">
          <p>&copy; 2025 ERP System. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
