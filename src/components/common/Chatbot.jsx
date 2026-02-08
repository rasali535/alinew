import { useEffect } from 'react';

const Chatbot = () => {
    useEffect(() => {
        // Create script element
        const script = document.createElement('script');
        script.type = 'module';
        // Inject the exact module import and mount code
        script.innerHTML = `
            import Chatbot from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
            
            Chatbot.mount({
                webhookUrl: 'https://themap.app.n8n.cloud/webhook/002f4683-030b-450d-a944-0cd77f23400c/chat',
                mode: 'window', // or 'fullscreen'
            });
        `;

        // Append to body
        document.body.appendChild(script);

        // Cleanup: remove script on unmount
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // This component renders nothing itself
    return null;
};

export default Chatbot;
