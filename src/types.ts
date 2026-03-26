export interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
}

export interface PrinterInfo {
  id: string;
  tpscNumber: string;
  location: string;
  isGood: boolean;
  tonerLevel: number;
}

export interface AssessmentData {
  id: string;
  schoolName: string;
  classes: ClassInfo[];
  hasSpareToner: boolean;
  isPrinterGood: boolean;
  printerTpscNumber?: string;
  printerLocation?: string;
  printers?: PrinterInfo[];
  tonerLevel: number;
  submittedAt: string;
}
