"use client";

import React, {
  useEffect,
  useState,
  useId,
  createContext,
  useContext,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Users,
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  CircleHelp,
  X,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "./api";
import { canCreate, canEdit, canReview } from "./access";
import { UsersAdmin, AuditView } from "./Admin";
import {
  statuses,
  educationLevels,
  districts,
  skills,
  ageFromDOB,
  maskNIN,
  validPhone,
  emptyForm,
} from "./data";

const titleCase = (s) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const dateLabel = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
function Badge({ status }) {
  return (
    <span className={`badge ${status.replaceAll(" ", "-")}`}>
      <span />
      {titleCase(status)}
    </span>
  );
}
function Brand() {
  return (
    <Link className="brand" href="/overview">
      <Image
        src="/brand/plu-logo.webp"
        alt="PLU emblem"
        width={48}
        height={48}
      />
      <span>
        PLU <b>YOUTH REGISTER</b>
      </span>
    </Link>
  );
}
const links = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "registrations", label: "Registrations", icon: Users },
  { id: "staff-entry", label: "New registration", icon: ClipboardList },
  { id: "districts", label: "Division overview", icon: MapPin },
];
const WorkspaceContext = createContext(null);
export default function App({ route, initialActor, initialRecords }) {
  const actor = initialActor;
  const [records, setRecords] = useState(initialRecords),
    [notice, setNotice] = useState("");
  const router = useRouter();
  const editRecord = route.startsWith("edit/")
    ? records.find((r) => r.id === route.split("/")[1])
    : null;
  async function refresh() {
    setRecords(await api("records"));
    router.refresh();
  }
  async function addRecord(values, status, id) {
    const old = records.find((r) => r.id === id);
    const record = await api("records", {
      action: "save",
      values,
      status,
      id,
      version: old?.version,
    });
    await refresh();
    setNotice("Registration saved.");
    return record;
  }
  async function updateStatus(id, status, reason = "") {
    await api("records", {
      action: "review",
      id,
      status,
      reason,
      version: records.find((r) => r.id === id)?.version,
    });
    await refresh();
    setNotice("Status updated.");
  }
  const navigation = [
    ...links.filter((l) => l.id !== "staff-entry" || canCreate(actor)),
    ...(actor.role === "admin-full"
      ? [
          { id: "users", label: "User accounts", icon: ShieldCheck },
          { id: "audit", label: "Audit log", icon: ClipboardList },
        ]
      : []),
  ];
  return (
    <WorkspaceContext.Provider value={{ actor }}>
      <div className="app">
        <aside className="sidebar">
          <Brand />
          <div className="workspace-label">REGISTRATION WORKSPACE</div>
          <nav>
            {navigation.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                className={route === id ? "active" : ""}
                href={`/${id}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="staff-profile">
              <span className="avatar">
                {actor.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{actor.name}</strong>
                <small>{actor.role}</small>
                <small>{actor.division || "All Kampala divisions"}</small>
                {actor.is_test && <small>SEED / TEST ACCOUNT</small>}
              </div>
            </div>
            <button
              className="button"
              onClick={async () => {
                try {
                  await api("auth/logout", {});
                  window.location.assign("/login");
                } catch (e) {
                  setNotice(e.message);
                }
              }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <span>
              Youth programme <ChevronRight size={13} />
              <strong>
                {navigation.find((l) => l.id === route)?.label ||
                  "Edit registration"}
              </strong>
            </span>
            <span className="topbar-right">KAMPALA</span>
          </header>
          <main tabIndex={-1}>
            {route === "overview" ? (
              <Overview records={records} updateStatus={updateStatus} />
            ) : route === "registrations" ? (
              <>
                <PageHeading
                  eyebrow="REGISTRATION MANAGEMENT"
                  title="Youth registrations"
                  subtitle="Review applications and follow progress."
                  action
                />
                <RegisterTable records={records} updateStatus={updateStatus} />
              </>
            ) : route === "districts" ? (
              <DivisionView records={records} />
            ) : route === "users" ? (
              <UsersAdmin actor={actor} />
            ) : route === "audit" ? (
              <AuditView />
            ) : route === "staff-entry" || editRecord ? (
              <RegistrationForm
                key={route}
                staff
                initial={editRecord}
                onSave={addRecord}
              />
            ) : null}
          </main>
          <footer>
            <span>Patriotic League of Uganda · Youth Registration</span>
            <span>Patriotism. Unity. Service.</span>
          </footer>
        </div>
        {notice && (
          <div role="status" className="toast">
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
function PageHeading({ eyebrow, title, subtitle, action }) {
  const { actor } = useContext(WorkspaceContext);
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      {action && canCreate(actor) && (
        <Link className="button primary" href="/staff-entry">
          <Plus size={17} /> New registration
        </Link>
      )}
    </div>
  );
}
function Stats({ records }) {
  const stats = [
    [
      "Total registrations",
      records.length,
      Users,
      "Within your division access",
    ],
    [
      "Awaiting review",
      records.filter((r) => ["submitted"].includes(r.status)).length,
      Clock3,
      "Ready for your attention",
    ],
    [
      "Approved",
      records.filter((r) => r.status === "approved").length,
      ShieldCheck,
      "Completed registrations",
    ],
    [
      "Needs correction",
      records.filter((r) => r.status === "needs_correction").length,
      ClipboardList,
      "Waiting for updated details",
    ],
  ];
  return (
    <div className="stats">
      {stats.map(([label, value, Icon, caption], i) => (
        <div className={`stat stat-${i}`} key={label}>
          <div>
            {label}
            <Icon size={18} />
          </div>
          <strong>{value.toLocaleString()}</strong>
          <small>
            {i === 2 && <span className="tiny-dot" />}
            {caption}
          </small>
        </div>
      ))}
    </div>
  );
}
function Overview({ records, updateStatus }) {
  return (
    <>
      <PageHeading
        eyebrow="YOUTH REGISTRATION / OVERVIEW"
        title="Every young person. A place to begin."
        subtitle="A clear view of registrations, reviews and participation across Kampala."
        action
      />
      <Stats records={records} />
      <div className="overview-columns">
        <section className="panel pipeline-panel">
          <div className="section-top">
            <div>
              <p className="eyebrow">REGISTRATION JOURNEY</p>
              <h2>A clear path forward</h2>
            </div>
            <span className="muted small">Saved records</span>
          </div>
          <div className="pipeline">
            {["draft", "submitted", "needs_correction", "approved"].map(
              (s, i) => (
                <React.Fragment key={s}>
                  <div>
                    <span className={`step-icon step-${i}`}>
                      {i === 3 ? <Check size={19} /> : i + 1}
                    </span>
                    <strong>
                      {records.filter((r) => r.status === s).length}
                    </strong>
                    <small>{titleCase(s)}</small>
                  </div>
                  {i < 3 && <ArrowRight className="step-arrow" size={18} />}
                </React.Fragment>
              ),
            )}
          </div>
          <div className="panel-foot">
            <span>
              <span className="tiny-dot red" />{" "}
              {records.filter((r) => r.status === "needs_correction").length}{" "}
              registrations need updated details
            </span>
            <Link href="/registrations">
              Review register <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="district-callout">
          <div className="section-top">
            <p className="eyebrow">DIVISION PARTICIPATION</p>
            <MapPin size={20} />
          </div>
          <div className="district-number">
            {new Set(records.map((r) => r.district).filter(Boolean)).size}
            <span>/ 5</span>
          </div>
          <h3>Divisions represented</h3>
          <p>Participation across Kampala’s five divisions.</p>
          <Link href="/districts">
            Explore division overview <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
      <RegisterTable records={records} updateStatus={updateStatus} compact />
    </>
  );
}
function RegisterTable({ records, updateStatus, compact = false }) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [district, setDivision] = useState("all"),
    [education, setEducation] = useState("all"),
    [open, setOpen] = useState(null),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [search, status, district, education]);
  const filtered = records.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (district === "all" || r.district === district) &&
      (education === "all" || r.education === education) &&
      `${r.name} ${r.id} ${r.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pageSize = compact ? 5 : 10,
    pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    safePage = Math.min(page, pages - 1),
    visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
  return (
    <section className="panel register-panel">
      <div className="section-top">
        <div>
          <h2>
            {compact ? "Registration register" : "All registrations"}{" "}
            <span className="count-chip">{records.length}</span>
          </h2>
          <p className="muted small">
            {compact
              ? "The latest entries and their next steps."
              : "Select a registration to view details and review its progress."}
          </p>
        </div>
        {compact && (
          <Link className="text-link" href="/registrations">
            View all registrations <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      <div className="table-filters">
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="Search registrations"
            placeholder="Search name, phone or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="filter-selects">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by division"
            value={district}
            onChange={(e) => setDivision(e.target.value)}
          >
            <option value="all">All divisions</option>
            {districts.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filter by education"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          >
            <option value="all">All education</option>
            {educationLevels.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>REGISTRANT</th>
              <th>DIVISION</th>
              <th>EDUCATION</th>
              <th>STATUS</th>
              <th>DATE REGISTERED</th>
              <th>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <React.Fragment key={r.id}>
                <tr className={open === r.id ? "selected-row" : ""}>
                  <td>
                    <button
                      className="registrant-button"
                      aria-expanded={open === r.id}
                      onClick={() => setOpen(open === r.id ? null : r.id)}
                    >
                      <span className="initials">
                        {r.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <span>
                        <strong>{r.name || "Unnamed draft"}</strong>
                        <small>{r.id}</small>
                      </span>
                    </button>
                  </td>
                  <td>{r.district || "—"}</td>
                  <td>{titleCase(r.education || "—")}</td>
                  <td>
                    <Badge status={r.status} />
                  </td>
                  <td className="muted">{dateLabel(r.created)}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View ${r.name || "draft"}`}
                      aria-expanded={open === r.id}
                      onClick={() => setOpen(open === r.id ? null : r.id)}
                    >
                      <ChevronDown
                        className={open === r.id ? "rotated" : ""}
                        size={17}
                      />
                    </button>
                  </td>
                </tr>
                {open === r.id && (
                  <tr>
                    <td colSpan="6" className="detail-cell">
                      <RecordDetail record={r} updateStatus={updateStatus} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="empty">
          <Search size={26} />
          <h3>No registrations found</h3>
          <p>Try another search or clear your filters.</p>
          <button
            className="button"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setDivision("all");
              setEducation("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="table-bottom">
        <span>
          Showing {filtered.length ? safePage * pageSize + 1 : 0}–
          {Math.min((safePage + 1) * pageSize, filtered.length)} of{" "}
          {filtered.length} registrations
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page {safePage + 1} of {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={safePage + 1 >= pages}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
function RecordDetail({ record: r, updateStatus }) {
  const { actor } = useContext(WorkspaceContext);
  const [action, setAction] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [nin, setNin] = useState(null);
  useEffect(() => {
    if (nin === null) return;
    const timer = setTimeout(() => setNin(null), 30000);
    return () => clearTimeout(timer);
  }, [nin]);
  async function review(status) {
    setBusy(true);
    setError("");
    try {
      await updateStatus(r.id, status, note);
      setAction("");
      setNote("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="record-detail">
      <div>
        <p className="eyebrow">REGISTRANT DETAILS</p>
        <dl>
          {[
            ["Phone", r.phone],
            ["NIN", nin ?? r.ninMasked],
            ["Date of birth", r.dob],
            ["Locality / parish", r.subcounty],
            ["Skills / interests", r.skills.join(", ")],
            ...(ageFromDOB(r.dob) !== null && ageFromDOB(r.dob) < 18
              ? [
                  ["Guardian", r.guardianName],
                  ["Guardian phone", r.guardianPhone],
                  ["Guardian consent", r.consent ? "Provided" : "Not provided"],
                ]
              : []),
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="button-row">
          {canEdit(actor, r) && (
            <Link className="button primary" href={`/edit/${r.id}`}>
              Edit registration
            </Link>
          )}
          {actor.role === "admin-full" && r.hasNin && (
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                if (nin !== null) {
                  setNin(null);
                  return;
                }
                setBusy(true);
                try {
                  const result = await api("records", {
                    action: "unmask",
                    id: r.id,
                  });
                  setNin(result.nin);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {nin !== null ? "Hide NIN" : "Unmask NIN"}
            </button>
          )}
        </div>
        {canReview(actor, r) && (
          <div className="review-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => review("approved")}
            >
              Approve
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setAction("needs_correction")}
            >
              Request correction
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => setAction("rejected")}
            >
              Reject
            </button>
          </div>
        )}
        {action && (
          <form
            className="action-form"
            onSubmit={(e) => {
              e.preventDefault();
              review(action);
            }}
          >
            <label>
              {action === "rejected"
                ? "Reason for rejection"
                : "Details to correct"}
              <textarea
                required
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={busy}>
              Confirm decision
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setAction("")}
            >
              Cancel
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
      <div>
        <p className="eyebrow">STATUS TIMELINE</p>
        <ol className="timeline">
          {[...r.timeline].reverse().map((t, i) => (
            <li key={i}>
              <strong>{titleCase(t.status)}</strong>
              <time>{new Date(t.date).toLocaleString("en-GB")}</time>
              <p>{t.actor}</p>
              <p>{t.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
function Field({ label, children, hint }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(children, {
        id,
        "aria-describedby": hint ? `${id}-hint` : undefined,
      })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
function RegistrationForm({ staff = false, initial, onSave }) {
  const router = useRouter();
  const { actor } = useContext(WorkspaceContext);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState(() =>
      initial
        ? { ...initial, nin: "" }
        : { ...emptyForm(), district: actor.division || "" },
    ),
    [ninFocus, setNinFocus] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState("");
  const age = ageFromDOB(values.dob),
    minor = age !== null && age < 18;
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  async function save(status) {
    if (busy) return;
    setError("");
    if (
      status !== "draft" &&
      (!validPhone(values.phone) ||
        (minor && !validPhone(values.guardianPhone)))
    ) {
      setError(
        "Enter a valid Ugandan phone number, such as 0700000000 or +256700000000.",
      );
      return;
    }
    if (
      status !== "draft" &&
      (!values.name.trim() ||
        !values.subcounty.trim() ||
        (minor && !values.guardianName.trim()))
    ) {
      setError("Please complete all required details.");
      return;
    }
    if (status !== "draft" && age === null) {
      setError("Please enter a valid date of birth.");
      return;
    }
    setBusy(true);
    try {
      const record = await onSave(values, status, initial?.id);
      setResult(record);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="confirmation panel">
        <span className="success-icon">
          <Check size={30} />
        </span>
        <p className="eyebrow">
          {result.status === "draft" ? "DRAFT SAVED" : "REGISTRATION RECEIVED"}
        </p>
        <h1>
          {result.status === "draft"
            ? "Ready to finish later."
            : staff
              ? "Registration submitted."
              : "You’re on the register."}
        </h1>
        <p>
          {result.status === "draft"
            ? "Continue this draft from the register."
            : "Your details are submitted and ready for review. Keep this reference to check progress."}
        </p>
        <div className="reference">
          <small>REGISTRATION REFERENCE</small>
          <strong>{result.id}</strong>
          <span>{result.name || "Unnamed draft"}</span>
        </div>
        <Badge status={result.status} />
        <div className="button-row">
          {staff ? (
            <>
              <button
                className="button primary"
                onClick={() => {
                  setValues({ ...emptyForm(), district: actor.division || "" });
                  setResult(null);
                  if (initial) router.push("/staff-entry");
                }}
              >
                Register another person <Plus size={17} />
              </button>
              <Link className="button" href="/registrations">
                View register
              </Link>
            </>
          ) : (
            <Link className="button primary" href="/registrations">
              View register <ArrowRight size={17} />
            </Link>
          )}
        </div>
        <small className="muted">
          Your registration has been saved securely.
        </small>
      </div>
    );
  return (
    <div className={staff ? "form-page" : "public-content"}>
      <PageHeading
        eyebrow={staff ? "STAFF ENTRY" : "PLU YOUTH REGISTRATION"}
        title={
          initial
            ? "Continue registration"
            : staff
              ? "Register a young person."
              : "Your participation starts here."
        }
        subtitle={
          staff
            ? "Capture the essentials. Submit for review. Move to the next person."
            : "Tell us a little about yourself to join the youth register."
        }
      />
      <div className="form-layout">
        <form
          className="panel registration-form"
          onSubmit={(e) => {
            e.preventDefault();
            save(
              initial &&
                ["submitted", "needs_correction", "approved"].includes(
                  initial.status,
                )
                ? initial.status
                : "submitted",
            );
          }}
        >
          <div className="form-section">
            <div className="form-section-title">
              <span>01</span>
              <div>
                <h2>Personal details</h2>
                <p>All fields are required unless marked optional.</p>
              </div>
            </div>
            <div className="field-grid">
              <Field label="Full name">
                <input
                  autoFocus={staff}
                  required
                  autoComplete="off"
                  value={values.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="Full name as on identification"
                />
              </Field>
              <Field label="Phone number" hint="Use 07… or +256… format.">
                <input
                  required
                  type="tel"
                  value={values.phone}
                  onChange={(e) => change("phone", e.target.value)}
                  placeholder="0700000000"
                />
              </Field>
              <Field
                label="National Identification Number (NIN)"
                hint={
                  initial?.hasNin
                    ? `Stored NIN: ${initial.ninMasked}. Leave blank to keep it.`
                    : "Enter the 14-character NIN."
                }
              >
                <input
                  required={!initial?.hasNin}
                  autoComplete="off"
                  value={
                    ninFocus
                      ? values.nin
                      : values.nin
                        ? maskNIN(values.nin)
                        : ""
                  }
                  onFocus={() => setNinFocus(true)}
                  onBlur={() => setNinFocus(false)}
                  onChange={(e) =>
                    change(
                      "nin",
                      e.target.value
                        .replace(/[^a-z0-9]/gi, "")
                        .toUpperCase()
                        .slice(0, 14),
                    )
                  }
                  placeholder={
                    initial?.hasNin ? "Enter replacement NIN" : "Enter NIN"
                  }
                />
              </Field>
              <Field
                label="Date of birth"
                hint={
                  age !== null
                    ? `${age} years old${minor ? " · Guardian details required" : ""}`
                    : "Age is calculated from your date of birth."
                }
              >
                <input
                  required
                  type="date"
                  max={new Date().toLocaleDateString("en-CA")}
                  value={values.dob}
                  onChange={(e) => change("dob", e.target.value)}
                />
              </Field>
            </div>
          </div>
          {minor && (
            <div className="form-section guardian-section">
              <div className="form-section-title">
                <ShieldCheck size={23} />
                <div>
                  <h2>Guardian details</h2>
                  <p>Registrants under 18 need a guardian’s consent.</p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="Guardian name">
                  <input
                    required
                    value={values.guardianName}
                    onChange={(e) => change("guardianName", e.target.value)}
                  />
                </Field>
                <Field label="Guardian phone">
                  <input
                    required
                    type="tel"
                    value={values.guardianPhone}
                    onChange={(e) => change("guardianPhone", e.target.value)}
                  />
                </Field>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  required
                  checked={values.consent}
                  onChange={(e) => change("consent", e.target.checked)}
                />
                The guardian has given consent for this registration.
              </label>
            </div>
          )}
          <div className="form-section">
            <div className="form-section-title">
              <span>02</span>
              <div>
                <h2>Location & education</h2>
                <p>Help us understand participation in your community.</p>
              </div>
            </div>
            <div className="field-grid">
              <Field label="Division">
                <select
                  required
                  disabled={!!initial || actor.role === "registration"}
                  value={values.district}
                  onChange={(e) => {
                    change("district", e.target.value);
                    change("subcounty", "");
                  }}
                >
                  <option value="">Select division</option>
                  {districts.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Locality / parish">
                <input
                  required
                  value={values.subcounty}
                  onChange={(e) => change("subcounty", e.target.value)}
                  placeholder="Enter locality / parish"
                />
              </Field>
              <Field label="Education level">
                <select
                  required
                  value={values.education}
                  onChange={(e) => change("education", e.target.value)}
                >
                  <option value="">Select education level</option>
                  {educationLevels.map((d) => (
                    <option key={d} value={d}>
                      {titleCase(d)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">
              <span>03</span>
              <div>
                <h2>
                  Skills & interests <small>(optional)</small>
                </h2>
                <p>Select all that apply.</p>
              </div>
            </div>
            <div className="skill-options">
              {skills.map((s) => (
                <label
                  className={values.skills.includes(s) ? "chosen" : ""}
                  key={s}
                >
                  <input
                    type="checkbox"
                    checked={values.skills.includes(s)}
                    onChange={() =>
                      change(
                        "skills",
                        values.skills.includes(s)
                          ? values.skills.filter((v) => v !== s)
                          : [...values.skills, s],
                      )
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {initial?.status === "needs_correction" && (
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => save("submitted")}
            >
              Resubmit for review
            </button>
          )}
          <div className="form-actions">
            <span>Changes are saved with an audit trail.</span>
            <div className="button-row">
              {staff && (!initial || initial.status === "draft") && (
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={() => save("draft")}
                >
                  Save draft
                </button>
              )}
              <button className="button primary" type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : initial
                    ? "Save changes"
                    : "Submit registration"}{" "}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </form>
        <aside className="form-aside">
          <span className="aside-icon">
            <ClipboardList size={25} />
          </span>
          <h2>{staff ? "Made for the field." : "What happens next?"}</h2>
          <p>
            {staff
              ? "One person, one registration. Keep a phone number and reference handy for follow-up."
              : "After submission, approvers review the record."}
          </p>
          <ol>
            <li>Enter registration details</li>
            <li>Submit for review</li>
            <li>Follow the registration status</li>
          </ol>
          <div className="aside-note">
            <CircleHelp size={18} />
            <p>Only authorized staff can access this register.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
function DivisionView({ records }) {
  const [query, setQuery] = useState("");
  const { actor } = useContext(WorkspaceContext);
  const rollups = (actor.role === "registration" ? [actor.division] : districts)
    .map((d) => ({
      name: d,
      total: records.filter((r) => r.district === d).length,
      approved: records.filter(
        (r) => r.district === d && r.status === "approved",
      ).length,
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const max = Math.max(1, ...rollups.map((d) => d.total));
  return (
    <>
      <PageHeading
        eyebrow="LEADERSHIP VIEW"
        title="Participation across divisions."
        subtitle="One shared register. A division-by-division view of youth participation."
      />
      <Stats records={records} />
      <section className="panel district-chart">
        <div className="section-top">
          <div>
            <p className="eyebrow">DIVISION ROLLUP</p>
            <h2>Local registrations. Kampala perspective.</h2>
            <p className="muted small">
              Five Kampala divisions. Counts include drafts.
            </p>
          </div>
          <span className="chart-key">
            <i />
            Approved <i />
            Other statuses
          </span>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="Find a division"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a division…"
          />
        </label>
        <div className="bar-chart">
          {rollups
            .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
            .map((d, i) => (
              <div className="bar-row" key={d.name}>
                <span className="bar-rank">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong>{d.name}</strong>
                <div
                  className="bar-track"
                  role="img"
                  aria-label={`${d.name}: ${d.total} registrations, ${d.approved} approved`}
                >
                  <div
                    className="bar-total"
                    style={{ width: `${(d.total / max) * 100}%` }}
                  >
                    <div
                      className="bar-approved"
                      style={{
                        width: `${d.total ? (d.approved / d.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <b>{d.total}</b>
                <span className="bar-percent">
                  {records.length
                    ? Math.round((d.total / records.length) * 100)
                    : 0}
                  %
                </span>
              </div>
            ))}
        </div>
        {!rollups.some((d) =>
          d.name.toLowerCase().includes(query.toLowerCase()),
        ) && <div className="empty">No divisions match your search.</div>}
        <div className="panel-foot">
          Totals reflect saved records within your access, including drafts.
        </div>
      </section>
    </>
  );
}
