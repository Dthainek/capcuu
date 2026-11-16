import {
  AbgInput,
  ClinicalActionItem,
  ClinicalContext,
  DiagnosticStep,
  ElectrolyteAnalysisResult,
  ElectrolyteInput,
  SeverityLevel,
} from '../types/clinical';

function isNum(v: number | undefined | null): v is number {
  return typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
}

function round(v: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

export function analyzeElectrolytes(
  elec: ElectrolyteInput,
  abg: AbgInput,
  ctx: ClinicalContext
): ElectrolyteAnalysisResult {
  const hasAny =
    isNum(elec.na) ||
    isNum(elec.k) ||
    isNum(elec.cl) ||
    isNum(elec.caTotal) ||
    isNum(elec.caIonized) ||
    isNum(elec.mg) ||
    isNum(elec.po4) ||
    isNum(elec.glucose) ||
    isNum(elec.measuredOsmolality);

  if (!hasAny) {
    return {
      hasData: false,
      disorders: [],
      calculatedMetrics: {},
      steps: [],
      risks: [],
      tests: [],
      management: [],
    };
  }

  const disorders: string[] = [];
  const calculatedMetrics: ElectrolyteAnalysisResult['calculatedMetrics'] = {};
  const steps: DiagnosticStep[] = [];
  const risks: ClinicalActionItem[] = [];
  const tests: ClinicalActionItem[] = [];
  const management: ClinicalActionItem[] = [];

  let stepNum = 1;
  const weight = ctx.weightKg && ctx.weightKg > 20 ? ctx.weightKg : 60;

  // 1. Osmolality & Glucose-corrected Sodium
  if (isNum(elec.na)) {
    let effectiveNa = elec.na;
    if (isNum(elec.glucose) && elec.glucose > 5.6) {
      // Katz formula: +1.6 mmol/L Na per 100 mg/dL (5.55 mmol/L) glucose above 100 mg/dL
      // Or +2.4 when glucose > 400 mg/dL (22.2 mmol/L)
      const factor = elec.glucose > 22.2 ? 0.43 : 0.288;
      const corrNa = elec.na + factor * (elec.glucose - 5.55);
      calculatedMetrics.correctedNaByGlucose = round(corrNa, 1);
      effectiveNa = corrNa;
    }

    if (isNum(elec.glucose) || isNum(elec.urea)) {
      const calcOsm = 2 * elec.na + (elec.glucose ?? 5) + (elec.urea ?? 5);
      calculatedMetrics.calculatedOsmolality = round(calcOsm, 1);
      if (isNum(elec.measuredOsmolality)) {
        const gap = elec.measuredOsmolality - calcOsm;
        calculatedMetrics.osmolalGap = round(gap, 1);
        if (gap > 10) {
          disorders.push(`Tăng khoảng trống thẩm thấu máu (${round(gap, 1)} mOsm/kg)`);
          risks.push({
            id: 'elec-osmolal-gap',
            priority: 'critical',
            category: 'Độc chất / Thẩm thấu',
            title: `Khoảng trống thẩm thấu tăng (${round(gap, 1)} > 10 mOsm/kg) — Nghi ngộ độc rượu độc hại`,
            detail: 'Gợi ý hiện diện chất thẩm thấu không đo: Methanol, Ethylene glycol, Isopropanol, Ethanol hoặc truyền Mannitol.',
            sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 3 & 8',
          });
        }
      }
    }

    // Evaluate Sodium disorders
    let naSev: SeverityLevel = 'normal';
    let naInterp = `Natri máu bình thường (${elec.na} mmol/L).`;

    if (elec.na < 135) {
      const isPseudoHyperglycemia =
        isNum(calculatedMetrics.correctedNaByGlucose) &&
        calculatedMetrics.correctedNaByGlucose >= 135;

      if (isPseudoHyperglycemia) {
        naSev = 'mild';
        naInterp = `Hạ Natri máu do tăng đường huyết (Na⁺ đo = ${elec.na}, Na⁺ hiệu chỉnh theo Glucose = ${calculatedMetrics.correctedNaByGlucose} mmol/L). Ưu tiên hạ đường huyết và bù dịch đẳng trương.`;
        disorders.push('Hạ Na⁺ giả / tăng thẩm thấu do tăng đường huyết');
      } else {
        let grade = 'nhẹ';
        if (elec.na < 120) {
          grade = 'NẶNG';
          naSev = 'critical';
        } else if (elec.na < 130) {
          grade = 'trung bình';
          naSev = 'high';
        } else {
          naSev = 'moderate';
        }
        disorders.push(`Hạ Natri máu mức độ ${grade} (${elec.na} mmol/L)`);
        naInterp = `Hạ Natri máu mức độ ${grade} (${elec.na} mmol/L)${calculatedMetrics.correctedNaByGlucose ? ` (Na⁺ hiệu chỉnh Glucose = ${calculatedMetrics.correctedNaByGlucose} mmol/L)` : ''}.`;

        if (elec.na < 120 || ctx.neurologicalSymptoms) {
          risks.push({
            id: 'elec-hypona-neuro',
            priority: 'critical',
            category: 'Điện giải / Thần kinh',
            title: 'Nguy cơ phù não, co giật, thoát vị não (nếu hạ Na⁺ cấp) hoặc Hội chứng hủy myelin cầu não (ODS) nếu bù quá nhanh',
            detail: 'Hạ Na⁺ < 120 mmol/L hoặc có triệu chứng thần kinh cần truyền NaCl 3% ngay nhưng tuyệt đối không để Na⁺ tăng quá 8–10 mmol/L trong 24 giờ đầu.',
            sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 8',
          });
          management.push({
            id: 'tx-hypona-severe',
            priority: 'critical',
            category: 'Điện giải cấp cứu',
            title: 'Xử trí Hạ Natri máu nặng / có triệu chứng thần kinh',
            detail: 'Bolus NaCl 3% 100–150 mL tĩnh mạch trong 10–20 phút (có thể lặp lại tối đa 2–3 lần đến khi hết co giật/lơ mơ hoặc Na⁺ tăng 4–6 mmol/L). Theo dõi Na⁺ mỗi 2–4 giờ; giới hạn tốc độ tăng ≤ 8 mmol/L/24h (≤ 6 mmol/L/24h nếu nguy cơ ODS cao: nghiện rượu, suy dinh dưỡng, hạ K⁺).',
            sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 8',
          });
        } else {
          management.push({
            id: 'tx-hypona-mod',
            priority: 'moderate',
            category: 'Điện giải',
            title: 'Xử trí Hạ Natri máu theo thể tích dịch & thẩm thấu niệu',
            detail: 'Giảm thể tích: truyền NaCl 0.9% thận trọng. Đẳng thể tích (SIADH): hạn chế dịch < 800–1000 mL/ngày, ngưng thuốc gây SIADH. Tăng thể tích (suy tim/xơ gan): hạn chế dịch + lợi tiểu quai.',
          });
        }

        tests.push({
          id: 'test-hypona',
          priority: 'high',
          category: 'Điện giải / Nội tiết',
          title: 'Bộ xét nghiệm tìm nguyên nhân Hạ Na⁺ máu',
          detail: 'Áp lực thẩm thấu máu đo được, Áp lực thẩm thấu niệu, Na⁺ niệu tại chỗ, TSH, Cortisol sáng (loại trừ suy giáp, suy thượng thận, SIADH).',
        });
      }
    } else if (elec.na > 145) {
      naSev = elec.na >= 158 ? 'critical' : elec.na >= 150 ? 'high' : 'moderate';
      const waterDeficit = 0.6 * weight * (elec.na / 140 - 1);
      disorders.push(`Tăng Natri máu (${elec.na} mmol/L)`);
      naInterp = `Tăng Natri máu (${elec.na} mmol/L). Ước tính thiếu nước tự do ≈ ${round(waterDeficit, 1)} L (theo cân nặng ${weight} kg).`;

      risks.push({
        id: 'elec-hyperna',
        priority: naSev,
        category: 'Điện giải / Thần kinh',
        title: 'Nguy cơ mất nước tế bào não, xuất huyết não & phù não hồi ứng nếu hạ Na⁺ quá nhanh',
        detail: 'Na⁺ > 158–160 mmol/L gây kích thích, lơ mơ, co giật, huyết khối xoang tĩnh mạch não.',
      });
      management.push({
        id: 'tx-hyperna',
        priority: naSev,
        category: 'Bù dịch',
        title: `Bù nước tự do từ từ (thiếu ước tính ~${round(waterDeficit, 1)} L)`,
        detail: 'Nếu tụt huyết áp: ổn định thể tích bằng NaCl 0.9% trước. Sau đó bù nước tự do bằng nước lọc qua sonde/uống hoặc Glucose 5% / NaCl 0.45% tĩnh mạch. Tốc độ hạ Na⁺ tối đa ≤ 0.5 mmol/L/giờ (≤ 10–12 mmol/L/24h nếu mạn tính) để tránh phù não.',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 8',
      });
      tests.push({
        id: 'test-hyperna',
        priority: 'moderate',
        category: 'Thận - Nội tiết',
        title: 'Đánh giá áp lực thẩm thấu niệu & lượng nước tiểu 24h',
        detail: 'Phân biệt mất nước tự do ngoài thận/thận (Uosm > 600–800) với Đái tháo nhạt (Uosm < 300 mOsm/kg).',
      });
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'electrolyte',
      title: 'Natri máu & Áp lực thẩm thấu',
      formula: 'Osm_tính = 2×Na⁺ + Glucose + Ure (mmol/L)',
      calculatedValue: `Na⁺ = ${elec.na} mmol/L${calculatedMetrics.correctedNaByGlucose ? ` | Na⁺_hc = ${calculatedMetrics.correctedNaByGlucose}` : ''}${calculatedMetrics.calculatedOsmolality ? ` | Osm_tính = ${calculatedMetrics.calculatedOsmolality} mOsm/kg` : ''}`,
      referenceRange: 'Na⁺ 135–145 mmol/L | Osm 280–300 mOsm/kg',
      interpretation: naInterp,
      severity: naSev,
    });

    void effectiveNa;
  }

  // 2. Potassium (with pH shift calculation from Ch.9)
  if (isNum(elec.k)) {
    let kSev: SeverityLevel = 'normal';
    let kNote = '';
    if (isNum(abg.ph)) {
      if (abg.ph < 7.35) {
        const deltaPhSteps = (7.4 - abg.ph) / 0.1;
        const estimatedShift = round(deltaPhSteps * 0.5, 2);
        kNote = `Lưu ý pH toan (${abg.ph}): toan máu đẩy K⁺ ra ngoại bào (~+${estimatedShift} mmol/L); khi điều trị hết toan, K⁺ thực sẽ giảm xuống.`;
        calculatedMetrics.kAdjustedNote = kNote;
      } else if (abg.ph > 7.45) {
        const deltaPhSteps = (abg.ph - 7.4) / 0.1;
        const estimatedShift = round(deltaPhSteps * 0.4, 2);
        kNote = `Lưu ý pH kiềm (${abg.ph}): kiềm máu đẩy K⁺ vào trong tế bào (~−${estimatedShift} mmol/L).`;
        calculatedMetrics.kAdjustedNote = kNote;
      }
    }

    let kInterp = `Kali máu bình thường (${elec.k} mmol/L). ${kNote}`.trim();

    if (elec.k > 5.0) {
      if (elec.k >= 6.5) {
        kSev = 'critical';
        disorders.push(`Tăng Kali máu NGUY KỊCH (${elec.k} mmol/L ≥ 6.5)`);
      } else if (elec.k >= 5.5) {
        kSev = 'high';
        disorders.push(`Tăng Kali máu trung bình (${elec.k} mmol/L)`);
      } else {
        kSev = 'moderate';
        disorders.push(`Tăng Kali máu nhẹ (${elec.k} mmol/L)`);
      }
      kInterp = `Tăng Kali máu (${elec.k} mmol/L). ${kNote}`.trim();

      risks.push({
        id: 'elec-hyperk-risk',
        priority: elec.k >= 6.0 ? 'critical' : 'high',
        category: 'Tim mạch / Điện giải',
        title: `Nguy cơ block dẫn truyền, nhịp tự thất, sóng hình sin & ngừng tim (K⁺ = ${elec.k} mmol/L)`,
        detail: 'Diễn tiến điện tâm đồ kinh điển: T cao nhọn (5.5–6.5) → mất sóng P, PR kéo dài (6.5–7.5) → QRS giãn rộng (7.0–9.0) → sóng hình sin / rung thất (> 9.0).',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 9 (Hình 9.3)',
      });
      tests.push({
        id: 'test-hyperk',
        priority: 'critical',
        category: 'Tim mạch / Thận',
        title: 'Đo ĐTĐ 12 chuyển đạo NGAY, kiểm tra lại mẫu loại trừ vỡ hồng cầu & chức năng thận',
        detail: 'Creatinine, eGFR, CK (tiêu cơ vân), LDH/Haptoglobin (tan máu), rà soát thuốc giữ K⁺ (ACEi/ARB, Spironolactone, NSAID, Heparin).',
      });
      management.push({
        id: 'tx-hyperk',
        priority: elec.k >= 6.0 ? 'critical' : 'high',
        category: 'Cấp cứu Tăng Kali',
        title: 'Phác đồ 3 bước xử trí Tăng Kali máu cấp cứu',
        detail:
          elec.k >= 6.0
            ? '1) Ổn định màng tế bào cơ tim NGAY: Calci gluconate 10% 10–20 mL (1–2g) IV chậm 2–5 phút (lặp lại sau 5–10 phút nếu ĐTĐ còn biến đổi). 2) Chuyển K⁺ vào tế bào: Insulin nhanh 10 UI + Glucose 50% 50 mL (hoặc D10W 250 mL) IV trong 15–30 phút; Salbutamol khí dung 10–20 mg; NaHCO₃ 8.4% 50 mEq IV nếu kèm toan chuyển hóa nặng. 3) Thải K⁺: Furosemide IV (nếu còn nước tiểu), nhựa trao đổi ion (Natri zirconium cyclosilicate / Kayexalate) và LỌC MÁU CẤP CỨU nếu suy thận nặng hoặc K⁺ trơ.'
            : 'Ngưng tất cả nguồn đưa K⁺ và thuốc giữ K⁺; dùng lợi tiểu quai (Furosemide) hoặc chất gắn K⁺ đường tiêu hóa; theo dõi ĐTĐ và K⁺ lặp lại sau 2–4 giờ.',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 9',
      });
    } else if (elec.k < 3.5) {
      if (elec.k < 2.5) {
        kSev = 'critical';
        disorders.push(`Hạ Kali máu NẶNG (${elec.k} mmol/L < 2.5)`);
      } else if (elec.k < 3.0) {
        kSev = 'high';
        disorders.push(`Hạ Kali máu trung bình (${elec.k} mmol/L)`);
      } else {
        kSev = 'moderate';
        disorders.push(`Hạ Kali máu nhẹ (${elec.k} mmol/L)`);
      }
      kInterp = `Hạ Kali máu (${elec.k} mmol/L). ${kNote}`.trim();

      risks.push({
        id: 'elec-hypok-risk',
        priority: elec.k < 2.5 ? 'critical' : 'high',
        category: 'Tim mạch / Thần kinh cơ',
        title: `Nguy cơ Xoắn đỉnh (Torsades de Pointes), liệt cơ hô hấp & tiêu cơ vân (K⁺ = ${elec.k} mmol/L)`,
        detail: 'Hạ K⁺ gây sóng T dẹt, ST chênh xuống, sóng U nổi bật, kéo dài QU/QT dễ khởi phát ngoại tâm thu thất và Xoắn đỉnh (đặc biệt khi dùng Digoxin hoặc kèm hạ Mg²⁺).',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 9 & Sổ tay ĐTĐ',
      });
      tests.push({
        id: 'test-hypok',
        priority: 'high',
        category: 'Điện giải',
        title: 'Đo ngay Mg²⁺ máu, ĐTĐ 12 chuyển đạo & K⁺ niệu / khí máu',
        detail: 'Hạ Mg²⁺ phối hợp làm thận tiếp tục mất K⁺ và khiến bù Kali không hiệu quả cho đến khi bù đủ Mg²⁺.',
      });
      management.push({
        id: 'tx-hypok',
        priority: elec.k < 2.5 ? 'critical' : 'high',
        category: 'Bù Kali an toàn',
        title: 'Bù KCl theo mức độ & kiểm tra Mg²⁺ song song',
        detail:
          elec.k < 2.5
            ? 'Bù KCl đường tĩnh mạch qua bơm tiêm điện có monitor ĐTĐ liên tục: 10–20 mmol/giờ (ngoại biên ≤ 10 mmol/h nồng độ ≤ 40 mmol/L; đường trung tâm tối đa 20–40 mmol/h khi đe dọa tính mạng). Bù kèm MgSO₄ 1–2g IV nếu nghi hạ Mg²⁺.'
            : 'Ưu tiên bù KCl đường uống (40–80 mmol/ngày chia nhiều lần) nếu dung nạp được; truyền IV 10 mmol/giờ nếu không uống được hoặc có biến đổi ĐTĐ.',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 9',
      });
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'electrolyte',
      title: 'Kali máu & tương quan pH',
      calculatedValue: `K⁺ = ${elec.k} mmol/L`,
      referenceRange: '3.5–5.0 mmol/L',
      interpretation: kInterp,
      severity: kSev,
    });
  }

  // 3. Chloride
  if (isNum(elec.cl)) {
    let clSev: SeverityLevel = 'normal';
    let clInterp = `Cl⁻ máu bình thường (${elec.cl} mmol/L).`;
    if (elec.cl > 108) {
      clSev = 'moderate';
      disorders.push(`Tăng Clo máu (${elec.cl} mmol/L)`);
      clInterp = `Tăng Clo máu (${elec.cl} > 108 mmol/L): thường gặp khi truyền lượng lớn NaCl 0.9%, tiêu chảy mất HCO₃⁻ hoặc toan hóa ống thận (RTA).`;
    } else if (elec.cl < 98) {
      clSev = 'moderate';
      disorders.push(`Hạ Clo máu (${elec.cl} mmol/L)`);
      clInterp = `Hạ Clo máu (${elec.cl} < 98 mmol/L): thường đi kèm kiềm chuyển hóa do nôn ói/hút dạ dày, lợi tiểu quai hoặc bù trừ toan hô hấp mạn.`;
    }
    steps.push({
      stepNumber: stepNum++,
      domain: 'electrolyte',
      title: 'Clo máu (Cl⁻)',
      calculatedValue: `Cl⁻ = ${elec.cl} mmol/L`,
      referenceRange: '98–108 mmol/L',
      interpretation: clInterp,
      severity: clSev,
    });
  }

  // 4. Calcium (Total + Albumin correction + Ionized)
  if (isNum(elec.caTotal) || isNum(elec.caIonized)) {
    let caCorr: number | undefined;
    if (isNum(elec.caTotal) && isNum(elec.albumin)) {
      caCorr = elec.caTotal + 0.02 * (40 - elec.albumin);
      calculatedMetrics.correctedCa = round(caCorr, 2);
    }

    const ion = elec.caIonized;
    const totEff = caCorr ?? elec.caTotal;
    let caSev: SeverityLevel = 'normal';
    let caInterp = '';

    const isLowIon = isNum(ion) && ion < 1.16;
    const isHighIon = isNum(ion) && ion > 1.32;
    const isLowTot = isNum(totEff) && totEff < 2.1;
    const isHighTot = isNum(totEff) && totEff > 2.55;

    if ((isNum(ion) && isLowIon) || (!isNum(ion) && isLowTot)) {
      const criticalCa = (isNum(ion) && ion < 0.8) || (isNum(totEff) && totEff < 1.75);
      caSev = criticalCa ? 'critical' : 'high';
      disorders.push(`Hạ Canxi máu (${isNum(ion) ? `Ca²⁺ ion = ${ion}` : `Ca_hc = ${round(totEff!, 2)}`} mmol/L)`);
      caInterp = `Hạ Canxi máu${isNum(ion) ? ` thực sự (Ca²⁺ ion = ${ion} < 1.16 mmol/L)` : ` (Ca hiệu chỉnh = ${round(totEff!, 2)} < 2.10 mmol/L)`}.`;

      risks.push({
        id: 'elec-hypoca',
        priority: caSev,
        category: 'Thần kinh cơ / Tim mạch',
        title: 'Nguy cơ co giật, co thắt thanh quản (tetany), QTc kéo dài & suy tim cấp do hạ Canxi',
        detail: 'Lưu ý: Kiềm máu (hyperventilation) làm tăng gắn Ca²⁺ vào Albumin khiến Ca²⁺ ion giảm thêm và bùng phát cơn tetany.',
      });
      tests.push({
        id: 'test-hypoca',
        priority: 'high',
        category: 'Nội tiết / Điện giải',
        title: 'Định lượng Ca²⁺ ion hóa, PTH, Vitamin D (25-OH-D), Mg²⁺ & Creatinine',
        detail: 'Kiểm tra dấu hiệu Chvostek / Trousseau và đo QTc trên ĐTĐ.',
      });
      management.push({
        id: 'tx-hypoca',
        priority: caSev,
        category: 'Bù Canxi cấp cứu',
        title: 'Truyền Calci gluconate tĩnh mạch & kiểm tra Mg²⁺',
        detail: criticalCa
          ? 'Có triệu chứng/QTc dài/Ca²⁺ ion < 0.8: Calci gluconate 10% 10–20 mL (1–2g) pha trong 50 mL D5W hoặc NaCl 0.9% truyền tĩnh mạch chậm trong 10–20 phút (có monitor ĐTĐ), sau đó duy trì truyền liên tục 0.5–1.5 mg/kg/h nguyên tố Ca. Kiểm tra & bù Mg²⁺ nếu hạ.'
          : 'Bổ sung Calci + Vitamin D đường uống; tìm nguyên nhân suy cận giáp, thiếu Vit D, viêm tụy cấp hoặc truyền nhiều máu chứa Citrate.',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 10',
      });
    } else if ((isNum(ion) && isHighIon) || (!isNum(ion) && isHighTot)) {
      const severeHighCa = (isNum(totEff) && totEff > 3.5) || (isNum(ion) && ion > 1.6);
      caSev = severeHighCa ? 'critical' : 'high';
      disorders.push(`Tăng Canxi máu (${isNum(totEff) ? `Ca = ${round(totEff, 2)}` : `Ca²⁺ = ${ion}`} mmol/L)`);
      caInterp = `Tăng Canxi máu${severeHighCa ? ' NẶNG (> 3.5 mmol/L — cơn tăng canxi máu cấp cứu)' : ''}.`;

      risks.push({
        id: 'elec-hyperca',
        priority: caSev,
        category: 'Thận / Thần kinh / Tim mạch',
        title: 'Nguy cơ mất nước nặng, suy thận cấp, lú lẫn/hôn mê, QTc ngắn & block tim',
        detail: 'Tăng Canxi > 3.5 mmol/L là cấp cứu nội khoa có nguy cơ ngừng tim hoặc suy thận không hồi phục.',
      });
      tests.push({
        id: 'test-hyperca',
        priority: 'high',
        category: 'Nội tiết / Ung bướu',
        title: 'Định lượng PTH (nguyên phát vs ác tính), PTHrP, 25-OH-D, điện di đạm máu',
        detail: 'PTH tăng gợi ý cường cận giáp; PTH bị ức chế gợi ý bệnh lý ác tính, ngộ độc Vitamin D hoặc u hạt.',
      });
      management.push({
        id: 'tx-hyperca',
        priority: caSev,
        category: 'Hồi sức điện giải',
        title: 'Truyền dịch NaCl 0.9% tích cực + Calcitonin / Bisphosphonate',
        detail: '1) Bù dịch NaCl 0.9% 200–300 mL/giờ (đảm bảo nước tiểu 100–150 mL/h; chỉ dùng Furosemide khi đã đủ dịch hoặc quá tải tuần hoàn). 2) Hạ nhanh trong 24–48h: Calcitonin 4 IU/kg SC/IM mỗi 12h. 3) Tác dụng bền vững: Acid Zoledronic 4 mg IV trong 15 phút (hiệu chỉnh theo eGFR) hoặc Denosumab nếu suy thận nặng.',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 10',
      });
    } else {
      caInterp = `Canxi máu trong giới hạn bình thường${caCorr ? ` (Ca hiệu chỉnh = ${round(caCorr, 2)} mmol/L)` : ''}.`;
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'electrolyte',
      title: 'Canxi máu (Toàn phần / Hiệu chỉnh Albumin / Ion hóa)',
      formula: 'Ca_hc = Ca_toàn phần + 0.02 × (40 − Albumin_g/L)',
      calculatedValue: `${isNum(elec.caTotal) ? `Ca TP = ${elec.caTotal}` : ''}${caCorr ? ` | Ca_hc = ${round(caCorr, 2)}` : ''}${isNum(ion) ? ` | Ca²⁺ ion = ${ion}` : ''} mmol/L`,
      referenceRange: 'Ca TP 2.10–2.55 | Ca²⁺ ion 1.16–1.32 mmol/L',
      interpretation: caInterp,
      severity: caSev,
    });
  }

  // 5. Magnesium
  if (isNum(elec.mg)) {
    let mgSev: SeverityLevel = 'normal';
    let mgInterp = `Magie máu bình thường (${elec.mg} mmol/L).`;

    if (elec.mg < 0.7) {
      mgSev = elec.mg < 0.4 ? 'critical' : 'high';
      disorders.push(`Hạ Magie máu (${elec.mg} mmol/L)`);
      mgInterp = `Hạ Magie máu (${elec.mg} < 0.70 mmol/L${elec.mg < 0.4 ? ' — NẶNG' : ''}): hay gây hạ K⁺ và hạ Ca²⁺ kháng trị.`;
      risks.push({
        id: 'elec-hypomg',
        priority: mgSev,
        category: 'Tim mạch / Điện giải',
        title: 'Nguy cơ Xoắn đỉnh (TdP), rung thất, co giật & hạ K⁺/Ca²⁺ không đáp ứng điều trị',
        detail: 'Hạ Mg²⁺ < 0.4 mmol/L có thể gây loạn nhịp thất đe dọa tính mạng ngay cả khi không có thiếu máu cơ tim.',
      });
      management.push({
        id: 'tx-hypomg',
        priority: mgSev,
        category: 'Bù Magie',
        title: 'Truyền MgSO₄ tĩnh mạch',
        detail:
          elec.mg < 0.4
            ? 'Hạ Mg²⁺ nặng / có loạn nhịp hoặc TdP: MgSO₄ 2g (8 mmol) pha 50–100 mL D5W/NS IV trong 10–15 phút (hoặc 1–2 phút nếu đang Xoắn đỉnh), sau đó duy trì 4–6g/24h nếu chức năng thận bình thường.'
            : 'MgSO₄ 1–2g IV trong 30–60 phút hoặc bổ sung Mg đường uống nếu nhẹ không triệu chứng.',
        sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 10',
      });
    } else if (elec.mg > 1.05) {
      if (elec.mg >= 3.0) {
        mgSev = 'critical';
        disorders.push(`Tăng Magie máu NẶNG (${elec.mg} mmol/L)`);
      } else if (elec.mg >= 1.5) {
        mgSev = 'high';
        disorders.push(`Tăng Magie máu (${elec.mg} mmol/L)`);
      } else {
        mgSev = 'mild';
      }
      mgInterp = `Tăng Magie máu (${elec.mg} mmol/L): 2–3 mmol/L mất phản xạ gân xương; 3–5 mmol/L tụt huyết áp, chậm nhịp; > 5 mmol/L liệt hô hấp, block nhĩ thất hoàn toàn.`;
      if (elec.mg >= 2.0) {
        management.push({
          id: 'tx-hypermg',
          priority: 'critical',
          category: 'Đối kháng Magie',
          title: 'Ngưng nguồn Mg + Calci gluconate đối kháng + Lọc máu nếu suy thận',
          detail: 'Calci gluconate 10% 10–20 mL IV chậm 5–10 phút đối kháng ngay tác dụng ức chế thần kinh-cơ của Mg²⁺; truyền NaCl 0.9% + Furosemide nếu thận còn hoạt động, hoặc chạy thận nhân tạo cấp cứu.',
        });
      }
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'electrolyte',
      title: 'Magie máu (Mg²⁺)',
      calculatedValue: `Mg²⁺ = ${elec.mg} mmol/L`,
      referenceRange: '0.70–1.05 mmol/L',
      interpretation: mgInterp,
      severity: mgSev,
    });
  }

  // 6. Phosphate
  if (isNum(elec.po4)) {
    let po4Sev: SeverityLevel = 'normal';
    let po4Interp = `Phospho vô cơ bình thường (${elec.po4} mmol/L).`;

    if (elec.po4 < 0.81) {
      po4Sev = elec.po4 < 0.32 ? 'critical' : elec.po4 < 0.64 ? 'high' : 'moderate';
      disorders.push(`Hạ Phospho máu (${elec.po4} mmol/L)`);
      po4Interp = `Hạ Phospho máu (${elec.po4} < 0.81 mmol/L${elec.po4 < 0.32 ? ' — NẶNG (< 0.32 mmol/L)' : ''}): hay gặp trong hội chứng nuôi ăn lại (refeeding), hồi phục DKA, nghiện rượu, kiềm hô hấp.`;
      if (elec.po4 < 0.32) {
        risks.push({
          id: 'elec-hypopo4',
          priority: 'critical',
          category: 'Hô hấp / Chuyển hóa',
          title: 'Nguy cơ suy cơ hô hấp cai máy thất bại, yếu cơ, tan máu & giảm ATP tế bào',
          detail: 'Hạ Phospho nặng làm giảm 2,3-DPG hồng cầu (dịch trái đường cong Hb-O₂ giảm nhả O₂ mô), tiêu cơ vân và suy tim.',
        });
        management.push({
          id: 'tx-hypopo4',
          priority: 'high',
          category: 'Bù Phospho',
          title: 'Bù Phospho đường tĩnh mạch thận trọng',
          detail: 'Với PO₄ < 0.32 mmol/L hoặc có triệu chứng: Potassium phosphate hoặc Sodium phosphate 0.16–0.32 mmol/kg (hoặc 15–30 mmol) pha truyền tĩnh mạch trong 4–6 giờ; kiểm tra Ca²⁺ & K⁺ định kỳ tránh hạ Ca²⁺.',
          sourceRef: 'Khí máu & Điện giải cấp cứu - Chương 10',
        });
      }
    } else if (elec.po4 > 1.45) {
      po4Sev = elec.po4 > 2.9 ? 'high' : 'moderate';
      disorders.push(`Tăng Phospho máu (${elec.po4} mmol/L)`);
      po4Interp = `Tăng Phospho máu (${elec.po4} > 1.45 mmol/L): gặp trong suy thận, hội chứng ly giải u, tiêu cơ vân; có thể gây kết tủa Ca-P và hạ Canxi máu thứ phát.`;
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'electrolyte',
      title: 'Phospho máu (PO₄³⁻)',
      calculatedValue: `PO₄³⁻ = ${elec.po4} mmol/L`,
      referenceRange: '0.81–1.45 mmol/L',
      interpretation: po4Interp,
      severity: po4Sev,
    });
  }

  return {
    hasData: true,
    disorders,
    calculatedMetrics,
    steps,
    risks,
    tests,
    management,
  };
}
