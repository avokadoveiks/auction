# Тестирование эффектов монет

## Быстрый тест

1. Откройте игру: `http://127.0.0.1:5501/v1.html`
2. Откройте консоль (F12)
3. Дождитесь победы (любой игрок или бот)
4. Наблюдайте лог:
```
[WinFX] { columnId: 2, winnerId: 'alpha', isBot: false, prize: 24 }
[WinFX] Эффект победы для текущего игрока
```

## Проверка работы

### ✅ Что должно работать:

1. **Победа текущего игрока**:
   - Монеты летят из колонки в `#currentBalance`
   - 16 частиц
   - Баланс обновляется

2. **Победа другого игрока/бота**:
   - Монеты летят в резервный якорь `#spectator-pot`
   - 12 частиц
   - Баланс победителя обновляется (в фоне)

3. **Логи в консоли**:
```
[Game] Система ботов и эффектов инициализирована
[WinFX] Автоматические эффекты победы инициализированы
[Bots] Система ботов запущена: 3 Turtle ботов, target RPM: 18
```

## Ручное тестирование эффекта

В консоли:
```javascript
// Эмулировать победу текущего игрока
const currentId = window.ACCOUNTS[window.currentAccountIndex].id;
window.emitRoundEnd({ 
  columnId: 2, 
  winnerId: currentId, 
  isBot: false, 
  prize: 100 
});

// Эмулировать победу бота
window.emitRoundEnd({ 
  columnId: 3, 
  winnerId: 'bot_turtle_1', 
  isBot: true, 
  prize: 50 
});
```

## Отладка

### Если эффект не работает:

1. **Проверьте загрузку модулей**:
```javascript
console.log(window.emitRoundEnd); // должна быть функция
console.log(window.flyCoins);     // должна быть функция
```

2. **Проверьте элементы**:
```javascript
// Должны существовать:
document.querySelector('#currentBalance')  // ✅
document.querySelector('#spectator-pot')   // ✅
document.querySelector('.column[data-column="1"]') // ✅
```

3. **Проверьте события**:
```javascript
// В консоли должен быть лог при каждой победе:
// [WinFX] { columnId: ..., winnerId: ..., ... }
```

### Типичные проблемы:

❌ **"flyCoins не доступен"**
- Решение: Убедитесь, что v1.js загружен до модульного кода

❌ **"Не найден элемент колонки"**
- Решение: Проверьте, что используется правильный селектор `.column[data-column="${columnId}"]`

❌ **"Эффект не виден"**
- Решение: Проверьте CSS для `.coinfx-coin` (должен быть в v1.js)

## Настройка

### Изменить количество монет:

В `src/fx/winEffects.js`:
```javascript
// Для своей победы (строка ~31)
count: 16  // изменить на нужное

// Для чужой победы (строка ~56)
count: 12  // изменить на нужное
```

### Изменить приоритет целей:

В `src/fx/winEffects.js`, строка ~47, отредактируйте порядок селекторов.

### Отключить эффекты:

В `src/index.js` закомментируйте:
```javascript
// initWinEffects();
```

## Дополнительные якоря

Если хотите добавить кошельки для игроков, добавьте в разметку:

```html
<!-- В карточке игрока -->
<div id="player-alpha" class="player">
  <div class="wallet" data-wallet></div>
</div>
```

Или pot в колонке:
```html
<div class="column" data-column="2">
  <div class="pot" title="Prize pot"></div>
</div>
```

Эффект автоматически найдёт эти элементы и будет использовать их приоритетно.
