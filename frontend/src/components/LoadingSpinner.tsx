export default function LoadingSpinner() {
  return (
    <div style={{
      width: 40, height: 40,
      border: '3px solid var(--border-medium)',
      borderTopColor: 'var(--accent-gold)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}
