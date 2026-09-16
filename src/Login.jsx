"use client";
import Image from "next/image";
import React, { useState } from "react";
import { api } from "./api";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [visible, setVisible] = useState(false),
    [entering, setEntering] = useState(false),
    [stage, setStage] = useState("login"),
    [error, setError] = useState("");
  async function enter(event) {
    event.preventDefault();
    if (entering) return;
    setEntering(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (stage === "password" && values.password !== values.confirm) {
      setError("Passwords do not match.");
      setEntering(false);
      return;
    }
    try {
      const result = await api(`auth/${stage}`, values);
      if (result.stage === "complete") {
        window.location.assign("/overview");
        return;
      }
      setStage(result.stage);
      event.target.reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setEntering(false);
    }
  }
  return (
    <div className="login-page">
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
          <span className="login-access">
            <i /> STAFF ACCESS
          </span>
        </div>
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="login-section-mark" />
            <p className="eyebrow">STAFF & ADMINISTRATION</p>
            <h1>Welcome back.</h1>
            <p>Step into your registration workspace.</p>
          </div>
          <form className="login-form" onSubmit={enter} aria-busy={entering}>
            {stage === "login" && (
              <>
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="Your registered email"
                />
              </>
            )}
            {stage === "otp" ? (
              <>
                <label htmlFor="login-code">Email verification code</label>
                <input
                  id="login-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="[0-9]{6,10}"
                  maxLength={10}
                />
                <p>
                  Enter the code sent to your registered email. Codes expire;
                  start again to request another.
                </p>
              </>
            ) : (
              <>
                <div className="login-password-label">
                  <label htmlFor="login-password">
                    {stage === "password"
                      ? "Set your permanent password"
                      : "Password"}
                  </label>
                </div>
                <div className="login-password">
                  <input
                    key={stage}
                    id="login-password"
                    name="password"
                    type={visible ? "text" : "password"}
                    required
                    minLength={stage === "password" ? 12 : 1}
                    maxLength={128}
                    autoComplete={
                      stage === "password" ? "new-password" : "current-password"
                    }
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {stage === "password" && (
                  <>
                    <p>
                      Use 12?128 characters, including uppercase, lowercase and
                      a number.
                    </p>
                    <label htmlFor="password-confirm">
                      Confirm permanent password
                    </label>
                    <input
                      id="password-confirm"
                      name="confirm"
                      type="password"
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="login-submit" type="submit" disabled={entering}>
              <span>
                {entering
                  ? "Please wait?"
                  : stage === "otp"
                    ? "Verify email"
                    : stage === "password"
                      ? "Save password"
                      : "Sign in"}
              </span>
              <ArrowRight size={19} />
            </button>
            {stage !== "login" && (
              <button
                type="button"
                className="button"
                disabled={entering}
                onClick={async () => {
                  try {
                    await api("auth/logout", {});
                    setStage("login");
                    setError("");
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Start again
              </button>
            )}
          </form>
          <div className="login-public">
            <span>
              Need access or a password reset? Contact your PLU administrator.
            </span>
          </div>
        </div>
        <div className="login-bottomline">
          <span>PLU Youth Registration</span>
          <span>Kampala workspace</span>
        </div>
      </main>
    </div>
  );
}
