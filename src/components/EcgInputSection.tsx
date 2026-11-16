import { EcgInput, ElectrolyteEcgFeature } from '../types/clinical';
import { NumericInputField } from './NumericInputField';

interface EcgInputSectionProps {
  ecg: EcgInput;
  onChange: (patch: Partial<EcgInput>) => void;
}

const SPECIAL_FEATURES: { id: ElectrolyteEcgFeature; label: string }[] = [
  { id: 'peaked_t', label: 'Sóng T cao nhọn (Tăng K⁺ sớm)' },
  { id: 'flat_absent_p', label: 'Sóng P dẹt / mất sóng P (Tăng K⁺)' },
  { id: 'wide_bizarre_qrs', label: 'QRS rộng biến dạng (Tăng K⁺ nặng)' },
  { id: 'sine_wave', label: 'Sóng hình Sin / Sine wave (Tăng K⁺ tối cấp)' },
  { id: 'u_wave_flat_t', label: 'Sóng T dẹt + Sóng U nổi bật (Hạ K⁺)' },
  { id: 's1q3t3', label: 'Dấu hiệu S1Q3T3 (Nghi Thuyên tắc phổi PE)' },
  { id: 'cerebral_t_inv', label: 'Sóng T âm sâu lan tỏa (Tăng áp lực nội sọ)' },
  { id: 'low_voltage', label: 'Điện thế thấp (Tràn dịch màng tim / COPD)' },
  { id: 'lvh_voltage', label: 'Tiêu chuẩn phì đại thất trái (Sokolow-Lyon/Cornell)' },
  { id: 'rvh_voltage', label: 'Tiêu chuẩn phì đại thất phải (R/S V1 > 1)' },
  { id: 'pacemaker_malfunction', label: 'Nghi rối loạn chức năng máy tạo nhịp' },
];

export function EcgInputSection({ ecg, onChange }: EcgInputSectionProps) {
  const toggleFeature = (feat: ElectrolyteEcgFeature) => {
    const exists = ecg.specialFeatures.includes(feat);
    const next = exists
      ? ecg.specialFeatures.filter((f) => f !== feat)
      : [...ecg.specialFeatures, feat];
    onChange({ enabled: true, specialFeatures: next });
  };

  const autoPatch = (patch: Partial<EcgInput>) => {
    onChange({ enabled: true, ...patch });
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-[#111827]/90 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-slate-100">
            3. Điện tâm đồ (ĐTĐ 12 chuyển đạo)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Tích hợp theo Sổ tay Điện tâm đồ: tính QTc Bazett, phân loại Block AV/nhánh, STEMI / De Winter / Wellens / Brugada và đối chiếu Điện giải.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-[#0B0E17] px-3 py-1.5 text-xs font-medium text-slate-200">
          <input
            type="checkbox"
            checked={ecg.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-cyan-500"
          />
          <span>Bao gồm phân tích Điện tâm đồ</span>
        </label>
      </div>

      <div className={ecg.enabled ? 'opacity-100 transition-opacity' : 'opacity-65 transition-opacity'}>
        {/* Intervals & Axis */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <NumericInputField
            id="ecg-hr"
            label="Tần số tim (HR)"
            unit="ck/ph"
            refRange="60–100"
            step="1"
            min={15}
            max={300}
            value={ecg.heartRate}
            onChange={(v) => autoPatch({ heartRate: v })}
            lowThreshold={60}
            highThreshold={100}
            criticalLow={40}
            criticalHigh={150}
          />
          <NumericInputField
            id="ecg-pr"
            label="Khoảng PR"
            unit="ms"
            refRange="120–200"
            step="5"
            min={40}
            max={500}
            value={ecg.prInterval}
            onChange={(v) => autoPatch({ prInterval: v })}
            lowThreshold={120}
            highThreshold={200}
          />
          <NumericInputField
            id="ecg-qrs"
            label="Phức bộ QRS"
            unit="ms"
            refRange="60–100"
            step="2"
            min={40}
            max={300}
            value={ecg.qrsDuration}
            onChange={(v) => autoPatch({ qrsDuration: v })}
            highThreshold={119}
            criticalHigh={160}
          />
          <NumericInputField
            id="ecg-qt"
            label="Khoảng QT đo"
            unit="ms"
            refRange="tự tính QTc"
            step="5"
            min={200}
            max={800}
            value={ecg.qtMeasured}
            onChange={(v) => autoPatch({ qtMeasured: v })}
          />
          <NumericInputField
            id="ecg-qtc"
            label="QTc máy đọc (nếu có)"
            unit="ms"
            refRange="≤ 450/460"
            step="5"
            min={250}
            max={800}
            value={ecg.qtcDirect}
            onChange={(v) => autoPatch({ qtcDirect: v })}
            lowThreshold={340}
            highThreshold={460}
            criticalHigh={500}
          />
        </div>

        {/* Rhythm, Blocks, ST-T, Channelopathy */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="ecg-rhythm" className="mb-1.5 block text-xs font-medium text-slate-200">
              Nhịp tim cơ bản
            </label>
            <select
              id="ecg-rhythm"
              value={ecg.rhythm}
              onChange={(e) => autoPatch({ rhythm: e.target.value as EcgInput['rhythm'] })}
              className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="sinus">Nhịp xoang đều (60–100)</option>
              <option value="sinus_tachy">Nhịp nhanh xoang (&gt; 100)</option>
              <option value="sinus_brady">Nhịp chậm xoang (&lt; 60)</option>
              <option value="afib">Rung nhĩ (mất P, R-R không đều)</option>
              <option value="aflutter">Cuồng nhĩ (sóng F răng cưa)</option>
              <option value="svt_narrow">Nhịp nhanh trên thất (QRS hẹp, đều)</option>
              <option value="vt_wide">Nhịp nhanh thất (QRS rộng — VT)</option>
              <option value="tdp">Xoắn đỉnh (Torsades de Pointes)</option>
              <option value="vfib">Rung thất (VF)</option>
              <option value="junctional">Nhịp bộ nối</option>
              <option value="paced">Nhịp máy tạo nhịp (Pacemaker)</option>
            </select>
          </div>

          <div>
            <label htmlFor="ecg-avb" className="mb-1.5 block text-xs font-medium text-slate-200">
              Block nhĩ – thất (AV Block)
            </label>
            <select
              id="ecg-avb"
              value={ecg.avBlock}
              onChange={(e) => autoPatch({ avBlock: e.target.value as EcgInput['avBlock'] })}
              className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="none">Không block nhĩ – thất</option>
              <option value="avb1">Độ I (PR &gt; 200 ms cố định)</option>
              <option value="avb2_mobitz1">Độ II Mobitz I (Wenckebach)</option>
              <option value="avb2_mobitz2">Độ II Mobitz II (rớt QRS đột ngột)</option>
              <option value="avb2_2to1_high">Độ II kiểu 2:1 / Độ cao</option>
              <option value="avb3">Độ III hoàn toàn (Phân ly nhĩ–thất)</option>
            </select>
          </div>

          <div>
            <label htmlFor="ecg-bbb" className="mb-1.5 block text-xs font-medium text-slate-200">
              Block nhánh / Phân nhánh
            </label>
            <select
              id="ecg-bbb"
              value={ecg.bundleBlock}
              onChange={(e) => autoPatch({ bundleBlock: e.target.value as EcgInput['bundleBlock'] })}
              className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="none">Không block nhánh</option>
              <option value="rbbb">Block nhánh phải (RBBB)</option>
              <option value="lbbb">Block nhánh trái (LBBB)</option>
              <option value="lafb">Block phân nhánh trái trước (LAFB)</option>
              <option value="lpfb">Block phân nhánh trái sau (LPFB)</option>
              <option value="bifascicular">Block hai phân nhánh</option>
              <option value="trifascicular">Block ba phân nhánh</option>
              <option value="nonspecific_ivcd">Rối loạn dẫn truyền trong thất khác</option>
            </select>
          </div>

          <div>
            <label htmlFor="ecg-st" className="mb-1.5 block text-xs font-medium text-slate-200">
              Đoạn ST – Sóng T / Hội chứng vành cấp
            </label>
            <select
              id="ecg-st"
              value={ecg.stPattern}
              onChange={(e) => autoPatch({ stPattern: e.target.value as EcgInput['stPattern'] })}
              className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="none">Không biến đổi ST-T thiếu máu cấp</option>
              <option value="stemi_anterior">STEMI thành trước (V1–V4/V6 — LAD)</option>
              <option value="stemi_inferior">STEMI thành dưới (DII, DIII, aVF — RCA/LCx)</option>
              <option value="stemi_lateral">STEMI thành bên (DI, aVL, V5–V6)</option>
              <option value="stemi_posterior">STEMI thành sau thực (STD V1–V3, STE V7–V9)</option>
              <option value="stemi_rv">NMCT thất phải (STE V4R/V3R)</option>
              <option value="de_winter">Hội chứng De Winter (tương đương STEMI LAD)</option>
              <option value="wellens_a">Wellens Type A (T 2 pha V2–V3)</option>
              <option value="wellens_b">Wellens Type B (T âm sâu đối xứng V2–V3)</option>
              <option value="left_main_avr">STE aVR + STD ≥ 6 chuyển đạo (Left Main)</option>
              <option value="nstemi_std">NSTEMI / ST chênh xuống – T âm theo vùng</option>
              <option value="pericarditis_diffuse">Viêm màng ngoài tim (STE lõm lan tỏa + PR chênh xuống)</option>
              <option value="early_repol">Tái cực sớm lành tính</option>
            </select>
          </div>

          <div>
            <label htmlFor="ecg-chan" className="mb-1.5 block text-xs font-medium text-slate-200">
              Bệnh kênh ion / Sóng đặc hiệu
            </label>
            <select
              id="ecg-chan"
              value={ecg.channelopathy}
              onChange={(e) =>
                autoPatch({ channelopathy: e.target.value as EcgInput['channelopathy'] })
              }
              className="w-full rounded-md border border-slate-800 bg-[#0B0E17] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="none">Không</option>
              <option value="brugada_1">Brugada Type 1 (ST vòm ≥ 2 mm V1–V2)</option>
              <option value="brugada_2_3">Brugada Type 2 / 3 (hình yên ngựa)</option>
              <option value="wpw">Hội chứng WPW (PR ngắn + sóng Delta)</option>
              <option value="arvd_epsilon">Sóng Epsilon (nghi ARVD)</option>
              <option value="osborn_j">Sóng J Osborn (Hạ thân nhiệt / Tăng Ca²⁺)</option>
            </select>
          </div>

          {/* Axis helper */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-200">
              Hướng QRS ở DI / DII / aVF (Tính trục)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['leadIPositive', 'DI'],
                  ['leadIIPositive', 'DII'],
                  ['leadAVFPositive', 'aVF'],
                ] as const
              ).map(([field, label]) => (
                <select
                  key={field}
                  aria-label={`Hướng QRS chuyển đạo ${label}`}
                  value={ecg[field] ?? 'pos'}
                  onChange={(e) =>
                    autoPatch({ [field]: e.target.value as 'pos' | 'equiphasic' | 'neg' })
                  }
                  className="rounded-md border border-slate-800 bg-[#0B0E17] px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="pos">{label}: (+)</option>
                  <option value="equiphasic">{label}: (±)</option>
                  <option value="neg">{label}: (−)</option>
                </select>
              ))}
            </div>
          </div>
        </div>

        {/* Conditional Sgarbossa / VT criteria */}
        {(ecg.bundleBlock === 'lbbb' || ecg.rhythm === 'paced') && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-950/15 p-3">
            <p className="mb-2 text-xs font-semibold text-amber-300">
              Tiêu chuẩn Sgarbossa (chẩn đoán NMCT cấp trên nền LBBB / Máy tạo nhịp)
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={ecg.sgarbossaConcordantSte}
                  onChange={(e) => autoPatch({ sgarbossaConcordantSte: e.target.checked })}
                  className="accent-amber-500"
                />
                <span>ST chênh lên đồng hướng ≥ 1 mm (+5 đ)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={ecg.sgarbossaConcordantStdV13}
                  onChange={(e) => autoPatch({ sgarbossaConcordantStdV13: e.target.checked })}
                  className="accent-amber-500"
                />
                <span>ST chênh xuống đồng hướng V1–V3 ≥ 1 mm (+3 đ)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={ecg.sgarbossaExcessiveDiscordant}
                  onChange={(e) => autoPatch({ sgarbossaExcessiveDiscordant: e.target.checked })}
                  className="accent-amber-500"
                />
                <span>ST chênh lên nghịch hướng ≥ 5 mm (+2 đ)</span>
              </label>
            </div>
          </div>
        )}

        {/* Special Electrolyte / Systemic ECG Features */}
        <div className="mt-4 border-t border-slate-800/80 pt-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Dấu hiệu ĐTĐ liên quan Điện giải &amp; Cấp cứu hệ thống (Chương 15)
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {SPECIAL_FEATURES.map((feat) => {
              const checked = ecg.specialFeatures.includes(feat.id);
              return (
                <label
                  key={feat.id}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 transition-colors ${
                    checked
                      ? 'border-cyan-500/50 bg-cyan-950/25 text-cyan-100'
                      : 'border-slate-800/80 bg-[#0B0E17]/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeature(feat.id)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-cyan-500"
                  />
                  <span>{feat.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
