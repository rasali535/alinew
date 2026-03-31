const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    try {
        console.log('Testing with gemini-2.0-flash-exp...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await model.generateContent('Hello');
        const text = result.response.text();
        fs.writeFileSync('test_output.txt', 'SUCCESS (2.0-flash-exp): ' + text);
    } catch (err) {
        fs.appendFileSync('test_output.txt', '\nERROR (2.0-flash-exp): ' + (err.stack || err.message));
    }
}

test();
