import type { CadastrarMedicoRequest } from '@/types'

// Mesmas regras e mensagens do backend (CadastrarMedicoRequest.java / GlobalExceptionHandler)
const UF_REGEX = /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/
const CRM_REGEX = /^\d{4,9}$/
const TELEFONE_REGEX = /^$|^\(\d{2}\) \d{5}-\d{4}$|^\d{11}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const APENAS_NUMEROS_REGEX = /^\d+$/

export type MedicoFormErrors = Partial<Record<keyof CadastrarMedicoRequest, string>>

export function validateMedicoForm(form: CadastrarMedicoRequest): MedicoFormErrors {
  const errors: MedicoFormErrors = {}

  const nome = form.nome?.trim() ?? ''
  if (!nome || nome.length < 3 || nome.length > 100) {
    errors.nome = 'Nome é obrigatório e deve ter entre 3 e 100 caracteres'
  } else if (APENAS_NUMEROS_REGEX.test(nome)) {
    errors.nome = 'Nome não pode conter apenas números'
  }

  const crm = form.crm?.trim() ?? ''
  if (!crm) {
    errors.crm = 'CRM é obrigatório'
  } else if (!CRM_REGEX.test(crm)) {
    errors.crm = 'CRM deve conter apenas números, entre 4 e 9 dígitos'
  }

  const crmUf = form.crmUf?.trim() ?? ''
  if (!crmUf) {
    errors.crmUf = 'UF do CRM é obrigatória'
  } else if (!UF_REGEX.test(crmUf)) {
    errors.crmUf = 'UF do CRM inválida'
  }

  const especialidade = form.especialidade?.trim() ?? ''
  if (!especialidade || especialidade === 'Selecione...') {
    errors.especialidade = 'Especialidade é obrigatória'
  }

  const email = form.email?.trim() ?? ''
  if (!email) {
    errors.email = 'E-mail é obrigatório'
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'E-mail inválido'
  }

  const telefone = form.telefone?.trim() ?? ''
  if (telefone && !TELEFONE_REGEX.test(telefone)) {
    errors.telefone = 'Telefone deve estar no formato (XX) XXXXX-XXXX ou conter 11 dígitos sem máscara'
  }

  return errors
}
