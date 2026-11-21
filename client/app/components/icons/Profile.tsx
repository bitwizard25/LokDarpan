import type { IconProps } from "./types";

export function Profile({
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
        <>
          <circle
            cx="12"
            cy="12"
            r="9.25"
            stroke="currentColor"
            strokeWidth={1.75}
          />
          <circle
            cx="12"
            cy="9"
            r="3"
            stroke="currentColor"
            strokeWidth={1.75}
          />
          <path
            d="M6.5 18.5a6.5 6.5 0 0111 0"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 4.5a3 3 0 100 6 3 3 0 000-6zm-5.46 11.59a7.5 7.5 0 0110.92 0A8.47 8.47 0 0112 20.5a8.47 8.47 0 01-5.46-2.41z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

