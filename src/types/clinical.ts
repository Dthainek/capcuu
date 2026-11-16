export type SampleType = 'arterial' | 'venous';
export type RespiratoryDuration = 'acute' | 'chronic' | 'unknown';
export type Sex = 'male' | 'female';
export type SeverityLevel = 'critical' | 'high' | 'moderate' | 'mild' | 'normal';

export interface ClinicalContext {
  age?: number;
  sex: Sex;
  weightKg?: number;
  // Symptoms & history flags
  dyspnea: boolean;
  chestPain: boolean;
  syncopeOrPalpitation: boolean;
  vomitingOrNgSuction: boolean;
  diarrhea: boolean;
  diureticUse: boolean;
  diabetesOrDkaSuspected: boolean;
  copdOrAsthma: boolean;
  ckdOrRenalFailure: boolean;
  sepsisOrShock: boolean;
  neurologicalSymptoms: boolean; // confusion, seizures, coma
  suspectedPoisoning: boolean; // CO, methanol, ethylene glycol, salicylate
  // Preanalytical flags (Chapter 12)
  delayedTransportOver15Min: boolean;
  airBubblesInSyringe: boolean;
  excessLiquidHeparin: boolean;
  extremeLeukocytosisOrThrombocytosis: boolean;
  hemolyzedSample: boolean;
}

export interface AbgInput {
  sampleType: SampleType;
  respiratoryDuration: RespiratoryDuration;
  ph?: number;
  pco2?: number; // mmHg
  po2?: number; // mmHg
  hco3?: number; // mmol/L
  be?: number; // mmol/L
  sao2?: number; // % (or SpO2)
  o2Hb?: number; // % oxyhemoglobin
  coHb?: number; // % carboxyhemoglobin
  metHb?: number; // % methemoglobin
  lactate?: number; // mmol/L
  fio2?: number; // % (21 - 100)
  hb?: number; // g/dL
  mapVent?: number; // Mean airway pressure cmH2O (for Oxygenation Index)
  cardiacOutput?: number; // L/min (for DO2)
  temperature?: number; // °C
}

export interface ElectrolyteInput {
  na?: number; // mmol/L
  k?: number; // mmol/L
  cl?: number; // mmol/L
  caTotal?: number; // mmol/L
  caIonized?: number; // mmol/L
  mg?: number; // mmol/L
  po4?: number; // mmol/L
  albumin?: number; // g/L
  glucose?: number; // mmol/L
  urea?: number; // mmol/L
  measuredOsmolality?: number; // mOsm/kg
  urineOsmolality?: number; // mOsm/kg
  urineNa?: number; // mmol/L
  hyponatremiaOnset?: 'acute' | 'chronic' | 'unknown';
}

export type RhythmType =
  | 'sinus'
  | 'sinus_tachy'
  | 'sinus_brady'
  | 'afib'
  | 'aflutter'
  | 'svt_narrow'
  | 'vt_wide'
  | 'tdp'
  | 'vfib'
  | 'junctional'
  | 'paced'
  | 'other';

export type AvBlockType = 'none' | 'avb1' | 'avb2_mobitz1' | 'avb2_mobitz2' | 'avb2_2to1_high' | 'avb3';
export type BundleBlockType = 'none' | 'rbbb' | 'lbbb' | 'lafb' | 'lpfb' | 'bifascicular' | 'trifascicular' | 'nonspecific_ivcd';
export type StPatternType =
  | 'none'
  | 'stemi_anterior'
  | 'stemi_inferior'
  | 'stemi_lateral'
  | 'stemi_posterior'
  | 'stemi_rv'
  | 'nstemi_std'
  | 'de_winter'
  | 'wellens_a'
  | 'wellens_b'
  | 'left_main_avr'
  | 'pericarditis_diffuse'
  | 'early_repol';

export type ChannelopathyPattern =
  | 'none'
  | 'brugada_1'
  | 'brugada_2_3'
  | 'wpw'
  | 'arvd_epsilon'
  | 'osborn_j';

export type ElectrolyteEcgFeature =
  | 'peaked_t'
  | 'flat_absent_p'
  | 'wide_bizarre_qrs'
  | 'sine_wave'
  | 'u_wave_flat_t'
  | 's1q3t3'
  | 'low_voltage'
  | 'cerebral_t_inv'
  | 'lvh_voltage'
  | 'rvh_voltage'
  | 'pacemaker_malfunction';

export interface EcgInput {
  enabled: boolean;
  heartRate?: number; // bpm
  prInterval?: number; // ms (120-200 normal)
  qrsDuration?: number; // ms (60-100 normal)
  qtMeasured?: number; // ms
  qtcDirect?: number; // ms (optional direct input from machine)
  leadIPositive?: 'pos' | 'equiphasic' | 'neg';
  leadAVFPositive?: 'pos' | 'equiphasic' | 'neg';
  leadIIPositive?: 'pos' | 'equiphasic' | 'neg';
  rhythm: RhythmType;
  avBlock: AvBlockType;
  bundleBlock: BundleBlockType;
  stPattern: StPatternType;
  channelopathy: ChannelopathyPattern;
  specialFeatures: ElectrolyteEcgFeature[];
  // Optional Schwartz LQTS / Sgarbossa / BrugadaVT criteria flags
  sgarbossaConcordantSte: boolean;
  sgarbossaConcordantStdV13: boolean;
  sgarbossaExcessiveDiscordant: boolean;
  vtAvDissociationOrFusion: boolean;
  frequentPvcs: boolean;
}

export interface ClinicalCaseInput {
  id?: string;
  title?: string;
  context: ClinicalContext;
  abg: AbgInput;
  electrolytes: ElectrolyteInput;
  ecg: EcgInput;
}

export interface DiagnosticStep {
  stepNumber: number;
  domain: 'abg' | 'electrolyte' | 'ecg' | 'integration';
  title: string;
  formula?: string;
  calculatedValue?: string;
  referenceRange?: string;
  interpretation: string;
  severity: SeverityLevel;
}

export interface ClinicalActionItem {
  id: string;
  priority: SeverityLevel;
  category: string;
  title: string;
  detail: string;
  sourceRef?: string;
}

export interface AbgAnalysisResult {
  hasData: boolean;
  primaryDisorder: string;
  compensationStatus: string;
  mixedDisorders: string[];
  oxygenationStatus: string;
  ardsStage?: 'Nhẹ' | 'Trung bình' | 'Nặng' | null;
  lactateStatus?: string;
  calculatedMetrics: {
    hendersonExpectedH?: number;
    hendersonMeasuredH?: number;
    hendersonConsistent?: boolean;
    beCalculated?: number;
    expectedPco2?: number;
    expectedHco3?: number;
    anionGap?: number;
    anionGapCorrected?: number;
    deltaGap?: number;
    deltaRatio?: number;
    sid?: number;
    pao2Alveolar?: number;
    aaGradient?: number;
    aaUpperLimit?: number;
    pfRatio?: number;
    oxygenationIndex?: number;
    cao2?: number;
    do2?: number;
    spo2O2HbGap?: number;
  };
  steps: DiagnosticStep[];
  preanalyticalWarnings: string[];
  risks: ClinicalActionItem[];
  tests: ClinicalActionItem[];
  management: ClinicalActionItem[];
}

export interface ElectrolyteAnalysisResult {
  hasData: boolean;
  disorders: string[];
  calculatedMetrics: {
    correctedCa?: number;
    correctedNaByGlucose?: number;
    calculatedOsmolality?: number;
    osmolalGap?: number;
    kAdjustedNote?: string;
  };
  steps: DiagnosticStep[];
  risks: ClinicalActionItem[];
  tests: ClinicalActionItem[];
  management: ClinicalActionItem[];
}

export interface EcgAnalysisResult {
  hasData: boolean;
  summaryFindings: string[];
  axisLabel: string;
  calculatedMetrics: {
    qtcBazett?: number;
    qtcStatus?: string;
    rrSeconds?: number;
    sgarbossaScore?: number;
  };
  steps: DiagnosticStep[];
  risks: ClinicalActionItem[];
  tests: ClinicalActionItem[];
  management: ClinicalActionItem[];
}

export interface IntegratedAnalysisResult {
  overallSeverity: SeverityLevel;
  headlineConclusion: string;
  subConclusions: string[];
  crossSystemAlerts: ClinicalActionItem[];
  preanalyticalWarnings: string[];
  abg: AbgAnalysisResult;
  electrolytes: ElectrolyteAnalysisResult;
  ecg: EcgAnalysisResult;
  allRisks: ClinicalActionItem[];
  allTests: ClinicalActionItem[];
  allManagement: ClinicalActionItem[];
  allSteps: DiagnosticStep[];
}
