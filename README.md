# Service Desk Hero

A browser-based incremental game about the chaos of IT support: resolve tickets, recruit a team, handle incidents, and work your way through the career ladder.

Built with plain HTML, CSS, and JavaScript. The humor and scenarios are game fiction; this repository is not a real service-desk system.

## Try it locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173>. No build step or API credentials are required for the static game. Browser storage is used for local progress; clearing it can reset your save.

## Explore the code

- `index.html`: game shell and interface.
- `js/`: gameplay systems and browser behavior.
- `css/`: interface styling.
- `assets/`: game art and supporting assets.
- `cloud/`: optional cloud-side functionality.
- `.github/workflows/`: S3/CloudFront deployment configuration.

## Project status

An evolving playable project. The [roadmap](ROADMAP.md) separates planned work from the current implementation. [Feedback pipeline notes](FEEDBACK_PIPELINE.md) describe the feedback process; AI-generated reviews in this repository are design notes, not independent product endorsements.

## Deployment notes

The existing GitHub Actions workflow publishes on pushes to `main` and requires repository-specific AWS secrets and infrastructure. A local run does not require those credentials. Review deployment targets and feedback-service configuration before adapting the project to another environment.
