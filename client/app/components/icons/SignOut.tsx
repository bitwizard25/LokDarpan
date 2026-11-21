import type { IconProps } from "./types";

export function SignOut({
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
      <path
        d="M15 4h3.25A1.75 1.75 0 0120 5.75v12.5A1.75 1.75 0 0118.25 20H15M10 8.5l3.5 3.5m0 0l-3.5 3.5m3.5-3.5H4"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

