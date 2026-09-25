# Adding NetworkGraph3D to NIRIKSHAK — safe integration steps

## 1. Check dependencies (should already be present)
```bash
cd frontend
grep -E '"three"|"react-force-graph-3d"' package.json
```
If either is missing:
```bash
npm install three react-force-graph-3d
npm install -D @types/three
```

## 2. Add the files — do not overwrite anything yet
Copy both files into a **new** folder so nothing existing is touched:
```
frontend/src/components/graph/NetworkGraph3D.tsx
frontend/src/components/graph/NetworkGraph3D.css
```

## 3. Work on a branch
```bash
git checkout -b feature/graph-3d-upgrade
```
Keep your current graph component in `Dashboard.tsx` completely untouched for now — you're adding the new component alongside it, not replacing it yet.

## 4. Wire it to your real API (not the old mock data)
In your existing `frontend/src/lib/api.ts`, you should already have (or need to add) a function that calls the backend subgraph endpoint:

```ts
// lib/api.ts
export async function fetchSubgraph(rootEntityId: string, hops: number) {
  const res = await fetch(`/api/graph/${rootEntityId}/subgraph?hops=${hops}`);
  if (!res.ok) throw new Error(`Graph request failed: ${res.status}`);
  const raw = await res.json();

  // Map your backend's actual field names into the shape NetworkGraph3D expects.
  // Adjust this mapping to match whatever graph.py / evidence.py actually return.
  return {
    nodes: raw.nodes.map((n: any) => ({
      id: n.id,
      type: n.type,                 // "wallet" | "tx" | "ip" | "asn" | "geo"
      label: n.label ?? n.id,
      risk_score: n.risk_score,
      confidence: n.confidence,
      fields: n.fields ?? {},       // whatever key/value evidence you want shown
    })),
    links: raw.links.map((l: any) => ({
      source: l.source,
      target: l.target,
      kind: l.kind ?? "flow",       // "wallet" | "wallet-risk" | "flow" | "net"
    })),
  };
}
```

## 5. Try it on an isolated test route first — don't touch Dashboard.tsx yet
Add a throwaway route (e.g. `/graph-test`) or render it in a scratch page:
```tsx
import NetworkGraph3D from "./components/graph/NetworkGraph3D";
import { fetchSubgraph } from "./lib/api";

<NetworkGraph3D rootEntityId="bc1q8f9a...qc1" fetchSubgraph={fetchSubgraph} />
```
Confirm with a **small** real subgraph (a handful of nodes) before pointing it at anything large — hop depth 3 on a dense wallet can pull in a lot of nodes fast.

## 6. Build check before going further
```bash
npm run build
```
This must pass with 0 TypeScript errors before you touch the real dashboard. If `react-force-graph-3d`'s types complain about the `ref` or `nodeThreeObject` signatures, that's expected with some version combos — cast narrowly (as already done with `as any` in a couple of spots) rather than loosening types project-wide.

## 7. Only now, swap it into Dashboard.tsx
Once step 6 passes and step 5 looks right visually:
- Import `NetworkGraph3D` in `Dashboard.tsx`
- Replace the old mock 3D graph JSX with `<NetworkGraph3D rootEntityId={selectedEntityId} fetchSubgraph={fetchSubgraph} />`
- **Comment out, don't delete**, the old graph block for this PR — remove it only after the new one has been demoed and confirmed working, so you have an instant rollback if something breaks close to a deadline.

## 8. Commit in small steps, matching how you've been shipping
```bash
git add frontend/src/components/graph/
git commit -m "feat: add NetworkGraph3D component (not yet wired into Dashboard)"
# after step 5/6 pass:
git add frontend/src/lib/api.ts
git commit -m "feat: add fetchSubgraph to api.ts"
# after step 7:
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: wire NetworkGraph3D into Network tab, replacing mock graph"
```
Push the branch and open a PR rather than pushing straight to `main` — same review discipline as your last runtime-crash fix.

## Notes
- The legend renders as part of the component's own root div, positioned bottom-left over the canvas (matches what you approved) — if you'd rather it sit fully outside the graph box in the page layout, move `<GraphLegend />` out of `NetworkGraph3D` and render it as a sibling in `Dashboard.tsx` instead; it's exported separately for exactly that reason.
- Clustering was intentionally left out of this version, per your last message.
- `hop depth` currently re-fetches from the backend on change (real graph traversal), not just a visual filter — confirm your `/api/graph/{id}/subgraph` endpoint actually accepts a `hops` query param; if it doesn't yet, that's a small backend addition needed before this control does anything real.
