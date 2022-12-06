import { CodeCommitClient, PostCommentForPullRequestCommand } from '@aws-sdk/client-codecommit';
import timestamp from 'time-stamp';

const codeCommitClient = new CodeCommitClient({region: `${process.env.AWS_REGION}`});

const postComment = async (params: any) => {
    const command = new PostCommentForPullRequestCommand(params);

    try {
      await codeCommitClient.send(command);
    } catch (error) {
      console.log(error);
    }
};

const parseCodeCommitEvent = (event: any) => {
    const formattedDate = timestamp('HH:mm:ss');

    return {
      beforeCommitId: event.detail.sourceCommit,
      afterCommitId: event.detail.destinationCommit,
      pullRequestId: event.detail.pullRequestId,
      repositoryName: event.detail.repositoryNames[0],
      content: `Build started at ${formattedDate}(UTC)`
    };
};

var parseCodeBuildEvent = (event: any) => {
    let beforeCommitId = "";
    let afterCommitId = "";
    let pullRequestId = "";
    let repositoryName = "";
    let content = "";
    const envVars = event.detail["additional-information"].environment["environment-variables"];
    for (let envVar in envVars) {
      if (envVars[envVar].name === "sourceCommit") {
        beforeCommitId = envVars[envVar].value;
      }
      if (envVars[envVar].name === "destinationCommit") {
        afterCommitId = envVars[envVar].value;
      }
      if (envVars[envVar].name === "pullRequestId") {
        pullRequestId = envVars[envVar].value;
      }
      if (envVars[envVar].name === "repositoryName") {
        repositoryName = envVars[envVar].value;
      }
    }
    const s3_prefix = event.region === "us-east-1" ? "s3" : `s3-${event.region}`;
    const badgeUrl = `https://${s3_prefix}.amazonaws.com/codefactory-${event.region}-prod-default-build-badges`;
    const failing = `${badgeUrl}/failing.svg`;
    const passing = `${badgeUrl}/passing.svg`;
    for (let phase in event.detail["additional-information"].phases) {
      if (event.detail["additional-information"].phases[phase]["phase-status"] == "FAILED") {
        content = `![Failing][Badge] - See the [Logs](${event["detail"]["additional-information"]["logs"]["deep-link"]})\r
  [Badge]: ${failing} "Failing"`;
      } else {
        content = `![Passing][Badge] - See the [Logs](${event["detail"]["additional-information"]["logs"]["deep-link"]})\r
  [Badge]: ${passing} "Passing"`;
      }
    }
    return {
      beforeCommitId,
      afterCommitId,
      pullRequestId,
      repositoryName,
      content
    };
};

exports.handler =  async function(event: any) {
    console.log(JSON.stringify(event));
    if (event.source === "aws.codecommit") {
      const params = parseCodeCommitEvent(event);
      await postComment(params);
    } else if (event.source === "aws.codebuild") {
        const params = parseCodeBuildEvent(event);
        await postComment(params);
    }
  }