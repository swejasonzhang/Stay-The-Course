#!/usr/bin/env bash
# Builds the backend and frontend and deploys everything to AWS.
# Run from anywhere after signing in with `aws login`. Needs Java 21, Node 20+ and the AWS CLI.
#
#   ./infra/deploy.sh                       # stack "stay-the-course" in us-east-1
#   STACK=my-stack AWS_REGION=us-east-2 ./infra/deploy.sh
set -euo pipefail

STACK="${STACK:-stay-the-course}"
REGION="${AWS_REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/infra/build"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
ARTIFACTS="${STACK}-artifacts-${ACCOUNT}-${REGION}"

echo "1/6 Building the backend jar"
(cd "$ROOT/backend" && ./mvnw -q -B package -DskipTests)
rm -rf "$BUILD/backend"
mkdir -p "$BUILD/backend"
cp "$ROOT"/backend/target/stay-the-course-*.jar "$BUILD/backend/app.jar"
cp "$ROOT/infra/run.sh" "$BUILD/backend/run.sh"
chmod +x "$BUILD/backend/run.sh"

echo "2/6 Making sure the bucket for deployment packages exists"
if ! aws s3api head-bucket --bucket "$ARTIFACTS" 2>/dev/null; then
  aws s3 mb "s3://$ARTIFACTS" --region "$REGION"
fi

echo "3/6 Uploading the Lambda package and deploying the CloudFormation stack"
aws cloudformation package \
  --template-file "$ROOT/infra/template.yaml" \
  --s3-bucket "$ARTIFACTS" \
  --output-template-file "$BUILD/packaged.yaml" \
  --region "$REGION"
aws cloudformation deploy \
  --template-file "$BUILD/packaged.yaml" \
  --stack-name "$STACK" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --region "$REGION"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
API_URL="$(output ApiUrl)"
SITE_URL="$(output SiteUrl)"
SITE_BUCKET="$(output SiteBucketName)"
DATA_BUCKET="$(output DataBucketName)"
DISTRIBUTION="$(output DistributionId)"

echo "4/6 Uploading the historical returns for Athena"
aws s3 cp "$ROOT/data/historical-returns.csv" "s3://$DATA_BUCKET/historical-returns/historical-returns.csv"

echo "5/6 Building the frontend against $API_URL and uploading it"
(cd "$ROOT/frontend" && npm ci && VITE_API_URL="$API_URL" npm run build)
aws s3 sync "$ROOT/frontend/dist/" "s3://$SITE_BUCKET/" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*" > /dev/null

echo "6/6 Done"
echo "  Site: $SITE_URL"
echo "  API:  $API_URL"
echo "The first request after a quiet spell is slower while Lambda starts Java (a cold start)."
