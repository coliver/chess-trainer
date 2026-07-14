export default function FireworkButton({
  onClick,
  label = "Firework",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Launch ${label} animation`}
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 10000,
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.25)",
        background: "rgba(0,0,0,.35)",
        color: "white",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
        boxShadow:
          "0 12px 30px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08) inset",
      }}
      tabIndex={0}
    >
      {label} 🎇
    </button>
  );
}