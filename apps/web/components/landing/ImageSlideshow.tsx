'use client';

import { useState, useEffect } from 'react';

const IMAGES = [
  '/landing/ela-de-pure.jpg',
  '/landing/annie-spratt.jpg',
  '/landing/laura-peruchi.jpg',
  '/landing/max-harlynking.jpg',
  '/landing/nrd.jpg',
];

const SLIDE_DURATION_MS = 4000;

export function ImageSlideshow() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % IMAGES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded overflow-hidden border border-cartistry-border shadow-lg">
      {IMAGES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === idx ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
            }`}
            aria-label={`Ver imagen ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
