const { VertexAI } = require('@google-cloud/vertexai');

const PROJECT = '1082337007365';
const LOCATION = 'us-central1';
const API_KEY = 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';
const MODEL = 'gemini-2.0-flash-001';

async function test() {
    try {
        console.log('Testing Vertex AI with API Key directly...');
        const vertexAI = new VertexAI({
            project: PROJECT,
            location: LOCATION,
            googleAuthOptions: { apiKey: API_KEY }
        });

        const model = vertexAI.getGenerativeModel({
            model: MODEL,
        });

        console.log('Calling generateContent...');
        const result = await model.generateContent('Hello');
        console.log('Response Success!');
        console.log(JSON.stringify(result.response, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

test();
