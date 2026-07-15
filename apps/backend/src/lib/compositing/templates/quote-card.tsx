interface QuoteCardProps {
  quoteText: string;
  author?: string;
  style: "elegant" | "bold" | "minimal" | "gradient";
  width: number;
  height: number;
}

const STYLE_CONFIGS = {
  elegant: {
    bg: "#2c3e50",
    textColor: "#ecf0f1",
    quoteColor: "#f39c12",
    authorColor: "#bdc3c7",
    fontSize: 34,
  },
  bold: {
    bg: "#000000",
    textColor: "#ffffff",
    quoteColor: "#ff3838",
    authorColor: "#888888",
    fontSize: 38,
  },
  minimal: {
    bg: "#ffffff",
    textColor: "#222222",
    quoteColor: "#cccccc",
    authorColor: "#888888",
    fontSize: 32,
  },
  gradient: {
    bg: "#667eea",
    textColor: "#ffffff",
    quoteColor: "#a8b4ff",
    authorColor: "#d0d6ff",
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
        backgroundColor: config.bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 64,
        paddingRight: 64,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: width - 128,
        }}
      >
        <span
          style={{
            color: config.quoteColor,
            fontSize: 80,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          {"\u201C"}
        </span>

        <div
          style={{
            color: config.textColor,
            fontSize: config.fontSize,
            fontWeight: 500,
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          {quoteText}
        </div>

        <span
          style={{
            color: config.quoteColor,
            fontSize: 80,
            fontWeight: 700,
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          {"\u201D"}
        </span>

        {author && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <div
              style={{
                width: 32,
                height: 1,
                backgroundColor: config.authorColor,
                marginRight: 12,
              }}
            />
            <span
              style={{
                color: config.authorColor,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              {author}
            </span>
            <div
              style={{
                width: 32,
                height: 1,
                backgroundColor: config.authorColor,
                marginLeft: 12,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}