import { writable, derived } from 'svelte/store';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import en from './locales/en.json';

export const locales = { de, fr, it, en } as const;
export type Locale = keyof typeof locales;
export const availableLocales: { code: Locale; label: string }[] = [
	{ code: 'de', label: 'DE' },
	{ code: 'fr', label: 'FR' },
	{ code: 'it', label: 'IT' },
	{ code: 'en', label: 'EN' }
];

function detectLocale(): Locale {
	if (typeof window === 'undefined') return 'de';
	const stored = localStorage.getItem('cumond-lang');
	if (stored && stored in locales) return stored as Locale;
	const browserLang = navigator.language.split('-')[0];
	if (browserLang in locales) return browserLang as Locale;
	return 'de';
}

export const locale = writable<Locale>('de');

export function initLocale() {
	locale.set(detectLocale());
}

export function setLocale(l: Locale) {
	locale.set(l);
	if (typeof window !== 'undefined') {
		localStorage.setItem('cumond-lang', l);
		document.documentElement.lang = l;
	}
}

type Messages = typeof de;

// Deep access helper: get nested value by dot-separated path
function getNestedValue(obj: Record<string, unknown>, path: string): string {
	const keys = path.split('.');
	let current: unknown = obj;
	for (const key of keys) {
		if (current == null || typeof current !== 'object') return path;
		current = (current as Record<string, unknown>)[key];
	}
	return typeof current === 'string' ? current : path;
}

export const t = derived(locale, ($locale) => {
	const messages = locales[$locale] as unknown as Record<string, unknown>;

	return (key: string, params?: Record<string, string | number>): string => {
		let value = getNestedValue(messages, key);

		// Handle pluralization: "singular | plural" separated by |
		if (value.includes(' | ') && params && 'n' in params) {
			const parts = value.split(' | ');
			value = Number(params.n) === 1 ? parts[0] : parts[1];
		}

		// Replace {param} placeholders
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
			}
		}

		return value;
	};
});
