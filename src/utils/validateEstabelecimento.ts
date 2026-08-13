import type { CadastrarEstabelecimentoRequest } from '@/types'

// Mesmas regras e mensagens do backend (CadastrarEstabelecimentoRequest.java / CnpjValidoValidator)
const NOME_REGEX = /^[A-Za-zÀ-ÿ0-9\s.,;:&+\-']+$/
const CNPJ_FORMATO_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/
const TELEFONE_REGEX = /^\(\d{2}\) \d{4,5}-\d{4}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LOGRADOURO_REGEX = /^[A-Za-zÀ-ÿ0-9\s.,\-]+$/
const NUMERO_REGEX = /^[A-Za-z0-9/]+$/
const BAIRRO_REGEX = /^[A-Za-zÀ-ÿ\s.\-]+$/
const CEP_REGEX = /^\d{5}-\d{3}$/
const CIDADE_REGEX = /^[A-Za-zÀ-ÿ\s.\-]+$/
const UF_REGEX = /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/

export type EstabelecimentoFormErrors = Partial<Record<keyof CadastrarEstabelecimentoRequest, string>>

// Algoritmo oficial de validação de dígitos verificadores do CNPJ (mesmo do backend)
function isValidCnpj(cnpjMascarado: string): boolean {
  const digitos = cnpjMascarado.replace(/\D/g, '')
  if (digitos.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digitos)) return false // todos os dígitos iguais

  const calcularDigito = (base: string, pesos: number[]): number => {
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const base12 = digitos.slice(0, 12)
  const dv1 = calcularDigito(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const dv2 = calcularDigito(base12 + dv1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])

  return digitos.endsWith(`${dv1}${dv2}`)
}

export function validateEstabelecimentoForm(form: CadastrarEstabelecimentoRequest): EstabelecimentoFormErrors {
  const errors: EstabelecimentoFormErrors = {}

  const nome = form.nome?.trim() ?? ''
  if (!nome || nome.length < 3 || nome.length > 100 || !NOME_REGEX.test(nome)) {
    errors.nome = "Nome deve ter entre 3 e 100 caracteres e conter apenas letras, números, espaços, pontos, vírgulas, hífens, & ou +"
  }

  const cnpj = form.cnpj?.trim() ?? ''
  if (!CNPJ_FORMATO_REGEX.test(cnpj)) {
    errors.cnpj = 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX'
  } else if (!isValidCnpj(cnpj)) {
    errors.cnpj = 'CNPJ contém um número de CNPJ inválido'
  }

  const telefone = form.telefone?.trim() ?? ''
  if (!TELEFONE_REGEX.test(telefone)) {
    errors.telefone = 'Telefone deve estar no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX'
  }

  const email = form.email?.trim() ?? ''
  if (!email) {
    errors.email = 'E-mail é obrigatório'
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'E-mail inválido'
  }

  const logradouro = form.logradouro?.trim() ?? ''
  if (!logradouro || logradouro.length < 3 || logradouro.length > 200 || !LOGRADOURO_REGEX.test(logradouro)) {
    errors.logradouro = 'Logradouro deve ter entre 3 e 200 caracteres e conter apenas letras, números, espaços, pontos, vírgulas ou hífens'
  }

  const numero = form.numero?.trim() ?? ''
  if (!numero || !NUMERO_REGEX.test(numero)) {
    errors.numero = "Número deve ser preenchido com o número, letra ou 'S/N' (ex: 123, S/N, A1)"
  }

  const complemento = form.complemento?.trim() ?? ''
  if (complemento && complemento.length > 100) {
    errors.complemento = 'Complemento deve ter no máximo 100 caracteres'
  }

  const bairro = form.bairro?.trim() ?? ''
  if (!bairro || bairro.length < 2 || bairro.length > 100 || !BAIRRO_REGEX.test(bairro)) {
    errors.bairro = 'Bairro deve ter entre 2 e 100 caracteres e conter apenas letras, espaços, pontos ou hífens'
  }

  const cep = form.cep?.trim() ?? ''
  if (!CEP_REGEX.test(cep)) {
    errors.cep = 'CEP deve estar no formato XXXXX-XXX'
  }

  const cidade = form.cidade?.trim() ?? ''
  if (!cidade || cidade.length < 2 || cidade.length > 100 || !CIDADE_REGEX.test(cidade)) {
    errors.cidade = 'Cidade deve ter entre 2 e 100 caracteres e conter apenas letras, espaços, pontos ou hífens'
  }

  const uf = form.uf?.trim() ?? ''
  if (!UF_REGEX.test(uf)) {
    errors.uf = 'UF deve conter uma sigla de estado brasileiro válida (ex: SP, RJ, MG)'
  }

  return errors
}
