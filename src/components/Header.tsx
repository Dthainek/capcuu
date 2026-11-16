import { Activity, BookOpen, RotateCcw } from 'lucide-react';

export type AppViewMode = 'input' | 'results' | 'cases';

interface HeaderProps {
  activeView: AppViewMode;
  hasResults: boolean;
  onSelectView: (view: AppViewMode) => void;
  onResetAll: () => void;
  onOpenCases: () => void;
}

export function Header({
  activeView,
  hasResults,
  onSelectView,
  onResetAll,
  onOpenCases,
}: HeaderProps) {
  return (
    <header className="no-print sticky top-0 z-40 h-14 border-b border-slate-800 bg-[#07090E]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6">
        {/* Zone 1: Brand wordmark (1 line, never wraps) */}
        <button
          type="button"
          onClick={() => onSelectView('input')}
          className="flex shrink-0 items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Activity className="h-4 w-4" />
          </div>
          <div className="whitespace-nowrap">
            <span className="font-display text-sm font-bold tracking-tight text-slate-100">
              ABG·ECG Console
            </span>
            <span className="ml-2 hidden text-xs text-slate-400 xl:inline">
              Khí máu · Điện giải · Điện tâm đồ
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links (max 4 single-line items) */}
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Điều hướng chính">
          <button
            type="button"
            onClick={() => onSelectView('input')}
            className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeView === 'input'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
          >
            Nhập thông số
          </button>

          <button
            type="button"
            disabled={!hasResults}
            onClick={() => hasResults && onSelectView('results')}
            className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeView === 'results'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                : hasResults
                  ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  : 'cursor-not-allowed text-slate-600'
            }`}
          >
            Kết quả phân tích
          </button>

          <button
            type="button"
            onClick={onOpenCases}
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeView === 'cases'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span>Ca lâm sàng</span>
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onResetAll}
            className="whitespace-nowrap shrink-0 flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="hidden sm:inline">Nhập ca mới</span>
            <span className="sm:hidden">Mới</span>
          </button>
        </div>
      </div>
    </header>
  );
}
