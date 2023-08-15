let { isValid, parse, getUnixTime } = require('date-fns')

/**
 * input format // MM-DD-YYYY
 */
function getFormattedDate(date) {
  const parsedDate = parse(date, 'dd/MM/yyyy', new Date())
  if (isValid(parsedDate)) {
    return getUnixTime(parsedDate)
  }
  return null
}

module.exports = getFormattedDate
