const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    try {
        console.log('Testing with v1beta explicit...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hello');
        const text = result.response.text();
        fs.writeFileSync('test_output.txt', 'SUCCESS: ' + text);
    } catch (err) {
        fs.writeFileSync('test_output.txt', 'ERROR: ' + err.stack || err.message);
    }
}

test();
