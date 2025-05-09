document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatForm = document.getElementById('chatForm');
    const fileInput = document.getElementById('fileInput');
    const themeToggle = document.getElementById('themeToggle');
    const suggestionButtons = document.querySelectorAll('.gpt-suggestion');
    const sidebarChats = document.querySelector('.sidebar-chats');
    const newChatBtn = document.querySelector('.sidebar-top .fa-message').closest('button');
    const menuBtn = document.querySelector('.sidebar-top .fa-bars').closest('button');
    const searchBtn = document.querySelector('.sidebar-top .fa-magnifying-glass').closest('button');
    const upgradeBtn = document.querySelector('.sidebar-upgrade');
    const userBtn = document.querySelector('.gpt-header-actions .fa-user').closest('button');

    let currentChatId = localStorage.getItem('chat_id') || null;

    // --- Theme logic ---
    function setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fa-regular fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-theme');
            themeToggle.innerHTML = '<i class="fa-regular fa-moon"></i>';
        }
        localStorage.setItem('theme', theme);
    }
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        setTheme(isDark ? 'light' : 'dark');
    });
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    } else {
        setTheme('light');
    }

    // --- Sidebar: Load and render chats ---
    async function loadSidebarChats() {
        sidebarChats.innerHTML = '';
        const res = await fetch('/api/chats');
        const data = await res.json();
        let today = true, prev = true;
        data.chats.forEach((chat, idx) => {
            // For demo, first chat is today, rest are previous 7 days
            if (idx === 0 && today) {
                sidebarChats.innerHTML += '<div class="sidebar-section-title">Today</div>';
                today = false;
            }
            if (idx === 1 && prev) {
                sidebarChats.innerHTML += '<div class="sidebar-section-title">Previous 7 Days</div>';
                prev = false;
            }
            const div = document.createElement('div');
            div.className = 'sidebar-chat-item' + (chat.id === currentChatId ? ' active' : '');
            div.innerHTML = '<i class="fa-regular fa-comments"></i> ' + (chat.title || 'New Chat');
            div.dataset.chatId = chat.id;
            div.addEventListener('click', () => {
                currentChatId = chat.id;
                localStorage.setItem('chat_id', currentChatId);
                document.querySelectorAll('.sidebar-chat-item').forEach(i => i.classList.remove('active'));
                div.classList.add('active');
                loadHistory();
            });
            sidebarChats.appendChild(div);
        });
    }

    // --- Chat history ---
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : ''}`;
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = marked.parse(content);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function clearMessages() {
        chatMessages.innerHTML = '';
    }
    async function loadHistory() {
        clearMessages();
        if (!currentChatId) return;
        try {
            const res = await fetch(`/api/history?chat_id=${currentChatId}`);
            const data = await res.json();
            if (data.history && data.history.length > 0) {
                data.history.forEach(msg => {
                    addMessage(msg.content, msg.role === 'user');
                });
            }
        } catch (e) {}
    }

    // --- New Chat ---
    async function createNewChat() {
        const res = await fetch('/api/chats', { method: 'POST' });
        const data = await res.json();
        currentChatId = data.chat_id;
        localStorage.setItem('chat_id', currentChatId);
        await loadSidebarChats();
        loadHistory();
        messageInput.value = '';
        messageInput.focus();
    }
    newChatBtn.addEventListener('click', createNewChat);

    // --- Send message ---
    async function sendMessage(e) {
        if (e) e.preventDefault();
        const message = messageInput.value.trim();
        if (!message || !currentChatId) return;
        addMessage(message, true);
        messageInput.value = '';
        const formData = new FormData();
        formData.append('message', message);
        formData.append('api_type', 'gemini'); // Default to Gemini for demo
        formData.append('api_key', localStorage.getItem('apiKey') || '');
        formData.append('gemini_model', localStorage.getItem('geminiModel') || 'models/gemini-2.5-pro-exp-03-25');
        formData.append('chat_id', currentChatId);
        if (fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.error) {
                addMessage(`Error: ${data.error}`);
            } else {
                addMessage(data.response);
            }
            await loadSidebarChats(); // Update chat titles
        } catch (error) {
            addMessage(`Error: ${error.message}`);
        }
    }
    chatForm.addEventListener('submit', sendMessage);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- Suggestions ---
    suggestionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.textContent.trim();
            messageInput.value = text;
            messageInput.focus();
        });
    });

    // --- File input label accessibility ---
    document.querySelector('label[for="fileInput"]').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            fileInput.click();
        }
    });

    // --- Menu/Search/Upgrade/User placeholders ---
    menuBtn.addEventListener('click', () => alert('Sidebar menu (future feature)'));
    searchBtn.addEventListener('click', () => alert('Search (future feature)'));
    upgradeBtn.addEventListener('click', () => window.open('https://openai.com/', '_blank'));
    userBtn.addEventListener('click', () => alert('User menu (future feature)'));

    // --- On load: ensure at least one chat exists ---
    (async () => {
        await loadSidebarChats();
        if (!currentChatId) {
            await createNewChat();
        } else {
            await loadHistory();
        }
    })();
}); 