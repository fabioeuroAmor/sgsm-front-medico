// Máscaras de input compartilhadas — bloqueiam letras em campos que devem conter só números
// e formatam o valor conforme o usuário digita.

export function onlyDigits(value: string, maxLen?: number): string {
  const digits = value.replace(/\D/g, '')
  return maxLen ? digits.slice(0, maxLen) : digits
}

export function noDigits(value: string): string {
  return value.replace(/\d/g, '')
}

// Nome de pessoa: letras, acentos, espaços, apóstrofo e hífen — sem números nem símbolos
export function formatNomePessoa(value: string): string {
  return value.replace(/[^A-Za-zÀ-ÿ\s'-]/g, '')
}

// Cidade: letras, acentos, espaços, ponto e hífen — sem números nem símbolos
export function formatCidade(value: string): string {
  return value.replace(/[^A-Za-zÀ-ÿ\s.-]/g, '')
}

export function formatTelefone(value: string): string {
  const digits = onlyDigits(value, 11)
  if (digits.length > 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length > 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length > 2) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }
  if (digits.length > 0) {
    return `(${digits}`
  }
  return ''
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value, 14)
  if (digits.length > 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  if (digits.length > 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return digits
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value, 8)
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return digits
}
