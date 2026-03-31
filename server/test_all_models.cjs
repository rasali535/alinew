const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const genAI = new GoogleGenerativeAI(API_KEY);

const models = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-pro', 'gemini-1.5-flash'];

async function test() {
    let output = '';
    for (const modelName of models) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
            const result = await model.generateContent('Hi');
            output += `MODEL ${modelName}: SUCCESS - ${result.response.text()}\n`;
        } catch (err) {
            output += `MODEL ${modelName}: FAILED - ${err.message}\n`;
        }
    }
    fs.writeFileSync('test_results_all.txt', output);
}

test();
