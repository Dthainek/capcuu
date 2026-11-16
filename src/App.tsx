import { useMemo, useState } from 'react';
import { CheckCircle, ChevronRight, FileText, RotateCcw } from 'lucide-react';
import { AbgInputSection } from './components/AbgInputSection';
import { CasesView } from './components/CasesDrawer';
import { EcgInputSection } from './components/EcgInputSection';
import { ElectrolyteInputSection } from './components/ElectrolyteInputSection';
import { AppViewMode, Header } from './components/Header';
import { ResultsDashboard } from './components/ResultsDashboard';
import {
  CLINICAL_CASES,
  DEFAULT_CONTEXT,
  DEFAULT_ECG,
  PresetClinicalCase,
} from './data/clinicalCases';
import { runIntegratedAnalysis } from './engine/integratedAnalyzer';
import {
  AbgInput,
  ClinicalCaseInput,
  ClinicalContext,
  EcgInput,
  ElectrolyteInput,
  IntegratedAnalysisResult,
} from './types/clinical';

function createBlankInput(): ClinicalCaseInput {
  return {
    context: { ...DEFAULT_CONTEXT },
    abg: {
      sampleType: 'arterial',
      respiratoryDuration: 'unknown',
      fio2: 21,
    },
    electrolytes: {},
    ecg: { ...DEFAULT_ECG },
  };
}

export default function App() {
  const [input, setInput] = useState<ClinicalCaseInput>(() => createBlankInput());
  const [activeView, setActiveView] = useState<AppViewMode>('input');
  const [submittedResult, setSubmittedResult] = useState<IntegratedAnalysisResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeInputTab, setActiveInputTab] = useState<'all' | 'abg' | 'elec' | 'ecg'>('all');

  const handleChangeAbg = (patch: Partial<AbgInput>) => {
    setValidationError(null);
    setInput((prev) => ({ ...prev, abg: { ...prev.abg, ...patch } }));
  };

  const handleChangeContext = (patch: Partial<ClinicalContext>) => {
    setInput((prev) => ({ ...prev, context: { ...prev.context, ...patch } }));
  };

  const handleChangeElectrolytes = (patch: Partial<ElectrolyteInput>) => {
    setValidationError(null);
    setInput((prev) => ({ ...prev, electrolytes: { ...prev.electrolytes, ...patch } }));
  };

  const handleChangeEcg = (patch: Partial<EcgInput>) => {
    setValidationError(null);
    setInput((prev) => ({ ...prev, ecg: { ...prev.ecg, ...patch } }));
  };

  const hasAnyEnteredData = useMemo(() => {
    const a = input.abg;
    const e = input.electrolytes;
    const c = input.ecg;
    const hasAbg = [a.ph, a.pco2, a.po2, a.hco3, a.be, a.sao2, a.lactate, a.coHb, a.metHb].some(
      (v) => typeof v === 'number'
    );
    const hasElec = [e.na, e.k, e.cl, e.caTotal, e.caIonized, e.mg, e.po4, e.glucose].some(
      (v) => typeof v === 'number'
    );
    const hasEcg =
      c.enabled &&
      ([c.heartRate, c.prInterval, c.qrsDuration, c.qtMeasured, c.qtcDirect].some(
        (v) => typeof v === 'number'
      ) ||
        c.rhythm !== 'sinus' ||
        c.avBlock !== 'none' ||
        c.bundleBlock !== 'none' ||
        c.stPattern !== 'none' ||
        c.channelopathy !== 'none' ||
        c.specialFeatures.length > 0);
    return hasAbg || hasElec || hasEcg;
  }, [input]);

  const handleSubmitAnalysis = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasAnyEnteredData) {
      setValidationError(
        'Vui lòng nhập ít nhất một thông số Khí máu (ví dụ pH, PaCO₂, HCO₃⁻, PaO₂, Lactate), Điện giải hoặc Điện tâm đồ trước khi bấm Đồng ý.'
      );
      return;
    }
    const res = runIntegratedAnalysis(input);
    setSubmittedResult(res);
    setActiveView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetAll = () => {
    setInput(createBlankInput());
    setSubmittedResult(null);
    setValidationError(null);
    setActiveView('input');
    setActiveInputTab('all');
  };

  const handleSelectCase = (preset: PresetClinicalCase, autoAnalyze: boolean) => {
    const cloned: ClinicalCaseInput = {
      context: { ...preset.data.context },
      abg: { ...preset.data.abg },
      electrolytes: { ...preset.data.electrolytes },
      ecg: {
        ...preset.data.ecg,
        specialFeatures: [...preset.data.ecg.specialFeatures],
      },
    };
    setInput(cloned);
    setValidationError(null);

    if (autoAnalyze) {
      const res = runIntegratedAnalysis(cloned);
      setSubmittedResult(res);
      setActiveView('results');
    } else {
      setActiveView('input');
      setActiveInputTab('all');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] flex flex-col">
      <Header
        activeView={activeView}
        hasResults={submittedResult !== null}
        onSelectView={(v) => setActiveView(v)}
        onResetAll={handleResetAll}
        onOpenCases={() => setActiveView('cases')}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {activeView === 'input' && (
          <form onSubmit={handleSubmitAnalysis} className="space-y-5">
            {/* Compact Default Landing Hero Header + Quick Case Strip */}
            <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-[#111827]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-100">
                  Nhập thông số Khí máu, Điện giải &amp; Điện tâm đồ
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Nhập các chỉ số hiện có trên phiếu xét nghiệm, sau đó bấm{' '}
                  <strong className="text-cyan-300">Đồng ý — Phân tích kết quả</strong> để nhận kết luận, đánh giá nguy cơ, đề nghị xét nghiệm và hướng xử trí.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectCase(CLINICAL_CASES[0], false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0B0E17] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200"
                >
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Điền thử ca DKA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('cases')}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#0B0E17] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100"
                >
                  <span>6 ca mẫu giáo trình</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Section Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex flex-wrap gap-1 rounded-md border border-slate-800 bg-[#0B0E17] p-1">
                {(
                  [
                    ['all', 'Hiển thị tất cả (Khí máu + Điện giải + ĐTĐ)'],
                    ['abg', 'Chỉ Khí máu (ABG)'],
                    ['elec', 'Chỉ Điện giải đồ'],
                    ['ecg', 'Chỉ Điện tâm đồ'],
                  ] as const
                ).map(([tabKey, tabLabel]) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveInputTab(tabKey)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeInputTab === tabKey
                        ? 'bg-slate-800 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tabLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Notice */}
            {validationError && (
              <div
                role="alert"
                className="rounded-md border border-rose-500/50 bg-rose-950/30 px-4 py-3 text-xs font-medium text-rose-200"
              >
                {validationError}
              </div>
            )}

            {/* Input Panels */}
            {(activeInputTab === 'all' || activeInputTab === 'abg') && (
              <AbgInputSection
                abg={input.abg}
                context={input.context}
                onChangeAbg={handleChangeAbg}
                onChangeContext={handleChangeContext}
              />
            )}

            {(activeInputTab === 'all' || activeInputTab === 'elec') && (
              <ElectrolyteInputSection
                electrolytes={input.electrolytes}
                onChange={handleChangeElectrolytes}
              />
            )}

            {(activeInputTab === 'all' || activeInputTab === 'ecg') && (
              <EcgInputSection ecg={input.ecg} onChange={handleChangeEcg} />
            )}

            {/* Sticky / Prominent Submit Action Bar */}
            <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-[#0B0E17]/95 px-4 py-3 backdrop-blur-md shadow-xl">
              <div className="text-xs text-slate-400">
                {hasAnyEnteredData ? (
                  <span className="text-emerald-400">
                    Đã sẵn sàng dữ liệu phân tích. Bấm Đồng ý để xem kết luận &amp; hướng xử trí.
                  </span>
                ) : (
                  <span>Mẹo: Có thể nhập riêng Khí máu hoặc kết hợp Điện giải + Điện tâm đồ.</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Xóa nhập lại</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Đồng ý — Phân tích kết quả</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {activeView === 'results' && submittedResult && (
          <ResultsDashboard
            input={input}
            result={submittedResult}
            onEditInputs={() => setActiveView('input')}
          />
        )}

        {activeView === 'cases' && <CasesView onSelectCase={handleSelectCase} />}
      </main>

      <footer className="no-print border-t border-slate-800/80 bg-[#07090E] py-4">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Công cụ hỗ trợ quyết định lâm sàng dành cho nhân viên y tế — Tham chiếu: <em>Khí máu và Rối loạn điện giải cấp cứu</em> &amp; <em>Sổ tay Điện tâm đồ</em>.
          </p>
          <p>
            Lưu ý: Kết quả chỉ mang tính tham khảo học thuật/hỗ trợ, luôn đối chiếu lâm sàng trực tiếp trước khi ra y lệnh.
          </p>
        </div>
      </footer>
    </div>
  );
}
