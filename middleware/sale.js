const db = require('../config/db');

const Sale = {
    create: (saleData, callback) => {
        const query = `INSERT INTO sales 
            (produce_name, tonnage, amount_paid, buyer_name, sales_agent, date, buyer_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(query, [
            saleData.produce_name,
            saleData.tonnage,
            saleData.amount_paid,
            saleData.buyer_name,
            saleData.sales_agent,
            saleData.date,
            saleData.buyer_contact
        ], callback);
    },
    
    getAll: (branch, callback) => {
        const query = 'SELECT * FROM sales WHERE branch = ?';
        db.query(query, [branch], callback);
    }
};

module.exports = Sale;