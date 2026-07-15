interface ChatMessage {
  sender: "left" | "right";
  text: string;
}

interface ChatUIProps {
  messages: ChatMessage[];
  style: "whatsapp" | "imessage" | "dm" | "telegram";
  senderName: string;
  receiverName: string;
  width: number;
  height: number;
}

const STYLE_CONFIGS = {
  whatsapp: {
    bg: "#0b141a",
    headerBg: "#202c33",
    headerText: "#e9edef",
    leftBubble: "#202c33",
    rightBubble: "#005c4b",
    leftText: "#e9edef",
    rightText: "#e9edef",
    timeText: "#8696a0",
    inputBg: "#2a3942",
    inputText: "#8696a0",
  },
  imessage: {
    bg: "#000000",
    headerBg: "#1c1c1e",
    headerText: "#ffffff",
    leftBubble: "#262529",
    rightBubble: "#007aff",
    leftText: "#ffffff",
    rightText: "#ffffff",
    timeText: "#8e8e93",
    inputBg: "#1c1c1e",
    inputText: "#8e8e93",
  },
  dm: {
    bg: "#000000",
    headerBg: "#262626",
    headerText: "#fafafa",
    leftBubble: "#262626",
    rightBubble: "#3797f0",
    leftText: "#fafafa",
    rightText: "#ffffff",
    timeText: "#8e8e8e",
    inputBg: "#262626",
    inputText: "#8e8e8e",
  },
  telegram: {
    bg: "#0e1621",
    headerBg: "#17212b",
    headerText: "#ffffff",
    leftBubble: "#182533",
    rightBubble: "#2b5278",
    leftText: "#ffffff",
    rightText: "#ffffff",
    timeText: "#6d7883",
    inputBg: "#17212b",
    inputText: "#6d7883",
  },
};

export function ChatUIComponent({
  messages,
  style,
  senderName,
  receiverName,
  width,
  height,
}: ChatUIProps) {
  const colors = STYLE_CONFIGS[style];
  const headerHeight = 64;
  const inputHeight = 56;
  const chatAreaHeight = height - headerHeight - inputHeight;
  const bubbleMaxWidth = Math.floor(width * 0.7);
  const padding = 12;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: colors.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          height: headerHeight,
          backgroundColor: colors.headerBg,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "#4a5568",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {receiverName.charAt(0).toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: colors.headerText, fontSize: 16, fontWeight: 600 }}>
            {receiverName}
          </span>
          <span style={{ color: colors.timeText, fontSize: 12 }}>online</span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflow: "hidden",
        }}
      >
        {messages.map((msg, i) => {
          const isRight = msg.sender === "right";
          const bubbleColor = isRight ? colors.rightBubble : colors.leftBubble;
          const textColor = isRight ? colors.rightText : colors.leftText;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isRight ? "flex-end" : "flex-start",
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  backgroundColor: bubbleColor,
                  borderRadius: isRight ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "8px 14px",
                  maxWidth: bubbleMaxWidth,
                }}
              >
                <span style={{ color: textColor, fontSize: 15, lineHeight: 1.4 }}>
                  {msg.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          height: inputHeight,
          backgroundColor: colors.headerBg,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            flex: 1,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.inputBg,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
          }}
        >
          <span style={{ color: colors.inputText, fontSize: 14 }}>
            Type a message...
          </span>
        </div>
      </div>
    </div>
  );
}
