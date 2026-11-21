import type { IconProps } from "./types";

export function Heart({
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
          d="M12 20.8l-1.45-1.32C5.4 14.85 2 11.8 2 8a5.5 5.5 0 019.5-3.8A5.5 5.5 0 0122 8c0 3.8-3.4 6.85-8.55 11.48L12 20.8z"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M12 20.8l-1.45-1.32C5.4 14.85 2 11.8 2 8a5.5 5.5 0 019.5-3.8A5.5 5.5 0 0122 8c0 3.8-3.4 6.85-8.55 11.48L12 20.8z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

