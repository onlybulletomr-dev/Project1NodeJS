const pool = require('./backend/config/db');

async function testQuery() {
  try {
    console.log('Testing query for invoice ID 92...');
    
    const invoiceMasterResult = await pool.query(
      `SELECT 
        im.invoiceid,
        im.invoicenumber,
        im.branchid,
        im.customerid,
        im.vehicleid,
        im.jobcardid,
        im.invoicedate,
        im.duedate,
        im.invoicetype,
        im.subtotal,
        im.totaldiscount,
        im.partsincome,
        im.serviceincome,
        im.tax1,
        im.tax2,
        im.totalamount,
        im.technicianmain,
        im.technicianassistant,
        im.waterwash,
        im.serviceadvisorin,
        im.serviceadvisordeliver,
        im.testdriver,
        im.cleaner,
        im.additionalwork,
        im.odometer,
        im.notes,
        im.notes1,
        im.extravar1,
        im.extravar2,
        im.extraint1,
        im.createdby,
        im.createdat,
        im.updatedby,
        im.updatedat,
        im.deletedat,
        im.deletedby,
        im.paymentstatus,
        im.paymentdate,
        im.vehiclenumber,
        COALESCE(vm.modelname, '-') as vehiclemodel,
        COALESCE(vm.color, '-') as vehiclecolor,
        COALESCE(SUM(CASE WHEN pd.paymentstatus IN ('Paid', 'Completed') THEN pd.amount ELSE 0 END), 0) as amountpaid
      FROM invoicemaster im
      LEFT JOIN vehiclemaster vm ON im.vehicleid = vm.vehicleid AND vm.deletedat IS NULL
      LEFT JOIN paymentdetail pd ON im.invoiceid = pd.invoiceid AND pd.deletedat IS NULL
      WHERE im.invoiceid = $1 AND im.deletedat IS NULL
      GROUP BY im.invoiceid, im.invoicenumber, im.branchid, im.customerid, im.vehicleid, im.jobcardid,
               im.invoicedate, im.duedate, im.invoicetype, im.subtotal, im.totaldiscount, im.partsincome,
               im.serviceincome, im.tax1, im.tax2, im.totalamount, im.technicianmain, im.technicianassistant,
               im.waterwash, im.serviceadvisorin, im.serviceadvisordeliver, im.testdriver, im.cleaner,
               im.additionalwork, im.odometer, im.notes, im.notes1, im.extravar1, im.extravar2, im.extraint1,
               im.createdby, im.createdat, im.updatedby, im.updatedat, im.deletedat, im.deletedby,
               im.paymentstatus, im.paymentdate, im.vehiclenumber,
               vm.modelname, vm.color`,
      [92]
    );

    console.log('✅ Query executed successfully!');
    if (invoiceMasterResult.rows.length > 0) {
      console.log('Invoice found:');
      console.log('  Invoice Number:', invoiceMasterResult.rows[0].invoicenumber);
      console.log('  Vehicle Model:', invoiceMasterResult.rows[0].vehiclemodel);
      console.log('  Vehicle Color:', invoiceMasterResult.rows[0].vehiclecolor);
      console.log('  Amount Paid:', invoiceMasterResult.rows[0].amountpaid);
    } else {
      console.log('Invoice not found');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testQuery();
