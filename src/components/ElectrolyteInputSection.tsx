import { ElectrolyteInput } from '../types/clinical';
import { NumericInputField } from './NumericInputField';

interface ElectrolyteInputSectionProps {
  electrolytes: ElectrolyteInput;
  onChange: (patch: Partial<ElectrolyteInput>) => void;
}

export function ElectrolyteInputSection({
  electrolytes,
  onChange,
}: ElectrolyteInputSectionProps) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#111827]/90 p-4 sm:p-5">
      <div className="mb-4 border-b border-slate-800 pb-3">
        <h2 className="font-display text-base font-bold text-slate-100">
          2. Điện giải đồ &amp; Sinh hóa liên quan
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Dùng để tính Khoảng trống Anion (AG), Delta Gap, hiệu chỉnh Albumin, áp lực thẩm thấu và phát hiện rối loạn điện giải cấp cứu.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumericInputField
          id="elec-na"
          label="Natri (Na⁺)"
          unit="mmol/L"
          refRange="135–145"
          step="0.5"
          value={electrolytes.na}
          onChange={(v) => onChange({ na: v })}
          lowThreshold={135}
          highThreshold={145}
          criticalLow={120}
          criticalHigh={158}
          placeholder="140"
        />

        <NumericInputField
          id="elec-k"
          label="Kali (K⁺)"
          unit="mmol/L"
          refRange="3.5–5.0"
          step="0.1"
          value={electrolytes.k}
          onChange={(v) => onChange({ k: v })}
          lowThreshold={3.5}
          highThreshold={5.0}
          criticalLow={2.5}
          criticalHigh={6.5}
          placeholder="4.0"
        />

        <NumericInputField
          id="elec-cl"
          label="Clo (Cl⁻)"
          unit="mmol/L"
          refRange="98–108"
          step="0.5"
          value={electrolytes.cl}
          onChange={(v) => onChange({ cl: v })}
          lowThreshold={98}
          highThreshold={108}
          placeholder="102"
        />

        <NumericInputField
          id="elec-alb"
          label="Albumin"
          unit="g/L"
          refRange="35–50"
          step="1"
          value={electrolytes.albumin}
          onChange={(v) => onChange({ albumin: v })}
          lowThreshold={35}
          placeholder="40"
        />

        <NumericInputField
          id="elec-ca-tot"
          label="Canxi toàn phần"
          unit="mmol/L"
          refRange="2.10–2.55"
          step="0.05"
          value={electrolytes.caTotal}
          onChange={(v) => onChange({ caTotal: v })}
          lowThreshold={2.1}
          highThreshold={2.55}
          criticalLow={1.75}
          criticalHigh={3.5}
        />

        <NumericInputField
          id="elec-ca-ion"
          label="Canxi ion hóa (Ca²⁺)"
          unit="mmol/L"
          refRange="1.16–1.32"
          step="0.02"
          value={electrolytes.caIonized}
          onChange={(v) => onChange({ caIonized: v })}
          lowThreshold={1.16}
          highThreshold={1.32}
          criticalLow={0.8}
          criticalHigh={1.6}
        />

        <NumericInputField
          id="elec-mg"
          label="Magie (Mg²⁺)"
          unit="mmol/L"
          refRange="0.70–1.05"
          step="0.05"
          value={electrolytes.mg}
          onChange={(v) => onChange({ mg: v })}
          lowThreshold={0.7}
          highThreshold={1.05}
          criticalLow={0.4}
          criticalHigh={2.5}
        />

        <NumericInputField
          id="elec-po4"
          label="Phospho (PO₄³⁻)"
          unit="mmol/L"
          refRange="0.81–1.45"
          step="0.05"
          value={electrolytes.po4}
          onChange={(v) => onChange({ po4: v })}
          lowThreshold={0.81}
          highThreshold={1.45}
          criticalLow={0.32}
          criticalHigh={2.9}
        />

        <NumericInputField
          id="elec-glu"
          label="Glucose máu"
          unit="mmol/L"
          refRange="3.9–5.6"
          step="0.2"
          value={electrolytes.glucose}
          onChange={(v) => onChange({ glucose: v })}
          lowThreshold={3.9}
          highThreshold={7.8}
          criticalLow={2.8}
          criticalHigh={22.2}
        />

        <NumericInputField
          id="elec-urea"
          label="Ure máu"
          unit="mmol/L"
          refRange="2.5–7.5"
          step="0.5"
          value={electrolytes.urea}
          onChange={(v) => onChange({ urea: v })}
          highThreshold={8.0}
        />

        <NumericInputField
          id="elec-osm"
          label="Áp lực thẩm thấu đo được"
          unit="mOsm/kg"
          refRange="280–300"
          step="1"
          value={electrolytes.measuredOsmolality}
          onChange={(v) => onChange({ measuredOsmolality: v })}
          lowThreshold={280}
          highThreshold={300}
        />
      </div>
    </section>
  );
}
