import { useState, type FormEvent } from 'react';
import { HeartPulse, Pencil } from 'lucide-react';
import { useApp, type MedicalInfo } from '@/store/app';
import { Button } from '../ui/Button';
import { SectionLabel } from '../ui/primitives';

const BLOOD_GROUPS = ['', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

const FIELDS: { key: keyof MedicalInfo; label: string; placeholder: string }[] = [
  { key: 'allergies', label: 'Allergies', placeholder: 'e.g. Penicillin, peanuts' },
  { key: 'conditions', label: 'Conditions', placeholder: 'e.g. Asthma, diabetes' },
  { key: 'medications', label: 'Medications', placeholder: 'e.g. Insulin' },
  { key: 'notes', label: 'Notes for responders', placeholder: 'e.g. Organ donor' },
];

/** Medical ID for first responders — never leaves the device. */
export function MedicalCard() {
  const medical = useApp((s) => s.medical);
  const setMedical = useApp((s) => s.setMedical);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(medical);
  const filled = Object.values(medical).some(Boolean);

  const save = (e: FormEvent) => {
    e.preventDefault();
    setMedical(draft);
    setEditing(false);
  };

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel
        right={
          !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(medical);
                setEditing(true);
              }}
              className="flex items-center gap-1 hud text-accent-ink hover:underline"
            >
              <Pencil size={11} /> {filled ? 'Edit' : 'Set up'}
            </button>
          )
        }
      >
        Medical ID
      </SectionLabel>

      {!editing && !filled && (
        <p className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3.5 text-sm text-muted">
          <HeartPulse size={18} className="shrink-0 text-hospital" />
          Blood group, allergies and medication — shown here for responders.
        </p>
      )}

      {!editing && filled && (
        <div className="rounded-xl border border-hospital/30 bg-hospital/6 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lg font-bold">{medical.name || 'Medical ID'}</p>
            {medical.bloodGroup && (
              <span className="rounded-lg bg-hospital px-2 py-0.5 font-mono text-sm font-bold text-[#0a0d05]">
                {medical.bloodGroup}
              </span>
            )}
          </div>
          <dl className="mt-3 grid gap-2.5">
            {FIELDS.filter((f) => medical[f.key]).map((f) => (
              <div key={f.key}>
                <dt className="hud text-subtle">{f.label}</dt>
                <dd className="text-sm">{medical[f.key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {editing && (
        <form
          onSubmit={save}
          className="flex flex-col gap-2.5 rounded-xl border border-line bg-raised/40 p-3"
        >
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="flex flex-col gap-1">
              <span className="hud text-subtle">Name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-10 rounded-lg border border-line bg-sunken px-3 text-sm outline-none focus:border-accent-ink/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="hud text-subtle">Blood</span>
              <select
                value={draft.bloodGroup}
                onChange={(e) => setDraft({ ...draft, bloodGroup: e.target.value })}
                className="h-10 rounded-lg border border-line bg-sunken px-2 font-mono text-sm outline-none focus:border-accent-ink/60"
              >
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g || '—'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="hud text-subtle">{f.label}</span>
              <input
                value={draft[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                className="h-10 rounded-lg border border-line bg-sunken px-3 text-sm outline-none placeholder:text-subtle focus:border-accent-ink/60"
              />
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      )}
      <p className="text-[11px] text-subtle">Stored on this device only. Nothing is uploaded.</p>
    </section>
  );
}
