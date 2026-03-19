const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function backupAndAnalyzeInvoiceDetails() {
  const renderPool = new Pool({
    user: 'postgres1',
    password: 'cfPil2sNkunIK1jQbsy3zjdDHXpQzpS7',
    host: 'dpg-d6cmf5h4tr6s73c9gib0-a.singapore-postgres.render.com',
    port: 5432,
    database: 'project1db_nrlz',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Backup and Analyze InvoiceDetail Data...\n');

    // Step 1: Backup all invoicedetail records
    console.log('📍 Step 1: Backing up all invoicedetail records...');
    const detailResult = await renderPool.query('SELECT * FROM invoicedetail ORDER BY invoiceid');
    const backupData = detailResult.rows;
    
    const backupFile = path.join(__dirname, `invoicedetail_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backed up ${backupData.length} records to: ${backupFile}`);

    // Step 2: Get invoicemaster info
    console.log('\n📍 Step 2: Getting invoicemaster records...');
    const masterResult = await renderPool.query(`
      SELECT invoiceid, invoicenumber, invoicedate, subtotal, totalamount 
      FROM invoicemaster 
      ORDER BY invoiceid
    `);
    const masters = masterResult.rows;
    console.log(`✅ Found ${masters.length} invoicemaster records`);

    // Step 3: Analyze invoicedetail groupings
    console.log('\n📍 Step 3: Analyzing invoicedetail data...');
    const groupedByInvoiceId = new Map();
    
    backupData.forEach(detail => {
      if (!groupedByInvoiceId.has(detail.invoiceid)) {
        groupedByInvoiceId.set(detail.invoiceid, []);
      }
      groupedByInvoiceId.get(detail.invoiceid).push(detail);
    });

    console.log(`✅ Found ${groupedByInvoiceId.size} unique invoiceids in invoicedetail`);

    // Step 4: Create analysis report
    console.log('\n📋 Current Data Structure:');
    console.log('\nInvoiceMaster:');
    console.log('ID | Number | Subtotal | Date');
    console.log('---|--------|----------|------');
    masters.forEach(m => {
      console.log(`${m.invoiceid} | ${m.invoicenumber} | ₹${m.subtotal} | ${m.invoicedate}`);
    });

    console.log('\n\nInvoiceDetail Groups:');
    console.log('Id | Items | Total Amount | First Item | Last Item | First Item Date');
    console.log('---|-------|-------------|------------|-----------|----------------');
    const summaryData = [];
    groupedByInvoiceId.forEach((items, invoiceid) => {
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.linetotal || 0), 0);
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      summaryData.push({
        invoiceid,
        itemCount: items.length,
        totalAmount: totalAmount.toFixed(2),
        firstItem: firstItem.itemid,
        lastItem: lastItem.itemid,
        firstItemDate: firstItem.createdat
      });
      console.log(`${invoiceid} | ${items.length} | ₹${totalAmount.toFixed(2)} | ${firstItem.itemid} | ${lastItem.itemid} | ${firstItem.createdat}`);
    });

    // Step 5: Try matching by amount
    console.log('\n\n📍 Step 5: Analyzing possible matches by amount...');
    console.log('\nPotential Matches (Subtotal from InvoiceMaster ≈ LineTotal from InvoiceDetail):');
    console.log('InvoiceDetail ID | Total Amount | Possible InvoiceMaster Matches');
    console.log('-----------------|--------------|-------------------------------');
    
    const matchingMap = new Map();
    summaryData.forEach(detail => {
      const possibleMatches = masters.filter(master => {
        const diff = Math.abs(parseFloat(detail.totalAmount) - master.subtotal);
        return diff < 1; // Within ₹1 tolerance
      });

      if (possibleMatches.length > 0) {
        const matchStr = possibleMatches.map(m => `#${m.invoiceid}(${m.invoicenumber})`).join(', ');
        console.log(`${detail.invoiceid} | ₹${detail.totalAmount} | ${matchStr}`);
        matchingMap.set(detail.invoiceid, possibleMatches.map(m => m.invoiceid));
      } else {
        console.log(`${detail.invoiceid} | ₹${detail.totalAmount} | ❌ NO MATCH`);
      }
    });

    // Step 6: Save analysis
    console.log('\n📍 Step 6: Saving detailed analysis...');
    const analysisFile = path.join(__dirname, `invoicedetail_analysis_${Date.now()}.json`);
    const analysis = {
      timestamp: new Date().toISOString(),
      backup_file: backupFile,
      backup_records: backupData.length,
      invoicemaster_count: masters.length,
      invoicedetail_groups: summaryData,
      potential_matches: Object.fromEntries(matchingMap),
      masters: masters
    };
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`✅ Saved analysis to: ${analysisFile}`);

    // Step 7: Restore instructions
    console.log('\n\n📌 RESTORATION INSTRUCTIONS:');
    console.log('If something goes wrong, restore the data using:');
    console.log(`\nnode restoreInvoiceDetails.js ${backupFile}\n`);

    console.log('🎉 Backup and analysis complete! Safe to proceed with fixing.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await renderPool.end();
  }
}

backupAndAnalyzeInvoiceDetails();
