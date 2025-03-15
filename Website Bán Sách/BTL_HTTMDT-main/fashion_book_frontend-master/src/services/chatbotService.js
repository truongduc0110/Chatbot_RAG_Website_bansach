import axios from 'axios';

const CHATBOT_API_URL = 'http://127.0.0.1:8000'; // LLM server URL

const chatbotService = {
    sendMessage: async (message, context = []) => {
        try {
            const response = await axios.post(`${CHATBOT_API_URL}/chat`, {
                prompt: message,
                context: context, // Send context messages to the server
                max_tokens: 50,
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            return response.data;
        } catch (error) {
            console.error('Error communicating with chatbot:', error);
            throw error;
        }
    }
};

export default chatbotService;