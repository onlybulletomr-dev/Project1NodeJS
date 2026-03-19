const pool = require('./backend/config/db');

async function testQuery() {
  try {
    console.log('Testing invoice detail query for invoiceId 93...');
    
    // Test the new query structure
    const detailsResult = await pool.query(
      `SELECT 
        id.invoicedetailid,
        id.invoiceid,
        id.itemid,
        id.qty,
        id.unitprice,
        id.linediscount,
        id.linetotal,
        id.lineitemtax1,
        id.lineitemtax2,
        id.extravar1,
        id.extravar2,
        id.extraint1,
        id.createdby,
        id.createdat,
        id.updatedby,
        id.updatedat,
        id.deletedat,
        id.deletedby,
        COALESCE(id.partnumber, CAST(id.itemid AS VARCHAR)) as partnumber,
        COALESCE(id.itemname, im.itemname, sm.servicename, 'Item ' || CAST(id.itemid AS VARCHAR)) as itemname,
        COALESCE(id.itemname, im.itemname, sm.servicename) as description
      FROM invoicedetail id
      LEFT JOIN itemmaster im ON id.itemid = im.itemid AND im.deletedat IS NULL
      LEFT JOIN servicemaster sm ON id.itemid = sm.serviceid AND sm.deletedat IS NULL
      WHERE id.invoiceid = $1 AND id.deletedat IS NULL
      ORDER BY id.invoicedetailid`,
      [93]
    );

    console.log('Details result:', detailsResult.rows);
    console.log('Details count:', detailsResult.rows.length);

    if (detailsResult.rows.length > 0) {
      // Test serial query
      const serialResult = await pool.query(
        `SELECT 
          invoicedetailid,
          string_agg(
            'SN: ' || COALESCE(serialnumber, '-') || ' | Batch: ' || COALESCE(batch, '-') || ' | Model: ' || COALESCE(model, '-') || ' | Mfg: ' || COALESCE(remarks, '-'),
            ' | '
          ) as serials_info
        FROM serialnumber
        WHERE invoicedetailid IN (SELECT invoicedetailid FROM invoicedetail WHERE invoiceid = $1 AND deletedat IS NULL)
          AND deletedat IS NULL
        GROUP BY invoicedetailid`,
        [93]
      );

      console.log('Serial result:', serialResult.rows);
    }

    console.log('✅ Query executed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

testQuery();
