// =============================================
// 🕵️ AI OSINT ASSISTANT - LÓGICA PRINCIPAL
// =============================================

// ----- SYSTEM PROMPT DE OSINT -----
// Edite este texto para mudar o comportamento da IA!
const SYSTEM_PROMPT = `Você é "OSINT-BR", um assistente especializado em OSINT (Open Source Intelligence) e investigações digitais de fontes abertas.

## SUAS REGRAS:
1. Responda SEMPRE em português do Brasil.
2. Foque exclusivamente em técnicas de OSINT legítimas e legais.
3. NUNCA ajude com atividades ilegais: hacking, Invasão em sistemas, ou acesso não autorizado a sistemas.
4. Se o usuário pedir algo ilegal ou antiético, responda:
   "⚠️ Essa solicitação está fora do escopo ético do OSINT. Posso ajudar com técnicas legais de investigação de fontes abertas."
5. Sempre cite metodologias e, quando possível, fontes reconhecidas (Bellingcat, SANS, OWASP, etc.).
6. Sugira ferramentas legítimas e conhecidas: Maltego, Shodan, theHarvester, Recon-ng, SpiderFoot, ExifTool, etc.
7. Classifique técnicas por dificuldade: 🟢 Básico | 🟡 Intermediário | 🔴 Avançado.
8. Inclua avisos legais quando relevante (LGPD, Marco Civil da Internet, GDPR).
9. Se não souber algo com certeza, diga honestamente — NUNCA invente URLs, ferramentas ou dados.
10. Use formatação clara: títulos, listas, passos numerados e blocos de código quando necessário.

## SUAS ÁREAS DE EXPERTISE:
- Geolocalização de imagens e vídeos
- Análise de metadados (EXIF, XMP, IPTC)
- Enumeração de subdomínios e reconhecimento de rede
- Busca de usernames e perfis em redes sociais (SOCMINT)
- Análise de WHOIS, DNS e certificados SSL
- OSINT em dark web
- Verificação de deepfakes e desinformação
- Análise de dados públicos governamentais
- Técnicas de busca avançada (Google Dorks, Bing, etc.)
- Investigação de criptomoedas e blockchain
- Análise de metadados de documentos (PDF, Office)
- Correlação de dados e construção de grafos de relacionamento`;


// ----- ELEMENTOS DO DOM -----
const configScreen   = document.getElementById('config-screen');
const chatScreen     = document.getElementById('chat-screen');
const apiUrlSelect   = document.getElementById('api-url');
const apiKeyInput    = document.getElementById('api-key');
const modelNameInput = document.getElementById('model-name');
const saveConfigBtn  = document.getElementById('save-config');
const openConfigBtn  = document.getElementById('open-config');
const clearChatBtn   = document.getElementById('clear-chat');
const chatMessages   = document.getElementById('chat-messages');
const chatForm       = document.getElementById('chat-form');
const userInput      = document.getElementById('user-input');
const sendBtn        = document.getElementById('send-btn');


// ----- ESTADO -----
let conversationHistory = [];


// ----- INICIALIZAÇÃO -----
function init() {
    const savedKey = localStorage.getItem('osint_api_key');
    const savedUrl = localStorage.getItem('osint_api_url');
    const savedModel = localStorage.getItem('osint_model');

    if (savedKey) {
        apiKeyInput.value = savedKey;
        showChat();
    }

    if (savedUrl) apiUrlSelect.value = savedUrl;
    if (savedModel) modelNameInput.value = savedModel;
}


// ----- NAVEGAÇÃO -----
function showChat() {
    configScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    userInput.focus();
}

function showConfig() {
    chatScreen.classList.add('hidden');
    configScreen.classList.remove('hidden');
}


// ----- SALVAR CONFIGURAÇÃO -----
saveConfigBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
        alert('Por favor, insira sua API Key.');
        return;
    }

    localStorage.setItem('osint_api_key', key);
    localStorage.setItem('osint_api_url', apiUrlSelect.value);
    localStorage.setItem('osint_model', modelNameInput.value.trim());

    showChat();
});


// ----- BOTÕES DO HEADER -----
openConfigBtn.addEventListener('click', showConfig);

clearChatBtn.addEventListener('click', () => {
    if (confirm('Limpar toda a conversa?')) {
        conversationHistory = [];
        chatMessages.innerHTML = '';
        addSystemMessage('🔄 Conversa limpa. Como posso ajudar?');
    }
});


// ----- ADICIONAR MENSAGENS AO CHAT -----
function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = formatText(content);
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'message system';
    div.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing';
    div.id = 'typing-indicator';
    div.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    chatMessages.appendChild(div);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// ----- FORMATAÇÃO SIMPLES DE TEXTO -----
function formatText(text) {
    return text
        // Blocos de código
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Código inline
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Negrito
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Itálico
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Quebras de linha
        .replace(/\n/g, '<br>');
}


// ----- ENVIAR MENSAGEM -----
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = userInput.value.trim();
    if (!text) return;

    // Adiciona mensagem do usuário
    addMessage('user', text);
    userInput.value = '';
    sendBtn.disabled = true;

    // Adiciona ao histórico
    conversationHistory.push({ role: 'user', content: text });

    // Mostra indicador de digitação
    addTypingIndicator();

    try {
        const apiUrl = localStorage.getItem('osint_api_url');
        const apiKey = localStorage.getItem('osint_api_key');
        const model  = localStorage.getItem('osint_model') || 'gpt-4o-mini';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...conversationHistory
                ],
                max_tokens: 2048,
                temperature: 0.7
            })
        });

        removeTypingIndicator();

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || `Erro HTTP ${response.status}`;
            throw new Error(errorMsg);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // Adiciona resposta ao histórico e ao chat
        conversationHistory.push({ role: 'assistant', content: reply });
        addMessage('assistant', reply);

    } catch (error) {
        removeTypingIndicator();
        addMessage('error', `❌ Erro: ${error.message}`);
        // Remove a última mensagem do usuário do histórico (falhou)
        conversationHistory.pop();
    }

    sendBtn.disabled = false;
    userInput.focus();
});


// ----- INICIAR -----
init();
