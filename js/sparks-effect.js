/**
 * Sparks Effect - Эффект искр от металла
 * Создаёт светящиеся точки, которые медленно двигаются, мигают и исчезают
 */
(function() {
  'use strict';

  const canvas = document.getElementById('sparks-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let sparks = [];
  let animationId = null;

  // Конфигурация
  const CONFIG = {
    maxSparks: 60, // Максимальное количество искр
    spawnRate: 0.3, // Вероятность появления новой искры каждый кадр (0-1)
    minSize: 1.5,
    maxSize: 4,
    minSpeed: 0.15,
    maxSpeed: 0.5,
    minLifetime: 2000, // мс
    maxLifetime: 5000,
    colors: [
      { r: 255, g: 215, b: 0 },   // Золотой
      { r: 255, g: 185, b: 15 },  // Желто-оранжевый
      { r: 255, g: 165, b: 0 },   // Оранжевый
      { r: 255, g: 200, b: 50 },  // Светло-желтый
      { r: 255, g: 140, b: 0 }    // Тёмно-оранжевый
    ]
  };

  class Spark {
    constructor() {
      this.reset();
    }

    reset() {
      // Случайная позиция
      this.x = Math.random() * width;
      this.y = Math.random() * height;

      // Случайное направление движения
      const angle = Math.random() * Math.PI * 2;
      const speed = CONFIG.minSpeed + Math.random() * (CONFIG.maxSpeed - CONFIG.minSpeed);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      // Размер
      this.size = CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize);
      this.baseSize = this.size;

      // Цвет
      this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];

      // Время жизни
      this.lifetime = CONFIG.minLifetime + Math.random() * (CONFIG.maxLifetime - CONFIG.minLifetime);
      this.age = 0;
      this.createdAt = Date.now();

      // Эффект мерцания
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.02 + Math.random() * 0.04;

      // Прозрачность
      this.opacity = 0;
      this.fadeInDuration = 300; // Плавное появление
      this.fadeOutDuration = 800; // Плавное исчезновение
    }

    update(deltaTime) {
      this.age += deltaTime;

      // Движение
      this.x += this.vx;
      this.y += this.vy;

      // Мерцание (размер)
      this.pulsePhase += this.pulseSpeed;
      const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7; // 0.7 - 1.0
      this.size = this.baseSize * pulse;

      // Плавное появление и исчезновение
      if (this.age < this.fadeInDuration) {
        this.opacity = this.age / this.fadeInDuration;
      } else if (this.age > this.lifetime - this.fadeOutDuration) {
        const fadeProgress = (this.lifetime - this.age) / this.fadeOutDuration;
        this.opacity = fadeProgress;
      } else {
        this.opacity = 1;
      }

      // Дополнительное мерцание прозрачности
      const flickerOpacity = Math.sin(this.pulsePhase * 1.5) * 0.15 + 0.85;
      this.opacity *= flickerOpacity;

      // Проверка на выход за границы (зацикливание)
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;

      // Проверка времени жизни
      return this.age < this.lifetime;
    }

    draw() {
      if (this.opacity <= 0) return;

      const finalOpacity = Math.max(0, Math.min(1, this.opacity));

      // Внешнее свечение (glow)
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size * 3
      );

      gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${finalOpacity * 0.9})`);
      gradient.addColorStop(0.3, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${finalOpacity * 0.4})`);
      gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Яркое ядро
      ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity * 0.9})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    ctx.scale(dpr, dpr);
  }

  function spawnSpark() {
    if (sparks.length < CONFIG.maxSparks && Math.random() < CONFIG.spawnRate) {
      sparks.push(new Spark());
    }
  }

  let lastTime = Date.now();

  function animate() {
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;

    // Очистка canvas
    ctx.clearRect(0, 0, width, height);

    // Создание новых искр
    spawnSpark();

    // Обновление и отрисовка искр
    sparks = sparks.filter(spark => {
      const alive = spark.update(deltaTime);
      if (alive) {
        spark.draw();
      }
      return alive;
    });

    animationId = requestAnimationFrame(animate);
  }

  function init() {
    resize();
    
    // Создаём начальные искры для плавного старта
    const initialCount = Math.floor(CONFIG.maxSparks * 0.4);
    for (let i = 0; i < initialCount; i++) {
      const spark = new Spark();
      // Рандомизируем возраст для разнообразия
      spark.age = Math.random() * spark.lifetime * 0.5;
      sparks.push(spark);
    }
    
    animate();
  }

  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    sparks = [];
    ctx.clearRect(0, 0, width, height);
  }

  // События
  window.addEventListener('resize', resize);

  // Остановка анимации при скрытии вкладки (оптимизация)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      init();
    }
  });

  // Запуск
  init();

  // Публичный API для управления эффектом
  window.SparksEffect = {
    start: init,
    stop: stop,
    setMaxSparks: (count) => { CONFIG.maxSparks = count; },
    setSpawnRate: (rate) => { CONFIG.spawnRate = Math.max(0, Math.min(1, rate)); }
  };

})();
