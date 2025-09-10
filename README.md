# Invoice Parsing & Management System

A comprehensive invoice processing and management system that parses CSV invoice files, groups them by location, and provides a full-stack web application for managing invoices, payments, and client communications.

## 🚀 Features

### Standalone CSV Processor
- **Multi-file Processing**: Process multiple CSV invoice files simultaneously
- **Location Grouping**: Automatically groups invoices by location (Everett, Whittingham, McLain, Others)
- **Invoice Extraction**: Extracts invoice numbers and dates from CSV headers
- **Summary Calculations**: Adds subtotals and grand totals with 10% markup per invoice
- **Clean Output**: Generates organized CSV files for each location group

### Web Application
- **File Upload**: Drag-and-drop CSV file upload with processing
- **Invoice Management**: View, filter, search, and sort invoices
- **Payment Tracking**: Record payments and update invoice status
- **Email Integration**: Send professional invoices via email using branded templates
- **Dashboard**: Real-time statistics and overview
- **Responsive Design**: Modern UI with The Employers Choice branding

## 📁 Project Structure

```
Invoice Parsing/
├── process-invoices.js          # Standalone CSV processor
├── invoice_filter.js            # Original n8n workflow code
├── Sample_Invoice.html          # Email template with branding
├── Indeed_itemized_report_*.csv # Sample invoice data files
├── output/                      # Generated CSV files by location
├── webapp/                      # Full-stack web application
│   ├── server.js               # Express.js backend server
│   ├── package.json            # Backend dependencies
│   ├── env.example             # Environment variables template
│   ├── client/                 # React.js frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   │   ├── Dashboard.js
│   │   │   │   ├── InvoiceList.js
│   │   │   │   ├── InvoiceDetail.js
│   │   │   │   ├── UploadInvoices.js
│   │   │   │   ├── Navigation.js
│   │   │   │   └── InvoiceTemplate.js
│   │   │   ├── App.js
│   │   │   └── index.js
│   │   ├── package.json        # Frontend dependencies
│   │   ├── tailwind.config.js  # Tailwind CSS configuration
│   │   └── build/              # Production build
│   └── database.sqlite         # SQLite database
└── README.md                   # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Standalone CSV Processor

1. **Install dependencies:**
   ```bash
   npm install csv-parser csv-writer
   ```

2. **Run the processor:**
   ```bash
   node process-invoices.js <input-directory> [output-directory]
   ```
   
   **Examples:**
   ```bash
   # Process all CSV files in ./csv-files directory
   node process-invoices.js ./csv-files
   
   # Process files and output to custom directory
   node process-invoices.js ./csv-files ./output
   ```

### Web Application

1. **Install backend dependencies:**
   ```bash
   cd webapp
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Build the frontend:**
   ```bash
   cd client
   npm run build
   ```

5. **Start the server:**
   ```bash
   cd ..
   node server.js
   ```

6. **Access the application:**
   - Open your browser to `http://localhost:3001`
   - The application serves both API and frontend from the same port

## 📊 CSV File Format

The system expects CSV files with the following structure:

```csv
Invoice #USI25-03959467
Itemization details Jul 4, 2025

Company,Job Key,Reference Number,Job Title,Location,Quantity,Unit,Average Cost,Total
Company Name,Job123,REF456,Job Title,Everett,1,Hour,25.00,25.00
...
Total cost,100.00
Tax,8.00
Total amount,108.00
```

### Supported Locations
- **Everett**: Any location containing "everett"
- **Whittingham**: Any location containing "whittingham"  
- **McLain**: Any location containing "mclain"
- **Others**: All other locations

## 🔧 Configuration

### Environment Variables (.env)
```env
PORT=3001
DB_PATH=./database.sqlite
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CLIENT_URL=http://localhost:3000
```

### Email Configuration
The system uses Nodemailer for sending invoices. Configure your email provider in the `.env` file.

## 🎨 Branding

The application uses The Employers Choice brand colors and styling:
- **Primary Color**: #9D0035 (Brand Red)
- **Font**: Segoe UI
- **Logo**: Integrated from provided assets
- **Email Template**: Professional HTML template with company branding

## 📱 API Endpoints

### Authentication
- `GET /api/health` - Health check

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Invoices
- `GET /api/invoices` - List invoices with filtering/pagination
- `GET /api/invoices/:id` - Get single invoice details
- `PATCH /api/invoices/:id/status` - Update invoice status
- `POST /api/invoices/:id/payments` - Record payment
- `POST /api/invoices/:id/send` - Send invoice via email

### File Upload
- `POST /api/upload` - Upload and process CSV files

## 🚀 Usage Examples

### Process Multiple CSV Files
```bash
# Place your CSV files in a directory
mkdir csv-files
cp *.csv csv-files/

# Process all files
node process-invoices.js csv-files

# Check output
ls output/
# Everett_invoices.csv
# Whittingham_invoices.csv  
# McLain_invoices.csv
# Others_invoices.csv
```

### Web Application Workflow
1. **Upload**: Drag and drop CSV files to upload and process
2. **Review**: View processed invoices in the dashboard
3. **Manage**: Update invoice status, record payments
4. **Communicate**: Send professional invoices via email
5. **Track**: Monitor payment status and outstanding amounts

## 🛡️ Security Features

- File type validation (CSV only)
- File size limits
- SQL injection protection
- CORS configuration
- Environment variable protection

## 📈 Performance

- Efficient CSV parsing with streaming
- Database indexing for fast queries
- Pagination for large datasets
- Optimized React builds
- Static file serving

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed description
3. Include sample CSV files if reporting parsing issues

## 🔄 Version History

- **v1.0.0**: Initial release with standalone processor and web application
- **v1.1.0**: Added email integration and payment tracking
- **v1.2.0**: Implemented branded UI and responsive design

---

**Built for The Employers Choice** - Professional invoice management made simple.