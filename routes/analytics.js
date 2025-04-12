// Import the express module
const express = require('express');

// Create a router object to define routes
const router = express.Router();

// Import the Analytics model (handles DB queries)
const Analytics = require('../models/analytics');

// Import the auth middleware to protect routes
const auth = require('../middleware/auth');

// Import pdfkit to generate PDF files
const PDFDocument = require('pdfkit');

// Import ExcelJS to generate Excel and CSV files
const ExcelJS = require('exceljs');

// Import fs (file system module), although not used here
const fs = require('fs');


// ------------------------- SALES TRENDS ROUTE -------------------------

// Define a GET route for sales trends, protected by auth middleware
router.get('/sales-trends', auth, (req, res) => {
    // Get startDate, endDate, and format from query parameters
    const { startDate, endDate, format } = req.query;

    // If startDate or endDate is missing, return an error
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get sales trends data from the database using the user's branch
    Analytics.getSalesTrends(req.user.branch, startDate, endDate, (err, results) => {
        // If there's a database error, return 500 with error message
        if (err) return res.status(500).json({ error: err.message });

        // If no format is given, return the data as JSON
        if (!format) {
            return res.json(results);
        }

        // Decide how to return the data based on format
        switch (format.toLowerCase()) {
            case 'pdf': // Return as PDF
                generatePDF(res, 'Sales Trends', results, ['sale_date', 'total_sales', 'total_tonnage']);
                break;
            case 'csv': // Return as CSV
            case 'excel': // Return as Excel
                generateExcel(res, 'Sales Trends', results, ['sale_date', 'total_sales', 'total_tonnage'], format);
                break;
            default: // Format not supported
                res.status(400).json({ error: 'Invalid format. Use pdf, csv, or excel' });
        }
    });
});


// ------------------------- STOCK TURNOVER ROUTE -------------------------

// Define a GET route for stock turnover, also protected by auth
router.get('/stock-turnover', auth, (req, res) => {
    const { startDate, endDate, format } = req.query;

    // Validate required query parameters
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get stock turnover data from the database
    Analytics.getStockTurnover(req.user.branch, startDate, endDate, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        // Return JSON if no format specified
        if (!format) {
            return res.json(results);
        }

        // Decide format to return
        switch (format.toLowerCase()) {
            case 'pdf':
                generatePDF(res, 'Stock Turnover', results, ['produce_name', 'total_sold']);
                break;
            case 'csv':
            case 'excel':
                generateExcel(res, 'Stock Turnover', results, ['produce_name', 'total_sold'], format);
                break;
            default:
                res.status(400).json({ error: 'Invalid format. Use pdf, csv, or excel' });
        }
    });
});


// ------------------------- PROFIT MARGINS ROUTE -------------------------

// Define a GET route for profit margins, also with auth protection
router.get('/profit-margins', auth, (req, res) => {
    const { startDate, endDate, format } = req.query;

    // Make sure required fields are provided
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get profit margin data from the database
    Analytics.getProfitMargins(req.user.branch, startDate, endDate, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        // If no format is given, send JSON
        if (!format) {
            return res.json(results);
        }

        // Handle format
        switch (format.toLowerCase()) {
            case 'pdf':
                generatePDF(res, 'Profit Margins', results, ['produce_name', 'total_profit', 'total_cost']);
                break;
            case 'csv':
            case 'excel':
                generateExcel(res, 'Profit Margins', results, ['produce_name', 'total_profit', 'total_cost'], format);
                break;
            default:
                res.status(400).json({ error: 'Invalid format. Use pdf, csv, or excel' });
        }
    });
});


// ------------------------- PDF GENERATION FUNCTION -------------------------

// Creates and sends a PDF document
function generatePDF(res, title, data, columns) {
    const doc = new PDFDocument(); // Create a new PDF document

    // Set the response headers to treat it as a PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(' ', '-')}.pdf"`);

    doc.pipe(res); // Pipe the PDF to the response
    doc.fontSize(16).text(title, { align: 'center' }); // Title of the report
    doc.moveDown(); // Add space

    // Table headers
    let y = 100;
    const xStart = 50;
    columns.forEach((col, index) => {
        doc.fontSize(12).text(col.replace('_', ' ').toUpperCase(), xStart + (index * 150), y);
    });

    // Table rows
    y += 20;
    data.forEach(row => {
        columns.forEach((col, index) => {
            doc.fontSize(10).text(row[col] || 'N/A', xStart + (index * 150), y);
        });
        y += 20;
    });

    doc.end(); // Finish the PDF
}


// ------------------------- EXCEL / CSV GENERATION FUNCTION -------------------------

// Creates and sends an Excel or CSV file
function generateExcel(res, title, data, columns, format) {
    const workbook = new ExcelJS.Workbook(); // Create a workbook
    const worksheet = workbook.addWorksheet(title); // Add a worksheet

    // Define column headers
    worksheet.columns = columns.map(col => ({
        header: col.replace('_', ' ').toUpperCase(), // Format header
        key: col, // Key to match with data
        width: 20 // Column width
    }));

    // Add the data rows
    worksheet.addRows(data);

    // If user wants CSV
    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(' ', '-')}.csv"`);
        workbook.csv.write(res).then(() => res.end()); // Write CSV and end response
    } else {
        // For Excel (.xlsx)
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(' ', '-')}.xlsx"`);
        workbook.xlsx.write(res).then(() => res.end()); // Write Excel and end response
    }
}


// Export the router so it can be used in other parts of the app
module.exports = router;
