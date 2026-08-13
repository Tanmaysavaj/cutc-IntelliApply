'use client';

export default function LoadingOverlay({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="overlay">
      <div className="loader-card">
        <div className="loader">✦</div>
        <h2>{title}</h2>
        <p>{detail}</p>
        <div className="progress">
          <i />
        </div>
      </div>
    </div>
  );
}
