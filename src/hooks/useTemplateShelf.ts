import { useEffect, useState } from 'react';
import { loadTemplateShelf, type TemplateShelf } from '../generation/imageLoading';

/** Loads the four artworks once, and remembers which ones were missing. */
export function useTemplateShelf(): TemplateShelf | null {
  const [shelf, setShelf] = useState<TemplateShelf | null>(null);

  useEffect(() => {
    let alive = true;
    loadTemplateShelf().then((result) => {
      if (alive) setShelf(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  return shelf;
}
