import fs from 'node:fs';
const file='src/main.jsx';
let source=fs.readFileSync(file,'utf8');
source=source.replace('import React, { useEffect, useState, useId } from "react";', '"use client";\n\nimport React, { useEffect, useState, useId, createContext, useContext } from "react";\nimport Link from "next/link";\nimport Image from "next/image";\nimport { usePathname, useRouter } from "next/navigation";');
source=source.replace('import { createRoot } from "react-dom/client";\n','').replace('import "@fontsource-variable/geist";\n','').replace('import "./styles.css";\n','');
source=source.replace('function App() {','const PreviewContext = createContext(null);\n\nexport function PreviewProvider({ children }) {');
source=source.replace('const [route, setRoute] = useState(location.hash.slice(2) || "overview");','const pathname = usePathname();\n  const route = pathname.slice(1) || "overview";\n  const router = useRouter();');
const start=source.indexOf('  useEffect(() => {\n    const onHash');
const end=source.indexOf('  useEffect(() => {\n    if (!notice)',start);
if(start<0||end<0)throw Error('Hash lifecycle not found');
source=source.slice(0,start)+`  useEffect(() => {
    // Keep links saved during the Vite preview working.
    if (window.location.hash.startsWith('#/')) {
      router.replace(window.location.hash.slice(1));
    }
  }, [router]);
`+source.slice(end);
const marker='  const publicView = ["register", "status"].includes(route);';
source=source.replace(marker,`  return <PreviewContext.Provider value={{ records, route, router, notice, setNotice, entered, setEntered, arriving, setArriving, addRecord, updateStatus }}>{children}</PreviewContext.Provider>;
}

export default function App() {
  const { records, route, router, notice, setNotice, entered, setEntered, arriving, setArriving, addRecord, updateStatus } = useContext(PreviewContext);
${marker}`);
source=source.replace('            setRoute("overview");\n            location.hash = "/overview";', '            router.replace("/overview");');
source=source.replace('function RegistrationForm({ staff = false, initial, onSave }) {','function RegistrationForm({ staff = false, initial, onSave }) {\n  const router = useRouter();');
source=source.replace('location.hash = "/staff-entry"','router.push("/staff-entry")');
source=source.replace(/<a(?=[\s>])/g,'<Link').replaceAll('</a>','</Link>').replaceAll('href="#/','href="/').replaceAll('href={`#/','href={`/');
source=source.replace('<img src="/brand/plu-logo.webp" alt="PLU emblem" />','<Image src="/brand/plu-logo.webp" alt="PLU emblem" width={48} height={48} />');
source=source.replace('createRoot(document.getElementById("root")).render(<App />);','');
fs.writeFileSync('src/Dashboard.jsx',source);fs.unlinkSync(file);
let login=fs.readFileSync('src/Login.jsx','utf8');
login='"use client";\nimport Link from "next/link";\nimport Image from "next/image";\n'+login;
login=login.replace('import "./login.css";\n','').replace(/<a(?=[\s>])/g,'<Link').replaceAll('</a>','</Link>').replaceAll('href="#/','href="/').replace('<img','<Image').replace('width="65"','width={65}').replace('height="65"','height={65}');
fs.writeFileSync('src/Login.jsx',login);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.scripts={dev:'next dev --hostname 127.0.0.1',build:'next build',start:'next start --hostname 127.0.0.1',test:'node --test tests/*.test.js', 'test:e2e':'playwright test',typecheck:'tsc --noEmit','check:supabase':'node --env-file=.env.local scripts/check-supabase.mjs'};
delete pkg.devDependencies.vite;
fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
