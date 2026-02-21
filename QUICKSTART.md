# Quick Start Guide

## Prerequisites
- Node.js and npm installed
- PostgreSQL installed and running
- Port 3000 (React) and 5000 (Node.js) available

## Step 1: Database Setup

1. Create database in PostgreSQL:
```bash
psql -U postgres
CREATE DATABASE Project1db;
```

2. Run schema to create tables:
```bash
psql -U postgres -d Project1db -f database/schema.sql
```

## Step 2: Backend Setup and Start

```bash
cd backend
npm install
npm start
```

Expected output: `Server running on port 5000`

## Step 3: Frontend Setup and Start (in another terminal)

```bash
cd frontend
npm install
npm start
```

This will automatically open your browser at `http://localhost:3000`

## Step 4: Test the Application

1. Navigate to "Company Master" tab
2. Fill in the form with company details
3. Click "Create Company"
4. See the company appear in the list below
5. Switch to "Customer Master" tab
6. Create a customer and link to the company
7. View, edit, or delete records

## Default Credentials Used in Code
- Database: Project1db
- User: postgres
- Password: admin
- Host: localhost
- Port: 5432

## Common Issues

**Issue: Cannot connect to database**
- Check PostgreSQL is running
- Verify credentials in backend/.env
- Ensure database exists

**Issue: Port already in use**
- Change port in backend/.env (SERVER_PORT)
- Change port in frontend package.json (change last digit of proxy URL)

**Issue: npm install fails**
- Delete node_modules folder
- Run: `npm install --legacy-peer-deps`

## API Testing with curl

```bash
# Create a company
curl -X POST http://localhost:5000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "CompanyName": "Test Corp",
    "AddressLine1": "123 Main St",
    "Country": "USA",
    "PhoneNumber1": "555-1234",
    "CreatedBy": 1,
    "CreatedAt": "2025-02-09"
  }'

# Get all companies
curl http://localhost:5000/api/companies

# Get specific company
curl http://localhost:5000/api/companies/1

# Get all customers
curl http://localhost:5000/api/customers
```

## Next Steps
- Customize styling in CSS files
- Add authentication
- Add validation rules
- Connect to additional data sources
- Deploy to cloud platform (Heroku, AWS, etc.)
