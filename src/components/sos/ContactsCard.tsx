import { useState, type FormEvent } from 'react';
import { MessageSquare, Phone, Plus, Trash2, UserRound } from 'lucide-react';
import { smsHref, telHref } from '@/features/emergency/share';
import { useApp } from '@/store/app';
import { Button, IconButton } from '../ui/Button';
import { SectionLabel } from '../ui/primitives';

const PHONE = /^\+?[\d\s()-]{6,20}$/;

/** Up to five trusted contacts, stored only in this browser. */
export function ContactsCard({ message }: { message: string }) {
  const contacts = useApp((s) => s.contacts);
  const addContact = useApp((s) => s.addContact);
  const removeContact = useApp((s) => s.removeContact);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Add a name');
    if (!PHONE.test(phone.trim())) return setError('Enter a valid phone number');
    addContact({ name: name.trim(), phone: phone.trim() });
    setName('');
    setPhone('');
    setError(null);
    setAdding(false);
  };

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel
        right={
          contacts.length < 5 &&
          !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 hud text-accent-ink hover:underline"
            >
              <Plus size={12} /> Add
            </button>
          )
        }
      >
        Emergency contacts
      </SectionLabel>

      {contacts.length === 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3.5 text-left text-sm text-muted hover:border-subtle"
        >
          <UserRound size={18} className="shrink-0" />
          Add someone to call or text your location in one tap.
        </button>
      )}

      {contacts.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised/40">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-sm font-bold text-muted">
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{c.name}</span>
                <span className="block font-mono text-xs text-subtle">{c.phone}</span>
              </span>
              <a
                href={telHref(c.phone)}
                aria-label={`Call ${c.name}`}
                className="grid size-9 place-items-center rounded-lg text-ok hover:bg-ok/10"
              >
                <Phone size={16} />
              </a>
              <a
                href={smsHref(message, c.phone)}
                aria-label={`Text my location to ${c.name}`}
                className="grid size-9 place-items-center rounded-lg text-accent-ink hover:bg-accent/10"
              >
                <MessageSquare size={16} />
              </a>
              <IconButton label={`Remove ${c.name}`} size="sm" onClick={() => removeContact(c.id)}>
                <Trash2 size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-xl border border-line bg-raised/40 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Contact name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg border border-line bg-sunken px-3 text-sm outline-none focus:border-accent-ink/60"
              autoFocus
            />
            <input
              aria-label="Phone number"
              placeholder="Phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 rounded-lg border border-line bg-sunken px-3 font-mono text-sm outline-none focus:border-accent-ink/60"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save contact
            </Button>
          </div>
        </form>
      )}
      <p className="text-[11px] text-subtle">Saved on this device only.</p>
    </section>
  );
}
