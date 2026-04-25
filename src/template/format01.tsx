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

// Opening title slide (IMG_2531 style)
// Props: title, subtitle (eyebrow like "みるみるわかる")

const GREEN = "#7BC67E";
const GREEN_DARK = "#388E3C";
const DARK = "#2C2C2C";

export type Format01Props = {
  title: string;
  subtitle?: string;
};

export const Format01: React.FC<Format01Props> = ({
  title,
  subtitle = "みるみるわかる",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const s = (delay: number, stiff = 150, damp = 28) =>
    spring({ frame: frame - delay, fps, config: { stiffness: stiff, damping: damp } });

  const eyebrow = s(0, 200, 22);
  const lion = s(10, 120, 20);
  const titleAnim = s(20, 140, 26);

  const exitStart = durationInFrames - 90;
  const fadeOut = interpolate(frame, [exitStart, exitStart + 20], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 0.8),
    [-1, 1],
    [0.5, 1],
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: GREEN,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
        fontFamily: "'Hiragino Maru Gothic Pro', 'Rounded Mplus 1p', 'Noto Sans JP', sans-serif",
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 68%)`,
          opacity: glowPulse,
        }}
      />

      {/* Decorative dots */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r = 480;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              opacity: 0.4,
              left: `calc(50% + ${Math.cos(angle) * r}px - 9px)`,
              top: `calc(50% + ${Math.sin(angle) * r}px - 9px)`,
            }}
          />
        );
      })}

      {/* Eyebrow */}
      {subtitle && (
        <div
          style={{
            backgroundColor: GREEN_DARK,
            borderRadius: 50,
            padding: "12px 56px",
            transform: `translateY(${interpolate(eyebrow, [0, 1], [40, 0])}px)`,
            opacity: eyebrow,
            marginBottom: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <span
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: 6,
              textShadow: `2px 2px 0 ${GREEN_DARK}33`,
            }}
          >
            ＼{subtitle}／
          </span>
        </div>
      )}

      {/* YouTube icon mascot */}
      <div
        style={{
          transform: `scale(${interpolate(lion, [0, 1], [0.3, 1])})`,
          opacity: lion,
          lineHeight: 1,
          marginBottom: 8,
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.2))",
        }}
      >
        <Img
          src={staticFile("assets/images/youtube_icon.png")}
          style={{
            width: 240,
            height: 240,
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Main title */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: DARK,
          textAlign: "center",
          transform: `translateY(${interpolate(titleAnim, [0, 1], [50, 0])}px)`,
          opacity: titleAnim,
          lineHeight: 1.35,
          whiteSpace: "pre-wrap",
          textShadow: "3px 3px 0 rgba(0,0,0,0.15)",
        }}
      >
        {title}
      </div>

      {/* Bottom music label */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 32,
          color: "#FFFFFFAA",
          opacity: interpolate(frame, [60, 80], [0, 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        ♪ 音楽
      </div>
    </AbsoluteFill>
  );
};
