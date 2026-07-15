interface FactCardProps {
  factText: string;
  topic: string;
  style: "bold" | "minimal" | "neon" | "pastel";
  source?: string;
  width: number;
  height: number;
}

const STYLE_CONFIGS = {
  bold: {
    bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    textColor: "#ffffff",
    accentColor: "#e94560",
    topicColor: "#e94560",
    overlayBg: "rgba(0,0,0,0.6)",
    fontSize: 42,
  },
  minimal: {
    bg: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)",
    textColor: "#1a1a1a",
    accentColor: "#666666",
    topicColor: "#999999",
    overlayBg: "rgba(255,255,255,0.85)",
    fontSize: 36,
  },
  neon: {
    bg: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)",
    textColor: "#00ff88",
    accentColor: "#ff00ff",
    topicColor: "#00ff88",
    overlayBg: "rgba(0,0,0,0.7)",
    fontSize: 40,
  },
  pastel: {
    bg: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    textColor: "#2d3436",
    accentColor: "#e17055",
    topicColor: "#e17055",
    overlayBg: "rgba(255,255,255,0.8)",
    fontSize: 36,
  },
};

export function FactCardComponent({
  factText,
  topic,
  style,
  source,
  width,
  height,
}: FactCardProps) {
  const config = STYLE_CONFIGS[style];

  return (
    <div
      style={{
        width,
        height,
        background: config.bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 48,
        fontFamily: "Inter, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          maxWidth: width - 96,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: config.accentColor,
            }}
          />
          <span
            style={{
              color: config.topicColor,
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {topic}
          </span>
        </div>

        <div
          style={{
            backgroundColor: config.overlayBg,
            borderRadius: 16,
            padding: "32px 24px",
            width: "100%",
          }}
        >
          <p
            style={{
              color: config.textColor,
              fontSize: config.fontSize,
              fontWeight: 700,
              lineHeight: 1.4,
              textAlign: "center",
              margin: 0,
            }}
          >
            {factText}
          </p>
        </div>

        {source && (
          <span
            style={{
              color: config.accentColor,
              fontSize: 13,
              fontWeight: 500,
              opacity: 0.8,
            }}
          >
            Source: {source}
          </span>
        )}
      </div>
    </div>
  );
}
