import { execSync } from 'child_process'
import { GitVersionOptions } from './git-version.options'
import semver from 'semver'
import * as core from '@actions/core'

//https://blog.logrocket.com/building-typescript-cli-node-js-commander/
//https://github.com/npm/node-semver

export class GitVersion {
  private readonly baseVersion: string = '0.0.0'

  private options: GitVersionOptions

  public constructor(options: GitVersionOptions) {
    this.options = options
  }

  public getPreviousVersion(): {
    'previous-tag': string | null
    'previous-version-prefix': string
    'previous-veresion': string
  } {
    const { previousTag, previousVersion } = this.getPreviousTagAndVersion()

    return {
      'previous-tag': previousTag,
      'previous-version-prefix': previousTag
        ? previousTag
        : this.addPrefix(previousVersion),
      'previous-veresion': previousTag ? previousTag : `${previousVersion}`
    }
  }

  public getPreviousTagAndVersion(): {
    previousTag: string | null
    previousVersion: string
  } {
    const cb = this.currentBranchOrTag()

    const branchTags = this.tagsByBranch(cb)

    let previousVersion = this.baseVersion
    let previousTag = null

    for (const tag of branchTags) {
      const tagWithoutPrefix = this.stripPrefix(tag)

      if (tagWithoutPrefix === null) {
        continue
      }

      const currentVersion = semver.parse(tagWithoutPrefix)

      if (!currentVersion) {
        continue
      }

      if (currentVersion.prerelease.length > 0) {
        continue
      } else if (semver.lt(previousVersion, currentVersion)) {
        previousVersion = currentVersion.version
        previousTag = tag
      }
    }

    return { previousTag, previousVersion }
  }

  public currentBranchOrTag(): string {
    try {
      return this.execSingle('git symbolic-ref --short HEAD')
    } catch (error) {
      return this.execSingle('git describe --tags')
    }
  }

  public tagsByBranch(branch: string): string[] {
    const result = this.execMultiple(`git tag --merged ${branch}`)

    return result
  }

  private stripPrefix(version: string): string | null {
    if (!version.startsWith(this.options.prefix)) {
      return null
    }

    return version.substring(this.options.prefix.length)
  }

  public getNewVersion(): {
    version: string
    'version-complete': string
  } {
    const { previousTag, previousVersion } = this.getPreviousTagAndVersion()

    let newVersion: string | null = semver.inc(previousVersion, 'patch')

    if (!newVersion) throw new Error(`Previous Version can't increment`)

    const gitCommitsSince = this.getCommitsSince(previousVersion)

    let major = false

    for (const item of gitCommitsSince) {
      const commit = item.toLocaleLowerCase()

      let match: boolean | (RegExpMatchArray | null)

      if (this.options.majorIdIsRegex) {
        match = new RegExp(this.options.majorIdentifier).exec(commit)
      } else {
        match = commit.includes(this.options.majorIdentifier)
      }

      if (match) {
        newVersion = semver.inc(previousVersion, 'major')
        major = true
        continue
      }
    }

    if (!major) {
      for (const item of gitCommitsSince) {
        const commit = item.toLocaleLowerCase()

        let match: boolean | (RegExpMatchArray | null)

        if (this.options.minorIdIsRegex) {
          match = new RegExp(this.options.minorIdentifier).exec(commit)
        } else {
          match = commit.includes(this.options.minorIdentifier)
        }

        if (match) {
          newVersion = semver.inc(previousVersion, 'minor')
          continue
        }
      }
    }

    const currentBranch = this.currentBranchOrTag()

    if (currentBranch === this.options.releaseBranch) {
      core.debug('Release Branch')
    } else if (currentBranch === this.options.releaseCandidateBranch) {
      const prerelease: (string | number)[] = [
        this.options.releaseCandidateBranchSufix,
        this.commitsDistance(previousTag)
      ]

      const version = semver.parse(newVersion)

      if (version) {
        const versionWithoutPrerelease = `${version.major}.${version.minor}.${version.patch}`

        newVersion = semver.inc(
          versionWithoutPrerelease,
          'prerelease',
          prerelease.join('.'),
          false
        )

        newVersion = this.decrementPath(newVersion)
      }
    } else if (currentBranch === this.options.betaBranch) {
      const prerelease: (string | number)[] = [
        this.options.developmentBranchSufix,
        this.commitsDistance(previousTag)
      ]

      const version = semver.parse(newVersion)

      if (version) {
        const versionWithoutPrerelease = `${version.major}.${version.minor}.${version.patch}`

        newVersion = semver.inc(
          versionWithoutPrerelease,
          'prerelease',
          prerelease.join('.'),
          false
        )

        newVersion = this.decrementPath(newVersion)
      }
    } else {
      const prerelease: (string | number)[] = [
        this.options.defaultSufix,
        this.commitsDistance(previousTag)
      ]

      const version = semver.parse(newVersion)

      if (version) {
        const versionWithoutPrerelease = `${version.major}.${version.minor}.${version.patch}`

        newVersion = semver.inc(
          versionWithoutPrerelease,
          'prerelease',
          prerelease.join('.'),
          false
        )

        newVersion = this.decrementPath(newVersion)
      }
    }

    if (major) {
      const version = semver.parse(newVersion)

      if (version) {
        version.patch = 0

        newVersion = version.format()
      }
    }

    return {
      version: `${newVersion}`,
      'version-complete': this.addPrefix(newVersion)
    }
  }

  private decrementPath(newVersion: string | null): string | null {
    const version = semver.parse(newVersion)

    if (version) {
      version.patch -= 1

      newVersion = version.format()
    }

    return newVersion
  }

  private getCommitsSince(tag: string | null): string[] {
    try {
      if (tag && this.execMultiple(`git tag -l ${tag}`).length > 0) {
        const lastCommit = this.execMultiple(`git show-ref -s ${tag}`)[0]
        return this.execMultiple(
          `git log --pretty=%B ${lastCommit}..HEAD ${this.options.logPathsFilter()}`
        )
      } else {
        return this.execMultiple(`git log --pretty=%B`)
      }
    } catch (error) {
      return []
    }
  }

  private commitsDistance(tag: string | null): number {
    return this.getCommitsSince(tag).length

    // try {
    //   if (!tag) {
    //     return Number.parseInt(this.execMultiple(`git rev-list --count HEAD`)[0]);
    //   } else {
    //     return Number.parseInt(this.execMultiple(`git rev-list --count HEAD ^refs/tags/${tag}`)[0]);
    //   }
    // } catch (error) {
    //   return 0
    // }
  }

  public currentCommitHash(): string {
    const cmd = 'git rev-parse --verify HEAD --short'

    const result = this.execSingle(cmd).toString().trim()

    return result.padStart(7, '0')
  }

  private addPrefix(version: string | null): string {
    return `${this.options.prefix}${version}`
  }

  private execSingle(cmd: string): string {
    return this.execMultiple(cmd)[0]
  }

  private execMultiple(cmd: string): string[] {
    try {
      const output = execSync(cmd, {
        cwd: this.options.folder,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      })

      return output.split('\n').filter(line => line.trim() !== '')
    } catch (error) {
      throw new Error(`[ERROR] Command ${cmd} failed.`)
    }
  }
}
