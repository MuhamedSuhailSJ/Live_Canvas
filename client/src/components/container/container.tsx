import  { useState, useEffect } from "react";
import { Board } from "../board/board";
import { Socket } from "../../Shared/socket";
import "./style.css";

export const Container = () => {
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    Socket.on("users-update", (users) => {
      setOnlineUsers(Object.keys(users).length);
    });
  }, []);

  const handleUndo = () => {
    Socket.emit("undo");
  };

  const handleClear = () => {
    if (window.confirm("Clear entire board for everyone?")) {
      Socket.emit("clear");
    }
  };

  return (
    <div className="container">
      <div className="toolbar">
        <div className="toolbar-section">
          <h3>Tools</h3>
          <button
            className={tool === "brush" ? "active" : ""}
            onClick={() => setTool("brush")}
          >
            🖌️ Brush
          </button>
          <button
            className={tool === "eraser" ? "active" : ""}
            onClick={() => setTool("eraser")}
          >
            ⬜ Eraser
          </button>
        </div>

        <div className="toolbar-section">
          <h3>Settings</h3>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={tool === "eraser"}
          />
          <input
            type="range"
            min="1"
            max="50"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <span>Size: {size}</span>
        </div>

        <div className="toolbar-section">
          <h3>Actions</h3>
          <button onClick={handleUndo}>↩️ Global Undo</button>
          <button onClick={handleClear} style={{ color: "red" }}>
            Clear All
          </button>
        </div>

        <div className="toolbar-section">
          <span className="online-badge">{onlineUsers} Online</span>
        </div>
      </div>

      <div className="board-container">
        <Board color={color} size={size} tool={tool} />
      </div>
    </div>
  );
};
