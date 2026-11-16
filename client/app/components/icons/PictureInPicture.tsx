import type { IconProps } from "./types";

export function PictureInPicture({
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
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth={1.75}
      />
      <rect
        x="12"
        y="11"
        width="7"
        height="6"
        rx="1.5"
        fill="currentColor"
      />
    </svg>
  );
}

