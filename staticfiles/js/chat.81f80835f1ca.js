// 初始化本地存储
const chatHistory = {
    init() {
        this.histories = JSON.parse(localStorage.getItem('chatHistories')) || [];
        this.currentHistoryId = localStorage.getItem('currentHistoryId');
        
        if (!this.currentHistoryId) {
            this.createNewHistory();
        }
    },
    
    createNewHistory() {
        const historyId = Date.now().toString();
        const newHistory = {
            id: historyId,
            messages: [],
            createdAt: new Date().toISOString()
        };
        
        this.histories.push(newHistory);
        this.currentHistoryId = historyId;
        this.save();
    },
    
    addMessage(role, content) {//真的需要这个功能？
        const history = this.histories.find(h => h.id === this.currentHistoryId);
        if (history) {
            history.messages.push({
                role,
                content,
                timestamp: new Date().toISOString()
            });
            this.save();
        }
    },
    
    deleteHistory(historyId) {
        this.histories = this.histories.filter(h => h.id !== historyId);
        if (this.currentHistoryId === historyId) {
            this.createNewHistory();
        }
        this.save();
        this.renderHistoryList();
    },
    
    save() {
        localStorage.setItem('chatHistories', JSON.stringify(this.histories));
        localStorage.setItem('currentHistoryId', this.currentHistoryId);
    },

    renderHistoryList() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        this.histories.forEach(history => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <span>${new Date(history.createdAt).toLocaleString()}</span>
                <button class="delete-btn" data-id="${history.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            if (history.id === this.currentHistoryId) {
                item.classList.add('active');
            }
            
            historyList.appendChild(item);
        });
    },
    
    loadCurrentHistory() {
        const history = this.histories.find(h => h.id === this.currentHistoryId);
        if (history) {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '';
            history.messages.forEach(msg => {
                updateChat(msg.role, msg.content);
            });
        }
    }
};

const commands = [
    { 
      label: "中-英-德互译", 
      content: "请自动帮我检测单引号中内容的语言（中文，英文，德语中的一种），并自动翻译成另外两种语言并给出该对应语言的例句以及例句的中文翻译。按照以下格式输出：\n检测到的语言：中文 \n**翻译：** \n* **英文:** stapler \n* **例句:** I need a stapler to fasten these papers together. 我需要一个订书机来把这些纸订在一起。\n* **德文:** Hefter \n* **例句:** Der Hefter ist kaputt. 订书机坏了。",
      placeholder: "请输入要翻译的文本..."
    },
    {
      label: "德语故事",
      content: "请根据单引号中的关键词帮我用德语写一个A1-B1水平的故事，主题围绕关键词，并以我为第一视角。故事需要简单易懂，情节完整，并自然地包含与关键词相关的词汇和表达方式。 请避免使用复杂的语法结构和生僻词汇。 故事长度大约为300字。 每句德语结束后（以句号或者问号等符号为结束标志），请在这句德语的下面另起一行提供相应的中文（不需要英文的）翻译以便帮助我理解。另外，在故事结束后提供一些你认为重点的词汇和短语，并给出2个例句及其中文翻译，以便我更好地理解其含义和用法。请严格按照输出指令来输出。", 
      placeholder: "请输入故事关键词..."
    },
    {
      label: "德语对话",
      content: "请根据单引号中的关键词帮我用德语写一个A1-B1水平的对话（其他人（Lukas或Linda）问，我（Herr Li）回答），主题围绕关键词。对话需要简单易懂（如果可能，请偏向日常口语化而非书面化），情节完整，并自然地包含与关键词相关的词汇和表达方式。 请避免使用复杂的语法结构和生僻词汇。 对话长度大约为300字。 每句德语结束后（以句号或者问号等符号为结束标志），请在这句德语的下面另起一行提供相应的中文（不需要英文的）翻译以便帮助我理解。另外，在故事结束后提供一些你认为重点的词汇和短语，并给出2个例句及其中文翻译，以便我更好地理解其含义和用法。请严格按照输出指令来输出。",
      placeholder: "请输入对话关键词..."
    },
    {
      label: "中译德",
      content: "请将单引号中的中文短文翻译成德语，翻译水平应为A1-B1，避免使用生僻词汇和复杂的语法结构。 在每句中文下面一行附上对应的德语句子。请严格按照输出指令来输出。",
      placeholder: "请输入要翻译的中文..."
    },
    {
      label: "词汇精讲",
      content: "单引号中的是上面文章（对话）中的一些词汇，我不理解其含义和用法。请用简明易懂的【中文】解释它们的含义，并尽可能提供德语例句（例句难度控制在A1-B1水平）来说明其在不同语境下的用法。如果某个词有多种含义，请分别解释。",
      placeholder: "请输入要解释的词汇..."
    },
    {
      label: "其他",
      content: "\n请用中文回答单引号内的内容。",
      placeholder: "这里可以随便输入点什么..."
    }
  ];


  let activeButton = null;
  // 创建按钮
  function createCommandButtons(commands) {
    const buttonContainer = document.getElementById('commandButtons');
    
    commands.forEach(command => {
      if (command.label === '--') return;
      
      const button = document.createElement('button');
      button.className = 'command-button';
      button.textContent = command.label;
      button.addEventListener('click', () => {
        // 取消其他按钮的激活状态
        document.querySelectorAll('.command-button').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // 设置当前按钮为激活状态
        button.classList.add('active');
        activeButton = command;
        
        // 更新输入框的 placeholder
        userInput.placeholder = command.placeholder;
      });
      buttonContainer.appendChild(button);
    });
  }

// 消息发送和接收
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
sendButton.addEventListener('click', ()=> {// 使用 addEventListener
    const userText = userInput.value.trim();
    if (!activeButton){
        alert('请先选择一个功能按钮！');
        return;
    }
    if (!userText){
        alert('请输入内容！');
        userInput.focus();//设置焦点
        return;//阻止发送
    }
    let symbol = "'"
    const fullCommand = symbol + userText + symbol + activeButton.content;
    sendMessage(userText, fullCommand);

    // 清空输入框但保持按钮状态
    userInput.value = '';
}); 

// 添加回车发送功能
userInput.addEventListener('keydown', (event)=>{
    if (event.key ==='Enter'&&!event.shiftKey){
        event.preventDefault();
        sendButton.click();
    }
});


async function sendMessage(keywords, fullCommand) {
    const userText = keywords.trim();
    updateChat('user', userText);

    // 添加“思考中”的消息
    const tmpMessage = updateChat('ai', '思考中，请等待...');

    const chatToken = document.getElementById('chat_token').value; 
  
            
    const csrftoken = document.querySelector('[name="csrfmiddlewaretoken"]').value; // 正确的querySelector
    try {
        const response = await fetch('chat/', { // 发送到chat视图
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify({ message: fullCommand, token: chatToken}),
            credentials: 'same-origin'
        });

        if (!response.ok) {
            //const errorText = await response.text();
            //throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
            const errorData = await response.json(); // 解析错误响应
            const errorMessage = errorData.error || "未知错误"; // 获取错误信息
            tmpMessage.remove();
            updateChat('ai', errorMessage); // 将错误信息显示在聊天框中
            //alert("错误: " + errorMessage); // 弹出警告框显示错误
            return;
        }

        const result = await response.json();
        tmpMessage.remove();
        updateChat('ai', result.response); // 将错误信息显示在聊天框中
        //userInput.value = ''; //清空输入框
    } catch (error) {
        tmpMessage.remove();
        console.error("发送消息时出现错误:", error); //将错误信息输出到浏览器控制台，以便调试
        updateChat('ai', `错误: ${error.message || error}`); // 显示更友好的错误信息
    }
}


//更新消息框
const chatMessages = document.getElementById("chatMessages");
const chatSection = document.getElementById("chatSection");
function updateChat(role, text) {
    const message = document.createElement("div");
    message.classList.add("message", role);
    
    if (role === 'ai') {
      // 解析文本中的德语内容
      const html = marked.parse(text);
      message.innerHTML = html;
      
      // 为德语文本添加播放按钮
      const germanSentences = message.querySelectorAll('p, li');
      germanSentences.forEach(element => {
        const text = element.textContent;
        if (text.match(/[äöüßÄÖÜ]|[a-zA-Z]/)) { // 简单判断是否包含德语字符
          const playButton = document.createElement('button');
          playButton.className = 'play-button';
          playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
          let utterance = null;

          playButton.addEventListener('click', () => {
            if (speechSynthesis.speaking && !speechSynthesis.paused) {
              speechSynthesis.cancel();
              playButton.classList.remove('stop');
              playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            } else {
              utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = 'de-DE';
              utterance.onend = () => {
                playButton.classList.remove('stop');
                playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
              };
              speechSynthesis.speak(utterance);
              playButton.classList.add('stop');
              playButton.innerHTML = '<i class="fas fa-stop"></i>';
            }
          });
          //element.appendChild(playButton); 暂时不添加语音播放按钮
        }
      });
    } else {
      //message.textContent = text;
      const html = marked.parse(text);
      message.innerHTML = html;
    }

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;//返回message元素
  }




// 初始化
document.addEventListener('DOMContentLoaded', () => {
    chatHistory.init();
    createCommandButtons(commands)
    // ... 其他初始化代码
}); 


// Scroll to Top button functionality (chatMessages)
document.getElementById("scrollTopButton").addEventListener("click", () => {
    chatMessages.scrollTo({ top: 0, behavior: "smooth" });
  });

// Scroll to Bottom button functionality (chatMessages)
document.getElementById("scrollBottomButton").addEventListener("click", () => {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  });


  
/*
// 消息懒加载
const messageLoader = {
    init() {
        this.page = 1;
        this.loading = false;
        this.observer = new IntersectionObserver(this.handleIntersection.bind(this));
        this.observeMessages();
    },
 
    observeMessages() {
        const messages = document.querySelectorAll('.message');
        if (messages.length > 0) {
            this.observer.observe(messages[0]);
        }
    },
    
    async handleIntersection(entries) {
        const entry = entries[0];
        if (entry.isIntersecting && !this.loading) {
            this.loading = true;
            await this.loadMoreMessages();
            this.loading = false;
        }
    },
    
    async loadMoreMessages() {
        try {
            const response = await fetch(`/api/messages/?page=${this.page}`);
            const data = await response.json();
            if (data.messages.length > 0) {
                this.page++;
                this.renderMessages(data.messages);
            }
        } catch (error) {
            console.error('加载消息失败:', error);
        }
    }
};*/
