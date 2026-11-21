import type { IconProps } from "./types";

export function Sports({
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
        d="M7 4h10v5a5 5 0 01-10 0V4zM4 6H2a3 3 0 003 3h2M20 6h2a3 3 0 01-3 3h-2M12 14v4m-4 3h8"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

