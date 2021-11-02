const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

function updatedDataBase(newUserData) {
  return {
    username: newUserData.username,
    tweet: newUserData.tweet,
    dateTime: newUserData.date_time,
  };
}

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  console.log(authHeader);
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "My_Secret_token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}
//Register API

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  console.log(username);
  const maskedPassword = await bcrypt.hash(request.body.password, 10);
  console.log(maskedPassword);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  console.log(databaseUser);
  if (databaseUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const insertUserQuery = `INSERT INTO user(username,password,name,gender) VALUES ('${username}','${maskedPassword}','${name}','${gender}');`;
      const insertedUserDatabase = await database.run(insertUserQuery);
      console.log(insertedUserDatabase);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  console.log(username);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  console.log(databaseUser);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "My_Secret_token");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const sqlRequestQuery = `SELECT username,date_time,tweet FROM tweet INNER JOIN user ON tweet.user_id=user.user_id ;`;
  const databaseUser = await database.all(sqlRequestQuery);
  const newData = databaseUser.map((eachData) => updatedDataBase(eachData));
  console.log(newData);
  response.send(newData);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const sqlRequestQuery = `SELECT name FROM user INNER JOIN follower ON user.user_id= follower.following_user_id;`;
  const databaseUser = await database.all(sqlRequestQuery);
  console.log(databaseUser);
  response.send(databaseUser);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const sqlRequestQuery = `SELECT name FROM user INNER JOIN follower ON user.user_id= follower.follower_user_id;`;
  const databaseUser = await database.all(sqlRequestQuery);
  console.log(databaseUser);
  response.send(databaseUser);
});

module.exports = app;
