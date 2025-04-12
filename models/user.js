// Import the database connection from the config folder
const db = require('../config/db');

// Import bcryptjs library for hashing passwords
const bcrypt = require('bcryptjs');

// Define the User object to hold user-related operations
const User = {
    // Method to create a new user
    create: (userData, callback) => {
        // Hash the user's password before saving it to the database (10 is the salt rounds)
        const hashedPassword = bcrypt.hashSync(userData.password, 10);

        // SQL query to insert a new user into the users table
        const query = 'INSERT INTO users (username, password, role, branch) VALUES (?, ?, ?, ?)';

        // Execute the query with user data (hashed password for security)
        db.query(query, [
            userData.username,        // The username of the new user
            hashedPassword,           // The securely hashed password
            userData.role,            // Role of the user (e.g., admin, agent)
            userData.branch           // Branch the user is assigned to
        ], callback);                 // Callback to handle result or error
    },
    
    // Method to find a user by their username
    findByUsername: (username, callback) => {
        // SQL query to select user by username
        const query = 'SELECT * FROM users WHERE username = ?';

        // Execute the query with the provided username
        db.query(query, [username], callback); // Callback handles result or error
    }
};

// Export the User object so it can be used in other parts of the app
module.exports = User;
