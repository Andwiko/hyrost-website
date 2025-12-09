// Dashboard Management System for Hyrost
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication(); // Cek autentikasi dulu
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
});

// Check authentication before loading dashboard
function checkAuthentication() {
    const token = localStorage.getItem('hyrostToken');
    const currentUser = localStorage.getItem('currentUser');
    
    if (!token || !currentUser) {
        // Redirect to login page if not authenticated
        window.location.href = 'index.html';
        return;
    }
    
    // Verify token format (basic validation)
    if (!token) {
        logout();
        return;
    }
}

// Get auth token
function getAuthToken() {
    return localStorage.getItem('hyrostToken') || '';
}

// Update logout function
function logout() {
    localStorage.removeItem('hyrostToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Initialize dashboard
function initializeDashboard() {
    console.log('Initializing Hyrost Dashboard...');
    updateModuleStats();
    checkAuthentication();
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar Toggle (Mobile)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
    }

    // Close sidebar when clicking overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Modal functionality
    const modal = document.getElementById('moduleModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Module card interactions
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Check authentication
function checkAuthentication() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'register.html';
        return;
    }
    
    // Verify token with backend
    fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            logout();
        }
    })
    .catch(error => {
        console.error('Auth verification failed:', error);
        logout();
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateModuleStats(data);
        } else {
            console.warn('Failed to load dashboard data');
            // Use demo data
            updateModuleStats(getDemoData());
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        updateModuleStats(getDemoData());
    }
}

// Get demo data for testing
function getDemoData() {
    return {
        forum: { threads: 156, posts: 2341 },
        members: { total: 1247, online: 42 },
        vote: { active: 3, total: 892 },
        rules: { rules: 12, violations: 7 },
        staff: { staff: 8, moderators: 15 },
        status: { status: 'Online', uptime: '99.2%' },
        resources: { files: 2847, storage: '85%' },
        forms: { forms: 6, submissions: 234 },
        iframe: { embeds: 4, active: 3 },
        jobs: { running: 2, queued: 15 },
        badges: { badges: 24, awarded: 1567 },
        tickets: { open: 8, pending: 3 },
        friends: { friends: 156, requests: 4 },
        infractions: { active: 7, total: 234 },
        statistics: { players: 89, peak: 156 },
        suggestions: { new: 12, total: 456 },
        wiki: { pages: 127, edits: 2341 }
    };
}

// Update module statistics
function updateModuleStats(data = null) {
    if (!data) return;

    Object.keys(data).forEach(moduleName => {
        const moduleCard = document.getElementById(`${moduleName}-module`);
        if (moduleCard && data[moduleName]) {
            updateModuleCard(moduleCard, data[moduleName]);
        }
    });
}

// Update individual module card
function updateModuleCard(card, stats) {
    const statElements = card.querySelectorAll('.stat');
    statElements.forEach((element, index) => {
        const text = element.textContent;
        const [label, currentValue] = text.split(': ');
        const statKeys = Object.keys(stats);
        
        if (statKeys[index]) {
            element.textContent = `${label}: ${stats[statKeys[index]]}`;
        }
    });
}

// Open module management interface
function openModule(moduleName) {
    console.log(`Opening module: ${moduleName}`);
    
    const modal = document.getElementById('moduleModal');
    const modalContent = document.getElementById('moduleContent');
    
    if (!modal || !modalContent) return;

    // Show loading state
    modalContent.innerHTML = `
        <div class="module-detail active">
            <h2>Loading ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module...</h2>
            <div class="loading" style="text-align: center; margin: 20px 0;">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Load module content
    setTimeout(() => {
        loadModuleContent(moduleName, modalContent);
    }, 800);
}

// Load specific module content
function loadModuleContent(moduleName, container) {
    const moduleData = getModuleData(moduleName);
    
    container.innerHTML = `
        <div class="module-detail active">
            <h2>${moduleData.title}</h2>
            <p>${moduleData.description}</p>
            
            <div class="module-detail-grid">
                ${moduleData.features.map(feature => `
                    <div class="detail-card">
                        <h4>${feature.name}</h4>
                        <p>${feature.description}</p>
                        <div class="action-buttons">
                            <button class="btn-primary" onclick="executeModuleAction('${moduleName}', '${feature.action}')">
                                ${feature.buttonText}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="action-buttons">
                <button class="btn-secondary" onclick="closeModal()">Close</button>
                <button class="btn-primary" onclick="openFullModule('${moduleName}')">
                    Open Full Module
                </button>
            </div>
        </div>
    `;
}

// Get module data configuration
function getModuleData(moduleName) {
    const modules = {
        forum: {
            title: 'Forum Management',
            description: 'Manage discussion boards, threads, and community conversations.',
            features: [
                {
                    name: 'Thread Management',
                    description: 'Moderate and organize forum threads',
                    buttonText: 'Manage Threads',
                    action: 'threads'
                },
                {
                    name: 'Category Setup',
                    description: 'Create and organize forum categories',
                    buttonText: 'Setup Categories',
                    action: 'categories'
                },
                {
                    name: 'Moderation Tools',
                    description: 'Tools for forum moderation',
                    buttonText: 'Moderation',
                    action: 'moderate'
                }
            ]
        },
        members: {
            title: 'Member Management',
            description: 'Handle user accounts, roles, and permissions.',
            features: [
                {
                    name: 'User Profiles',
                    description: 'View and edit member profiles',
                    buttonText: 'View Profiles',
                    action: 'profiles'
                },
                {
                    name: 'Role Assignment',
                    description: 'Assign roles and permissions',
                    buttonText: 'Manage Roles',
                    action: 'roles'
                },
                {
                    name: 'Activity Monitoring',
                    description: 'Track member activity',
                    buttonText: 'View Activity',
                    action: 'activity'
                }
            ]
        }
        // Add more module configurations...
    };

    return modules[moduleName] || {
        title: `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Management`,
        description: `Manage ${moduleName} settings and configurations.`,
        features: [
            {
                name: 'Settings',
                description: `Configure ${moduleName} options`,
                buttonText: 'Open Settings',
                action: 'settings'
            }
        ]
    };
}

// Execute module-specific actions
function executeModuleAction(moduleName, action) {
    console.log(`Executing action: ${action} for module: ${moduleName}`);
    
    // Simulate API call to backend
    showNotification(`Executing ${action} for ${moduleName}...`, 'info');
    
    setTimeout(() => {
        showNotification(`${moduleName} - ${action} completed successfully!`, 'success');
    }, 1000);
}

// Open full module interface
function openFullModule(moduleName) {
    console.log(`Opening full module interface for: ${moduleName}`);
    closeModal();
    
    // Redirect to module-specific page
    const moduleUrl = `/modules/${moduleName}.html`;
    window.location.href = moduleUrl;
}

// Modal control functions
function closeModal() {
    const modal = document.getElementById('moduleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Authentication helper
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .loading-spinner {
        border: 3px solid rgba(168, 138, 90, 0.3);
        border-top: 3px solid #d4af37;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Export functions for global use
window.openModule = openModule;
window.executeModuleAction = executeModuleAction;
window.openFullModule = openFullModule;
window.closeModal = closeModal;
window.logout = logout;
window.showNotification = showNotification;

// Enhanced authentication check for Google users
function checkAuthentication() {
    const googleUser = localStorage.getItem('googleUser');
    const token = localStorage.getItem('hyrostToken');
    const currentUser = localStorage.getItem('currentUser');
    
    if (!googleUser && !token) {
        window.location.href = 'index.html';
        return;
    }
    
    // Verify token format
    if (token && !token) {
        logout();
        return;
    }
    
    // If Google user, update UI
    if (googleUser) {
        const userData = JSON.parse(googleUser);
        updateDashboardForGoogleUser(userData);
    }
}

// Update dashboard for Google user
function updateDashboardForGoogleUser(userData) {
    // Add Google user indicator
    const dashboardHeader = document.querySelector('.dashboard-header .container');
    if (dashboardHeader && !document.querySelector('.google-user-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'google-user-indicator';
        indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;">
                <img src="${userData.avatar}" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%;">
                <span>Welcome, ${userData.username}!</span>
            </div>
        `;
        dashboardHeader.insertBefore(indicator, dashboardHeader.firstChild);
    }
}

// Enhanced getAuthToken function
function getAuthToken() {
    return localStorage.getItem('hyrostToken') || '';
}

// Enhanced logout function
function logout() {
    localStorage.removeItem('googleUser');
    localStorage.removeItem('hyrostToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Enhanced Filter System for All Content
class ContentFilter {
    constructor() {
        this.moduleCards = document.querySelectorAll('.module-card');
        this.contentItems = document.querySelectorAll('.content-item');
        this.activeFilters = {
            category: 'all',
            status: 'all',
            sort: 'name',
            search: '',
            type: 'all',
            date: 'all'
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateResults();
    }

    bindEvents() {
        // Desktop filters
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.activeFilters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.activeFilters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sortFilter')?.addEventListener('change', (e) => {
            this.activeFilters.sort = e.target.value;
            this.applyFilters();
        });

        document.getElementById('searchFilter')?.addEventListener('input', (e) => {
            this.activeFilters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Mobile filters
        document.getElementById('mobileCategoryFilter')?.addEventListener('change', (e) => {
            this.activeFilters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('mobileStatusFilter')?.addEventListener('change', (e) => {
            this.activeFilters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('mobileSortFilter')?.addEventListener('change', (e) => {
            this.activeFilters.sort = e.target.value;
            this.applyFilters();
        });

        document.getElementById('mobileSearch')?.addEventListener('input', (e) => {
            this.activeFilters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Clear filters
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        document.getElementById('mobileClearFilters')?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Mobile filter panel
        document.getElementById('mobileFilterToggle')?.addEventListener('click', () => {
            document.getElementById('mobileFilterPanel').classList.add('active');
        });

        document.getElementById('closeMobileFilters')?.addEventListener('click', () => {
            document.getElementById('mobileFilterPanel').classList.remove('active');
        });
    }

    applyFilters() {
        this.filterModules();
        this.filterContentItems();
        this.updateResults();
        this.updateActiveFilterTags();
    }

    filterModules() {
        const contentGrid = document.getElementById('contentGrid');
        if (!contentGrid) return;

        contentGrid.classList.add('filtered');
        let visibleCount = 0;

        this.moduleCards.forEach(card => {
            const matches = this.checkCardMatch(card);
            if (matches) {
                card.classList.add('filter-match');
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.classList.remove('filter-match');
                card.style.display = 'none';
            }
        });

        // Sort if needed
        if (this.activeFilters.sort !== 'name') {
            this.sortModules();
        }
    }

    filterContentItems() {
        const contentItems = document.getElementById('contentItems');
        if (!contentItems) return;

        contentItems.classList.add('filtered');
        let visibleCount = 0;

        this.contentItems.forEach(item => {
            const matches = this.checkItemMatch(item);
            if (matches) {
                item.classList.add('filter-match');
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.classList.remove('filter-match');
                item.style.display = 'none';
            }
        });
    }

    checkCardMatch(card) {
        const category = card.dataset.category;
        const status = card.dataset.status;
        const name = card.dataset.name.toLowerCase();
        const searchTerm = this.activeFilters.search;

        // Category filter
        if (this.activeFilters.category !== 'all' && category !== this.activeFilters.category) {
            return false;
        }

        // Status filter
        if (this.activeFilters.status !== 'all' && status !== this.activeFilters.status) {
            return false;
        }

        // Search filter
        if (searchTerm && !name.includes(searchTerm)) {
            return false;
        }

        return true;
    }

    checkItemMatch(item) {
        const category = item.dataset.category;
        const status = item.dataset.status;
        const name = item.dataset.name.toLowerCase();
        const type = item.dataset.type;
        const searchTerm = this.activeFilters.search;

        // Category filter
        if (this.activeFilters.category !== 'all' && category !== this.activeFilters.category) {
            return false;
        }

        // Status filter
        if (this.activeFilters.status !== 'all' && status !== this.activeFilters.status) {
            return false;
        }

        // Type filter (for content items)
        if (this.activeFilters.type !== 'all' && type !== this.activeFilters.type) {
            return false;
        }

        // Search filter
        if (searchTerm && !name.includes(searchTerm)) {
            return false;
        }

        return true;
    }

    sortModules() {
        const contentGrid = document.getElementById('contentGrid');
        if (!contentGrid) return;

        const cards = Array.from(this.moduleCards);
        
        cards.sort((a, b) => {
            switch (this.activeFilters.sort) {
                case 'popularity':
                    const popA = a.dataset.popularity;
                    const popB = b.dataset.popularity;
                    const popularityOrder = { high: 3, medium: 2, low: 1 };
                    return popularityOrder[popB] - popularityOrder[popA];
                
                case 'recent':
                    const dateA = a.dataset.date || '0';
                    const dateB = b.dataset.date || '0';
                    return dateB.localeCompare(dateA);
                
                case 'name':
                default:
                    const nameA = a.dataset.name.toLowerCase();
                    const nameB = b.dataset.name.toLowerCase();
                    return nameA.localeCompare(nameB);
            }
        });

        // Re-append sorted cards
        cards.forEach(card => {
            contentGrid.appendChild(card);
        });
    }

    updateResults() {
        const moduleMatches = document.querySelectorAll('.module-card.filter-match').length;
        const contentMatches = document.querySelectorAll('.content-item.filter-match').length;
        const totalMatches = moduleMatches + contentMatches;

        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `${totalMatches} items found (${moduleMatches} modules, ${contentMatches} content items)`;
        }
    }

    updateActiveFilterTags() {
        const activeFiltersContainer = document.getElementById('activeFilters');
        if (!activeFiltersContainer) return;

        const tags = [];
        
        if (this.activeFilters.category !== 'all') {
            tags.push({ type: 'category', label: `Category: ${this.activeFilters.category}` });
        }
        
        if (this.activeFilters.status !== 'all') {
            tags.push({ type: 'status', label: `Status: ${this.activeFilters.status}` });
        }
        
        if (this.activeFilters.search) {
            tags.push({ type: 'search', label: `Search: "${this.activeFilters.search}"` });
        }

        activeFiltersContainer.innerHTML = tags.map(tag => `
            <span class="filter-tag">
                ${tag.label}
                <button class="remove-tag" data-type="${tag.type}">×</button>
            </span>
        `).join('');

        // Add event listeners to remove tags
        activeFiltersContainer.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.removeFilter(type);
            });
        });
    }

    removeFilter(type) {
        switch (type) {
            case 'category':
                this.activeFilters.category = 'all';
                document.getElementById('categoryFilter').value = 'all';
                document.getElementById('mobileCategoryFilter').value = 'all';
                break;
            case 'status':
                this.activeFilters.status = 'all';
                document.getElementById('statusFilter').value = 'all';
                document.getElementById('mobileStatusFilter').value = 'all';
                break;
            case 'search':
                this.activeFilters.search = '';
                document.getElementById('searchFilter').value = '';
                document.getElementById('mobileSearch').value = '';
                break;
        }
        
        this.applyFilters();
    }

    clearAllFilters() {
        this.activeFilters = {
            category: 'all',
            status: 'all',
            sort: 'name',
            search: '',
            type: 'all',
            date: 'all'
        };

        // Reset all filter inputs
        document.getElementById('categoryFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('sortFilter').value = 'name';
        document.getElementById('searchFilter').value = '';
        
        document.getElementById('mobileCategoryFilter').value = 'all';
        document.getElementById('mobileStatusFilter').value = 'all';
        document.getElementById('mobileSortFilter').value = 'name';
        document.getElementById('mobileSearch').value = '';

        this.applyFilters();
    }
}

// Initialize the enhanced filter system
document.addEventListener('DOMContentLoaded', () => {
    new ContentFilter();
});