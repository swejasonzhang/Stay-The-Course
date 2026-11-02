# Stay the Course: how it all works

These guides explain every part of the project in plain English: what each file does, how the pieces talk to each other, and why it was built this way. Read them in order; each one builds on the last.

| # | Guide | What you'll be able to explain |
|---|---|---|
| 1 | [The big picture](01-big-picture.md) | What the app does, its layers, and the path every request takes |
| 2 | [The engine](02-engine.md) | The math: fee drag, the Monte Carlo simulator, dynamic spending, rebalancing, statistics |
| 3 | [The API](03-api.md) | Spring Boot, the endpoints, validation (400 vs 422), CORS, how data is loaded |
| 4 | [Data and Athena](04-data-and-athena.md) | Where the 1928–2025 returns come from, real vs nominal, and the SQL that analyzes them |
| 5 | [The frontend](05-frontend.md) | The React app: forms, the API client, charts, dark mode |
| 6 | [AWS deployment](06-aws.md) | Lambda, API Gateway, S3, CloudFront, Athena and IAM, and how to deploy |
| 7 | [Testing](07-testing.md) | What each test proves and how the numbers were checked |
| 8 | [Design questions](08-faq.md) | The "why" behind each choice, and what could be improved |
| | [Glossary](glossary.md) | Every technical term used, in one place |

## How to study

1. **Read a guide, then open the files it points to.** Each guide quotes the important lines; the files show them in context.
2. **Try to explain it out loud without looking.** Each guide ends with **key facts**. If you can say those in your own words, you know that part.
3. **Run it.** `./mvnw test` in `backend/`, `npm test` in `frontend/`, and the app itself (see the main [README](../README.md#running-locally)). Changing a number and watching what breaks teaches more than reading.

A useful order for explaining any piece of code: **what goes in → what it does → what comes out → what happens with bad input.**
