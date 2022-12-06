import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { Project, ComputeType, LinuxArmBuildImage, Source } from 'aws-cdk-lib/aws-codebuild';
import { CodeBuildProject, LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { RuleTargetInput, EventField } from 'aws-cdk-lib/aws-events';

export class PullRequestCheckerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const codeRepository = Repository.fromRepositoryName(this, 'CodeRepository', 'prj1ex');

    const pullRequestCodeBuildProject = new Project(this, 'PRCodeBuildPrj', {
      environment: {
        computeType: ComputeType.SMALL,
        buildImage: LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_2_0
      },
      projectName: 'prj1ex-pr',
      description: 'Builds the project triggered by the CodeCommit Pull Request',
      source: Source.codeCommit({
        repository: codeRepository
      })
    });

    pullRequestCodeBuildProject.role?.attachInlinePolicy(new Policy(this, 'prCodeBuildPolicy', {
      statements: [new PolicyStatement({
        actions: ['cloudformation:ValidateTemplate'],
        resources: ['*']
      })]
    }));

    const prCheck = new NodejsFunction(this, 'check', {
      description: 'Updates CodeCommit PullRequest activity with details of build',
      functionName: 'prCheck',
      runtime: Runtime.NODEJS_16_X
    });

    prCheck.addToRolePolicy(new PolicyStatement({
      actions: [ 'codecommit:PostCommentForPullRequest' ],
      resources: [ codeRepository.repositoryArn ]
    }));

    const inputTransformer = {
      "sourceVersion": EventField.fromPath("$.detail.sourceCommit"),
      "artifactsOverride": {
        "type": "NO_ARTIFACTS"
      },
      "environmentVariablesOverride": [
        {
          "name":   "pullRequestId",
          "value":  EventField.fromPath("$.detail.pullRequestId"),
          "type":   "PLAINTEXT"
        },
        {
          "name":   "repositoryName",
          "value":  EventField.fromPath("$.detail.repositoryNames[0]"),
          "type":   "PLAINTEXT"
        },
        {
          "name":   "sourceCommit",
          "value":  EventField.fromPath("$.detail.sourceCommit"),
          "type":   "PLAINTEXT"
        },
        {
          "name":   "destinationCommit",
          "value":  EventField.fromPath("$.detail.destinationCommit"),
          "type":   "PLAINTEXT"
        }
      ]
    }

    const prStateChange = codeRepository.onPullRequestStateChange('pullRequestStatusChange', {
      description: 'Triggers the pullRequestCodeBuildProject on a pull request',
      ruleName: 'prStatusChange',
      eventPattern: {
        detailType: ['CodeCommit Pull Request State Change'],
        source: ['aws.codecommit'],
        detail: {
          'event': ['pullRequestCreated', 'pullRequestSourceBranchUpdated']
        }
      },
      target: new CodeBuildProject(pullRequestCodeBuildProject, {
        event: RuleTargetInput.fromObject(inputTransformer)
      })
    });

    prStateChange.addTarget(new LambdaFunction(prCheck));

    pullRequestCodeBuildProject.onStateChange('prCodeBuild', {
      description: 'Triggers the lamdba function to push a comment to the PR activity',
      ruleName: 'prCodeBuild',
      eventPattern: {
        detailType: ['CodeBuild Build State Change'],
        source: ['aws.codebuild'],
        detail: {
          'build-status': ['FAILED', 'SUCCEEDED'],
          'project-name': [pullRequestCodeBuildProject.projectName]
        }
      },
      target: new LambdaFunction(prCheck)
    });
  }
}
