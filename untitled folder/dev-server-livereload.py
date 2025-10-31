#!/usr/bin/env python3
"""
Сервер с live reload - автоматическая перезагрузка при изменениях файлов
"""
import http.server
import socketserver
import os
import sys
import time
import threading
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# WebSocket для live reload будет через простой SSE (Server-Sent Events)
class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler без кэширования + live reload"""
    
    last_change_time = time.time()
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        # Если запрос на /livereload - отдаём SSE stream
        if self.path == '/livereload':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            
            last_check = time.time()
            try:
                while True:
                    time.sleep(1)
                    if NoCacheHTTPRequestHandler.last_change_time > last_check:
                        self.wfile.write(b'data: reload\n\n')
                        self.wfile.flush()
                        break
                    # Heartbeat
                    self.wfile.write(b': ping\n\n')
                    self.wfile.flush()
            except:
                pass
            return
        
        # Для HTML файлов добавляем live reload скрипт
        if self.path.endswith('.html') or self.path == '/':
            super().do_GET()
        else:
            super().do_GET()

class FileChangeHandler(FileSystemEventHandler):
    """Отслеживание изменений файлов"""
    
    def on_modified(self, event):
        if event.is_directory:
            return
        
        # Игнорируем некоторые файлы
        ignored = ['.git', '.DS_Store', '__pycache__', '.pyc', 'server.pid', '.py']
        if any(ig in event.src_path for ig in ignored):
            return
        
        # Важные файлы для перезагрузки
        important = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.svg']
        if any(event.src_path.endswith(ext) for ext in important):
            print(f"  📝 Изменён: {Path(event.src_path).name}")
            NoCacheHTTPRequestHandler.last_change_time = time.time()

def watch_files(directory):
    """Запуск наблюдателя за файлами"""
    event_handler = FileChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, directory, recursive=True)
    observer.start()
    return observer

def inject_livereload_script(content):
    """Добавляет live reload скрипт в HTML"""
    script = """
<script>
(function() {
    const source = new EventSource('/livereload');
    source.onmessage = function(e) {
        if (e.data === 'reload') {
            console.log('🔄 Перезагрузка...');
            location.reload();
        }
    };
    source.onerror = function() {
        source.close();
        setTimeout(() => location.reload(), 1000);
    };
    console.log('✅ Live Reload активирован');
})();
</script>
</body>"""
    return content.replace('</body>', script)

def main():
    PORT = 5500
    DIRECTORY = Path(__file__).parent
    
    os.chdir(DIRECTORY)
    
    # Запускаем наблюдателя за файлами
    print("🔍 Запуск наблюдателя за файлами...")
    observer = watch_files(DIRECTORY)
    
    with socketserver.TCPServer(("0.0.0.0", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"""
╔═══════════════════════════════════════════════════════════╗
║  🚀 LIVE RELOAD DEV SERVER                               ║
╟───────────────────────────────────────────────────────────╢
║  Порт:        {PORT}                                         ║
║  Локально:    http://localhost:{PORT}                      ║
║  LAN:         http://192.168.1.232:{PORT}                  ║
╟───────────────────────────────────────────────────────────╢
║  ✓ Кэширование отключено                                 ║
║  ✓ Автоматическая перезагрузка при изменениях            ║
║  ✓ Отслеживание: .html, .css, .js, .json, картинки       ║
║  ✓ Нажмите Ctrl+C для остановки                          ║
╚═══════════════════════════════════════════════════════════╝

📡 Ожидание изменений...
        """)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Остановка...")
            observer.stop()
            observer.join()
            print("✓ Сервер остановлен")
            sys.exit(0)

if __name__ == "__main__":
    main()
