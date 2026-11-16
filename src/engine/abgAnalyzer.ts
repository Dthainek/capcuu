import {
  AbgAnalysisResult,
  AbgInput,
  ClinicalActionItem,
  ClinicalContext,
  DiagnosticStep,
  ElectrolyteInput,
  SeverityLevel,
} from '../types/clinical';

function isNum(v: number | undefined | null): v is number {
  return typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
}

function round(v: number, digits = 1): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

export function analyzeAbg(
  abg: AbgInput,
  elec: ElectrolyteInput,
  ctx: ClinicalContext
): AbgAnalysisResult {
  const hasAnyAbg =
    isNum(abg.ph) ||
    isNum(abg.pco2) ||
    isNum(abg.hco3) ||
    isNum(abg.po2) ||
    isNum(abg.lactate) ||
    isNum(abg.sao2) ||
    isNum(abg.o2Hb) ||
    isNum(abg.coHb) ||
    isNum(abg.metHb);

  if (!hasAnyAbg) {
    return {
      hasData: false,
      primaryDisorder: 'Chưa nhập thông số khí máu',
      compensationStatus: 'Chưa đánh giá',
      mixedDisorders: [],
      oxygenationStatus: 'Chưa đánh giá',
      calculatedMetrics: {},
      steps: [],
      preanalyticalWarnings: [],
      risks: [],
      tests: [],
      management: [],
    };
  }

  const isArterial = abg.sampleType === 'arterial';
  const phRef = isArterial ? { low: 7.35, high: 7.45, mid: 7.4 } : { low: 7.32, high: 7.42, mid: 7.37 };
  const pco2Ref = isArterial ? { low: 35, high: 45, mid: 40 } : { low: 39, high: 55, mid: 46 };
  const hco3Ref = isArterial ? { low: 21, high: 29, mid: 24 } : { low: 21, high: 30, mid: 25 };
  const po2Low = ctx.age && ctx.age > 60 ? 70 : 80;

  const steps: DiagnosticStep[] = [];
  const risks: ClinicalActionItem[] = [];
  const tests: ClinicalActionItem[] = [];
  const management: ClinicalActionItem[] = [];
  const preanalyticalWarnings: string[] = [];
  const mixedDisorders: string[] = [];
  const calculatedMetrics: AbgAnalysisResult['calculatedMetrics'] = {};

  // Preanalytical checks (Chapter 12)
  if (ctx.excessLiquidHeparin) {
    preanalyticalWarnings.push(
      'Thừa Heparin lỏng: Có thể làm giảm giả PaCO₂, HCO₃⁻ và điện giải (~10%), đôi khi làm giảm nhẹ pH.'
    );
  }
  if (ctx.airBubblesInSyringe) {
    preanalyticalWarnings.push(
      'Bọt khí trong bơm tiêm: PaO₂ có xu hướng dịch chuyển về ~150 mmHg (tăng giả nếu PaO₂ thực thấp, giảm giả nếu bệnh nhân đang thở oxy cao) và PaCO₂ giảm giả.'
    );
  }
  if (ctx.delayedTransportOver15Min) {
    preanalyticalWarnings.push(
      'Chậm vận chuyển/không ủ đá >15–30 phút: Bạch cầu tiếp tục chuyển hóa tiêu thụ O₂ và sinh acid lactic → giảm giả PaO₂, pH và tăng giả PaCO₂, Lactate.'
    );
  }
  if (ctx.extremeLeukocytosisOrThrombocytosis) {
    preanalyticalWarnings.push(
      'Tăng bạch cầu/tiểu cầu rất cao ("Leukocyte larceny"): Có thể gây giảm oxy máu giả (pseudohypoxemia) và tăng kali máu giả.'
    );
  }
  if (ctx.hemolyzedSample) {
    preanalyticalWarnings.push(
      'Mẫu vỡ hồng cầu: K⁺, PO₄³⁻ và Mg²⁺ huyết thanh có thể tăng giả nghiêm trọng.'
    );
  }

  let stepCounter = 1;

  // Step 0: Henderson internal consistency check if pH, pCO2, HCO3 are all present
  if (isNum(abg.ph) && isNum(abg.pco2) && isNum(abg.hco3) && abg.hco3 > 0) {
    const measuredH = Math.pow(10, 9 - abg.ph); // nmol/L
    const expectedH = (24 * abg.pco2) / abg.hco3;
    const diff = Math.abs(measuredH - expectedH);
    const consistent = diff <= 5;
    calculatedMetrics.hendersonMeasuredH = round(measuredH, 1);
    calculatedMetrics.hendersonExpectedH = round(expectedH, 1);
    calculatedMetrics.hendersonConsistent = consistent;

    // Also compute BE_ECF formula from Ch.1: 16.2*(pH - 7.40) - 24.8 + HCO3
    const beCalc = 16.2 * (abg.ph - 7.4) - 24.8 + abg.hco3;
    calculatedMetrics.beCalculated = round(beCalc, 1);

    steps.push({
      stepNumber: stepCounter++,
      domain: 'abg',
      title: 'Bước 1: Kiểm tra tính nhất quán nội tại (Henderson)',
      formula: '[H⁺] = 24 × PaCO₂ / HCO₃⁻ (so với 10^(9 − pH))',
      calculatedValue: `[H⁺] đo ≈ ${round(measuredH, 1)} nmol/L | [H⁺] tính ≈ ${round(expectedH, 1)} nmol/L | BE ước tính: ${round(beCalc, 1)} mmol/L`,
      referenceRange: 'Chênh lệch ≤ 5 nmol/L là tin cậy',
      interpretation: consistent
        ? 'Các thông số pH, PaCO₂ và HCO₃⁻ nhất quán về mặt toán học.'
        : 'Cảnh báo: Chênh lệch [H⁺] > 5 nmol/L! Kiểm tra lại sai số nhập liệu hoặc lỗi tiền kiểm mẫu khí máu.',
      severity: consistent ? 'normal' : 'moderate',
    });

    if (!consistent) {
      preanalyticalWarnings.push(
        `Không nhất quán phương trình Henderson ([H⁺] từ pH = ${round(measuredH, 1)} vs tính từ PaCO₂/HCO₃⁻ = ${round(expectedH, 1)} nmol/L). Cần xác minh lại kết quả máy khí máu.`
      );
    }
  }

  // Step 2: Primary Acid-Base Analysis
  let primaryDisorder = 'Thăng bằng kiềm – toan trong giới hạn bình thường';
  let compensationStatus = 'Không có rối loạn tiên phát rõ rệt';
  let acidBaseSeverity: SeverityLevel = 'normal';

  const ph = abg.ph;
  const pco2 = abg.pco2;
  const hco3 = abg.hco3;

  if (!isArterial) {
    preanalyticalWarnings.push(
      'Mẫu là Khí máu Tĩnh mạch (VBG): Đáng tin cậy để đánh giá pH, HCO₃⁻, Lactate và xu hướng thông khí; không dùng đơn độc thay PaO₂/A-a gradient động mạch.'
    );
  }

  if (isNum(ph)) {
    if (ph < 7.1 || ph > 7.6) acidBaseSeverity = 'critical';
    else if (ph < 7.25 || ph > 7.55) acidBaseSeverity = 'high';
    else if (ph < phRef.low || ph > phRef.high) acidBaseSeverity = 'moderate';
  }

  if (isNum(ph) && isNum(pco2) && isNum(hco3)) {
    const isAcidemia = ph < phRef.low;
    const isAlkalemia = ph > phRef.high;
    const isNormalPh = !isAcidemia && !isAlkalemia;

    const pco2High = pco2 > pco2Ref.high;
    const pco2Low = pco2 < pco2Ref.low;
    const hco3Low = hco3 < hco3Ref.low;
    const hco3High = hco3 > hco3Ref.high;

    // Determine primary disorder using textbook Step 2 & 3
    if (isAcidemia) {
      if (pco2High && hco3Low) {
        primaryDisorder = 'Toan hỗn hợp (Toan hô hấp + Toan chuyển hóa)';
        compensationStatus = 'Cả PaCO₂ tăng và HCO₃⁻ giảm cùng đẩy pH xuống < 7.35.';
        mixedDisorders.push('Toan hô hấp', 'Toan chuyển hóa');
      } else if (pco2High) {
        primaryDisorder = 'Toan hô hấp tiên phát';
        // Check acute vs chronic compensation (p.40s Ch.1 & Ch.3)
        const expAcuteHco3 = 24 + 0.1 * (pco2 - 40);
        const expChronicHco3 = 24 + 0.35 * (pco2 - 40);
        const targetHco3 =
          abg.respiratoryDuration === 'chronic' ? expChronicHco3 : expAcuteHco3;
        calculatedMetrics.expectedHco3 = round(targetHco3, 1);

        if (abg.respiratoryDuration === 'acute') {
          if (hco3 < expAcuteHco3 - 3) {
            compensationStatus = `Kèm Toan chuyển hóa phối hợp (HCO₃⁻ thực ${hco3} < kỳ vọng cấp ${round(expAcuteHco3, 1)} mmol/L).`;
            mixedDisorders.push('Toan chuyển hóa phối hợp');
          } else if (hco3 > expAcuteHco3 + 3) {
            compensationStatus = `HCO₃⁻ cao hơn mức bù cấp (${round(expAcuteHco3, 1)}) — gợi ý nền toan hô hấp mạn hoặc kèm Kiềm chuyển hóa.`;
            mixedDisorders.push('Kiềm chuyển hóa phối hợp hoặc nền mạn');
          } else {
            compensationStatus = `Bù chuyển hóa phù hợp với toan hô hấp cấp (HCO₃⁻ kỳ vọng ≈ ${round(expAcuteHco3, 1)} mmol/L).`;
          }
        } else if (abg.respiratoryDuration === 'chronic') {
          if (hco3 < expChronicHco3 - 4) {
            compensationStatus = `Kèm Toan chuyển hóa phối hợp (HCO₃⁻ thực ${hco3} < kỳ vọng mạn ${round(expChronicHco3, 1)} mmol/L).`;
            mixedDisorders.push('Toan chuyển hóa phối hợp');
          } else if (hco3 > expChronicHco3 + 4) {
            compensationStatus = `Kèm Kiềm chuyển hóa phối hợp (HCO₃⁻ thực ${hco3} > kỳ vọng mạn ${round(expChronicHco3, 1)} mmol/L).`;
            mixedDisorders.push('Kiềm chuyển hóa phối hợp');
          } else {
            compensationStatus = `Bù thận phù hợp với toan hô hấp mạn (HCO₃⁻ kỳ vọng ≈ ${round(expChronicHco3, 1)} mmol/L).`;
          }
        } else {
          // Unknown duration -> infer from ΔpH = 0.008*(40-pCO2) vs 0.003*(40-pCO2)
          const expPhAcute = 7.4 - 0.008 * (pco2 - 40);
          const expPhChronic = 7.4 - 0.003 * (pco2 - 40);
          if (Math.abs(ph - expPhAcute) <= Math.abs(ph - expPhChronic)) {
            compensationStatus = `Diễn biến phù hợp Toan hô hấp CẤP (HCO₃⁻ bù cấp kỳ vọng ≈ ${round(expAcuteHco3, 1)} mmol/L; nếu mạn kỳ vọng ≈ ${round(expChronicHco3, 1)}).`;
            if (hco3 < expAcuteHco3 - 3) {
              mixedDisorders.push('Toan chuyển hóa phối hợp');
              compensationStatus += ' Kèm Toan chuyển hóa phối hợp.';
            }
          } else {
            compensationStatus = `Gợi ý Toan hô hấp MẠN hoặc đợt cấp trên nền mạn (HCO₃⁻ bù mạn kỳ vọng ≈ ${round(expChronicHco3, 1)} mmol/L).`;
            if (hco3 > expChronicHco3 + 4) {
              mixedDisorders.push('Kiềm chuyển hóa phối hợp');
            }
          }
        }
      } else if (hco3Low) {
        primaryDisorder = 'Toan chuyển hóa tiên phát';
        // Textbook Ch.3 formula: Expected pCO2 = 40 - 1.2 * (24 - HCO3) (±3)
        // Also Winter's: 1.5*HCO3 + 8 ± 2
        const expPco2 = 40 - 1.2 * (24 - hco3);
        const winterPco2 = 1.5 * hco3 + 8;
        calculatedMetrics.expectedPco2 = round(expPco2, 1);

        if (pco2 > expPco2 + 3) {
          compensationStatus = `Kèm Toan hô hấp phối hợp (PaCO₂ thực ${pco2} > kỳ vọng ${round(expPco2, 1)} ± 3 mmHg, Winter ≈ ${round(winterPco2, 1)}).`;
          mixedDisorders.push('Toan hô hấp phối hợp (giảm thông khí/suy hô hấp)');
        } else if (pco2 < expPco2 - 3) {
          compensationStatus = `Kèm Kiềm hô hấp phối hợp (PaCO₂ thực ${pco2} < kỳ vọng ${round(expPco2, 1)} ± 3 mmHg).`;
          mixedDisorders.push('Kiềm hô hấp phối hợp');
        } else {
          compensationStatus = `Bù hô hấp phù hợp (PaCO₂ kỳ vọng ≈ ${round(expPco2, 1)} ± 3 mmHg; Winter ≈ ${round(winterPco2, 1)}).`;
        }
      } else {
        primaryDisorder = 'Toan máu nhẹ / Rối loạn hỗn hợp kín đáo';
        compensationStatus = 'pH giảm nhẹ nhưng PaCO₂ và HCO₃⁻ đều sát ngưỡng tham chiếu.';
      }
    } else if (isAlkalemia) {
      if (pco2Low && hco3High) {
        primaryDisorder = 'Kiềm hỗn hợp (Kiềm hô hấp + Kiềm chuyển hóa)';
        compensationStatus = 'Cả PaCO₂ giảm và HCO₃⁻ tăng cùng đẩy pH > 7.45.';
        mixedDisorders.push('Kiềm hô hấp', 'Kiềm chuyển hóa');
      } else if (pco2Low) {
        primaryDisorder = 'Kiềm hô hấp tiên phát';
        const expAcuteHco3 = 24 - 0.2 * (40 - pco2);
        const expChronicHco3 = Math.max(12, 24 - 0.5 * (40 - pco2));
        const targetHco3 =
          abg.respiratoryDuration === 'chronic' ? expChronicHco3 : expAcuteHco3;
        calculatedMetrics.expectedHco3 = round(targetHco3, 1);

        if (abg.respiratoryDuration === 'acute') {
          if (hco3 < expAcuteHco3 - 3) {
            compensationStatus = `Kèm Toan chuyển hóa phối hợp (HCO₃⁻ thực ${hco3} < kỳ vọng cấp ${round(expAcuteHco3, 1)} mmol/L).`;
            mixedDisorders.push('Toan chuyển hóa phối hợp');
          } else if (hco3 > expAcuteHco3 + 3) {
            compensationStatus = `Kèm Kiềm chuyển hóa phối hợp (HCO₃⁻ thực ${hco3} > kỳ vọng cấp ${round(expAcuteHco3, 1)} mmol/L).`;
            mixedDisorders.push('Kiềm chuyển hóa phối hợp');
          } else {
            compensationStatus = `Bù chuyển hóa phù hợp với kiềm hô hấp cấp (HCO₃⁻ kỳ vọng ≈ ${round(expAcuteHco3, 1)} mmol/L).`;
          }
        } else {
          if (hco3 < expChronicHco3 - 3) {
            compensationStatus = `Kèm Toan chuyển hóa phối hợp (HCO₃⁻ thực ${hco3} < kỳ vọng mạn ${round(expChronicHco3, 1)} mmol/L).`;
            mixedDisorders.push('Toan chuyển hóa phối hợp');
          } else if (hco3 > expAcuteHco3 + 3) {
            compensationStatus = `Kèm Kiềm chuyển hóa phối hợp (HCO₃⁻ thực ${hco3} > kỳ vọng ${round(expAcuteHco3, 1)} mmol/L).`;
            mixedDisorders.push('Kiềm chuyển hóa phối hợp');
          } else {
            compensationStatus = `Phù hợp kiềm hô hấp (HCO₃⁻ kỳ vọng cấp ≈ ${round(expAcuteHco3, 1)}, mạn ≈ ${round(expChronicHco3, 1)} mmol/L).`;
          }
        }
      } else if (hco3High) {
        primaryDisorder = 'Kiềm chuyển hóa tiên phát';
        // Ch.3: Expected pCO2 = 40 + 0.7 * (HCO3 - 24) ± 4
        const expPco2 = Math.min(60, 40 + 0.7 * (hco3 - 24));
        calculatedMetrics.expectedPco2 = round(expPco2, 1);

        if (pco2 < expPco2 - 4) {
          compensationStatus = `Kèm Kiềm hô hấp phối hợp (PaCO₂ thực ${pco2} < kỳ vọng ${round(expPco2, 1)} ± 4 mmHg).`;
          mixedDisorders.push('Kiềm hô hấp phối hợp');
        } else if (pco2 > expPco2 + 4) {
          compensationStatus = `Kèm Toan hô hấp phối hợp (PaCO₂ thực ${pco2} > kỳ vọng ${round(expPco2, 1)} ± 4 mmHg).`;
          mixedDisorders.push('Toan hô hấp phối hợp');
        } else {
          compensationStatus = `Bù hô hấp phù hợp với kiềm chuyển hóa (PaCO₂ kỳ vọng ≈ ${round(expPco2, 1)} ± 4 mmHg).`;
        }
      } else {
        primaryDisorder = 'Kiềm máu nhẹ';
        compensationStatus = 'pH tăng nhẹ sát ngưỡng trên.';
      }
    } else if (isNormalPh) {
      // Textbook rule: Normal pH with abnormal pCO2 AND HCO3 ALWAYS signals a mixed disorder!
      if ((pco2High && hco3High) || (pco2Low && hco3Low)) {
        primaryDisorder =
          pco2High && hco3High
            ? 'Rối loạn hỗn hợp cân bằng pH (Toan hô hấp + Kiềm chuyển hóa hoặc bù trừ hoàn toàn mạn tính)'
            : 'Rối loạn hỗn hợp cân bằng pH (Kiềm hô hấp + Toan chuyển hóa)';
        compensationStatus =
          'Lưu ý nguyên tắc sinh lý: Bù trừ đơn thuần hiếm khi đưa pH về hoàn toàn bình thường (7.40) ngoại trừ kiềm hô hấp mạn nhẹ; cần tìm rối loạn hỗn hợp.';
        mixedDisorders.push(
          pco2High
            ? 'Toan hô hấp phối hợp Kiềm chuyển hóa (hoặc bù mạn hoàn toàn)'
            : 'Kiềm hô hấp phối hợp Toan chuyển hóa'
        );
        acidBaseSeverity = 'moderate';
      } else if (pco2High || pco2Low || hco3High || hco3Low) {
        primaryDisorder = 'Bất thường PaCO₂ hoặc HCO₃⁻ đơn lẻ với pH bình thường';
        compensationStatus = 'Theo dõi rối loạn giai đoạn sớm hoặc hỗn hợp nhẹ.';
        acidBaseSeverity = 'mild';
      }
    }

    steps.push({
      stepNumber: stepCounter++,
      domain: 'abg',
      title: 'Bước 2: Đánh giá pH, rối loạn nguyên phát & mức độ bù trừ',
      formula: 'Quy tắc bù trừ: Toan CH (ΔPaCO₂=1.2×ΔHCO₃⁻); Kiềm CH (ΔPaCO₂=0.7×ΔHCO₃⁻); HH cấp/mạn',
      calculatedValue: `pH = ${ph} | PaCO₂ = ${pco2} mmHg | HCO₃⁻ = ${hco3} mmol/L`,
      referenceRange: `pH ${phRef.low}–${phRef.high} | PaCO₂ ${pco2Ref.low}–${pco2Ref.high} | HCO₃⁻ ${hco3Ref.low}–${hco3Ref.high}`,
      interpretation: `${primaryDisorder}. ${compensationStatus}`,
      severity: acidBaseSeverity,
    });
  } else if (isNum(ph)) {
    primaryDisorder = ph < phRef.low ? 'Toan máu (chưa đủ PaCO₂/HCO₃⁻ để phân định)' : ph > phRef.high ? 'Kiềm máu (chưa đủ PaCO₂/HCO₃⁻)' : 'pH bình thường';
    steps.push({
      stepNumber: stepCounter++,
      domain: 'abg',
      title: 'Bước 2: Đánh giá pH máu',
      calculatedValue: `pH = ${ph}`,
      referenceRange: `${phRef.low}–${phRef.high}`,
      interpretation: primaryDisorder,
      severity: acidBaseSeverity,
    });
  }

  // Step 3: Anion Gap, Albumin-Corrected AG, Delta Gap & Delta Ratio (Ch.3)
  if (isNum(elec.na) && isNum(elec.cl) && isNum(hco3)) {
    const ag = elec.na - (elec.cl + hco3);
    calculatedMetrics.anionGap = round(ag, 1);

    let agEffective = ag;
    let agCorrectedStr = '';
    if (isNum(elec.albumin)) {
      const agCorr = ag + 0.25 * (45 - elec.albumin);
      calculatedMetrics.anionGapCorrected = round(agCorr, 1);
      agEffective = agCorr;
      agCorrectedStr = ` | AG hiệu chỉnh Albumin (${elec.albumin} g/L) = ${round(agCorr, 1)} mmol/L`;
    }

    if (isNum(elec.k) && isNum(abg.lactate)) {
      const sid = elec.na + elec.k - elec.cl - abg.lactate;
      calculatedMetrics.sid = round(sid, 1);
    }

    const isHighAg = agEffective > 16;
    let agInterp = '';
    let agSeverity: SeverityLevel = 'normal';

    if (isHighAg) {
      agSeverity = agEffective >= 24 ? 'high' : 'moderate';
      const deltaAg = agEffective - 12;
      const deltaHco3 = 24 - hco3;
      const deltaGap = deltaAg - deltaHco3;
      calculatedMetrics.deltaGap = round(deltaGap, 1);

      let deltaText = '';
      if (deltaHco3 > 0) {
        const deltaRatio = deltaAg / deltaHco3;
        calculatedMetrics.deltaRatio = round(deltaRatio, 2);
        if (deltaGap <= -5 || deltaRatio < 0.8) {
          deltaText = `Delta Gap = ${round(deltaGap, 1)} (≤ -5) / Delta Ratio = ${round(deltaRatio, 2)} (< 0.8) → Toan chuyển hóa tăng AG PHỐI HỢP Toan chuyển hóa AG bình thường (tăng Cl⁻ máu).`;
          mixedDisorders.push('Toan chuyển hóa tăng AG + Toan chuyển hóa AG bình thường');
        } else if (deltaGap >= 5 || deltaRatio >= 2.0) {
          deltaText = `Delta Gap = +${round(deltaGap, 1)} (≥ +5) / Delta Ratio = ${round(deltaRatio, 2)} (≥ 2.0) → Toan chuyển hóa tăng AG PHỐI HỢP Kiềm chuyển hóa (hoặc nền tăng HCO₃⁻ mạn).`;
          mixedDisorders.push('Toan chuyển hóa tăng AG + Kiềm chuyển hóa');
        } else {
          deltaText = `Delta Gap = ${round(deltaGap, 1)} (-4 đến +4) / Delta Ratio = ${round(deltaRatio, 2)} → Toan chuyển hóa tăng khoảng trống Anion (HAGMA) đơn thuần.`;
          if (!primaryDisorder.includes('Toan chuyển hóa')) {
            mixedDisorders.push('Toan chuyển hóa tăng khoảng trống Anion ẩn (HAGMA)');
          }
        }
      } else {
        deltaText = `AG tăng (${round(agEffective, 1)} mmol/L) dù HCO₃⁻ ≥ 24 mmol/L → Gợi ý Toan chuyển hóa tăng AG phối hợp Kiềm chuyển hóa (Delta Gap = +${round(deltaGap, 1)}).`;
        mixedDisorders.push('Toan chuyển hóa tăng AG ẩn + Kiềm chuyển hóa');
      }

      agInterp = `Tăng khoảng trống Anion (HAGMA): AG đo = ${round(ag, 1)}${agCorrectedStr}. ${deltaText}`;
    } else if (hco3 < hco3Ref.low) {
      agSeverity = 'moderate';
      agInterp = `Khoảng trống Anion bình thường (AG = ${round(ag, 1)}${agCorrectedStr}) với HCO₃⁻ giảm → Toan chuyển hóa khoảng trống Anion bình thường (NAGMA / tăng Clo máu).`;
    } else {
      agInterp = `Khoảng trống Anion bình thường: AG = ${round(ag, 1)}${agCorrectedStr} mmol/L.`;
    }

    steps.push({
      stepNumber: stepCounter++,
      domain: 'abg',
      title: 'Bước 3: Khoảng trống Anion (AG), hiệu chỉnh Albumin & Delta Gap',
      formula: 'AG = Na⁺ − (Cl⁻ + HCO₃⁻) | AG_hc = AG + 0.25×(45 − Alb) | ΔGap = (AG−12)−(24−HCO₃⁻)',
      calculatedValue: `AG = ${round(ag, 1)} mmol/L${agCorrectedStr}${isNum(calculatedMetrics.deltaGap) ? ` | ΔGap = ${calculatedMetrics.deltaGap}` : ''}${isNum(calculatedMetrics.sid) ? ` | SID = ${calculatedMetrics.sid}` : ''}`,
      referenceRange: 'AG 8–16 mmol/L (chuẩn ~12) | ΔGap -4 đến +4',
      interpretation: agInterp,
      severity: agSeverity,
    });
  }

  // Step 4: Oxygenation, A-a Gradient, P/F Ratio, CaO2, Dyshemoglobins (Ch.6)
  let oxygenationStatus = 'Chưa đủ PaO₂/FiO₂ để phân tích oxy hóa';
  let ardsStage: AbgAnalysisResult['ardsStage'] = null;
  let oxySeverity: SeverityLevel = 'normal';

  const fio2Pct = isNum(abg.fio2) ? Math.min(100, Math.max(21, abg.fio2)) : 21;
  const fio2Dec = fio2Pct / 100;

  if (isNum(abg.po2) && isArterial) {
    const po2 = abg.po2;
    const pfRatio = po2 / fio2Dec;
    calculatedMetrics.pfRatio = round(pfRatio, 0);

    if (po2 < 60) {
      oxySeverity = po2 < 45 ? 'critical' : 'high';
      oxygenationStatus = `Suy hô hấp giảm oxy máu nặng (PaO₂ = ${po2} mmHg < 60 mmHg)`;
    } else if (po2 < po2Low) {
      oxySeverity = 'moderate';
      oxygenationStatus = `Giảm oxy máu động mạch (PaO₂ = ${po2} mmHg < ${po2Low} mmHg)`;
    } else if (po2 > 120 && fio2Pct === 21) {
      oxygenationStatus = `PaO₂ cao (${po2} mmHg) — kiểm tra tăng thông khí hoặc bọt khí mẫu`;
    } else if (po2 > 150) {
      oxygenationStatus = `Tăng oxy máu động mạch (Hyperoxemia, PaO₂ = ${po2} mmHg dưới FiO₂ ${fio2Pct}%)`;
    } else {
      oxygenationStatus = `PaO₂ trong giới hạn đạt (${po2} mmHg với FiO₂ ${fio2Pct}%)`;
    }

    // Berlin ARDS classification (Table 6.4) when hypoxemia exists
    if (pfRatio <= 100) {
      ardsStage = 'Nặng';
      oxySeverity = 'critical';
    } else if (pfRatio <= 200) {
      ardsStage = 'Trung bình';
      if (oxySeverity !== 'critical') oxySeverity = 'high';
    } else if (pfRatio <= 300) {
      ardsStage = 'Nhẹ';
      if (oxySeverity === 'normal') oxySeverity = 'moderate';
    }

    // A-a Gradient if pCO2 available
    let aaText = '';
    if (isNum(pco2)) {
      const pao2Alv = (760 - 47) * fio2Dec - pco2 / 0.8;
      const aaGrad = pao2Alv - po2;
      const aaUpper = ctx.age ? ctx.age / 4 + 4 : 20;
      calculatedMetrics.pao2Alveolar = round(pao2Alv, 1);
      calculatedMetrics.aaGradient = round(aaGrad, 1);
      calculatedMetrics.aaUpperLimit = round(aaUpper, 1);

      if (fio2Pct <= 25) {
        if (aaGrad > aaUpper) {
          aaText = ` A-a gradient TĂNG (${round(aaGrad, 1)} > ${round(aaUpper, 1)} mmHg) → Bất xứng V/Q, Shunt phải–trái hoặc rối loạn khuếch tán màng phế nang-mao mạch.`;
        } else if (po2 < po2Low) {
          aaText = ` A-a gradient BÌNH THƯỜNG (${round(aaGrad, 1)} ≤ ${round(aaUpper, 1)} mmHg) → Giảm oxy máu do GIẢM THÔNG KHÍ phế nang (hoặc giảm PiO₂).`;
        } else {
          aaText = ` A-a gradient bình thường (${round(aaGrad, 1)} mmHg).`;
        }
      } else {
        aaText = ` A-a gradient = ${round(aaGrad, 1)} mmHg (lưu ý A-a tăng sinh lý khi thở FiO₂ cao ${fio2Pct}%).`;
      }
    }

    // Oxygenation Index (OI) if MAP provided
    if (isNum(abg.mapVent) && po2 > 0) {
      const oi = (fio2Pct * abg.mapVent) / po2;
      calculatedMetrics.oxygenationIndex = round(oi, 1);
    }

    // CaO2 & DO2
    if (isNum(abg.hb) && (isNum(abg.o2Hb) || isNum(abg.sao2))) {
      const satPct = isNum(abg.o2Hb) ? abg.o2Hb : (abg.sao2 as number);
      const cao2 = 1.36 * abg.hb * (satPct / 100) + 0.003 * po2;
      calculatedMetrics.cao2 = round(cao2, 1);
      if (isNum(abg.cardiacOutput)) {
        calculatedMetrics.do2 = round(abg.cardiacOutput * cao2 * 10, 0);
      }
    }

    const pfNote =
      pfRatio <= 300
        ? ` | P/F = ${round(pfRatio, 0)} mmHg (ngưỡng tổn thương oxy hóa mức độ ${ardsStage} theo tiêu chuẩn Berlin nếu có thâm nhiễm phổi 2 bên & PEEP ≥ 5 cmH₂O).`
        : ` | P/F = ${round(pfRatio, 0)} mmHg (bình thường 400–500).`;

    steps.push({
      stepNumber: stepCounter++,
      domain: 'abg',
      title: 'Bước 4: Đánh giá Oxy hóa máu, A-a Gradient & Tỷ lệ PaO₂/FiO₂',
      formula: 'PAO₂ = 713×FiO₂ − PaCO₂/0.8 | A-a = PAO₂ − PaO₂ | P/F = PaO₂/FiO₂',
      calculatedValue: `P/F = ${round(pfRatio, 0)}${isNum(calculatedMetrics.aaGradient) ? ` | A-a = ${calculatedMetrics.aaGradient} mmHg` : ''}${isNum(calculatedMetrics.oxygenationIndex) ? ` | OI = ${calculatedMetrics.oxygenationIndex}` : ''}${isNum(calculatedMetrics.cao2) ? ` | CaO₂ = ${calculatedMetrics.cao2} mL/dL` : ''}`,
      referenceRange: `PaO₂ ≥ ${po2Low} mmHg | P/F > 400 | A-a ≤ ${calculatedMetrics.aaUpperLimit ?? 20} (khí phòng)`,
      interpretation: `${oxygenationStatus}${pfNote}${aaText}`,
      severity: oxySeverity,
    });
  }

  // Dyshemoglobins & SpO2/SaO2 vs %O2Hb Saturation Gap (Ch.6 & Ch.1)
  if (isNum(abg.coHb) || isNum(abg.metHb) || (isNum(abg.sao2) && isNum(abg.o2Hb))) {
    const co = abg.coHb ?? 0;
    const met = abg.metHb ?? 0;
    const gap = isNum(abg.sao2) && isNum(abg.o2Hb) ? abg.sao2 - abg.o2Hb : 0;
    if (isNum(abg.sao2) && isNum(abg.o2Hb)) {
      calculatedMetrics.spo2O2HbGap = round(gap, 1);
    }

    let dysText = '';
    let dysSev: SeverityLevel = 'normal';
    if (co >= 25) {
      dysSev = 'critical';
      dysText += `Ngộ độc CO NẶNG (COHb = ${co}% ≥ 25%) — nguy cơ tổn thương não, thiếu máu cơ tim, toan lactic! `;
    } else if (co >= 10) {
      dysSev = 'high';
      dysText += `Tăng COHb đáng kể (${co}% > 10%) — ngộ độc khí CO. `;
    } else if (co > 2) {
      dysSev = 'mild';
      dysText += `COHb tăng nhẹ (${co}% — gặp ở người hút thuốc lá 5–10% hoặc phơi nhiễm nhẹ). `;
    }

    if (met >= 20) {
      dysSev = 'critical';
      dysText += `Methemoglobin máu NGUY KỊCH (MetHb = ${met}% ≥ 20%) — nguy cơ sốc, co giật, tử vong (>50%)! `;
    } else if (met >= 10) {
      dysSev = dysSev === 'critical' ? 'critical' : 'high';
      dysText += `Methemoglobin máu cao (${met}% ≥ 10%) — tím tái không đáp ứng oxy, máu màu nâu socola. `;
    } else if (met > 2) {
      dysSev = dysSev === 'normal' ? 'mild' : dysSev;
      dysText += `MetHb tăng nhẹ (${met}%). `;
    }

    if (gap > 5) {
      dysText += `Khoảng trống bão hòa SpO₂ − %O₂Hb = ${round(gap, 1)}% (>5%): Pulse oximeter / SaO₂ tính toán che lấp thiếu oxy mô do COHb hoặc MetHb!`;
      if (dysSev === 'normal') dysSev = 'high';
    }

    if (dysText) {
      steps.push({
        stepNumber: stepCounter++,
        domain: 'abg',
        title: 'Bước 4b: CO-oximetry & Rối loạn Hemoglobin (COHb / MetHb)',
        calculatedValue: `COHb = ${abg.coHb ?? '—'}% | MetHb = ${abg.metHb ?? '—'}% | %O₂Hb = ${abg.o2Hb ?? '—'}%`,
        referenceRange: 'COHb < 2% | MetHb < 2% | %O₂Hb 92–96%',
        interpretation: dysText.trim(),
        severity: dysSev,
      });
    }
  }

  // Step 5: Lactate & Tissue Perfusion (Ch.1 & Ch.11)
  let lactateStatus: string | undefined;
  if (isNum(abg.lactate)) {
    const lac = abg.lactate;
    const upper = isArterial ? 1.8 : 2.2;
    let lacSev: SeverityLevel = 'normal';
    if (lac > 4.0) {
      lacSev = 'critical';
      lactateStatus = `Tăng Lactate NẶNG (${lac} mmol/L > 4.0) — Sốc / giảm tưới máu mô nặng hoặc toan lactic cấp cứu`;
    } else if (lac > 2.0) {
      lacSev = 'high';
      lactateStatus = `Tăng Lactate máu (${lac} mmol/L > 2.0) — Cảnh báo nhiễm khuẩn huyết / giảm oxy mô`;
    } else if (lac > upper) {
      lacSev = 'moderate';
      lactateStatus = `Lactate tăng nhẹ (${lac} mmol/L)`;
    } else {
      lactateStatus = `Lactate bình thường (${lac} mmol/L)`;
    }

    steps.push({
      stepNumber: stepCounter++,
      domain: 'abg',
      title: 'Bước 5: Đánh giá Lactate & Tưới máu mô',
      calculatedValue: `Lactate = ${lac} mmol/L`,
      referenceRange: isArterial ? 'Động mạch < 1.8 mmol/L' : 'Tĩnh mạch < 2.2 mmol/L',
      interpretation: lactateStatus,
      severity: lacSev,
    });
  }

  // --- GENERATE RISKS, WORKUP TESTS & MANAGEMENT ---
  if (isNum(ph) && ph < 7.15) {
    risks.push({
      id: 'abg-severe-acidemia',
      priority: 'critical',
      category: 'Khí máu / Huyết động',
      title: 'Nguy cơ tụt huyết áp kháng catecholamine & loạn nhịp tim do toan nặng (pH < 7.15)',
      detail: 'Toan máu nặng ức chế co bóp cơ tim, giãn mạch ngoại vi, giảm đáp ứng vận mạch, gây tăng kali máu dịch chuyển ra ngoại bào và hôn mê.',
      sourceRef: 'Khí máu cấp cứu - Chương 3',
    });
  }
  if (isNum(ph) && ph > 7.55) {
    risks.push({
      id: 'abg-severe-alkalemia',
      priority: 'critical',
      category: 'Khí máu / Thần kinh - Tim mạch',
      title: 'Nguy cơ co mạch não, co giật & loạn nhịp thất do kiềm máu nặng (pH > 7.55)',
      detail: 'Kiềm nặng làm giảm Ca²⁺ ion hóa (gây tetany), hạ K⁺ máu, dịch trái đường cong Hb-O₂ giảm nhả oxy mô và gây loạn nhịp.',
      sourceRef: 'Khí máu cấp cứu - Chương 3',
    });
  }

  if (primaryDisorder.includes('Toan hô hấp') || (isNum(pco2) && pco2 > 50 && isArterial)) {
    risks.push({
      id: 'abg-hypercapnia-risk',
      priority: pco2 && pco2 > 65 ? 'critical' : 'high',
      category: 'Hô hấp / Thần kinh',
      title: 'Nguy cơ ứ CO₂ tăng áp lực nội sọ & hôn mê (CO₂ narcosis)',
      detail: 'Tăng PaCO₂ cấp gây giãn mạch não, lơ mơ, rung vỗ cánh (asterixis), tăng kali và ngừng thở nếu cơ hô hấp kiệt sức.',
      sourceRef: 'Khí máu cấp cứu - Chương 3 & 6',
    });
    tests.push({
      id: 'test-resp-acidosis',
      priority: 'high',
      category: 'Hô hấp / Hình ảnh',
      title: 'X-quang ngực thẳng, đánh giá cơ học hô hấp & tầm soát nguyên nhân giảm thông khí',
      detail: 'Kiểm tra COPD đợt cấp, viêm phổi, tràn khí màng phổi, ngộ độc thuốc an thần/opioid, nhược cơ, hội chứng Guillain-Barré.',
    });
    management.push({
      id: 'tx-resp-acidosis',
      priority: pco2 && pco2 > 60 ? 'critical' : 'high',
      category: 'Hô hấp',
      title: 'Cải thiện thông khí phế nang (NIV/BiPAP hoặc đặt nội khí quản)',
      detail: ctx.copdOrAsthma
        ? 'Ở bệnh nhân COPD: kiểm soát oxy mục tiêu SpO₂ 88–92% (tránh oxy liều cao quá mức gây mất kích thích hô hấp & hiệu ứng Haldane), cân nhắc thở máy không xâm nhập (BiPAP) nếu pH < 7.35 và PaCO₂ > 45 mmHg.'
        : 'Đảm bảo đường thở, dùng thuốc giải độc đặc hiệu nếu nghi ngộ độc (Naloxone cho opioid, Flumazenil thận trọng cho BZD), chỉ định thông khí hỗ trợ nếu kiệt sức cơ hô hấp hoặc rối loạn ý thức.',
      sourceRef: 'Khí máu cấp cứu - Chương 3',
    });
  }

  if (
    calculatedMetrics.anionGapCorrected !== undefined
      ? calculatedMetrics.anionGapCorrected > 16
      : (calculatedMetrics.anionGap ?? 0) > 16
  ) {
    risks.push({
      id: 'abg-hagma-risk',
      priority: 'high',
      category: 'Chuyển hóa / Ngộ độc',
      title: 'Nguy cơ toan chuyển hóa tăng khoảng trống Anion tiến triển (GOLDMARK)',
      detail: 'Cần loại trừ nhanh các nguyên nhân đe dọa tính mạng: Toan ceton (DKA/rượu/đói), Toan lactic (sốc, thiếu máu mạc treo), Suy thận, Ngộ độc (Methanol, Ethylene glycol, Salicylate, Paracetamol/5-oxoproline).',
      sourceRef: 'Khí máu cấp cứu - Bảng 3.3',
    });
    tests.push({
      id: 'test-hagma',
      priority: 'high',
      category: 'Sinh hóa / Độc chất',
      title: 'Bộ xét nghiệm tìm nguyên nhân HAGMA (GOLDMARK)',
      detail: 'Glucose máu, Ketone máu/niệu (Beta-hydroxybutyrate), Lactate, Creatinine/Ure, Áp lực thẩm thấu máu đo được (tính Osmolal gap nếu nghi Methanol/Ethylene glycol), nồng độ Salicylate/Ethanol.',
    });
    if (ctx.diabetesOrDkaSuspected || (isNum(elec.glucose) && elec.glucose > 14)) {
      management.push({
        id: 'tx-dka',
        priority: 'critical',
        category: 'Nội tiết cấp cứu',
        title: 'Phác đồ xử trí Toan ceton đái tháo đường (DKA)',
        detail: 'Bù dịch NaCl 0.9% tích cực trước, kiểm tra K⁺ trước khi truyền Insulin tĩnh mạch liên tục (nếu K⁺ < 3.3 mmol/L phải bù K⁺ trước khi dùng Insulin). NaHCO₃ chỉ cân nhắc khi pH < 6.9–7.0.',
        sourceRef: 'Khí máu cấp cứu - Chương 3 & 9',
      });
    }
  } else if (primaryDisorder.includes('Toan chuyển hóa') && (!calculatedMetrics.anionGap || calculatedMetrics.anionGap <= 16)) {
    tests.push({
      id: 'test-nagma',
      priority: 'moderate',
      category: 'Thận - Tiêu hóa',
      title: 'Tính khoảng trống Anion niệu (UAG) & đánh giá mất HCO₃⁻ tiêu hóa / thận',
      detail: 'Đo Na⁺, K⁺, Cl⁻ niệu (UAG = Na⁺ + K⁺ − Cl⁻): UAG âm gợi ý mất HCO₃⁻ qua tiêu hóa (tiêu chảy, dò tụy/mật); UAG dương gợi ý toan hóa ống thận (RTA typ 1, 2, 4).',
      sourceRef: 'Khí máu cấp cứu - Chương 3',
    });
  }

  if (primaryDisorder.includes('Kiềm chuyển hóa') || mixedDisorders.some((m) => m.includes('Kiềm chuyển hóa'))) {
    tests.push({
      id: 'test-met-alk',
      priority: 'moderate',
      category: 'Điện giải niệu',
      title: 'Đo Clo niệu (Urine Cl⁻) phân biệt kiềm chuyển hóa đáp ứng Cl⁻',
      detail: 'Urine Cl⁻ < 20 mmol/L: đáp ứng Cl⁻ (nôn ói, hút sonde dạ dày, lợi tiểu cũ, giảm thể tích). Urine Cl⁻ > 20 mmol/L: kháng Cl⁻ (cường Aldosterone tiên phát, Cushing, dùng lợi tiểu hiện tại, hạ K⁺ nặng).',
    });
    management.push({
      id: 'tx-met-alk',
      priority: 'moderate',
      category: 'Bù dịch & Điện giải',
      title: 'Xử trí Kiềm chuyển hóa theo thể tích & Cl⁻',
      detail: 'Nếu đáp ứng Cl⁻ (mất dịch, nôn ói): truyền NaCl 0.9% + bù KCl đầy đủ để thận thải được HCO₃⁻. Ngưng hoặc giảm lợi tiểu quai/thiazide nếu có thể; cân nhắc Acetazolamide nếu quá tải dịch.',
    });
  }

  if (primaryDisorder.includes('Kiềm hô hấp')) {
    tests.push({
      id: 'test-resp-alk',
      priority: 'high',
      category: 'Hô hấp / Nhiễm khuẩn / Thuyên tắc',
      title: 'Tầm soát nguyên nhân tăng thông khí: Thuyên tắc phổi (PE), Sepsis sớm, thiếu oxy',
      detail: 'Đo D-dimer / CTPA nếu nghi thuyên tắc phổi (đặc biệt kèm giảm oxy hoặc A-a tăng); cấy máu/PCT tầm soát nhiễm khuẩn huyết giai đoạn sớm; rà soát đau, sốt, bệnh gan, ngộ độc Salicylate giai đoạn đầu.',
    });
  }

  if (isNum(abg.po2) && abg.po2 < 60 && isArterial) {
    risks.push({
      id: 'abg-hypoxemia-risk',
      priority: 'critical',
      category: 'Hô hấp / Hồi sức',
      title: `Nguy cơ thiếu oxy mô cấp & tổn thương đa cơ quan (PaO₂ = ${abg.po2} mmHg${ardsStage ? `, P/F mức ARDS ${ardsStage}` : ''})`,
      detail: 'Có thể dẫn đến loạn nhịp tim, thiếu máu cơ tim, tổn thương não thiếu oxy và toan lactic thứ phát.',
    });
    management.push({
      id: 'tx-hypoxemia',
      priority: 'critical',
      category: 'Oxy liệu pháp / Thông khí',
      title: 'Hỗ trợ oxy & thông khí khẩn cấp theo P/F',
      detail:
        ardsStage === 'Nặng'
          ? 'P/F ≤ 100 (ARDS nặng): Thở máy bảo vệ phổi (Vt 4–6 mL/kg PBW, Pplat ≤ 30 cmH₂O), tối ưu PEEP, cân nhắc nằm sấp (prone positioning ≥ 12–16h/ngày), thuốc giãn cơ sớm và hội chẩn ECMO nếu OI > 25 hoặc không đáp ứng.'
          : 'Mở thông đường thở, cung cấp oxy qua cannula/mask không thở lại/HFNC tùy mức đáp ứng (mục tiêu SpO₂ 92–96%, riêng COPD 88–92%). Chụp X-quang ngực, siêu âm phổi tại giường tìm nguyên nhân.',
      sourceRef: 'Khí máu cấp cứu - Chương 6',
    });
  }

  if (isNum(abg.coHb) && abg.coHb >= 10) {
    management.push({
      id: 'tx-co-poisoning',
      priority: 'critical',
      category: 'Chống độc',
      title: 'Thở Oxy 100% lưu lượng cao & cân nhắc Oxy cao áp (HBO)',
      detail: `COHb = ${abg.coHb}%: Thở ngay Oxy 100% qua mask không thở lại (rút ngắn t₁/₂ COHb từ ~4–5h xuống ~60–90 phút). Hội chẩn Oxy cao áp nếu COHb ≥ 25%, có thai (COHb ≥ 15%), ngất/rối loạn ý thức hoặc thiếu máu cơ tim.`,
      sourceRef: 'Khí máu cấp cứu - Chương 6',
    });
  }

  if (isNum(abg.metHb) && abg.metHb >= 15) {
    management.push({
      id: 'tx-met-hb',
      priority: 'critical',
      category: 'Chống độc',
      title: 'Truyền Methylene Blue cho Methemoglobin máu nặng',
      detail: `MetHb = ${abg.metHb}%: Methylene Blue 1–2 mg/kg truyền tĩnh mạch chậm trong 5 phút (chống chỉ định nếu thiếu G6PD — thay bằng Vitamin C liều cao hoặc thay máu). Ngưng ngay tác nhân gây oxy hóa (Dapsone, Nitrit, Benzocaine...).`,
      sourceRef: 'Khí máu cấp cứu - Chương 6',
    });
  }

  if (isNum(abg.lactate) && abg.lactate > 2.0) {
    risks.push({
      id: 'abg-lactate-risk',
      priority: abg.lactate > 4.0 ? 'critical' : 'high',
      category: 'Huyết động / Nhiễm khuẩn',
      title: `Nguy cơ sốc tuần hoàn / nhiễm khuẩn huyết (Lactate = ${abg.lactate} mmol/L)`,
      detail: 'Tăng lactate > 4 mmol/L là dấu hiệu giảm tưới máu mô nặng hoặc sốc nhiễm khuẩn, liên quan tỷ lệ tử vong cao nếu không giải quyết nguyên nhân gốc.',
    });
    tests.push({
      id: 'test-lactate',
      priority: 'high',
      category: 'Hồi sức / Nhiễm khuẩn',
      title: 'Theo dõi động học Lactate (độ thanh thải Lactate mỗi 2–4 giờ) & tầm soát Sepsis',
      detail: 'Cấy máu 2 vị trí trước kháng sinh, Procalcitonin, men gan, công thức máu, siêu âm tim/IVC đánh giá đáp ứng dịch và loại trừ thiếu máu mạc treo.',
    });
    management.push({
      id: 'tx-lactate',
      priority: abg.lactate > 4.0 ? 'critical' : 'high',
      category: 'Hồi sức huyết động',
      title: 'Hồi sức tưới máu mô & xử trí nguyên nhân tăng Lactate (Type A vs Type B)',
      detail: 'Nếu giảm tưới máu/sepsis: gói hồi sức dịch tinh thể cân bằng (ưu tiên Ringer Lactate / Plasmalyte khi thích hợp, tránh thừa NaCl 0.9% gây toan tăng Clo), vận mạch Noradrenaline giữ MAP ≥ 65 mmHg và kháng sinh phổ rộng trong giờ đầu. Lưu ý điều trị nguyên nhân gốc, KHÔNG lạm dụng NaHCO₃ cho toan lactic trừ trường hợp đặc biệt.',
      sourceRef: 'Khí máu cấp cứu - Chương 11',
    });
  }

  return {
    hasData: true,
    primaryDisorder,
    compensationStatus,
    mixedDisorders,
    oxygenationStatus,
    ardsStage,
    lactateStatus,
    calculatedMetrics,
    steps,
    preanalyticalWarnings,
    risks,
    tests,
    management,
  };
}
