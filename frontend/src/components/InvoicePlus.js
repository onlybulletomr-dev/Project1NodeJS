import React from 'react';
import InvoiceForm from './InvoiceForm';

/**
 * InvoicePlus - Advanced invoice creation and editing screen (Ashok only)
 * 
 * Features: Enforces inventory constraints (requires qty on hand > 0)
 * 
 * This wraps the shared InvoiceForm component with mode='invoice-plus'.
 * Do not add duplicate functionality here - keep all logic in InvoiceForm.js
 * 
 * For standard invoice (no qty constraints), use InvoiceMaster.js instead
 */
function InvoicePlus() {
  return <InvoiceForm mode="invoice-plus" />;
}

export default InvoicePlus;
