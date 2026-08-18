import React, { useEffect, useState } from "react";

export const MARK = "/images/standx-mark.png";
export const LOGO = "/images/standx-logo.png";
export const WORDMARK = "/images/standx-wordmark.png";
export const WORDMARK_LIGHT = "/images/standx-wordmark-light.png";
/** The SIP-5B render: Stander carrying the Strategy, Reward and Shield vaults. */
export const VAULTS = "/images/stander-vaults.png";

export const STANDER = {
  front: "/images/stander-front.png",
  three: "/images/stander-34.png",
  side: "/images/stander-side.png",
  back: "/images/stander-back.png",
  focus: "/images/stander-focus.png",
  think: "/images/stander-think.png",
  formal: "/images/stander-formal.png",
  cozy: "/images/stander-cozy.png",
};

export const POSE_LIST = ["front", "three", "side", "back", "focus", "think", "formal", "cozy"];

const CYCLE = ["front", "three", "focus", "think", "cozy", "formal"];

export default function Stander({ pose = "front", cycle = false, every = 2000, className = "", alt = "Stander" }) {
  const [shown, setShown] = useState(pose);
  const [swap, setSwap] = useState(false);

  useEffect(() => {
    if (!cycle) return;
    let inner;
    const id = setInterval(() => {
      setSwap(true);
      inner = window.setTimeout(() => {
        setShown((p) => CYCLE[(Math.max(0, CYCLE.indexOf(p)) + 1) % CYCLE.length]);
        setSwap(false);
      }, 170);
    }, every);
    return () => {
      clearInterval(id);
      if (inner) window.clearTimeout(inner);
    };
  }, [cycle, every]);

  useEffect(() => {
    if (cycle || pose === shown) return;
    setSwap(true);
    const id = window.setTimeout(() => {
      setShown(pose);
      setSwap(false);
    }, 130);
    return () => window.clearTimeout(id);
  }, [cycle, pose, shown]);

  return (
    <span className={`stander pose-${shown} ${swap ? "swap" : ""} ${className}`.trim()}>
      <img src={STANDER[shown] || STANDER.front} alt={alt} draggable={false} />
    </span>
  );
}
