// Temporary test feature. Final builds must set VITE_TEST_CHARACTER_SWITCH=false.
// In the final game, changing hero is allowed only through the continue screen.
export const ALLOW_TEST_CHARACTER_SWITCH = import.meta.env?.VITE_TEST_CHARACTER_SWITCH !== 'false';
