/** Drawing approximations only; never grading evidence or a global domain proof. */
export const GRAPH_PROFILE = 'display-graph-v1' as const;
export type GraphDiagnosticCode =
  | 'domain-gap'
  | 'domain-unverified'
  | 'unsupported-expression'
  | 'non-finite'
  | 'budget-limit'
  | 'dependent-term';
export interface GraphDiagnostic {
  code: GraphDiagnosticCode;
  seriesId: string;
  sample?: number;
  fromSample?: number;
  toSample?: number;
}
export interface GraphPoint {
  sample: number;
  x: number;
  y: number;
}
export interface GraphSeries {
  id: string;
  points: GraphPoint[];
  /** Indices into points; only source-domain-admitted contiguous samples. */
  segments: [number, number][];
}
export interface DisplayGraph {
  schemaVersion: 1;
  profile: typeof GRAPH_PROFILE;
  instanceId: string;
  elementId: string;
  sourceSha256: string;
  approximation: 'numeric';
  formulaDomain: 'unverified';
  state: 'complete' | 'partial' | 'unsupported';
  series: GraphSeries[];
  diagnostics: GraphDiagnostic[];
  evaluations: number;
}
export type GraphSamplingResult =
  | { ok: true; value: DisplayGraph }
  | {
      ok: false;
      error:
        | 'invalid-instance'
        | 'invalid-element'
        | 'invalid-profile'
        | 'unavailable';
    };
