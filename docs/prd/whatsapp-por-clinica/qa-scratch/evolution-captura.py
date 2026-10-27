"""Receptor local no lugar da Evolution API para o QA de ponta a ponta do WhatsApp.

O bot de QA (:8093) envia as respostas ao paciente para cá, em vez do WhatsApp real: nenhuma
mensagem sai para um telefone de verdade. Cada envio vira uma linha JSON em evolution-captura.jsonl
(o "celular" do paciente de teste). Uso: python evolution-captura.py [porta] [arquivo]
"""
import json
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
ARQUIVO = sys.argv[2] if len(sys.argv) > 2 else 'evolution-captura.jsonl'


class Captura(BaseHTTPRequestHandler):
    def _ler_corpo(self):
        # o RestClient do bot envia em partes (Transfer-Encoding: chunked), sem Content-Length
        if 'chunked' in (self.headers.get('Transfer-Encoding') or '').lower():
            partes = []
            while True:
                tamanho = int(self.rfile.readline().strip().split(b';')[0] or b'0', 16)
                if tamanho == 0:
                    self.rfile.readline()
                    break
                partes.append(self.rfile.read(tamanho))
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
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status":"capturado"}')

    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    HTTPServer(('127.0.0.1', PORTA), Captura).serve_forever()
