import type { ReactNode } from "react";

/** Props for the reusable page header component. */
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  backTo?: { label: string; to: string };
}

/** Props for the reusable modal/dialog component. */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}
