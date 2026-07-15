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
    bg: "#1a1a2e",
    textColor: "#ffffff",
    accentColor: "#e94560",
    topicColor: "#e94560",
    overlayBg: "#1a1a2e",
    fontSize: 42,
  },
  minimal: {
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    accentColor: "#666666",
    topicColor: "#999999",
    overlayBg: "#f5f5f5",
    fontSize: 36,
  },
  neon: {
    bg: "#0a0a0a",
    textColor: "#00ff88",
    accentColor: "#ff00ff",
    topicColor: "#00ff88",
    overlayBg: "#0a0a0a",
    fontSize: 40,
  },
  pastel: {
    bg: "#ffecd2",
    textColor: "#2d3436",
    accentColor: "#e17055",
    topicColor: "#e17055",
    overlayBg: "#ffecd2",
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
  const contentMaxWidth = width - 96;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: config.bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 48,
        paddingRight: 48,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: contentMaxWidth,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 32,
          paddingBottom: 32,
          backgroundColor: config.overlayBg,
          borderRadius: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: config.accentColor,
              marginRight: 8,
            }}
          />
          <span
            style={{
              color: config.topicColor,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {topic}
          </span>
        </div>

        <div
          style={{
            color: config.textColor,
            fontSize: config.fontSize,
            fontWeight: 700,
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          {factText}
        </div>

        {source && (
          <span
            style={{
              color: config.accentColor,
              fontSize: 13,
              fontWeight: 500,
              marginTop: 16,
            }}
          >
            Source: {source}
          </span>
        )}
      </div>
    </div>
  );
}