# Invoice Parsing & Management System - Detailed Project Overview

## 🎯 Project Purpose

The **Invoice Parsing & Management System** is a comprehensive business solution designed for **The Employers Choice** to automate invoice processing, client management, and billing operations. The system processes CSV invoice files from Indeed job posting campaigns, intelligently groups them by business locations and clients, and provides a full-stack web application for managing invoices, payments, and client communications.

## 🏢 Business Context

This system serves **The Employers Choice**, a company that manages job posting campaigns across multiple business locations and clients. The system handles invoice data from Indeed (job posting platform) and organizes it by:

- **Business Divisions**: Everett, Whittingham, McLain, and Others
- **Client Assignments**: Automatic client matching based on location, job keys, and reference numbers
- **Geographic Coverage**: Multiple cities across Arkansas, Texas, Mississippi, Indiana, and Alabama

## 📁 Project Structure

```
Invoice Parsing/
├── process-invoices.js          # Standalone CSV processor (732 lines)
├── invoice_filter.js            # Original n8n workflow code (80 lines)
├── Sample_Invoice.html          # Email template with branding (333 lines)
├── Indeed_itemized_report_*.csv # Sample invoice data files
├── csv-files/                   # Input CSV files directory (23 files)
│   ├── Indeed_itemized_report_USI25-03713610.csv
│   ├── Indeed_itemized_report_USI25-03734075.csv
│   └── ... (21 more CSV files)
├── output/                      # Generated CSV files by location
│   ├── Everett_invoices.csv     # Everett business invoices
│   ├── McLain_invoices.csv      # McLain business invoices
│   ├── Others_invoices.csv      # Other business invoices
│   └── Whittingham_invoices.csv # Whittingham business invoices
├── webapp/                      # Full-stack web application
│   ├── server.js               # Express.js backend server (2179+ lines)
│   ├── package.json            # Backend dependencies
│   ├── env.example             # Environment variables template
│   ├── database.sqlite         # SQLite database
│   ├── favicon.ico             # Application favicon
│   ├── uploads/                # File upload directory
│   ├── temp_*/                 # Temporary processing directories
│   ├── README.md               # Webapp-specific documentation
│   └── client/                 # React.js frontend
│       ├── src/
│       │   ├── components/     # React components (9 components)
│       │   │   ├── Dashboard.js           # Statistics dashboard
│       │   │   ├── InvoiceList.js         # Invoice management (700+ lines)
│       │   │   ├── InvoiceDetail.js       # Individual invoice view (1200+ lines)
│       │   │   ├── UploadInvoices.js      # File upload interface
│       │   │   ├── CreateCustomInvoice.js # Manual invoice creation
│       │   │   ├── ClientManagement.js   # Client database management (700+ lines)
│       │   │   ├── BusinessManagement.js # Business configuration (300+ lines)
│       │   │   ├── InvoiceTemplate.js     # Email template component
│       │   │   └── Navigation.js         # App navigation
│       │   ├── App.js          # Main React application
│       │   ├── index.js        # React entry point
│       │   └── index.css       # Global styles with brand colors
│       ├── package.json        # Frontend dependencies
│       ├── tailwind.config.js  # Tailwind CSS configuration with brand colors
│       ├── postcss.config.js   # PostCSS configuration
│       ├── public/
│       │   ├── index.html      # HTML template
│       │   └── logo.svg       # Company logo
│       └── build/              # Production build
│           ├── index.html
│           ├── logo.svg
│           └── static/
│               ├── css/        # Compiled CSS
│               └── js/         # Compiled JavaScript
├── package.json                # Root project dependencies
├── package-lock.json          # Dependency lock file
├── .gitignore                 # Git ignore rules
├── README.md                  # Main project documentation
└── about.md                   # This detailed project overview
```

## 🏗️ System Architecture

### Dual-Mode Operation

The system operates in two complementary modes:

1. **Standalone CSV Processor** (`process-invoices.js`)
   - Command-line tool for batch processing
   - Processes multiple CSV files simultaneously
   - Generates organized output files by client
   - Integrates with SQLite database for client/ad data

2. **Full-Stack Web Application** (`webapp/`)
   - React.js frontend with modern UI
   - Express.js backend with REST API
   - SQLite database for data persistence
   - File upload and real-time processing capabilities

## 📊 Data Processing Pipeline

### Input Format
The system processes CSV files with the following structure:
```csv
Invoice #USI25-03959467
Itemization details Jul 26, 2025

Company,Job Key,Reference Number,Job Title,Location,Quantity,Unit,Average Cost,Total,Currency
"The Employers Choice","489c9ea2ce571217","4042257-168-1","Sales Associate","Dallas, TX","87","click","0.57","50.02","USD"
...
Total cost,1003.06
Tax,0.00
Total amount,1003.06
```

### Processing Logic

1. **Invoice Extraction**: Parses invoice numbers and dates from CSV headers
2. **Data Normalization**: Standardizes field names and formats numeric values
3. **Business Assignment**: Determines business division based on location:
   - **Everett**: Maumelle, Little Rock, Conway, Tyler, Southaven, Oxford, Fayetteville, Dallas, Searcy, Jonesboro, Rogers, Jacksonville
   - **Whittingham**: Indianapolis, Carmel, Evansville
   - **McLain**: Birmingham, Mobile, Huntsville
   - **Others**: All other locations

4. **Client Matching**: Advanced client assignment using:
   - Database-stored client information
   - Ad campaign data (job keys, reference numbers)
   - Location-based matching
   - Fallback to default business assignments

5. **Invoice Generation**: Creates new invoice numbers with client codes (e.g., `EVE-03713610`)

6. **Financial Calculations**: Adds subtotals and 10% markup per invoice

## 🗄️ Database Schema

### Core Tables

- **`invoices`**: Main invoice records with status tracking
- **`invoice_items`**: Individual line items from CSV files
- **`clients`**: Client information and business assignments
- **`ads`**: Ad campaign data for client matching
- **`businesses`**: Business division definitions
- **`payments`**: Payment tracking and history
- **`invoice_links`**: Parent-child invoice relationships for linking

### Key Relationships
- Clients belong to businesses (via UUID foreign keys)
- Ads are associated with clients
- Invoices contain multiple invoice items
- Payments are linked to invoices
- Invoices can be linked as parent-child relationships

## 🎨 Frontend Components

### React Application Structure
- **Dashboard**: Real-time statistics and overview
- **InvoiceList**: Comprehensive invoice management with filtering/sorting
- **InvoiceDetail**: Individual invoice view with payment tracking
- **UploadInvoices**: Drag-and-drop CSV file processing
- **CreateCustomInvoice**: Manual invoice creation
- **ClientManagement**: Client database management
- **BusinessManagement**: Business division configuration
- **Navigation**: Responsive navigation with branding

### UI/UX Features
- **Modern Design**: Tailwind CSS with custom branding
- **Responsive Layout**: Mobile-first design approach
- **Interactive Tables**: Sortable, filterable data grids
- **File Upload**: Drag-and-drop with progress indicators
- **Toast Notifications**: User feedback and error handling
- **Modal Dialogs**: Contextual actions and confirmations

### Brand Integration
- **Color Scheme**: Primary brand color #9D0035 (The Employers Choice red)
- **Typography**: Segoe UI font family throughout
- **Logo Integration**: Company logo in navigation and email templates
- **Custom Scrollbars**: Brand-colored scrollbars for consistency
- **Professional Styling**: Clean, business-appropriate design language

## 🔧 Technical Stack

### Backend Technologies
- **Node.js**: Runtime environment
- **Express.js**: Web framework with REST API endpoints
- **SQLite3**: Database engine with relational integrity
- **Multer**: File upload handling
- **Nodemailer**: Email functionality
- **CSV Parser/Writer**: Data processing
- **Moment.js**: Date/time handling
- **UUID**: Unique identifier generation for relationships

### Frontend Technologies
- **React 18**: UI framework
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **React Dropzone**: File upload interface
- **React Table**: Data table component
- **React Datepicker**: Date selection
- **React Modal**: Modal dialogs
- **React Toastify**: Notifications
- **Lucide React**: Icon library
- **Tailwind CSS**: Styling framework

### Development Tools
- **Nodemon**: Development server
- **React Scripts**: Build tooling
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixes

## 📧 Email Integration

### Professional Invoice Templates
- **Branded Design**: The Employers Choice styling with logo
- **HTML Format**: Professional layout with company colors (#9D0035)
- **Dynamic Content**: Populated with invoice data
- **Responsive**: Mobile-friendly email design

### Email Configuration
- **SMTP Support**: Configurable email providers
- **Environment Variables**: Secure credential management
- **Template Engine**: Dynamic content generation

## 🔒 Security Features

### Data Protection
- **File Type Validation**: CSV-only uploads
- **File Size Limits**: Configurable upload restrictions
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Cross-origin request handling
- **Content Security Policy**: XSS protection headers

### Environment Security
- **Environment Variables**: Sensitive data protection
- **Database Path Configuration**: Flexible storage options
- **Upload Directory Management**: Secure file handling

## 📈 Performance Optimizations

### Data Processing
- **Streaming CSV Parsing**: Memory-efficient file processing
- **Database Indexing**: Fast query performance
- **Pagination**: Large dataset handling
- **Batch Processing**: Multiple file handling

### Frontend Performance
- **React Optimization**: Component memoization
- **Build Optimization**: Production-ready bundles
- **Static File Serving**: Efficient asset delivery
- **Lazy Loading**: On-demand component loading

## 🚀 Deployment & Configuration

### Environment Variables
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

### Installation Process
1. **Dependencies**: npm install for both backend and frontend
2. **Database**: SQLite database auto-initialization
3. **Build**: React production build
4. **Server**: Express server with static file serving

## 📋 Business Logic Details

### Client Assignment Algorithm
1. **Database Lookup**: Check client database for business assignments
2. **Ad Matching**: Match job keys and reference numbers to ad campaigns
3. **Location Matching**: City-based client assignment
4. **Fallback Logic**: Default business-to-client mapping
5. **Special Cases**: Custom rules (e.g., Huntsville → Michael Phillips)

### Financial Calculations
- **Subtotal**: Sum of all line items per invoice
- **Markup**: 10% markup applied to subtotal
- **Grand Total**: Subtotal + markup
- **Currency**: USD formatting with proper decimal places

### Invoice Numbering
- **Original Format**: `USI25-03959467`
- **New Format**: `{CLIENT_CODE}-{CLEAN_NUMBER}`
- **Example**: `EVE-03713610` (Everett client)

## 🔄 Workflow Integration

### Standalone Processing
```bash
# Process all CSV files in directory
node process-invoices.js ./csv-files

# Custom output directory
node process-invoices.js ./csv-files ./output
```

### Web Application Workflow
1. **Upload**: Drag-and-drop CSV files
2. **Process**: Automatic parsing and client assignment
3. **Review**: Dashboard with statistics and invoice list
4. **Manage**: Update status, record payments
5. **Communicate**: Send professional invoices via email
6. **Track**: Monitor payment status and outstanding amounts

## 📊 Output Structure

### Generated Files
- **Client-Specific CSVs**: `{ClientName}_invoices.csv`
- **Summary Rows**: Subtotals and grand totals per invoice
- **Organized Data**: Grouped by client with proper formatting
- **Metadata**: Invoice numbers, dates, and client information

### Actual Data Processing Results
Based on the current dataset:
- **Input Files**: 23 CSV files in `csv-files/` directory
- **Output Files**: 4 organized CSV files by business division
  - `Everett_invoices.csv` - Contains invoices for Everett business locations
  - `McLain_invoices.csv` - Contains invoices for McLain business locations  
  - `Whittingham_invoices.csv` - Contains invoices for Whittingham business locations
  - `Others_invoices.csv` - Contains invoices for other business locations

### Database Records
- **Invoice Records**: Main invoice data with status
- **Item Records**: Individual line items from CSV
- **Payment Records**: Payment history and tracking
- **Client Records**: Client information and assignments

## 🎯 Use Cases

### Primary Use Cases
1. **Batch Processing**: Process multiple Indeed invoice CSVs
2. **Client Management**: Organize invoices by business clients
3. **Payment Tracking**: Monitor invoice status and payments
4. **Email Communication**: Send professional invoices to clients
5. **Reporting**: Generate financial summaries and statistics
6. **Invoice Linking**: Create parent-child relationships for merged invoices
7. **Automated Payment Processing**: Automatically mark linked invoices as paid when parent is paid

### Secondary Use Cases
1. **Custom Invoices**: Create manual invoices outside CSV processing
2. **Client Database**: Manage client information and assignments
3. **Business Configuration**: Configure business divisions and rules
4. **Data Export**: Export processed data for external systems
5. **Relationship Management**: Track invoice dependencies and hierarchies
6. **Bulk Payment Operations**: Pay one invoice and automatically update related invoices

## 🌐 Web Application Features

### Advanced Invoice Management
- **Bulk Operations**: Select multiple invoices for batch actions
- **Advanced Filtering**: Filter by status, client, date range, amount
- **Sorting Options**: Sort by date, amount, status, client name
- **Search Functionality**: Search across invoice numbers, client names, locations
- **Pagination**: Handle large datasets efficiently
- **Status Management**: Track pending, sent, paid, and overdue invoices
- **Invoice Linking**: Create parent-child relationships between invoices
- **Automatic Payment Propagation**: When parent invoices are paid, linked child invoices are automatically marked as paid

### Client & Business Management
- **Client Database**: Complete CRUD operations for client information
- **Ad Campaign Management**: Track job keys and reference numbers for client matching
- **Business Configuration**: Manage business divisions and their properties
- **Location Mapping**: Configure which cities belong to which business divisions
- **Contact Management**: Store client contact information and preferences

### File Processing Capabilities
- **Drag & Drop Upload**: Modern file upload interface with progress tracking
- **Multiple File Support**: Process multiple CSV files simultaneously
- **Real-time Processing**: Immediate feedback on upload and processing status
- **Error Handling**: Detailed error messages for failed uploads or processing
- **Temporary Storage**: Secure temporary file handling during processing

## 🆕 Recent Improvements & Features

### Business System Unification (Latest Update)
- **Unified Business Management**: Migrated from hardcoded business identifiers to dynamic business table
- **UUID-Based Relationships**: All business and client relationships now use proper UUID foreign keys
- **Data Migration**: Successfully migrated 109 existing invoices from old string-based system to new UUID system
- **Dynamic Business Selection**: Invoice editing now supports all businesses from the Business Management page
- **Consistent Data Model**: Eliminated disconnect between business management and invoice editing systems

### Invoice Linking System (Latest Feature)
- **Parent-Child Relationships**: Create hierarchical relationships between invoices
- **Automatic Payment Propagation**: When a parent invoice is marked as paid, all linked child invoices are automatically marked as paid
- **Visual Relationship Management**: Clear UI showing parent and child invoice relationships
- **Bulk Linking Operations**: Link multiple invoices to a parent invoice simultaneously
- **Relationship Navigation**: Easy navigation between linked invoices
- **Database Integrity**: Proper foreign key constraints and cascading deletes

### Code Quality Improvements
- **Removed Unused Fields**: Eliminated unused `location_group` field from invoice system
- **Clean Database Schema**: Streamlined invoice table structure
- **Updated Documentation**: Comprehensive documentation updates reflecting all changes
- **Error-Free Builds**: Resolved all compilation warnings and errors

## 🔮 Future Enhancements

### Potential Improvements
- **Multi-tenant Support**: Support for multiple companies
- **Advanced Reporting**: Detailed analytics and reporting
- **API Integration**: Third-party system integrations
- **Mobile App**: Native mobile application
- **Automated Payments**: Payment gateway integration
- **Document Management**: PDF generation and storage

## 📚 Documentation & Support

### Available Documentation
- **README.md**: Comprehensive setup and usage guide
- **API Documentation**: REST endpoint specifications
- **Component Documentation**: React component structure
- **Database Schema**: Table relationships and constraints

### Support Resources
- **Error Handling**: Comprehensive error messages and logging
- **Debug Information**: Detailed processing logs
- **Sample Data**: Example CSV files for testing
- **Configuration Examples**: Environment setup templates

---

**Built for The Employers Choice** - A comprehensive solution for modern invoice management and client billing operations.
