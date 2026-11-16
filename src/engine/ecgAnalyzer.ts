import {
  ClinicalActionItem,
  ClinicalContext,
  DiagnosticStep,
  EcgAnalysisResult,
  EcgInput,
  SeverityLevel,
} from '../types/clinical';

function isNum(v: number | undefined | null): v is number {
  return typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
}

function round(v: number, digits = 0): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

export function analyzeEcg(ecg: EcgInput, ctx: ClinicalContext): EcgAnalysisResult {
  const hasAny =
    ecg.enabled &&
    (isNum(ecg.heartRate) ||
      isNum(ecg.prInterval) ||
      isNum(ecg.qrsDuration) ||
      isNum(ecg.qtMeasured) ||
      isNum(ecg.qtcDirect) ||
      ecg.rhythm !== 'sinus' ||
      ecg.avBlock !== 'none' ||
      ecg.bundleBlock !== 'none' ||
      ecg.stPattern !== 'none' ||
      ecg.channelopathy !== 'none' ||
      ecg.specialFeatures.length > 0);

  if (!hasAny) {
    return {
      hasData: false,
      summaryFindings: [],
      axisLabel: 'Chưa đánh giá',
      calculatedMetrics: {},
      steps: [],
      risks: [],
      tests: [],
      management: [],
    };
  }

  const summaryFindings: string[] = [];
  const calculatedMetrics: EcgAnalysisResult['calculatedMetrics'] = {};
  const steps: DiagnosticStep[] = [];
  const risks: ClinicalActionItem[] = [];
  const tests: ClinicalActionItem[] = [];
  const management: ClinicalActionItem[] = [];

  let stepNum = 1;

  // 1. Rate & Rhythm
  const rhythmLabels: Record<EcgInput['rhythm'], string> = {
    sinus: 'Nhịp xoang đều',
    sinus_tachy: 'Nhịp nhanh xoang',
    sinus_brady: 'Nhịp chậm xoang',
    afib: 'Rung nhĩ (mất sóng P, khoảng R-R không đều hoàn toàn)',
    aflutter: 'Cuồng nhĩ (sóng F răng cưa ~250–350 ck/phút)',
    svt_narrow: 'Nhịp nhanh trên thất (QRS hẹp, đều — AVNRT/AVRT/Nhịp nhanh nhĩ)',
    vt_wide: 'Nhịp nhanh thất (QRS rộng — VT)',
    tdp: 'Xoắn đỉnh (Torsades de Pointes — QRS xoắn quanh đường đẳng điện)',
    vfib: 'Rung thất (VF — mất phức bộ QRS có tổ chức)',
    junctional: 'Nhịp bộ nối',
    paced: 'Nhịp máy tạo nhịp (Pacemaker)',
    other: 'Rối loạn nhịp khác',
  };

  let rateSev: SeverityLevel = 'normal';
  const hr = ecg.heartRate;
  let rateText = rhythmLabels[ecg.rhythm];
  if (isNum(hr)) {
    rateText += ` — Tần số ${hr} lần/phút`;
    if (ecg.rhythm === 'vfib' || ecg.rhythm === 'tdp' || ecg.rhythm === 'vt_wide') {
      rateSev = 'critical';
    } else if (hr > 150 || hr < 40) {
      rateSev = 'critical';
    } else if (hr > 120 || hr < 50) {
      rateSev = 'high';
    } else if (hr > 100 || hr < 60) {
      rateSev = 'moderate';
    }
  } else if (ecg.rhythm === 'vfib' || ecg.rhythm === 'tdp' || ecg.rhythm === 'vt_wide') {
    rateSev = 'critical';
  } else if (ecg.rhythm !== 'sinus') {
    rateSev = 'moderate';
  }

  summaryFindings.push(rateText);
  steps.push({
    stepNumber: stepNum++,
    domain: 'ecg',
    title: 'Nhịp & Tần số tim',
    calculatedValue: `${rhythmLabels[ecg.rhythm]}${isNum(hr) ? ` | HR = ${hr} bpm` : ''}`,
    referenceRange: 'Nhịp xoang 60–100 lần/phút',
    interpretation:
      rateSev === 'critical'
        ? `CẢNH BÁO RỐI LOẠN NHỊP NGUY KỊCH: ${rateText}.`
        : rateText,
    severity: rateSev,
  });

  if (ecg.rhythm === 'vfib') {
    risks.push({
      id: 'ecg-vfib-risk',
      priority: 'critical',
      category: 'Ngừng tuần hoàn',
      title: 'NGỪNG TIM DO RUNG THẤT (VF)',
      detail: 'Mất cung lượng tim ngay lập tức, tử vong não sau 4–6 phút nếu không hồi sinh tim phổi và khử rung.',
    });
    management.push({
      id: 'tx-vfib',
      priority: 'critical',
      category: 'ACLS Cấp cứu',
      title: 'Khử rung tim KHÔNG ĐỒNG BỘ ngay lập tức + CPR chất lượng cao',
      detail: 'Sốc điện phá rung 120–200J (2 pha), ép tim 100–120 lần/phút, Adrenaline 1 mg IV mỗi 3–5 phút, Amiodarone 300 mg IV (liều 2: 150 mg) hoặc Lidocaine nếu kháng trị; tìm và xử trí 5H-5T (đặc biệt K⁺, toan, hạ oxy).',
      sourceRef: 'Sổ tay Điện tâm đồ - Chương 9',
    });
  } else if (ecg.rhythm === 'tdp') {
    risks.push({
      id: 'ecg-tdp-risk',
      priority: 'critical',
      category: 'Loạn nhịp thất nguy hiểm',
      title: 'Xoắn đỉnh (Torsades de Pointes) — nguy cơ chuyển thành Rung thất & đột tử',
      detail: 'Thường khởi phát trên nền QTc kéo dài, hạ K⁺, hạ Mg²⁺, nhịp chậm hoặc thuốc kéo dài QT.',
    });
    management.push({
      id: 'tx-tdp',
      priority: 'critical',
      category: 'Chống loạn nhịp đặc hiệu',
      title: 'MgSO₄ 2g IV ngay + Sốc điện nếu mất ổn định + Ngưng thuốc kéo dài QT',
      detail: 'Nếu mất mạch/huyết động tụt: sốc điện phá rung ngay. Nếu còn mạch: Magnesium sulfate 2g (1–2g) tiêm tĩnh mạch chậm trong 1–2 phút, lặp lại sau 5–15 phút nếu cần; giữ K⁺ máu 4.5–5.0 mmol/L; tăng nhịp bằng Isoproterenol hoặc tạo nhịp vượt tần số nếu nhịp chậm phụ thuộc pause. TRÁNH Amiodarone vì làm dài QTc thêm!',
      sourceRef: 'Sổ tay Điện tâm đồ - Chương 9 & 11',
    });
  } else if (ecg.rhythm === 'vt_wide') {
    const vtDefinite = ecg.vtAvDissociationOrFusion;
    summaryFindings.push(
      vtDefinite
        ? 'Xác định Nhịp nhanh thất (có phân ly nhĩ-thất / nhát hỗn hợp / nhát bắt)'
        : 'Nhịp nhanh QRS rộng — Áp dụng tiêu chuẩn Brugada / Vereckei / Basel (ưu tiên xử trí như VT nếu chưa loại trừ chắc chắn)'
    );
    management.push({
      id: 'tx-vt',
      priority: 'critical',
      category: 'ACLS Nhịp nhanh thất',
      title: 'Chuyển nhịp đồng bộ (nếu không ổn định) hoặc Amiodarone / Procainamide IV',
      detail: 'Huyết động không ổn định (tụt HA, đau ngực, phù phổi, lơ mơ): Sốc điện chuyển nhịp đồng bộ 100J (nếu đơn dạng). Ổn định: Amiodarone 150 mg IV trong 10 phút, duy trì 1 mg/phút; hoặc Procainamide/Lidocaine. Tìm thiếu máu cơ tim & rối loạn K⁺/Mg²⁺.',
      sourceRef: 'Sổ tay Điện tâm đồ - Chương 9',
    });
  } else if (ecg.rhythm === 'svt_narrow') {
    management.push({
      id: 'tx-svt',
      priority: 'high',
      category: 'Nhịp nhanh trên thất',
      title: 'Nghiệm pháp cường phế vị → Adenosine IV nhanh',
      detail: 'Huyết động không ổn định: sốc điện đồng bộ. Ổn định: nghiệm pháp Valsalva cải tiến; nếu không cắt cơn: Adenosine 6 mg IV bơm nhanh + đuổi 20 mL NS (liều 2: 12 mg). Chống chỉ định Adenosine nếu hen phế quản nặng hoặc nghi rung nhĩ trên WPW (dùng chẹn kênh Ca²⁺/beta không phù hợp cho WPW AFib).',
      sourceRef: 'Sổ tay Điện tâm đồ - Chương 8',
    });
  } else if (ecg.rhythm === 'afib' || ecg.rhythm === 'aflutter') {
    tests.push({
      id: 'test-afib',
      priority: 'moderate',
      category: 'Tim mạch / Nội tiết',
      title: 'Siêu âm tim, TSH/FT4, điện giải đồ & tính thang điểm CHA₂DS₂-VASc / HAS-BLED',
      detail: 'Đánh giá bệnh van tim, chức năng thất trái, cường giáp và nguy cơ huyết khối tắc mạch.',
    });
    management.push({
      id: 'tx-afib',
      priority: 'high',
      category: 'Kiểm soát tần số / nhịp',
      title: 'Kiểm soát tần số thất (Beta-blocker / Diltiazem / Digoxin) & kháng đông',
      detail: 'Nếu huyết động bất ổn: sốc điện chuyển nhịp đồng bộ. Ổn định: Metoprolol/Esmolol hoặc Diltiazem IV (tránh chẹn Ca²⁺ non-DHP nếu suy tim HFrEF; dùng Amiodarone/Digoxin nếu suy tim). Cân nhắc kháng đông nếu cơn > 48h hoặc CHA₂DS₂-VASc có chỉ định.',
    });
  }

  // 2. Electrical Axis (Lead I & aVF from Ch.1)
  let axisLabel = 'Chưa chọn hướng chuyển đạo DI / aVF';
  if (ecg.leadIPositive && ecg.leadAVFPositive) {
    if (ecg.leadIPositive === 'pos' && ecg.leadAVFPositive === 'pos') {
      axisLabel = 'Trục trung gian (0° đến +90°)';
    } else if (ecg.leadIPositive === 'pos' && ecg.leadAVFPositive === 'neg') {
      if (ecg.leadIIPositive === 'neg') {
        axisLabel = 'Trục lệch trái bệnh lý (−30° đến −90°)';
        summaryFindings.push(axisLabel);
      } else {
        axisLabel = 'Trục lệch trái nhẹ / sinh lý (0° đến −30°)';
      }
    } else if (ecg.leadIPositive === 'neg' && ecg.leadAVFPositive === 'pos') {
      axisLabel = 'Trục lệch phải (+90° đến +180°)';
      summaryFindings.push(axisLabel);
    } else if (ecg.leadIPositive === 'neg' && ecg.leadAVFPositive === 'neg') {
      axisLabel = 'Trục vô định / Cực Bắc (−90° đến ±180° — gợi ý VT hoặc đảo phủ tạng)';
      summaryFindings.push(axisLabel);
    } else {
      axisLabel = 'Trục cận biên (có chuyển đạo đẳng pha)';
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'ecg',
      title: 'Trục điện tim (DI, DII, aVF)',
      calculatedValue: axisLabel,
      referenceRange: 'Bình thường: −30° đến +90°',
      interpretation: axisLabel,
      severity: axisLabel.includes('vô định') ? 'high' : axisLabel.includes('lệch') ? 'mild' : 'normal',
    });
  }

  // 3. PR Interval & AV Block
  let prSev: SeverityLevel = 'normal';
  const avLabels: Record<EcgInput['avBlock'], string> = {
    none: 'Không block nhĩ – thất',
    avb1: 'Block nhĩ – thất độ I (PR > 200 ms cố định)',
    avb2_mobitz1: 'Block nhĩ – thất độ II Mobitz I / Wenckebach (PR dài dần rồi mất QRS)',
    avb2_mobitz2: 'Block nhĩ – thất độ II Mobitz II (PR cố định, rớt QRS đột ngột — tổn thương dưới bó His)',
    avb2_2to1_high: 'Block nhĩ – thất độ II kiểu 2:1 hoặc độ cao',
    avb3: 'Block nhĩ – thất độ III hoàn toàn (phân ly nhĩ – thất, tần số P > QRS)',
  };

  if (ecg.avBlock !== 'none' || isNum(ecg.prInterval)) {
    let prInterp = avLabels[ecg.avBlock];
    if (ecg.avBlock === 'avb3' || ecg.avBlock === 'avb2_mobitz2' || ecg.avBlock === 'avb2_2to1_high') {
      prSev = ecg.avBlock === 'avb3' ? 'critical' : 'high';
      summaryFindings.push(avLabels[ecg.avBlock]);
      risks.push({
        id: 'ecg-avb-high',
        priority: prSev,
        category: 'Rối loạn dẫn truyền',
        title: `Nguy cơ ngất Adams-Stokes, vô tâm thu & đột tử (${avLabels[ecg.avBlock]})`,
        detail: 'Block AV độ II Mobitz II và độ III (đặc biệt thoát thất QRS rộng) tiến triển rất nhanh sang ngừng tim.',
        sourceRef: 'Sổ tay Điện tâm đồ - Chương 4',
      });
      management.push({
        id: 'tx-avb-high',
        priority: prSev,
        category: 'Tạo nhịp cấp cứu',
        title: 'Chuẩn bị tạo nhịp qua da (TCP) / tĩnh mạch tạm thời & loại trừ nguyên nhân hồi phục',
        detail: 'Nếu nhịp chậm có triệu chứng: Atropine 0.5–1 mg IV (hiệu quả kém ở Mobitz II/AVB III dưới His), đặt miếng dán tạo nhịp qua da (Transcutaneous pacing) hoặc Dopamine/Adrenaline truyền tĩnh mạch làm cầu nối đến tạo nhịp qua tĩnh mạch. Tìm NMCT vùng dưới/trước, ngộ độc Beta-blocker/Digoxin, tăng K⁺ máu.',
        sourceRef: 'Sổ tay Điện tâm đồ - Chương 4',
      });
    } else if (isNum(ecg.prInterval)) {
      if (ecg.prInterval < 120) {
        prSev = 'moderate';
        prInterp = `Khoảng PR ngắn (${ecg.prInterval} ms < 120 ms) — Nghi tiền kích thích (WPW hoặc Lown-Ganong-Levine).`;
        summaryFindings.push('PR ngắn (< 120 ms)');
      } else if (ecg.prInterval > 200 && ecg.avBlock === 'none') {
        prSev = 'mild';
        prInterp = `Khoảng PR kéo dài (${ecg.prInterval} ms > 200 ms) — Block AV độ I.`;
        summaryFindings.push('Block AV độ I');
      } else if (ecg.avBlock === 'none') {
        prInterp = `Khoảng PR bình thường (${ecg.prInterval} ms).`;
      }
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'ecg',
      title: 'Khoảng PR & Dẫn truyền nhĩ – thất',
      calculatedValue: `${isNum(ecg.prInterval) ? `PR = ${ecg.prInterval} ms | ` : ''}${avLabels[ecg.avBlock]}`,
      referenceRange: 'PR 120–200 ms',
      interpretation: prInterp,
      severity: prSev,
    });
  }

  // 4. QRS Duration & Intraventricular Blocks
  const bbbLabels: Record<EcgInput['bundleBlock'], string> = {
    none: 'Không block nhánh / phân nhánh',
    rbbb: 'Block nhánh phải hoàn toàn (RBBB — rsR′ ở V1, S rộng V6/DI)',
    lbbb: 'Block nhánh trái hoàn toàn (LBBB — R dẹt/khấc V5-V6/DI, QS/rS V1)',
    lafb: 'Block phân nhánh trái trước (LAFB — trục trái sâu −45° đến −90°, qR DI/aVL, rS DII/III/aVF)',
    lpfb: 'Block phân nhánh trái sau (LPFB — trục phải ≥ +120°, rS DI/aVL, qR DII/III/aVF)',
    bifascicular: 'Block hai phân nhánh (RBBB + LAFB hoặc LPFB)',
    trifascicular: 'Block ba phân nhánh (Block 2 phân nhánh + Block AV độ I/II)',
    nonspecific_ivcd: 'Rối loạn dẫn truyền trong thất không đặc hiệu (QRS ≥ 120 ms)',
  };

  if (ecg.bundleBlock !== 'none' || isNum(ecg.qrsDuration)) {
    let qrsSev: SeverityLevel = 'normal';
    let qrsInterp = bbbLabels[ecg.bundleBlock];
    if (ecg.bundleBlock !== 'none') {
      qrsSev =
        ecg.bundleBlock === 'trifascicular' || ecg.bundleBlock === 'lbbb'
          ? 'high'
          : 'moderate';
      summaryFindings.push(bbbLabels[ecg.bundleBlock]);
    }
    if (isNum(ecg.qrsDuration)) {
      if (ecg.qrsDuration >= 120 && ecg.bundleBlock === 'none') {
        qrsSev = ecg.qrsDuration >= 160 ? 'high' : 'moderate';
        qrsInterp = `QRS giãn rộng (${ecg.qrsDuration} ms ≥ 120 ms): kiểm tra block nhánh, tăng K⁺ nặng, ngộ độc thuốc chẹn kênh Na⁺ (TCA) hoặc nhịp thất.`;
        summaryFindings.push(`QRS giãn rộng (${ecg.qrsDuration} ms)`);
      } else if (ecg.qrsDuration < 120 && ecg.bundleBlock === 'none') {
        qrsInterp = `QRS hẹp bình thường (${ecg.qrsDuration} ms).`;
      }
    }

    steps.push({
      stepNumber: stepNum++,
      domain: 'ecg',
      title: 'Phức bộ QRS & Dẫn truyền trong thất',
      calculatedValue: `${isNum(ecg.qrsDuration) ? `QRS = ${ecg.qrsDuration} ms | ` : ''}${bbbLabels[ecg.bundleBlock]}`,
      referenceRange: 'QRS 60–100 ms (bình thường < 120 ms)',
      interpretation: qrsInterp,
      severity: qrsSev,
    });
  }

  // 5. QTc Calculation (Bazett: QT / sqrt(RR))
  let qtcBazett: number | undefined = ecg.qtcDirect;
  let rrSeconds: number | undefined;
  if (!isNum(qtcBazett) && isNum(ecg.qtMeasured) && isNum(hr) && hr > 0) {
    rrSeconds = 60 / hr;
    qtcBazett = round(ecg.qtMeasured / Math.sqrt(rrSeconds), 0);
  } else if (isNum(hr) && hr > 0) {
    rrSeconds = 60 / hr;
  }

  if (isNum(qtcBazett)) {
    calculatedMetrics.qtcBazett = qtcBazett;
    if (rrSeconds) calculatedMetrics.rrSeconds = Math.round(rrSeconds * 100) / 100;
    const upperMale = 450;
    const upperFemale = 460;
    const limit = ctx.sex === 'female' ? upperFemale : upperMale;

    let qtSev: SeverityLevel = 'normal';
    let qtcStatus = `QTc bình thường (${qtcBazett} ms)`;

    if (qtcBazett >= 500) {
      qtSev = 'critical';
      qtcStatus = `QTc KÉO DÀI NGUY HIỂM (${qtcBazett} ms ≥ 500 ms) — Nguy cơ cao Xoắn đỉnh (TdP)!`;
      summaryFindings.push(`QTc dài nguy hiểm (${qtcBazett} ms)`);
      risks.push({
        id: 'ecg-long-qt',
        priority: 'critical',
        category: 'Tái cực thất / Loạn nhịp',
        title: `Nguy cơ khởi phát Xoắn đỉnh (Torsades de Pointes) do QTc = ${qtcBazett} ms`,
        detail: 'QTc ≥ 500 ms làm tăng đột biến nguy cơ loạn nhịp thất đa hình và đột tử.',
        sourceRef: 'Sổ tay Điện tâm đồ - Chương 11',
      });
      management.push({
        id: 'tx-long-qt',
        priority: 'critical',
        category: 'Phòng ngừa Xoắn đỉnh',
        title: 'Ngưng ngay thuốc kéo dài QT & điều chỉnh K⁺ (> 4.0–4.5), Mg²⁺ (> 1.0), Ca²⁺',
        detail: 'Rà soát thuốc: Amiodarone, Sotalol, Macrolide, Quinolone, Ondansetron, Haloperidol, Methadone. Bổ sung K⁺ và MgSO₄ tĩnh mạch nếu có ngoại tâm thu hoặc hạ điện giải.',
      });
    } else if (qtcBazett > limit) {
      qtSev = 'moderate';
      qtcStatus = `QTc kéo dài (${qtcBazett} ms > ${limit} ms)`;
      summaryFindings.push(`QTc kéo dài (${qtcBazett} ms)`);
    } else if (qtcBazett < 340) {
      qtSev = 'high';
      qtcStatus = `QTc ngắn (${qtcBazett} ms < 340 ms) — Gợi ý Tăng Canxi máu hoặc Hội chứng QT ngắn (SQTS)`;
      summaryFindings.push(`QTc ngắn (${qtcBazett} ms)`);
    }

    calculatedMetrics.qtcStatus = qtcStatus;
    steps.push({
      stepNumber: stepNum++,
      domain: 'ecg',
      title: 'Khoảng QT & QTc hiệu chỉnh (Công thức Bazett)',
      formula: 'QTc = QT / √RR (với RR = 60 / HR)',
      calculatedValue: `QTc = ${qtcBazett} ms${isNum(ecg.qtMeasured) ? ` (QT đo = ${ecg.qtMeasured} ms)` : ''}`,
      referenceRange: `Nam ≤ ${upperMale} ms | Nữ ≤ ${upperFemale} ms | Nguy hiểm ≥ 500 ms`,
      interpretation: qtcStatus,
      severity: qtSev,
    });
  }

  // 6. ST-T, ACS / STEMI & Sgarbossa
  const stLabels: Record<EcgInput['stPattern'], string> = {
    none: 'Không ghi nhận chênh ST-T đặc hiệu thiếu máu cấp',
    stemi_anterior: 'STEMI thành trước (V1–V4/V6) — Nghi tắc nhánh liên thất trước (LAD)',
    stemi_inferior: 'STEMI thành dưới (DII, DIII, aVF) — Nghi tắc RCA (~80%) hoặc LCx (~20%)',
    stemi_lateral: 'STEMI thành bên (DI, aVL, V5–V6) — Nghi tắc LCx hoặc nhánh chéo D1',
    stemi_posterior: 'STEMI thành sau thực (ST chênh xuống V1–V3, R cao V1–V2, ST chênh lên V7–V9)',
    stemi_rv: 'Nhồi máu thất phải đi kèm (ST chênh lên V4R/V3R)',
    nstemi_std: 'NSTEMI / Thiếu máu cơ tim (ST chênh xuống / T âm đối xứng theo vùng)',
    de_winter: 'Hình ảnh De Winter (J chênh xuống + ST dốc lên + T cao nhọn đối xứng V1–V6 + STE aVR) — Tương đương STEMI tắc đoạn gần LAD!',
    wellens_a: 'Hội chứng Wellens Type A (Sóng T hai pha V2–V3) — Hẹp khít đoạn gần LAD!',
    wellens_b: 'Hội chứng Wellens Type B (Sóng T âm sâu đối xứng V2–V3) — Hẹp khít đoạn gần LAD!',
    left_main_avr: 'ST chênh lên aVR/V1 + ST chênh xuống lan tỏa ≥ 6 chuyển đạo — Nghi tắc thân chung ĐMV trái (Left Main) / 3 nhánh',
    pericarditis_diffuse: 'Viêm màng ngoài tim cấp (ST chênh lên lõm lan tỏa nhiều vùng + PR chênh xuống)',
    early_repol: 'Tái cực sớm lành tính (điểm J nâng cao có khấc/slurring, ST lõm V2–V5, tỷ lệ ST/T < 0.25)',
  };

  if (ecg.stPattern !== 'none' || ecg.sgarbossaConcordantSte || ecg.sgarbossaConcordantStdV13 || ecg.sgarbossaExcessiveDiscordant) {
    const sgarbossa =
      (ecg.sgarbossaConcordantSte ? 5 : 0) +
      (ecg.sgarbossaConcordantStdV13 ? 3 : 0) +
      (ecg.sgarbossaExcessiveDiscordant ? 2 : 0);
    if (sgarbossa > 0) calculatedMetrics.sgarbossaScore = sgarbossa;

    const isAcuteStemieq = [
      'stemi_anterior',
      'stemi_inferior',
      'stemi_lateral',
      'stemi_posterior',
      'stemi_rv',
      'de_winter',
      'left_main_avr',
    ].includes(ecg.stPattern) || sgarbossa >= 3;

    const isHighIschemia = isAcuteStemieq || ['nstemi_std', 'wellens_a', 'wellens_b'].includes(ecg.stPattern);
    const stSev: SeverityLevel = isAcuteStemieq ? 'critical' : isHighIschemia ? 'high' : 'moderate';

    if (ecg.stPattern !== 'none') summaryFindings.push(stLabels[ecg.stPattern]);
    if (sgarbossa >= 3) summaryFindings.push(`Tiêu chuẩn Sgarbossa dương tính (${sgarbossa} điểm ≥ 3 trên nền LBBB/Paced)`);

    steps.push({
      stepNumber: stepNum++,
      domain: 'ecg',
      title: 'Đoạn ST – Sóng T & Vùng tưới máu mạch vành',
      calculatedValue: `${stLabels[ecg.stPattern]}${sgarbossa > 0 ? ` | Sgarbossa = ${sgarbossa} điểm` : ''}`,
      interpretation:
        sgarbossa >= 3
          ? `Tiêu chuẩn Sgarbossa ≥ 3 điểm (${sgarbossa} điểm) xác nhận Nhồi máu cơ tim cấp trên nền LBBB/Máy tạo nhịp.`
          : stLabels[ecg.stPattern],
      severity: stSev,
    });

    if (isAcuteStemieq) {
      risks.push({
        id: 'ecg-stemi-risk',
        priority: 'critical',
        category: 'Mạch vành cấp cứu',
        title: 'Nguy cơ hoại tử cơ tim lan rộng, sốc tim, vỡ tim & rung thất cấp',
        detail:
          ecg.stPattern === 'stemi_inferior' || ecg.stPattern === 'stemi_rv'
            ? 'NMCT thành dưới/thất phải dễ kèm nhịp chậm, block nhĩ-thất và tụt huyết áp nặng nếu dùng Nitrate (làm giảm tiền tải thất phải)!'
            : 'Tắc đoạn gần LAD / Left Main đe dọa vùng cơ tim rộng lớn, cần tái thông mạch vành tối khẩn.',
        sourceRef: 'Sổ tay Điện tâm đồ - Chương 3',
      });
      tests.push({
        id: 'test-stemi',
        priority: 'critical',
        category: 'Tim mạch can thiệp',
        title: 'Troponin I/T động học, đo thêm chuyển đạo V3R-V4R (nếu thành dưới) & V7–V9 (nếu thành sau)',
        detail: 'Không chờ kết quả Troponin nếu đã đủ tiêu chuẩn STEMI/De Winter để kích hoạt Cath-lab!',
      });
      management.push({
        id: 'tx-stemi',
        priority: 'critical',
        category: 'Tái tưới máu khẩn',
        title: 'Kích hoạt báo động đỏ STEMI — Can thiệp mạch vành qua da thì đầu (PPCI ≤ 90–120 phút)',
        detail:
          'Aspirin 160–325 mg nhai + Kháng P2Y12 (Ticagrelor 180 mg hoặc Prasugrel 60 mg hoặc Clopidogrel 300–600 mg) + Heparin không phân đoạn/Enoxaparin. Nếu STEMI thành dưới: ĐO V4R trước và CHỐNG CHỈ ĐỊNH Nitrate/Morphine nếu nghi NMCT thất phải tụt huyết áp (ưu tiên bù dịch NS).',
        sourceRef: 'Sổ tay Điện tâm đồ - Chương 3',
      });
    } else if (ecg.stPattern === 'wellens_a' || ecg.stPattern === 'wellens_b') {
      risks.push({
        id: 'ecg-wellens',
        priority: 'critical',
        category: 'Hội chứng vành cấp nguy cơ rất cao',
        title: 'Hội chứng Wellens: Nguy cơ nhồi máu thành trước rộng & đột tử trong vài ngày/tuần tới',
        detail: 'CHỐNG CHỈ ĐỊNH nghiệm pháp gắng sức vì có thể gây NMCT cấp hoặc rung thất tức thì! Cần chụp mạch vành sớm.',
      });
      management.push({
        id: 'tx-wellens',
        priority: 'critical',
        category: 'Tim mạch can thiệp',
        title: 'Nhập CCU theo dõi liên tục, kháng kết tập tiểu cầu kép + kháng đông & chụp mạch vành sớm',
        detail: 'Tuyệt đối KHÔNG làm nghiệm pháp gắng sức.',
      });
    }
  }

  // 7. Channelopathies & Special Features
  if (ecg.channelopathy !== 'none') {
    const chanLabels: Record<EcgInput['channelopathy'], string> = {
      none: '',
      brugada_1: 'Hội chứng Brugada Type 1 (ST vòm ≥ 2 mm + T âm ở V1–V2)',
      brugada_2_3: 'Brugada Type 2/3 (hình yên ngựa ở V1–V2 — cần làm ĐTĐ lên cao 1–2 khoang liên sườn hoặc test thuốc nếu nghi)',
      wpw: 'Hội chứng Wolff-Parkinson-White (PR < 120 ms + sóng Delta + QRS giãn rộng)',
      arvd_epsilon: 'Loạn sản thất phải sinh loạn nhịp (ARVD — sóng Epsilon ở V1–V3)',
      osborn_j: 'Sóng J Osborn (gặp trong Hạ thân nhiệt nặng < 32–34°C hoặc Tăng Canxi máu nặng)',
    };
    summaryFindings.push(chanLabels[ecg.channelopathy]);
    const chanSev: SeverityLevel = ecg.channelopathy === 'brugada_1' ? 'critical' : 'high';
    steps.push({
      stepNumber: stepNum++,
      domain: 'ecg',
      title: 'Bệnh kênh ion / Tiền kích thích / Sóng đặc hiệu',
      calculatedValue: chanLabels[ecg.channelopathy],
      interpretation: chanLabels[ecg.channelopathy],
      severity: chanSev,
    });

    if (ecg.channelopathy === 'brugada_1') {
      risks.push({
        id: 'ecg-brugada',
        priority: 'critical',
        category: 'Bệnh kênh ion',
        title: 'Nguy cơ rung thất & đột tử về đêm (Brugada Type 1)',
        detail: 'Sốt cao, thuốc chẹn kênh Na⁺, ngộ độc rượu và thuốc chống trầm cảm 3 vòng có thể kích phát cơn bão rung thất.',
      });
      management.push({
        id: 'tx-brugada',
        priority: 'critical',
        category: 'Phòng ngừa đột tử',
        title: 'Hạ sốt TÍCH CỰC ngay nếu có sốt, tránh thuốc nhóm BrugadaDrugs.org & hội chẩn đặt ICD',
        detail: 'Nếu có cơn bão điện học: truyền Isoproterenol hoặc Quinidine đường uống theo chuyên khoa Điện sinh lý.',
        sourceRef: 'Sổ tay Điện tâm đồ - Chương 12',
      });
    }
  }

  // 8. Electrolyte / Systemic Special ECG features
  if (ecg.specialFeatures.length > 0) {
    const featMap: Record<string, string> = {
      peaked_t: 'Sóng T cao nhọn đối xứng đáy hẹp (dấu hiệu sớm Tăng K⁺ máu / thiếu máu dưới nội tâm mạc tối cấp)',
      flat_absent_p: 'Sóng P dẹt hoặc mất sóng P (Tăng K⁺ máu mức vừa–nặng)',
      wide_bizarre_qrs: 'Phức bộ QRS giãn rộng biến dạng (Tăng K⁺ nặng 7–9 mmol/L hoặc ngộ độc chẹn Na⁺)',
      sine_wave: 'Dạng sóng hình Sin — Sine wave (Tăng K⁺ máu tối cấp > 9 mmol/L, sắp ngừng tim!)',
      u_wave_flat_t: 'Sóng T dẹt/đảo + Sóng U nổi bật + ST chênh xuống (đặc trưng Hạ K⁺ máu)',
      s1q3t3: 'Dấu hiệu S1Q3T3 (S sâu DI, Q bệnh lý & T âm DIII) — Gợi ý Thuyên tắc phổi cấp (PE) / Tâm phế cấp',
      low_voltage: 'Điện thế thấp ngoại biên/trước ngực (tràn dịch màng ngoài tim/ép tim, COPD, suy giáp, béo phì)',
      cerebral_t_inv: 'Sóng T đảo sâu lan tỏa ("Cerebral T-waves") + QTc dài — Gợi ý xuất huyết dưới nhện / tăng áp lực nội sọ',
      lvh_voltage: 'Tiêu chuẩn điện thế Phì đại thất trái (Sokolow-Lyon / Cornell)',
      rvh_voltage: 'Tiêu chuẩn Phì đại thất phải (R/S V1 > 1, trục phải)',
      pacemaker_malfunction: 'Nghi rối loạn chức năng máy tạo nhịp (mất dẫn / mất nhận cảm)',
    };

    const listText = ecg.specialFeatures.map((f) => featMap[f]).join('; ');
    summaryFindings.push(...ecg.specialFeatures.map((f) => featMap[f].split(' (')[0]));

    const hasSineOrWide = ecg.specialFeatures.some((f) => f === 'sine_wave' || f === 'wide_bizarre_qrs');
    const hasPe = ecg.specialFeatures.includes('s1q3t3');

    steps.push({
      stepNumber: stepNum++,
      domain: 'ecg',
      title: 'Dấu hiệu ĐTĐ liên quan Điện giải & Bệnh lý hệ thống (Chương 15)',
      calculatedValue: ecg.specialFeatures.length + ' dấu hiệu được ghi nhận',
      interpretation: listText,
      severity: hasSineOrWide ? 'critical' : hasPe ? 'high' : 'moderate',
    });

    if (hasPe) {
      risks.push({
        id: 'ecg-pe-risk',
        priority: 'critical',
        category: 'Hô hấp - Tim mạch cấp cứu',
        title: 'Nghi ngờ Thuyên tắc phổi cấp (PE) gây tăng gánh thất phải cấp',
        detail: 'S1Q3T3 kèm nhịp nhanh xoang, RBBB mới hoặc T âm V1–V4 rất gợi ý thuyên tắc phổi có nguy cơ tụt huyết áp/ngừng tim.',
        sourceRef: 'Sổ tay Điện tâm đồ - Chương 15',
      });
      tests.push({
        id: 'test-pe',
        priority: 'critical',
        category: 'Chẩn đoán hình ảnh',
        title: 'Đánh giá thang điểm Wells/Geneva, D-dimer, Siêu âm tim tại giường & chụp CTPA động mạch phổi',
        detail: 'Tìm dấu hiệu giãn thất phải, dấu McConnell, huyết khối tĩnh mạch sâu chi dưới.',
      });
    }
  }

  return {
    hasData: true,
    summaryFindings,
    axisLabel,
    calculatedMetrics,
    steps,
    risks,
    tests,
    management,
  };
}
