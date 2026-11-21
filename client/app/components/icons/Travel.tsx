import type { IconProps } from "./types";

export function Travel({
  size = 24,
  variant = "outline",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9.25"
        stroke="currentColor"
        strokeWidth={1.75}
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4.5"
        ry="9.25"
        stroke="currentColor"
        strokeWidth={1.75}
      />
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth={1.75}
      />
    </svg>
  );
}

