"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

type NavLink = { href: string; label: string };

export default function MobileNav({
  links,
  onSignOut,
}: {
  links: NavLink[];
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex flex-col gap-1.5 p-1"
        aria-label="Menu"
      >
        <span className="w-5 h-0.5 bg-ink block" />
        <span className="w-5 h-0.5 bg-ink block" />
        <span className="w-5 h-0.5 bg-ink block" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 bg-[#E6DCC5] rounded-lg shadow-lg py-2 min-w-[160px] z-20"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block font-mono text-sm text-ink/70 hover:text-ink px-4 py-2.5"
              >
                {link.label}
              </Link>
            ))}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-full text-left font-mono text-sm text-ink/70 hover:text-brick px-4 py-2.5"
              >
                Sign out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}