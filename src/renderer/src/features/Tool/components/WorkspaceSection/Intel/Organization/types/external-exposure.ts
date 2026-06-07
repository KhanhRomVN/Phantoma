export interface PdfMetadata {
  fileName: string;
  author?: string;
  creator?: string;
  created?: string;
  modified?: string;
  title?: string;
}

export interface ExternalExposure {
  dataBreach?: {
    name: string;
    date: string;
    recordsLeaked: number;
    exposedData: string[];
  }[];
  credentialLeak?: {
    email: string;
    source: string;
    date: string;
  }[];
  publicDocuments?: string[];
  pdfMetadata?: PdfMetadata[];
  pressReleases?: string[];
  conferenceTalks?: string[];
}