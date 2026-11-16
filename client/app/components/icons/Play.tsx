import type { IconProps } from "./types";

export function Play({
  size = 24,
  variant = "filled",
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
        d="M7.75 5.5a1 1 0 011.5-.86l10 6a1 1 0 010 1.72l-10 6A1 1 0 017.75 17.5v-12z"
        fill="currentColor"
      />
    </svg>
  );
}

