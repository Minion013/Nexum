export function NexumLogo({ className = '' }: { className?: string }) {
  return <span className={`nexum-logo${className ? ` ${className}` : ''}`} role="img" aria-label="NEXUM"><img src="/NEXUM.svg" alt="" /></span>;
}
