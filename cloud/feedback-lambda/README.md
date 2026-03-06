# ServiceDeskHero Feedback Lambda

This Lambda receives feedback submissions from the static ServiceDeskHero site and stores them in DynamoDB.

## Environment Variables
- `FEEDBACK_TABLE_NAME` — DynamoDB table name
- `ALLOWED_ORIGIN` — e.g. `https://servicedeskhero.com`

## Expected POST Body
```json
{
  "type": "bug",
  "message": "Respond Now sometimes feels flaky",
  "email": "optional@example.com",
  "version": "1.0.11",
  "page": "/",
  "userAgent": "Mozilla/..."
}
```

## Response
```json
{
  "ok": true,
  "id": "uuid"
}
```

## Next Steps
- package and deploy Lambda
- create DynamoDB table
- expose via function URL or API Gateway
- wire frontend modal/button to endpoint
- add nightly mirror/triage flow
