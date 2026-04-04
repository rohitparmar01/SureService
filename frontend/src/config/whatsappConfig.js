// Centralized WhatsApp configuration using Vite environment variables
// PHONE: international format without '+' or leading zeros, e.g. 919812345678
// MESSAGE: optional prefilled message

export const getWhatsAppNumber = () => {
  const num = import.meta.env.VITE_WHATSAPP_NUMBER || '';
  return num ? String(num).trim() : '';
};

export const getWhatsAppMessage = () => {
  const msg = import.meta.env.VITE_WHATSAPP_MESSAGE || '';
  return msg ? String(msg).trim() : '';
};

export const hasWhatsAppConfig = () => {
  return Boolean(getWhatsAppNumber());
};
