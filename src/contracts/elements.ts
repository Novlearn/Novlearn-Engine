import type { ElementIdentity, InstantiatedMath } from './types.js';

/** Numeric render data are evaluated exactly; formulas are presentation only. */
export interface NumericField {
  latex: string;
}
export interface RenderNumber {
  numerator: number;
  denominator: number;
  latex: string;
}
export type RichFragment =
  | { type: 'text'; text: string; emphasis?: 'strong' | 'emphasis' }
  | { type: 'math'; latex: string; display: 'inline' | 'block' };
export type Endpoint<N> =
  | { kind: 'finite'; value: N }
  | { kind: 'negative-infinity' | 'positive-infinity' };
export interface PlotWindow<N> {
  xMin: N;
  xMax: N;
  yMin: N;
  yMax: N;
}
export type TableCell<N> =
  | { kind: 'text'; text: string }
  | { kind: 'number'; value: N }
  | { kind: 'math'; latex: string };

/** Prescribed data: no inferred roots, variation, geometry or graph sampling. */
export type DisplayElementData<N> =
  | { type: 'rich-text'; content: RichFragment[] }
  | { type: 'equation'; latex: string; label?: string }
  | { type: 'system'; relations: { id: string; latex: string }[] }
  | { type: 'hint'; questionId?: string; content: RichFragment[] }
  | { type: 'explanation'; questionId?: string; content: RichFragment[] }
  | {
      type: 'function-graph';
      variable: string;
      window: PlotWindow<N>;
      showGrid: boolean;
      functions: {
        id: string;
        latex: string;
        color: string;
        label?: string;
        showExpression: boolean;
      }[];
    }
  | {
      type: 'sequence-graph';
      window: PlotWindow<N>;
      showGrid: boolean;
      connectPoints: boolean;
      sequence:
        | { mode: 'points'; points: { index: number; value: N }[] }
        | {
            mode: 'explicit';
            indexVariable: string;
            start: number;
            count: number;
            latex: string;
          }
        | {
            mode: 'recurrent';
            indexVariable: string;
            termVariable: string;
            start: number;
            count: number;
            initial: N;
            recurrence: string;
          };
    }
  | {
      type: 'sign-table';
      variable: string;
      points: Endpoint<N>[];
      rows: {
        id: string;
        label: string;
        signs: ('+' | '-' | '0')[];
        pointSigns: ('0' | 'excluded' | null)[];
      }[];
    }
  | {
      type: 'variation-table';
      variable: string;
      points: {
        x: Endpoint<N>;
        value?: Endpoint<N>;
        leftLimit?: Endpoint<N>;
        rightLimit?: Endpoint<N>;
        excluded: boolean;
      }[];
      directions: ('increasing' | 'decreasing' | 'constant')[];
    }
  | { type: 'value-table'; columns: string[]; rows: TableCell<N>[][] }
  | {
      type: 'statistics-table';
      rows: { label: string; value: N; frequency: N }[];
    }
  | {
      type: 'probability-tree';
      exhaustive: boolean;
      nodes: {
        id: string;
        parentId?: string;
        label: string;
        probability?: N;
      }[];
    }
  | {
      type: 'vectors';
      dimension: 2 | 3;
      showCoordinates: boolean;
      vectors: { id: string; label: string; coordinates: N[]; color: string }[];
    }
  | {
      type: 'geometry';
      window: PlotWindow<N>;
      showGrid: boolean;
      points: { id: string; label: string; coordinates: [N, N] }[];
      objects: (
        | {
            id: string;
            kind: 'segment' | 'line';
            from: string;
            to: string;
            color: string;
          }
        | { id: string; kind: 'polygon'; vertices: string[]; color: string }
        | {
            id: string;
            kind: 'circle';
            center: string;
            radius: N;
            color: string;
          }
      )[];
    }
  | {
      type: 'complex-plane';
      window: PlotWindow<N>;
      showGrid: boolean;
      showCoordinates: boolean;
      points: {
        id: string;
        label: string;
        real: N;
        imaginary: N;
        color: string;
      }[];
    };

export type DisplayElement = ElementIdentity & DisplayElementData<NumericField>;
export type PublicDisplayElement = Pick<ElementIdentity, 'id' | 'sectionId'> & {
  formulaDomain: 'unverified';
} & Exclude<DisplayElementData<RenderNumber>, { type: 'hint' | 'explanation' }>;
export type PrivateDisplayElement = Pick<
  ElementIdentity,
  'id' | 'sectionId'
> & { formulaDomain: 'unverified' } & DisplayElementData<RenderNumber> & {
    /** Source/raw/substitution retained privately; paths refer to definition fields. */
    mathFields: {
      path: string;
      math: InstantiatedMath;
      admission: 'exact-rational' | 'display-only';
    }[];
  };
