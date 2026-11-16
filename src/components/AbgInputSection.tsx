import { AbgInput, ClinicalContext } from '../types/clinical';
import { NumericInputField } from './NumericInputField';

interface AbgInputSectionProps {
  abg: AbgInput;
  context: ClinicalContext;
  onChangeAbg: (patch: Partial<AbgInput>) => void;
  onChangeContext: (patch: Partial<ClinicalContext>) => void;
}

export function AbgInputSection({
  abg,
  context,
  onChangeAbg,
  onChangeContext,
}: AbgInputSectionProps) {
  const isArt = abg.sampleType === 'arterial';

  return (
    <section className="rounded-lg border border-slate-800 bg-[#111827]/90 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-slate-100">
            1. Thông số Khí máu &amp; Oxy hóa (ABG / VBG)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Nhập các chỉ số chính từ phiếu kết quả khí máu. Hệ thống tự kiểm tra phương trình Henderson, bù trừ và A-a gradient.
          </p>
        </div>

        {/* Sample Type & Duration toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-700 bg-[#0B0E17] p-0.5">
            <button
              type="button"
              onClick={() => onChangeAbg({ sampleType: 'arterial' })}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                isArt ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Động mạch (ABG)
            </button>
            <button
              type="button"
              onClick={() => onChangeAbg({ sampleType: 'venous' })}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                !isArt ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tĩnh mạch (VBG)
            </button>
          </div>

          <select
            aria-label="Diễn biến hô hấp"
            value={abg.respiratoryDuration}
            onChange={(e) =>
              onChangeAbg({
                respiratoryDuration: e.target.value as AbgInput['respiratoryDuration'],
              })
            }
            className="rounded-md border border-slate-700 bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="unknown">Diễn biến HH: Chưa rõ</option>
            <option value="acute">Cấp tính (&lt; 24–48 giờ)</option>
            <option value="chronic">Mạn tính (COPD / &gt; 3–5 ngày)</option>
          </select>
        </div>
      </div>

      {/* Core Acid-Base & Oxygenation Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumericInputField
          id="abg-ph"
          label="pH máu"
          unit=""
          refRange={isArt ? '7.35–7.45' : '7.32–7.42'}
          step="0.01"
          min={6.5}
          max={8.0}
          value={abg.ph}
          onChange={(v) => onChangeAbg({ ph: v })}
          lowThreshold={isArt ? 7.35 : 7.32}
          highThreshold={isArt ? 7.45 : 7.42}
          criticalLow={7.15}
          criticalHigh={7.6}
          placeholder="7.40"
        />

        <NumericInputField
          id="abg-pco2"
          label={isArt ? 'PaCO₂' : 'PvCO₂'}
          unit="mmHg"
          refRange={isArt ? '35–45' : '39–55'}
          step="0.5"
          min={5}
          max={160}
          value={abg.pco2}
          onChange={(v) => onChangeAbg({ pco2: v })}
          lowThreshold={isArt ? 35 : 39}
          highThreshold={isArt ? 45 : 55}
          criticalLow={20}
          criticalHigh={70}
          placeholder="40"
        />

        <NumericInputField
          id="abg-hco3"
          label="HCO₃⁻ thực"
          unit="mmol/L"
          refRange={isArt ? '21–29' : '21–30'}
          step="0.1"
          min={1}
          max={65}
          value={abg.hco3}
          onChange={(v) => onChangeAbg({ hco3: v })}
          lowThreshold={21}
          highThreshold={isArt ? 29 : 30}
          criticalLow={10}
          criticalHigh={42}
          placeholder="24"
        />

        <NumericInputField
          id="abg-be"
          label="Kiềm dư (BE)"
          unit="mmol/L"
          refRange="-3 đến +3"
          step="0.5"
          min={-35}
          max={35}
          value={abg.be}
          onChange={(v) => onChangeAbg({ be: v })}
          lowThreshold={-3}
          highThreshold={3}
          placeholder="0"
        />

        <NumericInputField
          id="abg-po2"
          label={isArt ? 'PaO₂' : 'PvO₂'}
          unit="mmHg"
          refRange={isArt ? '80–100' : '30–50'}
          step="1"
          min={10}
          max={650}
          value={abg.po2}
          onChange={(v) => onChangeAbg({ po2: v })}
          lowThreshold={isArt ? 80 : 30}
          highThreshold={isArt ? 120 : 55}
          criticalLow={isArt ? 55 : 20}
          placeholder="92"
        />

        <NumericInputField
          id="abg-fio2"
          label="FiO₂ đang thở"
          unit="%"
          refRange="Khí phòng 21%"
          step="1"
          min={21}
          max={100}
          value={abg.fio2}
          onChange={(v) => onChangeAbg({ fio2: v })}
          placeholder="21"
        />

        <NumericInputField
          id="abg-sao2"
          label="SaO₂ / SpO₂"
          unit="%"
          refRange="94–98%"
          step="0.5"
          min={20}
          max={100}
          value={abg.sao2}
          onChange={(v) => onChangeAbg({ sao2: v })}
          lowThreshold={94}
          criticalLow={88}
          placeholder="97"
        />

        <NumericInputField
          id="abg-lactate"
          label="Lactate"
          unit="mmol/L"
          refRange={isArt ? '< 1.8' : '< 2.2'}
          step="0.1"
          min={0}
          max={35}
          value={abg.lactate}
          onChange={(v) => onChangeAbg({ lactate: v })}
          highThreshold={isArt ? 1.8 : 2.2}
          criticalHigh={4.0}
          placeholder="1.2"
        />
      </div>

      {/* Extended CO-oximetry & Oxygen delivery */}
      <div className="mt-4 border-t border-slate-800/80 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Mở rộng: CO-oximetry, Hemoglobin &amp; Thông số thở máy (tùy chọn)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <NumericInputField
            id="abg-hb"
            label="Hemoglobin (Hb)"
            unit="g/dL"
            refRange="12–16"
            step="0.1"
            value={abg.hb}
            onChange={(v) => onChangeAbg({ hb: v })}
            lowThreshold={10}
            criticalLow={7}
          />
          <NumericInputField
            id="abg-o2hb"
            label="%O₂Hb (CO-ox)"
            unit="%"
            refRange="92–96%"
            step="0.5"
            value={abg.o2Hb}
            onChange={(v) => onChangeAbg({ o2Hb: v })}
            lowThreshold={90}
            criticalLow={75}
          />
          <NumericInputField
            id="abg-cohb"
            label="COHb"
            unit="%"
            refRange="< 2%"
            step="0.5"
            value={abg.coHb}
            onChange={(v) => onChangeAbg({ coHb: v })}
            highThreshold={3}
            criticalHigh={20}
          />
          <NumericInputField
            id="abg-methb"
            label="MetHb"
            unit="%"
            refRange="< 2%"
            step="0.5"
            value={abg.metHb}
            onChange={(v) => onChangeAbg({ metHb: v })}
            highThreshold={2}
            criticalHigh={15}
          />
          <NumericInputField
            id="abg-map"
            label="MAP (Áp lực đường thở TB)"
            unit="cmH₂O"
            refRange="Thở máy"
            step="0.5"
            value={abg.mapVent}
            onChange={(v) => onChangeAbg({ mapVent: v })}
          />
        </div>
      </div>

      {/* Patient Demographics & Preanalytical Flags */}
      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-4 lg:grid-cols-2">
        <div>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Thông tin bệnh nhân &amp; Bối cảnh lâm sàng
          </p>
          <div className="mb-3 grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tuổi</label>
              <input
                type="number"
                value={context.age ?? ''}
                onChange={(e) =>
                  onChangeContext({ age: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="58"
                className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Giới tính</label>
              <select
                value={context.sex}
                onChange={(e) => onChangeContext({ sex: e.target.value as ClinicalContext['sex'] })}
                className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Cân nặng (kg)</label>
              <input
                type="number"
                value={context.weightKg ?? ''}
                onChange={(e) =>
                  onChangeContext({
                    weightKg: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="60"
                className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ['dyspnea', 'Khó thở / Suy hô hấp'],
                ['chestPain', 'Đau ngực'],
                ['copdOrAsthma', 'COPD / Hen phế quản'],
                ['diabetesOrDkaSuspected', 'ĐTĐ / Nghi DKA'],
                ['sepsisOrShock', 'Nhiễm khuẩn huyết / Sốc'],
                ['ckdOrRenalFailure', 'Suy thận cấp / mạn'],
                ['vomitingOrNgSuction', 'Nôn ói / Hút sonde dạ dày'],
                ['diarrhea', 'Tiêu chảy / Mất dịch'],
                ['diureticUse', 'Đang dùng lợi tiểu'],
                ['neurologicalSymptoms', 'Rối loạn ý thức / Co giật'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded border border-slate-800/80 bg-[#0B0E17]/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={context[key]}
                  onChange={(e) => onChangeContext({ [key]: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-cyan-500"
                />
                <span className="truncate">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Kiểm tra lỗi tiền kiểm mẫu xét nghiệm (Chương 12)
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {(
              [
                ['excessLiquidHeparin', 'Nghi pha loãng do thừa Heparin lỏng trong bơm tiêm'],
                ['airBubblesInSyringe', 'Có bọt khí trong bơm tiêm khí máu'],
                ['delayedTransportOver15Min', 'Chậm chuyển mẫu / không ủ đá > 15–30 phút'],
                ['extremeLeukocytosisOrThrombocytosis', 'Bạch cầu hoặc tiểu cầu tăng rất cao (Pseudohypoxemia)'],
                ['hemolyzedSample', 'Mẫu máu nghi vỡ hồng cầu (tăng giả K⁺, PO₄, Mg)'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded border border-slate-800/80 bg-[#0B0E17]/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={context[key]}
                  onChange={(e) => onChangeContext({ [key]: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-amber-500"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
