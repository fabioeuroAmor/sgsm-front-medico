import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 p-6 lg:p-8 animate-fade-in">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
