const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const fileInput = document.getElementById('fileInput');
const toggleVoiceResponseBtn = document.getElementById('toggleVoiceResponseBtn');
const newChatBtn = document.getElementById('newChatBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const chatHistoryList = document.getElementById('chatHistoryList');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userNameDisplay = document.getElementById('userNameDisplay');

let recognition;
let isListening = false;
let voiceResponseEnabled = true;
let chatHistory = [];
let currentChatId = Date.now();
let allChats = {};
let currentUser = null;
let micPermissionAsked = false;

// Initialize speech recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('Voice recognition started');
            isListening = true;
            voiceBtn.classList.add('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Recognized:', transcript);
            userInput.value = transcript;
            isListening = false;
            voiceBtn.classList.remove('listening');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            voiceBtn.classList.remove('listening');
            
            if (event.error === 'not-allowed' && !micPermissionAsked) {
                micPermissionAsked = true;
                alert('Microphone access denied. Please allow microphone access in your browser settings.');
            } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
                // Only show error for actual errors, not when user stops speaking
                console.log('Voice recognition error (non-critical):', event.error);
            }
        };

        recognition.onend = () => {
            console.log('Voice recognition ended');
            isListening = false;
            voiceBtn.classList.remove('listening');
        };
    } else {
        console.warn('Speech recognition not supported');
    }
}

initSpeechRecognition();

// User Authentication
function checkLogin() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
        loadAllChats();
    } else {
        showLoginModal();
    }
}

function showLoginModal() {
    loginModal.style.display = 'flex';
}

function hideLoginModal() {
    loginModal.style.display = 'none';
}

function showMainApp() {
    hideLoginModal();
    userNameDisplay.textContent = currentUser.name;
    document.querySelector('.app-container').style.display = 'flex';
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    // Get all users
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    
    // Check if user exists
    if (users[username]) {
        if (users[username].password === password) {
            // Login successful
            currentUser = { name: username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainApp();
            loadAllChats();
        } else {
            alert('Incorrect password');
        }
    } else {
        // New user - register
        users[username] = { password: password, createdAt: Date.now() };
        localStorage.setItem('users', JSON.stringify(users));
        
        currentUser = { name: username };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMainApp();
        loadAllChats();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        chatHistory = [];
        allChats = {};
        document.querySelector('.app-container').style.display = 'none';
        showLoginModal();
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

// Load all chats from localStorage (user-specific)
function loadAllChats() {
    if (!currentUser) return;
    
    const userChatsKey = `chats_${currentUser.name}`;
    const saved = localStorage.getItem(userChatsKey);
    if (saved) {
        allChats = JSON.parse(saved);
        updateChatHistoryUI();
        
        // Load most recent chat or create new one
        const chatIds = Object.keys(allChats).sort((a, b) => b - a);
        if (chatIds.length > 0) {
            currentChatId = chatIds[0];
            chatHistory = allChats[currentChatId];
            chatHistory.forEach(msg => {
                addMessage(msg.text, msg.sender, false);
            });
        }
    }
}

// Save all chats to localStorage (user-specific)
function saveAllChats() {
    if (!currentUser) return;
    
    allChats[currentChatId] = chatHistory;
    const userChatsKey = `chats_${currentUser.name}`;
    localStorage.setItem(userChatsKey, JSON.stringify(allChats));
    updateChatHistoryUI();
}

// Update chat history sidebar
function updateChatHistoryUI() {
    const historySection = chatHistoryList.querySelector('.history-section');
    const existingItems = chatHistoryList.querySelectorAll('.history-item');
    existingItems.forEach(item => item.remove());
    
    const chatIds = Object.keys(allChats).sort((a, b) => b - a);
    chatIds.forEach(chatId => {
        const chat = allChats[chatId];
        if (chat && chat.length > 0) {
            const firstUserMsg = chat.find(msg => msg.sender === 'user');
            const title = firstUserMsg ? firstUserMsg.text.substring(0, 30) + '...' : 'New chat';
            
            const item = document.createElement('div');
            item.className = 'history-item';
            if (chatId == currentChatId) item.classList.add('active');
            item.textContent = title;
            item.onclick = () => loadChat(chatId);
            
            chatHistoryList.appendChild(item);
        }
    });
}

// Load specific chat
function loadChat(chatId) {
    currentChatId = chatId;
    chatHistory = allChats[chatId] || [];
    chatMessages.innerHTML = '';
    
    if (chatHistory.length === 0) {
        chatMessages.innerHTML = '<div class="welcome-screen"><h1>What are you working on?</h1></div>';
    } else {
        chatHistory.forEach(msg => {
            addMessage(msg.text, msg.sender, false);
        });
    }
    
    updateChatHistoryUI();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

// Event listeners
sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

voiceBtn.addEventListener('click', toggleVoiceRecognition);
fileInput.addEventListener('change', handleFileUpload);

newChatBtn.addEventListener('click', () => {
    currentChatId = Date.now();
    chatHistory = [];
    chatMessages.innerHTML = '<div class="welcome-screen"><h1>What are you working on?</h1></div>';
    updateChatHistoryUI();
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

toggleVoiceResponseBtn.addEventListener('click', () => {
    voiceResponseEnabled = !voiceResponseEnabled;
    toggleVoiceResponseBtn.classList.toggle('active', voiceResponseEnabled);
    toggleVoiceResponseBtn.classList.toggle('inactive', !voiceResponseEnabled);
    toggleVoiceResponseBtn.textContent = voiceResponseEnabled ? '🔊' : '🔇';
});

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

function toggleVoiceRecognition() {
    if (!recognition) {
        if (!micPermissionAsked) {
            micPermissionAsked = true;
            alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
        }
        return;
    }

    if (isListening) {
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            if (!micPermissionAsked) {
                micPermissionAsked = true;
                alert('Could not start voice recognition. Please allow microphone access.');
            }
        }
    }
}

async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';

    showTypingIndicator();
    
    try {
        const response = await getAIResponse(message);
        removeTypingIndicator();
        addMessage(response, 'bot');
        if (voiceResponseEnabled) {
            speakResponse(response);
        }
    } catch (error) {
        removeTypingIndicator();
        const fallbackResponse = generateFallbackResponse(message);
        addMessage(fallbackResponse, 'bot');
        if (voiceResponseEnabled) {
            speakResponse(fallbackResponse);
        }
    }
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileInfo = `📎 Uploaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    addMessage(fileInfo, 'user');

    showTypingIndicator();
    
    // Read file content if it's text-based
    if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            const prompt = `I uploaded a file named "${file.name}". Here's the content:\n\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}\n\nCan you analyze this?`;
            
            try {
                const response = await getAIResponse(prompt);
                removeTypingIndicator();
                addMessage(response, 'bot');
                if (voiceResponseEnabled) {
                    speakResponse(response);
                }
            } catch (error) {
                removeTypingIndicator();
                addMessage(`I've received your file "${file.name}". It appears to be a text file with ${content.length} characters.`, 'bot');
            }
        };
        reader.readAsText(file);
    } else {
        setTimeout(async () => {
            const prompt = `I uploaded a ${file.type || 'file'} named "${file.name}" (${(file.size / 1024).toFixed(2)} KB). What can you tell me about this type of file?`;
            try {
                const response = await getAIResponse(prompt);
                removeTypingIndicator();
                addMessage(response, 'bot');
                if (voiceResponseEnabled) {
                    speakResponse(response);
                }
            } catch (error) {
                removeTypingIndicator();
                addMessage(getFileResponse(file), 'bot');
            }
        }, 500);
    }

    fileInput.value = '';
}

function addMessage(text, sender, saveToHistory = true) {
    // Remove welcome screen if exists
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'message-wrapper';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = sender === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    wrapperDiv.appendChild(avatarDiv);
    wrapperDiv.appendChild(contentDiv);
    messageDiv.appendChild(wrapperDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (saveToHistory) {
        chatHistory.push({ text, sender, timestamp: Date.now() });
        saveAllChats();
    }
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'message-wrapper';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = '🤖';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    wrapperDiv.appendChild(avatarDiv);
    wrapperDiv.appendChild(indicator);
    typingDiv.appendChild(wrapperDiv);
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// AI Response - Using API from config.js
async function getAIResponse(message) {
    // Get API key from config file
    const GEMINI_API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : null;
    const OPENAI_API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.OPENAI_API_KEY : null;
    const USE_API = typeof CONFIG !== 'undefined' ? CONFIG.USE_API : 'none';
    const DEBUG = typeof CONFIG !== 'undefined' ? CONFIG.DEBUG_MODE : false;
    
    // ============================================
    // 🔥 GEMINI API (Google - Free)
    // ============================================
    if (USE_API === 'gemini' && GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
        try {
            if (DEBUG) console.log('🔵 Calling Gemini API...');
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: message
                        }]
                    }]
                })
            });
            
            if (DEBUG) console.log('📡 API Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                if (DEBUG) console.log('📦 API Response data:', data);
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const aiResponse = data.candidates[0].content.parts[0].text;
                    if (DEBUG) console.log('✅ AI Response received!');
                    return aiResponse;
                }
            } else {
                const errorData = await response.json();
                console.error('❌ Gemini API Error:', errorData);
                
                // Show user-friendly error message
                if (errorData.error && errorData.error.message.includes('API key not valid')) {
                    return '⚠️ API Key Error: Your Gemini API key is invalid. Please check config.js and make sure you pasted the correct key from https://aistudio.google.com/app/apikey';
                } else if (errorData.error && errorData.error.message.includes('not found')) {
                    return '⚠️ API Not Enabled: Please enable the Generative Language API at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com';
                }
            }
        } catch (error) {
            console.error('❌ Gemini API error:', error);
        }
    }
    
    // ============================================
    // 🔥 OPENAI API (ChatGPT - Paid)
    // ============================================
    if (USE_API === 'openai' && OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE') {
        try {
            if (DEBUG) console.log('🔵 Calling OpenAI API...');
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are a helpful AI assistant.' },
                        ...chatHistory.slice(-6).map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.text
                        })),
                        { role: 'user', content: message }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7,
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (DEBUG) console.log('✅ OpenAI Response received!');
                return data.choices[0].message.content;
            } else {
                const errorData = await response.json();
                console.error('❌ OpenAI API Error:', errorData);
            }
        } catch (error) {
            console.error('❌ OpenAI API error:', error);
        }
    }
    
    // ============================================
    // FALLBACK: Enhanced built-in responses
    // ============================================
    if (DEBUG) console.log('💡 Using enhanced fallback response');
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    return generateEnhancedResponse(message);
}

// Enhanced fallback with better responses
function generateEnhancedResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for specific topics and provide detailed responses
    if (lowerMessage.includes('bmw') || lowerMessage.includes('car price')) {
        return `BMW car prices vary significantly based on the model and features:\n\n• BMW 3 Series: Starting around $42,000 - $55,000\n• BMW 5 Series: Starting around $55,000 - $75,000\n• BMW X3 SUV: Starting around $45,000 - $60,000\n• BMW X5 SUV: Starting around $60,000 - $85,000\n• BMW 7 Series: Starting around $90,000 - $150,000+\n\nPrices vary by country, trim level, and optional features. For exact pricing in your area, I recommend checking BMW's official website or visiting a local dealer.`;
    }
    
    if (lowerMessage.includes('president') && lowerMessage.includes('india')) {
        return `To become President of India, a person must meet these qualifications:\n\n1. Must be a citizen of India\n2. Must be at least 35 years of age\n3. Must be qualified to be a member of the Lok Sabha\n4. Must not hold any office of profit under the Government of India or any State Government\n\nThe President is elected by an electoral college consisting of elected members of both Houses of Parliament and elected members of the Legislative Assemblies of States and Union Territories. The term is 5 years.`;
    }
    
    if (lowerMessage.includes('artificial intelligence') || lowerMessage.includes('ai')) {
        return `Artificial Intelligence (AI) is the simulation of human intelligence by machines. Key aspects include:\n\n• Machine Learning: Systems that learn from data\n• Natural Language Processing: Understanding human language\n• Computer Vision: Interpreting visual information\n• Neural Networks: Brain-inspired computing models\n\nAI is used in virtual assistants, recommendation systems, autonomous vehicles, medical diagnosis, and many other applications. It's transforming industries by automating tasks and providing intelligent insights.`;
    }
    
    // Use the original fallback for other cases
    return generateFallbackResponse(message);
}

// Fallback response when API fails
function generateFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Greetings
    if (lowerMessage.match(/^(hello|hi|hey|greetings)/)) {
        return 'Hello! How can I assist you today?';
    }
    
    // Questions about the bot
    if (lowerMessage.includes('who are you') || lowerMessage.includes('what are you')) {
        return "I'm an AI assistant similar to ChatGPT. I can help answer questions, have conversations, analyze information, and assist with various tasks. What would you like to know?";
    }
    
    if (lowerMessage.includes('your name')) {
        return 'I am an AI Assistant, designed to help you with questions and tasks!';
    }
    
    // Current information
    if (lowerMessage.includes('time')) {
        return `The current time is ${new Date().toLocaleTimeString()}.`;
    }
    
    if (lowerMessage.includes('date') || lowerMessage.includes('today')) {
        return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }
    
    // Political/Current affairs
    if (lowerMessage.includes('pm of india') || lowerMessage.includes('prime minister of india')) {
        return 'As of my knowledge, Narendra Modi is the Prime Minister of India. He has been serving since May 2014. For the most current information, please check official government sources.';
    }
    
    if (lowerMessage.includes('president of') || lowerMessage.includes('who is pm')) {
        return "I can provide information about world leaders. Could you specify which country you're asking about?";
    }
    
    // Capabilities
    if (lowerMessage.includes('what can you do') || lowerMessage.includes('help')) {
        return "I can help you with:\n• Answering questions on various topics\n• Having conversations\n• Providing information and explanations\n• Analyzing uploaded files\n• Responding via voice\n• And much more! Just ask me anything.";
    }
    
    // Weather
    if (lowerMessage.includes('weather')) {
        return "I don't have access to real-time weather data, but I can help with many other questions!";
    }
    
    // Farewells
    if (lowerMessage.match(/(bye|goodbye|see you|farewell)/)) {
        return 'Goodbye! Feel free to come back anytime you need assistance. Have a great day!';
    }
    
    // How are you
    if (lowerMessage.includes('how are you')) {
        return "I'm functioning well, thank you for asking! How can I help you today?";
    }
    
    // Math/calculations
    if (lowerMessage.match(/\d+\s*[\+\-\*\/]\s*\d+/)) {
        try {
            const result = eval(lowerMessage.replace(/[^0-9+\-*/().]/g, ''));
            return `The answer is: ${result}`;
        } catch (e) {
            return "I can help with calculations. Could you rephrase your math question?";
        }
    }
    
    // Default intelligent response
    return `I understand you're asking about "${message}". While I'm an AI assistant that can help with many topics, I'd be happy to provide more specific information if you could elaborate on your question. What would you like to know?`;
}

function getFileResponse(file) {
    const fileType = file.type;
    
    if (fileType.startsWith('image/')) {
        return 'This appears to be an image file. I can see you uploaded an image!';
    } else if (fileType === 'application/pdf') {
        return 'This is a PDF document. I can confirm the file was uploaded successfully!';
    } else if (fileType.includes('text')) {
        return 'This is a text file. File received successfully!';
    } else {
        return 'File uploaded successfully! I can confirm I received it.';
    }
}

function speakResponse(text) {
    if ('speechSynthesis' in window && voiceResponseEnabled) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        speechSynthesis.speak(utterance);
    }
}

// Initialize app
window.addEventListener('load', () => {
    // Hide main app initially
    document.querySelector('.app-container').style.display = 'none';
    
    // Check if user is logged in
    checkLogin();
    
    // Show welcome screen if no chat history
    if (chatHistory.length === 0) {
        chatMessages.innerHTML = '<div class="welcome-screen"><h1>What are you working on?</h1></div>';
    }
});
