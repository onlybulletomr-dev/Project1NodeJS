import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerMaster from './components/CustomerMaster';
import InvoiceMaster from './components/InvoiceMaster';
import InvoiceList from './components/InvoiceList';
import Payment from './components/Payment';
import Login from './components/Login';
import { setUserId, clearUserId, getUserId, setBranchId, clearBranchId } from './api';
import './App.css';

function App() {
  const [activeMenu, setActiveMenu] = useState('customer');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const validateSession = async () => {
      const userId = getUserId();
      if (userId) {
        try {
          // Verify userId is still valid with the server
          const response = await fetch('http://localhost:5000/api/auth/validate', {
            method: 'GET',
            headers: {
              'x-user-id': userId,
            },
          });
          
          if (response.ok) {
            // Session is still valid
            setIsAuthenticated(true);
            const storedUserName = localStorage.getItem('userName');
            setUserName(storedUserName || 'User');
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

  const handleLoginSuccess = (userId, userName, branchId) => {
    // Store userId and branchId in localStorage and set in API headers
    setUserId(userId);
    if (branchId) {
      setBranchId(branchId);
    }
    localStorage.setItem('userName', userName);
    
    setIsAuthenticated(true);
    setUserName(userName);
  };

  const handleLogout = () => {
    clearUserId();
    clearBranchId();
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserName('');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app if authenticated
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="navbar-container">
            <h1 className="navbar-title">ERP Master Data Management</h1>
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
            </ul>
            <div className="user-info">
              <span className="user-name">Welcome, {userName}</span>
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
