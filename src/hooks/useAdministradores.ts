import { useState, useCallback } from 'react'
import { administradorService } from '../services/administradorService'
import type {
  AdministradorResponse,
  CadastrarAdministradorRequest,
  AtualizarAdministradorRequest,
  FiltrosAdministrador,
} from '../types'

export function useAdministradores() {
  const [administradores, setAdministradores] = useState<AdministradorResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listar = useCallback(async (filtros?: FiltrosAdministrador) => {
    setLoading(true)
    setError(null)
    try {
      const data = await administradorService.listar(filtros)
      setAdministradores(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cadastrar = useCallback(async (body: CadastrarAdministradorRequest) => {
    const novo = await administradorService.cadastrar(body)
    setAdministradores((prev) => [novo, ...prev])
    return novo
  }, [])

  const atualizar = useCallback(async (id: string, body: AtualizarAdministradorRequest) => {
    const atualizado = await administradorService.atualizar(id, body)
    setAdministradores((prev) => prev.map((a) => (a.id === id ? atualizado : a)))
    return atualizado
  }, [])

  const remover = useCallback(async (id: string) => {
    await administradorService.remover(id)
    setAdministradores((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativo: false } : a)),
    )
  }, [])

  const reativar = useCallback(async (id: string) => {
    const atualizado = await administradorService.reativar(id)
    setAdministradores((prev) => prev.map((a) => (a.id === id ? atualizado : a)))
    return atualizado
  }, [])

  return { administradores, loading, error, listar, cadastrar, atualizar, remover, reativar }
}
