<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	const { children } = $props();

	let themeMediaQuery: MediaQueryList | null = null;
	let handleThemeChange: ((event: MediaQueryListEvent) => void) | null = null;

	const THEME_QUERY = '(prefers-color-scheme: dark)';
	const DARK_CLASS = 'dark';

	function applyDarkClass(isDark: boolean): void {
		document.documentElement.classList.toggle(DARK_CLASS, isDark);
	}

	function handleMediaChange(event: MediaQueryListEvent): void {
		applyDarkClass(event.matches);
	}

	function attachThemeListener(mq: MediaQueryList): void {
		if (mq.addEventListener) {
			mq.addEventListener('change', handleMediaChange);
		} else {
			// Safari fallback for older versions
			(mq as any).addListener(handleMediaChange);
		}
	}

	function detachThemeListener(mq: MediaQueryList): void {
		if (mq.removeEventListener) {
			mq.removeEventListener('change', handleMediaChange);
		} else {
			// Safari fallback for older versions
			(mq as any).removeListener(handleMediaChange);
		}
	}

	onMount((): void => {
		themeMediaQuery = window.matchMedia(THEME_QUERY);

		// Apply initial theme
		applyDarkClass(themeMediaQuery.matches);

		// Attach listener for theme changes
		attachThemeListener(themeMediaQuery);
	});

	onDestroy((): void => {
		if (themeMediaQuery) {
			detachThemeListener(themeMediaQuery);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
