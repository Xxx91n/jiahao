// Throwaway Antigravity probe: exit 2 with stderr.
// Observed: host logs command failed: exit status 2, and ends turn without continuation.
console.error('ANTIGRAVITY EXIT2 PROBE: hook failed with exit status 2');
process.exit(2);
