# Invoice Billing Webapp

A comprehensive web application for managing invoices, processing CSV files, and tracking payments.

## Features

- **CSV Upload & Processing**: Upload multiple CSV invoice files and automatically process them
- **Location Grouping**: Automatically groups invoices by location (Everett, Whittingham, McLain, Others)
- **Invoice Management**: View, filter, search, and sort invoices
- **Payment Tracking**: Record payments and track payment status
- **Email Integration**: Send invoices directly to clients via email
- **Dashboard**: Overview of invoice statistics and payment status
- **Responsive Design**: Modern, mobile-friendly interface

## Architecture

- **Frontend**: React with Tailwind CSS
- **Backend**: Node.js/Express API
- **Database**: SQLite (easy setup) or PostgreSQL
- **File Processing**: Custom invoice processing logic
- **Email**: Nodemailer for sending invoices

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone and setup the project**:
   ```bash
   cd webapp
   npm install
   ```

2. **Setup environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3001
   DB_PATH=./database.sqlite
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=your-email@gmail.com
   CLIENT_URL=http://localhost:3000
   ```

3. **Install client dependencies**:
   ```bash
   npm run install-client
   ```

4. **Start the development servers**:
   
   **Terminal 1 - Backend**:
   ```bash
   npm run dev
   ```
   
   **Terminal 2 - Frontend**:
   ```bash
   cd client
   npm start
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api

## Usage

### 1. Upload Invoices

1. Navigate to the "Upload" page
2. Drag and drop CSV files or click to select files
3. Click "Upload & Process" to process the files
4. Invoices are automatically grouped by location and saved to the database

### 2. Manage Invoices

1. Go to the "Invoices" page to view all invoices
2. Use filters to search by status, location, or invoice number
3. Sort by date, amount, or other criteria
4. Click on any invoice to view details

### 3. Track Payments

1. Open an invoice detail page
2. Click "Add Payment" to record a payment
3. Enter the payment amount and optional notes
4. The invoice status will automatically update when fully paid

### 4. Send Invoices

1. Open an invoice detail page
2. Click "Send Invoice" to email the invoice to a client
3. Enter the client's email and name
4. The invoice will be sent with a formatted HTML email

## API Endpoints

### Invoices
- `GET /api/invoices` - List invoices with filtering and pagination
- `GET /api/invoices/:id` - Get invoice details with items and payments
- `PATCH /api/invoices/:id/status` - Update invoice status
- `POST /api/invoices/:id/payments` - Add a payment
- `POST /api/invoices/:id/send` - Send invoice via email

### Upload
- `POST /api/upload` - Upload and process CSV files

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

## Database Schema

### Invoices Table
- `id` - Unique identifier
- `invoice_number` - Invoice number from CSV
- `invoice_date` - Invoice date
- `business` - Business identifier (UUID)
- `client_id` - Client identifier (UUID)
- `subtotal` - Invoice subtotal
- `grand_total` - Invoice total with 10% markup
- `status` - Invoice status (pending, sent, paid, overdue)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Invoice Items Table
- `id` - Unique identifier
- `invoice_id` - Foreign key to invoices
- `company` - Company name
- `job_key` - Job key
- `reference_number` - Reference number
- `job_title` - Job title
- `location` - Job location
- `quantity` - Quantity
- `unit` - Unit type
- `average_cost` - Average cost per unit
- `total` - Total cost

### Payments Table
- `id` - Unique identifier
- `invoice_id` - Foreign key to invoices
- `amount` - Payment amount
- `payment_date` - Payment date
- `notes` - Payment notes

### Clients Table
- `id` - Unique identifier
- `name` - Client name
- `email` - Client email
- `business` - Business identifier (UUID)
- `locations` - Client locations
- `phone` - Client phone number
- `address` - Client address
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Email Configuration

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" for this application
3. Use the app password in your `.env` file

### Other Email Providers
Update the email configuration in `.env`:
```env
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
EMAIL_FROM=your-email@domain.com
```

## Production Deployment

### Using PM2
```bash
npm install -g pm2
npm run build
pm2 start server.js --name "invoice-webapp"
```

### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Email not sending**: Check your email configuration and app password
2. **Database errors**: Ensure the database file is writable
3. **File upload issues**: Check file permissions and upload limits
4. **CORS errors**: Verify CLIENT_URL in your .env file

### Logs
Check the console output for detailed error messages and logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
