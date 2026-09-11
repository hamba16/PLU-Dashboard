"use client";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Eye, EyeOff, Check } from "lucide-react";

export default function Login({ onEnter }) {
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (!entering) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(onEnter, reducedMotion ? 250 : 1100);
    return () => clearTimeout(timer);
  }, [entering, onEnter]);

  function enter(event) {
    event.preventDefault();
    if (entering) return;
    // Visual prototype only. Credentials are never read, checked, stored or sent.
    setEntering(true);
  }

  return (
    <div className={`login-page${entering ? " is-entering" : ""}`}>
      <section className="login-art" aria-label="Patriotic League of Uganda">
        <div className="login-art-image" aria-hidden="true" />
        <div className="login-brand">
          <Image
            src="/brand/plu-logo.webp"
            alt="PLU emblem"
            width={65}
            height={65}
          />
          <div>
            <strong>PLU</strong>
            <span>PATRIOTIC LEAGUE OF UGANDA</span>
          </div>
        </div>
        <div className="login-statement">
          <p className="login-kicker">
            <span /> YOUTH REGISTRATION WORKSPACE
          </p>
          <h2>
            A shared purpose.
            <br />A stronger <em>tomorrow.</em>
          </h2>
          <p>
            A place to connect young people
            <br className="login-copy-break" /> with the possibilities ahead.
          </p>
        </div>
        <div className="login-art-footer">
          <span>Patriotism. Unity. Service.</span>
          <span>
            UGANDA <i />
          </span>
        </div>
      </section>
      <main className="login-main">
        <div className="login-topline">
          <span>YOUTH REGISTER</span>
          <span className="login-preview">
            <i /> PRELIMINARY PREVIEW
          </span>
        </div>
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="login-section-mark" />
            <p className="eyebrow">STAFF & ADMINISTRATION</p>
            <h1>Welcome back.</h1>
            <p>Step into your registration workspace.</p>
          </div>
          <form
            className="login-form"
            noValidate
            onSubmit={enter}
            aria-busy={entering}
          >
            <label htmlFor="login-username">Email or username</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              placeholder="Enter your email or username"
            />
            <div className="login-password-label">
              <label htmlFor="login-password">Password</label>
              <span>Preview access</span>
            </div>
            <div className="login-password">
              <input
                id="login-password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              className="login-submit"
              type="submit"
              aria-disabled={entering}
            >
              <span>
                {entering ? "Welcome to your workspace" : "Enter workspace"}
              </span>
              {entering ? <Check size={19} /> : <ArrowRight size={19} />}
            </button>
            <div className="login-transition" role="status" aria-live="polite">
              {entering
                ? "Opening your dashboard…"
                : "Demo access · Any details work, including blank fields."}
            </div>
          </form>
          <div className="login-public">
            <span>Here to register yourself?</span>
            <Link href="/register">
              Go to public registration <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="login-bottomline">
          <span>PLU Youth Registration</span>
          <Link href="/status">
            Check registration status <ArrowUpRight size={13} />
          </Link>
        </div>
      </main>
    </div>
  );
}
