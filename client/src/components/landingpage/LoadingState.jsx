// LoadingState.jsx
import React from "react";

export default function LoadingState({ title = "Searching the collection…" }) {
  return (
    <div className="state-box">
      <div className="spinner" />
      <div className="state-box-title">{title}</div>
    </div>
  );
}
