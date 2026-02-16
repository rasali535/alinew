import { VertexAI } from '@google-cloud/vertexai';
import { config } from './src/config/index.js';

console.log('Testing Gemini/Vertex AI initialization...');
console.log('Project:', config.gemini.projectId);
console.log('Location:', config.gemini.location);

async function run() {
    try {
        const vertexAI = new VertexAI({
            project: config.gemini.projectId,
            location: config.gemini.location,
        });
        console.log('VertexAI initialized.');

        const model = vertexAI.getGenerativeModel({
            model: config.gemini.model,
        });
        console.log('Model initialized.');

        console.log('Calling generateContent...');
        const result = await model.generateContent('Hello');
        console.log('Response:', JSON.stringify(result.response));
    } catch (error) {
        console.error('FAILED:', error);
    }
}

run();
