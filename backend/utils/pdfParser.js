/**
 * Extract text content from PDF buffer using regex patterns
 */
async function extractTextFromPDF(buffer) {
  try {
    const bufferString = buffer.toString('binary');
    let extractedText = '';
    
    // Strategy 1: Extract from text stream objects
    const textMatches = bufferString.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g) || [];
    
    for (const match of textMatches) {
      let text = match.slice(1, -1);
      // Decode PDF escape sequences - preserve intentional newlines
      text = text.replace(/\\(.)/g, (m, p1) => {
        if (p1 === 'n') return '\n';
        if (p1 === 't') return '\t';
        if (p1 === 'r') return '\n';
        if (p1 === '(') return '(';
        if (p1 === ')') return ')';
        return p1;
      });
      extractedText += text + '\n';  // Add newline after each text object
    }
    
    // Strategy 2: Extract from showText operations (BT ... Tj ... ET)
    const btMatches = bufferString.match(/BT([\s\S]{0,8000}?)ET/g) || [];
    for (const match of btMatches) {
      const textStrings = match.match(/\(([^()]*)\)\s*Tj/g) || [];
      for (const str of textStrings) {
        const text = str.match(/\(([^()]*)\)/);
        if (text && text[1]) {
          extractedText += text[1] + '\n';  // Preserve as separate line
        }
      }
    }
    
    // Clean up: collapse consecutive spaces but preserve newlines
    extractedText = extractedText
      .replace(/[ \t]+/g, ' ')  // Collapse spaces/tabs
      .replace(/\n\s*\n+/g, '\n')  // Remove empty lines
      .trim();
    
    return extractedText || 'NO_TEXT_FOUND';
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

/**
 * Parse vendor invoice text to extract inventory items and bill number
 */
function parseInvoiceText(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('PDF does not contain extractable text');
  }

  const items = [];
  const seen = new Set();
  let billNo = null;
  
  // Split into proper lines
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Extract Bill No from invoice
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const billMatch = lines[i].match(/Bill\s+No\s*:\s*([^\s,]+)/i);
    if (billMatch) {
      billNo = billMatch[1].trim();
      console.log(`📋 Found Bill No: ${billNo}`);
      break;
    }
  }
  
  // Find the table header that indicates data section starts
  // Skip first 15 lines (company header info typically ends by line 15)
  let dataStart = -1;
  for (let i = 15; i < lines.length; i++) {
    const line = lines[i];
    // Look for invoice table header keywords - more flexible matching
    if (/SL|PART|CODE|DESCRIPTION|QTY|QUANTITY|ITEM/i.test(line)) {
      dataStart = i + 1;
      console.log(`Found table header at line ${i}: "${line}"`);
      break;
    }
  }
  
  // If we found header, process lines after it
  if (dataStart > 0) {
    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines and separator lines (dashes)
      if (!line || line.length < 2 || /^-+$/.test(line) || /^─+$/.test(line)) {
        continue;
      }
      
      // Stop at footer/summary sections
      if (/^(TOTAL|GRAND TOTAL|SUBTOTAL|SUB TOTAL|TAX|CGST|SGST|IGST|THANK|FOR|AUTHORIZED|NOTES|TERMS|PAGE|SIGNATURE|Sub Total|Taxable)/i.test(line)) {
        break;
      }
      
      // Split by spaces
      const parts = line.split(/\s+/);
      
      // Expected: parts[0]=SL#, parts[1]=PartNo, parts[2]=HSN, parts[3...]=Desc+Qty+Prices
      if (parts.length >= 5) {
        const partNum = parts[1];
        
        // Find qty: it's the first integer (no decimal) that's followed by a decimal number
        let qtyIndex = -1;
        for (let j = 3; j < parts.length - 1; j++) {
          const currentVal = parseFloat(parts[j]);
          const nextVal = parseFloat(parts[j + 1]);
          
          // Check if current is integer (qty) and next is decimal (price)
          if (!isNaN(currentVal) && !isNaN(nextVal) &&
              currentVal > 0 && currentVal <= 9999 &&
              !parts[j].includes('.') &&  // qty has no decimal point
              parts[j + 1].includes('.')) {  // next element has decimal (price)
            // Verify price is significantly larger than qty
            if (nextVal > currentVal * 2) {
              qtyIndex = j;
              break;
            }
          }
        }
        
        // If we found qty, extract description, quantity, and price
        if (qtyIndex > 3) {
          const desc = parts.slice(3, qtyIndex).join(' ');
          const qty = parseFloat(parts[qtyIndex]);
          const price = parseFloat(parts[qtyIndex + 1]);  // Price is right after qty
          
          if (!isNaN(qty) && qty > 0 && partNum && desc.length > 0 && !isNaN(price)) {
            const key = partNum.toLowerCase();
            if (!seen.has(key)) {
              console.log(`✓ Found item: Code="${partNum}", Desc="${desc.substring(0, 50)}...", Qty=${qty}, Price=${price}`);
              items.push({
                partnumber: partNum,
                description: desc.substring(0, 100),
                qtyReceived: qty,
                price: price
              });
              seen.add(key);
            }
          }
        }
      }
    }
  }

  if (items.length === 0) {
    console.error('PDF Parser: Could not find table data');
    console.error('PDF Parser: First 50 lines:', lines.slice(0, 50));
    console.error('PDF Parser: Looking for header keywords:', lines.map((l, i) => `${i}: ${l}`).slice(0, 50).join('\n'));
    throw new Error('No inventory items found in PDF. Expected format: Item Code | Description | Quantity');
  }

  return { items, billNo };
}

module.exports = {
  extractTextFromPDF,
  parseInvoiceText
};
