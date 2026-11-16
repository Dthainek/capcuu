import { EcgInput } from '../types/clinical';

interface AcidBaseNomogramProps {
  ph?: number;
  hco3?: number;
  pco2?: number;
}

export function AcidBaseNomogram({ ph, hco3, pco2 }: AcidBaseNomogramProps) {
  // Davenport diagram coordinates:
  // X-axis: pH from 6.95 to 7.70
  // Y-axis: HCO3- from 0 to 50 mmol/L
  const width = 460;
  const height = 270;
  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const phMin = 6.95;
  const phMax = 7.7;
  const hco3Min = 0;
  const hco3Max = 50;

  const xScale = (val: number) =>
    pad.left + ((Math.min(phMax, Math.max(phMin, val)) - phMin) / (phMax - phMin)) * plotW;
  const yScale = (val: number) =>
    pad.top + plotH - ((Math.min(hco3Max, Math.max(hco3Min, val)) - hco3Min) / (hco3Max - hco3Min)) * plotH;

  // Henderson-Hasselbalch: HCO3 = 0.03 * PCO2 * 10^(pH - 6.1)
  const pco2Isopleths = [15, 20, 30, 40, 60, 80, 100];

  const buildIsoplethPath = (targetPco2: number) => {
    const pts: string[] = [];
    for (let p = 6.98; p <= 7.68; p += 0.02) {
      const calcHco3 = 0.03 * targetPco2 * Math.pow(10, p - 6.1);
      if (calcHco3 >= 0 && calcHco3 <= 50) {
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${xScale(p).toFixed(1)} ${yScale(calcHco3).toFixed(1)}`);
      }
    }
    return pts.join(' ');
  };

  const hasPoint = typeof ph === 'number' && typeof hco3 === 'number';
  const ptX = hasPoint ? xScale(ph) : 0;
  const ptY = hasPoint ? yScale(hco3) : 0;

  // Normal box: pH 7.35-7.45, HCO3 22-26
  const normX1 = xScale(7.35);
  const normX2 = xScale(7.45);
  const normY1 = yScale(26);
  const normY2 = yScale(22);

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0B0E17] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-200">
          Biểu đồ Davenport (pH – HCO₃⁻ – Đẳng áp PaCO₂)
        </span>
        {hasPoint && (
          <span className="font-mono text-[11px] text-cyan-400 tabular-nums">
            Điểm BN: pH {ph} | HCO₃⁻ {hco3}{typeof pco2 === 'number' ? ` | PaCO₂ ${pco2}` : ''}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Biểu đồ thăng bằng kiềm toan Davenport"
      >
        {/* Grid lines */}
        {[7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6].map((p) => (
          <g key={`x-${p}`}>
            <line
              x1={xScale(p)}
              y1={pad.top}
              x2={xScale(p)}
              y2={pad.top + plotH}
              stroke="#1E293B"
              strokeWidth="1"
            />
            <text
              x={xScale(p)}
              y={pad.top + plotH + 15}
              textAnchor="middle"
              fill="#64748B"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {p.toFixed(1)}
            </text>
          </g>
        ))}

        {[0, 10, 20, 30, 40, 50].map((h) => (
          <g key={`y-${h}`}>
            <line
              x1={pad.left}
              y1={yScale(h)}
              x2={pad.left + plotW}
              y2={yScale(h)}
              stroke="#1E293B"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={yScale(h) + 3}
              textAnchor="end"
              fill="#64748B"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {h}
            </text>
          </g>
        ))}

        {/* PaCO2 isopleths */}
        {pco2Isopleths.map((iso) => {
          const pathD = buildIsoplethPath(iso);
          const isNormalIso = iso === 40;
          return (
            <path
              key={iso}
              d={pathD}
              fill="none"
              stroke={isNormalIso ? '#06B6D4' : '#334155'}
              strokeWidth={isNormalIso ? '1.5' : '1'}
              strokeDasharray={isNormalIso ? undefined : '3 3'}
              opacity={isNormalIso ? 0.75 : 0.7}
            />
          );
        })}

        {/* Normal zone box */}
        <rect
          x={normX1}
          y={normY1}
          width={normX2 - normX1}
          height={normY2 - normY1}
          fill="#10B981"
          fillOpacity="0.18"
          stroke="#10B981"
          strokeWidth="1.2"
        />

        {/* Zone labels */}
        <text x={xScale(7.06)} y={yScale(43)} fill="#94A3B8" fontSize="9.5">
          Toan HH
        </text>
        <text x={xScale(7.06)} y={yScale(8)} fill="#94A3B8" fontSize="9.5">
          Toan CH
        </text>
        <text x={xScale(7.52)} y={yScale(42)} fill="#94A3B8" fontSize="9.5">
          Kiềm CH
        </text>
        <text x={xScale(7.53)} y={yScale(12)} fill="#94A3B8" fontSize="9.5">
          Kiềm HH
        </text>
        <text x={xScale(7.42)} y={yScale(27)} fill="#10B981" fontSize="9" fontWeight="600">
          Bình thường
        </text>

        {/* Axes titles */}
        <text
          x={pad.left + plotW / 2}
          y={height - 4}
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="10"
        >
          pH máu động mạch
        </text>
        <text
          x={12}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="10"
          transform={`rotate(-90 12 ${pad.top + plotH / 2})`}
        >
          HCO₃⁻ (mmol/L)
        </text>

        {/* Plotted Patient Point */}
        {hasPoint && (
          <g>
            <line
              x1={ptX}
              y1={pad.top}
              x2={ptX}
              y2={pad.top + plotH}
              stroke="#06B6D4"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <line
              x1={pad.left}
              y1={ptY}
              x2={pad.left + plotW}
              y2={ptY}
              stroke="#06B6D4"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <circle cx={ptX} cy={ptY} r="7" fill="#06B6D4" fillOpacity="0.25" />
            <circle cx={ptX} cy={ptY} r="4" fill="#22D3EE" stroke="#07090E" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
}

interface EcgMorphologyPreviewProps {
  ecg: EcgInput;
  kValue?: number;
}

export function EcgMorphologyPreview({ ecg, kValue }: EcgMorphologyPreviewProps) {
  // Determine illustrative ECG waveform path based on key abnormalities
  const isSine = ecg.specialFeatures.includes('sine_wave');
  const isTdp = ecg.rhythm === 'tdp';
  const isPeakedT = ecg.specialFeatures.includes('peaked_t') || (typeof kValue === 'number' && kValue >= 5.8);
  const isHypoK = ecg.specialFeatures.includes('u_wave_flat_t') || (typeof kValue === 'number' && kValue < 3.2);
  const isStemi =
    ecg.stPattern.startsWith('stemi_') || ecg.stPattern === 'de_winter';
  const isBrugada = ecg.channelopathy === 'brugada_1';

  let modeLabel = 'Dạng sóng P-QRS-T cơ bản';
  let pathD =
    'M 0 65 L 28 65 Q 36 55 44 65 L 58 65 L 63 72 L 70 20 L 77 78 L 83 65 L 105 65 Q 122 44 138 65 L 180 65 L 208 65 Q 216 55 224 65 L 238 65 L 243 72 L 250 20 L 257 78 L 263 65 L 285 65 Q 302 44 318 65 L 360 65';
  let strokeColor = '#10B981';

  if (isSine) {
    modeLabel = 'Sóng hình Sin (Sine wave — Tăng K⁺ tối cấp)';
    pathD =
      'M 0 65 Q 30 15 60 65 T 120 65 T 180 65 T 240 65 T 300 65 T 360 65';
    strokeColor = '#F43F5E';
  } else if (isTdp) {
    modeLabel = 'Xoắn đỉnh (Torsades de Pointes)';
    pathD =
      'M 0 65 L 15 45 L 28 85 L 40 30 L 52 95 L 65 22 L 78 100 L 92 48 L 106 78 L 120 60 L 135 70 L 150 40 L 165 90 L 180 25 L 195 102 L 210 28 L 225 94 L 240 50 L 255 75 L 270 60 L 285 40 L 300 92 L 315 24 L 330 98 L 345 45 L 360 65';
    strokeColor = '#F43F5E';
  } else if (isStemi) {
    modeLabel =
      ecg.stPattern === 'de_winter'
        ? 'De Winter (J chênh xuống, ST dốc lên + T cao đối xứng)'
        : 'ST chênh lên cấp cứu (Tombstone / Convex STE)';
    pathD =
      ecg.stPattern === 'de_winter'
        ? 'M 0 65 L 25 65 Q 33 55 41 65 L 54 65 L 60 72 L 66 26 L 73 82 L 82 74 Q 108 18 128 65 L 180 65 L 205 65 Q 213 55 221 65 L 234 65 L 240 72 L 246 26 L 253 82 L 262 74 Q 288 18 308 65 L 360 65'
        : 'M 0 65 L 25 65 Q 33 55 41 65 L 54 65 L 60 72 L 68 20 L 76 34 Q 102 28 126 65 L 180 65 L 205 65 Q 213 55 221 65 L 234 65 L 240 72 L 248 20 L 256 34 Q 282 28 306 65 L 360 65';
    strokeColor = '#F43F5E';
  } else if (isBrugada) {
    modeLabel = 'Brugada Type 1 (V1–V2: ST vòm ≥ 2 mm + T âm)';
    pathD =
      'M 0 65 L 25 65 Q 33 55 41 65 L 55 65 L 64 25 L 76 36 Q 94 34 106 78 L 122 65 L 180 65 L 205 65 Q 213 55 221 65 L 235 65 L 244 25 L 256 36 Q 274 34 286 78 L 302 65 L 360 65';
    strokeColor = '#F59E0B';
  } else if (isPeakedT) {
    modeLabel = 'Tăng Kali: Sóng T cao nhọn đáy hẹp (Peaked T)';
    pathD =
      'M 0 65 L 26 65 Q 33 58 40 65 L 56 65 L 62 72 L 69 24 L 76 76 L 82 65 L 98 65 L 114 14 L 130 65 L 180 65 L 206 65 Q 213 58 220 65 L 236 65 L 242 72 L 249 24 L 256 76 L 262 65 L 278 65 L 294 14 L 310 65 L 360 65';
    strokeColor = '#F59E0B';
  } else if (isHypoK) {
    modeLabel = 'Hạ Kali: Sóng T dẹt + ST chênh xuống + Sóng U nổi bật';
    pathD =
      'M 0 65 L 24 65 Q 32 55 40 65 L 54 65 L 60 72 L 67 22 L 74 78 L 80 71 L 100 71 Q 112 62 122 66 Q 136 52 150 65 L 180 65 L 204 65 Q 212 55 220 65 L 234 65 L 240 72 L 247 22 L 254 78 L 260 71 L 280 71 Q 292 62 302 66 Q 316 52 330 65 L 360 65';
    strokeColor = '#06B6D4';
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0B0E17] p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-200">
          Mô phỏng Hình thái ĐTĐ minh họa
        </span>
        <span className="text-[11px] font-medium text-cyan-400">{modeLabel}</span>
      </div>
      <svg
        viewBox="0 0 360 120"
        className="w-full h-auto rounded border border-slate-800/80 bg-[#06080C]"
        role="img"
        aria-label={modeLabel}
      >
        <defs>
          <pattern id="ecgGrid" width="15" height="15" patternUnits="userSpaceOnUse">
            <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#1E293B" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="360" height="120" fill="url(#ecgGrid)" />
        <line x1="0" y1="65" x2="360" y2="65" stroke="#334155" strokeWidth="0.6" strokeDasharray="2 2" />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-2 text-[11px] text-slate-500">
        Hình thái minh họa giúp đối chiếu nhanh biến đổi ST–T, sóng U, sóng T nhọn hoặc rối loạn nhịp theo dữ liệu đã chọn.
      </p>
    </div>
  );
}
