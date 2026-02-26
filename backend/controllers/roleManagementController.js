const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all employees with their current roles and branches
exports.getAllEmployeesWithRoles = async (req, res) => {
  try {
    console.log('GET /api/roles/employees - Fetching all employees');
    
    const query = `
      SELECT 
        e.employeeid,
        e.firstname,
        e.lastname,
        e.role,
        e.employeetype,
        e.branchid,
        c.companyname as branchname,
        e.isactive,
        e.dateofjoining
      FROM employeemaster e
      LEFT JOIN companymaster c ON e.branchid = c.companyid
      WHERE e.deletedat IS NULL
      ORDER BY e.firstname, e.lastname
    `;
    
    const result = await pool.query(query);
    console.log(`✓ Retrieved ${result.rows.length} employees`);
    
    res.status(200).json({
      success: true,
      data: result.rows,
      message: `Retrieved ${result.rows.length} employees`
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Get all available branches
exports.getAllBranches = async (req, res) => {
  try {
    console.log('GET /api/roles/branches - Fetching all branches');
    
    const query = `
      SELECT companyid as id, companyname as name
      FROM companymaster
      ORDER BY companyname
    `;
    
    const result = await pool.query(query);
    console.log(`✓ Retrieved ${result.rows.length} branches`);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branches',
      error: error.message
    });
  }
};

// Update employee role and branch
exports.updateEmployeeRole = async (req, res) => {
  try {
    const { employeeid } = req.params;
    let { role_type, branchid } = req.body;

    // Validate inputs
    if (!role_type || !branchid) {
      return res.status(400).json({
        success: false,
        message: 'Role and Branch are required'
      });
    }

    // Validate role type (false = Employee, true = Admin)
    const isAdmin = role_type === 'Admin' || role_type === true;

    // Get current user ID from header (for audit trail)
    const userId = req.headers['x-user-id'] || null;

    // Update employee
    const updateQuery = `
      UPDATE employeemaster
      SET 
        role = $1,
        branchid = $2,
        updatedby = $3,
        updatedat = CURRENT_DATE
      WHERE employeeid = $4 AND deletedat IS NULL
      RETURNING employeeid, firstname, lastname, role, branchid, employeetype
    `;

    const result = await pool.query(updateQuery, [isAdmin, branchid, userId, employeeid]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Log the action
    const roleLabel = isAdmin ? 'Admin' : 'Employee';
    console.log(`Role updated: ${result.rows[0].firstname} ${result.rows[0].lastname} → ${roleLabel} (Branch: ${branchid})`);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: `Role updated successfully for ${result.rows[0].firstname} ${result.rows[0].lastname}`
    });
  } catch (error) {
    console.error('Error updating employee role:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee role',
      error: error.message
    });
  }
};

// Bulk update roles (assign multiple employees at once)
exports.bulkUpdateRoles = async (req, res) => {
  try {
    const { updates } = req.body; // Array of {employeeid, role_type, branchid, password?}

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and must not be empty'
      });
    }

    console.log(`[BulkUpdateRoles] Processing ${updates.length} updates:`, JSON.stringify(updates, null, 2));

    const userId = req.headers['x-user-id'] || null;
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each update
    for (const update of updates) {
      try {
        const { employeeid, role_type, branchid, password } = update;

        console.log(`[Update ${employeeid}] Validating - role: ${role_type}, branch: ${branchid}, hasPassword: ${!!password}`);

        // Validate
        if (!employeeid || !role_type || branchid === null || branchid === undefined) {
          errorCount++;
          const errorMsg = `Missing required fields: empId=${employeeid}, role=${role_type}, branch=${branchid}`;
          console.log(`[Update ${employeeid}] ✗ Validation failed:`, errorMsg);
          results.push({
            employeeid,
            success: false,
            error: errorMsg
          });
          continue;
        }

        const validRoles = ['Admin', 'Manager', 'Employee'];
        if (!validRoles.includes(role_type)) {
          errorCount++;
          results.push({
            employeeid,
            success: false,
            error: 'Invalid role type'
          });
          continue;
        }

        // Validate password if provided
        if (password && password.trim().length > 0 && password.trim().length < 6) {
          errorCount++;
          results.push({
            employeeid,
            success: false,
            error: 'Password must be at least 6 characters'
          });
          continue;
        }

        // Update employee role and branch
        const isAdmin = role_type === 'Admin' || role_type === true;
        const employeeUpdateQuery = `
          UPDATE employeemaster
          SET 
            role = $1,
            branchid = $2,
            updatedby = $3,
            updatedat = CURRENT_DATE
          WHERE employeeid = $4 AND deletedat IS NULL
          RETURNING employeeid, firstname, lastname, role, branchid, employeetype
        `;

        const empResult = await pool.query(employeeUpdateQuery, [isAdmin, branchid, userId, employeeid]);

        if (empResult.rows.length === 0) {
          errorCount++;
          console.log(`[Update ${employeeid}] ✗ Employee not found in database with deletedat IS NULL`);
          results.push({
            employeeid,
            success: false,
            error: 'Employee not found'
          });
          continue;
        }

        console.log(`[Update ${employeeid}] ✓ Employee role updated - ${empResult.rows[0].firstname} ${empResult.rows[0].lastname}`);

        // Update password if provided
        let passwordMsg = '';
        if (password && password.trim().length > 0) {
          try {
            const passwordHash = await bcrypt.hash(password, 10);

            // Update password using only stable columns to support schema differences across environments
            const passwordUpdateResult = await pool.query(
              `UPDATE employeecredentials
               SET passwordhash = $2
               WHERE employeeid = $1`,
              [employeeid, passwordHash]
            );

            // If credential row doesn't exist, create it
            if (passwordUpdateResult.rowCount === 0) {
              await pool.query(
                `INSERT INTO employeecredentials (employeeid, passwordhash)
                 VALUES ($1, $2)
                 ON CONFLICT (employeeid) DO UPDATE
                 SET passwordhash = EXCLUDED.passwordhash`,
                [employeeid, passwordHash]
              );
            }
            
            passwordMsg = ', Password: Updated';
          } catch (hashErr) {
            errorCount++;
            results.push({
              employeeid,
              success: false,
              error: `Error saving password: ${hashErr.message}`
            });
            continue;
          }
        }

        successCount++;
        console.log(`Employee ${empResult.rows[0].firstname} ${empResult.rows[0].lastname} updated - Role: ${role_type}, Branch: ${branchid}${passwordMsg}`);
        
        results.push({
          employeeid,
          success: true,
          data: empResult.rows[0]
        });

      } catch (e) {
        errorCount++;
        results.push({
          employeeid: update.employeeid,
          success: false,
          error: e.message
        });
      }
    }

    res.status(200).json({
      success: true,
      summary: {
        total: updates.length,
        successful: successCount,
        failed: errorCount
      },
      results: results,
      message: `Updated ${successCount} employees, ${errorCount} failed`
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk update',
      error: error.message
    });
  }
};
