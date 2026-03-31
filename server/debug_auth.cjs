const { GoogleAuth } = require('google-auth-library');
require('dotenv').config();

async function check() {
    console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    try {
        const auth = new GoogleAuth();
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        console.log('Successfully got client. Project ID:', projectId);
    } catch (err) {
        console.error('Auth error:', err);
    }
}

check();
