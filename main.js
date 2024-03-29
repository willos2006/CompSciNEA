//These are all the modules used in the project
const express = require("express");
const crypto = require("crypto");
const bodyParser = require("body-parser")
const path = require("path");
const session = require("express-session");
const mysql = require("mysql2");

const port = 4000;
const app = express()

const salt = "f844b09ff50c"

var con = mysql.createConnection({
    host:"localhost",
    user: "root",
    password: "root",
    database: "neaDB"
});

con.connect(function(err) {
    if (err) throw err;
    console.log("connected to db");
  });

app.use(express.static("Frontend"))
app.use(bodyParser.urlencoded({extended: true}));

//This includes the backendFiles
require(__dirname + "/backendScript/loginHandler.js")(app, path, crypto, salt, bodyParser, session, con);
require(__dirname + "/backendScript/homePage.js")(app, path, crypto, salt, bodyParser, session, con);
require(__dirname + "/backendScript/classManagement.js")(app, path, crypto, salt, bodyParser, session, con);
require(__dirname + "/backendScript/quizLogic.js")(app, path, session, con);

app.get("/", (req, res) => {
    //res.sendFile(__dirname + "//Frontend//introPage.html");
    //For now this will redirect to the login page
    return res.redirect("/login");
});

app.listen(port);