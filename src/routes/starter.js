let fs = require('fs')
let express = require('express')
let axios = require('axios')

// import utils
let getFormattedDate = require('../utils/getFormattedDate')
let getCropMeta = require('../utils/getCropMeta')

// Load controllers
let { getStart } = require('../controllers/starter')
let dataset = require('../resources/dataset.json')
// import outputFile from '../resources/output.json'
let outputFile = require('../../output.json')
let branch = require('../resources/branch.json')

const branchId = (branch && branch['Branch ID']) || null
const premiumDebitDate = (branch && branch['Premium Debit Date']) || null
const sowingDate = (branch && branch['Sowing Date']) || null
const cookie = (branch && branch.Cookie) || null

const starterRouter = express.Router()

console.log('Total records', dataset.length)

if (branchId && cookie) {
  dataset.forEach(async (record, recordIndex) => {
    const accountNo = record['Account Number'] || null
    const landSurveyNumber = record['Land Survey Number']
      ? `${record['Land Survey Number']}`
      : null
    const landDivisionNumber = record['Land SubDivision Number']
      ? `${record['Land SubDivision Number']}`
      : null
    const policyArea = record['Area Insured'] || null
    const cropName = record['Crop Name'] || null
    const cropVillageName = record['Crop Village Name'] || null

    if (accountNo) {
      try {
        const response = await axios({
          baseURL: 'https://pmfby.gov.in',
          url: '/policyClaim/farmerFinancialDetails',
          params: {
            farmerId: accountNo,
            where: 'bank',
            branchID: branchId,
            formType: 'loanee'
          },
          headers: {
            Cookie: cookie
          }
        })

        const { status, data: payload } = response

        // If request is success, handle payload
        if (status === 200 && payload) {
          const { data, status: success } = payload

          // If request payload is success
          if (success && data) {
            const { accountDetails, farmerDetails } = data

            // Check is details are in correct format
            if (
              Array.isArray(accountDetails) &&
              accountDetails.length === 1 &&
              Array.isArray(farmerDetails) &&
              farmerDetails.length === 1
            ) {
              // If the account is not Joint accoiunt

              const {
                financialID, // TODO: financialDetailsID
                farmerID, // TODO: primaryFarmerID
                branchID // TODO: createdBranchID
              } = accountDetails[0]

              const { resVillage, resState } = farmerDetails[0]

              const unixPremiumDebitDate = getFormattedDate(premiumDebitDate)
              const unixSowingDate = getFormattedDate(sowingDate)

              const {
                cnID,
                cropID,
                sumInsured,
                farmerShare: farmerSharePercentage
              } = getCropMeta({ cropName, cropVillageName }) || {}

              const farmerShare =
                typeof policyArea === 'number' &&
                typeof farmerSharePercentage === 'number' &&
                typeof sumInsured === 'number'
                  ? parseFloat(
                      (policyArea * farmerSharePercentage * sumInsured) /
                        (100).toFixed(2)
                    )
                  : null

              if (
                [
                  financialID,
                  branchID,
                  resVillage,
                  cropID,
                  cnID,
                  landSurveyNumber,
                  landDivisionNumber,
                  resState,
                  farmerID
                ].every(value => typeof value === 'string') &&
                [
                  policyArea,
                  farmerShare,
                  unixPremiumDebitDate,
                  unixSowingDate
                ].every(value => typeof value === 'number')
              ) {
                const addPolicyBody = {
                  data: {
                    financialDetailsID: financialID,
                    createdBranchID: branchID,
                    createdPacsID: '',
                    userRoleName: 'BANK_USER',
                    policyData: [
                      {
                        villageID: resVillage,
                        cropID,
                        cropNotificationID: cnID,
                        landSurveyNumber,
                        landDivisionNumber,
                        policyArea,
                        stateID: resState,
                        farmerShare,
                        premiumDebitDate: unixPremiumDebitDate,
                        sowingDate: unixSowingDate,
                        isMix: 0
                      }
                    ],
                    primaryFarmerID: farmerID
                  },
                  formType: 'loanee'
                }

                try {
                  const addPolicyResponse = await axios({
                    baseURL: 'https://pmfby.gov.in',
                    url: '/policyClaim/policy',
                    method: 'POST',
                    data: addPolicyBody,
                    headers: {
                      Cookie: cookie
                    }
                  })

                  const {
                    status: addPolicyResponseStatus,
                    data: addPolicyResponseData
                  } = addPolicyResponse || {}

                  if (
                    addPolicyResponseStatus === 200 &&
                    addPolicyResponseData
                  ) {
                    const { status: addPoliceStatus, data: addPoliceData } =
                      addPolicyResponseData || {}

                    const { policyID, accountNumber } =
                      (addPoliceData && addPoliceData[0]) || {}

                    if (policyID && accountNumber) {
                      const policyPayload = {
                        'Policy ID': policyID,
                        'Account ID': accountNumber
                      }

                      console.log(
                        `${recordIndex +
                          1}: Policy ID ${policyID} with Account No. ${accountNumber} has created successfully!`
                      )

                      const updatedOutputFile = outputFile
                      updatedOutputFile.push(policyPayload)
                      await fs.writeFileSync(
                        'output.json',
                        JSON.stringify(updatedOutputFile)
                      )
                    } else {
                      console.log(
                        `${recordIndex + 1}: Network issue `,
                        JSON.stringify(
                          { addPolicyResponseStatus, addPolicyResponseData },
                          null,
                          2
                        )
                      )
                    }
                  } else {
                    console.log(
                      `${recordIndex + 1}: Network issue `,
                      JSON.stringify(
                        { addPolicyResponseStatus, addPolicyResponseData },
                        null,
                        2
                      )
                    )
                  }
                } catch (err) {
                  console.error(err)
                }
              } else {
                console.error(
                  `For ${accountNo}, These values should be string`,
                  {
                    financialID,
                    branchID,
                    resVillage,
                    cropID,
                    cnID,
                    landSurveyNumber,
                    landDivisionNumber,
                    resState,
                    farmerID,
                    cropVillageName,
                    cropName
                  }
                )

                console.error(
                  `For ${accountNo}, These values should be number`,
                  {
                    policyArea,
                    farmerShare,
                    unixPremiumDebitDate,
                    unixSowingDate
                  }
                )
              }
            } else {
              console.log(
                `${recordIndex +
                  1}: Not able to upload policy for Account No. ${accountNo}`,
                JSON.stringify({ status, payload }, null, 2)
              )
            }
          } else {
            console.log(
              `${recordIndex + 1}: Network issue `,
              JSON.stringify({ status, payload }, null, 2)
            )
          }
        } else {
          console.log(
            `${recordIndex + 1}: Network issue `,
            JSON.stringify({ status, payload }, null, 2)
          )
        }
      } catch (error) {
        console.log(
          `${recordIndex + 1}: Uncaught error `,
          JSON.stringify({ error }, null, 2)
        )
      }
    } else {
      console.error(`${recordIndex + 1}: Please add a valid Account No`)
    }
  })
} else {
  console.error('Please add a valid Branch ID & Cookie')
}

starterRouter.route('/').get(getStart)

module.exports = starterRouter
