const base = process.argv.at(-1),
  token = process.env.POURMED_TEST_TOKEN;
if (!base?.startsWith("http") || !token)
  throw new Error("Set POURMED_TEST_TOKEN and pass the base URL.");
const auth = { authorization: `Bearer ${token}` };
const call = async (path, { method = "GET", body, headers = {} } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...auth,
      ...headers,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${data.error?.code}`);
  return data.data;
};
const mutate = (path, method = "POST", body = {}) =>
  call(path, {
    method,
    body,
    headers: { "idempotency-key": crypto.randomUUID() },
  });
const checks = [];
const check = (value, label) => {
  if (!value) throw new Error(`Failed: ${label}`);
  checks.push(label);
};
let created = [];
try {
  const initial = await call("/api/status");
  check(
    initial.settings.startMinute === 1320 && initial.settings.endMinute === 240,
    "v1 migration and default settings",
  );
  check(initial.diagnostics.schemaVersion === 2, "schema version");
  const required = (
    await mutate("/api/medications", "POST", {
      name: "Local required",
      dosage: "test",
      required: true,
    })
  ).medications.find((x) => x.name === "Local required");
  created.push(required.id);
  const optional = (
    await mutate("/api/medications", "POST", {
      name: "Local optional",
      required: false,
    })
  ).medications.find((x) => x.name === "Local optional");
  created.push(optional.id);
  await mutate(`/api/medications/${required.id}`, "PUT", {
    name: "Local required edited",
    dosage: "test",
    enabled: true,
    required: true,
  });
  await mutate("/api/settings", "PUT", {
    startMinute: 1380,
    endMinute: 150,
    intervalMinute: 15,
    timezone: "America/Los_Angeles",
    remindersEnabled: true,
    completionMode: "individual",
    theme: "system",
    quietPreference: true,
    badgePreference: false,
    previewText: "Personal reminder",
  });
  await mutate("/api/taken", "POST", { medicationId: required.id });
  let status = await call("/api/status");
  check(
    status.status.taken,
    "optional medication does not block individual completion",
  );
  await mutate("/api/not-taken", "POST", { medicationId: required.id });
  status = await call("/api/status");
  check(!status.status.taken, "individual correction");
  await mutate("/api/taken", "POST", {});
  status = await call("/api/status");
  check(status.status.taken, "group-style mark all action remains idempotent");
  const snooze = await mutate("/api/snooze", "POST", { minutes: 10 });
  check(Boolean(snooze.snoozeUntil), "snooze created");
  await call("/api/snooze", { method: "DELETE" });
  check((await call("/api/status")).snoozeUntil === null, "snooze canceled");
  await mutate("/api/day-note", "PUT", {
    day: status.day,
    note: "<script>plain text only</script>",
  });
  const history = await call("/api/history?count=30");
  check(
    history.days.length === 30 &&
      history.days.some((x) => x.note.includes("<script>")),
    "history and plain-text note",
  );
  const stats = await call("/api/statistics");
  check(
    Number.isFinite(stats.previous30.adherencePercent),
    "statistics avoid NaN",
  );
  const exported = await call("/api/export?format=json");
  const serialized = JSON.stringify(exported);
  check(
    !serialized.includes("subscription") &&
      !serialized.includes("ACCESS_TOKEN"),
    "JSON export redaction",
  );
  const csv = await fetch(`${base}/api/export?format=csv`, {
    headers: auth,
  }).then((r) => r.text());
  check(
    csv.startsWith("day,status") && !csv.includes("authorization"),
    "CSV export redaction",
  );
} finally {
  await mutate("/api/not-taken", "POST", {}).catch(() => {});
  for (const id of created)
    await call(`/api/medications/${id}`, { method: "DELETE" }).catch(() => {});
  await mutate("/api/settings", "PUT", {
    startMinute: 1320,
    endMinute: 240,
    intervalMinute: 30,
    timezone: "America/Los_Angeles",
    remindersEnabled: true,
    completionMode: "group",
    theme: "system",
    quietPreference: false,
    badgePreference: true,
    previewText: "",
  }).catch(() => {});
}
console.log(`V2 API verification passed (${checks.length} checks).`);
