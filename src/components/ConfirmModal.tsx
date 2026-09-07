"use client";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel = "Delete", variant = "danger", onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-soft flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} className={`${variant === "danger" ? "btn-danger" : "btn-primary"} flex-1`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
