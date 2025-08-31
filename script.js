// Global Variables
let currentBudget = '';
let isEditing = false;
let budgetHistory = JSON.parse(localStorage.getItem('budgetHistory') || '[]');
let savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '{}');
let autoSaveInterval;
let confirmCallback = null;
let isDarkMode = false;

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    createParticles();
    loadSampleData();
    updateProgress();
    loadBudgetHistory();
    loadTemplatesList();
    addBudgetItem();
    setupAutoSave();
    setupTheme();
}

function setupEventListeners() {
    document.addEventListener('input', updateProgress);
    document.addEventListener('change', updateProgress);
    document.addEventListener('keydown', handleKeyboardShortcuts);
    document.addEventListener('click', handleModalOutsideClick);
    document.addEventListener('input', calculateItemsTotal);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 's':
                e.preventDefault();
                if (isEditing) {
                    saveBudget();
                } else {
                    saveTemplate();
                }
                break;
            case 'p':
                e.preventDefault();
                printBudget();
                break;
            case 'Enter':
                if (e.shiftKey) {
                    e.preventDefault();
                    generateBudget();
                }
                break;
        }
    }
    
    if (e.key === 'Escape') {
        closeAllModals();
    }
}

function handleModalOutsideClick(e) {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
}

function createParticles() {
    const particles = document.getElementById('particles');
    particles.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute w-1 h-1 bg-white/20 rounded-full';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 3 + 's';
        particle.style.animation = 'float 6s ease-in-out infinite';
        particles.appendChild(particle);
    }
}

function setupTheme() {
    isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateThemeIcon();
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        isDarkMode = event.matches;
        updateThemeIcon();
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    updateThemeIcon();
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('#themeToggle i');
    themeIcon.className = isDarkMode ? 'fas fa-moon text-xl' : 'fas fa-sun text-xl';
}

function setupAutoSave() {
    autoSaveInterval = setInterval(() => {
        autoSaveFormData();
    }, 30000);
}

function autoSaveFormData() {
    const formData = collectFormData();
    localStorage.setItem('autoSavedData', JSON.stringify({
        data: formData,
        timestamp: new Date().toISOString()
    }));
    
    showToast('Dados salvos automaticamente', 'info');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tab + 'Content').classList.remove('hidden');
    document.getElementById(tab + 'Tab').classList.add('active');
    
    updateProgress();
}

function updateProgress() {
    const fields = [
        'companyName', 'companyEmail', 'clientName', 'clientEmail', 
        'serviceType', 'projectDescription', 'projectValue', 'projectDeadline'
    ];
    
    let filledFields = 0;
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element && element.value.trim()) {
            filledFields++;
        }
    });
    
    const progress = (filledFields / fields.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressPercentage').textContent = Math.round(progress) + '%';
    
    let progressText = '';
    if (progress === 0) {
        progressText = 'Preencha os dados para começar';
    } else if (progress < 50) {
        progressText = 'Continue preenchendo os dados...';
    } else if (progress < 100) {
        progressText = 'Quase pronto! Preencha os campos restantes';
    } else {
        progressText = 'Perfeito! Pronto para gerar o orçamento';
    }
    
    document.getElementById('progressText').textContent = progressText;
}

function addBudgetItem() {
    const container = document.getElementById('budgetItems');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'budget-item flex gap-2 items-center bg-white/5 p-3 rounded-lg';
    
    itemDiv.innerHTML = `
        <div class="input-group flex-1">
            <input type="text" placeholder="Descrição do item" 
                   class="form-input text-sm" style="padding-left: 1rem;">
        </div>
        <div class="input-group w-20">
            <input type="number" placeholder="Qtd" min="1" value="1"
                   class="form-input text-sm text-center" style="padding-left: 1rem;">
        </div>
        <div class="input-group w-24">
            <input type="number" placeholder="Valor" min="0" step="0.01"
                   class="form-input text-sm text-center" style="padding-left: 1rem;">
        </div>
        <button onclick="removeBudgetItem(this)" class="text-red-400 hover:text-red-300 p-2 rounded transition-colors" title="Remover item">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(itemDiv);
    calculateItemsTotal();
}

function removeBudgetItem(button) {
    button.closest('.budget-item').remove();
    calculateItemsTotal();
}

function calculateItemsTotal() {
    let total = 0;
    document.querySelectorAll('.budget-item').forEach(item => {
        const quantity = parseFloat(item.querySelector('input[type="number"]:nth-of-type(1)').value) || 0;
        const value = parseFloat(item.querySelector('input[type="number"]:nth-of-type(2)').value) || 0;
        total += quantity * value;
    });
    
    document.getElementById('itemsTotal').textContent = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

function fillSampleData(type) {
    if (type === 'company') {
        document.getElementById('companyName').value = 'TechSolutions Pro Ltda';
        document.getElementById('companyPhone').value = '(11) 99999-8888';
        document.getElementById('companyEmail').value = 'contato@techsolutions.pro';
        document.getElementById('companyAddress').value = 'Rua das Inovações, 123 - São Paulo/SP';
        document.getElementById('companyCNPJ').value = '12.345.678/0001-90';
    } else if (type === 'client') {
        document.getElementById('clientName').value = 'João Silva Santos';
        document.getElementById('clientPhone').value = '(11) 88888-7777';
        document.getElementById('clientEmail').value = 'joao.silva@empresaabc.com.br';
        document.getElementById('clientCompany').value = 'Empresa ABC Inovações Ltda';
    }
    updateProgress();
    showToast('Dados de exemplo carregados!', 'success');
}

function loadSampleData() {
    if (!localStorage.getItem('autoSavedData')) {
        document.getElementById('companyName').value = 'TechSolutions Pro';
        document.getElementById('companyEmail').value = 'contato@techsolutions.pro';
        document.getElementById('clientName').value = 'João Silva';
        document.getElementById('clientEmail').value = 'joao@empresa.com';
        document.getElementById('projectDescription').value = 'Desenvolvimento de website institucional responsivo com sistema de gerenciamento de conteúdo.';
        document.getElementById('projectValue').value = '2500';
        document.getElementById('projectDeadline').value = '15';
    }
}

function loadTemplate(type) {
    const templates = {
        web: {
            serviceType: 'desenvolvimento-web',
            description: 'Desenvolvimento de website responsivo com design moderno, sistema de gerenciamento de conteúdo, otimização SEO e integração com redes sociais.',
            value: '3500',
            deadline: '20'
        },
        mobile: {
            serviceType: 'desenvolvimento-mobile',
            description: 'Desenvolvimento de aplicativo mobile nativo para iOS e Android com interface intuitiva, sistema de login e integração com APIs.',
            value: '8000',
            deadline: '45'
        },
        design: {
            serviceType: 'design-grafico',
            description: 'Criação de identidade visual completa incluindo logotipo, cartão de visita, papel timbrado e manual de marca.',
            value: '1500',
            deadline: '10'
        },
        marketing: {
            serviceType: 'marketing-digital',
            description: 'Estratégia completa de marketing digital incluindo gestão de redes sociais, criação de conteúdo e campanhas pagas.',
            value: '2000',
            deadline: '30'
        }
    };

    const template = templates[type];
    if (template) {
        document.getElementById('serviceType').value = template.serviceType;
        document.getElementById('projectDescription').value = template.description;
        document.getElementById('projectValue').value = template.value;
        document.getElementById('projectDeadline').value = template.deadline;
        updateProgress();
        showToast(`Template ${type} carregado!`, 'success');
    }
}

function saveTemplate() {
    showPromptDialog('Nome do template:', (templateName) => {
        if (templateName && templateName.trim()) {
            const data = collectFormData();
            savedTemplates[templateName.trim()] = data;
            localStorage.setItem('savedTemplates', JSON.stringify(savedTemplates));
            loadTemplatesList();
            showToast(`Template "${templateName}" salvo com sucesso!`, 'success');
        }
    });
}

function loadTemplatesList() {
    const container = document.getElementById('templatesList');
    const templates = Object.keys(savedTemplates);
    
    if (templates.length === 0) {
        container.innerHTML = '<p class="text-white/70 text-center py-4">Nenhum template salvo ainda</p>';
        return;
    }
    
    container.innerHTML = templates.map(name => `
        <div class="bg-white/10 rounded-lg p-3 flex justify-between items-center hover:bg-white/20 transition-colors duration-300">
            <div>
                <div class="text-white font-medium">${name}</div>
                <div class="text-white/70 text-sm">${savedTemplates[name].serviceType || 'Personalizado'}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="loadSavedTemplate('${name}')" class="text-blue-400 hover:text-blue-300 text-sm" title="Carregar template">
                    <i class="fas fa-upload"></i>
                </button>
                <button onclick="deleteTemplate('${name}')" class="text-red-400 hover:text-red-300 text-sm" title="Excluir template">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function loadSavedTemplate(name) {
    const template = savedTemplates[name];
    if (template) {
        loadFormData(template);
        showToast(`Template "${name}" carregado!`, 'success');
    }
}

function deleteTemplate(name) {
    showConfirmDialog(`Tem certeza que deseja excluir o template "${name}"?`, () => {
        delete savedTemplates[name];
        localStorage.setItem('savedTemplates', JSON.stringify(savedTemplates));
        loadTemplatesList();
        showToast(`Template "${name}" excluído!`, 'info');
    });
}

function manageTemplates() {
    showToast('Gerenciador de templates em desenvolvimento!', 'info');
}

function getAISuggestions() {
    const serviceType = document.getElementById('serviceType').value;
    const description = document.getElementById('projectDescription').value;
    
    const suggestions = {
        'desenvolvimento-web': [
            '💡 Considere incluir certificado SSL gratuito',
            '📱 Adicione responsividade mobile (obrigatória)',
            '🔍 Inclua otimização básica de SEO',
            '📊 Considere integração com Google Analytics',
            '🚀 Adicione otimização de velocidade',
            '🔒 Implemente sistema de backup automático'
        ],
        'desenvolvimento-mobile': [
            '📱 Defina claramente as plataformas (iOS/Android)',
            '🔔 Considere sistema de notificações push',
            '💾 Planeje o armazenamento offline',
            '🔐 Implemente autenticação segura',
            '📈 Adicione analytics de uso',
            '🧪 Inclua testes em dispositivos reais'
        ],
        'design-grafico': [
            '🎨 Inclua variações da logo em diferentes formatos',
            '📐 Considere criar um guia de estilo completo',
            '🖼️ Adicione mockups para apresentação',
            '📱 Crie versões para redes sociais',
            '🖨️ Prepare arquivos para impressão',
            '🎯 Defina aplicações da marca'
        ],
        'marketing-digital': [
            '📈 Defina KPIs claros para mensuração',
            '🎯 Segmente bem o público-alvo',
            '📅 Crie um cronograma de postagens',
            '💰 Reserve budget para impulsionamento',
            '📊 Planeje relatórios mensais',
            '🔄 Defina estratégia de remarketing'
        ]
    };

    const serviceSuggestions = suggestions[serviceType] || [
        '💡 Detalhe melhor o escopo do projeto',
        '⏰ Considere prazos realistas',
        '💰 Pesquise valores de mercado',
        '📋 Liste todos os entregáveis',
        '🎯 Defina objetivos específicos',
        '📞 Agende reunião de alinhamento'
    ];

    const suggestionsHtml = serviceSuggestions.map(s => `<div class="mb-2 p-2 bg-white/5 rounded">${s}</div>`).join('');
    document.getElementById('aiSuggestions').innerHTML = `
        <div class="text-white/90 font-medium mb-3">🤖 Sugestões da IA:</div>
        ${suggestionsHtml}
    `;
    
    showToast('Sugestões da IA atualizadas!', 'success');
}

function collectFormData() {
    const items = [];
    document.querySelectorAll('.budget-item').forEach(itemDiv => {
        const inputs = itemDiv.querySelectorAll('input');
        if (inputs[0].value.trim()) {
            items.push({
                description: inputs[0].value,
                quantity: parseInt(inputs[1].value) || 1,
                value: parseFloat(inputs[2].value) || 0
            });
        }
    });

    return {
        companyName: document.getElementById('companyName').value || 'Sua Empresa',
        companyPhone: document.getElementById('companyPhone').value || '(11) 99999-9999',
        companyEmail: document.getElementById('companyEmail').value || 'contato@empresa.com',
        companyAddress: document.getElementById('companyAddress').value || '',
        companyCNPJ: document.getElementById('companyCNPJ').value || '',
        clientName: document.getElementById('clientName').value || 'Cliente',
        clientPhone: document.getElementById('clientPhone').value || '(11) 88888-8888',
        clientEmail: document.getElementById('clientEmail').value || 'cliente@email.com',
        clientCompany: document.getElementById('clientCompany').value || '',
        serviceType: document.getElementById('serviceType').value || 'personalizado',
        projectDescription: document.getElementById('projectDescription').value || 'Projeto personalizado',
        projectValue: document.getElementById('projectValue').value || '1000',
        projectDeadline: document.getElementById('projectDeadline').value || '30',
        budgetTone: document.getElementById('budgetTone').value || 'profissional',
        budgetLanguage: document.getElementById('budgetLanguage').value || 'pt-BR',
        budgetComplexity: document.getElementById('budgetComplexity').value || 'detalhado',
        paymentMethod: document.getElementById('paymentMethod').value || 'a-vista',
        discountPercent: document.getElementById('discountPercent').value || '0',
        deliveryType: document.getElementById('deliveryType').value || 'digital',
        supportDays: document.getElementById('supportDays').value || '30',
        items: items
    };
}

function loadFormData(data) {
    Object.keys(data).forEach(key => {
        if (key !== 'items') {
            const element = document.getElementById(key);
            if (element) {
                element.value = data[key];
            }
        }
    });
    
    if (data.items && data.items.length > 0) {
        document.getElementById('budgetItems').innerHTML = '';
        data.items.forEach(item => {
            addBudgetItem();
            const lastItem = document.querySelector('.budget-item:last-child');
            const inputs = lastItem.querySelectorAll('input');
            inputs[0].value = item.description;
            inputs[1].value = item.quantity;
            inputs[2].value = item.value;
        });
    }
    
    updateProgress();
    calculateItemsTotal();
}

function clearForm() {
    showConfirmDialog('Tem certeza que deseja limpar todos os dados?', () => {
        document.querySelectorAll('input, textarea, select').forEach(field => {
            if (field.type !== 'button') {
                field.value = '';
            }
        });
        document.getElementById('budgetItems').innerHTML = '';
        addBudgetItem();
        updateProgress();
        calculateItemsTotal();
        showToast('Formulário limpo!', 'info');
    });
}

function generateBudget() {
    showActionLoading();
    
    const requiredFields = ['companyName', 'clientName', 'projectDescription'];
    const missingFields = requiredFields.filter(field => !document.getElementById(field).value.trim());
    
    if (missingFields.length > 0) {
        hideActionLoading();
        showAlertDialog('Por favor, preencha os campos obrigatórios: ' + missingFields.join(', '));
        return;
    }
    
    const generateBtn = document.querySelector('.generate-btn');
    generateBtn.classList.add('ai-thinking');
    document.getElementById('generateText').classList.add('hidden');
    document.getElementById('loadingText').classList.remove('hidden');

    const data = collectFormData();
    
    let step = 0;
    const steps = [
        'Analisando dados...',
        'Processando com IA...',
        'Otimizando conteúdo...',
        'Finalizando orçamento...'
    ];

    const stepInterval = setInterval(() => {
        if (step < steps.length) {
            document.getElementById('loadingText').innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${steps[step]}`;
            step++;
        } else {
            clearInterval(stepInterval);
            
            const budget = createAdvancedBudgetContent(data);
            displayBudget(budget);
            
            saveBudgetToHistory(data);
            
            generateBtn.classList.remove('ai-thinking');
            document.getElementById('generateText').classList.remove('hidden');
            document.getElementById('loadingText').classList.add('hidden');
            
            updateBudgetStats(budget);
            document.getElementById('budgetStatus').classList.remove('hidden');
            
            hideActionLoading();
            showToast('Orçamento gerado com sucesso!', 'success');
        }
    }, 800);
}

function createAdvancedBudgetContent(data) {
    const today = new Date().toLocaleDateString('pt-BR');
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
    
    let totalValue = parseFloat(data.projectValue) || 0;
    const discount = parseFloat(data.discountPercent) || 0;
    
    let itemsTotal = 0;
    data.items.forEach(item => {
        itemsTotal += item.quantity * item.value;
    });
    
    if (itemsTotal > 0) {
        totalValue = itemsTotal;
    }
    
    const discountValue = totalValue * (discount / 100);
    const finalValue = totalValue - discountValue;

    const toneStyles = {
        'profissional': {
            greeting: 'Prezado(a)',
            intro: 'Apresentamos nossa proposta comercial para o projeto solicitado, desenvolvida com base em nossa experiência e expertise técnica.',
            closing: 'Aguardamos seu retorno e ficamos à disposição para esclarecimentos adicionais.'
        },
        'amigavel': {
            greeting: 'Olá',
            intro: 'Ficamos muito felizes com seu interesse! Preparamos uma proposta especial pensada especialmente para você e suas necessidades.',
            closing: 'Estamos ansiosos para trabalhar juntos e criar algo incrível! Qualquer dúvida, é só chamar. 😊'
        },
        'formal': {
            greeting: 'Ilustríssimo(a) Senhor(a)',
            intro: 'Vimos por meio desta apresentar nossa proposta comercial conforme solicitado, elaborada de acordo com os mais altos padrões de qualidade.',
            closing: 'Colocamo-nos à disposição para quaisquer esclarecimentos que se fizerem necessários e aguardamos vossa manifestação.'
        },
        'criativo': {
            greeting: 'Ei',
            intro: '🚀 Que tal transformarmos suas ideias em realidade? Aqui está nossa proposta criativa, cheia de inovação e personalidade!',
            closing: '✨ Vamos criar algo incrível juntos? Estamos prontos para começar essa jornada criativa com você!'
        },
        'tecnico': {
            greeting: 'Prezado(a)',
            intro: 'Segue proposta técnica detalhada baseada em análise de requisitos e melhores práticas do mercado.',
            closing: 'Disponibilizamos nossa equipe técnica para discussão de especificações e esclarecimentos.'
        },
        'vendas': {
            greeting: 'Prezado(a)',
            intro: 'Esta é uma oportunidade única! Preparamos uma proposta exclusiva com condições especiais para seu projeto.',
            closing: 'Não perca esta oportunidade! Entre em contato hoje mesmo e garante condições especiais.'
        }
    };

    const style = toneStyles[data.budgetTone];
    
    const serviceDescriptions = {
        'desenvolvimento-web': '💻 Desenvolvimento de soluções web personalizadas e responsivas',
        'desenvolvimento-mobile': '📱 Desenvolvimento de aplicativos mobile nativos e híbridos',
        'design-grafico': '🎨 Criação de identidade visual e materiais gráficos profissionais',
        'marketing-digital': '📈 Estratégias de marketing digital e presença online',
        'consultoria': '💼 Consultoria especializada e assessoria técnica',
        'manutencao': '🔧 Serviços de manutenção e suporte técnico especializado',
        'e-commerce': '🛒 Desenvolvimento de lojas virtuais e soluções de e-commerce',
        'seo': '🔍 Otimização para mecanismos de busca e marketing de conteúdo',
        'personalizado': '⚡ Serviços personalizados conforme necessidade específica'
    };

    let itemsHTML = '';
    if (data.items.length > 0) {
        itemsHTML = `
            <div style="background: white; border: 2px solid #e9ecef; border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                <h3 style="color: #495057; margin-top: 0; border-bottom: 3px solid #667eea; padding-bottom: 15px; font-size: 22px;">📋 ITENS DETALHADOS</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
                            <th style="padding: 15px; text-align: left; border: 1px solid #dee2e6; font-weight: 600;">Descrição</th>
                            <th style="padding: 15px; text-align: center; border: 1px solid #dee2e6; width: 80px; font-weight: 600;">Qtd</th>
                            <th style="padding: 15px; text-align: right; border: 1px solid #dee2e6; width: 120px; font-weight: 600;">Valor Unit.</th>
                            <th style="padding: 15px; text-align: right; border: 1px solid #dee2e6; width: 120px; font-weight: 600;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map((item, index) => `
                            <tr style="background: ${index % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                <td style="padding: 15px; border: 1px solid #dee2e6;">${item.description}</td>
                                <td style="padding: 15px; text-align: center; border: 1px solid #dee2e6;">${item.quantity}</td>
                                <td style="padding: 15px; text-align: right; border: 1px solid #dee2e6;">R$ ${item.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                <td style="padding: 15px; text-align: right; border: 1px solid #dee2e6; font-weight: bold; color: #28a745;">R$ ${(item.quantity * item.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            </tr>
                        `).join('')}
                        <tr style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white;">
                            <td colspan="3" style="padding: 15px; font-weight: bold; border: 1px solid #28a745;">TOTAL GERAL</td>
                            <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; border: 1px solid #28a745;">R$ ${itemsTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div style="max-width: 900px; margin: 0 auto; font-family: 'Inter', sans-serif; line-height: 1.6; color: #333;">
            <header style="text-align: center; margin-bottom: 40px; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: pulse 4s ease-in-out infinite;"></div>
                <div style="position: relative; z-index: 1;">
                    <h1 style="margin: 0; font-size: 36px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-bottom: 15px;">${data.companyName}</h1>
                    <div style="font-size: 18px; opacity: 0.95; margin-bottom: 20px;">
                        📞 ${data.companyPhone} | 📧 ${data.companyEmail}
                        ${data.companyAddress ? `<br>📍 ${data.companyAddress}` : ''}
                        ${data.companyCNPJ ? `<br>🏢 CNPJ: ${data.companyCNPJ}` : ''}
                    </div>
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px; backdrop-filter: blur(10px);">
                        <strong>PROPOSTA COMERCIAL PROFISSIONAL</strong>
                    </div>
                </div>
            </header>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
                <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.08); border-left: 5px solid #667eea;">
                    <h4 style="margin-top: 0; color: #667eea; font-size: 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <i style="font-size: 24px;">📅</i> Informações do Orçamento
                    </h4>
                    <div style="space-y: 12px;">
                        <p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>Data:</strong> <span>${today}</span></p>
                        <p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>Válido até:</strong> <span>${validUntil}</span></p>
                        <p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>Orçamento:</strong> <span>#${Date.now().toString().slice(-6)}</span></p>
                        <p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>Versão:</strong> <span>2024.1</span></p>
                    </div>
                </div>
                <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.08); border-left: 5px solid #28a745;">
                    <h4 style="margin-top: 0; color: #28a745; font-size: 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <i style="font-size: 24px;">👤</i> Dados do Cliente
                    </h4>
                    <div style="space-y: 12px;">
                        <p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>Nome:</strong> <span>${data.clientName}</span></p>
                        <p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>Telefone:</strong> <span>${data.clientPhone}</span></p>
                        <p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>E-mail:</strong> <span>${data.clientEmail}</span></p>
                        ${data.clientCompany ? `<p style="margin: 12px 0; display: flex; justify-content: space-between;"><strong>Empresa:</strong> <span>${data.clientCompany}</span></p>` : ''}
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 40px; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.08); border-top: 5px solid #667eea;">
                <p style="font-size: 20px; margin-bottom: 20px;"><strong>${style.greeting} ${data.clientName},</strong></p>
                <p style="font-size: 17px; line-height: 1.8; color: #555;">${style.intro}</p>
            </div>

            <div style="background: white; border: 2px solid #e9ecef; border-radius: 20px; padding: 40px; margin-bottom: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                <h3 style="color: #495057; margin-top: 0; border-bottom: 4px solid #667eea; padding-bottom: 20px; font-size: 26px; display: flex; align-items: center; gap: 15px;">
                    <i style="font-size: 30px;">🎯</i> DESCRIÇÃO DO PROJETO
                </h3>
                <div style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 25px; border-radius: 15px; border-left: 6px solid #667eea; margin: 25px 0;">
                    <p style="margin: 0 0 20px 0; font-size: 16px;"><strong>Tipo de Serviço:</strong></p>
                    <p style="font-size: 20px; color: #667eea; font-weight: 600; margin: 0 0 20px 0;">${serviceDescriptions[data.serviceType] || data.serviceType}</p>
                    <p style="margin: 20px 0 0 0; font-size: 16px;"><strong>Descrição Detalhada:</strong></p>
                </div>
                <div style="background: #fff; padding: 25px; border-radius: 15px; border: 2px solid #f1f3f4; font-size: 17px; line-height: 1.8; color: #333;">
                    ${data.projectDescription}
                </div>
            </div>

            ${itemsHTML}

            <div style="background: white; border: 2px solid #e9ecef; border-radius: 20px; padding: 40px; margin-bottom: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                <h3 style="color: #495057; margin-top: 0; border-bottom: 4px solid #28a745; padding-bottom: 20px; font-size: 26px; display: flex; align-items: center; gap: 15px;">
                    <i style="font-size: 30px;">💰</i> INVESTIMENTO
                </h3>
                
                ${discount > 0 ? `
                    <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #ffeaa7; border-radius: 15px; padding: 25px; margin-bottom: 25px;">
                        <h4 style="color: #856404; margin-top: 0; font-size: 18px; margin-bottom: 20px;">🎉 DESCONTO ESPECIAL</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <span style="font-size: 17px;">Valor Original:</span>
                            <span style="font-size: 20px; text-decoration: line-through; color: #6c757d;">R$ ${totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 17px; color: #856404;">Desconto (${discount}%):</span>
                            <span style="font-size: 20px; color: #856404; font-weight: bold;">- R$ ${discountValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 20px; margin: 25px 0; box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.7;"></div>
                    <span style="font-size: 24px; font-weight: 600; position: relative; z-index: 1;">💎 Valor Total do Projeto:</span>
                    <span style="font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2); position: relative; z-index: 1;">R$ ${finalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-top: 30px;">
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 25px; border-radius: 15px; border-left: 5px solid #667eea;">
                        <p style="margin: 0 0 15px 0; font-weight: bold; color: #667eea;"><i style="margin-right: 10px;">⏱️</i>Prazo de Execução:</p>
                        <p style="margin: 0; font-size: 20px; color: #333; font-weight: 600;">${data.projectDeadline} dias úteis</p>
                    </div>
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 25px; border-radius: 15px; border-left: 5px solid #28a745;">
                        <p style="margin: 0 0 15px 0; font-weight: bold; color: #28a745;"><i style="margin-right: 10px;">💳</i>Forma de Pagamento:</p>
                        <p style="margin: 0; font-size: 17px; color: #333;">${getPaymentMethodDescription(data.paymentMethod)}</p>
                    </div>
                </div>
            </div>

            <div style="background: white; border: 2px solid #e9ecef; border-radius: 20px; padding: 40px; margin-bottom: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                <h3 style="color: #495057; margin-top: 0; border-bottom: 4px solid #17a2b8; padding-bottom: 20px; font-size: 26px; display: flex; align-items: center; gap: 15px;">
                    <i style="font-size: 30px;">📋</i> O QUE ESTÁ INCLUSO
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 25px;">
                    <div style="display: flex; align-items: center; padding: 18px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; border-left: 5px solid #28a745; transition: transform 0.2s ease;">
                        <span style="margin-right: 15px; font-size: 24px;">✅</span>
                        <span style="font-weight: 500;">Planejamento e análise detalhada</span>
                    </div>
                    <div style="display: flex; align-items: center; padding: 18px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; border-left: 5px solid #28a745;">
                        <span style="margin-right: 15px; font-size: 24px;">✅</span>
                        <span style="font-weight: 500;">Desenvolvimento/execução do projeto</span>
                    </div>
                    <div style="display: flex; align-items: center; padding: 18px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; border-left: 5px solid #28a745;">
                        <span style="margin-right: 15px; font-size: 24px;">✅</span>
                        <span style="font-weight: 500;">Testes e validação completa</span>
                    </div>
                    <div style="display: flex; align-items: center; padding: 18px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; border-left: 5px solid #28a745;">
                        <span style="margin-right: 15px; font-size: 24px;">✅</span>
                        <span style="font-weight: 500;">Entrega e treinamento</span>
                    </div>
                    <div style="display: flex; align-items: center; padding: 18px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; border-left: 5px solid #28a745;">
                        <span style="margin-right: 15px; font-size: 24px;">✅</span>
                        <span style="font-weight: 500;">Suporte pós-entrega (${data.supportDays} dias)</span>
                    </div>
                    <div style="display: flex; align-items: center; padding: 18px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; border-left: 5px solid #28a745;">
                        <span style="margin-right: 15px; font-size: 24px;">✅</span>
                        <span style="font-weight: 500;">Garantia de qualidade</span>
                    </div>
                </div>
            </div>

            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #ffeaa7; border-radius: 20px; padding: 30px; margin-bottom: 40px; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: rgba(255,193,7,0.2); border-radius: 50%;"></div>
                <h4 style="color: #856404; margin-top: 0; font-size: 22px; display: flex; align-items: center; gap: 15px; position: relative; z-index: 1;">
                    <i style="font-size: 28px;">⚠️</i> OBSERVAÇÕES IMPORTANTES
                </h4>
                <ul style="color: #856404; margin: 20px 0 0 0; padding-left: 25px; line-height: 2; font-size: 16px; position: relative; z-index: 1;">
                    <li>Esta proposta é válida por 30 dias corridos</li>
                    <li>Valores sujeitos a alteração após este período</li>
                    <li>Início dos trabalhos mediante aprovação e sinal de 30%</li>
                    <li>Alterações no escopo podem gerar custos adicionais</li>
                    <li>Entrega: ${getDeliveryTypeDescription(data.deliveryType)}</li>
                    <li>Suporte técnico gratuito por ${data.supportDays} dias após entrega</li>
                    <li>Todos os direitos autorais serão transferidos após pagamento integral</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 50px 0; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                <p style="font-size: 20px; margin-bottom: 30px; line-height: 1.8; color: #333;">${style.closing}</p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 35px; border-radius: 20px; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.7;"></div>
                    <p style="margin: 0 0 20px 0; font-weight: bold; font-size: 24px; position: relative; z-index: 1;"><i style="margin-right: 10px;">📞</i>Entre em contato conosco:</p>
                    <div style="font-size: 18px; line-height: 2; position: relative; z-index: 1;">
                        <p style="margin: 8px 0;"><i style="margin-right: 10px;">📱</i>${data.companyPhone}</p>
                        <p style="margin: 8px 0;"><i style="margin-right: 10px;">📧</i>${data.companyEmail}</p>
                        ${data.companyAddress ? `<p style="margin: 8px 0;"><i style="margin-right: 10px;">📍</i>${data.companyAddress}</p>` : ''}
                    </div>
                </div>
            </div>

            <footer style="text-align: center; padding: 30px; border-top: 4px solid #e9ecef; margin-top: 50px; color: #6c757d; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 20px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;"><i style="margin-right: 8px;">🤖</i><strong>Orçamento gerado automaticamente com IA em ${today}</strong></p>
                <p style="margin: 0; font-size: 14px; opacity: 0.8;">© ${new Date().getFullYear()} ${data.companyName} - Todos os direitos reservados</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.6;">Powered by IA Orçamentos Pro 2024.1</p>
            </footer>
        </div>
    `;
}

function getPaymentMethodDescription(method) {
    const descriptions = {
        'a-vista': 'À vista com 5% de desconto',
        'parcelado': 'Parcelado em até 12x no cartão',
        '50-50': '50% na assinatura + 50% na entrega',
        '30-70': '30% na assinatura + 70% na entrega',
        'personalizado': 'Condições personalizadas a combinar'
    };
    return descriptions[method] || 'A combinar';
}

function getDeliveryTypeDescription(type) {
    const descriptions = {
        'digital': 'Entrega digital via e-mail/plataforma online',
        'presencial': 'Entrega presencial com apresentação',
        'hibrido': 'Entrega digital + apresentação presencial opcional'
    };
    return descriptions[type] || 'Digital';
}

function displayBudget(budget) {
    currentBudget = budget;
    document.getElementById('budgetResult').innerHTML = budget;
    document.getElementById('budgetResult').scrollIntoView({ behavior: 'smooth' });
}

function updateBudgetStats(budget) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = budget;
    const text = tempDiv.innerText;
    
    const words = text.split(/\s+/).length;
    const chars = text.length;
    const items = (budget.match(/✅/g) || []).length;
    const score = Math.min(100, Math.round((words / 10) + (chars / 100) + (items * 5)));
    
    document.getElementById('statWords').textContent = words.toLocaleString();
    document.getElementById('statChars').textContent = chars.toLocaleString();
    document.getElementById('statItems').textContent = items;
    document.getElementById('statScore').textContent = score;
    document.getElementById('budgetStats').classList.remove('hidden');
}

function previewBudget() {
    if (!currentBudget) {
        showAlertDialog('Gere um orçamento primeiro!');
        return;
    }
    
    document.getElementById('previewContent').innerHTML = currentBudget;
    showModal('previewModal');
}

function editBudget() {
    if (!currentBudget) {
        showAlertDialog('Gere um orçamento primeiro!');
        return;
    }
    
    isEditing = true;
    document.getElementById('budgetResult').classList.add('hidden');
    document.getElementById('budgetEditor').classList.remove('hidden');
    document.getElementById('editableContent').innerHTML = currentBudget;
}

function saveBudget() {
    const editedContent = document.getElementById('editableContent').innerHTML;
    currentBudget = editedContent;
    
    document.getElementById('budgetResult').innerHTML = currentBudget;
    document.getElementById('budgetResult').classList.remove('hidden');
    document.getElementById('budgetEditor').classList.add('hidden');
    isEditing = false;
    
    updateBudgetStats(currentBudget);
    showToast('Orçamento salvo com sucesso!', 'success');
}

function cancelEdit() {
    document.getElementById('budgetResult').classList.remove('hidden');
    document.getElementById('budgetEditor').classList.add('hidden');
    isEditing = false;
}

function previewEdit() {
    const content = document.getElementById('editableContent').innerHTML;
    document.getElementById('previewContent').innerHTML = content;
    showModal('previewModal');
}

function copyBudget() {
    if (!currentBudget) {
        showAlertDialog('Gere um orçamento primeiro!');
        return;
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentBudget;
    const textContent = tempDiv.innerText;
    
    navigator.clipboard.writeText(textContent).then(() => {
        showToast('Orçamento copiado para a área de transferência!', 'success');
    }).catch(() => {
        showToast('Erro ao copiar. Tente selecionar e copiar manualmente.', 'error');
    });
}

function downloadPDF() {
    if (!currentBudget) {
        showAlertDialog('Gere um orçamento primeiro!');
        return;
    }
    
    showActionLoading();
    
    const { jsPDF } = window.jspdf;
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '794px';
    tempContainer.style.background = 'white';
    tempContainer.innerHTML = currentBudget;
    document.body.appendChild(tempContainer);
    
    html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        document.body.removeChild(tempContainer);
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const companyName = document.getElementById('companyName').value || 'Empresa';
        const clientName = document.getElementById('clientName').value || 'Cliente';
        const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const filename = `Orcamento_${companyName.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}_${today}.pdf`;
        
        pdf.save(filename);
        hideActionLoading();
        showToast('PDF gerado com sucesso!', 'success');
    }).catch(error => {
        document.body.removeChild(tempContainer);
        hideActionLoading();
        showToast('Erro ao gerar PDF. Tente novamente.', 'error');
        console.error('PDF generation error:', error);
    });
}

function downloadHTML() {
    if (!currentBudget) {
        showAlertDialog('Gere um orçamento primeiro!');
        return;
    }
    
    const companyName = document.getElementById('companyName').value || 'Empresa';
    const clientName = document.getElementById('clientName').value || 'Cliente';
    const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    
    const filename = `Orcamento_${companyName.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}_${today}.html`;
    
    const fullHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orçamento - ${companyName}</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            background: #f5f5f5; 
            line-height: 1.6;
        }
        @media print { 
            body { background: white; padding: 0; } 
            .no-print { display: none; }
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .grid { grid-template-columns: 1fr !important; }
            .text-6xl { font-size: 2rem !important; }
            .text-4xl { font-size: 1.5rem !important; }
        }
        .no-print {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    ${currentBudget}
    <div class="no-print">
        <h3 style="margin: 0 0 10px 0;">📄 Orçamento Profissional</h3>
        <p style="margin: 0 0 15px 0;">Para imprimir este orçamento, use <strong>Ctrl+P</strong> ou <strong>Cmd+P</strong></p>
        <p style="margin: 0; opacity: 0.8; font-size: 14px;">Gerado automaticamente pelo IA Orçamentos Pro 2024.1</p>
    </div>
</body>
</html>`;
    
    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('HTML baixado com sucesso!', 'success');
}

function printBudget() {
    if (!currentBudget) {
        showAlertDialog('Gere um orçamento primeiro!');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Imprimir Orçamento</title>
            <style>
                body { 
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: white;
                    line-height: 1.6;
                }
                @media print {
                    body { margin: 0; padding: 15px; }
                }
                @page {
                    margin: 1cm;
                    size: A4;
                }
            </style>
        </head>
        <body>
            ${currentBudget}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

function shareBudget() {
    if (!currentBudget) {
        showAlertDialog('Gere um orçamento primeiro!');
        return;
    }
    
    const companyName = document.getElementById('companyName').value;
    const clientName = document.getElementById('clientName').value;
    const shareText = `Orçamento de ${companyName} para ${clientName}`;
    
    if (navigator.share) {
        navigator.share({
            title: shareText,
            text: 'Confira este orçamento profissional gerado com IA.',
            url: window.location.href
        }).catch(() => {
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
}

function fallbackShare(shareText) {
    const shareUrl = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent('Segue orçamento em anexo. Gerado com IA Orçamentos Pro.')}`;
    window.open(shareUrl);
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('editableContent').focus();
}

function changeFontSize(size) {
    document.execCommand('fontSize', false, '7');
    const fontElements = document.querySelectorAll('font[size="7"]');
    fontElements.forEach(el => {
        el.removeAttribute('size');
        el.style.fontSize = size + 'px';
    });
    document.getElementById('editableContent').focus();
}

function insertTable() {
    const table = `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #e5e7eb;">
            <thead>
                <tr style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);">
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Coluna 1</th>
                    <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Coluna 2</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Dados 1</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Dados 2</td>
                </tr>
                <tr style="background: #f9fafb;">
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Dados 3</td>
                    <td style="border: 1px solid #d1d5db; padding: 12px;">Dados 4</td>
                </tr>
            </tbody>
        </table>
    `;
    document.execCommand('insertHTML', false, table);
    document.getElementById('editableContent').focus();
}

function aiImprove() {
    showAlertDialog('🤖 Funcionalidade de melhoria com IA em desenvolvimento! Em breve você poderá otimizar automaticamente o texto do seu orçamento com inteligência artificial avançada.');
}

function saveBudgetToHistory(data) {
    const historyItem = {
        id: Date.now(),
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR'),
        companyName: data.companyName,
        clientName: data.clientName,
        value: data.projectValue,
        serviceType: data.serviceType,
        budget: currentBudget
    };
    
    budgetHistory.unshift(historyItem);
    if (budgetHistory.length > 20) {
        budgetHistory = budgetHistory.slice(0, 20);
    }
    
    localStorage.setItem('budgetHistory', JSON.stringify(budgetHistory));
    loadBudgetHistory();
}

function loadBudgetHistory() {
    const container = document.getElementById('budgetHistory');
    
    if (budgetHistory.length === 0) {
        container.innerHTML = '<p class="text-white/70 text-center py-4">Nenhum orçamento salvo ainda</p>';
        return;
    }
    
    container.innerHTML = budgetHistory.map(item => `
        <div class="bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-all duration-300 cursor-pointer group">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1 min-w-0">
                    <div class="text-white font-medium truncate">${item.clientName} - ${item.companyName}</div>
                    <div class="text-white/70 text-sm">${item.date} ${item.time}</div>
                    <div class="text-white/60 text-xs">${item.serviceType}</div>
                </div>
                <div class="text-white font-bold text-sm ml-2">
                    R$ ${parseFloat(item.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="loadBudgetFromHistory(${item.id})" class="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-500/20 rounded">
                    <i class="fas fa-upload"></i> Carregar
                </button>
                <button onclick="deleteBudgetFromHistory(${item.id})" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-500/20 rounded">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function loadBudgetFromHistory(id) {
    const item = budgetHistory.find(h => h.id === id);
    if (item) {
        currentBudget = item.budget;
        displayBudget(currentBudget);
        updateBudgetStats(currentBudget);
        document.getElementById('budgetStatus').classList.remove('hidden');
        showToast('Orçamento carregado do histórico!', 'success');
    }
}

function deleteBudgetFromHistory(id) {
    showConfirmDialog('Tem certeza que deseja excluir este orçamento do histórico?', () => {
        budgetHistory = budgetHistory.filter(h => h.id !== id);
        localStorage.setItem('budgetHistory', JSON.stringify(budgetHistory));
        loadBudgetHistory();
        showToast('Orçamento removido do histórico!', 'info');
    });
}

function clearHistory() {
    showConfirmDialog('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.', () => {
        budgetHistory = [];
        localStorage.setItem('budgetHistory', JSON.stringify(budgetHistory));
        loadBudgetHistory();
        showToast('Histórico limpo com sucesso!', 'info');
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.body.style.overflow = '';
}

function showInfoModal() {
    showModal('infoModal');
}

function showConfirmDialog(message, callback) {
    confirmCallback = callback;
    document.getElementById('confirmMessage').textContent = message;
    showModal('confirmModal');
}

function showAlertDialog(message) {
    document.getElementById('alertMessage').textContent = message;
    showModal('alertModal');
}

function showPromptDialog(message, callback) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base';
    input.placeholder = 'Digite aqui...';
    
    const modalBody = document.querySelector('#alertModal .modal-body');
    modalBody.innerHTML = `
        <p class="mb-4">${message}</p>
        <div class="mb-6"></div>
        <div class="flex justify-end gap-3">
            <button onclick="closeModal('alertModal')" class="action-btn bg-gray-500 hover:bg-gray-600">
                <i class="fas fa-times"></i> Cancelar
            </button>
            <button onclick="handlePromptConfirm()" class="action-btn bg-blue-500 hover:bg-blue-600">
                <i class="fas fa-check"></i> Confirmar
            </button>
        </div>
    `;
    
    modalBody.querySelector('.mb-6').appendChild(input);
    
    window.promptCallback = callback;
    window.promptInput = input;
    
    showModal('alertModal');
    setTimeout(() => input.focus(), 100);
}

function handlePromptConfirm() {
    const value = window.promptInput.value.trim();
    closeModal('alertModal');
    if (window.promptCallback && value) {
        window.promptCallback(value);
    }
}

function confirmAction(confirmed) {
    closeModal('confirmModal');
    if (confirmed && confirmCallback) {
        confirmCallback();
    }
    confirmCallback = null;
}

function showActionLoading() {
    document.getElementById('actionLoading').classList.remove('hidden');
}

function hideActionLoading() {
    document.getElementById('actionLoading').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    }[type];
    
    const color = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    }[type];
    
    toast.innerHTML = `
        <i class="${icon}" style="color: ${color}; font-size: 1.25rem;"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="margin-left: auto; background: none; border: none; color: #6b7280; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toast.style.borderLeftColor = color;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, 4000);
}

window.addEventListener('beforeunload', () => {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[title]').forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('title');
            tooltip.style.cssText = `
                position: absolute;
                background: #333;
                color: white;
                padding: 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.75rem;
                z-index: 1000;
                pointer-events: none;
                white-space: nowrap;
            `;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.bottom + 5 + 'px';
            
            this.tooltipElement = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this.tooltipElement) {
                this.tooltipElement.remove();
                this.tooltipElement = null;
            }
        });
    });
});
