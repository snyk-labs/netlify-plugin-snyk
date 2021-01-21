/* eslint-disable security/detect-child-process */
const path = require('path')
const ChildProcess = require('child_process')
const plugin = require('../src/index')

const utils = {
  build: {
    failBuild: jest.fn()
  },
  status: {
    show: jest.fn()
  }
}

describe('onPreBuild', () => {
  let consoleSpy
  beforeEach(() => {
    consoleSpy = jest.spyOn(global.console, 'log')
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  test('No vulnerabilities detected show a success message', async () => {
    process.chdir(path.resolve(path.join(__dirname, './__fixtures__/fixture-no-vulns')))

    await plugin.onPreBuild({ utils })

    expect(console.log.mock.calls[0][0]).toEqual(
      expect.stringContaining('Snyk security test completed. no vulnerable paths found.')
    )
    expect(console.log.mock.calls[1][0]).toEqual(expect.stringContaining("You're good to go!"))

    expect(utils.status.show.mock.calls[0][0].title).toEqual(
      expect.stringContaining('Snyk security scan finished')
    )
    expect(utils.status.show.mock.calls[0][0].summary).toEqual(
      expect.stringContaining('Good job keeping it clean')
    )

    utils.status.show.mockReset()
  })

  test('If vulnerabilities are found fail the build', async () => {
    process.chdir(path.resolve(path.join(__dirname, './__fixtures__/fixture-vulns-found')))

    await plugin.onPreBuild({ utils })
    expect(console.log.mock.calls[0][0]).toEqual(expect.stringContaining('Tested 2 dependencies'))

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      expect.stringContaining('security vulnerabilities detected.')
    )

    utils.build.failBuild.mockReset()
  })

  test('Show error when dependencies manifest is missing', async () => {
    process.chdir(path.resolve(path.join(__dirname, './__fixtures__/fixture-error-no-deps')))

    await plugin.onPreBuild({ utils })

    expect(console.log.mock.calls.length).toEqual(0)
    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      expect.stringContaining('missing node_modules folders')
    )

    utils.build.failBuild.mockReset()
  })

  test('Show error when no supported manifest files exist', async () => {
    process.chdir(
      path.resolve(path.join(__dirname, './__fixtures__/fixture-error-no-supported-files'))
    )

    await plugin.onPreBuild({ utils })

    expect(console.log.mock.calls.length).toEqual(0)
    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      expect.stringContaining("can't detect package manifest files")
    )

    utils.build.failBuild.mockReset()
  })

  test('Show error when no Snyk token is provided', async () => {
    const SNYK_TOKEN_VALUE = process.env.SNYK_TOKEN
    process.env.SNYK_TOKEN = ''
    process.chdir(path.resolve(path.join(__dirname, './__fixtures__/fixture-no-vulns')))

    await plugin.onPreBuild({ utils })

    expect(console.log.mock.calls[0][0]).toEqual(
      expect.stringContaining("Seems like you're missing the Snyk API token.")
    )
    expect(console.log.mock.calls[2][0]).toEqual(
      expect.stringContaining(
        'If you have the Snyk CLI installed you can get it with: snyk config get api'
      )
    )
    expect(console.log.mock.calls[3][0]).toEqual(
      expect.stringContaining(
        'Retrieve the API token from the UI: https://support.snyk.io/hc/en-us/articles/360004037537-Authentication-for-third-party-tools'
      )
    )

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      expect.stringContaining('missing Snyk API token')
    )

    utils.build.failBuild.mockReset()
    process.env.SNYK_TOKEN = SNYK_TOKEN_VALUE
  })

  test('Does not fail the build if this is a deploy preview and appropriate setting was configured for that', async () => {
    process.chdir(path.resolve(path.join(__dirname, './__fixtures__/fixture-vulns-found')))

    process.env.CONTEXT = 'deploy-preview'
    const inputs = {
      failOnPreviews: false
    }

    await plugin.onPreBuild({ utils, inputs })

    expect(console.log.mock.calls[0][0]).toEqual(expect.stringContaining('Tested 2 dependencies'))
    expect(console.log.mock.calls[0][0]).toEqual(expect.stringContaining('found 2 issues'))
    expect(console.log.mock.calls[0][0]).toEqual(expect.stringContaining('2 vulnerable paths'))
    expect(console.log.mock.calls[0][0]).toEqual(expect.stringContaining('buefy@0.8.17'))
    expect(console.log.mock.calls[0][0]).toEqual(expect.stringContaining('Target file:'))
    expect(console.log.mock.calls[0][0]).toEqual(expect.stringContaining('Organization'))

    expect(console.log.mock.calls[2][0]).toEqual(
      expect.stringContaining('Snyk test found security vulnerabilities in production dependencies')
    )
    expect(console.log.mock.calls[3][0]).toEqual(
      expect.stringContaining('It is recommended you review before deploying')
    )

    expect(console.log.mock.calls[4][0]).toEqual(
      expect.stringContaining(
        'Skipping build failure: detected this build is a deploy preview and plugin set to avoid failures'
      )
    )

    utils.build.failBuild.mockReset()
  })

  test('Does not add yarn workspaces argument by default', async () => {
    const childProcessSpy = jest.spyOn(ChildProcess, 'execFile')
    process.chdir(path.resolve(path.join(__dirname, './__fixtures__/fixture-no-vulns')))

    await plugin.onPreBuild({ utils })

    expect(childProcessSpy).toHaveBeenCalledWith(
      'npx',
      expect.not.arrayContaining(['--yarn-workspaces']),
      expect.any(Object),
      expect.any(Function)
    )

    utils.status.show.mockReset()
    childProcessSpy.mockRestore()
  })

  test('Add yarn workspaces argument when the appropriate setting is configured', async () => {
    const childProcessSpy = jest.spyOn(ChildProcess, 'execFile')
    process.chdir(path.resolve(path.join(__dirname, './__fixtures__/fixture-no-vulns')))

    const inputs = {
      yarnWorkspaces: true
    }

    await plugin.onPreBuild({ utils, inputs })

    expect(childProcessSpy).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--yarn-workspaces']),
      expect.any(Object),
      expect.any(Function)
    )

    utils.status.show.mockReset()
    childProcessSpy.mockRestore()
  })
})
