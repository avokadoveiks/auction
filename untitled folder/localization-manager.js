/*
  LocalizationManager - Система мультиязычности
  Поддержка: English, Українська, Русский, Deutsch, Français, Español, Italiano, Português (Brazil), 中文(简体)
*/
(function(global) {
  const SUPPORTED_LANGUAGES = {
    en: { name: 'English', flag: '🇺🇸', code: 'en' },
    uk: { name: 'Українська', flag: '🇺🇦', code: 'uk' },
    ru: { name: 'Русский', flag: '🇷🇺', code: 'ru' },
    de: { name: 'Deutsch', flag: '🇩🇪', code: 'de' },
    fr: { name: 'Français', flag: '🇫🇷', code: 'fr' },
    es: { name: 'Español', flag: '🇪🇸', code: 'es' },
    it: { name: 'Italiano', flag: '🇮🇹', code: 'it' },
    pt: { name: 'Português', flag: '🇧🇷', code: 'pt' },
    zh: { name: '中文(简体)', flag: '🇨🇳', code: 'zh' }
  };

  const DEFAULT_LANGUAGE = 'ru'; // Русский по умолчанию
  const STORAGE_KEY = 'game_language';

  class LocalizationManager {
    constructor() {
      this.currentLanguage = DEFAULT_LANGUAGE;
      this.translations = {};
      this.loaded = false;
      this.listeners = [];
    }

    // Загрузка переводов из JSON
    async loadTranslations(url = 'localization-data.json') {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load translations: ${response.status}`);
        this.translations = await response.json();
        this.loaded = true;
        console.log('✅ Localization loaded:', Object.keys(this.translations).length, 'keys');
        return true;
      } catch (error) {
        console.error('❌ Failed to load localization:', error);
        // Fallback - используем минимальный набор переводов
        this.translations = this.getFallbackTranslations();
        this.loaded = true;
        return false;
      }
    }

    // Минимальный набор переводов на случай ошибки загрузки
    getFallbackTranslations() {
      return {
        menu_play: { en: 'Play', uk: 'Грати', ru: 'Играть', de: 'Spielen', fr: 'Jouer', es: 'Jugar', it: 'Gioca', pt: 'Jogar', zh: '开始游戏' },
        menu_settings: { en: 'Settings', uk: 'Налаштування', ru: 'Настройки', de: 'Einstellungen', fr: 'Paramètres', es: 'Ajustes', it: 'Impostazioni', pt: 'Configurações', zh: '设置' },
        common_close: { en: 'Close', uk: 'Закрити', ru: 'Закрыть', de: 'Schließen', fr: 'Fermer', es: 'Cerrar', it: 'Chiudi', pt: 'Fechar', zh: '关闭' }
      };
    }

    // Определение языка устройства
    detectDeviceLanguage() {
      const browserLang = navigator.language || navigator.userLanguage || '';
      const langCode = browserLang.split('-')[0].toLowerCase();
      
      // Проверяем, поддерживается ли язык
      if (SUPPORTED_LANGUAGES[langCode]) {
        return langCode;
      }
      
      return DEFAULT_LANGUAGE;
    }

    // Инициализация языка
    async initialize() {
      await this.loadTranslations();
      
      // Пробуем загрузить сохраненный язык
      const savedLang = localStorage.getItem(STORAGE_KEY);
      
      if (savedLang && SUPPORTED_LANGUAGES[savedLang]) {
        this.currentLanguage = savedLang;
      } else {
        // Автоопределение языка устройства
        this.currentLanguage = this.detectDeviceLanguage();
        this.saveLanguage(this.currentLanguage);
      }
      
      console.log('🌍 Current language:', this.currentLanguage, SUPPORTED_LANGUAGES[this.currentLanguage].name);
      return this.currentLanguage;
    }

    // Получить перевод по ключу
    get(key, ...params) {
      if (!this.loaded) {
        console.warn('Localization not loaded yet');
        return key;
      }

      const translation = this.translations[key];
      if (!translation) {
        console.warn(`Missing translation key: ${key}`);
        return key;
      }

      let text = translation[this.currentLanguage] || translation[DEFAULT_LANGUAGE] || key;
      
      // Подстановка параметров {0}, {1}, etc.
      params.forEach((param, index) => {
        text = text.replace(`{${index}}`, param);
      });
      
      return text;
    }

    // Сменить язык
    setLanguage(langCode) {
      if (!SUPPORTED_LANGUAGES[langCode]) {
        console.error(`Unsupported language: ${langCode}`);
        return false;
      }

      this.currentLanguage = langCode;
      this.saveLanguage(langCode);
      this.notifyListeners();
      console.log('🌍 Language changed to:', SUPPORTED_LANGUAGES[langCode].name);
      return true;
    }

    // Сохранить выбранный язык
    saveLanguage(langCode) {
      localStorage.setItem(STORAGE_KEY, langCode);
    }

    // Получить текущий язык
    getCurrentLanguage() {
      return this.currentLanguage;
    }

    // Получить информацию о языке
    getLanguageInfo(langCode) {
      return SUPPORTED_LANGUAGES[langCode] || null;
    }

    // Получить все поддерживаемые языки
    getSupportedLanguages() {
      return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
        code,
        ...info
      }));
    }

    // Подписка на изменение языка
    addListener(callback) {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter(cb => cb !== callback);
      };
    }

    // Уведомление подписчиков
    notifyListeners() {
      this.listeners.forEach(callback => {
        try {
          callback(this.currentLanguage);
        } catch (error) {
          console.error('Localization listener error:', error);
        }
      });
    }

    // Обновить все элементы с data-localize атрибутом
    updateDOM() {
      const elements = document.querySelectorAll('[data-localize]');
      elements.forEach(el => {
        const key = el.getAttribute('data-localize');
        const params = el.getAttribute('data-localize-params');
        
        if (key) {
          const paramsArray = params ? JSON.parse(params) : [];
          el.textContent = this.get(key, ...paramsArray);
        }
      });
    }

    // Обновить элемент с placeholder
    updatePlaceholders() {
      const elements = document.querySelectorAll('[data-localize-placeholder]');
      elements.forEach(el => {
        const key = el.getAttribute('data-localize-placeholder');
        if (key) {
          el.placeholder = this.get(key);
        }
      });
    }

    // Полное обновление интерфейса
    refreshUI() {
      this.updateDOM();
      this.updatePlaceholders();
      this.notifyListeners();
    }
  }

  // Создаем глобальный экземпляр
  const localization = new LocalizationManager();

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = localization;
  } else {
    global.LocalizationManager = localization;
  }
})(typeof window !== 'undefined' ? window : global);
