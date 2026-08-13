'use client';

export default function Timeline({
  title,
  meta,
  text,
}: {
  title: string;
  meta: string;
  text: string;
}) {
  return (
    <div className="timeline">
      <i />
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
        <p>{text}</p>
      </div>
    </div>
  );
}
