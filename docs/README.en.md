# Kickoff

> English. Versão em português: [README.md](README.md).

Every new project is born with these documents. `pnpm novo <project>` copies this folder into `projects/<project>/` and fills in the `{{…}}` fields it already knows (name, client, date). The rest gets filled in during the ritual below.

> The placeholders the script fills (`Nível 13`, `nivel-13`, `2026-10-24`) keep their Portuguese names in both languages, because `novo` fills them the same way. All other placeholders are in English.

## The documents

| File | What for | Who writes it | When |
|---|---|---|---|
| [`BRIEF.en.md`](BRIEF.en.md) | Problem, audience, goals, constraints, references, success metric | Lead designer, with the client in the room | Kickoff; revised at the end of discovery |
| [`PRODUCT.en.md`](PRODUCT.en.md) | Product context for people and agents: facts, people, surfaces, constraints | Designer + Claude, from the client's material | Kickoff; updated whenever a fact changes |
| [`DESIGN.en.md`](DESIGN.en.md) | Log of system decisions (type, color, spacing, motion), with the why | Whoever decides; Claude updates it at the end of each round | From direction onwards |
| [`PRINCIPIOS.en.md`](PRINCIPIOS.en.md) | Project principles, each with a test and a counterexample | The team, after the first critique | End of discovery or of v1 |
| [`VERSIONING.en.md`](VERSIONING.en.md) | How rounds v1 … vN live side by side, and the versions menu | Comes ready; adjust if needed | Kickoff |
| [`DECISIONS.en.md`](DECISIONS.en.md) | Product and architecture decisions in ADR format | Whoever decides | Whenever a decision might be questioned later |
| [`CRITIQUE.en.md`](CRITIQUE.en.md) | Critique round template with P0–P3 levels | Whoever runs the critique | Before each round goes to the client |
| [`QA.en.md`](QA.en.md) | Definition of done, to tick with evidence | Whoever delivers | Before each delivery |
| [`FILM-BRIEF.en.md`](FILM-BRIEF.en.md) | A film's beat-sheet script | Whoever directs the film | When there's a film |

## The ritual: the first 90 minutes

The kickoff is the meeting that saves the most time across the whole project. The goal is to leave with the problem written in one sentence, success criteria agreed, the first taste yardstick and the date of the first round.

### Before (30 min, without the client)

- [ ] `pnpm novo nivel-13` and `pnpm --filter @projects/nivel-13 dev`: the repository is up and running.
- [ ] Read everything the client sent. Note in `PRODUCT.md` the facts you can already state.
- [ ] Pick 6–10 candidate references (sites, brands, products) with screenshots.
- [ ] Write down the questions the material doesn't answer.
- [ ] Open `BRIEF.md` on the screen you'll share.

### 0–10 min · Opening

- The meeting's goal in one sentence.
- **Who decides** on the client side (one person) and who needs to be heard.
- How we work: versioned rounds, preview link, versions menu, critique with specific questions. Show a past project running for 2 minutes.

### 10–30 min · The problem

Fill in `BRIEF.md` **live**, on screen, in the client's words.

- The problem as a formula: *who* needs to *do what* because *reason*, but today *obstacle*.
- For whom: at most three audiences, each with its main job ("When…, I want to…, so I can…").
- What happens if we do nothing?

If the problem sentence contains the solution ("we need a new website"), ask "why?" until it doesn't.

### 30–45 min · Success and constraints

- **How will we know it worked?** One primary metric, with a number and a deadline. For brand work, whatever is observable.
- Fixed dates (launch, event, board meeting).
- Constraints: technical (platform, CMS, the team that will maintain it), legal (data, regulated sector), brand (what can't change), content (what exists and what doesn't).

### 45–65 min · References: love and hate

The most valuable moment of the kickoff. Show the references and ask for reactions.

- For each: love, hate or indifferent, and **exactly what**. "The calm", "the big number at the top", "the photo looks like stock".
- Ask the client for two references of their own, including competitors they envy.
- Write it all down verbatim in the "References" section of `BRIEF.md`. That's the first yardstick (liked / disliked) for `BRIEF-v1.md`.

### 65–80 min · Risks and open decisions

- What could go wrong? (late content, multi-layer approvals, technical dependencies)
- Which decisions are already made and won't be revisited? Log them in `DECISIONS.md`.
- Who owns each piece of content (copy, photos, data) and when it arrives.

### 80–90 min · Next steps

- The **v1** date (usually 5–7 working days later).
- Round cadence (e.g. one a week, reviewed on Thursdays).
- Review mode: meetings with shared localhost and/or a preview link.
- A single communication channel and who answers.
- What the client sends, and by when.

### After (30 min, without the client)

- [ ] Clean up `BRIEF.md` and send it to the client for sign-off.
- [ ] Ask Claude: "Read BRIEF.md and the material in `research/`. Complete PRODUCT.md, list the open questions and propose 3 directions in one sentence each." Review and cut.
- [ ] Create `BRIEF-v1.md` with the initial yardstick (liked, disliked, asked).
- [ ] Register the first version in `lib/versions.ts`.
- [ ] Commit: "kickoff: brief, product and initial yardstick".

## Template conventions

- `{{field}}` is a field to fill in. `pnpm novo` fills the ones it knows; the rest is yours.
- `<!-- comment -->` is guidance. Delete it once filled in.
- Write the way you speak. A document only its author understands is no use to the team or to Claude.
- Dates as `YYYY-MM-DD`.
