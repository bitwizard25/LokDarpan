import type React from "react";

export interface IconProps
  extends React.SVGAttributes<SVGSVGElement>,
    React.AriaAttributes {
  /** Pixel size (width & height). Default: 24 */
  size?: number;
  /** "outline" for resting, "filled" for active/selected */
  variant?: "outline" | "filled";
}

