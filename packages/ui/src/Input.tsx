import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = "", ...rest }: InputProps) {
  return (
    <div className="pos-field">
      {label && (
        <label className="pos-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <input id={id} className={`pos-input ${className}`} {...rest} />
    </div>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, id, className = "", children, ...rest }: SelectProps) {
  return (
    <div className="pos-field">
      {label && (
        <label className="pos-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <select id={id} className={`pos-input ${className}`} {...rest}>
        {children}
      </select>
    </div>
  );
}
