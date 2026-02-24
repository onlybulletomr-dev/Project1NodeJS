#!/usr/bin/env node

/**
 * Quick test script to verify backend API responses
 * Run: node testAPIs.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAPIs() {
  console.log('Testing Backend APIs...\n');

  // Test 1: Get all vehicles
  console.log('1. Testing GET /vehicle-details');
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicle-details`);
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('Number of vehicles:', response.data?.data?.length || 0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Test 2: Get all customers
  console.log('2. Testing GET /customers');
  try {
    const response = await axios.get(`${API_BASE_URL}/customers`);
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('Number of customers:', response.data?.data?.length || 0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Test 3: Get all items
  console.log('3. Testing GET /items');
  try {
    const response = await axios.get(`${API_BASE_URL}/items`);
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('Number of items:', response.data?.data?.length || 0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Test 4: Search items and services
  console.log('4. Testing GET /items-services/search?q=test');
  try {
    const response = await axios.get(`${API_BASE_URL}/items-services/search`, {
      params: { q: 'test' }
    });
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('Number of results:', response.data?.data?.length || 0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Test 5: Get payment summary
  console.log('5. Testing GET /payments/summary with x-user-id header');
  try {
    const response = await axios.get(`${API_BASE_URL}/payments/summary`, {
      headers: {
        'x-user-id': '1'
      }
    });
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPIs();
