# 0003. Design system and UI polish

**Date**: 2026-11-19
**Status**: In Progress

## Summary

Improve the existing quiz host and guest surfaces so every core screen feels clear, responsive, and intentional. Preserve the warm paper, deep ink, and restrained prize accent in `design.md`, while fixing layout, hierarchy, state clarity, keyboard use, and meaningful motion.

## Context

The product already has a React Router web UI and a small design system in `design.md` and `app/app.css`. The current screens cover the landing page, host authentication and setup, question management, live host controls, guest joining, live play, reveal, and results.

The implementation works as a product shell, but several surfaces need a more deliberate information hierarchy and a more complete set of responsive states. This is a UI enhancement. It does not change session rules, data structures, or hosted game behavior.

> Premise note: The problem is visual and interaction quality, not a missing interface framework. Keep the existing React Router routes and CSS tokens, and improve the composition without replacing the product stack.

## Requirements

**User stories**:
- As a visitor, I want the landing page to explain the game and make joining obvious.
- As a host, I want authentication, setup, question management, and live controls to feel calm and easy to scan.
- As a guest, I want joining and every game state to keep the question, answer, timer, and next action clear.
- As a keyboard or screen reader user, I want every core action to have a clear name, state, and focus position.
- As a guest with an unstable connection, I want reconnect status and retry behavior to be clear without losing my place.

**Acceptance criteria**:
- **AC-1**: The landing page, host screens, and guest screens use the existing warm paper, deep ink, border, accent, success, and error tokens consistently.
- **AC-2**: The landing page has a clear brand context, join action, and concise explanation on phone and desktop sizes.
- **AC-3**: Host authentication and pending or rejected states have a complete branded layout instead of a bare form or status panel.
- **AC-4**: Host session setup shows session code, guest count, question order, time limit, and start actions with an obvious primary action.
- **AC-5**: The question bank has clear search, editing, pagination, moderation actions, loading feedback, empty results, and validation states.
- **AC-6**: Active host controls show question position, question text, timer, answer count, and pause or end actions in a stable reading order.
- **AC-7**: Guest joining works at 320 pixels wide without clipped inputs or buttons and shows clear validation and reconnect feedback.
- **AC-8**: Guest lobby, active question, reveal, paused, completed, and error states each have an explicit layout and next action.
- **AC-9**: Active guest answer controls are at least 44 pixels tall, remain readable on small phones, and expose selected, disabled, correct, and incorrect states.
- **AC-10**: Press feedback responds immediately, transitions are short, and reveal or completion celebrations remain restrained and respect reduced motion.
- **AC-11**: Every interactive element is reachable with a keyboard, has visible focus, and has an accessible name and status announcement where needed.
- **AC-12**: Layouts remain usable at 320 to 680 pixels, 681 to 1024 pixels, and 1025 pixels and wider, including long question text and long display names.
- **AC-13**: Loading, empty, error, and success states do not create dead zones or orphaned controls.
- **AC-14**: Light and dark themes use the existing color tokens, preserve WCAG contrast, and do not change the layout or session behavior.
- **AC-15**: The host and guest controls have measurable 44 pixel minimum targets, and question text remains readable with at least 16 pixel body text on small screens.
- **AC-16**: Search, pagination, form validation, reconnect, and destructive actions provide clear feedback and a predictable next step.

## Options considered

### Option 1: Fix in place

Improve the existing routes and CSS tokens without changing routes or backend behavior.

**Pros**:
- Lowest migration risk.
- Reuses the existing React Router and Supabase integration.
- Keeps the visible product consistent while it is being polished.

**Cons**:
- Some route markup may remain structurally uneven.
- Multiple state variants need careful review.

### Option 2: Replace the UI layer wholesale

Move to a new component library and rebuild all screens under a new visual system.

**Pros**:
- Can establish one cleaner component model.
- May remove inconsistent markup quickly.

**Cons**:
- Large risk for a live hosted game.
- Adds dependency and migration work without proving a product need.

### Option 3: Polish only one guest path

Improve joining and live play, leaving host and landing layouts for later.

**Pros**:
- Faster first result for players.
- Limits the initial implementation size.

**Cons**:
- Leaves obvious host and discovery layout problems.
- Creates a fragmented visual system across the product.

## Decision

**Chosen option**: Option 1: Fix in place.

Keep the existing routes and backend contracts. Build the complete visual pass into the current markup and CSS tokens, in one coherent enhancement.

**Implementation skills**: `anti-ui-slop` (`project`, local skill) · `emil-design-eng` (`user`, local skill) · `apple-design` (`user`, local skill)

## Rationale

Fix in place is the correct migration strategy because the backend and route structure already support the required states. A component library replacement would add cost before any layout benefit is proven. A guest only pass would leave the host and landing surfaces behind while the product remains visually inconsistent.

The current design character is strong enough to preserve. The work is to improve hierarchy, spacing, state treatment, and interaction craft inside that system.

## Feature design

**Surface inventory**:
- Landing and guest join entry.
- Host sign in, sign up, access pending, access rejected, and signed in workspace.
- Host session lobby, question setup, question bank, active control, pause, reveal, complete, and delete states.
- Guest lobby, active question, lifeline results, reveal, paused, and completed states.
- Shared loading, success, error, empty, and validation treatment.

**Layout rules**:
- The landing page keeps one primary join action and supporting play steps.
- Host screens use a stable header, a clear page heading, and one primary working area rather than a stack of equal panels.
- Guest play keeps the question and answer targets dominant with timer and lifelines close to the question.
- Session code, timer, position, and answer count receive strong hierarchy only when they affect the user's current decision.
- Long question text and display names wrap without pushing controls off small screens.
- Mobile layouts use one primary column. Desktop layouts may use two columns only when each side has a distinct task.
- At 320 to 680 pixels, use one column, full width controls, and vertical stacking.
- At 681 to 1024 pixels, use one main column and a supporting panel only where it improves a host workflow.
- At 1025 pixels and wider, use stable page containers and split host work areas only when the secondary area supports the primary task.
- Question and display name text wraps. Session codes remain unbroken and fit with available width. Tables use responsive rows or horizontal scrolling with a clear container.
- Sticky controls remain reachable and do not cover the active question or answer targets.

**Theme rules**:
- Preserve both existing themes through `:root` and `:root[data-theme="dark"]`.
- Keep content, borders, success, error, accent, and surface contrast within the existing design token contract.
- Theme changes do not change screen structure or game state.

**Focus and announcement rules**:
- Moving into joining, active question, reveal, paused, completed, or error states announces the state with a live region or moves focus only when it avoids disrupting an answer.
- Never move focus on every timer tick or reconnect poll.
- Move focus to the first field for join or host form validation.
- Move focus to the primary continue or retry action after a state-only screen change when no control already owns focus.
- Do not move focus during answer selection or lifeline use.
- Dialog-free destructive actions use a direct label and clear result. Confirm irreversible session deletion before it runs.

**Interaction and recovery rules**:
- Search updates the visible bank immediately and shows a no results state when no question matches.
- Question editing keeps unsaved fields in place until the user saves or explicitly cancels.
- Pagination uses 25 questions per page and preserves the current page when a saved question remains visible.
- Deactivate and delete actions require a clear direct label and a confirmation for irreversible deletion.
- Reconnect polls preserve the guest place and answer. A repeated reconnect failure shows retry and waiting states rather than removing the joined state.
- If reconnect is unrecoverable, show a clear session left state with join or retry guidance.

**State hierarchy**:
- Loading states identify the operation and preserve the layout.
- Empty states explain what to do next.
- Errors stay near the affected action and use the error token.
- Success and completion moments confirm the result, then make the next action clear.
- Disabled controls explain whether they are waiting, unavailable, or complete.

**Visual and motion rules**:
- Use existing CSS tokens for color, typography, spacing, borders, and radius.
- Add no raw visual values that duplicate an existing token.
- Use press feedback around 100 to 160 milliseconds, with a visible 0.97 scale while pressed.
- Use short color and opacity transitions of 150 to 250 milliseconds.
- Restrict reveal and completion motion to one restrained 200 to 300 millisecond state emphasis or prize update.
- Use no continuous decorative motion, spring entrances, or staggered large page reveals.
- Respect `prefers-reduced-motion` and remove movement while keeping opacity and state feedback.

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Render session position | Current question number and total | Existing session state |
| Render timer | Remaining seconds | Existing deadline or remaining time |
| Render prize reached | Prize amount | Existing session result or session question prize |
| Render guest count | Joined guest count | Existing guest list |
| Render answer state | Selected, correct, incorrect, or unanswered | Existing answer projection |
| Render lifeline result | Removed options or audience counts | Existing lifeline projection |
| Render validation | Field error or action error | Existing form or Edge Function response |

**Key invariants**:
- UI styling may not expose private answer correctness before reveal.
- Host controls may not show individual guest answers.
- Guest result detail may show only the guest's own snapshot.
- Layout changes must not alter game commands or state versions.
- No visual animation may block answer submission or host advancement.

**Security model**:
- No UI change alters the existing role or credential boundaries.
- Private answer keys and explanation text remain absent from active guest payloads.
- Host and administrator controls remain behind their existing approved host and administrator checks.

**Critical test scenarios**:
- Happy path: Visitor joins, completes active play, sees reveal and private result; verifies **AC-2**, **AC-8**, **AC-9**, **AC-12**
- Host path: Approved host creates a session, sees lobby and question order, advances through reveal and completion; verifies **AC-4**, **AC-6**, **AC-8**, **AC-12**
- Failure case: Supabase is missing or an action fails; verifies **AC-13**
- Empty case: No sessions, no questions, no reports, or no search matches; verifies **AC-5**, **AC-13**
- Narrow viewport: Open every core state at 320 pixels and rotate to desktop width; verifies **AC-7**, **AC-12**
- Keyboard and reduced motion: Navigate and activate controls without a pointer and with reduced motion enabled; verifies **AC-10**, **AC-11**

## Build plan

1. [x] Establish shared page composition and responsive shell improvements for landing, host, and guest pages, satisfies **AC-1**, **AC-2**, **AC-12**, **AC-13**
2. Polish authentication, pending, rejected, and host workspace layouts, satisfies **AC-3**, **AC-4**, **AC-11**, **AC-14**
3. Improve question bank search, editing, pagination, moderation, and validation states, satisfies **AC-5**, **AC-11**, **AC-13**, **AC-16**
4. Polish host lobby and live session controls across lobby, active, pause, reveal, and complete states, satisfies **AC-4**, **AC-6**, **AC-8**, **AC-11**, **AC-14**, **AC-15**
5. Polish guest join, lobby, active play, lifelines, reveal, paused, and result layouts, satisfies **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-15**, **AC-16**
6. Run visual and accessibility checks at 320, 680, 681, 1024, and 1025 pixel ranges and correct layout or state defects, satisfies **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**, **AC-15**

## Consequences

**Positive**:
- Core screens gain a consistent and professional hierarchy.
- Host and guest actions become easier to find in the same room or remotely.
- State, focus, and validation feedback become clearer.

**Negative / tradeoffs**:
- The implementation touches many route and CSS sections.
- Layout fixes require rendering and reviewing several state combinations.
- Subtle motion needs manual review across devices.

**Neutral**:
- No schema, API, Supabase policy, or session state migration is required.
- Existing route structure and live data contracts remain unchanged.

## Migration plan

**Strategy**: Fix in place.

**Phases**:
1. Improve shared shell and token use first.
2. Polish host and guest routes in separate build slices.
3. Review real states and remove orphaned or broken layouts.

**Rollback**:
- Revert the UI route and CSS changes as one enhancement commit or pull request.
- Backend behavior and database state remain unaffected.

**Risks**:
- A broad CSS pass could alter an unrelated state if selectors are too general.
- Interactive state bugs can hide in server dependent views if local Supabase is unavailable.

## Follow-up

- [ ] Render the screens on phone and desktop when Supabase local credentials or a running container are available.
- [ ] Verify the existing live session against real Supabase state before closeout.
