export default function Footer() {
  return (
    <footer className="w-full py-6 border-t border-slate-100 bg-white/30 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          <span className="text-slate-500 text-xs font-medium">© 2024 AidAura. All rights reserved.</span>
        </div>
        <nav className="flex gap-6">
          <a href="#" className="text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors">Privacy Policy</a>
          <a href="#" className="text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors">Terms of Service</a>
          <a href="#" className="text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors">Contact Support</a>
        </nav>
      </div>
    </footer>
  )
}
