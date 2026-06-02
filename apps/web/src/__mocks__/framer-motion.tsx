/**
 * Minimal framer-motion mock for tests.
 * Proxies motion components to plain React elements via forwardRef,
 * and renders AnimatePresence as a Fragment to avoid animation side effects.
 */
import React from "react";

const MotionProxy = new Proxy(
  {},
  {
    get: (_target: unknown, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const element = React.createElement(prop, { ...props, ref });
        return element;
      });
    },
  },
);

const AnimatePresence = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const motion = MotionProxy;
export { AnimatePresence };
