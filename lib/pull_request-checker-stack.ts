import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { Project, ComputeType, LinuxArmBuildImage, Source } from 'aws-cdk-lib/aws-codebuild';

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
      source: Source.codeCommit({
        repository: codeRepository
      })
    });
  }
}
