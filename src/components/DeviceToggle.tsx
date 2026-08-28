import { useEffect, useState } from 'react';

type Device = 'desktop' | 'mobile';

export default function DeviceToggle() {
  const [device, setDevice] = useState<Device>('desktop');

  function applyDevice(next: Device) {
    setDevice(next);
    const card = document.getElementById('card');
    if (card) card.dataset.device = next;
  }

  useEffect(() => {
    const isNarrowViewport = window.matchMedia('(max-width: 640px)').matches;
    applyDevice(isNarrowViewport ? 'mobile' : 'desktop');
  }, []);

  return (
    <div className="device-toggle" role="group" aria-label="Preview device">
      <button
        type="button"
        className="device-btn"
        aria-pressed={device === 'mobile'}
        aria-label="Preview mobile layout"
        onClick={() => applyDevice('mobile')}
      >
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="0.75" width="6" height="10.5" rx="1.25" stroke="currentColor" strokeWidth="1" />
          <circle cx="6" cy="9.35" r="0.5" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="device-btn"
        aria-pressed={device === 'desktop'}
        aria-label="Preview desktop layout"
        onClick={() => applyDevice('desktop')}
      >
        <svg viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="0.75" width="10" height="6.5" rx="0.75" stroke="currentColor" strokeWidth="1" />
          <path
            d="M0.5 9.25H13.5L12 7.75H2L0.5 9.25Z"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
