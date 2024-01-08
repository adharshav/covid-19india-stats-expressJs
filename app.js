const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at 3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

const states = statesList => {
  return {
    stateId: statesList.state_id,
    stateName: statesList.state_name,
    population: statesList.population,
  }
}

//Get states API
app.get('/states/', async (request, response) => {
  const getStatesQuery = `
    SELECT * FROM 
    state
    ORDER BY
    state_id`

  const statesArray = await db.all(getStatesQuery)
  response.send(statesArray.map(eachState => states(eachState)))
})

//Get state by stateId
app.get('/states/:stateId', async (request, response) => {
  const {stateId} = request.params
  const getStateByIdQuery = `
    SELECT * FROM 
    state
    WHERE
    state_id = ${stateId}`

  const stateByIdArray = await db.get(getStateByIdQuery)
  response.send(states(stateByIdArray))
})

//Add district API
app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails

  const addDistrictQuery = `
  INSERT INTO 
  district (district_name, state_id, cases, cured, active, deaths) 
  VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths})`

  const districtArray = await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

//Get district by districtId
const districts = objectDb => {
  return {
    districtId: objectDb.district_id,
    districtName: objectDb.district_name,
    stateId: objectDb.state_id,
    cases: objectDb.cases,
    cured: objectDb.cured,
    active: objectDb.active,
    deaths: objectDb.deaths,
  }
}
app.get('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params

  const getDistrictByIdQuery = `
  SELECT * 
  FROM 
  district 
  WHERE 
  district_id = ${districtId}`

  const districtByIdArray = await db.get(getDistrictByIdQuery)
  response.send(districts(districtByIdArray))
})

//Delete district API
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
  DELETE 
  FROM 
  district 
  WHERE 
  district_id = ${districtId}`

  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

//Update district by districtId
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const updateDistrictQuery = `
  UPDATE district 
  SET 
  district_name = '${districtName}', state_id = ${stateId}, cases = ${cases}, 
  cured = ${cured}, active = ${active}, deaths = ${deaths}
  WHERE district_id = ${districtId}`

  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

//Get total details of state by stateId
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params

  const getstatsByStateIdQuery = `
  SELECT 
    SUM(cases) AS totalCases,
    SUM(cured) AS totalCured,
    SUM(active) AS totalActive,
    SUM(deaths) AS totalDeaths 
  FROM 
    district 
  WHERE 
    state_id = ${stateId}`

  const totalStatsArray = await db.get(getstatsByStateIdQuery)
  response.send(totalStatsArray)
})

//Get state name of a district based oon district ID
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params

  const getDistrictIdQuery = `
  SELECT state_id 
  FROM district 
  WHERE 
  district_id = ${districtId}`
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery)

  const getStateNameQuery = `
  SELECT state_name AS stateName 
  FROM state 
  WHERE 
  state_id = ${getDistrictIdQueryResponse.state_id}`
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
})
module.exports = app
