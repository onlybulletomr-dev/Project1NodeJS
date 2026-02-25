# Only Bullet - ERP System

This is a full-stack application built with **Node.js/Express** (backend) and **React.js** (frontend) for managing customer and company master data in PostgreSQL.

## Project Structure

```
Project1NodeJS/
├── backend/
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection configuration
│   ├── models/
│   │   ├── CompanyMaster.js      # Company data model
│   │   └── CustomerMaster.js     # Customer data model
│   ├── controllers/
│   │   ├── companyController.js  # Company business logic
│   │   └── customerController.js # Customer business logic
│   ├── routes/
│   │   ├── companyRoutes.js      # Company API routes
│   │   └── customerRoutes.js     # Customer API routes
│   ├── server.js                 # Express server entry point
│   ├── package.json              # Backend dependencies
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── public/
│   │   └── index.html            # HTML entry point
│   ├── src/
│   │   ├── components/
│   │   │   ├── CompanyMaster.js  # Company management component
│   │   │   └── CustomerMaster.js # Customer management component
│   │   ├── styles/
│   │   │   ├── CompanyMaster.css
│   │   │   └── CustomerMaster.css
│   │   ├── api.js                # API client
│   │   ├── App.js                # Main app component
│   │   ├── App.css               # App styles
│   │   ├── index.js              # React entry point
│   │   └── index.css             # Global styles
│   └── package.json              # Frontend dependencies
│
└── database/
    └── schema.sql                # Database schema SQL
```

## Database Setup

### Prerequisites
- PostgreSQL installed and running
- Database `Project1db` created
- User: `postgres`, Password: `admin`

### Create Database and Tables

1. Open PostgreSQL and run:
```sql
CREATE DATABASE Project1db;
```

2. Connect to the database and run the SQL schema from `database/schema.sql`

Or use the command line:
```bash
psql -U postgres -d Project1db -f database/schema.sql
```

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
The `.env` file is already configured with:
```
DB_USER=postgres
DB_PASSWORD=admin
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Project1db
SERVER_PORT=5000
NODE_ENV=development
```

Modify if needed based on your PostgreSQL setup.

### 3. Start Backend Server
```bash
npm start
```

The backend will run on `http://localhost:5000`

For development with auto-reload:
```bash
npm run dev
```

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm start
```

The frontend will open at `http://localhost:3000`

## API Endpoints

### Company Master Endpoints
- `POST /api/companies` - Create company
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company (soft delete)

### Customer Master Endpoints
- `POST /api/customers` - Create customer
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer (soft delete)
- `GET /api/customers/branch/:branchId` - Get customers by branch

## Features

### Company Management
- Create new companies with complete details
- Update company information
- Soft delete companies (data preserved in database)
- Support for parent-child company relationships
- Bank account and location information storage

### Customer Management
- Create and manage customer profiles
- Link customers to company branches
- Track loyalty points
- Manage marketing consent
- Support for multiple phone numbers
- Contact and personal information

### User Interface
- Responsive web design
- Intuitive forms with validation
- Data table listings with edit/delete actions
- Error handling and user feedback
- Navigation between modules

## Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **pg** - PostgreSQL driver for Node.js
- **dotenv** - Environment variable management
- **CORS** - Cross-Origin Resource Sharing

### Frontend
- **React.js** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client for API calls
- **CSS3** - Styling

### Database
- **PostgreSQL** - Relational database

## Key Features

1. **RESTful API** - Standard REST endpoints for CRUD operations
2. **Soft Delete** - Data is marked as deleted, not physically removed
3. **Audit Trail** - Tracks who created/updated/deleted records and when
4. **Validation** - Client and server-side validation
5. **Error Handling** - Comprehensive error management
6. **Responsive UI** - Works on desktop and mobile devices

## Running the Application

### Option 1: Separate Terminals
**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Database Migrations
To reset the database with fresh tables:
```bash
psql -U postgres -d Project1db -f database/schema.sql
```

## Notes

- Both backend and frontend must be running for the application to work
- PostgreSQL must be running and accessible
- The frontend proxy is configured to connect to `http://localhost:5000` (backend)
- Soft delete is implemented - deleted records remain in DB with DeletedAt timestamp
- All timestamps are stored as DATE format (YYYY-MM-DD)

## Troubleshooting

### Backend won't connect to database
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database `Project1db` exists
- Check if port 5432 is available

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check CORS configuration in server.js
- Verify proxy setting in frontend package.json

### Dependencies installation issues
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again
- Try `npm install --legacy-peer-deps` if issues persist

## Future Enhancements
- Authentication and authorization
- Role-based access control
- Advanced filtering and search
- Export to Excel/PDF
- Multi-language support
- Mobile app version
