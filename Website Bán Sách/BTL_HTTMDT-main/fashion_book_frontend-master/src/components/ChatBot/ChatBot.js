import React, { useState, useEffect, useRef } from 'react';
import chatbotService from '../../services/chatbotService';
import './ChatBot.css';

const ChatBot = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);
    
    // Suggestions for quick responses
    const suggestions = [
        'Giờ mở cửa?',
        'Chính sách đổi trả?',
        'Sách bán chạy?',
        'Tôi muốn đặt hàng.'
    ];

    // Check if speech recognition is supported
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setSpeechSupported(true);
            
            // Initialize speech recognition
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'vi-VN'; // Set language to Vietnamese
            
            // Set up event handlers
            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputMessage(transcript);
                // Optional: automatically submit after voice recognition
                setTimeout(() => {
                    handleSubmit({ preventDefault: () => {} });
                }, 500);
            };
            
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
            
            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };
        }
    }, []);

    // Initial greeting message when chat opens
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setTimeout(() => {
                setMessages([
                    { 
                        text: 'Xin chào! Tôi là trợ lý ảo siêu thông minh của Hiệu sách. Cần giúp gì không người đẹp?', 
                        sender: 'bot',
                        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    }
                ]);
            }, 500);
        }
        
        // Focus input when chat opens
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const toggleSpeechRecognition = () => {
        if (!speechSupported) return;
        
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error('Speech recognition error:', error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;
    
        const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const userMessage = { 
            text: inputMessage, 
            sender: 'user',
            time: currentTime
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);
    
        try {
            // Get the last 2 messages for context (if they exist)
            const contextMessages = messages.slice(-2).map(msg => ({
                text: msg.text,
                sender: msg.sender
            }));
            
            // Slight delay to show typing indicator
            setTimeout(async () => {
                try {
                    const response = await chatbotService.sendMessage(
                        userMessage.text,
                        contextMessages
                    );
                    
                    setIsTyping(false);
                    const botMessage = { 
                        text: response.response || response.text || response.message || 'Tôi không hiểu câu hỏi của bạn.', 
                        sender: 'bot',
                        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                    
                    setMessages(prev => [...prev, botMessage]);
                } catch (error) {
                    console.error('Error getting bot response:', error);
                    setIsTyping(false);
                    const errorMessage = { 
                        text: 'Xin lỗi, hiện tại tôi đang gặp sự cố khi trả lời.', 
                        sender: 'bot',
                        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                    setMessages(prev => [...prev, errorMessage]);
                }
            }, 1500);
        } catch (error) {
            console.error('Error in chat submission:', error);
            setIsTyping(false);
        }
    };
    
    const handleSuggestionClick = (suggestion) => {
        setInputMessage(suggestion);
        // Optional: automatically submit the suggestion
        // handleSubmit({ preventDefault: () => {} });
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const formatMessage = (text) => {
        // Convert URLs to clickable links
        return text.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
    };

    return (
        <div className="chatbot-container">
            <button 
                className="chatbot-toggle" 
                onClick={toggleChat}
                aria-label={isOpen ? "Close chat" : "Open chat"}
            >
                {isOpen ? '×' : '💬'}
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-header-content">
                            <div className="chatbot-avatar">🤖</div>
                            <div>
                                <h3>Trợ lý Hiệu sách</h3>
                                <div className="chatbot-status">
                                    <div className="status-dot"></div>
                                    <span>Đang hoạt động</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="chatbot-messages">
                        {messages.map((message, index) => (
                            <div 
                                key={index} 
                                className={`message ${message.sender}`}
                            >
                                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}></div>
                                <div className="message-time">{message.time}</div>
                            </div>
                        ))}
                        
                        {isTyping && (
                            <div className="typing-indicator">
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="chatbot-suggestions">
                        {suggestions.map((suggestion, index) => (
                            <div 
                                key={index} 
                                className="suggestion-chip"
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                    
                    <form onSubmit={handleSubmit} className="chatbot-input-form">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Nhập câu hỏi của bạn..."
                            ref={inputRef}
                        />
                        <button 
                            type="button" 
                            className={`voice-button ${isListening ? 'listening' : ''}`}
                            onClick={toggleSpeechRecognition}
                            disabled={!speechSupported}
                            title={speechSupported ? "Nhấn để nói" : "Trình duyệt của bạn không hỗ trợ nhận diện giọng nói"}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 19v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        <button type="submit">
                            Gửi
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatBot;