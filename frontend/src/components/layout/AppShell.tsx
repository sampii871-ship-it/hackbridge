import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronDown, ClipboardCheck, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, Users, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyTeam } from '../../api/teams';
import { useAuth } from '../../context/AuthContext';
import { useHackathons } from '../../context/HackathonContext';

export function AppShell({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { hackathons, activeHackathon, chooseHackathon } = useHackathons();
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);
  const teamQuery = useQuery({
    queryKey: ['team', activeHackathon?.id],
    queryFn: () => getMyTeam(activeHackathon!.id),
    enabled: Boolean(activeHackathon),
  });
  const projectPath = teamQuery.data ? `/project/${teamQuery.data.project_id}` : '/onboarding';
  const initials = (user?.full_name ?? 'HB').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const daysLeft = activeHackathon
    ? Math.max(0, Math.ceil((new Date(activeHackathon.end_time).getTime() - Date.now()) / 86_400_000))
    : null;
  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: projectPath, label: 'Project', icon: FolderKanban, end: false },
    { to: '/team', label: 'Team', icon: Users, end: true },
    { to: '/submission', label: 'Submission', icon: ClipboardCheck, end: true },
    { to: '/onboarding', label: 'Getting started', icon: ListChecks, end: true },
  ];
  const pageTitle = location.pathname.startsWith('/project/') ? 'Project workspace'
    : location.pathname === '/dashboard' ? 'Overview'
      : location.pathname === '/team' ? 'Team'
        : location.pathname === '/submission' ? 'Submission'
          : location.pathname === '/onboarding' ? 'Getting started'
            : location.pathname === '/admin' ? 'Organizer' : 'Workspace';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-row">
          <Link className="brand" to="/dashboard"><span className="brand-mark">h.</span><span>hackbridge</span></Link>
          <button className="icon-button mobile-only" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="sidebar-inner">
          <label className="eyebrow" htmlFor="eventSelect">Your event</label>
          <div className="event-select-wrap">
            <select
              id="eventSelect"
              value={activeHackathon?.id ?? ''}
              onChange={event => chooseHackathon(event.target.value)}
              disabled={!hackathons.length}
            >
              {hackathons.length ? hackathons.map(event => <option value={event.id} key={event.id}>{event.title}</option>) : <option value="">No events available</option>}
            </select>
            <ChevronDown aria-hidden="true" size={14} />
          </div>
          {activeHackathon && <p className="event-dates">{formatDate(activeHackathon.start_time)} – {formatDate(activeHackathon.end_time)}</p>}
          <div className="nav-label">Workspace</div>
          <nav className="side-nav" id="workspace-navigation" aria-label="Workspace navigation">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={label}
                to={to}
                end={end}
                className={({ isActive }) => `nav-link ${isActive || (label === 'Project' && location.pathname.startsWith('/project/')) ? 'nav-link-active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          {user?.role === 'admin' && <>
            <div className="nav-label organizer-nav-label">Organizer</div>
            <nav className="side-nav" aria-label="Organizer navigation">
              <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>
                <ClipboardCheck size={17} strokeWidth={1.8} /><span>Event overview</span>
              </NavLink>
            </nav>
          </>}
        </div>
        <div className="sidebar-bottom">
          {daysLeft !== null && <div className="deadline-box"><span className="eyebrow">Submission closes in</span><strong>{daysLeft} days</strong><span>{activeHackathon ? formatDate(activeHackathon.end_time) : ''}</span></div>}
          <div className="profile-row">
            <span className="avatar">{initials}</span>
            <span className="profile-name"><strong>{user?.full_name}</strong><small>{user?.email}</small></span>
            <button className="icon-button logout-button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      {menuOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div className="topbar-context"><span>{activeHackathon?.title ?? 'Hackbridge'}</span><b>/</b><strong>{pageTitle}</strong></div>
          <div className="topbar-spacer" />
          {daysLeft !== null && <div className="top-deadline"><span>DEADLINE</span><strong>{daysLeft} days</strong></div>}
          <Link className="icon-button help-button" to="/onboarding" aria-label="Getting started help" title="Getting started"><ArrowUpRight size={16} /></Link>
          <span className="avatar avatar-small">{initials}</span>
        </header>
        <section className="page-content" id="main-content" tabIndex={-1}>{children ?? <Outlet />}</section>
      </main>
      <nav className="mobile-tabbar" aria-label="Primary navigation">
        {[
          { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
          { to: projectPath, label: 'Project', icon: FolderKanban, end: false },
          { to: '/team', label: 'Team', icon: Users, end: true },
          { to: '/submission', label: 'Submit', icon: ClipboardCheck, end: true },
        ].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => `mobile-tab ${isActive || (label === 'Project' && location.pathname.startsWith('/project/')) ? 'mobile-tab-active' : ''}`}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}