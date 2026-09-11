export const statuses = [
  "draft",
  "submitted",
  "pending review",
  "approved",
  "rejected",
  "needs correction",
];
export const educationLevels = [
  "none",
  "primary",
  "O-level",
  "A-level",
  "vocational",
  "tertiary",
];
export const districts = [
  "Kampala",
  "Wakiso",
  "Gulu",
  "Jinja",
  "Mbale",
  "Mbarara",
  "Arua",
  "Lira",
  "Masaka",
  "Kabale",
  "Soroti",
  "Moroto",
];
export const skills = [
  "ICT",
  "Agriculture",
  "Trade",
  "Public speaking",
  "Sports",
  "Creative arts",
  "Community service",
  "Entrepreneurship",
];
export function ageFromDOB(dob, now = new Date()) {
  if (!dob) return null;
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date > now) return null;
  let age = now.getFullYear() - date.getFullYear();
  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  )
    age--;
  return age;
}
export const maskNIN = (value) =>
  value ? `•••• •••• ${value.slice(-4)}` : "Not provided";
export const normalizePhone = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `256${digits.slice(1)}` : digits;
};
export const validPhone = (value) => /^256\d{9}$/.test(normalizePhone(value));
export const emptyForm = () => ({
  name: "",
  nin: "",
  phone: "",
  dob: "",
  education: "",
  district: "",
  subcounty: "",
  skills: [],
  guardianName: "",
  guardianPhone: "",
  consent: false,
});
// Entirely synthetic fixtures. No storage, API, authentication, or real identifiers.
export function makeRecords() {
  const names = [
    "Amina Nakato",
    "Daniel Okello",
    "Grace Namukasa",
    "Isaac Kato",
    "Sarah Achieng",
    "Peter Mugisha",
    "Ruth Akello",
    "David Ssekitoleko",
    "Esther Nambasa",
    "Joseph Ouma",
    "Faith Atim",
    "Samuel Tumusiime",
  ];
  return Array.from({ length: 72 }, (_, i) => {
    const status = [
      "pending review",
      "approved",
      "submitted",
      "approved",
      "needs correction",
      "pending review",
      "approved",
      "draft",
      "rejected",
    ][i % 9];
    const created = new Date(2026, 8, 10 - (i % 9), 9 + (i % 8)).toISOString();
    return {
      id: `PLU-2026-${String(1042 + i).padStart(4, "0")}`,
      name:
        names[i % 12] +
        (i >= 12 ? ` ${String.fromCharCode(65 + Math.floor(i / 12))}.` : ""),
      nin: `DEMOONLY${String(1000 + i)}`,
      phone: `070000${String(i).padStart(4, "0")}`,
      dob: `${i % 10 === 0 ? 2010 : 1999 + (i % 7)}-04-12`,
      education: educationLevels[i % 6],
      district: districts[(i + Math.floor(i / 12)) % 12],
      subcounty: "Sample locality",
      skills: [skills[i % 8], skills[(i + 2) % 8]],
      guardianName: i % 10 === 0 ? "Demo Guardian" : "",
      guardianPhone: i % 10 === 0 ? "0700000999" : "",
      consent: i % 10 === 0,
      status,
      created,
      source: i % 3 === 0 ? "Self-service" : "Staff entry",
      timeline: [
        { status: "draft", date: created, note: "Registration started." },
        ...(status === "draft"
          ? []
          : [
              {
                status,
                date: created,
                note:
                  status === "needs correction"
                    ? "Please confirm your subcounty."
                    : "Demo registration update.",
              },
            ]),
      ],
    };
  });
}
