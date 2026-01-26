// Production entry point for Hostinger
// This file simply delegates to the actual backend server

// Ensure we are running in the correct context
process.chdir(__dirname);

// Require the backend server
require('./backend/server.js');
