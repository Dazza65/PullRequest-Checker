import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PullRequestChecker } from '../src/pull-request-checker';

test('PullRequestChecker has a CodeBuild project with the specified name', () => {
  const stack = new Stack(new App());
  
  new PullRequestChecker(stack, 'MyTestStack', { repositoryName: 'testrepo' });
  
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Name: 'PullRequestChecker-testrepo'
 });
});
