import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';

// A placeholder projectId is used at build time when the env var is not set.
// At runtime, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be configured.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'BUILD_PLACEHOLDER';

export const config = getDefaultConfig({
  appName: 'Linkyboss',
  projectId,
  chains: [mainnet],
  ssr: true,
});
