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
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Users,
  LayoutDashboard,
  MapPin,
  ClipboardList,
  ExternalLink,
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
import Login from "./Login";
import {
  statuses,
  educationLevels,
  districts,
  skills,
  ageFromDOB,
  maskNIN,
  normalizePhone,
  validPhone,
  emptyForm,
  makeRecords,
} from "./data";

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
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
  { id: "districts", label: "District overview", icon: MapPin },
];
const PreviewContext = createContext(null);

export function PreviewProvider({ children }) {
  // Deliberately temporary session-only state. Refresh restores synthetic fixtures.
  const [records, setRecords] = useState(makeRecords);
  const pathname = usePathname();
  const route = pathname.slice(1) || "overview";
  const router = useRouter();
  const [notice, setNotice] = useState("");
  // Presentation gate only: no credential handling or authentication provider.
  const [entered, setEntered] = useState(false);
  const [arriving, setArriving] = useState(false);
  useEffect(() => {
    if (!arriving) return;
    document.querySelector("main")?.focus();
    const timer = setTimeout(() => setArriving(false), 500);
    return () => clearTimeout(timer);
  }, [arriving, pathname]);
  useEffect(() => {
    // Keep links saved during the Vite preview working.
    if (window.location.hash.startsWith("#/")) {
      router.replace(window.location.hash.slice(1));
    }
  }, [router]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const addRecord = (values, status, existingId) => {
    const now = new Date().toISOString();
    const id =
      existingId ||
      `PLU-2026-${Math.max(1041, ...records.map((r) => Number(r.id.split("-").at(-1)))) + 1}`;
    const old = records.find((r) => r.id === existingId);
    const record = {
      ...values,
      ...(ageFromDOB(values.dob) >= 18
        ? { guardianName: "", guardianPhone: "", consent: false }
        : {}),
      id,
      status,
      created: old?.created || now,
      source:
        old?.source || (route === "register" ? "Self-service" : "Staff entry"),
      timeline: [
        ...(old?.timeline || []),
        {
          status,
          date: now,
          note:
            status === "draft"
              ? "Draft saved in this session."
              : "Registration submitted for review.",
        },
      ],
    };
    setRecords((rs) =>
      old ? rs.map((r) => (r.id === id ? record : r)) : [record, ...rs],
    );
    return record;
  };
  const updateStatus = (id, status, note) => {
    setRecords((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              timeline: [
                ...r.timeline,
                {
                  status,
                  date: new Date().toISOString(),
                  note: note || "Registration approved by demo staff.",
                },
              ],
            }
          : r,
      ),
    );
    setNotice(`Registration ${status}.`);
  };
  return (
    <PreviewContext.Provider
      value={{
        records,
        route,
        router,
        notice,
        setNotice,
        entered,
        setEntered,
        arriving,
        setArriving,
        addRecord,
        updateStatus,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}

export default function App({ route }) {
  const {
    records,
    router,
    notice,
    setNotice,
    entered,
    setEntered,
    arriving,
    setArriving,
    addRecord,
    updateStatus,
  } = useContext(PreviewContext);
  const publicView = ["register", "status"].includes(route);
  const editId = route.startsWith("edit/")
    ? decodeURIComponent(route.slice(5))
    : null;
  const editRecord = records.find((r) => r.id === editId);
  if (route === "login" || (!publicView && !entered)) {
    return (
      <Login
        onEnter={() => {
          setEntered(true);
          setArriving(true);
          if (route === "login") {
            router.replace("/overview");
          }
          window.scrollTo(0, 0);
        }}
      />
    );
  }
  return (
    <div
      className={`${publicView ? "public-app" : "app"}${arriving ? " workspace-arrival" : ""}`}
    >
      {publicView ? (
        <header className="public-header">
          <Brand />
          <nav>
            <Link href="/register">Register</Link>
            <Link href="/status">Check status</Link>
            <Link href="/overview">
              Staff workspace <ArrowUpRight size={14} />
            </Link>
          </nav>
        </header>
      ) : (
        <aside className="sidebar">
          <Brand />
          <div className="workspace-label">REGISTRATION WORKSPACE</div>
          <nav>
            {links.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                className={route === id ? "active" : ""}
                href={`/${id}`}
              >
                <Icon size={18} />
                {label}
                {id === "registrations" && (
                  <span className="nav-count">{records.length}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="sidebar-public">
            <div className="workspace-label">PUBLIC PORTAL</div>
            <Link href="/register">
              Self-service registration <ArrowUpRight size={16} />
            </Link>
            <Link href="/status">
              Check registration status <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="sidebar-bottom">
            <div className="demo-card">
              <span className="demo-dot" /> PREVIEW WORKSPACE
              <p>Mock data. Changes last until refresh.</p>
            </div>
            <div className="staff-profile">
              <span className="avatar">PS</span>
              <div>
                <strong>PLU Staff</strong>
                <small>Demonstration account</small>
              </div>
            </div>
          </div>
        </aside>
      )}
      <div className="main-shell">
        {!publicView && (
          <header className="topbar">
            <span>
              Youth programme <ChevronRight size={13} />{" "}
              <strong>
                {editId
                  ? "Edit draft"
                  : links.find((l) => l.id === route)?.label || "Overview"}
              </strong>
            </span>
            <span className="topbar-right">
              <span className="demo-dot" /> Preliminary build{" "}
              <span className="topbar-divider" /> UGANDA
            </span>
          </header>
        )}
        <main tabIndex={-1}>
          {route === "overview" ? (
            <Overview records={records} updateStatus={updateStatus} />
          ) : route === "registrations" ? (
            <>
              <PageHeading
                eyebrow="REGISTRATION MANAGEMENT"
                title="Youth registrations"
                subtitle="Review applications. Follow progress. Keep every registration moving."
                action
              />
              <RegisterTable records={records} updateStatus={updateStatus} />
            </>
          ) : route === "districts" ? (
            <DistrictView records={records} />
          ) : route === "staff-entry" || editRecord ? (
            <RegistrationForm
              key={route}
              staff
              initial={editRecord}
              onSave={addRecord}
            />
          ) : route === "register" ? (
            <RegistrationForm key="public" onSave={addRecord} />
          ) : route === "status" ? (
            <StatusCheck records={records} />
          ) : (
            <div className="empty">
              <h1>Page not found</h1>
              <Link href="/overview">Return to overview</Link>
            </div>
          )}
        </main>
        <footer>
          <span>
            Patriotic League of Uganda <span className="footer-dot">•</span>{" "}
            Youth Registration
          </span>
          <span>Patriotism. Unity. Service.</span>
        </footer>
      </div>
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
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
  );
}
function PageHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      {action && (
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
      "Across all sample districts",
    ],
    [
      "Awaiting review",
      records.filter((r) => ["submitted", "pending review"].includes(r.status))
        .length,
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
      records.filter((r) => r.status === "needs correction").length,
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
        subtitle="A clear view of registrations, reviews and participation across Uganda."
        action
      />
      <div className="welcome-strip">
        <div className="strip-icon">
          <Users size={24} />
        </div>
        <div>
          <strong>Building participation, one registration at a time.</strong>
          <p>
            Capture details in the field or let young people register
            themselves.
          </p>
        </div>
        <Link href="/register">
          Open public registration <ArrowUpRight size={17} />
        </Link>
      </div>
      <Stats records={records} />
      <div className="overview-columns">
        <section className="panel pipeline-panel">
          <div className="section-top">
            <div>
              <p className="eyebrow">REGISTRATION JOURNEY</p>
              <h2>A clear path forward</h2>
            </div>
            <span className="muted small">All session records</span>
          </div>
          <div className="pipeline">
            {["draft", "submitted", "pending review", "approved"].map(
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
              {records.filter((r) => r.status === "needs correction").length}{" "}
              registrations need updated details
            </span>
            <Link href="/registrations">
              Review register <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="district-callout">
          <div className="section-top">
            <p className="eyebrow">DISTRICT PARTICIPATION</p>
            <MapPin size={20} />
          </div>
          <div className="district-number">
            {new Set(records.map((r) => r.district).filter(Boolean)).size}
            <span>/ 146</span>
          </div>
          <h3>Districts in this preview</h3>
          <p>A representative sample to explore a national view.</p>
          <Link href="/districts">
            Explore district overview <ArrowUpRight size={17} />
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
    [district, setDistrict] = useState("all"),
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
            aria-label="Filter by district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="all">All districts</option>
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
              <th>DISTRICT</th>
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
              setDistrict("all");
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
  const [action, setAction] = useState(""),
    [note, setNote] = useState("");
  return (
    <div className="record-detail">
      <div>
        <p className="eyebrow">REGISTRANT DETAILS</p>
        <dl>
          {[
            ["Phone", r.phone],
            ["NIN", maskNIN(r.nin)],
            [
              "Date of birth",
              r.dob ? `${dateLabel(r.dob)} · ${ageFromDOB(r.dob)} years` : "—",
            ],
            ["Subcounty", r.subcounty],
            ["Entry mode", r.source],
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
        {r.status === "draft" ? (
          <Link className="button primary" href={`/edit/${r.id}`}>
            Continue draft <ArrowRight size={16} />
          </Link>
        ) : (
          <div className="review-actions">
            <button
              className="button primary"
              disabled={r.status === "approved"}
              onClick={() => {
                updateStatus(r.id, "approved");
                setAction("");
              }}
            >
              <Check size={16} />
              Approve
            </button>
            <button
              className="button"
              onClick={() => {
                setAction("needs correction");
                setNote("");
              }}
            >
              Request correction
            </button>
            <button
              className="button danger"
              disabled={r.status === "rejected"}
              onClick={() => {
                setAction("rejected");
                setNote("");
              }}
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
              if (!note.trim()) return;
              updateStatus(r.id, action, note.trim());
              setAction("");
              setNote("");
            }}
          >
            <label>
              {action === "rejected"
                ? "Reason for rejection"
                : "Details to correct"}
              <textarea
                autoFocus
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a clear note for the registrant"
              />
            </label>
            <div className="button-row">
              <button className="button primary" type="submit">
                Confirm {action === "rejected" ? "rejection" : "request"}
              </button>
              <button
                className="button"
                type="button"
                onClick={() => setAction("")}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      <div>
        <p className="eyebrow">STATUS TIMELINE</p>
        <ol className="timeline">
          {[...r.timeline].reverse().map((t, i) => (
            <li key={i}>
              <strong>{titleCase(t.status)}</strong>
              <time>
                {new Date(t.date).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
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
  const [values, setValues] = useState(() =>
      initial ? { ...initial } : emptyForm(),
    ),
    [ninFocus, setNinFocus] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState("");
  const age = ageFromDOB(values.dob),
    minor = age !== null && age < 18;
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  function save(status) {
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
    const record = onSave(values, status, initial?.id);
    setResult(record);
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
            ? "Continue this draft from the register during this session."
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
                  setValues(emptyForm());
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
            <Link className="button primary" href="/status">
              Check my status <ArrowRight size={17} />
            </Link>
          )}
        </div>
        <small className="muted">
          Preview only. This registration will reset when the page refreshes.
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
            save("submitted");
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
                hint="Use a fictional identifier for this preview."
              >
                <input
                  required
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
                  placeholder="Enter a demo NIN"
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
              <Field label="District">
                <select
                  required
                  value={values.district}
                  onChange={(e) => {
                    change("district", e.target.value);
                    change("subcounty", "");
                  }}
                >
                  <option value="">Select district</option>
                  {districts.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Subcounty">
                <input
                  required
                  value={values.subcounty}
                  onChange={(e) => change("subcounty", e.target.value)}
                  placeholder="Enter subcounty"
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
          <div className="form-actions">
            <span>Preview · use fictional details only</span>
            <div className="button-row">
              {staff && (
                <button
                  className="button"
                  type="button"
                  onClick={() => save("draft")}
                >
                  Save draft
                </button>
              )}
              <button className="button primary" type="submit">
                Submit registration <ArrowRight size={17} />
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
              : "After you submit, your registration will be reviewed. You can check its progress at any time during this preview."}
          </p>
          <ol>
            <li>Enter registration details</li>
            <li>Submit for review</li>
            <li>Follow the registration status</li>
          </ol>
          <div className="aside-note">
            <CircleHelp size={18} />
            <p>This is a preliminary preview using local, temporary data.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
function StatusCheck({ records }) {
  const [phone, setPhone] = useState(""),
    [reference, setReference] = useState(""),
    [lookup, setLookup] = useState(null);
  const record =
    lookup &&
    records.find(
      (r) =>
        normalizePhone(r.phone) === lookup.phone && r.id === lookup.reference,
    );
  return (
    <div className="status-page">
      <p className="eyebrow">PUBLIC STATUS CHECK</p>
      <h1>
        A little clarity.
        <br />
        Every step of the way.
      </h1>
      <p className="subtitle">Check where your youth registration stands.</p>
      <form
        className="panel status-form"
        onSubmit={(e) => {
          e.preventDefault();
          setLookup({
            phone: normalizePhone(phone),
            reference: reference.trim().toUpperCase(),
          });
        }}
      >
        <Field label="Phone number">
          <input
            required
            type="tel"
            placeholder="0700000000"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setLookup(null);
            }}
          />
        </Field>
        <Field label="Registration reference">
          <input
            required
            placeholder="PLU-2026-1042"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              setLookup(null);
            }}
          />
        </Field>
        <button className="button primary" type="submit">
          Check registration status <ArrowRight size={18} />
        </button>
        <div className="demo-hint">
          <strong>Try a sample registration</strong>
          <button
            type="button"
            onClick={() => {
              setPhone("0700000000");
              setReference("PLU-2026-1042");
              setLookup(null);
            }}
          >
            Use demo details <ArrowUpRight size={14} />
          </button>
        </div>
      </form>
      {lookup && (
        <div className="panel status-result" role="status">
          {record ? (
            <>
              <Badge
                status={
                  ["draft", "submitted", "pending review"].includes(
                    record.status,
                  )
                    ? "pending review"
                    : record.status
                }
              />
              <h2>
                {record.status === "approved"
                  ? "Your registration is approved."
                  : record.status === "needs correction"
                    ? "A few details need your attention."
                    : record.status === "rejected"
                      ? "Your registration was not approved."
                      : record.status === "draft"
                        ? "Your registration is still a draft."
                        : "Your registration is awaiting review."}
              </h2>
              <p>
                {["needs correction", "rejected"].includes(record.status)
                  ? record.timeline.at(-1).note
                  : record.status === "draft"
                    ? "Ask staff to complete and submit your registration."
                    : "Keep your reference for future follow-up."}
              </p>
              <small>
                {record.id} · Updated {dateLabel(record.timeline.at(-1).date)}
              </small>
            </>
          ) : (
            <>
              <h2>No matching registration</h2>
              <p>
                Check that your phone number and reference are correct. Preview
                records reset on refresh.
              </p>
            </>
          )}
        </div>
      )}
      <p className="public-bottom">
        Not registered yet?{" "}
        <Link href="/register">
          Start your registration <ArrowUpRight size={14} />
        </Link>
      </p>
    </div>
  );
}
function DistrictView({ records }) {
  const [query, setQuery] = useState("");
  const rollups = districts
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
        title="Participation across districts."
        subtitle="One shared register. A district-by-district view of youth participation."
      />
      <Stats records={records} />
      <section className="panel district-chart">
        <div className="section-top">
          <div>
            <p className="eyebrow">DISTRICT ROLLUP</p>
            <h2>Local registrations. National perspective.</h2>
            <p className="muted small">
              12 sample districts from the supplied 146-district structure.
              Counts include drafts.
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
            aria-label="Find a district"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a district…"
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
        ) && (
          <div className="empty">No sample districts match your search.</div>
        )}
        <div className="panel-foot">
          Illustrative data only · Totals update as you register and review
          people in this session.
        </div>
      </section>
    </>
  );
}
