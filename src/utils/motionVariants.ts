import { Variants } from 'motion/react';

// Smooth subtle page/tab transition
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Stagger container for lists or grids of cards
export const containerStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

// Item variant inside a staggered container
export const cardItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 26,
    },
  },
};

// Spring modal dialog entry & exit
export const modalSpringVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.94,
    y: 16,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Backdrop fade
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};
