import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(name, email, password);
      navigate('/onboarding', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create your account');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-art" aria-hidden="true"><div className="art-kicker">FIELDNOTES HACK · 2026</div><div className="art-title">Find your<br />people. Build<br />your thing.</div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-stamp">IDEAS<br />IN MOTION</div></div>
      <section className="auth-panel">
        <Link className="brand auth-brand" to="/login"><span className="brand-mark">h.</span><span>hackbridge</span></Link>
        <div className="auth-copy"><div className="eyebrow">Start building</div><h1>Make an account.</h1><p>One login for your hackathon workspace.</p></div>
        <form className="auth-form" onSubmit={submit}>
          <label>Full name<input autoComplete="name" value={name} onChange={event => setName(event.target.value)} required maxLength={255} /></label>
          <label>Email address<input autoComplete="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label>Password<input autoComplete="new-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} maxLength={72} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <>Create account <ArrowRight size={16} /></>}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        <span className="auth-footnote">FIELDNOTES HACK · OCTOBER 2026</span>
      </section>
    </main>
  );
}