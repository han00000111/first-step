"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type FormSubmitButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    pendingText?: string;
  }
>;

export function FormSubmitButton({
  children,
  className,
  pendingText = "处理中...",
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-[18px] px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      disabled={pending || props.disabled}
      {...props}
    >
      {pending ? pendingText : children}
    </button>
  );
}
