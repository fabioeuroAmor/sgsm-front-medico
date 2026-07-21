import i18n from '@/i18n'

export function httpErrorMsg(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status
  if (!status) return i18n.t('common:http_desconhecido')
  const key = `common:http_${status}`
  const msg = i18n.t(key)
  return msg !== key ? msg : i18n.t('common:http_desconhecido')
}
