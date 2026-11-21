import type { IconProps } from "./types";

export function Search({
  size = 20,
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
          d="M10.75 18a7.25 7.25 0 100-14.5 7.25 7.25 0 000 14.5zM16 16l4.5 4.5"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.75 2a8.75 8.75 0 105.54 15.53l4.35 4.36a.75.75 0 101.06-1.06l-4.36-4.35A8.75 8.75 0 0010.75 2zm-7.25 8.75a7.25 7.25 0 1114.5 0 7.25 7.25 0 01-14.5 0z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

