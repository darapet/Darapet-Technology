import React from 'react';
import CountUp from 'react-countup';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export default function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2.5 }: AnimatedCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <span ref={ref} className="font-display font-bold">
      {isInView ? (
        <CountUp
          start={0}
          end={end}
          duration={duration}
          separator=","
          prefix={prefix}
          suffix={suffix}
        />
      ) : (
        <span>{prefix}0{suffix}</span>
      )}
    </span>
  );
}