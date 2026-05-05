import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const ORANGE = "#FF8C00";
const ORANGE_LIGHT = "#FFB347";
const ORANGE_DARK = "#CC6600";
const DARK = "#2C2C2C";

export type Format10Props = {
  question: string;
  label?: string;
  characterImage?: string;
};

export const Format10: React.FC<Format10Props> = ({
  question,
  label = "問いかけ",
  characterImage = "assets/images/thinking-businessman.png",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const s = (delay: number, stiff = 150, damp = 26) =>
    spring({ frame: frame - delay, fps, config: { stiffness: stiff, damping: damp } });

  const labelAnim = s(0, 200, 22);
  const markAnim = s(8, 120, 14);
  const questionAnim = s(20, 140, 26);

  const markBounce = interpolate(markAnim, [0, 1], [-80, 0]);
  const markScale = interpolate(markAnim, [0, 1], [0.5, 1]);

  const glowPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 0.9),
    [-1, 1],
    [0.4, 0.9],
  );

  const exitStart = durationInFrames - 90;
  const fadeOut = interpolate(frame, [exitStart, exitStart + 20], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${ORANGE} 0%, ${ORANGE_LIGHT} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
        fontFamily: "'Hiragino Maru Gothic Pro', 'Rounded Mplus 1p', 'Noto Sans JP', sans-serif",
      }}
    >
      <Audio src={staticFile("assets/music/chime_question.mp3")} />

      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)`,
          opacity: glowPulse,
        }}
      />

      {/* Decorative dots */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r = 460;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              opacity: 0.35,
              left: `calc(50% + ${Math.cos(angle) * r}px - 8px)`,
              top: `calc(50% + ${Math.sin(angle) * r}px - 8px)`,
            }}
          />
        );
      })}

      {/* Label pill */}
      <div
        style={{
          backgroundColor: ORANGE_DARK,
          borderRadius: 50,
          padding: "12px 56px",
          transform: `translateY(${interpolate(labelAnim, [0, 1], [40, 0])}px)`,
          opacity: labelAnim,
          marginBottom: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: 8,
          }}
        >
          ❓ {label}
        </span>
      </div>

      {/* Large question mark */}
      <div
        style={{
          fontSize: 220,
          fontWeight: 900,
          color: "#FFFFFF",
          lineHeight: 1,
          transform: `translateY(${markBounce}px) scale(${markScale})`,
          opacity: markAnim,
          textShadow: `4px 8px 0 ${ORANGE_DARK}55`,
          marginBottom: 8,
        }}
      >
        ？
      </div>

      {/* Question text */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: DARK,
          textAlign: "center",
          transform: `translateY(${interpolate(questionAnim, [0, 1], [50, 0])}px)`,
          opacity: questionAnim,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          maxWidth: 1400,
          padding: "0 80px",
          textShadow: "2px 2px 0 rgba(255,255,255,0.4)",
        }}
      >
        {question}
      </div>

      {/* Character image — 左下 */}
      <div style={{ position: "absolute", bottom: 24, left: 60, opacity: 0.92 }}>
        <Img
          src={staticFile(characterImage)}
          style={{
            width: 420,
            height: 420,
            objectFit: "contain",
          }}
        />
      </div>

      {/* YouTube icon — 右下 */}
      <div style={{ position: "absolute", bottom: 24, right: 60, opacity: 0.85 }}>
        <Img
          src={staticFile("assets/images/youtube_icon.png")}
          style={{
            width: 120,
            height: 120,
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
