const chalk = require('chalk')
const debug = require('debug')('netlify-plugin-snyk')
const Audit = require('./Audit')
const audit = new Audit()

module.exports = {
  onPreBuild: async ({ inputs, utils }) => {
    const IS_DEPLOY_PREVIEW = process.env.CONTEXT === 'deploy-preview'
    const projectDirectory = process.cwd()
    debug(`detected working directory: `, projectDirectory)

    let testResults
    let vulnerabilitiesFound = false
    try {
      testResults = await audit.test({ directory: projectDirectory })
      vulnerabilitiesFound = true
    } catch (error) {
      return utils.build.failBuild(error.message)
    }

    if (vulnerabilitiesFound && testResults) {
      const testResultsString = audit.formatOutput(testResults)
      console.log(testResultsString)
      console.log()
      console.log(chalk.red(`Snyk test found security vulnerabilities in production dependencies.`))
      console.log(chalk.red(`It is recommended you review before deploying`))
      if (IS_DEPLOY_PREVIEW && inputs.failOnPreviews === false) {
        console.log(
          'Skipping build failure: detected this build is a deploy preview and plugin set to avoid failures'
        )
        return
      }
      utils.build.failBuild(`security vulnerabilities detected.`)
    } else {
      console.log(chalk.green(`Snyk security test completed. no vulnerable paths found.`))
      console.log(chalk.green(`You're good to go!`))

      utils.status.show({
        title: 'Snyk security scan finished',
        summary: `Good job keeping it clean 👏`
      })
    }
  }
}
