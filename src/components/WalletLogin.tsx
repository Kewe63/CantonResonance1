/**
 * Canton Ticket — Login Page
 * Supports Sandbox (party selector) and DevNet (Keycloak OIDC) modes.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useToast } from './Toast';
import { authService } from '../services/authService';
import { cantonService } from '../services/cantonService';
import { useI18n } from '../i18n';

interface Props {
  onConnect: (userId: string) => void;
  isConnecting: boolean;
  connectionError: string | null;
}

type LoginMode = 'sandbox' | 'devnet';

export const WalletLogin = ({ onConnect, isConnecting, connectionError }: Props) => {
  const [mode, setMode] = useState<LoginMode>('sandbox');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [connectingParty, setConnectingParty] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t, lang, setLang } = useI18n();

  const SANDBOX_PARTIES = [
    { name: 'Organizer', label: t('login.partyOrganizer'), icon: 'bxs-badge-check', color: 'text-accent' },
    { name: 'Alice', label: t('login.partyAlice'), icon: 'bxs-user', color: 'text-blue-400' },
    { name: 'Bob', label: t('login.partyBob'), icon: 'bxs-user', color: 'text-purple-400' },
    { name: 'Artist', label: t('login.partyArtist'), icon: 'bxs-music', color: 'text-pink-400' },
  ];

  // ─── Sandbox Login ─────────────────────────────────────────
  const handleSandboxLogin = async (partyName: string) => {
    setConnectingParty(partyName);
    try {
      const ok = await cantonService.connectSandbox(partyName);
      if (ok) {
        const s = cantonService.getState();
        showToast('⚡', t('login.connected'), `${t('login.connectedDetail')} ${partyName}`, 'success');
        // onConnect is handled by the state subscription in App.tsx
      } else {
        const s = cantonService.getState();
        showToast('❌', t('login.connError'), s.error || t('login.unknownError'), 'error');
      }
    } catch (err: any) {
      showToast('❌', t('login.error'), err.message || t('login.sandboxFailed'), 'error');
    }
    setConnectingParty(null);
  };

  // ─── Keycloak Login ────────────────────────────────────────
  const handleKeycloakLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAuthenticating || isConnecting) return;
    if (!email.trim() || !password.trim()) {
      showToast('⚠️', t('login.missingInfo'), t('login.missingInfoDetail'), 'error');
      return;
    }
    try {
      setIsAuthenticating(true);
      const partyId = await authService.loginWithKeycloak(email, password);
      onConnect(partyId);
    } catch (err: any) {
      console.error("Login failed:", err);
      showToast('❌', t('login.loginError'), err.message || t('login.loginFailed'), 'error');
    }
    setIsAuthenticating(false);
  };

  const isLoading = isConnecting || isAuthenticating || !!connectingParty;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] py-12 px-4 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Logo */}
        <div className="space-y-4">
          <div className="w-20 h-20 bg-accent rounded-[28px] mx-auto flex items-center justify-center text-black shadow-[0_0_50px_rgba(200,240,90,0.35)] rotate-6 hover:rotate-0 transition-transform duration-500">
            <i className="bx bx-network-chart text-5xl"></i>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter uppercase leading-tight">
              Canton<span className="text-accent">●</span>Ticket
            </h1>
            <p className="text-text-muted text-sm mt-2">
              {t('login.title')}
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-bg p-1 rounded-xl border border-border shadow-inner">
          <button
            onClick={() => setMode('sandbox')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'sandbox'
                ? 'bg-accent text-black shadow-lg'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <i className="bx bx-cube text-sm"></i> Sandbox
          </button>
          <button
            onClick={() => setMode('devnet')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'devnet'
                ? 'bg-accent text-black shadow-lg'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <i className="bx bx-cloud text-sm"></i> DevNet
          </button>
        </div>

        {/* Login Content */}
        <div className="glass-card p-8 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-accent/5" />

          {mode === 'sandbox' ? (
            /* ═══ SANDBOX MODE ═══ */
            <div className="relative space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{t('login.sandboxTitle')}</h3>
                <p className="text-[11px] text-text-muted">
                  {t('login.sandboxDesc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SANDBOX_PARTIES.map((party) => (
                  <button
                    key={party.name}
                    onClick={() => handleSandboxLogin(party.name)}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border transition-all text-left group
                      ${connectingParty === party.name
                        ? 'border-accent bg-accent/10 scale-95'
                        : 'border-border hover:border-accent/50 hover:bg-surface-hover'
                      }
                      disabled:opacity-40 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {connectingParty === party.name ? (
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <i className={`bx ${party.icon} ${party.color} text-xl group-hover:scale-110 transition-transform`}></i>
                      )}
                    </div>
                    <p className="text-sm font-bold">{party.label}</p>
                    <p className="text-[9px] font-mono text-text-muted mt-0.5">{party.name}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-text-muted bg-bg/50 p-3 rounded-lg border border-border">
                <i className="bx bx-info-circle text-accent shrink-0"></i>
                <span>{t('login.sandboxInfo')} <code className="text-accent">daml start</code> {t('login.sandboxInfoAction')}</span>
              </div>
            </div>
          ) : (
            /* ═══ DEVNET MODE ═══ */
            <form onSubmit={handleKeycloakLogin} className="relative space-y-4">
              <h3 className="text-xl font-bold text-white mb-6">{t('login.devnetTitle')}</h3>
              
              <div className="space-y-4">
                <div className="relative text-left">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-1 block">{t('login.email')}</label>
                  <div className="relative">
                    <i className="bx bx-envelope absolute left-4 top-1/2 -translate-y-1/2 text-accent text-lg"></i>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:border-accent outline-none tracking-tight"
                      placeholder="ornek@email.com"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="relative text-left">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-1 block">{t('login.password')}</label>
                  <div className="relative">
                    <i className="bx bx-lock-alt absolute left-4 top-1/2 -translate-y-1/2 text-accent text-lg"></i>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:border-accent outline-none tracking-tight"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-4 rounded-xl font-bold text-lg bg-accent text-black hover:bg-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(200,240,90,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>{t('login.connecting')}</span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-log-in-circle text-2xl"></i>
                    <span>{t('login.keycloakLogin')}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Error Display */}
        {connectionError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 border-red-500/30 text-left"
          >
            <div className="flex items-start gap-3">
              <i className="bx bx-error-circle text-red-500 text-xl shrink-0 mt-0.5"></i>
              <div>
                <p className="text-xs font-bold text-red-500">{t('login.connectionError')}</p>
                <p className="text-[11px] text-text-muted mt-1 leading-relaxed font-mono">
                  {connectionError}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-text-muted">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="font-mono uppercase tracking-widest">
            {mode === 'sandbox' ? 'Local Sandbox · JWT' : 'Noders NaaS · Keycloak OIDC'}
          </span>
          <span className="text-border">|</span>
          <button
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="font-bold text-accent hover:text-white transition-colors uppercase"
          >
            {lang === 'tr' ? 'EN' : 'TR'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
