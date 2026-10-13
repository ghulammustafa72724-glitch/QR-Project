import QRCode from 'qrcode';

export interface QRGenerateOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate a high-resolution QR Code Data URL (PNG)
 */
export async function generateQRCodeDataUrl(
  text: string,
  options: QRGenerateOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: options.margin ?? 2,
    width: options.width ?? 600,
    color: {
      dark: options.color?.dark ?? '#1c1917', // stone-900
      light: options.color?.light ?? '#ffffff',
    },
  };

  return QRCode.toDataURL(text, defaultOptions);
}

/**
 * Helper to build the full public table destination URL
 */
export function getPublicTableUrl(restaurantId: string, tableId: string): string {
  const origin = window.location.origin;
  return `${origin}/r/${restaurantId}/t/${tableId}`;
}

/**
 * Trigger download of the generated QR Code image with clean filename
 */
export function downloadQRCode(dataUrl: string, restaurantName: string, tableNumber: string) {
  const sanitizedRest = (restaurantName || 'restaurant')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const sanitizedTable = (tableNumber || 'table')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const filename = `${sanitizedRest}-${sanitizedTable}-qr.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
