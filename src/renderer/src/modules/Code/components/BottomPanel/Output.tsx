import { useRef, useEffect } from 'react';

export function Output() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs"></div>;
}

export default Output;
