// @desc	Get express starter restful rolling
// @route	GET /
// access	Public

const getStart = (req, res, next) => {
  res.status(200).send({
    success: true,
    payload: {
      text: 'Express starter restful is awesome 😎'
    }
  })
}

module.exports = { getStart }
