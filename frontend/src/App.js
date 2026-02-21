import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerMaster from './components/CustomerMaster';
import InvoiceMaster from './components/InvoiceMaster';
import Payment from './components/Payment';
import './App.css';

function App() {
  const [activeMenu, setActiveMenu] = useState('customer');

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
                  Customer Master
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
                  to="/payments"
                  className={activeMenu === 'payment' ? 'active' : ''}
                  onClick={() => setActiveMenu('payment')}
                >
                  Payment
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/customers" element={<CustomerMaster />} />
            <Route path="/invoices" element={<InvoiceMaster />} />
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
