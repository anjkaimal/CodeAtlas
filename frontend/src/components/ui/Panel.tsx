import type { ReactNode } from "react";

export default function Panel(props: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="bg-white card-shadow rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="text-base font-bold text-gray-900">{props.title}</div>
        {props.right}
      </div>
      <div className="p-5">{props.children}</div>
    </div>
  );
}

