import type { IconProps } from "./types";

export function Shorts({
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
          <rect
            x="5.5"
            y="3"
            width="13"
            height="18"
            rx="3.5"
            stroke="currentColor"
            strokeWidth={1.75}
          />
          <path
            d="M10.5 9.5l4.5 2.5-4.5 2.5V9.5z"
            fill="currentColor"
          />
        </>
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 3h6a4 4 0 014 4v10a4 4 0 01-4 4H9a4 4 0 01-4-4V7a4 4 0 014-4zm1.5 6.5a.75.75 0 00-1.12.65v4.7a.75.75 0 001.12.65l4.23-2.35a.75.75 0 000-1.3L10.5 9.5z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

