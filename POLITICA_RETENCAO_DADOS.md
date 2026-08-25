# Política de Retenção de Dados
## SGSM — Sistema de Gerenciamento de Serviços Médicos

---

## 1. Objetivo

Este documento define os prazos mínimos de retenção de dados armazenados no SGSM, com base na legislação brasileira vigente, e estabelece as diretrizes técnicas para cumprimento dessas obrigações no banco de dados do sistema.

---

## 2. Base Legal

| Legislação | Descrição | Impacto no SGSM |
|---|---|---|
| **CFM Resolução 1.821/2007** | Regulamenta prontuários médicos em papel e eletrônicos | Define retenção mínima de 20 anos para dados clínicos |
| **LGPD — Lei 13.709/2018** | Lei Geral de Proteção de Dados Pessoais | Proíbe guardar dados além do necessário; permite anonimização |
| **CTN — Art. 174** | Código Tributário Nacional | Prescrição fiscal de 5 anos |
| **CLT — Consolidação das Leis do Trabalho** | Direitos trabalhistas | Retenção de dados de empregados por 5 anos após desligamento |
| **Marco Civil da Internet — Lei 12.965/2014** | Dados de acesso e logs | Mínimo de 6 meses para registros de acesso |

---

## 3. Prazos de Retenção por Tipo de Dado

### 3.1 Dados Clínicos (Prontuário)

> Categoria de maior criticidade — regulada diretamente pelo Conselho Federal de Medicina.

| Dado | Prazo mínimo | Observação |
|---|---|---|
| Notas clínicas e consultas | **20 anos** após último atendimento | CFM 1.821/2007, Art. 7º |
| Agendamentos realizados | **20 anos** | Integram o prontuário do paciente |
| Dados do paciente adulto | **20 anos** após último atendimento | Vinculados ao prontuário |
| Dados do paciente menor de idade | Até **21 anos de idade + 20 anos** | O que for maior prevalece |

**Exemplo prático:**
Um paciente atendido pela última vez em 2025, nascido em 2010, terá seus dados retidos até:

- Regra geral: 2025 + 20 = **2045**
- Regra de menor: 2010 + 21 + 20 = **2051**
- **Prevalece 2051** (o prazo maior)

### 3.2 Dados de Estabelecimentos (Clínicas e Hospitais)

| Dado | Prazo mínimo | Observação |
|---|---|---|
| Cadastro do estabelecimento | **5 anos** após encerramento | LGPD + CTN |
| Vínculos com médicos e funcionários | **5 anos** após encerramento | Responsabilidade civil |
| Histórico de serviços oferecidos | **5 anos** após encerramento | Auditoria e fiscal |

> Estabelecimentos encerrados nunca devem ser excluídos fisicamente. Apenas marcados como inativos. Seus dados históricos (atendimentos, prontuários) seguem os prazos clínicos.

### 3.3 Dados de Médicos

| Dado | Prazo mínimo | Observação |
|---|---|---|
| Cadastro do médico | Enquanto ativo + **5 anos** após desligamento | Responsabilidade civil |
| Atendimentos realizados | **20 anos** | Vinculados ao prontuário do paciente |
| CRM e especialidades | Enquanto ativo + **5 anos** | CFM + LGPD |

### 3.4 Dados de Funcionários

| Dado | Prazo mínimo | Observação |
|---|---|---|
| Cadastro do funcionário | **5 anos** após desligamento | CLT |
| Vínculos com estabelecimento | **5 anos** após desligamento | CLT |

### 3.5 Dados Financeiros

| Dado | Prazo mínimo | Observação |
|---|---|---|
| Registros de faturamento | **5 anos** | CTN Art. 174 — prescrição fiscal |
| Histórico de pagamentos | **5 anos** | Código Civil — prescrição geral |

### 3.6 Dados de Autenticação e Acesso

| Dado | Prazo | Observação |
|---|---|---|
| Logs de acesso ao sistema | **6 meses** mínimo / **5 anos** recomendado | Marco Civil da Internet |
| Tokens JWT (access token) | Apenas enquanto válidos — **15 minutos** | Expiração automática |
| Refresh tokens | **7 dias** | Expiração automática |
| Tokens de reset de senha | **2 horas** | Expiração automática |
| Histórico de logins e logouts | **5 anos** recomendado | Auditoria e LGPD |

---

## 4. Tabela Resumo por Entidade do Sistema

| Entidade SGSM | Tabela no banco | Prazo de retenção |
|---|---|---|
| Paciente | `sgsm.paciente` | 20 anos após último atendimento (ou 21 + 20 para menores) |
| Consulta / Nota Clínica | `sgsm.nota_clinica` | 20 anos |
| Agendamento | `sgsm.agendamento` | 20 anos |
| Médico | `sgsm.medico` | 5 anos após desligamento |
| Estabelecimento | `sgsm.estabelecimento` | 5 anos após encerramento |
| Funcionário | `sgsm.funcionario` | 5 anos após desligamento |
| Serviço | `sgsm.servico` | 5 anos após encerramento do estabelecimento |
| Usuário de acesso | `auth.usuario` | Vinculado ao prazo da entidade associada |
| Refresh token | `auth.refresh_token` | 7 dias (automático) |
| Token de reset | `auth.reset_senha_token` | 2 horas (automático) |

---

## 5. Estratégia de Exclusão Lógica

O SGSM **nunca deve excluir fisicamente** registros de dados clínicos ou que estejam dentro do prazo legal de retenção. A estratégia adotada é a **exclusão lógica**, já parcialmente implementada no sistema através do campo `ativo`.

### 5.1 Como funciona

Em vez de executar um `DELETE`, o sistema atualiza o registro para indicar que ele foi desativado:

```sql
-- PROIBIDO para dados clínicos e dentro do prazo legal:
DELETE FROM sgsm.paciente WHERE id = '...';

-- CORRETO — exclusão lógica:
UPDATE sgsm.paciente
SET    ativo = false,
       encerrado_em = NOW()
WHERE  id = '...';
```

### 5.2 Campos recomendados em todas as tabelas

| Campo | Tipo | Descrição |
|---|---|---|
| `ativo` | BOOLEAN | `true` = registro ativo; `false` = logicamente excluído |
| `criado_em` | TIMESTAMPTZ | Data de criação — já existente no sistema |
| `atualizado_em` | TIMESTAMPTZ | Última modificação — já existente no sistema |
| `encerrado_em` | TIMESTAMPTZ | Data em que foi desativado (NULL se ainda ativo) |

---

## 6. Anonimização — Após Vencimento do Prazo Legal

Quando um registro atinge o fim do seu prazo de retenção, a LGPD permite (e recomenda) a **anonimização** dos dados pessoais em vez da exclusão. Dados anonimizados não são mais considerados dados pessoais pela LGPD e podem ser mantidos indefinidamente para fins estatísticos.

### 6.1 O que anonimizar

| Dado | Ação após prazo |
|---|---|
| Nome | Substituir por `ANONIMIZADO` |
| CPF | Substituir por `NULL` |
| E-mail | Substituir por `NULL` |
| Telefone | Substituir por `NULL` |
| Endereço | Substituir por `NULL` |
| Data de nascimento | Manter apenas o **ano** (para estatísticas) |
| Dados clínicos (diagnóstico, notas) | **Manter** — valor científico e legal |

### 6.2 Exemplo de script de anonimização

```sql
-- Anonimização de funcionário desligado há mais de 5 anos
UPDATE sgsm.funcionario
SET    nome      = 'ANONIMIZADO',
       cpf       = NULL,
       email     = NULL,
       telefone  = NULL
WHERE  ativo = false
  AND  encerrado_em < NOW() - INTERVAL '5 years';
```

```sql
-- Anonimização de usuário de acesso vinculado
UPDATE auth.usuario
SET    email      = 'anonimizado_' || id || '@removido',
       senha_hash = 'REMOVIDO',
       ativo      = false
WHERE  id IN (
    SELECT usuario_id FROM auth.reset_senha_token
    -- lógica de identificação de usuários elegíveis
);
```

---

## 7. Rotina de Auditoria de Retenção

Recomenda-se a implementação de uma rotina mensal automatizada que:

1. Identifica registros com `encerrado_em` mais antigo que o prazo legal
2. Gera um relatório dos registros elegíveis para anonimização
3. Aguarda aprovação manual de um administrador antes de executar
4. Registra em log todas as anonimizações realizadas (data, tabela, quantidade)

### 7.1 Sugestão de implementação (Spring Scheduler)

```java
// Executa no primeiro dia de cada mês às 02:00
@Scheduled(cron = "0 0 2 1 * *")
public void auditarRetencaoDados() {
    List<UUID> funcionariosElegiveis =
        funcionarioRepository.findElegiveisParaAnonimizacao(
            OffsetDateTime.now().minusYears(5)
        );
    // gera relatório e notifica administrador
    // NÃO executa automaticamente — requer aprovação
}
```

---

## 8. O que NÃO pode ser feito

| Ação | Motivo |
|---|---|
| Deletar prontuário antes de 20 anos | Violação da CFM 1.821/2007 — responsabilidade do médico e da clínica |
| Deletar dados de paciente menor antes do prazo | Violação da CFM 1.821/2007 |
| Guardar dados além do prazo sem justificativa | Violação da LGPD — sujeito a multa de até 2% do faturamento |
| Exportar dados clínicos sem consentimento | Violação da LGPD |
| Excluir logs de acesso antes de 6 meses | Violação do Marco Civil da Internet |

---

## 9. Responsabilidades

| Papel | Responsabilidade |
|---|---|
| **Desenvolvedor** | Garantir exclusão lógica no código; implementar rotina de auditoria |
| **Administrador do sistema** | Aprovar anonimizações; manter backups dentro do prazo legal |
| **Clínica / Hospital** | Responsável legal pelo prontuário (CFM); deve contratar armazenamento adequado |
| **DPO (Encarregado de Dados)** | Indicado pela LGPD para organizações que tratam dados de saúde em larga escala |

> Dados de saúde são classificados como **dados sensíveis** pela LGPD (Art. 11), exigindo tratamento diferenciado e base legal específica para processamento.

---

## 10. Recomendações Finais

1. **Backup**: Manter backups por pelo menos o mesmo prazo dos dados originais (20 anos para dados clínicos)
2. **Criptografia em repouso**: Dados sensíveis devem ser criptografados no banco de dados
3. **Controle de acesso**: Apenas profissionais autorizados devem acessar prontuários (já parcialmente implementado via roles no SGSM)
4. **Registro de acessos**: Cada acesso a um prontuário deve ser registrado (quem acessou, quando, por qual motivo)
5. **Consentimento**: Pacientes devem consentir com o armazenamento e uso de seus dados (LGPD Art. 11)

---

*Documento gerado em 22/07/2026 — SGSM v1.x*
*Referências: CFM Resolução 1.821/2007 | LGPD Lei 13.709/2018 | CTN Art. 174 | CLT | Marco Civil da Internet Lei 12.965/2014*
