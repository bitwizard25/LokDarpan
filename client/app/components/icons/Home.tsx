import type { IconProps } from "./types";

export function Home({
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
      {variant === "outline" ? (
        <path
          d="M3.75 10.5L12 3.75l8.25 6.75v9a1.5 1.5 0 01-1.5 1.5h-4.5a.75.75 0 01-.75-.75v-5.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v5.25a.75.75 0 01-.75.75h-4.5a1.5 1.5 0 01-1.5-1.5v-9z"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.36 3.09a1 1 0 011.28 0l8.25 6.75A1 1 0 0121 10.5v9a2 2 0 01-2 2h-4.5a1 1 0 01-1-1v-5h-3v5a1 1 0 01-1 1H5a2 2 0 01-2-2v-9a1 1 0 01.11-.74L11.36 3.09z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

