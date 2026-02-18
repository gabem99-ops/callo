"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompletionScreenProps {
  businessName: string;
  onDashboard: () => void;
}

export function CompletionScreen({
  businessName,
  onDashboard,
}: CompletionScreenProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090B] overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Confetti particles */}
      <ConfettiAnimation />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-lg mx-auto px-4 text-center"
      >
        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.2,
          }}
          className="mx-auto mb-6"
        >
          <div className="relative w-20 h-20 mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl"
            />
            <motion.div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.5,
                  type: "spring",
                  stiffness: 400,
                }}
              >
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-white mb-2"
        >
          You&apos;re all set!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-zinc-400 mb-8 text-lg"
        >
          Your AI phone agent for {businessName} is ready to take calls.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          {/* Primary CTA */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Phone className="w-5 h-5 text-indigo-400" />
              <p className="text-base font-medium text-white">
                Test your AI agent
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              Get a phone number from your dashboard and call it to hear your AI
              in action!
            </p>
          </div>

          <Button
            size="lg"
            onClick={onDashboard}
            className="w-full h-14 text-base"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-sm text-zinc-500">
            Need to make changes? You can update everything from your dashboard.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ConfettiAnimation() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 6,
    color: [
      "bg-indigo-400",
      "bg-emerald-400",
      "bg-amber-400",
      "bg-pink-400",
      "bg-sky-400",
      "bg-violet-400",
    ][Math.floor(Math.random() * 6)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-sm ${p.color}`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: -10,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: typeof window !== "undefined" ? window.innerHeight + 20 : 900,
            opacity: [1, 1, 0],
            rotate: Math.random() > 0.5 ? 360 : -360,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}
