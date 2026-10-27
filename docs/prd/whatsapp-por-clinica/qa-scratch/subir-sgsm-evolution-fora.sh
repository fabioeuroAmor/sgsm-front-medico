#!/usr/bin/env bash
# WA-T11: sobe o sgsm (perfil dev) apontando para uma Evolution inexistente (:8097). Igual ao subir.sh do sgsm:
# exporta so BOT_EVOLUTION_API_KEY, BOT_EVOLUTION_WEBHOOK_SECRET, SMTP_USERNAME e SMTP_PASSWORD do .env (sem imprimir);
# nunca JWT_SECRET nem chaves de crypto.
set -u
log="/c/Users/re048720/AppData/Local/Temp/sgsm-plano/sgsm-t11.log"
cd /c/AmbienteDev/sgsm || exit 1
for k in BOT_EVOLUTION_API_KEY BOT_EVOLUTION_WEBHOOK_SECRET SMTP_USERNAME SMTP_PASSWORD; do
  v=$(grep "^$k=" /c/AmbienteDev/.env | cut -d= -f2- | tr -d '\r"')
  export "$k=$v"
done
exec mvn -o -q spring-boot:run -Dspring-boot.run.profiles=dev "-Dspring-boot.run.arguments=--sgsm.whatsapp.evolution.base-url=http://localhost:8097" > "$log" 2>&1
