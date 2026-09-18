"use client";

import { toast } from "@/components/ui/toast-store";

export function useNiceError() {
  return (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return "Something went wrong. Please try again.";
  };
}

export function showErrorToast(error: unknown) {
  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("Something went wrong. Please try again.");
  }
}