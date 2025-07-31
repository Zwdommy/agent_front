document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    
    // 添加发送消息的事件监听器
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 发送消息
    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        
        // 添加用户消息到聊天界面
        addMessage('user', message);
        
        // 清空输入框
        userInput.value = '';
        
        // 显示加载指示器
        addLoadingIndicator();
        
        // 发送请求到后端
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误');
            }
            return response.json();
        })
        .then(data => {
            // 移除加载指示器
            removeLoadingIndicator();
            
            // 添加AI回复
            addMessage('assistant', data.message);
            
            // 滚动到底部
            scrollToBottom();
        })
        .catch(error => {
            // 移除加载指示器
            removeLoadingIndicator();
            
            // 显示错误信息
            addMessage('system', '发生错误: ' + error.message);
            console.error('发送消息错误:', error);
        });
    }
    
    // 向聊天窗口添加消息
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + role;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 支持多行文本
        const paragraphs = content.split('\n');
        paragraphs.forEach(paragraph => {
            if (paragraph.trim() !== '') {
                const p = document.createElement('p');
                p.textContent = paragraph;
                contentDiv.appendChild(p);
            }
        });
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        scrollToBottom();
    }
    
    // 添加加载指示器
    function addLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant loading';
        loadingDiv.id = 'loadingIndicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = '思考中...';
        
        loadingDiv.appendChild(contentDiv);
        chatMessages.appendChild(loadingDiv);
        scrollToBottom();
    }
    
    // 移除加载指示器
    function removeLoadingIndicator() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
    
    // 滚动聊天窗口到底部
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}); 