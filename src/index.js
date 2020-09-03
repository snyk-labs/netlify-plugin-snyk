const chalk = require('chalk')
const debug = require('debug')('netlify-plugin-snyk')
const Audit = require('./Audit')
const audit = new Audit()

module.exports = {
  onPreBuild: async ({ utils }) => {
    const projectDirectory = process.cwd()
    debug(`detected working directory: `, projectDirectory)

    let testResults
    let vulnerabilitiesFound = false
    try {
      testResults = await audit.test({ directory: projectDirectory })
      vulnerabilitiesFound = true
    } catch (error) {
      utils.build.failBuild(error.message)
    }

    if (vulnerabilitiesFound && testResults) {
      const testResultsString = audit.formatOutput(testResults)
      console.log(testResultsString)
      console.log(chalk.red(`Snyk test found security vulnerabilities in production dependencies.`))
      console.log(chalk.red(`It is recommended you review before deploying`))
      utils.build.failBuild(`security vulnerabilities detected.`)

      utils.status.show({
        title: 'Snyk security test completed',
        summary: `Security vulnerabilities were detected.`
      })
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
