import { useState } from "react";
import "./Chat.css";

export default function ChatInput({ onSend }) {

  const [text, setText] = useState("");

  const send = () => {

    if (!text.trim()) return;

    onSend(text);

    setText("");

  };

  return (

    <div className="chat-input">

      <button>😊</button>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
        onKeyDown={(e) => e.key === "Enter" && send()}
      />

      <button className="send-btn" onClick={send}>
        ➤
      </button>

    </div>

  );

}