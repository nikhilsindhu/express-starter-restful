let cropMeta = require('../resources/crop.json')

function getCropMeta({ cropName, cropVillageName }) {
  if (
    cropMeta &&
    typeof cropMeta === 'object' &&
    cropVillageName in cropMeta &&
    cropMeta[cropVillageName]
  ) {
    const cropMetaList = cropMeta[cropVillageName]
    const resultedCropMeta = Array.isArray(cropMetaList)
      ? cropMetaList.find(
          cropMetaData => cropMetaData && cropMetaData.cropName === cropName
        )
      : undefined
    return resultedCropMeta
  }
  return undefined
}

module.exports = getCropMeta
