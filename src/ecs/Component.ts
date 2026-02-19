/** Base component interface — all components are pure data */
export interface Component {
  /** Unique type identifier for this component */
  readonly type: string;
}
