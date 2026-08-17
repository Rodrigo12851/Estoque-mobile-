// Screen Wake Lock & Keep-Awake Engine for Tablets, Phones, PDVs and Desktops
// Keeps the screen active and prevents sleep / auto-lock while using the application

type StatusCallback = (ativo: boolean) => void;

class ScreenWakeLockManager {
  private wakeLock: any = null;
  private isEnabled: boolean = true;
  private isActive: boolean = false;
  private listeners: Set<StatusCallback> = new Set();
  private fallbackVideo: HTMLVideoElement | null = null;
  private userInteractionBound: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Re-request lock on visibility change (e.g. user returns to app/tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isEnabled) {
        this.requestWakeLock();
      }
    });

    window.addEventListener('focus', () => {
      if (this.isEnabled) {
        this.requestWakeLock();
      }
    });

    // Acquire lock on first user interaction (required by mobile browser security policy)
    const handleFirstInteraction = () => {
      if (this.isEnabled && !this.isActive) {
        this.requestWakeLock();
      }
    };

    if (!this.userInteractionBound) {
      window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
      window.addEventListener('click', handleFirstInteraction, { passive: true });
      window.addEventListener('keydown', handleFirstInteraction, { passive: true });
      this.userInteractionBound = true;
    }

    // Initial attempt
    this.requestWakeLock();
  }

  public async requestWakeLock(): Promise<boolean> {
    if (!this.isEnabled) return false;

    // 1. Try Native Screen Wake Lock API
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (this.wakeLock && !this.wakeLock.released) {
          this.notifyStatus(true);
          return true;
        }

        const nav = navigator as any;
        this.wakeLock = await nav.wakeLock.request('screen');
        this.isActive = true;
        this.notifyStatus(true);

        this.wakeLock.addEventListener('release', () => {
          this.isActive = false;
          this.wakeLock = null;
          this.notifyStatus(false);
          // If still enabled and tab is active, try to reacquire
          if (this.isEnabled && document.visibilityState === 'visible') {
            setTimeout(() => this.requestWakeLock(), 1000);
          }
        });

        return true;
      } catch (err) {
        console.warn('Wake Lock nativo indisponível ou aguardando interação do usuário:', err);
      }
    }

    // 2. Fallback: Lightweight invisible looping video for older iOS / Android WebViews
    try {
      this.startFallbackKeepAwake();
      this.isActive = true;
      this.notifyStatus(true);
      return true;
    } catch (e) {
      console.warn('Fallback keep-awake indisponível:', e);
      this.isActive = false;
      this.notifyStatus(false);
      return false;
    }
  }

  private startFallbackKeepAwake() {
    if (this.fallbackVideo) return;
    try {
      // Create minimal 1-second muted loop video to prevent sleep on legacy mobile browsers
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.muted = true;
      video.loop = true;
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.001';
      video.style.pointerEvents = 'none';

      // Tiny 1x1 encoded WebM/MP4 data URI
      video.src =
        'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAADpmcmVlAAAF921kYXQAAAAAAAABAAAAAAA=';

      document.body.appendChild(video);
      video.play().catch(() => {});
      this.fallbackVideo = video;
    } catch (err) {
      console.warn('Erro ao criar fallback video:', err);
    }
  }

  public releaseWakeLock() {
    this.isEnabled = false;
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }
    if (this.fallbackVideo) {
      try {
        this.fallbackVideo.pause();
        this.fallbackVideo.remove();
      } catch (e) {}
      this.fallbackVideo = null;
    }
    this.isActive = false;
    this.notifyStatus(false);
  }

  public habilitar() {
    this.isEnabled = true;
    this.requestWakeLock();
  }

  public getStatus(): boolean {
    return this.isActive;
  }

  public subscribe(cb: StatusCallback): () => void {
    this.listeners.add(cb);
    cb(this.isActive);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyStatus(ativo: boolean) {
    this.isActive = ativo;
    this.listeners.forEach((cb) => {
      try {
        cb(ativo);
      } catch (e) {}
    });
  }
}

export const screenWakeLockManager = new ScreenWakeLockManager();
