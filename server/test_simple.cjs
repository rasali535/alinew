const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    try {
        console.log('Testing AI Studio SDK...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hello');
        console.log('RES:', result.response.text());
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

test();
