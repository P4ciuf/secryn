import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Props for the {@link Modal} overlay component. */
interface ModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** Callback invoked when the backdrop is clicked or the modal should close. */
  onClose: () => void;
  /** Heading text rendered at the top of the modal. */
  title: string;
  /** Body content displayed inside the modal. */
  children: ReactNode;
  /** Optional Tailwind max-width class (defaults to `max-w-lg`). */
  maxWidth?: string;
}

/**
 * Animated modal overlay built with Framer Motion.
 * Clicking the backdrop calls {@link ModalProps.onClose},
 * while clicks inside the panel are stopped from bubbling.
 */
export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            // Prevent backdrop-close when clicking inside the modal panel
            onClick={(e) => e.stopPropagation()}
            className={`bg-slate-800 rounded-xl border border-slate-700 p-6 w-full ${maxWidth}`}
          >
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
