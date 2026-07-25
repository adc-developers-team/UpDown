import { Fragment } from 'react';

const MessageFormatter = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const mentionRegex = /@(\w+)/g;
  const emojiRegex = /:(\w+):/g;

  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all">
              {part}
            </a>
          );
        }
        const subParts = part.split(mentionRegex);
        return subParts.map((sub, j) => {
          if (sub.match(mentionRegex)) {
            return <span key={`${i}-${j}`} className="text-accent font-semibold">@{sub}</span>;
          }
          return <Fragment key={`${i}-${j}`}>{sub}</Fragment>;
        });
      })}
    </>
  );
};

export default MessageFormatter;
