const express = require('express');
const router = express.Router();
const ServiceMaster = require('../models/ServiceMaster');

// Search services by name or description
router.get('/services/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }
    const services = await ServiceMaster.searchByServiceName(q);
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Error searching services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all services
router.get('/services', async (req, res) => {
  try {
    const services = await ServiceMaster.getAll();
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get service by ID
router.get('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await ServiceMaster.getById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.status(200).json({ success: true, data: service });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Combined search for items and services
router.get('/items-services/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    const ItemMaster = require('../models/ItemMaster');
    
    const [items, services] = await Promise.all([
      ItemMaster.searchByPartNumber(q),
      ServiceMaster.searchByServiceName(q)
    ]);

    // Add source field to distinguish between items and services
    const enrichedItems = items.map(item => ({
      ...item,
      source: 'item',
      displayName: item.partnumber,
      displayDesc: item.itemname,
      displayAmount: item.mrp
    }));

    const enrichedServices = services.map(service => ({
      ...service,
      source: 'service',
      displayName: service.serviceid,
      displayDesc: service.servicename,
      displayAmount: service.defaultrate
    }));

    const combined = [...enrichedItems, ...enrichedServices];
    res.status(200).json({ success: true, data: combined });
  } catch (error) {
    console.error('Error searching items and services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
