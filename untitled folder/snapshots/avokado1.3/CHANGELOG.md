# Changelog для avokado 1.3

## Обновление 25 октября 2025

### Исправления меню (index.html, menu.css, menu.js)

#### 1. Кнопка "Лига" → всегда показывает "Лига"
**Файл:** `menu.js` (строка 334)

**Было:**
```javascript
if (leaguesButton){
  leaguesButton.textContent = league ? label : 'Лига';
}
```

**Стало:**
```javascript
if (leaguesButton){
  leaguesButton.textContent = 'Лига';
}
```

**Причина:** Пользователь хотел, чтобы кнопка всегда показывала текст "Лига", а не название текущей лиги (Бронза, Серебро и т.д.)

---

#### 2. Попап "Ваша лига" → исправлен z-index
**Файл:** `menu.css` (строки 512, 524)

**Было:**
```css
.leagues-popup__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 8, 16, 0.74);
  backdrop-filter: blur(8px);
}

.leagues-popup__card {
  position: fixed;
  /* ... */
}
```

**Стало:**
```css
.leagues-popup__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 8, 16, 0.74);
  backdrop-filter: blur(8px);
  z-index: 100;  /* ← ДОБАВЛЕНО */
}

.leagues-popup__card {
  position: fixed;
  /* ... */
  z-index: 101;  /* ← ДОБАВЛЕНО */
}
```

**Причина:** При открытии попапа выбора лиги, нижние кнопки (Топ, Сумка, Режим, Лига, Играть) перекрывали модальное окно. Теперь попап имеет z-index выше, чем `.menu-bottom` (z-index: 5), поэтому отображается корректно.

---

## Файлы в снимке
- ✅ `index.html` — актуальная разметка меню
- ✅ `menu.css` — стили с исправленным z-index (v=2025-10-25-4)
- ✅ `menu.js` — логика с исправленной кнопкой "Лига" (v=2025-10-25-4)
- ✅ `v1.html` — игровой экран (без изменений)
- ✅ `v1.css` — стили игры (без изменений)
- ✅ `v1.js` — логика игры (без изменений)
- ✅ `README.md` — описание версии
- ✅ `CHANGELOG.md` — этот файл

## Как применить изменения

```bash
# Перейти в корень проекта
cd "/Users/olehkruchko/Downloads/auction-game/untitled folder"

# Скопировать обновленные файлы меню
cp snapshots/avokado1.3/index.html .
cp snapshots/avokado1.3/menu.css .
cp snapshots/avokado1.3/menu.js .
```

## Тестирование

После копирования файлов:
1. Откройте `index.html` в браузере
2. Проверьте, что кнопка рядом с "Играть" показывает "Лига"
3. Нажмите на кнопку "Лига"
4. Убедитесь, что попап "Ваша лига" открывается поверх всех кнопок
5. Выберите любую лигу
6. Убедитесь, что кнопка по-прежнему показывает "Лига", а не название лиги
