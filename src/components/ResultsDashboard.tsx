import { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCopy,
  FlaskConical,
  HeartPulse,
  Info,
  Printer,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import {
  ClinicalCaseInput,
  IntegratedAnalysisResult,
  SeverityLevel,
} from '../types/clinical';
import { AcidBaseNomogram, EcgMorphologyPreview } from './AcidBaseNomogram';

interface ResultsDashboardProps {
  input: ClinicalCaseInput;
  result: IntegratedAnalysisResult;
  onEditInputs: () => void;
}

const SEVERITY_META: Record<
  SeverityLevel,
  { label: string; border: string; bg: string; text: string; Icon: typeof AlertOctagon }
> = {
  critical: {
    label: 'CẤP CỨU NGUY KỊCH',
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/30',
    text: 'text-rose-300',
    Icon: AlertOctagon,
  },
  high: {
    label: 'NGUY CƠ CAO',
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/25',
    text: 'text-amber-300',
    Icon: AlertTriangle,
  },
  moderate: {
    label: 'TRUNG BÌNH',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-300',
    Icon: Info,
  },
  mild: {
    label: 'NHẸ / RANH GIỚI',
    border: 'border-slate-700',
    bg: 'bg-slate-900/70',
    text: 'text-slate-300',
    Icon: Info,
  },
  normal: {
    label: 'BÌNH THƯỜNG',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-300',
    Icon: CheckCircle2,
  },
};

export function ResultsDashboard({
  input,
  result,
  onEditInputs,
}: ResultsDashboardProps) {
  const [copied, setCopied] = useState(false);

  const overallMeta = SEVERITY_META[result.overallSeverity];
  const OverallIcon = overallMeta.Icon;

  const handleCopySummary = async () => {
    const lines: string[] = [
      `KẾT LUẬN TỔNG HỢP [${overallMeta.label}]: ${result.headlineConclusion}`,
      ...result.subConclusions.map((c) => `- ${c}`),
      '',
      'NGUY CƠ CHÍNH:',
      ...(result.allRisks.length > 0
        ? result.allRisks.map((r) => `• [${SEVERITY_META[r.priority].label}] ${r.title}: ${r.detail}`)
        : ['• Không ghi nhận nguy cơ cấp tính nổi bật.']),
      '',
      'XÉT NGHIỆM ĐỀ NGHỊ LÀM THÊM:',
      ...(result.allTests.length > 0
        ? result.allTests.map((t) => `• ${t.title}: ${t.detail}`)
        : ['• Theo dõi định kỳ theo diễn biến lâm sàng.']),
      '',
      'HƯỚNG XỬ TRÍ:',
      ...(result.allManagement.length > 0
        ? result.allManagement.map((m) => `• ${m.title}: ${m.detail}`)
        : ['• Theo dõi sinh hiệu và điều trị theo nguyên nhân nền.']),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const abgM = result.abg.calculatedMetrics;
  const elecM = result.electrolytes.calculatedMetrics;
  const ecgM = result.ecg.calculatedMetrics;

  const telemetryCards: { label: string; value: string; note?: string }[] = [];
  if (typeof abgM.anionGap === 'number') {
    telemetryCards.push({
      label: 'Anion Gap (AG)',
      value: `${abgM.anionGap} mmol/L`,
      note:
        typeof abgM.anionGapCorrected === 'number'
          ? `Hiệu chỉnh Albumin: ${abgM.anionGapCorrected}`
          : 'Chuẩn 8–16',
    });
  }
  if (typeof abgM.deltaGap === 'number') {
    telemetryCards.push({
      label: 'Delta Gap / Ratio',
      value: `${abgM.deltaGap > 0 ? `+${abgM.deltaGap}` : abgM.deltaGap} / ${abgM.deltaRatio ?? '—'}`,
      note: 'Chuẩn −4 đến +4',
    });
  }
  if (typeof abgM.pfRatio === 'number') {
    telemetryCards.push({
      label: 'Tỷ lệ PaO₂ / FiO₂',
      value: `${abgM.pfRatio} mmHg`,
      note: result.abg.ardsStage ? `Ngưỡng ARDS ${result.abg.ardsStage}` : 'Bình thường > 400',
    });
  }
  if (typeof abgM.aaGradient === 'number') {
    telemetryCards.push({
      label: 'A-a Gradient',
      value: `${abgM.aaGradient} mmHg`,
      note: `Giới hạn tuổi ≤ ${abgM.aaUpperLimit ?? 20}`,
    });
  }
  if (typeof elecM.calculatedOsmolality === 'number') {
    telemetryCards.push({
      label: 'Áp lực thẩm thấu tính',
      value: `${elecM.calculatedOsmolality} mOsm/kg`,
      note:
        typeof elecM.osmolalGap === 'number'
          ? `Osmolal Gap: ${elecM.osmolalGap}`
          : 'Chuẩn 280–300',
    });
  }
  if (typeof elecM.correctedCa === 'number') {
    telemetryCards.push({
      label: 'Canxi hiệu chỉnh Albumin',
      value: `${elecM.correctedCa} mmol/L`,
      note: 'Chuẩn 2.10–2.55',
    });
  }
  if (typeof ecgM.qtcBazett === 'number') {
    telemetryCards.push({
      label: 'QTc (Bazett)',
      value: `${ecgM.qtcBazett} ms`,
      note: input.context.sex === 'female' ? 'Nữ ≤ 460 ms' : 'Nam ≤ 450 ms',
    });
  }
  if (typeof abgM.cao2 === 'number') {
    telemetryCards.push({
      label: 'Hàm lượng Oxy (CaO₂)',
      value: `${abgM.cao2} mL/dL`,
      note: 'Bình thường 16–22',
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onEditInputs}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại chỉnh thông số</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-200"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép kết luận'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In phiếu</span>
          </button>
        </div>
      </div>

      {/* Primary Conclusion Banner */}
      <section className={`rounded-lg border p-5 ${overallMeta.border} ${overallMeta.bg}`}>
        <div className="flex items-start gap-3">
          <OverallIcon className={`mt-0.5 h-6 w-6 shrink-0 ${overallMeta.text}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`font-mono text-xs font-bold tracking-wider ${overallMeta.text}`}>
                {overallMeta.label}
              </span>
              {!result.abg.hasData && !result.electrolytes.hasData && !result.ecg.hasData && (
                <span className="text-xs text-slate-400">Chưa có thông số đầu vào</span>
              )}
            </div>
            <h1 className="mt-1 font-display text-lg sm:text-xl font-bold text-slate-100">
              {result.headlineConclusion}
            </h1>
            {result.subConclusions.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
                {result.subConclusions.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Preanalytical Warnings */}
      {result.preanalyticalWarnings.length > 0 && (
        <section className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Cảnh báo sai số tiền kiểm / Lưu ý chất lượng mẫu (Chương 12)</span>
          </h2>
          <ul className="mt-2 space-y-1.5 text-xs text-amber-100/90">
            {result.preanalyticalWarnings.map((w, idx) => (
              <li key={idx}>• {w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Cross-system alerts */}
      {result.crossSystemAlerts.length > 0 && (
        <section className="rounded-lg border border-rose-500/50 bg-rose-950/20 p-4">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-rose-300">
            <HeartPulse className="h-4 w-4 shrink-0" />
            <span>Tương tác liên chuyên khoa (Khí máu × Điện giải × Điện tâm đồ)</span>
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {result.crossSystemAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-md border border-rose-500/30 bg-[#0B0E17]/90 p-3"
              >
                <p className="text-xs font-bold text-rose-300">{alert.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">{alert.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calculated Indices Grid */}
      {telemetryCards.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Chỉ số tính toán chuyên sâu
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {telemetryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-slate-800 bg-[#111827]/90 p-3"
              >
                <p className="text-[11px] text-slate-400">{card.label}</p>
                <p className="mt-1 font-mono text-base font-bold text-cyan-300 tabular-nums">
                  {card.value}
                </p>
                {card.note && <p className="mt-0.5 text-[11px] text-slate-500">{card.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visual Nomogram & ECG Strip */}
      {(result.abg.hasData || result.ecg.hasData || typeof input.electrolytes.k === 'number') && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AcidBaseNomogram
            ph={input.abg.ph}
            hco3={input.abg.hco3}
            pco2={input.abg.pco2}
          />
          <EcgMorphologyPreview ecg={input.ecg} kValue={input.electrolytes.k} />
        </section>
      )}

      {/* 3 Core Clinical Action Columns: Nguy cơ | Xét nghiệm thêm | Xử trí */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Column 1: Patient Risks */}
        <div className="rounded-lg border border-slate-800 bg-[#111827]/90 p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <h2 className="font-display text-sm font-bold text-slate-100">
              Nguy cơ bệnh nhân có thể gặp
            </h2>
          </div>
          {result.allRisks.length === 0 ? (
            <p className="text-xs text-slate-400">
              Chưa ghi nhận nguy cơ cấp cứu đe dọa tính mạng từ các thông số đã nhập. Tiếp tục theo dõi diễn biến lâm sàng.
            </p>
          ) : (
            <div className="space-y-3">
              {result.allRisks.map((item) => {
                const m = SEVERITY_META[item.priority];
                return (
                  <div
                    key={item.id}
                    className={`rounded-md border p-3 ${m.border} bg-[#0B0E17]/90`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-400">{item.category}</span>
                      <span className={`font-mono text-[10px] font-bold ${m.text}`}>
                        {m.label}
                      </span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.detail}</p>
                    {item.sourceRef && (
                      <p className="mt-1.5 text-[10px] text-slate-500">Nguồn: {item.sourceRef}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Additional Recommended Tests */}
        <div className="rounded-lg border border-slate-800 bg-[#111827]/90 p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <FlaskConical className="h-4 w-4 text-cyan-400" />
            <h2 className="font-display text-sm font-bold text-slate-100">
              Xét nghiệm cần làm thêm
            </h2>
          </div>
          {result.allTests.length === 0 ? (
            <p className="text-xs text-slate-400">
              Không có chỉ định xét nghiệm khẩn bổ sung ngoài theo dõi thường quy. Nếu chưa nhập ĐTĐ hoặc Điện giải đồ, cân nhắc nhập đầy đủ để đối chiếu toàn diện.
            </p>
          ) : (
            <div className="space-y-3">
              {result.allTests.map((item) => {
                const m = SEVERITY_META[item.priority];
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-slate-800 bg-[#0B0E17]/90 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-400">{item.category}</span>
                      <span className={`font-mono text-[10px] font-bold ${m.text}`}>
                        {m.label}
                      </span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 3: Clinical Management */}
        <div className="rounded-lg border border-slate-800 bg-[#111827]/90 p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Stethoscope className="h-4 w-4 text-emerald-400" />
            <h2 className="font-display text-sm font-bold text-slate-100">
              Hướng dẫn xử trí lâm sàng
            </h2>
          </div>
          {result.allManagement.length === 0 ? (
            <p className="text-xs text-slate-400">
              Duy trì theo dõi sinh hiệu, cân bằng dịch xuất – nhập và điều trị bệnh nền.
            </p>
          ) : (
            <div className="space-y-3">
              {result.allManagement.map((item) => {
                const m = SEVERITY_META[item.priority];
                return (
                  <div
                    key={item.id}
                    className={`rounded-md border p-3 ${m.border} bg-[#0B0E17]/90`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-400">{item.category}</span>
                      <span className={`font-mono text-[10px] font-bold ${m.text}`}>
                        {m.label}
                      </span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.detail}</p>
                    {item.sourceRef && (
                      <p className="mt-1.5 text-[10px] text-slate-500">Nguồn: {item.sourceRef}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Step-by-Step Diagnostic Reasoning */}
      {result.allSteps.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-[#111827]/90 p-4 sm:p-5">
          <h2 className="mb-3 font-display text-base font-bold text-slate-100">
            Phân tích chi tiết từng bước (Step-by-Step)
          </h2>
          <div className="space-y-3">
            {result.allSteps.map((step) => {
              const m = SEVERITY_META[step.severity];
              return (
                <div
                  key={step.stepNumber}
                  className="rounded-md border border-slate-800 bg-[#0B0E17]/90 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        #{step.stepNumber}
                      </span>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-100">
                        {step.title}
                      </h3>
                    </div>
                    <span className={`font-mono text-[11px] font-semibold ${m.text}`}>
                      {m.label}
                    </span>
                  </div>

                  {step.formula && (
                    <p className="mt-1.5 font-mono text-[11px] text-slate-400">
                      Công thức: {step.formula}
                    </p>
                  )}

                  {step.calculatedValue && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="font-mono font-medium text-cyan-300 tabular-nums">
                        {step.calculatedValue}
                      </span>
                      {step.referenceRange && (
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                          Tham chiếu: {step.referenceRange}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-2 text-xs leading-relaxed text-slate-200">
                    {step.interpretation}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
