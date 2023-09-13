# CodeDesignPlus Git Version

Semver versioning based on the git history and commit messages of your repository.

## Overview

The `GitVersion` class calculates and fetches semantic versioning (Semver) information from a git repository based on its commit history and messages.

### Main Methods:

- **getPreviousVersion**: Returns the previous version of the repository.
- **getPreviousTagAndVersion**: Fetches both the previous tag and version of the repository.
- **currentBranchOrTag**: Determines the current branch or tag where the repository stands.
- **tagsByBranch**: Retrieves all the tags associated with a specific branch.
- **getNewVersion**: Calculates the new version based on commit history and the previous version.

## Inputs

### `version`
**Required** The version of the tool to be run. Default is `latest`.

### `folder`
**Required** Execute the command in the defined folder.

### `release-branch`
**Required** The name of the release branch. Default is `main`.

### `release-candidate-branch`
**Required** The name of the release candidate branch. Default is `rc`.

### `beta-branch`
**Required** The name of the beta branch. Default is `dev`.

### `major-identifier`
**Required** Specifies the string or regex to identify a major release commit. Default is `breaking`.

### `minor-identifier`
**Required** Specifies the string or regex to identify a minor release commit. Default is `feat`.

### `prefix`
The prefix to use in the version. Default is `v`.

### `dir-affected`
Directory affected inside monorepo to calculate changes (comma-separated). Default is `./`.

### `previous-version`
Returns the previous tag instead of calculating a new one. Default is `true`.

### `new-version`
Returns the new version. Default is `true`.

## Outputs

### `new-version`
The value of the new pre-calculated tag.

### `new-version-prefix`
The value of the new pre-calculated tag.

### `previous-tag`
Contains the value of the previous tag, before calculating a new one.

### `previous-version`
Contains the value of the previous tag, before calculating a new one.

### `previous-version-prefix`
Contains the value of the previous tag, before calculating a new one.

## Internal Working:

1. **currentCommitHash**: Returns the current commit's hash in a short format.
2. **getCommitsSince**: Retrieves a list of all commits since a specific tag.
3. **commitsDistance**: Returns the number of commits since a given tag.

### Helper Functions:

- **stripPrefix**: Removes the prefix from a version, if present.
- **addPrefix**: Adds the version prefix.
- **execSingle** and **execMultiple**: These functions aid in executing git commands and processing their output.

## Known Limitations:

- The code assumes that all commit messages follow certain conventions, especially to identify major and minor versions.
- If there's an error executing a git command, an error will be thrown. Thus, it's essential that the action runs in an environment where git is available and properly set up.

## Example usage

```yaml
uses: codedesignplus/git-version@v0.0.1
with:
  folder: ${{github.workspace}}
  release-branch: 'main'
  release-candidate-branch: 'rc'
  beta-branch: 'dev'
  major-identifier: 'breaking'
  minor-identifier: 'feat' 
  prefix: 'v'
  dir-affected: ./
  previous-version: true
  new-version: true