"""RODADA 8 — receptor local no lugar da Evolution API (mesma saida do evolution-captura.py), que tambem
le corpo com Transfer-Encoding: chunked. Motivo: o bot envia o POST /message/sendText sem Content-Length
(chunked) e o evolution-captura.py original gravou {"bruto": ""}. Nenhuma mensagem sai para WhatsApp real.
Uso: python r8-captura-chunked.py [porta] [arquivo]
"""
import json
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
ARQUIVO = sys.argv[2] if len(sys.argv) > 2 else 'evolution-captura.jsonl'


class Captura(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def _ler_corpo(self):
        if 'chunked' in (self.headers.get('Transfer-Encoding') or '').lower():
            partes = []
            while True:
                linha = self.rfile.readline().strip()
                tam = int(linha.split(b';')[0], 16) if linha else 0
                if tam == 0:
                    self.rfile.readline()
                    break
                partes.append(self.rfile.read(tam))
                self.rfile.readline()
            return b''.join(partes)
        return self.rfile.read(int(self.headers.get('Content-Length') or 0))

    def do_POST(self):
        corpo = self._ler_corpo().decode('utf-8', errors='replace')
        try:
            dados = json.loads(corpo)
        except ValueError:
            dados = {'bruto': corpo}
        registro = {'quando': datetime.now(timezone.utc).isoformat(), 'rota': self.path, 'corpo': dados}
        with open(ARQUIVO, 'a', encoding='utf-8') as f:
            f.write(json.dumps(registro, ensure_ascii=False) + '\n')
        resposta = b'{"status":"capturado"}'
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(resposta)))
        self.end_headers()
        self.wfile.write(resposta)

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Length', '2')
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', PORTA), Captura).serve_forever()
