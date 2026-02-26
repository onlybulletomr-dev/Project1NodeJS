const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Get user details from database
async function getUserDetails(userId) {
  try {
    const query = `
      SELECT 
        ur.UserId,
        em.FirstName,
        em.LastName,
        em.EmployeeId,
        ubm.BranchId,
        rm.RoleName
      FROM UserRoles ur
      JOIN EmployeeMaster em ON ur.UserId = em.EmployeeId
      JOIN UserBranchMap ubm ON ur.UserId = ubm.UserId
      JOIN RoleMaster rm ON ur.RoleId = rm.RoleId
      WHERE ur.UserId = $1 AND ubm.IsDefault = TRUE AND ur.DeletedAt IS NULL AND ur.IsActive = TRUE
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Fallback for environments where UserRoles/UserBranchMap data is not seeded
    const fallbackQuery = `
      SELECT
        em.employeeid as userid,
        em.firstname,
        em.lastname,
        em.employeeid,
        em.branchid,
        'Employee'::text as rolename
      FROM employeemaster em
      WHERE em.employeeid = $1
        AND em.deletedat IS NULL
      LIMIT 1
    `;

    const fallbackResult = await pool.query(fallbackQuery, [userId]);
    return fallbackResult.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
}

// Middleware to check user branch access
async function branchAccessMiddleware(req, res, next) {
  try {
    // Get userId from header, query param, or body
    const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User ID required',
        message: 'Please pass userId in header (x-user-id) or query parameter'
      });
    }

    const userDetails = await getUserDetails(userId);
    
    if (!userDetails) {
      return res.status(403).json({ 
        error: 'User or branch access not found',
        message: 'User not found or not assigned to any branch'
      });
    }

    // Attach user details to request object
    req.user = {
      userId: userDetails.userid,
      employeeId: userDetails.employeeid,
      firstName: userDetails.firstname,
      lastName: userDetails.lastname,
      branchId: userDetails.branchid,
      role: userDetails.rolename
    };

    console.log(`[${new Date().toISOString()}] User: ${userDetails.firstname} ${userDetails.lastname} (ID: ${userId}) - Branch: ${userDetails.branchid}`);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Verify user has permission for a specific action on a module
async function checkModulePermission(userId, moduleName, action) {
  try {
    const query = `
      SELECT 
        CASE 
          WHEN $3 = 'READ' THEN rp.CanRead
          WHEN $3 = 'CREATE' THEN rp.CanCreate
          WHEN $3 = 'UPDATE' THEN rp.CanUpdate
          WHEN $3 = 'DELETE' THEN rp.CanDelete
          WHEN $3 = 'EXPORT' THEN rp.CanExport
          ELSE FALSE
        END as HasPermission
      FROM UserRoles ur
      JOIN RolePermissions rp ON ur.RoleId = rp.RoleId
      JOIN ModuleMaster mm ON rp.ModuleId = mm.ModuleId
      WHERE ur.UserId = $1 AND mm.ModuleName = $2 AND ur.DeletedAt IS NULL AND rp.DeletedAt IS NULL
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId, moduleName, action.toUpperCase()]);
    return result.rows.length > 0 && result.rows[0].haspermission;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Middleware factory to check specific permissions
function requirePermission(moduleName, action) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const hasPermission = await checkModulePermission(userId, moduleName, action);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `You do not have permission to ${action.toLowerCase()} ${moduleName}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission verification failed' });
    }
  };
}

module.exports = { 
  branchAccessMiddleware, 
  getUserDetails, 
  checkModulePermission,
  requirePermission 
};
