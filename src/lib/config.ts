/**
 * Application configuration constants
 */

// WhatsApp contact information
export const WHATSAPP_PHONE = '971585905881'; // Format: no +, no spaces
export const WHATSAPP_BASE_URL = 'https://wa.me';

/**
 * Build a WhatsApp message URL
 * @param message - The message text to pre-fill
 * @returns Full WhatsApp URL
 */
export function buildWhatsAppUrl(message: string): string {
	return `${WHATSAPP_BASE_URL}/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
