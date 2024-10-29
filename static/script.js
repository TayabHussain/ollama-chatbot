// Define global variables at the start
let isWaitingForResponse = false;
let currentChatId = null;
let chats = [];

// Define all functions before any event listeners
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (message === '' || isWaitingForResponse) return;
    
    addMessage(message, true);
    input.value = '';
    
    setLoading(true);
    
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        setLoading(false);
        if (data.error) {
            addMessage('Error: ' + data.error);
        } else {
            addMessage(data.response);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        setLoading(false);
        addMessage('Error: Something went wrong. Please try again.');
    });
}

function setLoading(loading) {
    isWaitingForResponse = loading;
    const input = document.getElementById('user-input');
    const button = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    
    input.disabled = loading;
    button.disabled = loading;
    
    const loadingDiv = document.getElementById('loading-indicator');
    if (loading) {
        if (!loadingDiv) {
            const newLoadingDiv = document.createElement('div');
            newLoadingDiv.id = 'loading-indicator';
            newLoadingDiv.className = 'message bot-message loading';
            newLoadingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
            chatMessages.appendChild(newLoadingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } else {
        loadingDiv?.remove();
    }
}

function startNewChat() {
    const newChat = {
        id: Date.now(),
        title: 'New Chat',
        messages: []
    };
    chats.unshift(newChat);
    saveChats();
    updateChatHistory();
    loadChat(newChat.id);
}

function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

function loadChats() {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
        chats = JSON.parse(savedChats);
        updateChatHistory();
    }
    if (chats.length === 0) {
        startNewChat();
    } else {
        loadChat(chats[0].id);
    }
}

function updateChatHistory() {
    const historyContainer = document.getElementById('chat-history');
    historyContainer.innerHTML = '';
    
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = chat.title;
        item.appendChild(titleSpan);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-chat';
        deleteButton.innerHTML = '🗑️';
        deleteButton.onclick = (e) => deleteChat(e, chat.id);
        item.appendChild(deleteButton);
        
        item.onclick = () => loadChat(chat.id);
        historyContainer.appendChild(item);
    });
}

function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    chat.messages.forEach(msg => addMessage(msg.content, msg.isUser, false));
    
    updateChatHistory();
}

function deleteChat(event, chatId) {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this chat?')) {
        return;
    }
    
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return;
    
    chats.splice(chatIndex, 1);
    saveChats();
    
    if (chatId === currentChatId) {
        if (chats.length > 0) {
            loadChat(chats[0].id);
        } else {
            startNewChat();
        }
    } else {
        updateChatHistory();
    }
}

function addMessage(message, isUser = false, save = true) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (save && currentChatId) {
        const chat = chats.find(c => c.id === currentChatId);
        if (chat) {
            chat.messages.push({ content: message, isUser });
            saveChats();
            if (isUser && chat.messages.length === 1) {
                updateChatTitle(currentChatId, message);
            }
        }
    }
}

function updateChatTitle(chatId, message) {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title === 'New Chat') {
        chat.title = message.slice(0, 30) + (message.length > 30 ? '...' : '');
        updateChatHistory();
        saveChats();
    }
}

// Wait for the DOM to be fully loaded before adding event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize buttons
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('new-chat-btn').addEventListener('click', startNewChat);
    
    // Initialize Enter key functionality
    document.getElementById('user-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Load existing chats
    loadChats();
});

// Add these functions to your script.js

function downloadChatHistory() {
    const data = {
        exportDate: new Date().toISOString(),
        chats: chats,
        totalChats: chats.length,
        totalMessages: chats.reduce((total, chat) => total + chat.messages.length, 0)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('Are you sure you want to delete all chat history? This cannot be undone.')) {
        localStorage.clear();
        chats = [];
        currentChatId = null;
        updateChatHistory();
        document.getElementById('chat-messages').innerHTML = '';
    }
}

function getDataStats() {
    const stats = {
        totalChats: chats.length,
        totalMessages: chats.reduce((total, chat) => total + chat.messages.length, 0),
        storageUsed: new Blob([JSON.stringify(chats)]).size / 1024, // Size in KB
        lastModified: localStorage.getItem('lastModified') || 'Never'
    };
    return stats;
}

// Add this to your script.js

function updateDataStats() {
    const stats = getDataStats();
    const statsContainer = document.getElementById('data-stats');
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span>Chats:</span>
            <span>${stats.totalChats}</span>
        </div>
        <div class="stat-item">
            <span>Messages:</span>
            <span>${stats.totalMessages}</span>
        </div>
        <div class="stat-item">
            <span>Storage Used:</span>
            <span>${stats.storageUsed.toFixed(2)} KB</span>
        </div>
        <div class="stat-item">
            <span>Last Modified:</span>
            <span>${new Date().toLocaleString()}</span>
        </div>
    `;
}

// Add this to your existing functions
function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('lastModified', new Date().toISOString());
    updateDataStats();  // Update stats after saving
}

// Update initialization
document.addEventListener('DOMContentLoaded', () => {
    // ... existing initialization code ...
    
    // Initialize stats
    updateDataStats();
});