import { useEffect } from 'react';

const Chatbot = () => {
    useEffect(() => {
        const script = document.createElement('script');
        script.type = 'module';
        // Use textContent to safely inject the module script
        script.textContent = `
            import Chatbot from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
            
            try {
                Chatbot.mount({
                    webhookUrl: 'https://themap.app.n8n.cloud/webhook/002f4683-030b-450d-a944-0cd77f23400c/chat',
                    mode: 'window',
                    target: '#n8n-chat-container'
                });
                console.log('n8n Chatbot mounted successfully');
            } catch (error) {
                console.error('n8n Chatbot mount error:', error);
            }
        `;

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div
            id="n8n-chat-container"
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 2147483647, // Max safe z-index to ensure it sits on top of everything
                pointerEvents: 'auto'
            }}
        />
    );
};

export default Chatbot;
