import type { ReactNode } from "react";

export default function Panel(props: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold tracking-wide text-slate-100">{props.title}</div>
        {props.right}
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}

