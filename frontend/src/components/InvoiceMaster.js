import React from 'react';
import InvoiceForm from './InvoiceForm';

/**
 * InvoiceMaster - Standard invoice creation and editing screen
 * 
 * Features: Allows billing without inventory constraints (qty on hand <= 0)
 * 
 * This wraps the shared InvoiceForm component with mode='invoice'.
 * Do not add duplicate functionality here - keep all logic in InvoiceForm.js
 * 
 * For Invoice+ specific features, use InvoicePlus.js instead
 */
function InvoiceMaster() {
  return <InvoiceForm mode="invoice" />;
}

export default InvoiceMaster;


