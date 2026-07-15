interface QuoteCardProps {
  quoteText: string;
  author?: string;
  style: "elegant" | "bold" | "minimal" | "gradient";
  width: number;
  height: number;
}

const STYLE_CONFIGS = {
  elegant: {
    bg: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
    textColor: "#ecf0f1",
    quoteColor: "#f39c12",
    authorColor: "#bdc3c7",
    fontSize: 34,
  },
  bold: {
    bg: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
    textColor: "#ffffff",
    quoteColor: "#ff3838",
    authorColor: "#888888",
    fontSize: 38,
  },
  minimal: {
    bg: "linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)",
    textColor: "#222222",
    quoteColor: "#cccccc",
    authorColor: "#888888",
    fontSize: 32,
  },
  gradient: {
    bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textColor: "#ffffff",
    quoteColor: "rgba(255,255,255,0.3)",
    authorColor: "rgba(255,255,255,0.7)",
    fontSize: 34,
  },
};

export function QuoteCardComponent({
  quoteText,
  author,
  style,
  width,
  height,
}: QuoteCardProps) {
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
        padding: 64,
        fontFamily: "Inter, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          maxWidth: width - 128,
        }}
      >
        <span
          style={{
            color: config.quoteColor,
            fontSize: 80,
            fontWeight: 700,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
          }}
        >
          {"\u201C"}
        </span>

        <p
          style={{
            color: config.textColor,
            fontSize: config.fontSize,
            fontWeight: 500,
            lineHeight: 1.5,
            textAlign: "center",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          {quoteText}
        </p>

        <span
          style={{
            color: config.quoteColor,
            fontSize: 80,
            fontWeight: 700,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
            marginTop: -16,
          }}
        >
          {"\u201D"}
        </span>

        {author && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 1,
                backgroundColor: config.authorColor,
              }}
            />
            <span
              style={{
                color: config.authorColor,
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: 1,
              }}
            >
              {author}
            </span>
            <div
              style={{
                width: 32,
                height: 1,
                backgroundColor: config.authorColor,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
