document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const messagesBox = document.getElementById('messages-box');
    const messagesList = document.getElementById('messages-list');
    const typingIndicator = document.getElementById('typing-indicator');
    const welcomeCard = document.getElementById('welcome-card');
    const clearBtn = document.getElementById('clear-btn');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');

    // Create a dynamic sidebar overlay for mobile screens
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Initial conversation history state
    let conversationHistory = [];

    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Toggle Sidebar on mobile
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    menuToggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Sidebar Interactive Buttons (Sets input list prompts)
    const sidebarInteractiveItems = [
        { id: 'btn-nastar', prompt: 'Bisa jelaskan detail menu Nastar Premium Aulia Cake Cookies dan harganya?' },
        { id: 'btn-kastengel', prompt: 'Bisa jelaskan detail tentang Kastengel Gurih dan bagaimana pengirimannya?' },
        { id: 'btn-snackbox', prompt: 'Saya mau pesan Custom Snack Box untuk acara kantor. Bagaimana pilihan isi dan harganya?' },
        { id: 'btn-hampers', prompt: 'Apa saja paket Hampers Hari Raya yang tersedia sekarang?' }
    ];

    sidebarInteractiveItems.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.addEventListener('click', () => {
                chatInput.value = item.prompt;
                chatInput.focus();
                // Close sidebar on mobile if clicked
                if (window.innerWidth <= 900) {
                    toggleSidebar();
                }
            });
        }
    });

    // Clear Chat / Reset functionality
    clearBtn.addEventListener('click', () => {
        if (confirm('Apakah Kakak ingin mengatur ulang percakapan ini?')) {
            messagesList.innerHTML = '';
            conversationHistory = [];
            welcomeCard.style.display = 'block';
            chatInput.value = '';
            chatInput.focus();
            scrollToBottom();
        }
    });

    // Handle suggestion chip clicks in Welcome Card
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.quick-chip');
        if (chip) {
            const prompt = chip.getAttribute('data-prompt');
            sendUserMessage(prompt);
        }
    });

    // Form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        sendUserMessage(text);
    });

    // Send User Message
    async function sendUserMessage(text) {
        // Hide welcome card on first message
        welcomeCard.style.display = 'none';

        // 1. Add User Message to UI
        addMessageToUI('user', text);

        // 2. Add to history
        conversationHistory.push({ role: 'user', text: text });

        // 3. Show typing indicator
        showTyping(true);
        scrollToBottom();

        try {
            // 4. Send Request to express API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversation: conversationHistory
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error status: ${response.status}`);
            }

            const data = await response.json();
            
            // Hide typing indicator
            showTyping(false);

            // 5. Add AI Reply to UI & History
            const replyText = data.result;
            addMessageToUI('model', replyText);
            conversationHistory.push({ role: 'model', text: replyText });

        } catch (error) {
            console.error('Fetch error:', error);
            showTyping(false);
            
            // Render error bubble in DOM
            addMessageToUI('error', `Aduh Kak, sepertinya sambungan internet atau server kami sedang sibuk nih. Silakan coba lagi sebentar ya Kak! Atau hubungi kami langsung di WA WhatsApp: 08975625700. ❤️`);
        }

        scrollToBottom();
    }

    // Append Message wrapper and bubble to list
    function addMessageToUI(sender, text) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${sender}`;

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = `${sender}-avatar`;
        avatar.innerHTML = sender === 'model' ? '👩‍🍳' : (sender === 'user' ? '👤' : '⚠️');
        wrapper.appendChild(avatar);

        // Bubble
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        if (sender === 'model') {
            bubble.innerHTML = parseMarkdown(text);
        } else {
            // User message is plain text to prevent XSS
            const p = document.createElement('p');
            p.textContent = text;
            bubble.appendChild(p);
        }

        wrapper.appendChild(bubble);
        messagesList.appendChild(wrapper);
        scrollToBottom();
    }

    // Toggle typing indicator visibility
    function showTyping(visible) {
        if (visible) {
            // Ensure typing element is placed at the very bottom
            messagesList.appendChild(typingIndicator);
            typingIndicator.style.display = 'flex';
        } else {
            typingIndicator.style.display = 'none';
        }
    }

    // Scroll chat area to the bottom safely
    function scrollToBottom() {
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    // Simple robust helper to convert AI Markdown bullets, bold formatting and linebreaks to clean HTML
    function parseMarkdown(text) {
        if (!text) return '';

        // Escape original HTML to avoid XSS injection
        let escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 1. Process block bold text: **text** -> <strong>text</strong>
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 2. Process bulleted list lines: Starts with " - " or " * " or "-" or "*"
        const lines = escaped.split('\n');
        let inList = false;
        let htmlResult = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            // Match leading bullet chars
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (!inList) {
                    htmlResult.push('<ul>');
                    inList = true;
                }
                const content = trimmed.substring(2);
                htmlResult.push(`<li>${content}</li>`);
            } else if (trimmed.startsWith('• ')) {
                if (!inList) {
                    htmlResult.push('<ul>');
                    inList = true;
                }
                const content = trimmed.substring(2);
                htmlResult.push(`<li>${content}</li>`);
            } else {
                if (inList) {
                    htmlResult.push('</ul>');
                    inList = false;
                }
                htmlResult.push(`<p>${line}</p>`);
            }
        });

        if (inList) {
            htmlResult.push('</ul>');
        }

        return htmlResult.join('');
    }
});
