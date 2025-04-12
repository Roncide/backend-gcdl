// Import the database connection from the config folder
const db = require('../config/db');

// Define the Sale object to hold sales-related operations
const Sale = {
    // Method to insert a new sale record into the database
    create: (saleData, callback) => {
        // SQL query to insert a new row into the sales table
        const query = `INSERT INTO sales 
            (produce_name, tonnage, amount_paid, buyer_name, sales_agent, date, buyer_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        // Execute the query with actual values from saleData
        db.query(query, [
            saleData.produce_name,     // Name of the produce sold
            saleData.tonnage,          // Quantity in tons
            saleData.amount_paid,      // Amount received
            saleData.buyer_name,       // Name of the buyer
            saleData.sales_agent,      // Sales agent handling the sale
            saleData.date,             // Date of the sale
            saleData.buyer_contact     // Contact details of the buyer
        ], callback);                  // Callback to handle result or error
    },
    
    // Method to get all sales for a specific branch
    getAll: (branch, callback) => {
        // SQL query to select all sales where the branch matches
        const query = 'SELECT * FROM sales WHERE branch = ?';

        // Execute the query with the branch parameter
        db.query(query, [branch], callback); // Callback handles the result or error
    }
};

// Export the Sale object so it can be used in other parts of the app
module.exports = Sale;
