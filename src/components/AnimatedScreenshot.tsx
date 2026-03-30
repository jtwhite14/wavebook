"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function AnimatedScreenshot() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative z-20 max-w-7xl mx-auto px-4 md:px-6 -mb-8 transition-all duration-1000 delay-500 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-16"
      }`}
    >
      <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-black/[0.08]">
        <Image
          src="/screenshots/app-hero.png"
          alt="Wavebook dashboard showing surf alerts, forecast scores, and session history"
          width={2880}
          height={1640}
          className="w-full h-auto"
          priority
        />
      </div>
    </div>
  );
}
