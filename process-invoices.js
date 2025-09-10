const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class InvoiceProcessor {
  constructor() {
    // Define location groups (same as your original code)
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

    // Initialize grouped data storage
    this.groupedData = {
      everett: [],
      whittingham: [],
      mclain: [],
      others: []
    };
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

  // Group data by location (same logic as your original code)
  groupByLocation(obj) {
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
        
        // Group the data
        data.forEach(obj => {
          const group = this.groupByLocation(obj);
          this.groupedData[group].push(obj);
        });
      }

      console.log('\nGrouping summary:');
      console.log(`  Everett: ${this.groupedData.everett.length} records`);
      console.log(`  Whittingham: ${this.groupedData.whittingham.length} records`);
      console.log(`  McLain: ${this.groupedData.mclain.length} records`);
      console.log(`  Others: ${this.groupedData.others.length} records`);

    } catch (error) {
      throw new Error(`Error processing directory: ${error.message}`);
    }
  }

  // Add subtotals and grand total to grouped data
  addSummaryRows(groupedData) {
    const processedData = {};
    
    for (const [groupKey, records] of Object.entries(groupedData)) {
      if (records.length === 0) {
        processedData[groupKey] = [];
        continue;
      }
      
      const processedRecords = [];
      const invoiceGroups = {};
      
      // Group records by invoice number
      for (const record of records) {
        const invoiceNum = record.invoice_number;
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
          total: `SUBTOTAL - Invoice ${invoiceNum}`
        };
        processedRecords.push(subtotalRow);
        
        // Add subtotal amount row
        const subtotalAmountRow = {
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
          total: subtotal.toFixed(2)
        };
        processedRecords.push(subtotalAmountRow);
        
        // Add grand total with 10% markup row for this invoice
        const grandTotalWithMarkup = subtotal * 1.10;
        const grandTotalMarkupRow = {
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
          total: `GRAND TOTAL + 10% - Invoice ${invoiceNum}`
        };
        processedRecords.push(grandTotalMarkupRow);
        
        // Add grand total with markup amount row for this invoice
        const grandTotalMarkupAmountRow = {
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
          total: grandTotalWithMarkup.toFixed(2)
        };
        processedRecords.push(grandTotalMarkupAmountRow);
        
        // Add empty row for separation
        const emptyRow = {
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
          total: ''
        };
        processedRecords.push(emptyRow);
      }
      
      processedData[groupKey] = processedRecords;
    }
    
    return processedData;
  }

  // Write grouped data to separate CSV files
  async writeGroupedFiles(outputDir) {
    const csvWriterConfig = {
      path: '',
      header: [
        { id: 'invoice_number', title: 'Invoice Number' },
        { id: 'invoice_date', title: 'Invoice Date' },
        { id: 'company', title: 'Company' },
        { id: 'job_key', title: 'Job Key' },
        { id: 'reference_number', title: 'Reference Number' },
        { id: 'job_title', title: 'Job Title' },
        { id: 'location', title: 'Location' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'unit', title: 'Unit' },
        { id: 'average_cost', title: 'Average Cost' },
        { id: 'total', title: 'Total' }
      ]
    };

    const groups = [
      { key: 'everett', name: 'Everett' },
      { key: 'whittingham', name: 'Whittingham' },
      { key: 'mclain', name: 'McLain' },
      { key: 'others', name: 'Others' }
    ];

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Add summary rows to grouped data
    const processedGroupedData = this.addSummaryRows(this.groupedData);

    // Write each group to a separate CSV file
    for (const group of groups) {
      if (processedGroupedData[group.key].length > 0) {
        const outputPath = path.join(outputDir, `${group.name}_invoices.csv`);
        const writer = createCsvWriter({
          ...csvWriterConfig,
          path: outputPath
        });

        await writer.writeRecords(processedGroupedData[group.key]);
        console.log(`Created ${outputPath} with ${processedGroupedData[group.key].length} records (including summary rows)`);
      } else {
        console.log(`No records found for ${group.name} group - skipping file creation`);
      }
    }
  }

  // Main processing method
  async process(inputDir, outputDir = './output') {
    try {
      console.log('Starting invoice processing...\n');
      
      await this.processDirectory(inputDir);
      await this.writeGroupedFiles(outputDir);
      
      console.log('\nProcessing completed successfully!');
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
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
