---
description: Start a new versioned round (v<N+1>) without touching previous rounds
argument-hint: "[round title] [optional: paste the client's critique]"
---

Start a new round for this project. Title and critique: $ARGUMENTS

1. Read `lib/versions.ts` and find the current round `v<N>`. Read its brief (`briefs/BRIEF-v<N>.md`).
2. Create `briefs/BRIEF-v<N+1>.md` with:
   - the client's critique, literal (summarized only when very long), and what each point becomes as a decision;
   - what stays from v<N> and what changes;
   - references and what to take from each (mechanism, not look);
   - the work fronts, their owned files and ports, and the contracts between them (component signatures);
   - the verification required (1440×900 and 390×844, reduced motion, zero console errors, zero horizontal overflow).
3. Add the v<N+1> entry to `lib/versions.ts` (copy the v<N> entry, new id, title, date, summary, routes, folders, brief, status `atual`), set `current: true` on it and remove it from v<N>, set v<N> status to `anterior`. This registry feeds the Versões (Versions) menu of `<StudioTools />`.
4. Create `app/v<N+1>/` and `components/v<N+1>/` with CSS scoped to `.v<N+1>` and the `v<N+1>-` prefix. Start by importing from v<N> what stays; copy only what must change.
5. Never edit `app/v<N>/`, `components/v<N>/` or any older round. Shared fixes that would change an older round's look go into the new folder.
6. Report: files created, what was copied versus imported, the local URL, and the open decisions.
