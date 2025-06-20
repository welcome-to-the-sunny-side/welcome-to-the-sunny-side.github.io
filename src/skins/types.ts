export interface Skin {
  name: string;
  classes: Record<string, string>;
  cssVars: Record<string, string>;
  inlineStyles?: Record<string, Record<string, string>>;
}
