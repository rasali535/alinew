const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');

const PROJECT = '1082337007365';
const LOCATION = 'us-central1';
const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const MODEL = 'gemini-2.0-flash';

async function test() {
    try {
        console.log('Testing Vertex AI with API Key...');
        const vertexAI = new VertexAI({
            project: PROJECT,
            location: LOCATION,
            googleAuthOptions: { apiKey: API_KEY }
        });

        const model = vertexAI.getGenerativeModel({
            model: MODEL,
        });

        console.log('Calling generateContent for model:', MODEL);
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
        });
        
        const responseText = result.response.candidates[0].content.parts[0].text;
        console.log('SUCCESS:', responseText);
        fs.writeFileSync('test_output.txt', 'SUCCESS: ' + responseText);
    } catch (err) {
        console.error('ERROR:', err);
        fs.writeFileSync('test_output.txt', 'ERROR: ' + (err.stack || err.message));
    }
}

test();
