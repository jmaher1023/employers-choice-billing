const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
require('dotenv').config();

// Set default timezone to US Central Time
moment.tz.setDefault('America/Chicago');

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
app.use(express.static(path.join(__dirname, 'client/build')));

// Serve favicon from webapp root
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.ico'));
});

// Set Content Security Policy headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' http://localhost:* ws://localhost:*; " +
    "font-src 'self' data:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  next();
});

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
    business TEXT NOT NULL,
    client_id TEXT,
    subtotal REAL NOT NULL,
    grand_total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients (id)
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
    original_invoice_date TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices (id)
  )`);

  // Businesses table
  db.run(`CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Clients table
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    business TEXT NOT NULL,
    locations TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Add original_invoice_date column to existing invoice_items table if it doesn't exist
  db.run(`ALTER TABLE invoice_items ADD COLUMN original_invoice_date TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding original_invoice_date column:', err);
    }
  });
});

// Email webhook configuration
const EMAIL_WEBHOOK_URL = process.env.EMAIL_WEBHOOK_URL;

if (EMAIL_WEBHOOK_URL) {
  console.log('Email webhook configured - email sending enabled via webhook');
} else {
  console.log('Email webhook not configured - email sending disabled');
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Business management endpoints
app.get('/api/businesses', (req, res) => {
  db.all('SELECT * FROM businesses ORDER BY name', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ businesses: rows });
  });
});

app.post('/api/businesses', (req, res) => {
  const { name, description, contact_email, contact_phone, address } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Business name is required' });
  }
  
  const businessId = uuidv4();
  
  db.run(
    'INSERT INTO businesses (id, name, description, contact_email, contact_phone, address) VALUES (?, ?, ?, ?, ?, ?)',
    [businessId, name, description || '', contact_email || '', contact_phone || '', address || ''],
    function(err) {
      if (err) {
        console.error('Error creating business:', err);
        return res.status(500).json({ error: 'Failed to create business' });
      }
      
      res.json({ 
        success: true, 
        message: 'Business created successfully',
        business_id: businessId 
      });
    }
  );
});

app.put('/api/businesses/:id', (req, res) => {
  const businessId = req.params.id;
  const { name, description, contact_email, contact_phone, address } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Business name is required' });
  }
  
  db.run(
    'UPDATE businesses SET name = ?, description = ?, contact_email = ?, contact_phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description || '', contact_email || '', contact_phone || '', address || '', businessId],
    function(err) {
      if (err) {
        console.error('Error updating business:', err);
        return res.status(500).json({ error: 'Failed to update business' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Business updated successfully' 
      });
    }
  );
});

app.delete('/api/businesses/:id', (req, res) => {
  const businessId = req.params.id;
  
  // Check if business has clients
  db.get('SELECT COUNT(*) as count FROM clients WHERE business = ?', [businessId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete business with existing clients' });
    }
    
    db.run('DELETE FROM businesses WHERE id = ?', [businessId], function(err) {
      if (err) {
        console.error('Error deleting business:', err);
        return res.status(500).json({ error: 'Failed to delete business' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Business deleted successfully' 
      });
    });
  });
});

// Client management endpoints
app.get('/api/clients', (req, res) => {
  const { business } = req.query;
  
  let query = 'SELECT * FROM clients';
  const params = [];
  
  if (business) {
    query += ' WHERE business = ?';
    params.push(business);
  }
  
  query += ' ORDER BY name';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ clients: rows });
  });
});

app.post('/api/clients', (req, res) => {
  const { name, email, business, locations, phone, address } = req.body;
  
  if (!name || !business) {
    return res.status(400).json({ error: 'Name and business are required' });
  }
  
  const clientId = uuidv4();
  
  db.run(
    'INSERT INTO clients (id, name, email, business, locations, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [clientId, name, email || '', business, locations || '', phone || '', address || ''],
    function(err) {
      if (err) {
        console.error('Error creating client:', err);
        return res.status(500).json({ error: 'Failed to create client' });
      }
      
      res.json({ 
        success: true, 
        message: 'Client created successfully',
        client_id: clientId 
      });
    }
  );
});

app.put('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  const { name, email, business, locations, phone, address } = req.body;
  
  if (!name || !business) {
    return res.status(400).json({ error: 'Name and business are required' });
  }
  
  db.run(
    'UPDATE clients SET name = ?, email = ?, business = ?, locations = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email || '', business, locations || '', phone || '', address || '', clientId],
    function(err) {
      if (err) {
        console.error('Error updating client:', err);
        return res.status(500).json({ error: 'Failed to update client' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Client updated successfully' 
      });
    }
  );
});

app.delete('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  
  // Check if client has invoices
  db.get('SELECT COUNT(*) as count FROM invoices WHERE client_id = ?', [clientId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete client with existing invoices' });
    }
    
    db.run('DELETE FROM clients WHERE id = ?', [clientId], function(err) {
      if (err) {
        console.error('Error deleting client:', err);
        return res.status(500).json({ error: 'Failed to delete client' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Client deleted successfully' 
      });
    });
  });
});

// Get invoices for custom invoice creation
app.get('/api/invoices/for-custom', (req, res) => {
  const { business, client_id, location_filter } = req.query;
  
  let query = `
    SELECT DISTINCT i.invoice_number, i.invoice_date, i.business, 
           c.name as client_name, c.id as client_id,
           COUNT(ii.id) as item_count,
           GROUP_CONCAT(DISTINCT ii.location) as locations,
           i.subtotal, i.grand_total, i.status
    FROM invoices i
    JOIN invoice_items ii ON i.id = ii.invoice_id
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.status IN ('pending', 'sent')
  `;
  
  const params = [];
  
  if (business) {
    // Get business name from business ID to match against invoice business field
    db.get('SELECT name FROM businesses WHERE id = ?', [business], (err, businessRow) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!businessRow) {
        return res.status(400).json({ error: 'Business not found' });
      }
      
      // Map business name to lowercase for matching
      const businessName = businessRow.name.toLowerCase();
      let businessQuery = query;
      let businessParams = [...params];
      
      if (businessName.includes('everett')) {
        businessQuery += ' AND i.business = ?';
        businessParams.push('everett');
      } else if (businessName.includes('whittingham')) {
        businessQuery += ' AND i.business = ?';
        businessParams.push('whittingham');
      } else if (businessName.includes('mclain')) {
        businessQuery += ' AND i.business = ?';
        businessParams.push('mclain');
      }
      
      // Add other filters
      if (client_id) {
        businessQuery += ' AND i.client_id = ?';
        businessParams.push(client_id);
      }
      
      if (location_filter) {
        businessQuery += ' AND ii.location LIKE ?';
        businessParams.push(`%${location_filter}%`);
      }
      
      businessQuery += ' GROUP BY i.invoice_number, i.invoice_date, i.business, i.client_id ORDER BY i.invoice_date DESC';
      
      db.all(businessQuery, businessParams, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ invoices: rows });
      });
    });
    return;
  }
  
  // Handle case when no business is selected
  if (client_id) {
    query += ' AND i.client_id = ?';
    params.push(client_id);
  }
  
  if (location_filter) {
    query += ' AND ii.location LIKE ?';
    params.push(`%${location_filter}%`);
  }
  
  query += ' GROUP BY i.invoice_number, i.invoice_date, i.business, i.client_id ORDER BY i.invoice_date DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ invoices: rows });
  });
});

// Create custom invoice from multiple invoices
app.post('/api/invoices/custom', async (req, res) => {
  try {
    const { 
      business, 
      client_id, 
      location_filter, 
      invoice_numbers, 
      custom_invoice_number, 
      client_name 
    } = req.body;

    if (!business || !custom_invoice_number) {
      return res.status(400).json({ error: 'Business and custom invoice number are required' });
    }

    // First, get the business name from the business ID
    db.get('SELECT name FROM businesses WHERE id = ?', [business], (err, businessRow) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!businessRow) {
        return res.status(400).json({ error: 'Business not found' });
      }
      
      // Map business name to lowercase for matching
      const businessName = businessRow.name.toLowerCase();
      let mappedBusinessName;
      
      if (businessName.includes('everett')) {
        mappedBusinessName = 'everett';
      } else if (businessName.includes('whittingham')) {
        mappedBusinessName = 'whittingham';
      } else if (businessName.includes('mclain')) {
        mappedBusinessName = 'mclain';
      } else {
        mappedBusinessName = businessName; // fallback to original name
      }

      // Build query to get invoices based on criteria
      let query = `
        SELECT i.*, ii.* 
        FROM invoices i
        JOIN invoice_items ii ON i.id = ii.invoice_id
        WHERE i.business = ?
      `;
      
      const params = [mappedBusinessName];
      const conditions = [];

      // Add client filter if specified
      if (client_id) {
        conditions.push('i.client_id = ?');
        params.push(client_id);
      }

      // Add location filter if specified
      if (location_filter) {
        conditions.push('ii.location LIKE ?');
        params.push(`%${location_filter}%`);
      }

      // Add specific invoice numbers filter if specified
      if (invoice_numbers && invoice_numbers.length > 0) {
        const placeholders = invoice_numbers.map(() => '?').join(',');
        conditions.push(`i.invoice_number IN (${placeholders})`);
        params.push(...invoice_numbers);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += ' ORDER BY i.invoice_date, ii.location';

      // Get the filtered invoice items
      db.all(query, params, async (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (rows.length === 0) {
          return res.status(400).json({ error: 'No invoice items found matching the criteria' });
        }

      // Group items by location for better organization
      const locationGroups = {};
      let totalSubtotal = 0;

      for (const row of rows) {
        const location = row.location || 'Unknown';
        if (!locationGroups[location]) {
          locationGroups[location] = [];
        }
        locationGroups[location].push(row);
        totalSubtotal += parseFloat(row.total) || 0;
      }

      const grandTotal = totalSubtotal * 1.10; // Add 10% billing fee
      const customInvoiceId = uuidv4();

      // Create the custom invoice with -MERGED suffix
      const mergedInvoiceNumber = custom_invoice_number.endsWith('-MERGED') 
        ? custom_invoice_number 
        : `${custom_invoice_number}-MERGED`;
      
      db.run(
        `INSERT INTO invoices (id, invoice_number, invoice_date, business, client_id, subtotal, grand_total, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [customInvoiceId, mergedInvoiceNumber, moment.tz('America/Chicago').format('YYYY-MM-DD'), mappedBusinessName, client_id || null, totalSubtotal, grandTotal, 'pending'],
        function(err) {
          if (err) {
            console.error('Error creating custom invoice:', err);
            return res.status(500).json({ error: 'Failed to create custom invoice' });
          }

          // Insert invoice items
          const itemPromises = [];
          for (const row of rows) {
            const itemId = uuidv4();
            const itemPromise = new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO invoice_items (id, invoice_id, company, job_key, reference_number, job_title, location, quantity, unit, average_cost, total, original_invoice_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [itemId, customInvoiceId, row.company, row.job_key, row.reference_number, row.job_title, row.location, row.quantity, row.unit, row.average_cost, row.total, row.invoice_date],
                function(err) {
                  if (err) {
                    console.error('Error inserting custom invoice item:', err);
                    reject(err);
                  } else {
                    resolve();
                  }
                }
              );
            });
            itemPromises.push(itemPromise);
          }

          Promise.all(itemPromises)
            .then(() => {
              res.json({
                success: true,
                message: 'Custom invoice created successfully',
                invoice_id: customInvoiceId,
                invoice_number: mergedInvoiceNumber,
                summary: {
                  total_items: rows.length,
                  locations: Object.keys(locationGroups),
                  subtotal: totalSubtotal,
                  grand_total: grandTotal
                }
              });
            })
            .catch(err => {
              console.error('Error inserting invoice items:', err);
              res.status(500).json({ error: 'Failed to create invoice items' });
            });
        }
      );
      });
    });

  } catch (error) {
    console.error('Custom invoice error:', error);
    res.status(500).json({ error: 'Failed to create custom invoice', details: error.message });
  }
});

// Serve React app for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve React app
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
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
      const processor = new InvoiceProcessor('./database.sqlite');
      const tempDir = `./temp_${Date.now()}`;
      
      // Create temp directory and move file
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, file.originalname);
      fs.copyFileSync(file.path, tempFilePath);
      
      // Process the file
      const outputDir = `./temp_output_${Date.now()}`;
      await processor.process(tempDir, outputDir);
      
      // Clean up temp files and output directory
      fs.unlinkSync(file.path);
      fs.unlinkSync(tempFilePath);
      fs.rmdirSync(tempDir);
      
      // Clean up the temp output directory
      if (fs.existsSync(outputDir)) {
        const outputFiles = fs.readdirSync(outputDir);
        for (const outputFile of outputFiles) {
          fs.unlinkSync(path.join(outputDir, outputFile));
        }
        fs.rmdirSync(outputDir);
      }
      
      // Get the processed client data
      const clientData = processor.clientData;
      
      // Debug: Log the processed data structure
      console.log('Processed client data structure:');
      for (const [clientName, clientInfo] of Object.entries(clientData)) {
        console.log(`  ${clientName}: ${clientInfo.records.length} records, ${clientInfo.invoices.size} invoices`);
        console.log(`    Business: ${clientInfo.business}, Locations: ${Array.from(clientInfo.locations).join(', ')}`);
      }
      
      // Save to database
      const savePromises = [];
      
      for (const [clientName, clientInfo] of Object.entries(clientData)) {
        if (clientInfo.records.length === 0) continue;
        
        console.log(`Processing ${clientName} client with ${clientInfo.records.length} records`);
        
        // Check if client already exists, create if not
        const existingClient = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM clients WHERE name = ?', [clientName], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        let clientId;
        if (!existingClient) {
          // Create new client
          clientId = uuidv4();
          const locations = Array.from(clientInfo.locations).join(', ');
          
          savePromises.push(new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO clients (id, name, email, business, locations, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [clientId, clientName, '', clientInfo.business, locations, '', ''],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          }));
        } else {
          clientId = existingClient.id;
        }

        // Group by new invoice number
        const invoiceGroups = {};
        for (const record of clientInfo.records) {
          const invoiceNum = record.new_invoice_number;
          if (!invoiceGroups[invoiceNum]) {
            invoiceGroups[invoiceNum] = [];
          }
          invoiceGroups[invoiceNum].push(record);
        }
        
        // Save each invoice for this client
        for (const [invoiceNum, invoiceRecords] of Object.entries(invoiceGroups)) {
          console.log(`Creating invoice ${invoiceNum} for ${clientName} with ${invoiceRecords.length} items`);
          
          const savePromise = new Promise((resolve, reject) => {
            // Check if invoice already exists
            db.get('SELECT id FROM invoices WHERE invoice_number = ?', [invoiceNum], (err, existingInvoice) => {
              if (err) {
                console.error('Error checking existing invoice:', err);
                reject(err);
                return;
              }
              
              let invoiceId;
              if (existingInvoice) {
                // Update existing invoice
                invoiceId = existingInvoice.id;
                const subtotal = invoiceRecords.reduce((sum, record) => sum + (parseFloat(record.total) || 0), 0);
                const grandTotal = subtotal * 1.10;
                
                db.run(
                  'UPDATE invoices SET invoice_date = ?, business = ?, client_id = ?, subtotal = ?, grand_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [invoiceRecords[0].invoice_date, clientInfo.business, clientId, subtotal, grandTotal, invoiceId],
                  function(err) {
                    if (err) {
                      console.error('Error updating invoice:', err);
                      reject(err);
                      return;
                    }
                    console.log(`Updated invoice ${invoiceNum} for ${clientName}`);
                    resolve(invoiceId);
                  }
                );
              } else {
                // Insert new invoice
                invoiceId = uuidv4();
                const subtotal = invoiceRecords.reduce((sum, record) => sum + (parseFloat(record.total) || 0), 0);
                const grandTotal = subtotal * 1.10;
                
                db.run(
                  `INSERT INTO invoices (id, invoice_number, invoice_date, business, client_id, subtotal, grand_total) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [invoiceId, invoiceNum, invoiceRecords[0].invoice_date, clientInfo.business, clientId, subtotal, grandTotal],
                  function(err) {
                    if (err) {
                      console.error('Error inserting invoice:', err);
                      reject(err);
                      return;
                    }
                    console.log(`Inserted new invoice ${invoiceNum} for ${clientName}`);
                    resolve(invoiceId);
                  }
                );
              }
            });
          });
          
          // Handle invoice items
          const itemsPromise = savePromise.then((invoiceId) => {
            return new Promise((resolve, reject) => {
              // Delete existing items and insert new ones
              db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId], (err) => {
                if (err) {
                  console.error('Error deleting existing items:', err);
                  reject(err);
                  return;
                }
                
                // Insert invoice items
                const itemPromises = [];
                for (const record of invoiceRecords) {
                  const itemId = uuidv4();
                  const itemPromise = new Promise((itemResolve, itemReject) => {
                    db.run(
                      `INSERT INTO invoice_items (id, invoice_id, company, job_key, reference_number, job_title, location, quantity, unit, average_cost, total, original_invoice_date) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [itemId, invoiceId, record.company, record.job_key, record.reference_number, record.job_title, record.location, record.quantity, record.unit, record.average_cost, record.total, record.original_invoice_date || record.invoice_date],
                      function(err) {
                        if (err) {
                          console.error('Error inserting invoice item:', err);
                          itemReject(err);
                        } else {
                          itemResolve();
                        }
                      }
                    );
                  });
                  itemPromises.push(itemPromise);
                }
                
                Promise.all(itemPromises)
                  .then(() => resolve())
                  .catch(reject);
              });
            });
          });
          
          savePromises.push(itemsPromise);
        }
      }
      
      // Wait for all database operations to complete
      await Promise.all(savePromises);
      
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
    client, 
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
  
  if (client) {
    conditions.push('i.client_id = ?');
    params.push(client);
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

// Delete invoice
app.delete('/api/invoices/:id', (req, res) => {
  const invoiceId = req.params.id;
  
  // First, get the invoice to show what we're deleting
  db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId], (err, invoice) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Delete invoice items first (foreign key constraint)
    db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId], function(err) {
      if (err) {
        console.error('Error deleting invoice items:', err);
        return res.status(500).json({ error: 'Failed to delete invoice items' });
      }
      
      // Delete payments
      db.run('DELETE FROM payments WHERE invoice_id = ?', [invoiceId], function(err) {
        if (err) {
          console.error('Error deleting payments:', err);
          return res.status(500).json({ error: 'Failed to delete payments' });
        }
        
        // Finally, delete the invoice
        db.run('DELETE FROM invoices WHERE id = ?', [invoiceId], function(err) {
          if (err) {
            console.error('Error deleting invoice:', err);
            return res.status(500).json({ error: 'Failed to delete invoice' });
          }
          
          res.json({ 
            success: true, 
            message: `Invoice ${invoice.invoice_number} deleted successfully` 
          });
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

// Bulk update invoice status
app.patch('/api/invoices/bulk/status', (req, res) => {
  const { invoice_ids, status } = req.body;
  
  if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
    return res.status(400).json({ error: 'Invoice IDs array is required' });
  }
  
  if (!['pending', 'sent', 'paid', 'overdue'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const placeholders = invoice_ids.map(() => '?').join(',');
  const query = `UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
  
  db.run(query, [status, ...invoice_ids], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ 
      success: true, 
      message: `Status updated successfully for ${this.changes} invoices` 
    });
  });
});

// Bulk delete invoices
app.delete('/api/invoices/bulk', (req, res) => {
  const { invoice_ids } = req.body;
  
  if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
    return res.status(400).json({ error: 'Invoice IDs array is required' });
  }
  
  // First, get the invoices to show what we're deleting
  const placeholders = invoice_ids.map(() => '?').join(',');
  const selectQuery = `SELECT invoice_number FROM invoices WHERE id IN (${placeholders})`;
  
  db.all(selectQuery, invoice_ids, (err, invoices) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found' });
    }
    
    // Delete invoice items first (foreign key constraint)
    db.run(`DELETE FROM invoice_items WHERE invoice_id IN (${placeholders})`, invoice_ids, function(err) {
      if (err) {
        console.error('Error deleting invoice items:', err);
        return res.status(500).json({ error: 'Failed to delete invoice items' });
      }
      
      // Delete payments
      db.run(`DELETE FROM payments WHERE invoice_id IN (${placeholders})`, invoice_ids, function(err) {
        if (err) {
          console.error('Error deleting payments:', err);
          return res.status(500).json({ error: 'Failed to delete payments' });
        }
        
        // Finally, delete the invoices
        db.run(`DELETE FROM invoices WHERE id IN (${placeholders})`, invoice_ids, function(err) {
          if (err) {
            console.error('Error deleting invoices:', err);
            return res.status(500).json({ error: 'Failed to delete invoices' });
          }
          
          res.json({ 
            success: true, 
            message: `${this.changes} invoices deleted successfully`,
            deleted_invoices: invoices.map(inv => inv.invoice_number)
          });
        });
      });
    });
  });
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
  const { client_email, client_name, message, notes } = req.body;
  
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
          return moment.tz(dateString, 'America/Chicago').format('MM/DD/YYYY');
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
                ${notes ? `<p><strong>Additional Notes:</strong><br>${notes.replace(/\n/g, '<br>')}</p>` : ''}
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
        
        // Check if email webhook is configured
        if (!EMAIL_WEBHOOK_URL) {
          return res.status(503).json({ 
            error: 'Email webhook not configured', 
            message: 'Please configure EMAIL_WEBHOOK_URL in environment variables to send invoices via email' 
          });
        }
        
        // Send email via webhook
        const webhookPayload = {
          to: client_email,
          subject: `Invoice ${invoice.invoice_number} - ${client_name || 'Billing'}`,
          html: emailHtml,
          invoice_number: invoice.invoice_number,
          client_name: client_name || 'Billing',
          invoice_id: invoiceId,
          message: message || '',
          notes: notes || ''
        };
        
        try {
          const webhookResponse = await fetch(EMAIL_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload),
            timeout: 10000 // 10 second timeout
          });
          
          if (!webhookResponse.ok) {
            throw new Error(`Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
          }
          
          console.log('Email sent successfully via webhook');
        } catch (webhookError) {
          console.error('Webhook error:', webhookError.message);
          return res.status(500).json({ 
            error: 'Failed to send email via webhook', 
            message: webhookError.message,
            details: 'Please check your n8n webhook URL and ensure it\'s accessible'
          });
        }
        
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
    'SELECT COUNT(*) as total_invoices FROM invoices WHERE invoice_number NOT LIKE "%-MERGED"',
    'SELECT COUNT(*) as pending_invoices FROM invoices WHERE status = "pending" AND invoice_number NOT LIKE "%-MERGED"',
    'SELECT COUNT(*) as paid_invoices FROM invoices WHERE status = "paid" AND invoice_number NOT LIKE "%-MERGED"',
    'SELECT COALESCE(SUM(grand_total), 0) as total_amount FROM invoices WHERE invoice_number NOT LIKE "%-MERGED"',
    'SELECT COALESCE(SUM(grand_total), 0) as pending_amount FROM invoices WHERE status IN ("pending", "sent") AND invoice_number NOT LIKE "%-MERGED"',
    'SELECT COALESCE(SUM(grand_total), 0) as paid_amount FROM invoices WHERE status = "paid" AND invoice_number NOT LIKE "%-MERGED"'
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

// Update invoice item
app.put('/api/invoice-items/:id', (req, res) => {
  const itemId = req.params.id;
  const { 
    job_key, 
    reference_number, 
    job_title, 
    location, 
    quantity, 
    unit, 
    average_cost, 
    total, 
    original_invoice_date 
  } = req.body;

  db.run(
    `UPDATE invoice_items SET 
     job_key = ?, reference_number = ?, job_title = ?, 
     location = ?, quantity = ?, unit = ?, average_cost = ?, 
     total = ?, original_invoice_date = ?
     WHERE id = ?`,
    [job_key, reference_number, job_title, location, quantity, unit, average_cost, total, original_invoice_date, itemId],
    function(err) {
      if (err) {
        console.error('Error updating invoice item:', err);
        return res.status(500).json({ error: 'Failed to update invoice item' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Invoice item not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Invoice item updated successfully' 
      });
    }
  );
});

// Update invoice details (name, date, etc.)
app.put('/api/invoices/:id', (req, res) => {
  const invoiceId = req.params.id;
  const { invoice_number, invoice_date } = req.body;

  if (!invoice_number) {
    return res.status(400).json({ error: 'Invoice number is required' });
  }

  db.run(
    'UPDATE invoices SET invoice_number = ?, invoice_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [invoice_number, invoice_date, invoiceId],
    function(err) {
      if (err) {
        console.error('Error updating invoice:', err);
        return res.status(500).json({ error: 'Failed to update invoice' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Invoice updated successfully' 
      });
    }
  );
});

// Update custom invoice totals
app.put('/api/invoices/:id/totals', (req, res) => {
  const invoiceId = req.params.id;
  
  // Recalculate totals from invoice items
  db.all('SELECT total FROM invoice_items WHERE invoice_id = ?', [invoiceId], (err, items) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const grandTotal = subtotal * 1.10; // Add 10% billing fee
    
    db.run(
      'UPDATE invoices SET subtotal = ?, grand_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subtotal, grandTotal, invoiceId],
      function(err) {
        if (err) {
          console.error('Error updating invoice totals:', err);
          return res.status(500).json({ error: 'Failed to update invoice totals' });
        }
        
        res.json({ 
          success: true, 
          message: 'Invoice totals updated successfully',
          subtotal: subtotal,
          grand_total: grandTotal
        });
      }
    );
  });
});

// Get custom invoice statistics
app.get('/api/dashboard/custom', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as custom_invoices FROM invoices WHERE invoice_number LIKE "%-MERGED"',
    'SELECT COUNT(*) as custom_pending FROM invoices WHERE status = "pending" AND invoice_number LIKE "%-MERGED"',
    'SELECT COUNT(*) as custom_sent FROM invoices WHERE status = "sent" AND invoice_number LIKE "%-MERGED"',
    'SELECT COUNT(*) as custom_paid FROM invoices WHERE status = "paid" AND invoice_number LIKE "%-MERGED"',
    'SELECT COALESCE(SUM(grand_total), 0) as custom_total_amount FROM invoices WHERE invoice_number LIKE "%-MERGED"'
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
      custom_invoices: results[0].custom_invoices,
      custom_pending: results[1].custom_pending,
      custom_sent: results[2].custom_sent,
      custom_paid: results[3].custom_paid,
      custom_total_amount: results[4].custom_total_amount
    };
    
    res.json(stats);
  }).catch(err => {
    console.error('Custom dashboard error:', err);
    res.status(500).json({ error: 'Database error' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
