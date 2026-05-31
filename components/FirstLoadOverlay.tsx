'use client';

import { Box } from '@mui/joy';
import { useEffect, useState } from 'react';

let _firstLoad = true;

export default function FirstLoadOverlay() {
  const [opacity, setOpacity] = useState(1);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (!_firstLoad) {
      setRemoved(true);
      return;
    }
    _firstLoad = false;

    const frame = requestAnimationFrame(() => {
      setOpacity(0);
    });

    const timer = setTimeout(() => {
      setRemoved(true);
    }, 350);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  if (removed) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        bgcolor: '#000',
        opacity,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: 'none',
      }}
    />
  );
}
