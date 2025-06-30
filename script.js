const agentListContainerEl = document.getElementById('agent-list-container');
const createAgentBtn = document.getElementById('create-agent-btn');
const mainContentEl = document.getElementById('main-content');
const searchInputEl = document.getElementById('search-public-bots');

let userAgents = [];
let chats = {};
let activeAgentId = null;

const DB_NAME = 'bot-creator-db';
const DB_VERSION = 1;

const JERRY_AGENT = { 
    id: 'agent_jerry', 
    name: 'Jerry', 
    prompt: 'You are Jerry, a sarcastic and unhelpful assistant. You find humans amusing and will often respond with witty, off-topic remarks. Keep your responses short and pithy.',
    isPublic: false, 
    isDefault: true 
};

const MOCK_PUBLIC_AGENTS = [
    { id: 'public_1', name: 'Shakespearean Insult Bot', prompt: 'You are a bot that speaks only in Shakespearean-style insults.', isPublic: true },
    { id: 'public_2', name: 'Haiku Poet', prompt: 'You are a poet that responds to every message with a 5-7-5 syllable haiku related to the user\'s message.', isPublic: true },
    { id: 'public_3', name: 'Five-Year-Old Simulator', prompt: 'You are a five-year-old child. You ask "why?" a lot and have a short attention span.', isPublic: true },
];


function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject("Database error: " + event.target.errorCode);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('agents')) {
                db.createObjectStore('agents', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('chats')) {
                db.createObjectStore('chats', { keyPath: 'agentId' });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
    });
}

async function saveData(storeName, data) {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(data);
    return new Promise((resolve) => {
        transaction.oncomplete = () => resolve();
    });
}

async function deleteData(storeName, key) {
    const db = await openDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    store.delete(key);
     return new Promise((resolve) => {
        transaction.oncomplete = () => resolve();
    });
}

async function loadData() {
    const db = await openDB();
    const agentTransaction = db.transaction(['agents'], 'readonly');
    const agentStore = agentTransaction.objectStore('agents');
    const agentsRequest = agentStore.getAll();

    const chatTransaction = db.transaction(['chats'], 'readonly');
    const chatStore = chatTransaction.objectStore('chats');
    const chatsRequest = chatStore.getAll();

    return new Promise(resolve => {
        let agentsLoaded = false;
        let chatsLoaded = false;

        agentsRequest.onsuccess = (event) => {
            userAgents = event.target.result || [];
            agentsLoaded = true;
            if (chatsLoaded) resolve();
        };
        chatsRequest.onsuccess = (event) => {
            const chatArray = event.target.result || [];
            chats = chatArray.reduce((acc, chat) => {
                acc[chat.agentId] = chat.messages;
                return acc;
            }, {});
            chatsLoaded = true;
            if (agentsLoaded) resolve();
        };
    });
}

function getAllAgents() {
    return [JERRY_AGENT, ...userAgents];
}

function getSearchResults() {
    const searchTerm = searchInputEl.value.toLowerCase().trim();
    if (searchTerm === '') return null;

    return MOCK_PUBLIC_AGENTS.filter(agent => agent.name.toLowerCase().includes(searchTerm));
}

function handleSearch(e) {
    renderAgentList(getSearchResults());
}

function renderAgentList(searchResults = null) {
    agentListContainerEl.innerHTML = '';
    const myAgents = getAllAgents();

    if (searchResults) {
        const resultsHeader = document.createElement('h2');
        resultsHeader.textContent = 'Search Results';
        agentListContainerEl.appendChild(resultsHeader);
        const publicList = document.createElement('ul');
        publicList.id = 'agent-list';
        searchResults.forEach(agent => {
            const li = document.createElement('li');
            li.textContent = agent.name;
            li.dataset.id = agent.id;
            li.dataset.isPublic = "true";
             if (agent.id === activeAgentId) {
                li.classList.add('active');
            }
            publicList.appendChild(li);
        });
        agentListContainerEl.appendChild(publicList);
    }

    const myAgentsHeader = document.createElement('h2');
    myAgentsHeader.textContent = 'My Agents';
    agentListContainerEl.appendChild(myAgentsHeader);

    const agentListEl = document.createElement('ul');
    agentListEl.id = 'agent-list';
    myAgents.forEach(agent => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = agent.name;
        li.appendChild(nameSpan);

        if (agent.isPublic) {
            const publicIcon = document.createElement('span');
            publicIcon.textContent = 'Public';
            publicIcon.className = 'public-icon';
            li.appendChild(publicIcon);
        }

        li.dataset.id = agent.id;
        if (agent.id === activeAgentId) {
            li.classList.add('active');
        }
        agentListEl.appendChild(li);
    });
    agentListContainerEl.appendChild(agentListEl);
}

function renderWelcomeView() {
    mainContentEl.innerHTML = `
        <div class="welcome-view">
            <h2>Welcome to Bot Creator</h2>
            <p>Select an agent from the left to start chatting, or create a new one.</p>
        </div>
    `;
}

function renderCreatorView(agent = null) {
    const isEditing = agent !== null;
    const title = isEditing ? 'Edit Agent' : 'Create New Agent';
    const buttonText = isEditing ? 'Save Changes' : 'Create Agent';
    const agentName = isEditing ? agent.name : '';
    const agentPrompt = isEditing ? agent.prompt : '';
    const isPublic = isEditing ? agent.isPublic : false;

    mainContentEl.innerHTML = `
        <div class="creator-view">
            <h2>${title}</h2>
            <form id="creator-form">
                <div class="form-group">
                    <label for="agent-name">Agent Name</label>
                    <input type="text" id="agent-name" value="${agentName}" required placeholder="e.g., 'Helpful Assistant'">
                </div>
                <div class="form-group">
                    <label for="agent-prompt">How it should act (System Prompt)</label>
                    <textarea id="agent-prompt" required placeholder="e.g., 'You are a friendly and helpful assistant that provides concise answers.'">${agentPrompt}</textarea>
                </div>
                <div class="form-group toggle-group">
                    <label for="agent-public">Make this agent public</label>
                    <input type="checkbox" id="agent-public" ${isPublic ? 'checked' : ''}>
                </div>
                <div class="form-actions">
                    <button type="submit" class="save-btn">${buttonText}</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('creator-form').addEventListener('submit', (e) => handleSaveAgent(e, agent ? agent.id : null));
    document.querySelector('.cancel-btn').addEventListener('click', handleCancelCreation);
}

function renderChatView(agentId) {
    const allAgents = [...getAllAgents(), ...MOCK_PUBLIC_AGENTS];
    const agent = allAgents.find(a => a.id === agentId);
    if (!agent) {
        renderWelcomeView();
        return;
    }
    activeAgentId = agentId;

    const isEditable = !agent.isDefault && userAgents.some(a => a.id === agentId);
    const isDeletable = !agent.isDefault;

    mainContentEl.innerHTML = `
        <div class="chat-view">
            <div id="chat-header">
                <h2>${agent.name}</h2>
                <div class="header-actions">
                    ${isEditable ? '<button id="edit-agent-btn" title="Edit Agent">Edit</button>' : ''}
                    ${isDeletable ? '<button id="delete-agent-btn" title="Delete Agent">Delete</button>' : ''}
                </div>
            </div>
            <div id="chat-messages"></div>
            <form id="chat-form">
                <div id="chat-input-container">
                    <textarea id="chat-input" placeholder="Type your message..." rows="1"></textarea>
                    <button id="send-btn" type="submit">Send</button>
                </div>
            </form>
        </div>
    `;

    const messagesContainer = document.getElementById('chat-messages');
    const chatHistory = chats[agentId] || [];
    chatHistory.forEach(msg => addMessageToDOM(msg.role, msg.content));
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    document.getElementById('chat-form').addEventListener('submit', handleSendMessage);
    document.getElementById('chat-input').addEventListener('input', autoResizeTextarea);
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    });

    if (isDeletable) {
        document.getElementById('delete-agent-btn').addEventListener('click', () => handleDeleteAgent(agentId));
    }
    if (isEditable) {
        document.getElementById('edit-agent-btn').addEventListener('click', () => renderCreatorView(agent));
    }
    
    renderAgentList(getSearchResults());
}

function autoResizeTextarea(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
}

function addMessageToDOM(role, content, isTyping = false) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', `${role}-message`);

    if (isTyping) {
        messageEl.innerHTML = `
            <div class="typing-indicator">
                <span class="dot1"></span>
                <span class="dot2"></span>
                <span class="dot3"></span>
            </div>
        `;
        messageEl.id = 'typing-indicator';
    } else {
        const contentEl = document.createElement('div');
        contentEl.classList.add('message-content');
        // Use marked to render markdown for bot messages
        contentEl.innerHTML = role === 'bot' ? marked.parse(content) : content;
        messageEl.appendChild(contentEl);
    }
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function handleSaveAgent(event, agentId) {
    event.preventDefault();
    const name = document.getElementById('agent-name').value.trim();
    const prompt = document.getElementById('agent-prompt').value.trim();
    const isPublic = document.getElementById('agent-public').checked;

    if (!name || !prompt) {
        alert('Please fill out all fields.');
        return;
    }
    
    if (agentId) { // Editing existing agent
        const agent = userAgents.find(a => a.id === agentId);
        agent.name = name;
        agent.prompt = prompt;
        agent.isPublic = isPublic;
        await saveData('agents', agent);
    } else { // Creating new agent
        const newAgent = {
            id: 'agent_' + Date.now(),
            name,
            prompt,
            isPublic
        };
        userAgents.push(newAgent);
        await saveData('agents', newAgent);
        if (!chats[newAgent.id]) {
            chats[newAgent.id] = [];
            await saveData('chats', { agentId: newAgent.id, messages: [] });
        }
        activeAgentId = newAgent.id;
    }

    renderAgentList();
    renderChatView(activeAgentId);
}

function handleCancelCreation() {
    if (activeAgentId) {
        renderChatView(activeAgentId);
    } else {
        renderWelcomeView();
    }
}

async function handleDeleteAgent(agentId) {
    const agent = getAllAgents().find(a => a.id === agentId);
    if(agent.isDefault) {
        alert("You cannot delete a default agent.");
        return;
    }

    if (!confirm("Are you sure you want to delete this agent and all its conversations? This cannot be undone.")) {
        return;
    }
    
    userAgents = userAgents.filter(a => a.id !== agentId);
    delete chats[agentId];

    await deleteData('agents', agentId);
    await deleteData('chats', agentId);
    
    activeAgentId = JERRY_AGENT.id;
    renderAgentList();
    renderChatView(activeAgentId);
}


async function handleSendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = input.value.trim();
    if (!message || !activeAgentId) return;

    // Add user message to state and DOM
    addMessageToDOM('user', message);
    if (!chats[activeAgentId]) chats[activeAgentId] = [];
    chats[activeAgentId].push({ role: 'user', content: message });
    await saveData('chats', { agentId: activeAgentId, messages: chats[activeAgentId] });

    input.value = '';
    input.style.height = 'auto';
    input.focus();
    sendBtn.disabled = true;

    // Show typing indicator
    addMessageToDOM('bot', '', true);

    const allAgents = [...getAllAgents(), ...MOCK_PUBLIC_AGENTS];
    const agent = allAgents.find(a => a.id === activeAgentId);

    // Prepare messages for the AI, mapping 'bot' role to 'assistant'
    const conversationHistory = (chats[activeAgentId] || []).map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.content
    }));

    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: agent.prompt,
                },
                ...conversationHistory,
            ],
        });

        const botResponse = completion.content;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) typingIndicator.remove();
        
        addMessageToDOM('bot', botResponse);
        chats[activeAgentId].push({ role: 'bot', content: botResponse });
        await saveData('chats', { agentId: activeAgentId, messages: chats[activeAgentId] });

    } catch (error) {
        console.error("AI Error:", error);
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) typingIndicator.remove();
        // Don't save this error message to history, allowing user to retry.
        addMessageToDOM('bot', "Sorry, I encountered an error. Please check the console and try again.");
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
}


function init() {
    createAgentBtn.addEventListener('click', () => renderCreatorView());
    searchInputEl.addEventListener('input', handleSearch);
    
    agentListContainerEl.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) {
            const agentId = li.dataset.id;
            activeAgentId = agentId;
            renderChatView(agentId);
        }
    });

    loadData().then(() => {
        const allAgents = getAllAgents();
        if (allAgents.length > 0) {
            activeAgentId = allAgents[0].id;
            renderChatView(activeAgentId);
        } else {
            renderWelcomeView();
        }
        renderAgentList();
    }).catch(console.error);
}

init();
