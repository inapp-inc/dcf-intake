import { C } from "../../theme/tokens";

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
      {options.map((opt) => {
        const active = value === opt.id;
        const count = counts?.[opt.id];
        return (
          <button
            key={opt.id}
            type="button"
            className="app-btn"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              background: active ? C.navy : C.white,
              color: active ? "#fff" : C.textMid,
              border: `1px solid ${active ? C.navy : C.border}`,
            }}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
            {count != null ? ` (${count})` : ""}
          </button>
        );
      })}
    </div>
  );
}
