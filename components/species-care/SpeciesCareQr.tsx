'use client';

import { Box, Typography } from '@mui/joy';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface SpeciesCareQrProps {
  value: string;
  size?: number;
  label?: string;
  plain?: boolean;
}

function getQrValue(value: string): string {
  if (typeof window === 'undefined') return value;
  if (value.startsWith('/')) return `${window.location.origin}${value}`;
  return value;
}

export function SpeciesCareQr({ value, size = 104, label, plain = false }: SpeciesCareQrProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(getQrValue(value), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size * 3,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  if (plain) {
    return (
      <Box sx={{ width: size, minWidth: size, lineHeight: 0 }}>
        {dataUrl ? (
          <Box
            component="img"
            src={dataUrl}
            alt={label ?? 'Species care QR code'}
            sx={{ width: '100%', height: 'auto', display: 'block' }}
          />
        ) : (
          <Box
            role="img"
            aria-label="QR code loading"
            sx={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: '6px',
              background:
                'linear-gradient(135deg, #f8fafc 25%, #e2e8f0 25%, #e2e8f0 50%, #f8fafc 50%, #f8fafc 75%, #e2e8f0 75%)',
              backgroundSize: '14px 14px',
            }}
          />
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: size,
        minWidth: size,
        border: '1px solid #d6dee8',
        borderRadius: '18px',
        bgcolor: '#fff',
        p: '7px',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8)',
      }}
    >
      {dataUrl ? (
        <Box
          component="img"
          src={dataUrl}
          alt={label ?? 'Species care QR code'}
          sx={{ width: '100%', height: 'auto', display: 'block' }}
        />
      ) : (
        <Box
          role="img"
          aria-label="QR code loading"
          sx={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '12px',
            background:
              'linear-gradient(135deg, #f8fafc 25%, #e2e8f0 25%, #e2e8f0 50%, #f8fafc 50%, #f8fafc 75%, #e2e8f0 75%)',
            backgroundSize: '14px 14px',
          }}
        />
      )}
      {label && (
        <Typography
          level="body-xs"
          sx={{ mt: 0.5, color: '#64748b', textAlign: 'center', fontWeight: 700 }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
}
