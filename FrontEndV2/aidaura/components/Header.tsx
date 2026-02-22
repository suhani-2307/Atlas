'use client'

import { useRouter } from 'next/navigation'

interface HeaderProps {
  showProfile?: boolean
  rightSlot?: React.ReactNode
}

export default function Header({ showProfile = false, rightSlot }: HeaderProps) {
  const router = useRouter()
  return (
    <header className="w-full px-8 py-4 flex items-center justify-between bg-white sticky top-0 z-50" style={{ borderBottom: '1px solid #e2e8f0' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #2563eb, #10b981)', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}>
          <span style={{ fontFamily: '"Kaushan Script", cursive', fontSize: '1rem', color: 'white', lineHeight: 1 }}>A3</span>
        </div>
        <span className="font-extrabold text-lg text-slate-900">
          Aid<span style={{ background: 'linear-gradient(90deg,#2563eb,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Aura</span>
        </span>
      </div>

      {rightSlot ?? null}
    </header>
  )
}
