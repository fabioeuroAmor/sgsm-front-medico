// Espelho, no front, da matriz de autorização do sgsm-ia (SecurityConfig + EscopoAcessoService).
// Serve só para esconder o que o perfil não pode usar — a barreira real é o backend, que
// responde 403/404 de qualquer forma.

const MEDICO = 'MEDICO'
const FUNCIONARIO = 'FUNCIONARIO'
const ADMIN = 'ADMIN_ESTABELECIMENTO'
const DEV = 'DESENVOLVEDOR'

const PERMISSOES = {
  leads: [FUNCIONARIO, ADMIN, DEV],
  paciente360: [MEDICO, FUNCIONARIO, ADMIN, DEV],
  churn: [FUNCIONARIO, ADMIN, DEV],
  kpis: [ADMIN, DEV],
  // Sigilo médico: só o médico que atendeu (o backend confere) ou DESENVOLVEDOR leem notas
  lerNotasClinicas: [MEDICO, DEV],
  registrarNotaClinica: [MEDICO],
  // DESENVOLVEDOR pode criar lead sem estabelecimento; os demais escolhem um dos seus
  leadSemEstabelecimento: [DEV],
  // Tráfego pago (Meta Ads): gasto da clínica — só o ADMIN da clínica e DESENVOLVEDOR (DM2)
  trafegoPago: [ADMIN, DEV],
} as const

export type PermissaoIa = keyof typeof PERMISSOES

export function podeIa(perfil: string | undefined, permissao: PermissaoIa): boolean {
  return !!perfil && (PERMISSOES[permissao] as readonly string[]).includes(perfil)
}
