import { useState, useCallback } from 'react'
import { funcionarioService } from '../services/funcionarioService'
import type {
  FuncionarioResponse,
  CadastrarFuncionarioRequest,
  AtualizarFuncionarioRequest,
  FiltrosFuncionario,
} from '../types'

export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listar = useCallback(async (filtros?: FiltrosFuncionario) => {
    setLoading(true)
    setError(null)
    try {
      const data = await funcionarioService.listar(filtros)
      setFuncionarios(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cadastrar = useCallback(async (body: CadastrarFuncionarioRequest) => {
    const novo = await funcionarioService.cadastrar(body)
    setFuncionarios((prev) => [novo, ...prev])
    return novo
  }, [])

  const atualizar = useCallback(async (id: string, body: AtualizarFuncionarioRequest) => {
    const atualizado = await funcionarioService.atualizar(id, body)
    setFuncionarios((prev) => prev.map((f) => (f.id === id ? atualizado : f)))
    return atualizado
  }, [])

  const remover = useCallback(async (id: string) => {
    await funcionarioService.remover(id)
    setFuncionarios((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ativo: false } : f)),
    )
  }, [])

  return { funcionarios, loading, error, listar, cadastrar, atualizar, remover }
}
