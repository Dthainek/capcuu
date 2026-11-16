import { ArrowRight, BookOpen } from 'lucide-react';
import { CLINICAL_CASES, PresetClinicalCase } from '../data/clinicalCases';

interface CasesViewProps {
  onSelectCase: (preset: PresetClinicalCase, autoAnalyze: boolean) => void;
}

export function CasesView({ onSelectCase }: CasesViewProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-[#111827]/90 p-5">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-cyan-400" />
          <h1 className="font-display text-lg font-bold text-slate-100">
            Thư viện Ca lâm sàng chuẩn hóa từ Giáo trình
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Chọn một ca bệnh cấp cứu thực tế để nạp nhanh toàn bộ thông số Khí máu, Điện giải và Điện tâm đồ vào hệ thống phân tích.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CLINICAL_CASES.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#111827]/90 p-4 transition-colors hover:border-slate-700"
          >
            <div>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                {item.tag}
              </span>
              <h2 className="mt-1 font-display text-sm font-bold text-slate-100">
                {item.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.summary}</p>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded border border-slate-800 bg-[#0B0E17] p-2.5 font-mono text-[11px] text-slate-300 tabular-nums">
                <div>
                  <span className="text-slate-500">pH: </span>
                  {item.data.abg.ph ?? '—'}
                </div>
                <div>
                  <span className="text-slate-500">PaCO₂: </span>
                  {item.data.abg.pco2 ?? '—'}
                </div>
                <div>
                  <span className="text-slate-500">HCO₃⁻: </span>
                  {item.data.abg.hco3 ?? '—'}
                </div>
                <div>
                  <span className="text-slate-500">Na⁺: </span>
                  {item.data.electrolytes.na ?? '—'}
                </div>
                <div>
                  <span className="text-slate-500">K⁺: </span>
                  {item.data.electrolytes.k ?? '—'}
                </div>
                <div>
                  <span className="text-slate-500">HR: </span>
                  {item.data.ecg.heartRate ?? '—'} bpm
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectCase(item, true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <span>Nạp &amp; Phân tích ngay</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectCase(item, false)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Xem thông số
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
