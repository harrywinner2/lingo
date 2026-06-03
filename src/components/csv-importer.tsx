"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, Check, X } from "lucide-react";
import { importPrompts } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, Select } from "@/components/ui/primitives";

type Row = Record<string, string>;
const FIELDS = [
  { key: "pivotText", label: "Prompt text", required: true },
  { key: "domain", label: "Domain", required: false },
  { key: "sceneDescription", label: "Scene description", required: false },
  { key: "difficulty", label: "Difficulty", required: false },
  { key: "targetN", label: "Recordings wanted", required: false },
] as const;

function guess(headers: string[], field: string) {
  const f = field.toLowerCase();
  return (
    headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, "") === f) ||
    headers.find((h) => h.toLowerCase().includes(f.slice(0, 4))) ||
    (field === "pivotText"
      ? headers.find((h) => /text|prompt|english|french|phrase|sentence/i.test(h))
      : undefined) ||
    ""
  );
}

export function CsvImporter({ campaignId }: { campaignId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File) {
    setStatus(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter(Boolean);
        setHeaders(hs);
        setRows(res.data);
        const m: Record<string, string> = {};
        for (const f of FIELDS) m[f.key] = guess(hs, f.key);
        setMapping(m);
      },
      error: () => setStatus("Could not parse that file."),
    });
  }

  const mapped = rows
    .map((r) => ({
      pivotText: (r[mapping.pivotText] ?? "").trim(),
      domain: r[mapping.domain]?.trim() || null,
      sceneDescription: r[mapping.sceneDescription]?.trim() || null,
      difficulty: r[mapping.difficulty]?.trim() || null,
      targetN: r[mapping.targetN] ? Number(r[mapping.targetN]) : undefined,
    }))
    .filter((r) => r.pivotText.length > 0);

  async function submit() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await importPrompts(campaignId, mapped);
      setStatus(`Imported ${res.created} prompt${res.created === 1 ? "" : "s"} ✓`);
      setRows([]);
      setHeaders([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-accent-600" />
          <h3 className="font-semibold">Import prompts from CSV</h3>
        </div>
        <a
          href={
            "data:text/csv;charset=utf-8," +
            encodeURIComponent(
              "prompt_text,domain,scene_description,difficulty,recordings_wanted\n" +
                "Where are you from?,greetings,Two people meeting at a market,easy,3\n" +
                "How much does this cost?,market,Buying tomatoes from a vendor,easy,3\n",
            )
          }
          download="lingo-prompts-template.csv"
          className="text-sm font-semibold text-accent-600 hover:underline"
        >
          Download template
        </a>
      </div>

      {rows.length === 0 ? (
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-paper px-6 py-10 text-center transition hover:border-primary/60">
          <Upload className="h-7 w-7 text-muted" />
          <span className="font-semibold">Choose a CSV file</span>
          <span className="text-sm text-muted">
            One prompt per row. Columns are matched automatically.
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  {f.label}
                  {f.required && <span className="text-danger"> *</span>}
                </label>
                <Select
                  value={mapping[f.key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [f.key]: e.target.value }))
                  }
                >
                  <option value="">— none —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">
              Preview · {mapped.length} valid row{mapped.length === 1 ? "" : "s"}
            </p>
            <div className="max-h-64 overflow-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-paper text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Prompt</th>
                    <th className="px-3 py-2">Domain</th>
                    <th className="px-3 py-2">N</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-2">{r.pivotText}</td>
                      <td className="px-3 py-2 text-muted">{r.domain ?? "—"}</td>
                      <td className="px-3 py-2 text-muted">{r.targetN ?? 3}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={busy || mapped.length === 0}>
              <Check className="h-4 w-4" />
              {busy ? "Importing…" : `Import ${mapped.length}`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRows([]);
                setHeaders([]);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {status && (
        <p className="mt-3 text-sm font-semibold text-accent-600">{status}</p>
      )}
    </Card>
  );
}
