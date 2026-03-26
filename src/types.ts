export interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
}

export interface AssessmentData {
  id: string;
  schoolName: string;
  classes: ClassInfo[];
  hasSpareToner: boolean;
  isPrinterGood: boolean;
  printerTpscNumber?: string;
  printerQuadro?: string;
  tonerLevel: number;
  submittedAt: string;
}
