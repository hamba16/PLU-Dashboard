"use client";
import React, { useEffect, useState } from "react";
import { api } from "./api";
import { roles, divisions } from "./access";

const blank = {
  name: "",
  email: "",
  role: "registration",
  division: divisions[0],
  active: true,
  password: "",
  emailChecked: false,
};
export function UsersAdmin({ actor }) {
  const [users, setUsers] = useState([]),
    [form, setForm] = useState({ ...blank }),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => setUsers(await api("users"));
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  function change(key, value) {
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === "role"
        ? { division: value === "registration" ? divisions[0] : null }
        : {}),
    }));
  }
  async function submit(action) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("users", {
        ...form,
        action,
        id: selected?.id,
        version: selected?.security_version,
        ...(action === "otp" ? { enabled: !selected.otp_enabled } : {}),
      });
      if (selected?.id === actor.id) {
        window.location.assign("/login");
        return;
      }
      await load();
      setSelected(null);
      setForm({ ...blank });
      setMessage("Account action completed.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>User accounts</h1>
          <p className="subtitle">
            Provision individual staff accounts and manage access.
          </p>
        </div>
        <button
          className="button"
          onClick={() => {
            setSelected(null);
            setForm({ ...blank });
          }}
        >
          New account
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <section className="panel admin-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NAME / EMAIL</th>
                <th>ROLE</th>
                <th>DIVISION</th>
                <th>ACCESS</th>
                <th>OTP</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <button
                      className="registrant-button"
                      onClick={() => {
                        setSelected(u);
                        setForm({ ...u, password: "" });
                        setError("");
                      }}
                    >
                      <span>
                        <strong>
                          {u.name}
                          {u.is_test ? " · SEED / TEST" : ""}
                        </strong>
                        <small>{u.email}</small>
                      </span>
                    </button>
                  </td>
                  <td>{u.role}</td>
                  <td>{u.division || "All five"}</td>
                  <td>
                    {u.active ? "Active" : "Inactive"}
                    {u.must_change_password
                      ? " · Password change required"
                      : ""}
                  </td>
                  <td>{u.otp_enabled ? "On" : "Off"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <form
        className="panel admin-panel"
        onSubmit={(e) => {
          e.preventDefault();
          submit(selected ? "edit" : "create");
        }}
      >
        <h2>{selected ? `Manage ${selected.name}` : "Create account"}</h2>
        <div className="field-grid">
          <label className="field">
            Name
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </label>
          <label className="field">
            Registered email
            <input
              type="email"
              required
              disabled={!!selected}
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </label>
          <label className="field">
            Role
            <select
              value={form.role}
              onChange={(e) => change("role", e.target.value)}
            >
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          {form.role === "registration" && (
            <label className="field">
              Division
              <select
                value={form.division || ""}
                onChange={(e) => change("division", e.target.value)}
              >
                {divisions.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            {selected ? "Temporary password for reset" : "Temporary password"}
            <input
              type="password"
              autoComplete="new-password"
              required={!selected}
              minLength={12}
              maxLength={128}
              value={form.password}
              onChange={(e) => change("password", e.target.value)}
            />
            <small>
              12–128 characters, uppercase, lowercase and a number. Share
              privately with this user.
            </small>
          </label>
        </div>
        {!selected && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              required
              checked={form.emailChecked}
              onChange={(e) => change("emailChecked", e.target.checked)}
            />
            I individually checked this email address; it is not a shared inbox.
          </label>
        )}
        {selected && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => change("active", e.target.checked)}
            />
            Account active
          </label>
        )}
        <div className="button-row">
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : selected ? "Save account" : "Create account"}
          </button>
          {selected && (
            <>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => submit("otp")}
              >
                {selected.otp_enabled ? "Turn OTP off" : "Turn OTP on"}
              </button>
              <button
                type="button"
                className="button"
                disabled={busy || !form.password}
                onClick={() => submit("reset-password")}
              >
                Reset password
              </button>
            </>
          )}
        </div>
        <p className="muted small">
          OTP is enabled for every new account. Security changes sign the
          affected user out. A password reset requires a new permanent password
          at next login.
        </p>
      </form>
    </>
  );
}
export function AuditView() {
  const [users, setUsers] = useState([]),
    [filters, setFilters] = useState({
      user: "",
      record: "",
      action: "",
      from: "",
      to: "",
    }),
    [data, setData] = useState({ events: [], page: 0, hasMore: false }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(page = 0) {
    setBusy(true);
    setError("");
    try {
      setData(
        await api(
          `audit?${new URLSearchParams({ ...filters, page: String(page) })}`,
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
    api("users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data.events, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `plu-audit-page-${data.page + 1}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SUPERVISION</p>
          <h1>Audit log</h1>
          <p className="subtitle">
            Attributed, append-only history. Dates are filtered in UTC.
          </p>
        </div>
        <button
          className="button"
          onClick={download}
          disabled={!data.events.length}
        >
          Export this page
        </button>
      </div>
      <form
        className="panel admin-panel"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <div className="field-grid">
          <label className="field">
            Performed by
            <select
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Record ID
            <input
              value={filters.record}
              onChange={(e) =>
                setFilters({ ...filters, record: e.target.value })
              }
            />
          </label>
          <label className="field">
            Action type
            <select
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
            >
              <option value="">All actions</option>
              {[
                "record.created",
                "record.fields_edited",
                "record.status_changed",
                "record.nin_unmasked",
                "account.create_requested",
                "account.created",
                "account.updated",
                "account.otp_toggled",
                "account.password_reset_requested",
                "account.password_reset_triggered",
                "account.deactivated",
                "account.reactivated",
                "account.security_action_failed",
                "account.password_change_requested",
                "account.password_changed",
                "auth.password_verified",
                "auth.otp_verified",
                "seed.account_created",
              ].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          {["from", "to"].map((k) => (
            <label key={k} className="field">
              {k === "from" ? "From date" : "Through date"}
              <input
                type="date"
                value={filters[k]}
                onChange={(e) =>
                  setFilters({ ...filters, [k]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
        <button className="button primary" disabled={busy}>
          Apply filters
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="panel admin-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>WHEN</th>
                <th>WHO</th>
                <th>ACTION / TARGET</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((a) => (
                <tr key={a.id}>
                  <td>
                    {new Date(a.created_at).toLocaleString("en-GB", {
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </td>
                  <td>
                    {a.actor_name || "Seed provisioner"}
                    <small>{a.actor_email}</small>
                  </td>
                  <td>
                    {a.action}
                    <small>{a.record_id || a.target_user_id}</small>
                  </td>
                  <td>
                    <pre className="audit-detail">
                      {JSON.stringify(a.detail, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {busy && (
          <p className="empty" role="status">
            Loading audit events…
          </p>
        )}
        {!busy && !data.events.length && (
          <p className="empty">No audit events match these filters.</p>
        )}
        <div className="table-bottom">
          <button
            className="button"
            disabled={busy || data.page === 0}
            onClick={() => load(data.page - 1)}
          >
            Previous
          </button>
          <span>Page {data.page + 1}</span>
          <button
            className="button"
            disabled={busy || !data.hasMore}
            onClick={() => load(data.page + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </>
  );
}
