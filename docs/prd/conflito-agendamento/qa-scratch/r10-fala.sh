#!/usr/bin/env bash
# RODADA 10 — envia uma fala do paciente (r10-wa.mjs) e mostra as linhas do ia-qa.log (WhatsAppService) e do bot-qa.log desde o envio
# uso: bash r10-fala.sh <logId> "<texto>"
cd /c/AmbienteDev/sgsm-front-medico/docs/prd/conflito-agendamento/qa-scratch
set -a; . /c/AmbienteDev/.env >/dev/null 2>&1; set +a
export WA_ESPERA_MS=${WA_ESPERA_MS:-120000}
T0=$(date -u +%Y-%m-%dT%H:%M:%S)
node r10-wa.mjs ${NUM:-5511900010431} "$1" "$2"
node -e "
const fs=require('fs');const T='$T0';
for(const [f,re] of [['ia-qa.log',/WhatsAppService/],['bot-qa.log',/sgsm\.whatsapp/]])for(const l of fs.readFileSync('C:/Users/re048720/AppData/Local/Temp/sgsm-plano/'+f,'utf8').split('\n')){try{const j=JSON.parse(l);if(j['@timestamp']>=T&&re.test(j.log.logger))console.log('['+f+']',j['@timestamp'],j.log.level,j.log.logger.split('.').pop(),j.message.replace(/\s+/g,' ').slice(0,1200))}catch{}}"
