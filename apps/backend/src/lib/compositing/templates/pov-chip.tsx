interface PovChipProps {
  povText: string;
  width: number;
  height: number;
}

export function PovChipComponent({ povText, width, height }: PovChipProps) {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: Math.floor(height * 0.06),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: Math.floor(width * 0.04),
          paddingRight: Math.floor(width * 0.04),
          paddingTop: Math.floor(width * 0.014),
          paddingBottom: Math.floor(width * 0.014),
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: 100,
          maxWidth: width * 0.85,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: Math.floor(width * 0.038),
            fontWeight: 700,
            fontFamily: "Inter",
            letterSpacing: "0.3px",
          }}
        >
          POV: {povText}
        </span>
      </div>
    </div>
  );
}