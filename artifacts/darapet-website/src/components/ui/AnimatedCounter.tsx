import { useState, useEffect, useRef } from 'react';
import CountUp from 'react-countup';

export default function AnimatedCounter({ value, suffix = '' }: { value: number, suffix?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={counterRef} className="font-display font-bold text-4xl text-primary inline-flex">
      {isVisible ? <CountUp end={value} duration={2.5} separator="," /> : '0'}
      <span>{suffix}</span>
    </div>
  );
}
