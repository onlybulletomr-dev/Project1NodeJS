const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Login with username and password
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    console.log(`[AUTH] Login attempt - username: ${username}`);

    // Query to find employee by FirstName or LastName (username)
    const query = `
      SELECT EmployeeID, FirstName, LastName, BranchId
      FROM EmployeeMaster
      WHERE (FirstName ILIKE $1 OR LastName ILIKE $1)
      AND DeletedAt IS NULL
      LIMIT 1;
    `;

    const result = await pool.query(query, [username]);
    console.log(`[AUTH] Employee lookup result:`, result.rows);

    if (result.rows.length === 0) {
      console.log(`[AUTH] No employee found with username: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const employee = result.rows[0];
    const employeeId = employee.employeeid;
    console.log(`[AUTH] Found employee: ${employee.firstname} (ID: ${employeeId})`);

    // Get password hash from EmployeeCredentials table
    const credQuery = `
      SELECT passwordhash FROM employeecredentials
      WHERE employeeid = $1
    `;

    let credResult;
    try {
      credResult = await pool.query(credQuery, [employeeId]);
      console.log(`[AUTH] Credential lookup result - rows count:`, credResult.rows.length);
    } catch (tableError) {
      console.error(`[AUTH] Error querying credentials table:`, tableError.message);
      // If table doesn't exist or there's an issue, return a helpful error
      return res.status(500).json({
        success: false,
        message: 'Authentication system not initialized. Please contact administrator.',
        error: 'Credentials table error: ' + tableError.message
      });
    }

    if (credResult.rows.length === 0) {
      console.log(`[AUTH] No password hash found for employee ID: ${employeeId}`);
      // Try to create a default credential if it doesn't exist
      try {
        console.log(`[AUTH] Attempting to create default credential for employee ${employeeId}`);
        const defaultPassword = 'Default@123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        const insertQuery = `
          INSERT INTO employeecredentials (employeeid, passwordhash)
          VALUES ($1, $2)
          ON CONFLICT (employeeid) DO NOTHING;
        `;
        
        await pool.query(insertQuery, [employeeId, hashedPassword]);
        console.log(`[AUTH] ✓ Created default credential for employee ${employeeId}`);
        
        return res.status(401).json({
          success: false,
          message: 'Credentials created. Please try logging in again with password: Default@123'
        });
      } catch (insertError) {
        console.error(`[AUTH] Failed to create default credential:`, insertError.message);
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password',
        });
      }
    }

    const passwordHash = credResult.rows[0].passwordhash;

    // Compare provided password with stored hash using bcrypt
    let passwordMatch;
    try {
      passwordMatch = await bcrypt.compare(password, passwordHash);
      console.log(`[AUTH] Password match result:`, passwordMatch);
    } catch (bcryptError) {
      console.error(`[AUTH] Bcrypt comparison error:`, bcryptError.message);
      return res.status(500).json({
        success: false,
        message: 'Error during password verification',
        error: bcryptError.message
      });
    }

    if (!passwordMatch) {
      console.log(`[AUTH] Password mismatch for employee: ${employee.firstname}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Get branch name from CompanyMaster
    const branchQuery = `
      SELECT CompanyName FROM CompanyMaster
      WHERE CompanyID = $1
    `;
    
    console.log(`[AUTH] Querying branch - branchid: ${employee.branchid}`);
    let branchResult;
    try {
      branchResult = await pool.query(branchQuery, [employee.branchid]);
      console.log('[AUTH] Branch query result:', branchResult.rows);
    } catch (branchError) {
      console.error(`[AUTH] Error querying branch:`, branchError.message);
      branchResult = { rows: [] };
    }
    
    // PostgreSQL returns lowercase column names
    const branchName = branchResult.rows.length > 0 
      ? branchResult.rows[0].companyname || branchResult.rows[0].CompanyName || 'Unknown Branch'
      : 'Unknown Branch';

    // Login successful - PostgreSQL returns lowercase column names
    const firstName = employee.firstname || '';
    
    console.log(`✓ [AUTH] Login successful for ${firstName} from ${branchName} (ID: ${employeeId})`);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      userId: employee.employeeid,
      userName: firstName,
      branchName: branchName,
      branchId: employee.branchid,
    });

  } catch (error) {
    console.error('[AUTH] Login error:', error);
    console.error('[AUTH] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message,
    });
  }
};

// Forgot Password - Request password reset via Mobile OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { phoneNumber, employeeId } = req.body;

    if (!phoneNumber && !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or Employee ID is required',
      });
    }

    let query, queryParams;
    if (phoneNumber) {
      // Clean phone number (remove spaces, +91, etc)
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
      query = `
        SELECT employeeid, firstname, lastname, mobilenumber1
        FROM employeemaster
        WHERE mobilenumber1 ILIKE $1 AND deletedat IS NULL
        LIMIT 1;
      `;
      queryParams = [`%${cleanPhone}%`];
    } else {
      query = `
        SELECT employeeid, firstname, lastname, mobilenumber1
        FROM employeemaster
        WHERE employeeid = $1 AND deletedat IS NULL
        LIMIT 1;
      `;
      queryParams = [employeeId];
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with provided details',
      });
    }

    const employee = result.rows[0];

    // Generate OTP (6-digit random number)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Log OTP for demo purposes (In production, integrate with SMS service)
    console.log(`========================================`);
    console.log(`DEMO OTP for ${employee.firstname} ${employee.lastname}`);
    console.log(`Mobile: ${employee.mobilenumber1}`);
    console.log(`OTP: ${otp}`);
    console.log(`========================================`);

    // In production, integrate with SMS provider like Twilio, AWS SNS, etc.
    // Example: await sendSMS(employee.mobilenumber1, `Your Only Bullet ERP password reset OTP is: ${otp}`);

    // Store OTP temporarily (In production, use Redis or cache with expiry)
    // For demo, we'll return success and show OTP in console
    
    res.status(200).json({
      success: true,
      message: 'OTP sent to registered mobile number',
      demoOTP: otp, // Remove in production
      employeeId: employee.employeeid,
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request',
      error: error.message,
    });
  }
};

// Verify OTP and generate reset token
exports.verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, employeeId, otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required',
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format. Must be 6 digits.',
      });
    }

    // In production, validate OTP against stored OTP
    // For demo, accept any valid 6-digit OTP
    
    let query;
    let queryParams;
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
      query = `SELECT employeeid FROM employeemaster WHERE mobilenumber1 ILIKE $1 AND deletedat IS NULL LIMIT 1`;
      queryParams = [`%${cleanPhone}%`];
    } else {
      query = `SELECT employeeid FROM employeemaster WHERE employeeid = $1 AND deletedat IS NULL LIMIT 1`;
      queryParams = [employeeId];
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const userId = result.rows[0].employeeid;

    // Generate reset token (JWT or simple token)
    const resetToken = Buffer.from(`${userId}:${Date.now()}`).toString('base64');

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetToken,
      userId: userId,
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message,
    });
  }
};

// Reset Password using token
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
      });
    }

    // Decode reset token
    try {
      const decoded = Buffer.from(resetToken, 'base64').toString();
      const [userId] = decoded.split(':');

      // Update password in database
      // Note: In production, hash the password with bcrypt before storing
      const updateQuery = `
        UPDATE EmployeeMaster
        SET Password = $1, UpdatedAt = NOW(), UpdatedBy = $2
        WHERE EmployeeID = $3
        RETURNING EmployeeID;
      `;

      const result = await pool.query(updateQuery, [newPassword, userId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });

    } catch (decodeError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token',
      });
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message,
    });
  }
};

// Set Password for new employees (using setup token)
exports.setPassword = async (req, res) => {
  try {
    const { setupToken, newPassword } = req.body;

    if (!setupToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Setup token and password are required',
      });
    }

    // Decode setup token
    try {
      const decoded = Buffer.from(setupToken, 'base64').toString();
      const [userId] = decoded.split(':');

      // Update password in database
      // Note: In production, hash the password with bcrypt before storing
      const updateQuery = `
        UPDATE EmployeeMaster
        SET Password = $1, UpdatedAt = NOW(), UpdatedBy = $2
        WHERE EmployeeID = $3
        RETURNING EmployeeID;
      `;

      const result = await pool.query(updateQuery, [newPassword, userId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Password set successfully',
      });

    } catch (decodeError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid setup token',
      });
    }

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting password',
      error: error.message,
    });
  }
};

// Get Employee Info using setup token
exports.getEmployeeInfo = async (req, res) => {
  try {
    const setupToken = req.headers['x-setup-token'];

    if (!setupToken) {
      return res.status(400).json({
        success: false,
        message: 'Setup token is required',
      });
    }

    // Decode setup token
    try {
      const decoded = Buffer.from(setupToken, 'base64').toString();
      const [userId] = decoded.split(':');

      const query = `
        SELECT EmployeeID, FirstName, LastName, Email, Department, BranchId
        FROM EmployeeMaster
        WHERE EmployeeID = $1 AND DeletedAt IS NULL
        LIMIT 1;
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
      }

      const employee = result.rows[0];

      res.status(200).json({
        success: true,
        employee: {
          employeeid: employee.employeeid,
          firstname: employee.firstname || '',
          lastname: employee.lastname || '',
          email: employee.email || '',
          department: employee.department || '',
          branchid: employee.branchid || '',
        },
      });

    } catch (decodeError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid setup token',
      });
    }

  } catch (error) {
    console.error('Get employee info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee information',
      error: error.message,
    });
  }
};

// Validate user session
exports.validate = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check if employee exists and is not deleted
    const query = `
      SELECT EmployeeId
      FROM EmployeeMaster
      WHERE EmployeeId = $1
      AND DeletedAt IS NULL
      LIMIT 1;
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or deleted user',
      });
    }

    // Session is valid
    res.status(200).json({
      success: true,
      message: 'Session is valid',
      userId: userId,
    });

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating session',
      error: error.message,
    });
  }
};

// Get current user info
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const query = `
      SELECT EmployeeId, FirstName, LastName, BranchId
      FROM EmployeeMaster
      WHERE EmployeeId = $1
      AND DeletedAt IS NULL
      LIMIT 1;
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const employee = result.rows[0];
    const firstName = employee.firstname || '';
    const lastName = employee.lastname || '';
    const userName = `${firstName} ${lastName}`.trim();

    res.status(200).json({
      success: true,
      data: {
        userId: employee.employeeid,
        userName: userName,
        branchId: employee.branchid,
      },
    });

  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user info',
      error: error.message,
    });
  }
};
