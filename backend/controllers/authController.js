const pool = require('../config/db');

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

    // Query to find employee by FirstName or LastName (username)
    const query = `
      SELECT EmployeeID, FirstName, LastName, BranchId
      FROM EmployeeMaster
      WHERE (FirstName ILIKE $1 OR LastName ILIKE $1)
      AND DeletedAt IS NULL
      LIMIT 1;
    `;

    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const employee = result.rows[0];

    // For now, we accept any password for demo purposes
    // In production, implement proper password hashing with bcrypt
    // Example: const passwordMatch = await bcrypt.compare(password, employee.password_hash);
    if (!password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Login successful - PostgreSQL returns lowercase column names
    const firstName = employee.firstname || '';
    const lastName = employee.lastname || '';
    const userName = `${firstName} ${lastName}`.trim();
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      userId: employee.employeeid,
      userName: userName,
      branchId: employee.branchid,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
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
