# Scope: Who Wants To Be A Literature Giant

You are building a public trivia platform for Nigerian players in English, with quick guest games first and creator tools in a later phase. Launch content is curated, the product is free, and the game show prize ladder is simulated in NGN with no cash payout or public rankings.

**Build approach:** Tracer Bullet (prove a real user path across the product layers, then extend it one working slice at a time).
**Workflow:** Beta (verify the real app, then test). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit. If you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is done._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Starter app scaffold | Existing | existing |
| 2 | Project context and development standards | Foundation | planned |
| 3 | Product architecture and environments | Foundation | planned |
| 4 | Data model and game integrity | Foundation | planned |
| 5 | Design system and accessibility | Foundation | planned |
| 6 | Privacy and product measurement | Foundation | planned |
| 7 | Public quiz discovery | Slice 1 | planned |
| 8 | Quiz details | Slice 1 | planned |
| 9 | Guest solo gameplay | Slice 1 | planned |
| 10 | Results and session recovery | Slice 1 | planned |
| 11 | Player accounts and history | Slice 2 | planned |
| 12 | Creator studio and question bank | Slice 3 | planned |
| 13 | Import and export | Slice 3 | planned |
| 14 | Content safety and operations | Slice 3 | planned |
| 15 | Quiz preview, publishing, and sharing | Slice 4 | planned |

## Existing

### 1. Starter app scaffold · existing
The repository has an application scaffold to build on. It does not yet contain product flows for Who Wants To Be A Literature Giant.
**Done when:** already met, the starter application and source files are present.
Code area: `src/`

## Foundation

### 2. Project context and development standards · planned
Record how this project is organized and establish consistent development guidance from the real codebase.
**Done when:** project guidance describes the actual app structure and the existing code checks run cleanly.
* [ ] Capture project context: `/audit`

### 3. Product architecture and environments · planned
Choose the product boundaries and operating setup so the public game, creator tools, and trusted game actions can grow safely.
**Done when:** the architecture and environment plan support a small launch, protected secrets, and a clear path to measured growth.
* [x] Design it (spec): `/architect product architecture and environments`
Spec: [0001](../specs/0001-product-architecture/index.md)

### 4. Data model and game integrity · planned · needs a decision
Define quizzes, questions, versions, guest sessions, answers, and player records so published content stays stable and answer keys stay private.
**Done when:** a game can use a fixed quiz version, avoid duplicate questions, retain its canonical outcome, and keep answer keys out of public quiz data.
* [ ] Design it (spec): `/architect data model and game integrity`

### 5. Design system and accessibility · planned · needs a decision
Create a distinctive, responsive visual system for discovery, play, results, and the later studio.
**Done when:** core screens support keyboard use, screen readers, readable contrast, zoom, reduced motion, and mobile friendly play.
* [ ] Design it (spec): `/architect design system and accessibility`

### 6. Privacy and product measurement · planned · needs a decision
Set privacy boundaries and measure the path from discovery through completed games without collecting unnecessary personal data.
**Done when:** core product events have clear purposes, privacy limits are defined, and launch success can be measured through first game start and completion.
* [ ] Design it (spec): `/architect privacy and product measurement`

## Slice 1: Public discovery and guest play

### 7. Public quiz discovery · planned · needs a decision
Help Nigerian players find curated quizzes through a useful public landing page, categories, and search.
**Done when:** visitors can browse and search curated quizzes, public pages have useful search metadata, and empty or failed results are clear.
* [ ] Design it (spec): `/architect public quiz discovery`

### 8. Quiz details · planned · needs a decision
Give players enough information to choose a quiz and start without creating an account.
**Done when:** a visitor can see a quiz description, category, length, difficulty, and clear play action before starting as a guest.
* [ ] Design it (spec): `/architect quiz details`

### 9. Guest solo gameplay · planned · needs a decision
Deliver the main game show experience with question selection, clear answer feedback, timing, lifelines, and simulated NGN prize progression.
**Done when:** a guest can complete a single player game with no duplicate questions, recent question cooldown when the pool allows it, server checked answers, configured lifelines, and no cash payout or public ranking.
* [ ] Design it (spec): `/architect guest solo gameplay`

### 10. Results and session recovery · planned · needs a decision
Show a clear personal result and let players recover from reloads or interruptions without corrupting a game.
**Done when:** completed, timed out, and abandoned games have clear outcomes, and a guest can safely resume an active session after a reload or network interruption.
* [ ] Design it (spec): `/architect results and session recovery`

## Slice 2: Returning players

### 11. Player accounts and history · planned · needs a decision
Let players save their identity and find their past games across visits, while keeping guest play available.
**Done when:** a player can create an account after a guest game, choose profile and privacy settings, and find saved game history on another visit.
* [ ] Design it (spec): `/architect player accounts and history`

## Slice 3: Creator tools

### 12. Creator studio and question bank · planned · needs a decision
Give creators a focused workspace to organize quizzes and write reusable questions.
**Done when:** a creator can create, edit, reorder, and remove questions, set quiz details, and understand validation errors before saving.
* [ ] Design it (spec): `/architect creator studio and question bank`

### 13. Import and export · planned · needs a decision
Help creators move question content in and out of the studio with useful validation and recovery.
**Done when:** supported quiz files can be previewed, validated, imported, and exported without silently losing content.
* [ ] Design it (spec): `/architect import and export`

### 14. Content safety and operations · planned · needs a decision
Prepare the platform to review public submissions and respond to reports before creator publishing opens broadly.
**Done when:** players can report content, moderators can review and act on reports, and operators can identify publishing abuse and platform health issues.
* [ ] Design it (spec): `/architect content safety and operations`

## Slice 4: Public publishing

### 15. Quiz preview, publishing, and sharing · planned · needs a decision
Let creators review a quiz as a player, publish an approved version, and share a stable public link after moderation is ready.
**Done when:** creators can preview drafts, submit them for review, publish an approved version, update it without changing existing games, and share its public page.
* [ ] Design it (spec): `/architect quiz preview publishing and sharing`

## Deferred

Out of scope for the first release, kept for later planning: live hosted rooms, team games and tournaments, classrooms and organization workspaces, ratings and reviews, creator analytics, rich media questions, languages beyond English, paid plans, and advertising.

## Legend

**Needs a decision** means `/architect` is the suggested first step. Other planned features can start with `/develop`, and feature decisions can be skipped when you already know the build.

**Feature lifecycle:** `/scope` sets new features to `planned`. `/architect` captures a design and adds its build milestones. `/develop` advances implementation. The Beta workflow adds `/check verify` and `/test`. A feature built on an unratified decision stays flagged until `/architect` confirms it.

**Next step** is the first unticked box. This is a brownfield repository with no root `AGENTS.md`, so start with `/audit` to capture project context before designing or building product features.
