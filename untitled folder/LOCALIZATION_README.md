# 🌍 Система мультиязычности (Localization System)

## Поддерживаемые языки

- 🇺🇸 English
- 🇺🇦 Українська
- 🇷🇺 Русский
- 🇩🇪 Deutsch
- 🇫🇷 Français
- 🇪🇸 Español
- 🇮🇹 Italiano
- 🇧🇷 Português (Brazil)
- 🇨🇳 中文(简体)

## Файлы системы

1. **localization-manager.js** - менеджер локализации
2. **localization-data.json** - словарь переводов
3. **index.html** - интеграция в меню
4. **menu.js** - UI выбора языка

## Возможности

✅ Автоопределение языка устройства при первом запуске
✅ Сохранение выбранного языка в localStorage
✅ Моментальное обновление интерфейса без перезагрузки
✅ Поддержка параметризованных строк (например: "Unlock at {0} deals")
✅ Fallback на английский при отсутствии перевода
✅ Работает в WebGL и мобильных сборках

## Как использовать

### 1. В HTML (автоматический перевод)
```html
<button data-localize="menu_play">Играть</button>
<input data-localize-placeholder="chat_placeholder" placeholder="Введите сообщение...">
```

### 2. В JavaScript
```javascript
// Получить перевод
const text = LocalizationManager.get('menu_play');

// С параметрами
const text = LocalizationManager.get('realestate_locked', 500); // "Unlock at 500 deals"

// Сменить язык
LocalizationManager.setLanguage('en');

// Подписаться на изменения
LocalizationManager.addListener((newLang) => {
  console.log('Language changed to:', newLang);
  updateMyUI();
});
```

### 3. Добавить новый перевод

Откройте `localization-data.json` и добавьте ключ:

```json
{
  "my_new_key": {
    "en": "English text",
    "uk": "Український текст",
    "ru": "Русский текст",
    "de": "Deutscher Text",
    "fr": "Texte français",
    "es": "Texto español",
    "it": "Testo italiano",
    "pt": "Texto português",
    "zh": "中文文本"
  }
}
```

## API LocalizationManager

### Методы

- `initialize()` - инициализация (загрузка переводов, определение языка)
- `get(key, ...params)` - получить перевод по ключу
- `setLanguage(code)` - сменить язык
- `getCurrentLanguage()` - получить текущий язык
- `getSupportedLanguages()` - список поддерживаемых языков
- `addListener(callback)` - подписаться на изменения
- `refreshUI()` - обновить все элементы с data-localize

### События

При смене языка вызываются все зарегистрированные listeners:

```javascript
LocalizationManager.addListener((langCode) => {
  console.log('New language:', langCode);
});
```

## Интеграция в новые модули

### Банк (bank-ui.js)
```javascript
// В начале файла
const loc = window.LocalizationManager;

// При рендере
titleElement.textContent = loc.get('bank_title');
depositButton.textContent = loc.get('bank_deposit');
```

### Недвижимость (realestate-ui.js)
```javascript
const title = LocalizationManager.get('realestate_title');
const buyBtn = LocalizationManager.get('realestate_buy');
const locked = LocalizationManager.get('realestate_locked', 500);
```

### Чат
```javascript
input.placeholder = LocalizationManager.get('chat_placeholder');
sendButton.textContent = LocalizationManager.get('chat_send');
```

## Настройки

Откройте меню → ⚙️ Настройки → выберите язык с флагом.

Изменения применяются мгновенно!

## Технические детали

- **Хранение**: localStorage (`game_language`)
- **Fallback**: английский язык
- **Формат**: JSON с ключами и переводами
- **Параметры**: {0}, {1}, {2} в строках заменяются на переданные значения
- **Кэш**: нет, загрузка при каждой инициализации (можно добавить позже)

---

Разработано для Auction Game © 2025
