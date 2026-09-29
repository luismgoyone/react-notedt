import type { ReactNode } from "react";
import emptyStateImage from "../images/no-transactions.png";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10 text-center">
      <img
        src={emptyStateImage}
        alt=""
        width={664}
        height={442}
        className="w-full max-w-xs opacity-60"
      />
      <h2 className="mt-4 text-xl font-medium uppercase">{title}</h2>
      <p className="mt-2 text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
