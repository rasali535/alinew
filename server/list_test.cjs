const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const genAI = new GoogleGenerativeAI(API_KEY);

async function check() {
    try {
        console.log('Listing available models for this key...');
        // getGenerativeModel has no listModels, but we can try to find where it is
        // In @google/generative-ai, listModels is not directly on genAI.
        // Actually, you might need to use the REST API to list models if using a simple key
        
        // Let's try to see if gemini-pro works
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent('Hi');
        console.log('SUCCESS with gemini-1.5-pro');
    } catch (err) {
        console.error('PRO ERROR:', err.message);
    }
}

check();
