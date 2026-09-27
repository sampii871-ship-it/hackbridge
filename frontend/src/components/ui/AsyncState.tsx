import { LoaderCircle, RefreshCw } from 'lucide-react';

export function LoadingState({ label = 'Loading workspace' }: { label?: string }) {
  return <div className="state-block"><LoaderCircle className="spin state-icon" size={20} /><span>{label}</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-block state-error" role="alert">
      <span>{message}</span>
      {retry && <button className="button button-small" onClick={retry}><RefreshCw size={14} /> Retry</button>}
    </div>
  );
}