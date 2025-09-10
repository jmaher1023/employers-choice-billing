const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
require('dotenv').config();

// Import our invoice processor
const InvoiceProcessor = require('../process-invoices.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Database setup
const dbPath = process.env.DB_PATH || './database.sqlite';
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Invoices table
  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date TEXT NOT NULL,
    location_group TEXT NOT NULL,
    subtotal REAL NOT NULL,
    grand_total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Invoice items table
  db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    company TEXT,
    job_key TEXT,
    reference_number TEXT,
    job_title TEXT,
    location TEXT,
    quantity INTEGER,
    unit TEXT,
    average_cost REAL,
    total REAL,
    FOREIGN KEY (invoice_id) REFERENCES invoices (id)
  )`);

  // Clients table
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    location_group TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Payments table
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices (id)
  )`);
});

// Email transporter setup
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Upload and process CSV files
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    
    for (const file of req.files) {
      // Process the CSV file using our existing logic
      const processor = new InvoiceProcessor();
      const tempDir = `./temp_${Date.now()}`;
      
      // Create temp directory and move file
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, file.originalname);
      fs.copyFileSync(file.path, tempFilePath);
      
      // Process the file
      await processor.process(tempDir, `./temp_output_${Date.now()}`);
      
      // Clean up temp files
      fs.unlinkSync(file.path);
      fs.unlinkSync(tempFilePath);
      fs.rmdirSync(tempDir);
      
      // Get the processed data
      const processedData = processor.groupedData;
      
      // Save to database
      for (const [groupKey, records] of Object.entries(processedData)) {
        if (records.length === 0) continue;
        
        // Group by invoice number
        const invoiceGroups = {};
        for (const record of records) {
          const invoiceNum = record.invoice_number;
          if (!invoiceGroups[invoiceNum]) {
            invoiceGroups[invoiceNum] = [];
          }
          invoiceGroups[invoiceNum].push(record);
        }
        
        // Save each invoice
        for (const [invoiceNum, invoiceRecords] of Object.entries(invoiceGroups)) {
          const invoiceId = uuidv4();
          const subtotal = invoiceRecords.reduce((sum, record) => sum + (parseFloat(record.total) || 0), 0);
          const grandTotal = subtotal * 1.10;
          
          // Insert invoice
          db.run(
            `INSERT INTO invoices (id, invoice_number, invoice_date, location_group, subtotal, grand_total) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [invoiceId, invoiceNum, invoiceRecords[0].invoice_date, groupKey, subtotal, grandTotal]
          );
          
          // Insert invoice items
          for (const record of invoiceRecords) {
            const itemId = uuidv4();
            db.run(
              `INSERT INTO invoice_items (id, invoice_id, company, job_key, reference_number, job_title, location, quantity, unit, average_cost, total) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [itemId, invoiceId, record.company, record.job_key, record.reference_number, record.job_title, record.location, record.quantity, record.unit, record.average_cost, record.total]
            );
          }
        }
      }
      
      results.push({
        filename: file.originalname,
        status: 'processed',
        message: 'File processed successfully'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Files processed successfully',
      results: results
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process files', details: error.message });
  }
});

// Get all invoices with filtering and pagination
app.get('/api/invoices', (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    location_group, 
    search, 
    sort_by = 'created_at', 
    sort_order = 'DESC' 
  } = req.query;
  
  let query = `
    SELECT i.*, 
           COUNT(p.id) as payment_count,
           COALESCE(SUM(p.amount), 0) as paid_amount
    FROM invoices i
    LEFT JOIN payments p ON i.id = p.invoice_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }
  
  if (location_group) {
    conditions.push('i.location_group = ?');
    params.push(location_group);
  }
  
  if (search) {
    conditions.push('(i.invoice_number LIKE ? OR i.invoice_date LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ` GROUP BY i.id ORDER BY i.${sort_by} ${sort_order}`;
  
  const offset = (page - 1) * limit;
  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM invoices i';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    db.get(countQuery, params.slice(0, -2), (err, countResult) => {
      if (err) {
        console.error('Count error:', err);
        return res.status(500).json({ error: 'Count error' });
      }
      
      res.json({
        invoices: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get single invoice with items
app.get('/api/invoices/:id', (req, res) => {
  const invoiceId = req.params.id;
  
  // Get invoice details
  db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId], (err, invoice) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get invoice items
    db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId], (err, items) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get payments
      db.all('SELECT * FROM payments WHERE invoice_id = ?', [invoiceId], (err, payments) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({
          invoice,
          items,
          payments
        });
      });
    });
  });
});

// Update invoice status
app.patch('/api/invoices/:id/status', (req, res) => {
  const invoiceId = req.params.id;
  const { status } = req.body;
  
  if (!['pending', 'sent', 'paid', 'overdue'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  db.run(
    'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, invoiceId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json({ success: true, message: 'Status updated successfully' });
    }
  );
});

// Add payment
app.post('/api/invoices/:id/payments', (req, res) => {
  const invoiceId = req.params.id;
  const { amount, notes } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid payment amount' });
  }
  
  const paymentId = uuidv4();
  
  db.run(
    'INSERT INTO payments (id, invoice_id, amount, notes) VALUES (?, ?, ?, ?)',
    [paymentId, invoiceId, amount, notes || ''],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Check if invoice is fully paid
      db.get(
        'SELECT grand_total FROM invoices WHERE id = ?',
        [invoiceId],
        (err, invoice) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          db.get(
            'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ?',
            [invoiceId],
            (err, paymentSum) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              
              // Update invoice status if fully paid
              if (paymentSum.total_paid >= invoice.grand_total) {
                db.run(
                  'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                  ['paid', invoiceId]
                );
              }
              
              res.json({ 
                success: true, 
                message: 'Payment recorded successfully',
                payment_id: paymentId
              });
            }
          );
        }
      );
    }
  );
});

// Send invoice via email
app.post('/api/invoices/:id/send', async (req, res) => {
  const invoiceId = req.params.id;
  const { client_email, client_name } = req.body;
  
  if (!client_email) {
    return res.status(400).json({ error: 'Client email is required' });
  }
  
  try {
    // Get invoice details
    db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId], async (err, invoice) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Get invoice items
      db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId], async (err, items) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Create professional email content using the invoice template
        const formatCurrency = (amount) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(amount);
        };

        const formatDate = (dateString) => {
          return new Date(dateString).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          });
        };

        const getDateRange = () => {
          if (!items || items.length === 0) return formatDate(invoice.invoice_date);
          
          const dates = items.map(item => new Date(item.created_at || invoice.created_at));
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          
          return `${formatDate(minDate)} to ${formatDate(maxDate)}`;
        };

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8" />
            <title>Invoice - ${client_name || 'The Clint McLain Agencies'}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #f6f8fa;
                color: #222;
                margin: 0;
                padding: 20px;
              }
              .invoice {
                max-width: 1000px;
                background: #fff;
                margin: 0 auto;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.08);
              }
              .header {
                margin-bottom: 2rem;
                text-align: left;
                font-size: 0.8rem;
              }
              .header img {
                height: 60px;
                width: auto;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                background: #fff;
                object-fit: contain;
                max-width: 110px;
                text-align: center;
              }
              .header .issuer {
                font-size: 1.6rem;
                font-weight: bold;
                color: #9D0035;
              }
              .header .info {
                font-size: 0.55rem;
              }
              h1 {
                font-size: 1.15rem;
                color: #444;
                font-weight: 400;
                margin: 0.25rem 0 0.25rem 0;
              }
              h2 {
                font-size: 0.9rem;
                color: #444;
                font-weight: 400;
                margin: 0;
              }
              h3 {
                font-size: 0.8rem;
                color: #444;
                font-weight: 600;
                margin: 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 2rem;
              }
              th, td {
                padding: 0.4rem 0.6rem;
                border-bottom: 1px solid #e6e6e6;
              }
              th {
                background: #9d003529;
                font-size: 0.7rem;
                color: #9D0035;
                text-transform: uppercase;
              }
              td {
                font-size: 0.65rem;
                text-align: center;
              }
              tbody tr:nth-child(even) {
                background: #f9fafb;
              }
              tfoot td {
                font-weight: bold;
                font-size: 0.8rem;
                text-align: right;
                background: #f6f8fa;
                border-top: 2px solid #9D0035;
              }
              .right { 
                text-align: right; 
              }
              .notes {
                font-size: 0.65rem;
                text-align: left;
                border: 1px solid #e6e6e6;
                border-radius: 5px;
                padding: 1rem;
                margin-top: 1.5rem;
              }
              footer {
                text-align: left;
                color: #888;
                font-size: 0.75rem;
                margin-top: 2rem;
              }
            </style>
          </head>
          <body>
            <div class="invoice">
              <div class="header">
                <img src="https://storage.googleapis.com/msgsndr/XPERMRtQgB8C0tBynt4n/media/68af58b65ee8e01f49daf830.svg" alt="The Employers Choice Logo" />
                <div class="issuer">The Employers Choice</div>
                <div class="info">
                  <p>
                    650 Edgewood Dr. Maumelle, AR 72113<br>
                    Phone: (501) 851-4111<br>
                    Email: theemployerschoice@yahoo.com<br>
                  </p>
                </div>
                <h1>Invoice — ${client_name || 'The Clint McLain Agencies'}</h1>
                <h2>Invoice Date: ${getDateRange()}</h2>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Reference #</th>
                    <th>Job Title</th>
                    <th>Location</th>
                    <th>Billing Date</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Avg. Cost</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, index) => `
                    <tr>
                      <td>${item.reference_number}</td>
                      <td>${item.job_title}</td>
                      <td>${item.location}</td>
                      <td>${formatDate(invoice.invoice_date)}</td>
                      <td style="text-align:right;">${item.quantity}</td>
                      <td>${item.unit}</td>
                      <td style="text-align:right;">${formatCurrency(item.average_cost)}</td>
                      <td style="text-align:right;">${formatCurrency(item.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="7" class="right">Subtotal</td>
                    <td class="right">${formatCurrency(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colspan="7" class="right">Billing Fee (10%)</td>
                    <td class="right">${formatCurrency(invoice.grand_total - invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colspan="7" class="right">Grand Total</td>
                    <td class="right">${formatCurrency(invoice.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
              <div class="notes">
                <h3>Notes:</h3><br>
                <p>Combined billing from ${getDateRange()}</p>
              </div>
              <footer>
                <p>
                  Please submit payment via check to the above address.<br>
                  Via ACH to Routing No. 082902757 Acct. 501211145<br>
                  Via CashApp to $JeanetteHurley
                </p>
              </footer>
            </div>
          </body>
          </html>
        `;
        
        // Send email
        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: client_email,
          subject: `Invoice ${invoice.invoice_number} - ${client_name || 'Billing'}`,
          html: emailHtml
        };
        
        await transporter.sendMail(mailOptions);
        
        // Update invoice status
        db.run(
          'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['sent', invoiceId]
        );
        
        res.json({ 
          success: true, 
          message: 'Invoice sent successfully' 
        });
        
      });
    });
    
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Get dashboard statistics
app.get('/api/dashboard', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total_invoices FROM invoices',
    'SELECT COUNT(*) as pending_invoices FROM invoices WHERE status = "pending"',
    'SELECT COUNT(*) as paid_invoices FROM invoices WHERE status = "paid"',
    'SELECT COALESCE(SUM(grand_total), 0) as total_amount FROM invoices',
    'SELECT COALESCE(SUM(grand_total), 0) as pending_amount FROM invoices WHERE status IN ("pending", "sent")',
    'SELECT COALESCE(SUM(grand_total), 0) as paid_amount FROM invoices WHERE status = "paid"'
  ];
  
  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.get(query, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    })
  )).then(results => {
    const stats = {
      total_invoices: results[0].total_invoices,
      pending_invoices: results[1].pending_invoices,
      paid_invoices: results[2].paid_invoices,
      total_amount: results[3].total_amount,
      pending_amount: results[4].pending_amount,
      paid_amount: results[5].paid_amount
    };
    
    res.json(stats);
  }).catch(err => {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Database error' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
