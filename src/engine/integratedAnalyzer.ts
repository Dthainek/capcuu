import {
  ClinicalActionItem,
  ClinicalCaseInput,
  DiagnosticStep,
  IntegratedAnalysisResult,
  SeverityLevel,
} from '../types/clinical';
import { analyzeAbg } from './abgAnalyzer';
import { analyzeEcg } from './ecgAnalyzer';
import { analyzeElectrolytes } from './electrolyteAnalyzer';

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  critical: 5,
  high: 4,
  moderate: 3,
  mild: 2,
  normal: 1,
};

function maxSeverity(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function runIntegratedAnalysis(input: ClinicalCaseInput): IntegratedAnalysisResult {
  const abg = analyzeAbg(input.abg, input.electrolytes, input.context);
  const electrolytes = analyzeElectrolytes(input.electrolytes, input.abg, input.context);
  const ecg = analyzeEcg(input.ecg, input.context);

  const crossSystemAlerts: ClinicalActionItem[] = [];
  const subConclusions: string[] = [];

  // Cross-System Correlations (bridging all 3 textbooks!)
  const k = input.electrolytes.k;
  const ph = input.abg.ph;
  const po2 = input.abg.po2;
  const pco2 = input.abg.pco2;
  const mg = input.electrolytes.mg;
  const caIon = input.electrolytes.caIonized;
  const caTot = electrolytes.calculatedMetrics.correctedCa ?? input.electrolytes.caTotal;

  // 1. Hyperkalemia + ECG changes (Emergency bridge!)
  const ecgHasHyperKFeatures =
    input.ecg.enabled &&
    input.ecg.specialFeatures.some((f) =>
      ['peaked_t', 'flat_absent_p', 'wide_bizarre_qrs', 'sine_wave'].includes(f)
    );
  if ((typeof k === 'number' && k >= 5.5) && ecgHasHyperKFeatures) {
    crossSystemAlerts.push({
      id: 'cross-hyperk-ecg',
      priority: 'critical',
      category: 'Liên chuyên khoa (Điện giải × ĐTĐ)',
      title: `CẤP CỨU TỐI KHẨN: Tăng Kali máu (${k} mmol/L) ĐÃ CÓ BIẾN ĐỔI ĐIỆN TÂM ĐỒ`,
      detail:
        'Sự xuất hiện T cao nhọn / mất P / giãn QRS / sóng hình sin chứng tỏ màng tế bào cơ tim đang mất ổn định nghiêm trọng. Cần tiêm TĨNH MẠCH Calci gluconate 10% NGAY TRONG VÀI PHÚT ĐẦU để bảo vệ tim trước khi đợi các biện pháp hạ K⁺!',
      sourceRef: 'Khí máu & Điện giải Ch.9 + ĐTĐ Ch.15',
    });
  }

  // 2. Hypokalemia / Hypomagnesemia + Long QTc / U wave / TdP
  const ecgHasHypoKFeatures =
    input.ecg.enabled &&
    (input.ecg.specialFeatures.includes('u_wave_flat_t') ||
      input.ecg.rhythm === 'tdp' ||
      (ecg.calculatedMetrics.qtcBazett ?? 0) >= 480);
  if (
    ((typeof k === 'number' && k < 3.5) || (typeof mg === 'number' && mg < 0.7)) &&
    ecgHasHypoKFeatures
  ) {
    crossSystemAlerts.push({
      id: 'cross-hypok-tdp',
      priority: 'critical',
      category: 'Liên chuyên khoa (Điện giải × ĐTĐ)',
      title: 'Hạ Kali/Magie máu phối hợp kéo dài QTc / sóng U / Xoắn đỉnh',
      detail:
        'Nguy cơ ngừng tim do Xoắn đỉnh rất cao. Bắt buộc bù KCl kết hợp MgSO₄ tĩnh mạch (ngay cả khi Mg²⁺ chỉ hơi thấp) để ổn định tái cực cơ tim.',
      sourceRef: 'Khí máu & Điện giải Ch.9-10 + ĐTĐ Ch.11 & 15',
    });
  }

  // 3. Respiratory alkalosis + Hypoxemia + ECG S1Q3T3 / Sinus Tachycardia -> Acute PE
  if (
    abg.hasData &&
    (abg.primaryDisorder.includes('Kiềm hô hấp') ||
      (typeof po2 === 'number' && po2 < 75) ||
      (abg.calculatedMetrics.aaGradient ?? 0) > 25) &&
    input.ecg.enabled &&
    (input.ecg.specialFeatures.includes('s1q3t3') ||
      input.ecg.rhythm === 'sinus_tachy' ||
      input.ecg.bundleBlock === 'rbbb')
  ) {
    crossSystemAlerts.push({
      id: 'cross-pe-triad',
      priority: 'critical',
      category: 'Liên chuyên khoa (Khí máu × ĐTĐ)',
      title: 'TAM CHỨNG GỢI Ý THUYÊN TẮC PHỔI CẤP (PE): Kiềm hô hấp / Giảm PaO₂ + Tăng A-a + S1Q3T3 / Nhịp nhanh xoang / RBBB',
      detail:
        'Kết hợp lâm sàng khó thở/đau ngực: cần làm ngay Siêu âm tim tại giường đánh giá thất phải, D-dimer / chụp CTPA động mạch phổi và chuẩn bị kháng đông.',
      sourceRef: 'Khí máu Ch.6 + ĐTĐ Ch.15',
    });
  }

  // 4. Severe Acidemia + Hyperkalemia (DKA or Renal Failure)
  if (typeof ph === 'number' && ph < 7.25 && typeof k === 'number' && k >= 5.5) {
    crossSystemAlerts.push({
      id: 'cross-acid-hyperk',
      priority: 'high',
      category: 'Liên chuyên khoa (Khí máu × Điện giải)',
      title: 'Toan máu phối hợp Tăng Kali máu (chuyển dịch K⁺ nội–ngoại bào)',
      detail:
        'Toan chuyển hóa/hô hấp góp phần đẩy K⁺ ra máu. Lưu ý trong DKA: tổng K⁺ cơ thể thực chất THIẾU hụt dù K⁺ máu đang cao — khi truyền Insulin và hết toan, K⁺ máu sẽ tụt rất nhanh, phải theo dõi K⁺ mỗi 2 giờ!',
      sourceRef: 'Khí máu & Điện giải Ch.9',
    });
  }

  // 5. Alkalemia + Hypocalcemia / Hypokalemia -> Tetany & Arrhythmia
  if (
    typeof ph === 'number' &&
    ph > 7.48 &&
    ((typeof caIon === 'number' && caIon < 1.16) ||
      (typeof caTot === 'number' && caTot < 2.1) ||
      (typeof k === 'number' && k < 3.5))
  ) {
    crossSystemAlerts.push({
      id: 'cross-alk-ca-k',
      priority: 'high',
      category: 'Liên chuyên khoa (Khí máu × Điện giải)',
      title: 'Kiềm máu làm nặng thêm Hạ Canxi ion hóa & Hạ Kali máu',
      detail:
        'Tăng pH làm tăng gắn Ca²⁺ với Albumin (dễ bùng phát cơn co giật/tetany) và đẩy K⁺ vào tế bào. Điều chỉnh nguyên nhân gây kiềm máu đồng thời bù K⁺/Ca²⁺.',
    });
  }

  // 6. COPD Chronic Hypercapnia + Metabolic Alkalosis (post-hypercapnic or diuretics)
  if (
    input.context.copdOrAsthma &&
    typeof pco2 === 'number' &&
    pco2 > 50 &&
    abg.mixedDisorders.some((m) => m.includes('Kiềm chuyển hóa'))
  ) {
    crossSystemAlerts.push({
      id: 'cross-copd-metalk',
      priority: 'high',
      category: 'Liên chuyên khoa (Hô hấp × Điện giải)',
      title: 'Ứ CO₂ trên bệnh nhân COPD kèm Kiềm chuyển hóa (lợi tiểu / thiếu Cl⁻–K⁺)',
      detail:
        'Kiềm chuyển hóa ức chế trung tâm hô hấp gây giảm thông khí thêm và khó cai máy thở. Cần bù đủ KCl để thận thải bớt HCO₃⁻ thừa.',
    });
  }

  // Build Headline & Subconclusions
  if (abg.hasData) {
    subConclusions.push(
      `Khí máu: ${abg.primaryDisorder}${abg.mixedDisorders.length > 0 ? ` (${abg.mixedDisorders.join('; ')})` : ''}. ${abg.oxygenationStatus}${abg.ardsStage ? ` [P/F mức ARDS ${abg.ardsStage}]` : ''}.`
    );
  }
  if (electrolytes.hasData) {
    subConclusions.push(
      electrolytes.disorders.length > 0
        ? `Điện giải: ${electrolytes.disorders.join('; ')}.`
        : 'Điện giải: Các chỉ số đã nhập trong giới hạn bình thường.'
    );
  }
  if (ecg.hasData) {
    subConclusions.push(
      ecg.summaryFindings.length > 0
        ? `Điện tâm đồ: ${ecg.summaryFindings.join('; ')}.`
        : 'Điện tâm đồ: Nhịp xoang, chưa ghi nhận bất thường cấp cứu.'
    );
  }

  const allRisks = [...crossSystemAlerts, ...abg.risks, ...electrolytes.risks, ...ecg.risks].sort(
    (a, b) => SEVERITY_RANK[b.priority] - SEVERITY_RANK[a.priority]
  );
  const allTests = [...abg.tests, ...electrolytes.tests, ...ecg.tests].sort(
    (a, b) => SEVERITY_RANK[b.priority] - SEVERITY_RANK[a.priority]
  );
  const allManagement = [...abg.management, ...electrolytes.management, ...ecg.management].sort(
    (a, b) => SEVERITY_RANK[b.priority] - SEVERITY_RANK[a.priority]
  );

  const allSteps: DiagnosticStep[] = [
    ...abg.steps,
    ...electrolytes.steps,
    ...ecg.steps,
  ].map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

  let overallSeverity: SeverityLevel = 'normal';
  for (const r of allRisks) overallSeverity = maxSeverity(overallSeverity, r.priority);
  for (const s of allSteps) overallSeverity = maxSeverity(overallSeverity, s.severity);

  let headlineConclusion = 'Các thông số hiện tại trong giới hạn bình thường';
  if (overallSeverity === 'critical') {
    headlineConclusion = 'TÌNH TRẠNG CẤP CỨU NGUY KỊCH — Cần đánh giá & xử trí hồi sức ngay';
  } else if (overallSeverity === 'high') {
    headlineConclusion = 'RỐI LOẠN MỨC ĐỘ NẶNG — Cần can thiệp y khoa khẩn & theo dõi sát';
  } else if (overallSeverity === 'moderate') {
    headlineConclusion = 'Rối loạn mức độ trung bình — Cần điều chỉnh & tầm soát nguyên nhân';
  } else if (overallSeverity === 'mild') {
    headlineConclusion = 'Biến đổi nhẹ / ranh giới — Cần đối chiếu lâm sàng';
  }

  return {
    overallSeverity,
    headlineConclusion,
    subConclusions,
    crossSystemAlerts,
    preanalyticalWarnings: abg.preanalyticalWarnings,
    abg,
    electrolytes,
    ecg,
    allRisks,
    allTests,
    allManagement,
    allSteps,
  };
}
