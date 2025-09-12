const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const sqlite3 = require('sqlite3').verbose();

class InvoiceProcessor {
  constructor(dbPath = './webapp/database.sqlite') {
    // Initialize database connection
    console.log('Connecting to database:', dbPath);
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to database successfully');
      }
    });
    
    // Define business locations
    this.EVERETT_LOCATIONS = [
      "Maumelle", "Little Rock", "Conway", "Tyler", "Southaven", "Oxford", 
      "Fayetteville", "Dallas", "Searcy", "Jonesboro", "Rogers", "Jacksonville"
    ];
    this.WHITTINGHAM_LOCATIONS = [
      "Indianapolis", "Carmel", "Evansville"
    ];
    this.MCLAIN_LOCATIONS = [
      "Birmingham", "Mobile", "Huntsville"
    ];

    // Initialize client data storage
    this.clientData = {};
    this.businessAssignments = {};
    this.clients = {}; // Will store client data from database
  }

  // Normalize data structure (same logic as your original code)
  normalize(obj) {
    return {
      company: obj.Company || obj.company || "",
      job_key: obj["Job Key"] || obj.job_key || "",
      reference_number: obj["Reference Number"] || obj.reference_number || "",
      job_title: obj["Job Title"] || obj.job_title || "",
      location: obj.Location || obj.location || "",
      quantity: obj.Quantity || obj.quantity || "",
      unit: obj.Unit || obj.unit || "",
      average_cost: obj["Average Cost"] || obj.average_cost || "",
      total: obj.Total || obj.total || "",
      currency: obj.Currency || obj.currency || "",
    };
  }

  // Format numeric values (same logic as your original code)
  formatNumericValues(obj) {
    if (obj.total && !isNaN(obj.total)) {
      obj.total = parseFloat(obj.total).toFixed(2);
    }
    if (obj.average_cost && !isNaN(obj.average_cost)) {
      obj.average_cost = parseFloat(obj.average_cost).toFixed(2);
    }
    if (obj.quantity && !isNaN(obj.quantity)) {
      obj.quantity = parseInt(obj.quantity, 10);
    }
    return obj;
  }

  // Load clients from database
  async loadClients() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM clients', (err, rows) => {
        if (err) {
          console.error('Error loading clients from database:', err);
          reject(err);
          return;
        }
        
        // Organize clients by business
        this.clients = {};
        rows.forEach(client => {
          if (!this.clients[client.business]) {
            this.clients[client.business] = [];
          }
          this.clients[client.business].push(client);
        });
        
        console.log('Loaded clients from database:');
        Object.entries(this.clients).forEach(([business, clients]) => {
          console.log(`  ${business}: ${clients.map(c => c.name).join(', ')}`);
        });
        
        resolve(this.clients);
      });
    });
  }

  // Extract client information based on business assignment and location
  extractClientInfo(business, location) {
    // Try to find clients for this business (check both business ID and business name)
    let businessClients = [];
    
    // First, try to find by business ID
    if (this.clients[business]) {
      businessClients = this.clients[business];
    } else {
      // If not found by ID, try to find by business name in all clients
      Object.values(this.clients).forEach(clients => {
        clients.forEach(client => {
          if (client.business === business) {
            businessClients.push(client);
          }
        });
      });
    }
    
    if (businessClients.length > 0) {
      const city = location ? location.split(',')[0].trim() : '';
      console.log(`DEBUG: Looking for city "${city}" in business "${business}"`);
      console.log(`DEBUG: Available clients:`, businessClients.map(c => `${c.name} (${c.locations})`));
      process.stdout.write(`DEBUG: Looking for city "${city}" in business "${business}"\n`);
      process.stdout.write(`DEBUG: Available clients: ${businessClients.map(c => `${c.name} (${c.locations})`).join(', ')}\n`);
      
      // Find client whose locations include this city (exact match)
      for (const client of businessClients) {
        if (client.locations) {
          // Split locations by comma and check for exact city match
          const clientLocations = client.locations.split(',').map(loc => loc.trim());
          const cityMatch = clientLocations.some(clientLoc => {
            // Extract city from "City, State" format
            const clientCity = clientLoc.split(',')[0].trim();
            const match = clientCity.toLowerCase() === city.toLowerCase();
            console.log(`DEBUG: Checking "${clientCity}" vs "${city}" = ${match}`);
            return match;
          });
          
          if (cityMatch) {
            console.log(`DEBUG: Found match for "${city}" -> ${client.name}`);
            const lastName = client.name.split(' ').pop();
            return {
              clientName: client.name,
              clientCode: lastName.substring(0, 3).toUpperCase(),
              lastName: lastName,
              clientId: client.id
            };
          }
        }
      }
      
      // If no specific match, use the first client for this business
      console.log(`DEBUG: No specific match for "${city}", using first client: ${businessClients[0].name}`);
      process.stdout.write(`DEBUG: No specific match for "${city}", using first client: ${businessClients[0].name}\n`);
      const firstClient = businessClients[0];
      const lastName = firstClient.name.split(' ').pop();
      return {
        clientName: firstClient.name,
        clientCode: lastName.substring(0, 3).toUpperCase(),
        lastName: lastName,
        clientId: firstClient.id
      };
    }

    // Fallback to default mapping if no clients in database
    console.log(`DEBUG: Using fallback mapping for business "${business}"`);
    process.stdout.write(`DEBUG: Using fallback mapping for business "${business}"\n`);
    
    // Special case for Huntsville, AL - assign to Michael Phillips
    if (business === 'mclain' && location && location.toLowerCase().includes('huntsville')) {
      console.log(`DEBUG: Special case - Huntsville, AL assigned to Michael Phillips`);
      process.stdout.write(`DEBUG: Special case - Huntsville, AL assigned to Michael Phillips\n`);
      return {
        clientName: 'Michael Phillips',
        clientCode: 'PHI',
        lastName: 'Phillips',
        clientId: 'phillips-fallback'
      };
    }
    
    const businessToClient = {
      'everett': { clientName: 'Jason Everett', clientCode: 'EVE', lastName: 'Everett' },
      'whittingham': { clientName: 'Natalie Whittingham', clientCode: 'WHI', lastName: 'Whittingham' },
      'mclain': { clientName: 'Michael Hixson', clientCode: 'HIX', lastName: 'Hixson' },
      'others': { clientName: 'Other Client', clientCode: 'OTH', lastName: 'Other' }
    };

    const result = businessToClient[business] || { clientName: 'Unknown Client', clientCode: 'UNK', lastName: 'Unknown' };
    console.log(`DEBUG: Fallback result: ${result.clientName}`);
    process.stdout.write(`DEBUG: Fallback result: ${result.clientName}\n`);
    return result;
  }

  // Determine business based on location
  determineBusiness(obj) {
    const loc = (obj.location || "").trim();
    const city = loc.split(",")[0];
    const job = (obj.job_title || "").trim();

    if (
      this.EVERETT_LOCATIONS.includes(city) ||
      (loc === "Dallas, TX" && job === "Insurance Representative")
    ) {
      return 'everett';
    } else if (this.WHITTINGHAM_LOCATIONS.includes(city)) {
      return 'whittingham';
    } else if (this.MCLAIN_LOCATIONS.includes(city)) {
      return 'mclain';
    } else {
      return 'others';
    }
  }

  // Generate new invoice number
  generateInvoiceNumber(originalInvoiceNumber, clientCode) {
    // Remove USI25 prefix and replace with client code
    const cleanNumber = originalInvoiceNumber.replace(/^USI25-?/, '');
    return `${clientCode}-${cleanNumber}`;
  }

  // Extract invoice number and date from CSV header
  extractInvoiceInfo(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let invoiceNumber = '';
    let invoiceDate = '';
    
    // Extract invoice number from first line
    const firstLine = lines[0];
    const invoiceMatch = firstLine.match(/invoice #([A-Z0-9-]+)/i);
    if (invoiceMatch) {
      invoiceNumber = invoiceMatch[1];
    }
    
    // Extract invoice date from line containing "Itemization details"
    for (const line of lines) {
      if (line.includes('Itemization details')) {
        const dateMatch = line.match(/Itemization details\s+(.+)/);
        if (dateMatch) {
          invoiceDate = dateMatch[1].trim().replace(/"/g, ''); // Remove any quotes
        }
        break;
      }
    }
    
    return { invoiceNumber, invoiceDate };
  }

  // Process a single CSV file
  async processCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const { invoiceNumber, invoiceDate } = this.extractInvoiceInfo(filePath);
      
      // Read the entire file first to find the CSV data section
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Find the actual CSV data section
      let csvStartIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('Company,Job Key,Reference Number')) {
          csvStartIndex = i;
          break;
        }
      }
      
      if (csvStartIndex === -1) {
        reject(new Error(`Could not find CSV header row in ${path.basename(filePath)}`));
        return;
      }
      
      // Create a temporary CSV content with just the data
      const csvLines = lines.slice(csvStartIndex);
      const tempCsvContent = csvLines.join('\n');
      
      // Write temporary CSV file
      const tempFilePath = `./temp_${Date.now()}.csv`;
      fs.writeFileSync(tempFilePath, tempCsvContent);
      
      fs.createReadStream(tempFilePath)
        .pipe(csv())
        .on('data', (data) => {
          // Skip summary rows (Total cost, Tax, Total amount)
          if (data.Company === '' && data['Job Key'] === '' && 
              (data.Total === 'Total cost' || data.Total === 'Tax' || data.Total === 'Total amount')) {
            return;
          }
          
          // Normalize and format the data
          const normalized = this.normalize(data);
          const formatted = this.formatNumericValues(normalized);
          
          // Add invoice metadata
          formatted.invoice_number = invoiceNumber;
          formatted.invoice_date = invoiceDate;
          formatted.original_invoice_date = invoiceDate; // Store original date for reference
          
          // Determine business first
          formatted.business = this.determineBusiness(formatted);
          
          // Extract client information based on business and location
          const clientInfo = this.extractClientInfo(formatted.business, formatted.location);
          formatted.client_name = clientInfo.clientName;
          formatted.client_code = clientInfo.clientCode;
          formatted.last_name = clientInfo.lastName;
          formatted.client_id = clientInfo.clientId;
          
          // Generate new invoice number
          formatted.new_invoice_number = this.generateInvoiceNumber(invoiceNumber, clientInfo.clientCode);
          
          // Only include rows with reference_number and job_title
          if (formatted.reference_number && formatted.job_title) {
            results.push(formatted);
          }
        })
        .on('end', () => {
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
          console.log(`Processed ${results.length} valid rows from ${path.basename(filePath)} (Invoice: ${invoiceNumber}, Date: ${invoiceDate})`);
          resolve(results);
        })
        .on('error', (error) => {
          // Clean up temp file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          reject(error);
        });
    });
  }

  // Process all CSV files in a directory
  async processDirectory(inputDir) {
    try {
      const files = fs.readdirSync(inputDir);
      const csvFiles = files.filter(file => file.toLowerCase().endsWith('.csv'));
      
      if (csvFiles.length === 0) {
        throw new Error(`No CSV files found in directory: ${inputDir}`);
      }

      console.log(`Found ${csvFiles.length} CSV files to process:`);
      csvFiles.forEach(file => console.log(`  - ${file}`));

      // Process each CSV file
      for (const file of csvFiles) {
        const filePath = path.join(inputDir, file);
        const data = await this.processCSVFile(filePath);
        
        // Group the data by client
        data.forEach(obj => {
          const clientKey = obj.client_name;
          if (!this.clientData[clientKey]) {
            this.clientData[clientKey] = {
              clientName: obj.client_name,
              clientCode: obj.client_code,
              business: obj.business,
              locations: new Set(),
              invoices: new Set(),
              records: []
            };
          }
          
          this.clientData[clientKey].records.push(obj);
          this.clientData[clientKey].locations.add(obj.location);
          this.clientData[clientKey].invoices.add(obj.new_invoice_number);
        });
      }

      console.log('\nClient grouping summary:');
      Object.entries(this.clientData).forEach(([clientName, data]) => {
        console.log(`  ${clientName} (${data.clientCode}): ${data.records.length} records, ${data.invoices.size} invoices, ${data.locations.size} locations`);
        console.log(`    Business: ${data.business}, Locations: ${Array.from(data.locations).join(', ')}`);
      });

    } catch (error) {
      throw new Error(`Error processing directory: ${error.message}`);
    }
  }

  // Add subtotals and grand total to client data
  addSummaryRows(clientData) {
    const processedData = {};
    
    for (const [clientName, clientInfo] of Object.entries(clientData)) {
      if (clientInfo.records.length === 0) {
        processedData[clientName] = [];
        continue;
      }
      
      const processedRecords = [];
      const invoiceGroups = {};
      
      // Group records by new invoice number
      for (const record of clientInfo.records) {
        const invoiceNum = record.new_invoice_number;
        if (!invoiceGroups[invoiceNum]) {
          invoiceGroups[invoiceNum] = [];
        }
        invoiceGroups[invoiceNum].push(record);
      }
      
      // Process each invoice group
      for (const [invoiceNum, invoiceRecords] of Object.entries(invoiceGroups)) {
        // Add all records for this invoice
        processedRecords.push(...invoiceRecords);
        
        // Calculate subtotal for this invoice
        const subtotal = invoiceRecords.reduce((sum, record) => {
          return sum + (parseFloat(record.total) || 0);
        }, 0);
        
        // Add subtotal row
        const subtotalRow = {
          new_invoice_number: '',
          invoice_number: '',
          invoice_date: '',
          company: '',
          job_key: '',
          reference_number: '',
          job_title: '',
          location: '',
          quantity: '',
          unit: '',
          average_cost: '',
          total: `SUBTOTAL - Invoice ${invoiceNum}`,
          client_name: '',
          client_code: '',
          business: ''
        };
        processedRecords.push(subtotalRow);
        
        // Add subtotal amount row
        const subtotalAmountRow = {
          new_invoice_number: '',
          invoice_number: '',
          invoice_date: '',
          company: '',
          job_key: '',
          reference_number: '',
          job_title: '',
          location: '',
          quantity: '',
          unit: '',
          average_cost: '',
          total: subtotal.toFixed(2),
          client_name: '',
          client_code: '',
          business: ''
        };
        processedRecords.push(subtotalAmountRow);
        
        // Add grand total with 10% markup row for this invoice
        const grandTotalWithMarkup = subtotal * 1.10;
        const grandTotalMarkupRow = {
          new_invoice_number: '',
          invoice_number: '',
          invoice_date: '',
          company: '',
          job_key: '',
          reference_number: '',
          job_title: '',
          location: '',
          quantity: '',
          unit: '',
          average_cost: '',
          total: `GRAND TOTAL + 10% - Invoice ${invoiceNum}`,
          client_name: '',
          client_code: '',
          business: ''
        };
        processedRecords.push(grandTotalMarkupRow);
        
        // Add grand total with markup amount row for this invoice
        const grandTotalMarkupAmountRow = {
          new_invoice_number: '',
          invoice_number: '',
          invoice_date: '',
          company: '',
          job_key: '',
          reference_number: '',
          job_title: '',
          location: '',
          quantity: '',
          unit: '',
          average_cost: '',
          total: grandTotalWithMarkup.toFixed(2),
          client_name: '',
          client_code: '',
          business: ''
        };
        processedRecords.push(grandTotalMarkupAmountRow);
        
        // Add empty row for separation
        const emptyRow = {
          new_invoice_number: '',
          invoice_number: '',
          invoice_date: '',
          company: '',
          job_key: '',
          reference_number: '',
          job_title: '',
          location: '',
          quantity: '',
          unit: '',
          average_cost: '',
          total: '',
          client_name: '',
          client_code: '',
          business: ''
        };
        processedRecords.push(emptyRow);
      }
      
      processedData[clientName] = processedRecords;
    }
    
    return processedData;
  }

  // Write client data to separate CSV files
  async writeClientFiles(outputDir) {
    const csvWriterConfig = {
      path: '',
      header: [
        { id: 'new_invoice_number', title: 'New Invoice Number' },
        { id: 'invoice_number', title: 'Original Invoice Number' },
        { id: 'invoice_date', title: 'Invoice Date' },
        { id: 'company', title: 'Company' },
        { id: 'job_key', title: 'Job Key' },
        { id: 'reference_number', title: 'Reference Number' },
        { id: 'job_title', title: 'Job Title' },
        { id: 'location', title: 'Location' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'unit', title: 'Unit' },
        { id: 'average_cost', title: 'Average Cost' },
        { id: 'total', title: 'Total' },
        { id: 'client_name', title: 'Client Name' },
        { id: 'client_code', title: 'Client Code' },
        { id: 'client_id', title: 'Client ID' },
        { id: 'business', title: 'Business' }
      ]
    };

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Add summary rows to client data
    const processedClientData = this.addSummaryRows(this.clientData);

    // Write each client to a separate CSV file
    for (const [clientName, clientRecords] of Object.entries(processedClientData)) {
      if (clientRecords.length > 0) {
        // Create safe filename from client name
        const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
        const outputPath = path.join(outputDir, `${safeClientName}_invoices.csv`);
        const writer = createCsvWriter({
          ...csvWriterConfig,
          path: outputPath
        });

        await writer.writeRecords(clientRecords);
        console.log(`Created ${outputPath} with ${clientRecords.length} records (including summary rows)`);
      } else {
        console.log(`No records found for ${clientName} - skipping file creation`);
      }
    }
  }

  // Main processing method
  async process(inputDir, outputDir = './output') {
    try {
      console.log('Starting invoice processing...\n');
      
      // Load clients from database first
      await this.loadClients();
      
      await this.processDirectory(inputDir);
      await this.writeClientFiles(outputDir);
      
      console.log('\nProcessing completed successfully!');
      console.log(`\nGenerated ${Object.keys(this.clientData).length} client invoice files.`);
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    } finally {
      // Close database connection
      if (this.db) {
        this.db.close();
      }
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node process-invoices.js <input-directory> [output-directory]');
    console.log('');
    console.log('Examples:');
    console.log('  node process-invoices.js ./csv-files');
    console.log('  node process-invoices.js ./csv-files ./output');
    console.log('');
    console.log('This will process all CSV files in the input directory and create grouped output files.');
    process.exit(1);
  }

  const inputDir = args[0];
  const outputDir = args[1] || './output';

  // Validate input directory
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  const processor = new InvoiceProcessor();
  await processor.process(inputDir, outputDir);
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = InvoiceProcessor;
