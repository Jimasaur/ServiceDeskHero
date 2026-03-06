# ServiceDeskHero Feedback Pipeline

## Goal
Allow players to submit bugs/ideas from the live site, store them in a cloud database, mirror them into the workspace/repo, and let nightly GPT-5.4 work sessions triage and implement high-value items.

## Proposed Architecture

### Frontend
- Add a **Feedback** button in the game header
- Open modal with:
  - type: bug / idea / balance / ux
  - message
  - optional email
- Auto-attach:
  - current site version (`/version.json` or injected build version)
  - current page
  - browser user agent

### Backend
- **AWS Lambda** with function URL or API Gateway endpoint
- **DynamoDB** table for durable feedback storage
- CORS allow the ServiceDeskHero domain only

### Cloud Data Model
Single-table simple pattern:
- `pk = FEEDBACK#YYYY-MM-DD`
- `sk = <timestamp>#<uuid>`
- item includes type, message, version, page, email, status, createdAt

### Workspace Mirror
Nightly job should read new feedback from DynamoDB and write/update:
- `feedback-backlog.md` (human readable triage)
- optional dated JSON snapshots under `feedback/inbox/`

## Nightly Automation Goal
Each of the 5 GPT-5.4 overnight SDH sessions should:
1. pull or read feedback backlog
2. dedupe and categorize
3. identify highest-value next action
4. implement, document, or defer
5. report shipped changes and remaining queue

## Implementation Order
1. Deploy DynamoDB + Lambda
2. Add frontend feedback modal/button
3. Wire POST submission
4. Add nightly DB-to-workspace mirror script
5. Let nightly GPT-5.4 sessions consume the mirrored backlog
