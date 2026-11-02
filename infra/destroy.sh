#!/usr/bin/env bash
# Deletes everything deploy.sh created, so nothing keeps costing money.
# Buckets must be empty before CloudFormation can delete them, so they're emptied first.
set -euo pipefail

STACK="${STACK:-stay-the-course}"
REGION="${AWS_REGION:-us-east-1}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

for bucket in "$(output SiteBucketName)" "$(output DataBucketName)"; do
  echo "Emptying $bucket"
  aws s3 rm "s3://$bucket" --recursive
done

echo "Deleting stack $STACK"
aws cloudformation delete-stack --stack-name "$STACK" --region "$REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" --region "$REGION"

ARTIFACTS="${STACK}-artifacts-${ACCOUNT}-${REGION}"
echo "Deleting deployment-package bucket $ARTIFACTS"
aws s3 rb "s3://$ARTIFACTS" --force || true
echo "Done"
