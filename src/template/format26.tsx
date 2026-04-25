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
import { renderStyledText } from "./renderStyledText";

const GREEN = "#7BC67E";
const GREEN_DARK = "#388E3C";
const ACCENT_TEAL = "#4DB6AC";
const BOARD_BG = "#FAFAF7";
const BOARD_LINE = "#E8E8E0";

export type Format26Props = {
  characterImage?: string;
  powerpointTitle?: string;
  powerpointItems?: string[];
};

export const Format26: React.FC<Format26Props> = ({
  characterImage = "assets/images/youtube_icon.png",
  powerpointTitle = "",
  powerpointItems = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const t = frame / fps;

  const INTRO_DELAY = 30;

  const charEntrance = spring({
    frame,
    fps,
    config: { damping: 26, stiffness: 80 },
  });
  const charX = interpolate(charEntrance, [0, 1], [400, 0]);

  const boardDrop = spring({
    frame: frame - 10,
    fps,
    config: { damping: 24, stiffness: 80 },
  });
  const boardY = interpolate(boardDrop, [0, 1], [-1100, 0]);

  const titleOpacity = interpolate(
    frame,
    [INTRO_DELAY, INTRO_DELAY + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const titleSlideY = interpolate(
    frame,
    [INTRO_DELAY, INTRO_DELAY + 15],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const underlineW = interpolate(
    frame,
    [INTRO_DELAY + 10, INTRO_DELAY + 30],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const floatY = Math.sin(t * 1.0) * 4;

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: GREEN,
        opacity: exitOpacity,
      }}
    >
      {/* Background dots */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`dot-${i}`}
          style={{
            position: "absolute",
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "#FFFFFF22",
            left: `${(i * 5.3) % 100}%`,
            top: `${(i * 7.7) % 100}%`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "50px 60px",
          gap: 40,
        }}
      >
        <div
          style={{
            flex: "1 1 0",
            height: "84%",
            borderRadius: 32,
            backgroundColor: BOARD_BG,
            boxShadow:
              "0 4px 30px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            border: `6px solid ${GREEN_DARK}`,
            display: "flex",
            flexDirection: "column",
            padding: "50px 60px",
            overflow: "hidden",
            transform: `translateY(${boardY}px)`,
            opacity: boardDrop,
          }}
        >
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleSlideY}px)`,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: GREEN_DARK,
                fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
                lineHeight: 1.3,
              }}
            >
              {renderStyledText(powerpointTitle)}
            </div>
            <div
              style={{
                width: `${underlineW}%`,
                height: 4,
                backgroundColor: ACCENT_TEAL,
                marginTop: 16,
                borderRadius: 2,
              }}
            />
          </div>

          <div
            style={{
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              flex: 1,
            }}
          >
            {powerpointItems.map((item, i) => {
              const delay = INTRO_DELAY + 20 + i * 12;
              const itemSpring = spring({
                frame: frame - delay,
                fps,
                config: { damping: 26, stiffness: 140 },
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 18,
                    opacity: interpolate(itemSpring, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(itemSpring, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      backgroundColor: ACCENT_TEAL,
                      marginTop: 28,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 64,
                      fontWeight: 500,
                      color: "#333333",
                      fontFamily:
                        "'Hiragino Sans', 'Noto Sans JP', sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    {renderStyledText(item)}
                  </div>
                </div>
              );
            })}
          </div>

          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 60,
                right: 60,
                top: 240 + i * 80,
                height: 1,
                backgroundColor: BOARD_LINE,
                opacity: 0.3,
              }}
            />
          ))}
        </div>

        <div
          style={{
            width: 400,
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            opacity: charEntrance,
            transform: `translateX(${charX}px) translateY(${floatY}px)`,
          }}
        >
          <Img
            src={staticFile(characterImage)}
            style={{
              width: 360,
              height: 360,
              objectFit: "cover",
              borderRadius: "50%",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
