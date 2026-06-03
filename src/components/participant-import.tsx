"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Upload, UserPlus, Copy, Check, Download } from "lucide-react";
import { importParticipants } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, Select, Textarea, Badge } from "@/components/ui/primitives";

type Row = { name?: string | null; contact: string };
type Made = { name: string; contact: string; url: string; sent: string };

export function ParticipantImport({ campaignId }: { campaignId: string }) {
  const [role, setRole] = useState("speaker");
  const [rows, setRows] = useState<Row[]>([]);
  const [made, setMade] = useState<Made[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function parseCsv(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const fields = (res.meta.fields ?? []).map((f) => f.toLowerCase());
        const nameKey = res.meta.fields?.[fields.findIndex((f) => f.includes("name"))];
        const contactKey =
          res.meta.fields?.[
            fields.findIndex((f) => /mail|phone|contact|number|tel/.test(f))
          ] ?? res.meta.fields?.[1] ?? res.meta.fields?.[0];
        const parsed = res.data
          .map((r) => ({
            name: nameKey ? r[nameKey] : null,
            contact: (contactKey ? r[contactKey] : "")?.trim() ?? "",
          }))
          .filter((r) => r.contact.length > 2);
        setRows(parsed);
      },
    });
  }

  function parsePaste(text: string) {
    const parsed = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        // "Name, contact" or just "contact"
        if (parts.length >= 2) return { name: parts[0], contact: parts[1] };
        return { name: null, contact: parts[0] };
      })
      .filter((r) => r.contact.length > 2);
    setRows(parsed);
  }

  async function generate() {
    setBusy(true);
    try {
      const res = await importParticipants(campaignId, rows, role);
      setMade(res);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    const csv =
      "name,contact,link,delivery\n" +
      made
        .map((m) => `"${m.name}","${m.contact}","${m.url}","${m.sent}"`)
        .join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "lingo-participant-links.csv";
    a.click();
  }

  const counts = made.reduce(
    (acc, m) => ({ ...acc, [m.sent]: (acc[m.sent] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-accent-600" />
        <h3 className="font-semibold">Import participants</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        Add a list of people (name + email or phone). Each gets a personal sign-in
        link you can share (e.g. on WhatsApp) — no password needed.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className="mb-1 block text-xs font-semibold text-muted">
            Join as
          </label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="speaker">Speaker</option>
            <option value="verifier">Verifier</option>
            <option value="reviewer">Reviewer</option>
          </Select>
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-line bg-card px-4 text-sm font-semibold hover:bg-paper">
          <Upload className="h-4 w-4" /> Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseCsv(f);
            }}
          />
        </label>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-muted">
          …or paste one per line: <code>Name, email-or-phone</code>
        </label>
        <Textarea
          rows={3}
          placeholder={"Tabi Mbah, +237600000000\nNgozi A., ngozi@example.com"}
          onChange={(e) => parsePaste(e.target.value)}
        />
      </div>

      {rows.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={generate} disabled={busy}>
            {busy ? "Generating…" : `Generate ${rows.length} link${rows.length === 1 ? "" : "s"}`}
          </Button>
          <span className="text-sm text-muted">{rows.length} ready</span>
        </div>
      )}

      {made.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {made.length} created
              {counts.email ? ` · ${counts.email} emailed` : ""}
              {counts.sms ? ` · ${counts.sms} texted` : ""}
              {counts.failed ? ` · ${counts.failed} failed` : ""}
              {counts.none ? ` · ${counts.none} link-only` : ""}
            </p>
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>
          {(counts.none ?? 0) > 0 && (
            <p className="mb-2 text-xs text-muted">
              Link-only means sending isn&apos;t configured (Resend/Twilio) — copy
              and share these manually.
            </p>
          )}
          <div className="max-h-72 space-y-2 overflow-auto">
            {made.map((m) => (
              <div
                key={m.url}
                className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted">{m.contact}</p>
                </div>
                <SentBadge sent={m.sent} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(m.url);
                    setCopied(m.url);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                >
                  {copied === m.url ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function SentBadge({ sent }: { sent: string }) {
  if (sent === "email") return <Badge tone="success">emailed</Badge>;
  if (sent === "sms") return <Badge tone="success">texted</Badge>;
  if (sent === "failed") return <Badge tone="danger">failed</Badge>;
  return <Badge tone="neutral">link only</Badge>;
}
