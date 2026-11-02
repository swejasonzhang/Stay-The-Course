# 6. AWS deployment

Files: [`infra/template.yaml`](../infra/template.yaml), [`infra/deploy.sh`](../infra/deploy.sh), [`infra/destroy.sh`](../infra/destroy.sh), [`infra/run.sh`](../infra/run.sh)

## The picture

```
Visitor's browser
   │ 1. https://<id>.cloudfront.net        ┌─────────────────────────────┐
   ├────────────────────────────────────▶ │ CloudFront ──▶ S3 (site)    │  the React app's files
   │                                       └─────────────────────────────┘
   │ 2. POST https://<id>.execute-api…/simulate
   └────────────────────────────────────▶ API Gateway ──▶ Lambda (Spring Boot jar)

You (the developer) ──SQL──▶ Athena ──▶ S3 (historical-returns.csv)
IAM decides who may touch what in all of the above.
```

## Each service, in one line

| Service | What it is | Its job here | MERN-world equivalent |
|---|---|---|---|
| **IAM** | AWS's permission system | Each piece gets only the access it needs | Users, roles and auth middleware |
| **API Gateway** (HTTP API) | A managed public HTTPS front door | Receives API requests and passes them to Lambda; throttles floods | The part of Express that receives requests |
| **Lambda** | Runs your code only when a request arrives | Runs the Spring Boot app | `node server.js`, without a server running all the time |
| **S3** | File storage | Holds the built website and the CSV | A hard drive in the cloud |
| **CloudFront** | A CDN: copies files to servers worldwide | Serves the website over HTTPS, fast | Hosting your React build behind a CDN |
| **Athena** (+ Glue) | SQL over files in S3 | Analyzes the returns data | An aggregation query over a CSV |
| **CloudFormation** | Infrastructure as code | Creates all of the above from one template | `docker-compose.yml` for cloud resources |

## How Spring Boot runs on Lambda

Lambda normally calls a function with an "event" object, not an HTTP request. The **Lambda Web Adapter** (an AWS-maintained layer) bridges the gap so the Spring Boot app runs **unchanged**:

1. Lambda starts the function by running `run.sh` (the function's *handler*), which runs `java -jar app.jar`.
2. Because `AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap`, the adapter starts first, waits until the app answers on `http://localhost:8080/assumptions` (the readiness check), then reports "ready."
3. For each request, API Gateway sends Lambda an event; the adapter turns it into a normal HTTP request to the app on port 8080 and turns the response back into an event.

```yaml
ApiFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: build/backend/          # app.jar + run.sh, prepared by deploy.sh
    Handler: run.sh
    Runtime: java21
    Architectures: [arm64]           # Graviton: cheaper per second
    MemorySize: 1536                 # more memory also means more CPU, so faster startup
    Layers:
      - !Sub arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerArm64:30
    Environment:
      Variables:
        AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
        AWS_LWA_PORT: "8080"
        AWS_LWA_READINESS_CHECK_PATH: /assumptions
        APP_CORS_ALLOWEDORIGINS: !Sub https://${SiteDistribution.DomainName}
```

The last variable overrides `app.cors.allowed-origins`, so in production **only the CloudFront site** may call the API from a browser.

### Cold starts

When no copy of the function is running, the first request waits while Lambda starts Java and Spring (a **cold start**, a few seconds). Later requests reuse the warm copy and are fast. `run.sh` uses `-XX:TieredStopAtLevel=1`, which makes Java start faster at some cost to peak speed. Locally, the packaged jar starts in about 1.6 seconds with that flag.

Ways to shorten cold starts further, if needed: **Lambda SnapStart** (saves a snapshot of the started app) or **provisioned concurrency** (keeps copies warm, at a cost).

**Lambda scales by itself.** If many requests arrive at once, Lambda runs more copies. This works because the app is **stateless**: any copy can answer any request.

## The website: S3 + CloudFront

- **`SiteBucket`** is private: public access is fully blocked.
- **`SiteOriginAccessControl`** lets CloudFront sign its requests to the bucket.
- **`SiteBucketPolicy`** allows `s3:GetObject` only for this one CloudFront distribution (`AWS:SourceArn` condition). Nobody can read the bucket directly; everyone goes through CloudFront.
- **`SiteDistribution`** serves `index.html` by default, redirects HTTP to HTTPS, compresses files, and uses AWS's managed "CachingOptimized" cache policy. After each deploy, `deploy.sh` **invalidates** the cache (`/*`) so visitors get the new files.

## The data: S3 + Glue + Athena

- **`DataBucket`**: `historical-returns/` holds the CSV; `athena-results/` holds query output and is deleted after 30 days by a lifecycle rule.
- **`GlueDatabase`** + **`ReturnsTable`**: the table definition (`stay_the_course.historical_returns`).
- **`AthenaWorkGroup`**: saves results to the data bucket and **refuses any query that would scan more than 10 MB**, so a mistake can't run up a bill.
- **Three named queries** (summary, worst decades, worst years): the same SQL as [`data/athena/`](../data/athena/). See [Data and Athena](04-data-and-athena.md).

## IAM: least privilege

| Who | May do | Why |
|---|---|---|
| The Lambda function's role (created by SAM) | Write its own logs | The app needs nothing else: its data is inside the jar |
| CloudFront | Read objects in the site bucket | Bucket policy with an `AWS:SourceArn` condition |
| You (your IAM user) | Deploy, run Athena queries | Your own user, not the root account |

**Least privilege** means granting only what's needed. If the function's code were ever compromised, it couldn't touch the buckets or anything else.

API Gateway **throttling** (10 requests per second, bursts of 20) is a cost and abuse guard: CORS only restricts browsers, so scripts could still flood the API.

## Deploying

### One-time setup (in the AWS console, by you)

1. **Sign in as the root user and turn on MFA** for it. The IAM dashboard shows a prompt for this.
2. **Set a budget alert:** Billing → Budgets → Create budget → a zero-spend budget or a small monthly amount.
3. **Create an IAM user for everyday use:** IAM → Users → Create user, give it console access and attach **AdministratorAccess**. Use it from now on instead of root.
4. **In a terminal, run `aws login`** and sign in as that user in the browser window it opens. Choose a region, such as `us-east-1`, if asked.

### Deploy

```bash
./infra/deploy.sh
```

It runs six steps:
1. Builds the backend jar (`./mvnw package`) and puts `app.jar` + `run.sh` in `infra/build/backend/`.
2. Creates a bucket for deployment packages, if it doesn't exist yet.
3. `aws cloudformation package` uploads the Lambda code; `aws cloudformation deploy` creates or updates every resource in the template.
4. Uploads `historical-returns.csv` to the data bucket.
5. Builds the frontend with `VITE_API_URL` set to the new API URL, uploads it to the site bucket, and invalidates CloudFront's cache.
6. Prints the site and API URLs.

Re-running it updates everything in place. CloudFormation only changes what's different.

### Cost

For a demo with little traffic, Lambda, API Gateway, S3, CloudFront and Athena charge very small amounts, and some have free-tier allowances. Check the AWS pricing pages for current numbers, and keep the budget alert from step 2.

### Removing everything

```bash
./infra/destroy.sh
```

Empties both buckets (CloudFormation can't delete a non-empty bucket), deletes the stack, waits for it to finish, then removes the deployment-package bucket.

## How it was checked before deploying

- `infra/template.yaml` passes **cfn-lint** (AWS's CloudFormation checker) with no findings.
- The exact Lambda package (`app.jar` + `run.sh`) was started locally: it was ready in about 1.6 seconds, `/assumptions` answered 200, and with `APP_CORS_ALLOWEDORIGINS` set to a CloudFront address, that origin was allowed and `localhost:5173` was refused (403).
- The Athena SQL was run against the same CSV in DuckDB and matches the Java numbers.

## Key facts

- **API Gateway → Lambda → (Lambda Web Adapter) → Spring Boot on port 8080**, unchanged.
- **CloudFront → private S3 bucket**, readable only by that distribution (Origin Access Control).
- **Athena** queries the CSV in S3 for analysis; the live API doesn't use it.
- **IAM least privilege:** the function may only write logs.
- **CloudFormation** creates everything from one template; `deploy.sh` and `destroy.sh` wrap it.
- **Cold start** = the first request waits for Java to start; Lambda scales by running more copies because the app is stateless.
