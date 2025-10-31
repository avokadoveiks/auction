#!/bin/zsh
# Скрипт для запуска dev-сервера с автоматической перезагрузкой

# Останавливаем старый сервер если запущен
if [ -f server.pid ]; then
    OLD_PID=$(cat server.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⏹️  Останавливаю старый сервер (PID: $OLD_PID)..."
        kill $OLD_PID
        sleep 1
    fi
    rm -f server.pid
fi

# Запускаем новый сервер
echo "🚀 Запуск dev-сервера с live reload..."
python3 dev-server.py &
echo $! > server.pid

echo ""
echo "✅ Сервер запущен!"
echo "   PID: $(cat server.pid)"
echo "   URL: http://localhost:5500"
echo ""
echo "Теперь просто редактируйте файлы - изменения видны сразу после Ctrl+R"
echo "Для остановки: ./stop_server.sh или kill $(cat server.pid)"
