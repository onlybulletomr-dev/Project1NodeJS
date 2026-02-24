const EmployeeMaster = require('../models/EmployeeMaster');

exports.searchEmployees = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const employees = await EmployeeMaster.searchByName(q);
    res.json(employees);
  } catch (err) {
    console.error('Error searching employees:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
