#!/usr/bin/env python3
"""
Сервер разработки с автоматической перезагрузкой и отключённым кэшированием
"""
import http.server
import socketserver
import os
import sys
from pathlib import Path

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler без кэширования для разработки"""
    
    def end_headers(self):
        # Отключаем кэширование полностью
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Более читаемый лог
        sys.stderr.write("%s - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format % args))

def main():
    PORT = 5500
    DIRECTORY = Path(__file__).parent.parent  # Go up to auction1 root
    
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("0.0.0.0", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"""
╔═══════════════════════════════════════════════════════════╗
║  🚀 DEV SERVER - Режим разработки                        ║
╟───────────────────────────────────────────────────────────╢
║  Порт:        {PORT}                                         ║
║  Директория:  {DIRECTORY.name[:40]:<40} ║
║  Локально:    http://localhost:{PORT}                      ║
║  LAN:         http://192.168.1.232:{PORT}                  ║
╟───────────────────────────────────────────────────────────╢
║  ✓ Кэширование отключено                                 ║
║  ✓ Изменения видны сразу после Ctrl+R                    ║
║  ✓ Нажмите Ctrl+C для остановки                          ║
╚═══════════════════════════════════════════════════════════╝
        """)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Сервер остановлен")
            sys.exit(0)

if __name__ == "__main__":
    main()
