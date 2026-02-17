'use client';

import { useState, useEffect, Component } from 'react';
import { signIn } from 'next-auth/react';

class WalletErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('WalletSection error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <button
          disabled
          style={{
            width: '100%',
            background: this.props.colors?.walletBg || '#F9F9F9',
            border: `1px solid ${this.props.colors?.walletBorder || '#E8E8E8'}`,
            padding: '12px 16px',
            fontSize: '14px',
            color: '#ef4444',
            borderRadius: '8px',
            cursor: 'not-allowed',
          }}
        >
          Wallet error: {this.state.error.message}
        </button>
      );
    }
    return this.props.children;
  }
}

function WalletInner({ callbackUrl, onError, colors }) {
  const [Web3Provider, setWeb3Provider] = useState(null);
  const [walletModules, setWalletModules] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [web3Mod, wagmiMod, rkMod] = await Promise.all([
          import('../web3-provider'),
          import('wagmi'),
          import('@rainbow-me/rainbowkit'),
        ]);
        if (!cancelled) {
          setWeb3Provider(() => web3Mod.default);
          setWalletModules({ wagmi: wagmiMod, rk: rkMod });
        }
      } catch (err) {
        console.error('Failed to load wallet modules:', err);
        if (!cancelled) setLoadError(err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loadError) {
    return (
      <button
        disabled
        style={{
          width: '100%',
          background: colors.walletBg,
          border: `1px solid ${colors.walletBorder}`,
          padding: '12px 16px',
          fontSize: '14px',
          color: '#ef4444',
          borderRadius: '8px',
          cursor: 'not-allowed',
        }}
      >
        Wallet unavailable: {loadError.message}
      </button>
    );
  }

  if (!Web3Provider || !walletModules) {
    return (
      <button
        disabled
        style={{
          width: '100%',
          background: colors.walletBg,
          border: `1px solid ${colors.walletBorder}`,
          padding: '12px 16px',
          fontSize: '15px',
          fontWeight: 500,
          color: '#555555',
          borderRadius: '8px',
          cursor: 'wait',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        Loading wallet...
      </button>
    );
  }

  return (
    <Web3Provider>
      <WalletButton
        callbackUrl={callbackUrl}
        onError={onError}
        colors={colors}
        wagmi={walletModules.wagmi}
        rk={walletModules.rk}
      />
    </Web3Provider>
  );
}

function WalletButton({ callbackUrl, onError, colors, wagmi, rk }) {
  const { address, isConnected } = wagmi.useAccount();
  const { signMessageAsync } = wagmi.useSignMessage();
  const { disconnect } = wagmi.useDisconnect();
  const { openConnectModal } = rk.useConnectModal();
  const [isLoading, setIsLoading] = useState(false);

  const handleWalletSignIn = async () => {
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }

    setIsLoading(true);
    try {
      const message = `Sign in to Linkyboss\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const result = await signIn('wallet', {
        address,
        message,
        signature,
        redirect: false,
      });

      if (result?.error) {
        onError('Wallet authentication failed. Please try again.');
        disconnect();
      } else {
        window.location.href = callbackUrl || '/';
      }
    } catch (err) {
      if (err?.code !== 4001) {
        onError('Wallet sign-in was cancelled or failed.');
      }
      disconnect();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleWalletSignIn}
      disabled={isLoading}
      style={{
        width: '100%',
        background: colors.walletBg,
        border: `1px solid ${colors.walletBorder}`,
        padding: '12px 16px',
        fontSize: '15px',
        fontWeight: 500,
        color: '#1C1C1C',
        borderRadius: '8px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
        <rect x="1" y="4" width="16" height="11" rx="2" stroke="#8B5CF6" strokeWidth="1.5" fill="none" />
        <path d="M1 7h16" stroke="#8B5CF6" strokeWidth="1.5" />
        <circle cx="13.5" cy="10.5" r="1.25" fill="#8B5CF6" />
        <path d="M4 4V3.5A2.5 2.5 0 016.5 1H12" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {isLoading
        ? 'Signing in...'
        : isConnected
          ? `Sign in with ${address.slice(0, 6)}...${address.slice(-4)}`
          : 'Connect Wallet'}
    </button>
  );
}

export default function WalletSection({ callbackUrl, onError, colors }) {
  return (
    <WalletErrorBoundary colors={colors}>
      <WalletInner callbackUrl={callbackUrl} onError={onError} colors={colors} />
    </WalletErrorBoundary>
  );
}
