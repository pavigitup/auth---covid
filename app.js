const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const login = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "jyuyyhiuiuoi", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  }
};
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT *
    FROM user
    where username = '${username}'`;
  const checkUser = await db.get(selectUserQuery);
  if (checkUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      checkUser.password
    );
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "jyuyyhiuiuoi");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/states/", login, async (request, response) => {
  const getStates = `
                    SELECT *
                    FROM state
                    order by state_id;
                    `;
  const states = await db.all(getStates);
  const result = (states) => {
    const state = states.map((e) => {
      return {
        stateId: e.state_id,
        stateName: e.state_name,
        population: e.population,
      };
    });
    return state;
  };
  response.send(result(states));
});

app.get("/states/:stateId/", login, async (request, response) => {
  const { stateId } = request.params;
  const getState = `
            SELECT *
            FROM state
            WHERE state_id = ${stateId}`;
  const state = await db.get(getState);
  const ans = (state) => {
    return {
      stateId: state.state_id,
      stateName: state.state_name,
      population: state.population,
    };
  };
  response.send(ans(state));
});

app.post("/districts/", login, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createState = `
          INSERT INTO district(
              district_name,state_id,cases,cured,active,deaths

          )
          VALUES(
              '${districtName}',${stateId},${cases},${cured},${active},${deaths}
          );
          `;
  await db.run(createState);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", login, async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `
            SELECT *
            FROM district
            WHERE district_id = ${districtId}`;
  const district = await db.get(getDistrict);
  const ans = (district) => {
    return {
      districtId: district.district_id,
      districtName: district.district_name,
      stateId: district.state_id,
      cases: district.cases,
      cured: district.cured,
      active: district.active,
      deaths: district.deaths,
    };
  };
  response.send(ans(district));
});

app.put("/districts/:districtId/", login, async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateDistrict = `
            UPDATE district
            SET 
            district_name = '${districtName}', 
            state_id = ${stateId}, 
            cases = ${cases}, 
            cured = ${cured}, 
            active = ${active}, 
            deaths = ${deaths}
            `;
  await db.run(updateDistrict);
  response.send("District Details Updated");
});

app.delete("/districts/:districtId/", login, async (request, response) => {
  const { districtId } = request.params;

  const updateDistrict = `
          DELETE FROM district
          WHERE district_id = ${districtId}
            `;
  await db.run(updateDistrict);
  response.send("District Removed");
});

module.exports = app;
