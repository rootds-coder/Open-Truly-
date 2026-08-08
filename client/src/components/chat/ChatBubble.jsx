import "./Chat.css";

export default function ChatBubble({ message }) {
  return (
    <div className={`chat-bubble ${message.sender}`}>

      <div className="bubble-content">

        <p>{message.text}</p>

        <span>{message.time}</span>

      </div>

    </div>
  );
}