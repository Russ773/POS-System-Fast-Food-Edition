import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`pos-button pos-button--${variant} pos-button--${size} ${className}`}
      {...rest}
    />
  );
}
