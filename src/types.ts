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
  tonerLevel: number;
  submittedAt: string;
}
