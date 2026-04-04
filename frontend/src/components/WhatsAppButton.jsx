import React, { useState } from 'react';
import { getWhatsAppNumber, getWhatsAppMessage } from '../config/whatsappConfig';

// Lightweight, accessible WhatsApp floating button
const WhatsAppButton = () => {
  const [showInfo, setShowInfo] = useState(false);
  const phone = getWhatsAppNumber();
  const message = getWhatsAppMessage();
  const enabled = Boolean(phone);

  // Build click-to-chat URL per WhatsApp format
  const base = `https://wa.me/${encodeURIComponent(phone)}`;
  const url = message ? `${base}?text=${encodeURIComponent(message)}` : base;

  const openChat = () => {
    if (!enabled) {
      setShowInfo(true);
      return;
    }
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      // Fail gracefully
      console.error('Unable to open WhatsApp chat', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openChat();
    }
  };

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-40"
        aria-hidden={false}
      >
        <button
          type="button"
          aria-label={enabled ? 'Chat on WhatsApp' : 'WhatsApp not configured'}
          title={enabled ? 'Chat on WhatsApp' : 'WhatsApp not configured - set VITE_WHATSAPP_NUMBER'}
          onClick={openChat}
          onKeyDown={(e) => { if (enabled) handleKeyDown(e); }}
          aria-disabled={!enabled}
          className={`w-14 h-14 rounded-full transform transition-transform shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center ${enabled ? 'bg-[#25D366] hover:scale-105 focus:ring-[#128C7E]' : 'bg-[#25D366] hover:scale-105 focus:ring-[#128C7E]'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`w-7 h-7 text-white`} fill="currentColor" aria-hidden="true">
          <path d="M20.52 3.48A11.93 11.93 0 0 0 12 .5C6.21.5 1.46 4.82 0 10.2a12.1 12.1 0 0 0 2.6 9.12L.5 23.5l4.36-1.15A11.93 11.93 0 0 0 12 23.5c5.79 0 10.54-4.32 12-9.7a11.93 11.93 0 0 0-3.48-10.32zM12 21.5c-2.02 0-3.93-.55-5.6-1.58l-.4-.25-2.59.69.71-2.52-.26-.41A9.5 9.5 0 0 1 2.5 10.2C2.5 6.04 6.47 2.5 12 2.5c2.5 0 4.86.84 6.67 2.37a9.47 9.47 0 0 1-6.15 16.63z"/>
          <path d="M17.34 14.08c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.36.23-.66.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.12-.61.12-.12.28-.3.42-.45.14-.15.18-.25.3-.42.12-.18.06-.33-.03-.48-.09-.15-.68-1.64-.93-2.26-.24-.59-.49-.51-.68-.52-.18-.01-.4-.01-.62-.01-.2 0-.52.07-.79.33-.27.26-1.04 1.01-1.04 2.47 0 1.46 1.06 2.88 1.2 3.08.14.2 2.08 3.2 5.05 4.49 2.98 1.3 2.98.87 3.52.81.54-.06 1.78-.72 2.03-1.41.25-.69.25-1.29.18-1.41-.07-.12-.28-.2-.58-.36z"/>
        </svg>
      </button>
    </div>

      {/* Info Modal when WhatsApp number not configured */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowInfo(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-2">WhatsApp not configured</h3>
            <p className="text-sm text-gray-700 mb-4">To enable direct WhatsApp chat, set the phone number in your frontend environment variables.</p>
            <pre className="bg-gray-100 p-3 rounded text-xs text-gray-700">VITE_WHATSAPP_NUMBER=&lt;countrycode+number without +&gt; e.g. 919812345678</pre>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { navigator.clipboard?.writeText('VITE_WHATSAPP_NUMBER=919812345678'); }} className="px-3 py-2 bg-gray-100 rounded">Copy example</button>
              <button onClick={() => setShowInfo(false)} className="px-3 py-2 bg-blue-600 text-white rounded">Close</button>
            </div>
          </div>
        </div>
      )}
      </>
  );
};

export default WhatsAppButton;
