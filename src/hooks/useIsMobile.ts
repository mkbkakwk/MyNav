/**
 * Mobile detection by user agent only (per project decision): phones and
 * tablets report Android/iPhone/iPod/iPad/Mobile in their UA. Touchscreen
 * laptops (desktop UA) intentionally get the desktop UI — no width or
 * pointer checks, and no override switch.
 */
export const useIsMobile = (): boolean =>
    /Android|iPhone|iPod|iPad|Mobile/i.test(navigator.userAgent);
