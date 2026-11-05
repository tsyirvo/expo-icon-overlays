// Defines overlay options and the drawing surfaces shared by the modules.
interface OverlayStyle {
  background?: string;
  color?: string;
  text: string;
}

export type IconOverlay = OverlayStyle &
  (
    | { type: "banner"; position?: "top" | "bottom" }
    | { type: "ribbon"; position?: "top-left" | "top-right" }
  );

export interface IconOverlayOptions {
  enabled?: boolean;
  overlays: IconOverlay[];
}

export type Overlay = OverlayStyle & { background: string } & (
    | { type: "banner"; position: "top" | "bottom" }
    | { type: "ribbon"; position: "top-left" | "top-right" }
  );

export interface ParsedOptions {
  enabled: boolean;
  overlays: Overlay[];
}

export type Surface =
  | "square"
  | "square-tinted"
  | "round"
  | "adaptive-foreground"
  | "monochrome";
