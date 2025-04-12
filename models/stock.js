// Import the database connection from the config folder
const db = require('../config/db');

// Define the Stock object to hold stock-related operations
const Stock = {
    // Method to add new stock or update existing stock when procurement happens
    updateStockFromProcurement: (procurementData, callback) => {
        // SQL query to insert new stock or update tonnage if the produce already exists in the same branch
        const query = `
            INSERT INTO stock (produce_name, branch, tonnage)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE tonnage = tonnage + VALUES(tonnage)
        `;
        // Execute the query using values from procurementData
        db.query(query, [
            procurementData.produce_name,  // Name of the produce procured
            procurementData.branch,        // Branch where stock is being updated
            procurementData.tonnage        // Amount being added to stock
        ], callback);                      // Callback to handle result or error
    },

    // Method to reduce stock when a sale is made
    updateStockFromSale: (saleData, callback) => {
        // SQL query to subtract sold tonnage from the current stock, but only if enough stock is available
        const query = `
            UPDATE stock 
            SET tonnage = tonnage - ?
            WHERE produce_name = ? AND branch = ? AND tonnage >= ?
        `;
        // Execute the query using values from saleData
        db.query(query, [
            saleData.tonnage,          // Amount to reduce from stock
            saleData.produce_name,     // Name of the produce sold
            saleData.branch,           // Branch where the sale happened
            saleData.tonnage           // Ensure enough stock is available
        ], callback);                  // Callback to handle result or error
    },

    // Method to fetch the current stock levels for a specific branch
    getStock: (branch, callback) => {
        // SQL query to select all stock records for the given branch
        const query = 'SELECT * FROM stock WHERE branch = ?';

        // Execute the query with the branch name
        db.query(query, [branch], callback); // Callback handles the result or error
    }
};

// Export the Stock object so it can be used in other parts of the app
module.exports = Stock;
