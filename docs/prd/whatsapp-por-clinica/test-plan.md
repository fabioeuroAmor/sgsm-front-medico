# Test plan — WhatsApp por clínica

Plano: `Plano_Desenvolvimento_WhatsApp_Por_Clinica_SGSM.docx` (v2, DW1–DW7). Etapa 7 (Cloud API) fora deste ciclo.
Prova exigida por item: print da tela **e** log cru (console/rede ou log do serviço). Sem os dois, o item fica aberto.
Nunca registrar segredo do webhook, tokens ou OTP nas evidências.

Pré-requisitos: V014–V017 aplicadas; sgsm, sgsm-ia e ms-whatsapp-bot reiniciados com o código novo; Evolution em :8090;
reindexação do Milvus feita (docs de catálogo com tag da clínica); um celular de teste para ler o QR (WA-C*).

## 1. Tela "WhatsApp da clínica" (Etapa 1)

- [x] WA-T01 ADMIN_ESTABELECIMENTO vê o item "WhatsApp da clínica" no menu e abre `/whatsapp-clinica`.
- [x] WA-T02 FUNCIONARIO vê o item; MEDICO e PACIENTE não veem; abrir a URL direto como MEDICO mostra a mensagem de acesso.
- [x] WA-T03 Clínica sem número: card "Nenhum WhatsApp conectado"; GET devolve 404 sem toast de erro.
- [x] WA-T04 ADMIN clica "Conectar WhatsApp": POST 201, aparece QR (imagem válida) e "Conferindo a cada 5 segundos…".
- [x] WA-T05 Clique duplo em "Conectar": só um POST sai (botão desabilitado enquanto ocupa).
- [x] WA-T06 Com o QR na tela, a rede mostra um GET a cada ~5s; ao trocar de página o polling para.
- [x] WA-T07 Recarregar com QR pendente: a tela volta no QR (canal PENDENTE_QR reaproveitado, sem instância nova).
- [x] WA-T08 Admin com duas clínicas troca no seletor: status/QR passam a ser da clínica escolhida, sem "piscar" a anterior.
- [x] WA-T09 FUNCIONARIO com canal pendente: vê o status, não vê "Conectar" nem "Desconectar".
- [x] WA-T10 Admin de outra clínica chamando a API da clínica alheia: 403/404 (escopo no sgsm).
- [ ] WA-T11 Evolution fora do ar ao conectar: POST 503 e toast com a mensagem do sgsm ("Não foi possível falar com o serviço de WhatsApp agora. Tente novamente."), tela não quebra e o botão volta habilitado. (Expectativa corrigida após a 1ª rodada: o texto genérico do plano original era um palpite; a mensagem específica do backend é a correta.)
- [ ] WA-T12 sgsm fora do ar: card de erro com "Tentar de novo" — tanto ao abrir a tela (lista de estabelecimentos falha) quanto com a tela aberta; ao voltar o sgsm, o botão recupera sem recarregar a página.
- [x] WA-T13 Desconectar: confirmação; cancelar não chama DELETE; confirmar → 204, toast e volta para "Nenhum WhatsApp conectado".
- [x] WA-T14 Sessão expirada na tela: redireciona para `/login?sessao=expirada`.
- [x] WA-T15 Nada existente quebra: Tráfego pago, Pacientes, Agendamentos abrem normalmente.

## 2. Conexão real (celular de teste)

- [ ] WA-C01 Ler o QR no celular: em até 5s a tela mostra "Conectado", o número formatado e o toast de sucesso.
- [ ] WA-C02 Desconectar o aparelho pelo celular: o monitor (≤5 min) marca DESCONECTADO e loga "ALERTA"; a tela mostra o QR novo.

## 3. Bot multi-número (Etapas 2–4)

- [x] WA-B01 Mensagem no número da clínica: sessão em `whatsapp:sessao:{instancia}:{numero}`; resposta sai pela instância da clínica.
- [x] WA-B02 Mensagem no "sgsm-bot" (canal geral, DW4): continua como antes (`whatsapp:sessao:{numero}`).
- [x] WA-B03 Webhook de instância desconhecida: 200 e mensagem ignorada (log), sem resposta ao contato.
- [x] WA-B04 Primeiro contato: termo LGPD; "aceito" grava `consentimento_lgpd` com a clínica e canal WHATSAPP e cria lead origem WHATSAPP.
- [x] WA-B05 Segundo contato do mesmo número na mesma clínica: não repete o termo nem duplica o lead.
- [ ] WA-B06 Pergunta sobre médicos/serviços: a IA só cita médicos e serviços da clínica do número.
- [x] WA-B07 Agendar pelo número da clínica: agendamento nasce com `estabelecimento_id` da clínica e tipo PRESENCIAL.
- [x] WA-B08 Agendar com médico que não atende na clínica: sgsm recusa; o bot avisa sem travar a conversa.
- [ ] WA-B09 Cadastro pelo bot: paciente vinculado à clínica (`paciente_estabelecimento`, origem WHATSAPP) e lead convertido.
- [x] WA-B10 Conflito de horário (regressão): reserva e 409 com alternativas continuam funcionando pelo número da clínica.

## 4. Equipe e LGPD (Etapa 5)

- [x] WA-E01 Paciente vindo do WhatsApp aparece na lista de Pacientes da equipe da clínica antes de qualquer consulta.
- [ ] WA-E02 Equipe de outra clínica não vê esse paciente.
- [x] WA-E03 Exportação LGPD do paciente traz `clinicas` e `consentimentos`.
- [x] WA-E04 Paciente cadastrado pela secretaria fica vinculado às clínicas dela (origem CLINICA).

## 5. Operação (Etapas 6 e DW7)

- [ ] WA-O01 Agenda diária: consultas da clínica com número saem por ele ("… na {clínica}"); as demais, pelo canal geral.
- [x] WA-O02 `GET /v1/api/interno/whatsapp/**` sem token de DESENVOLVEDOR: 401/403.
