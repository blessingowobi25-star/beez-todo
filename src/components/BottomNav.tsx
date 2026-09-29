import { IconCalendar, IconHome, IconNote, IconTarget } from './icons';
import type { MobileSection } from '../App';

interface BottomNavProps {
  active: MobileSection;
  onChange: (section: MobileSection) => void;
}

/** Rounded bottom navigation bar from the mobile sample (mobile only). */
export function BottomNav({ active, onChange }: BottomNavProps) {
  const items: { id: MobileSection; label: string; Icon: typeof IconHome }[] = [
    { id: 'home', label: 'Home', Icon: IconHome },
    { id: 'calendar', label: 'Calendar', Icon: IconCalendar },
    { id: 'focus', label: 'Focus', Icon: IconTarget },
    { id: 'notes', label: 'Notes', Icon: IconNote },
  ];

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav__item${active === id ? ' bottom-nav__item--active' : ''}`}
          onClick={() => onChange(id)}
          aria-pressed={active === id}
          aria-label={label}
          title={label}
        >
          <Icon width={20} height={20} />
        </button>
      ))}
    </nav>
  );
}
