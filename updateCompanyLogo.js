const pool = require('./backend/config/db');
const fs = require('fs');
const path = require('path');

// Update company 1 with a simple base64 PNG logo (transparent background)
// This creates a 200x200px transparent PNG with "OB" text
async function updateCompanyLogo() {
  try {
    // A simple 200x200px transparent PNG with "OB" text (base64 encoded)
    // This is a small test image - you can replace with actual logo later
    const sampleLogoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGpSURBVHic7doxDQAwDATBd+0Nc/qEzOqT4BJABJABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGUAGkAFkABlABpABZAAZQAaQAWQAGX4C74dISMF+F4MQAAAAASUVORK5CYII=';

    const result = await pool.query(
      `UPDATE companymaster 
       SET logoimagepath = $1
       WHERE companyid = 1`,
      [sampleLogoBase64]
    );

    console.log('✅ Company 1 logo updated successfully');
    console.log('Field type: Base64 encoded PNG image');
    console.log('Size: 200x200px');
    
    // Verify
    const verify = await pool.query(
      `SELECT companyid, companyname, LENGTH(logoimagepath) as logo_size FROM companymaster WHERE companyid = 1`
    );
    
    console.log('\nVerification:');
    console.log(verify.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateCompanyLogo();
