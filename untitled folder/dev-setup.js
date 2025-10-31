// Dev setup script - устанавливает 1000 сделок для аккаунта "Олег"
(function() {
  const playerName = 'Олег';
  const deals = 1000;
  
  // Устанавливаем в localStorage
  localStorage.setItem(`successfulDeals_${playerName}`, deals.toString());
  
  console.log(`✅ Установлено ${deals} успешных сделок для игрока "${playerName}"`);
  console.log('Обновите страницу для применения изменений');
})();
