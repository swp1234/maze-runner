class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'ja', 'zh', 'es', 'pt', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
        this.currentLang = this.detectLanguage();
        this.initialized = false;
    }

    detectLanguage() {
        // Check localStorage first
        const stored = localStorage.getItem('preferredLanguage');
        if (stored && this.supportedLanguages.includes(stored)) {
            return stored;
        }

        // Check browser language
        const browserLang = (navigator.language || navigator.userLanguage || 'en').substring(0, 2).toLowerCase();
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Default to English
        return 'en';
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) {
            return this.translations[lang];
        }

        try {
            const response = await fetch(`./js/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang}.json`);
            }
            const data = await response.json();
            this.translations[lang] = data;
            return data;
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            // Fallback to English
            if (lang !== 'en' && !this.translations['en']) {
                return this.loadTranslations('en');
            }
            return {};
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        return value || key;
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Language ${lang} not supported`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('preferredLanguage', lang);

        // Load translations if not already loaded
        if (!this.translations[lang]) {
            await this.loadTranslations(lang);
        }

        this.updateUI();
    }

    updateUI() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (element.tagName === 'INPUT' || element.tagName === 'BUTTON') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update document title
        const titleElement = document.querySelector('[data-i18n="title"]');
        if (titleElement) {
            document.title = this.t('title');
        }
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getLanguageName(lang) {
        const names = {
            'ko': '한국어',
            'en': 'English',
            'ja': '日本語',
            'zh': '中文',
            'es': 'Español',
            'pt': 'Português',
            'id': 'Bahasa Indonesia',
            'tr': 'Türkçe',
            'de': 'Deutsch',
            'fr': 'Français',
            'hi': 'हिन्दी',
            'ru': 'Русский'
        };
        return names[lang] || lang;
    }

    async init() {
        if (this.initialized) {
            return;
        }

        // Load current language
        await this.loadTranslations(this.currentLang);

        // If not English, also load English as fallback
        if (this.currentLang !== 'en') {
            await this.loadTranslations('en');
        }

        this.updateUI();
        this.initialized = true;

        // Setup language switcher
        this.setupLanguageSwitcher();
    }

    setupLanguageSwitcher() {
        const langToggle = document.getElementById('lang-toggle');
        const langMenu = document.getElementById('lang-menu');
        const langOptions = document.querySelectorAll('.lang-option');

        if (!langToggle || !langMenu) {
            return;
        }

        langToggle.addEventListener('click', () => {
            langMenu.classList.toggle('hidden');
        });

        langOptions.forEach(option => {
            option.addEventListener('click', async (e) => {
                const lang = e.target.getAttribute('data-lang');
                await this.setLanguage(lang);

                // Update active state
                langOptions.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');

                langMenu.classList.add('hidden');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
                langMenu.classList.add('hidden');
            }
        });

        // Set initial active button
        const activeOption = document.querySelector(`[data-lang="${this.currentLang}"]`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
    }
}

// Global i18n instance
const i18n = new I18n();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try { i18n.init(); } catch(e) { console.warn('i18n init error:', e); }
    });
} else {
    try { i18n.init(); } catch(e) { console.warn('i18n init error:', e); }
}
