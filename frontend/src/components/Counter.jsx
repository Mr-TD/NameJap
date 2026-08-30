import { useState, useRef, useCallback } from "react";

export default function Counter({ todayLog, onSave, onCountChange }) {
  const [notes, setNotes] = useState(todayLog?.notes || "");
  const [customAmt, setCustomAmt] = useState("");
  const [saving, setSaving] = useState(false);
  const [bumping, setBumping] = useState(false);
  const numberRef = useRef(null);

  const count = todayLog?.count ?? 0;

  const triggerBump = useCallback(() => {
    setBumping(true);
    setTimeout(() => setBumping(false), 350);
  }, []);

  const increment = (amount) => {
    const newCount = Math.max(0, count + amount);
    onCountChange(newCount);
    triggerBump();
  };

  const handleCustomAdd = () => {
    const amt = parseInt(customAmt, 10);
    if (!isNaN(amt) && amt > 0) {
      increment(amt);
      setCustomAmt("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(count, notes);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCustomAdd();
  };

  return (
    <div className="counter-section">
      {/* Big count display */}
      <div className="counter-display">
        <div
          ref={numberRef}
          className={`counter-number ${bumping ? "bump" : ""}`}
        >
          {count.toLocaleString()}
        </div>
        <div className="counter-label">Today's Count</div>
      </div>

      {/* +/- controls */}
      <div className="counter-controls">
        <button
          className="counter-btn counter-btn--small"
          onClick={() => increment(-1)}
          title="Decrease by 1"
        >
          −
        </button>
        <button
          className="counter-btn counter-btn--large"
          onClick={() => increment(1)}
          title="Increase by 1"
        >
          +
        </button>
        <button
          className="counter-btn counter-btn--small"
          onClick={() => increment(10)}
          title="Increase by 10"
        >
          +10
        </button>
      </div>

      {/* Custom increment */}
      <div className="custom-increment">
        <input
          type="number"
          className="custom-input"
          placeholder="Custom"
          value={customAmt}
          onChange={(e) => setCustomAmt(e.target.value)}
          onKeyDown={handleKeyDown}
          min="1"
        />
        <button
          className="counter-btn counter-btn--small"
          onClick={handleCustomAdd}
          title="Add custom amount"
          style={{ fontSize: "0.8rem", width: "auto", padding: "0 14px" }}
        >
          Add
        </button>
      </div>

      {/* Notes + Save */}
      <div className="save-row">
        <input
          type="text"
          className="notes-input"
          placeholder="Add a note (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "💾 Save Log"}
        </button>
      </div>
    </div>
  );
}
