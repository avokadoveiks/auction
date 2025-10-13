// Скрипт для игры аукциона под iPhone 15

// Тестовые аккаунты
const testAccounts = [
    { name: 'Игрок1', avatar: 'https://picsum.photos/400/600?random=1', balance: 500 },
    { name: 'Игрок2', avatar: 'https://picsum.photos/400/600?random=2', balance: 500 },
    { name: 'Игрок3', avatar: 'https://picsum.photos/400/600?random=3', balance: 500 }
];

let currentAccountIndex = 0;

// Глобальные массивы состояния (доступны обработчикам кликов)
let timers = [20, 20, 20, 20, 20];
// autoBet теперь двумерный массив: [игрок][колонка]
let autoBet = [
    [false, false, false, false, false], // Игрок 1
    [false, false, false, false, false], // Игрок 2
    [false, false, false, false, false]  // Игрок 3
];
let betOwner = [undefined, undefined, undefined, undefined, undefined];
let bankAmounts = [3, 6, 9, 12, 15]; // Начальный банк для каждой колонки (базовая ставка)
let timerElements = [];
let bankElements = [];
let endGameTimeouts = [null, null, null, null, null]; // Таймауты для завершения игры
let timerIntervals = [null, null, null, null, null]; // Интервалы таймеров
// История побед
let winnersHistory = []; // { time: Date, playerIndex, columnIndex (1-based), amount }
// Фаза победителя (15 сек) и её таймеры
let winnerPhase = [false, false, false, false, false];
let winnerTimers = [0, 0, 0, 0, 0];
let winnerIntervals = [null, null, null, null, null];

// Функция startTimer - ВЫНЕСЕНА НАРУЖУ чтобы быть доступной из makeBet
function startTimer(index) {
    // Очистить старый interval если существует
    if (timerIntervals[index] !== null) {
        clearInterval(timerIntervals[index]);
        timerIntervals[index] = null;
    }
    
    // Создать новый интервал
    timerIntervals[index] = setInterval(() => {
        // Уменьшить таймер
        timers[index]--;
        
        // Обновить отображение
        const minutes = Math.floor(timers[index] / 60);
        const seconds = timers[index] % 60;
        timerElements[index].textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Пульсация начинается когда <= 5 секунд
        if (timers[index] <= 5) {
            timerElements[index].classList.add('warning');
        } else {
            timerElements[index].classList.remove('warning');
        }

        // Автоставка НЕ срабатывает по таймеру, только при перебивании другим игроком

        // Если таймер дошел до 0
        if (timers[index] <= 0) {
            clearInterval(timerIntervals[index]);
            timerIntervals[index] = null;
            timerElements[index].textContent = '0:00';
            // Оставляем класс warning чтобы таймер оставался красным и большим
            
            // Задержка 4 секунды на случай если кто-то сделает ставку в последний момент
            endGameTimeouts[index] = setTimeout(() => {
                    // Проверяем что таймер всё ещё на 0 (не было перебивания)
                if (timers[index] <= 0) {
                    // Выплата банка победителю
                    if (betOwner[index] !== undefined && bankAmounts[index] > 0) {
                        const winner = betOwner[index];
                        testAccounts[winner].balance += bankAmounts[index];
                    
                        // Обновить баланс если победитель - текущий просматриваемый игрок
                        if (winner === currentAccountIndex) {
                            document.getElementById('currentBalance').textContent = `💰 ${testAccounts[winner].balance} акций`;
                        }
                        
                            // Записать в историю побед
                            winnersHistory.unshift({
                                time: new Date(),
                                playerIndex: winner,
                                columnIndex: index + 1,
                                amount: bankAmounts[index]
                            });
                            // Обновить UI списка победителей, если открыт
                            updateWinnersUI();
                            
                            // Отобразить "Победитель" по центру и запустить 15-секундный таймер победителя
                            winnerPhase[index] = true;
                            const columnElement = document.querySelector(`[data-column="${index + 1}"]`);
                            const infoEl = document.getElementById(`bet-info-${index + 1}`);
                            const nameEl = document.getElementById(`bet-name-${index + 1}`);
                            // Фон оставляем аватар победителя на время победной фазы
                            if (columnElement) {
                                columnElement.style.setProperty('--bg-image', `url('${testAccounts[winner].avatar}')`);
                                columnElement.classList.add('winner-phase');
                            }
                            // Конфетти
                            spawnConfetti(index);
                            if (infoEl && nameEl) {
                                nameEl.textContent = 'Победитель!';
                                infoEl.style.display = 'block';
                            }
                        
                            // Сброс банка и владельца на начальные значения сразу
                            const initialBanks = [3, 6, 9, 12, 15];
                            bankAmounts[index] = initialBanks[index];
                            betOwner[index] = undefined;
                            bankElements[index].textContent = `Банк: ${initialBanks[index]}`;
                            
                            // Запустить 15-секундный таймер победителя
                            startWinnerTimer(index);
                    }
                    
                        // Выключить автоставку для всех игроков когда игра заканчивается
                    for (let i = 0; i < 3; i++) {
                        autoBet[i][index] = false;
                    }
                        // Основной таймер НЕ запускаем сейчас — ждём завершения победной фазы
                }
                endGameTimeouts[index] = null;
            }, 4000); // Задержка 4 секунды перед завершением раунда
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', function() {
    // Уведомление при клике на значок таймера в первой колонке
    const timerBadge = document.getElementById('timer-badge');
    const timerNotify = document.getElementById('timer-notify');
    if (timerBadge && timerNotify) {
        timerBadge.addEventListener('click', function(e) {
            e.stopPropagation();
            timerNotify.classList.add('show');
            setTimeout(() => {
                timerNotify.classList.remove('show');
            }, 1800);
        });
        document.addEventListener('click', function(e) {
            if (!timerNotify.contains(e.target) && !timerBadge.contains(e.target)) {
                timerNotify.classList.remove('show');
            }
        });
    }
    // Уведомление при клике на знак запрета автоставки
    const badge = document.querySelector('.no-auto-badge');
    const notify = document.getElementById('no-auto-notify');
    if (badge && notify) {
        badge.addEventListener('click', function(e) {
            e.stopPropagation();
            notify.classList.add('show');
            setTimeout(() => {
                notify.classList.remove('show');
            }, 1600);
        });
        // Скрывать уведомление при клике вне его
        document.addEventListener('click', function(e) {
            if (!notify.contains(e.target) && !badge.contains(e.target)) {
                notify.classList.remove('show');
            }
        });
    }
    
    // Уведомление при клике на значок дуэли
    const duelBadge = document.getElementById('duel-badge');
    const duelNotify = document.getElementById('duel-notify');
    if (duelBadge && duelNotify) {
        duelBadge.addEventListener('click', function(e) {
            e.stopPropagation();
            duelNotify.classList.add('show');
            setTimeout(() => {
                duelNotify.classList.remove('show');
            }, 1600);
        });
        document.addEventListener('click', function(e) {
            if (!duelNotify.contains(e.target) && !duelBadge.contains(e.target)) {
                duelNotify.classList.remove('show');
            }
        });
    }
    
    // Привязываем DOM-элементы таймеров и банков к глобальным массивам
    timerElements = [
        document.getElementById('timer-1'),
        document.getElementById('timer-2'),
        document.getElementById('timer-3'),
        document.getElementById('timer-4'),
        document.getElementById('timer-5')
    ];
    
    bankElements = [
        document.getElementById('bank-1'),
        document.getElementById('bank-2'),
        document.getElementById('bank-3'),
        document.getElementById('bank-4'),
        document.getElementById('bank-5')
    ];

    // Запуск таймеров
    for (let i = 0; i < 5; i++) {
        startTimer(i);
    }

    // Инициализация UI
    updateAccountUI();
    
    // Инициализация текста кнопок автоставки
    for (let i = 1; i <= 5; i++) {
        updateAutoButtonText(i);
    }

    // Чат функционал
    window.toggleChat = function() {
        const chatPanel = document.getElementById('chatPanel');
        chatPanel.classList.toggle('open');
    };

    window.sendMessage = function() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (message) {
            const messagesDiv = document.getElementById('chatMessages');
            const currentAccount = testAccounts[currentAccountIndex];
            const messageDiv = document.createElement('div');
            messageDiv.textContent = `${currentAccount.name}: ${message}`;
            messagesDiv.appendChild(messageDiv);
            input.value = '';
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    };

    // Отправка по Enter
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

// История побед — открыть/закрыть
function toggleWinners() {
    const panel = document.getElementById('winnersPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        updateWinnersUI();
    }
}

function formatTime(date) {
    const d = new Date(date);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function updateWinnersUI() {
    const list = document.getElementById('winnersList');
    if (!list) return;
    list.innerHTML = '';
    if (winnersHistory.length === 0) {
        list.innerHTML = '<div class="winner-item">Побед пока нет</div>';
        return;
    }
    winnersHistory.forEach((win) => {
        const item = document.createElement('div');
        item.className = 'winner-item';
        const name = testAccounts[win.playerIndex]?.name ?? `Игрок ${win.playerIndex + 1}`;
        item.innerHTML = `
            <div>${formatTime(win.time)}</div>
            <div>${name}</div>
            <div>Колонка ${win.columnIndex}</div>
            <div>+${win.amount} акций</div>
        `;
        list.appendChild(item);
    });
}

// 15-секундный таймер победителя с надписью "Победитель!"
function startWinnerTimer(index) {
    // Очистить предыдущий, если есть
    if (winnerIntervals[index]) {
        clearInterval(winnerIntervals[index]);
        winnerIntervals[index] = null;
    }
    winnerTimers[index] = 15;
    const timerElement = timerElements[index];
    const columnNum = index + 1;
    const infoEl = document.getElementById(`bet-info-${columnNum}`);
    const nameEl = document.getElementById(`bet-name-${columnNum}`);

    // Обновить отображение сразу
    timerElement.classList.remove('warning');
    timerElement.textContent = `0:${String(winnerTimers[index]).padStart(2, '0')}`;

    winnerIntervals[index] = setInterval(() => {
        winnerTimers[index]--;
        timerElement.textContent = `0:${String(Math.max(0, winnerTimers[index])).padStart(2, '0')}`;
        if (winnerTimers[index] <= 0) {
            clearInterval(winnerIntervals[index]);
            winnerIntervals[index] = null;
            winnerPhase[index] = false;

            // Скрыть оверлей, сбросить фон
            const columnElement = document.querySelector(`[data-column="${columnNum}"]`);
            if (columnElement) {
                columnElement.style.removeProperty('--bg-image');
                columnElement.classList.remove('winner-phase');
                // Удалить конфетти
                const confetti = columnElement.querySelectorAll('.confetti-container');
                confetti.forEach(el => el.remove());
            }
            if (infoEl) infoEl.style.display = 'none';
            if (nameEl) nameEl.textContent = '';

            // Сброс основного таймера и запуск нового раунда
            timers[index] = 20;
            timerElements[index].textContent = '0:20';
            timerElements[index].classList.remove('warning');
            startTimer(index);
        }
    }, 1000);
}

// Создать конфетти внутри колонки
function spawnConfetti(index) {
    const columnNum = index + 1;
    const columnElement = document.querySelector(`[data-column="${columnNum}"]`);
    if (!columnElement) return;
    // Если уже есть контейнер конфетти — не дублируем
    if (columnElement.querySelector('.confetti-container')) return;

    const container = document.createElement('div');
    container.className = 'confetti-container';
    const colors = ['#ffd700', '#ff6b6b', '#6aa5ff', '#2ecc71', '#f39c12', '#9b59b6'];
    const pieces = 36;
    for (let i = 0; i < pieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        const dur = 1.2 + Math.random() * 1.4; // 1.2s - 2.6s
        const delay = Math.random() * 0.5; // 0 - 0.5s
        piece.style.animationDuration = dur + 's';
        piece.style.animationDelay = delay + 's';
        container.appendChild(piece);
    }
    columnElement.appendChild(container);
}

// Функция переключения аккаунта
function switchAccount(index) {
    currentAccountIndex = parseInt(index);
    updateAccountUI();
}

// Функция для следующего аккаунта
function nextAccount() {
    currentAccountIndex = (currentAccountIndex + 1) % 3;
    updateAccountUI();
}

// Обновление UI аккаунта
function updateAccountUI() {
    const currentAccount = testAccounts[currentAccountIndex];
    document.getElementById('accountSelector').value = currentAccountIndex;
    const avatarElement = document.getElementById('currentAvatar');
    avatarElement.innerHTML = `<img src="${currentAccount.avatar}" style="width: 30px; height: 30px; border-radius: 50%;">`;
    document.getElementById('currentName').textContent = currentAccount.name;
    document.getElementById('currentBalance').textContent = `💰 ${currentAccount.balance} акций`;
    
    // Обновить текст всех кнопок автоставки для текущего игрока
    for (let i = 1; i <= 5; i++) {
        updateAutoButtonText(i);
    }
}

// Функция для получения суммы ставки
function getAmount(column) {
    return column * 2; // Например, колонка 1 - 2, 2 - 4, etc.
}

// Функция для ставки
function makeBet(column, amount, isAuto = false, playerIndex = -1) {
    // Определяем, кто делает ставку. Если playerIndex передан, используем его. Иначе - текущего игрока из UI.
    const bettingPlayerIndex = (playerIndex !== -1) ? playerIndex : currentAccountIndex;
    const wasTimerAtZero = timers[column - 1] <= 0;

    // Во время победной фазы ставки игнорируются
    if (winnerPhase[column - 1]) {
        console.log(`Колонка ${column}: идёт таймер победителя, ставки закрыты.`);
        return;
    }

    // Блок повторной ставки тем же владельцем: ничего не делаем, если игрок уже владеет колонкой
    if (betOwner[column - 1] === bettingPlayerIndex) {
        if (isAuto) {
            console.log(`Колонка ${column}: ${testAccounts[bettingPlayerIndex].name} уже владелец, авто-ставка отменена.`);
        } else {
            console.log(`Колонка ${column}: ${testAccounts[bettingPlayerIndex].name} уже владеет — повторная ставка игнорируется.`);
        }
        return;
    }

    if (testAccounts[bettingPlayerIndex].balance < amount) {
        console.log(`Недостаточно средств у игрока ${testAccounts[bettingPlayerIndex].name}`);
        return;
    }

    const prevOwner = betOwner[column - 1];
    const isOutbid = prevOwner !== undefined && prevOwner !== bettingPlayerIndex;

    // Если таймер был на нуле, немедленно добавляем 4 секунды и перезапускаем интервал
    if (wasTimerAtZero) {
        // Отменяем запланированное завершение раунда, если оно было
        if (endGameTimeouts[column - 1]) {
            clearTimeout(endGameTimeouts[column - 1]);
            endGameTimeouts[column - 1] = null;
        }
        timers[column - 1] = 4;
        if (!timerIntervals[column - 1]) {
            startTimer(column - 1); // column is 1-based, startTimer expects 0-based index
        }
    }

    // Основная логика ставки выполняется с небольшой задержкой для плавности
    setTimeout(() => {
        // Повторная проверка баланса на случай, если он изменился за время задержки
        if (testAccounts[bettingPlayerIndex].balance < amount) {
            console.log(`Недостаточно средств у игрока ${testAccounts[bettingPlayerIndex].name} после задержки.`);
            return;
        }

        // Логика списания и увеличения банка:
        // - Первая ставка в пустую колонку: банк НЕ меняется
        // - Только при перебивании (isOutbid) банк растет на сумму ставки
        testAccounts[bettingPlayerIndex].balance -= amount;
        if (isOutbid) {
            bankAmounts[column - 1] += amount;
        }

        console.log(`Колонка ${column}: Игрок ${testAccounts[bettingPlayerIndex].name} делает ставку ${amount}. Баланс: ${testAccounts[bettingPlayerIndex].balance}. Банк: ${bankAmounts[column - 1]}${isOutbid ? ' (увеличен)' : ''}`);

        betOwner[column - 1] = bettingPlayerIndex;
        updateColumnUI(column);
        updateAccountUI(); // Обновляем баланс для всех

        // Логика таймера: на любую ставку добавляем +4 секунды, кроме случая, когда только что был 0 (там мы уже поставили 4)
        if (!wasTimerAtZero) {
            timers[column - 1] += 4;
        }

        // На всякий случай, если интервал не запущен (например, был на 0)
        if (!timerIntervals[column - 1]) {
            // Отменяем запланированное завершение раунда, если оно было
            if (endGameTimeouts[column - 1]) {
                clearTimeout(endGameTimeouts[column - 1]);
                endGameTimeouts[column - 1] = null;
            }
            startTimer(column - 1); // column is 1-based, startTimer expects 0-based index
        }

        // --- ЛОГИКА АВТО-ОТВЕТА ---
        // Если ставка перебила другого игрока, и у того игрока включена автоставка
        if (isOutbid && prevOwner !== undefined && autoBet[prevOwner][column - 1]) {
            console.log(`Колонка ${column}: Проверка авто-ответа от игрока ${testAccounts[prevOwner].name}.`);
            
            // Добавляем задержку перед ответной ставкой, чтобы битва была видна
            setTimeout(() => {
                console.log(`Колонка ${column}: Игрок ${testAccounts[prevOwner].name} автоматически перебивает.`);
                // Вызываем makeBet для предыдущего владельца, передавая его индекс, с корректной суммой колонки
                makeBet(column, getAmount(column), true, prevOwner); 
            }, 1500); // Задержка в 1.5 секунды для ответной ставки
        }
        // --- КОНЕЦ ЛОГИКИ ---

    }, isAuto ? 500 : 100); // Небольшая задержка для всех ставок
}

function updateColumnUI(column) {
    const bankElement = bankElements[column - 1];
    const timerElement = timerElements[column - 1];
    const currentBankAmount = bankAmounts[column - 1];
    const ownerIndex = betOwner[column - 1];
    const columnElement = document.querySelector(`[data-column="${column}"]`);
    const infoEl = document.getElementById(`bet-info-${column}`);
    const avatarEl = document.getElementById(`bet-avatar-${column}`);
    const nameEl = document.getElementById(`bet-name-${column}`);
    
    // Обновление текста банка
    bankElement.textContent = `Банк: ${currentBankAmount}`;
    
    // Обновление таймера
    const minutes = Math.floor(timers[column - 1] / 60);
    const seconds = timers[column - 1] % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Пульсация таймера
    if (timers[column - 1] <= 5) {
        timerElement.classList.add('warning');
    } else {
        timerElement.classList.remove('warning');
    }

    // Показ аватара и имени на фоне и в оверлее, если есть владелец
    if (ownerIndex !== undefined && ownerIndex !== null) {
        const acc = testAccounts[ownerIndex];
        if (columnElement) {
            columnElement.style.setProperty('--bg-image', `url('${acc.avatar}')`);
        }
        if (infoEl && avatarEl && nameEl) {
            avatarEl.src = acc.avatar;
            nameEl.textContent = acc.name;
            infoEl.style.display = 'block';
        }
    }
}

// Функция для автоставки
function toggleAuto(column) {
    // Колонка 1 недоступна для автоставки
    if (column === 1) {
        const badge = document.querySelector('[data-column="1"] .no-auto-badge');
        if (badge) badge.title = 'В этой колонке нельзя делать автоставку';
        return;
    }
    const owner = betOwner[column - 1];
    
    // Если колонка пустая (нет владельца) - делаем первую ставку и включаем автоставку
    if (owner === undefined) {
        autoBet[currentAccountIndex][column - 1] = true;
        updateAutoButtonText(column);
        makeBet(column, getAmount(column), false); // Делаем первую ставку
        return;
    }
    
    // Если владелец - другой игрок, перебиваем его и включаем автоставку
    if (owner !== currentAccountIndex) {
        autoBet[currentAccountIndex][column - 1] = true;
        updateAutoButtonText(column);
        makeBet(column, getAmount(column), false); // Перебиваем
        return;
    }
    
    // Если владелец - текущий игрок, просто переключаем автоставку
    autoBet[currentAccountIndex][column - 1] = !autoBet[currentAccountIndex][column - 1];
    updateAutoButtonText(column);
}

// Подсказка при нажатии на красный кружок (колонка 1)
document.addEventListener('click', function(evt) {
    const el = evt.target;
    if (el && el.classList && el.classList.contains('no-auto-badge')) {
        // Всплывающая подсказка
        alert('В этой колонке нельзя делать автоставку');
    }
});

// Функция обновления текста кнопки автоставки
function updateAutoButtonText(column) {
    const button = document.getElementById(`auto-${column}`);
    if (button) {
        button.textContent = `Автоставка (${autoBet[currentAccountIndex][column - 1] ? 'вкл' : 'выкл'})`;
    }
}