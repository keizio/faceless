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
  const scale = width / 1080;
  const sr = (n: number) => Math.round(n * scale);

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: colors.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: sr(64),
          backgroundColor: colors.headerBg,
          display: "flex",
          alignItems: "center",
          paddingLeft: sr(16),
          paddingRight: sr(16),
        }}
      >
        <div
          style={{
            width: sr(40),
            height: sr(40),
            borderRadius: sr(20),
            backgroundColor: "#4a5568",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: sr(12),
          }}
        >
          <span style={{ color: "#fff", fontSize: sr(16), fontWeight: 600 }}>
            {receiverName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: colors.headerText, fontSize: sr(16), fontWeight: 600 }}>
            {receiverName}
          </span>
          <span style={{ color: colors.timeText, fontSize: sr(12) }}>online</span>
        </div>
      </div>

      <div
        style={{
          flexGrow: 1,
          paddingLeft: sr(16),
          paddingRight: sr(16),
          paddingTop: sr(12),
          paddingBottom: sr(12),
          display: "flex",
          flexDirection: "column",
        }}
      >
        {messages.map((msg, i) => {
          const isRight = msg.sender === "right";
          const bubbleColor = isRight ? colors.rightBubble : colors.leftBubble;
          const textColor = isRight ? colors.rightText : colors.leftText;
          const bubbleMaxWidth = Math.floor(width * 0.7);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isRight ? "flex-end" : "flex-start",
                marginBottom: i < messages.length - 1 ? sr(4) : 0,
              }}
            >
              <div
                style={{
                  backgroundColor: bubbleColor,
                  borderRadius: isRight ? `${sr(18)}px ${sr(18)}px ${sr(4)}px ${sr(18)}px` : `${sr(18)}px ${sr(18)}px ${sr(18)}px ${sr(4)}px`,
                  paddingLeft: sr(14),
                  paddingRight: sr(14),
                  paddingTop: sr(8),
                  paddingBottom: sr(8),
                  maxWidth: bubbleMaxWidth,
                  display: "flex",
                }}
              >
                <span style={{ color: textColor, fontSize: sr(15), lineHeight: 1.4 }}>
                  {msg.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          height: sr(56),
          backgroundColor: colors.headerBg,
          display: "flex",
          alignItems: "center",
          paddingLeft: sr(16),
          paddingRight: sr(16),
        }}
      >
        <div
          style={{
            flexGrow: 1,
            height: sr(36),
            borderRadius: sr(18),
            backgroundColor: colors.inputBg,
            display: "flex",
            alignItems: "center",
            paddingLeft: sr(16),
            paddingRight: sr(16),
          }}
        >
          <span style={{ color: colors.inputText, fontSize: sr(14) }}>
            Type a message...
          </span>
        </div>
      </div>
    </div>
  );
}