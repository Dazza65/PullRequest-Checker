# PullRequestChecker

This constructs executes a CodeBuild project against a feature branch to verify that it builds and passes the unit tests successfully. It uses a Lambda function that's triggered by the creation of a pull request and on completion of the CodeBuild project to write CodeCommit PullRequest activity comments.

It provides visual feedback to the developer and the reviewer, prior to merging the feature to the main code branch.

## System Architecture Diagram
![System architecture diagram](https://github.com/Dazza65/PullRequest-Checker/blob/main/diagrams/PullRequestChecker.png?raw=true)

## Usage

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests

