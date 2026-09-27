import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-art" aria-hidden="true"><div className="art-kicker">FIELDNOTES HACK · 2026</div><div className="art-title">Make room<br />for good ideas.</div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-stamp">BUILD<br />TOGETHER</div></div>
      <section className="auth-panel">
        <Link className="brand auth-brand" to="/login"><span className="brand-mark">h.</span><span>hackbridge</span></Link>
        <div className="auth-copy"><div className="eyebrow">Your workspace awaits</div><h1>Welcome back.</h1><p>Pick up where your team left off.</p></div>
        <form className="auth-form" onSubmit={submit}>
          <label>Email address<input autoComplete="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label>Password<input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <>Sign in <ArrowRight size={16} /></>}</button>
        </form>
        <p className="auth-switch">New to Hackbridge? <Link to="/register">Create an account</Link></p>
        <span className="auth-footnote">FIELDNOTES HACK · OCTOBER 2026</span>
      </section>
    </main>
  );
}