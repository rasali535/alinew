const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const genAI = new GoogleGenerativeAI(API_KEY);

async function list() {
    try {
        console.log('Listing models...');
        // Standard endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        fs.writeFileSync('test_output.txt', JSON.stringify(data, null, 2));
        console.log('SUCCESS');
    } catch (err) {
        console.error('ERROR:', err);
        fs.writeFileSync('test_output.txt', 'ERROR: ' + (err.stack || err.message));
    }
}

list();
