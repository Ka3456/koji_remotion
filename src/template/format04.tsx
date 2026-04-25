import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Agenda/TOC (IMG_2534): green bg, 3 numbered cards, "本日の動画" banner
// Props: title, items (string[])

export type Format04Props = {
  title?: string;
  items: string[];
};

export const Format04: React.FC<Format04Props> = ({
  title = "本日の動画",
  items,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = (d: number) =>
    spring({ frame: frame - d, fps, config: { stiffness: 160, damping: 26 } });

  const bannerA = s(0);
  const exitStart = durationInFrames - 90;
  const fadeOut = interpolate(frame, [exitStart, exitStart + 20], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardColors = ["#72C488", "#4DB6AC", "#64B5F6"];
  const numberColors = ["#FFFFFF", "#FFFFFF", "#FFFFFF"];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#7BC67E",
        opacity: fadeOut,
        fontFamily: "'Hiragino Maru Gothic Pro','Rounded Mplus 1p','Noto Sans JP',sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      {/* Background dots */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{ position: "absolute", width: 20, height: 20, borderRadius: "50%", backgroundColor: "#FFFFFF22", left: `${(i * 5.3) % 100}%`, top: `${(i * 7.7) % 100}%` }} />
      ))}

      {/* Top banner */}
      <div
        style={{
          backgroundColor: "#388E3C",
          borderRadius: 50,
          padding: "18px 80px",
          transform: `translateY(${interpolate(bannerA, [0, 1], [-50, 0])}px)`,
          opacity: bannerA,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ fontSize: 52, fontWeight: 900, color: "#FFFFFF", letterSpacing: 6 }}>
          {title}
        </span>
      </div>

      {/* Cards row */}
      <div style={{ display: "flex", gap: 32, alignItems: "stretch" }}>
        {items.slice(0, 3).map((item, i) => {
          const cardA = s(i * 6 + 8);
          return (
            <div
              key={i}
              style={{
                width: 520,
                backgroundColor: "#FFFFFFEE",
                borderRadius: 28,
                padding: "36px 32px 40px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                transform: `translateY(${interpolate(cardA, [0, 1], [80, 0])}px)`,
                opacity: cardA,
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                border: `4px solid ${cardColors[i]}`,
              }}
            >
              {/* Number badge */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: cardColors[i],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 52, fontWeight: 900, color: numberColors[i] }}>
                  {i + 1}
                </span>
              </div>
              <p
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: "#2C2C2C",
                  textAlign: "center",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {item}
              </p>
            </div>
          );
        })}
      </div>

      {/* YouTube icon at bottom right */}
      <div style={{ position: "absolute", bottom: 20, right: 60, opacity: 0.9 }}>
        <Img
          src={staticFile("assets/images/youtube_icon.png")}
          style={{
            width: 140,
            height: 140,
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
