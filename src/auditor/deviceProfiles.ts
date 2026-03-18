export interface DeviceProfile {
  name: string;
  viewport: { width: number, height: number };
  userAgent: string;
  cpuSlowdown: number;
  network: 'fast' | '4g' | '3g';
  isMobile: boolean;
}

export const deviceProfiles: Record<string, DeviceProfile> = {
  desktop: {
    name: 'Desktop',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    cpuSlowdown: 1,
    network: 'fast',
    isMobile: false,
  },
  mobile: {
    name: 'Mobile (Mid-range)',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    cpuSlowdown: 2,
    network: '4g',
    isMobile: true,
  },
  lowEndMobile: {
    name: 'Low-end Mobile',
    viewport: { width: 360, height: 640 },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    cpuSlowdown: 4,
    network: '3g',
    isMobile: true,
  },
};
