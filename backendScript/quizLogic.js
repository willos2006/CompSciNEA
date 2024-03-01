module.exports = function (app, path, session, db){
    const webSocket = require("ws");
    const socketServer = new webSocket.Server({
        port: 8080
    });

    let sockets = []
    let games = [] //this will contain a list of active games with details of users and hosts.
    var nextID = 0;

    //A kind of enumeration to keep track of socket type
    const socketType = {
        uninitialised: 0,
        host: 1,
        player: 2
    }

    const gameState = {
        idle: 0,
        questionInProgress: 1
    }

    //This function handles the deletion of a socket when a user disconnects
    function deleteSocket(socket){
        if(socket.type == socketType.host){
            let gameToDelete = games.filter((x) => {return x.gameID == socket.id})[0]; //This filters the games array to find the game object of the host
            for (var i = 0; i < gameToDelete.players.length; i++){
                //Iterating through all players currently connected to quiz to send the disconnect message
                var userSocket = sockets.filter((x) => {return gameToDelete.players[i].uniqueID == x.id})[0];
                userSocket.send(JSON.stringify({type: "hostDisconnect"}));
            }
            //Removes the socket instance from the list of sockets
            index = games.indexOf(gameToDelete);
            games.splice(index, 1);
        }
        else if (socket.type == socketType.player){
            var userID;
            // tempGames will now contain any games that the user is part of.
            var tempGames = games.filter((x) => {
                //This second filter filters the playerlist by socket ID to see if any match the user that has disconnected
                let tempArr = x.players.filter((y) => {return y.uniqueID == socket.id});
                if (tempArr.length > 0){
                    userID = tempArr[0].userID;
                    return true;
                }
            });
            if (tempGames.length > 0){
                //This will run if there was any instances of the player in any active games
                let tempArr = sockets.filter((x) => {return x.id == tempGames[0].gameID}); //Fetches the socket of the game host
                tempArr[0].send(JSON.stringify({type: "userLeave", userID: userID})); //sends the disconnect message to the game host
                let gameIndex = games.indexOf(tempGames[0]);
                //These next lines deal with deleting the user from the players list of the game.
                //the filter allows us to find the index by looking for a match with what we have found and the actual list with [...].indexOf(..)
                tempArr = tempGames[0].players.filter((x) => {return x.userID == userID});
                let playerIndex = tempGames[0].players.indexOf(tempGames[0]); 
                games[gameIndex].players.splice(playerIndex, 1);
            }
        }
        //Deals with the deletion of the socket from the list of sockets.
        var index = sockets.indexOf(socket);
        sockets.splice(index, 1);
    }

    socketServer.on("connection", (socket) => {
        sockets.push(socket);
        socket.type = socketType.uninitialised;
        /*
        SOCKET IDS:
        0-UNINITIALISED
        1-HOST
        2-PLAYER
        */
       //keep alive script to check that the client is still listeing. If not, it will delete the connection and remove from lists
       //serverCount is incremented each time the function is ran (every 500ms)
       //clientCount is incremented whenever a pong is recieved from the client, after the server sends a ping
       //By comparing these two values, we can check that the server and client are still connected. 
       let serverCount = 0;
        let clientCount = 0;
        var keepAlive = setInterval(() => {
            if (serverCount != clientCount){
                //If the server cound and client count are not the same, then they must be disconnected
                deleteSocket(socket); //deletes the socket and associated data
                clearInterval(keepAlive); //stops the repitition of the function
                return;
            }
            serverCount++;
            socket.send(JSON.stringify({type: "ping"})); //sending a ping to the client
        }, 500);
        socket.on("message", (data) => {
            data = JSON.parse(data);
            if(data.type == "init"){
                socket.type = socketType.host;
                jsonObj = {
                    hostID: Number(data.userID), //userID of host
                    quizID: Number(data.quizID), //id of the quiz
                    gameID: nextID, //a unique id for the game. This is also the id given to the host socket.
                    //This may be confusing but it allows for one host to potentially host multiple games at once.
                    currState: gameState.idle, 
                    currQuestion: 0,
                    answered: 0,
                    currQuestionData: null,
                    classID: Number(data.classID),
                    players: []
                }
                socket.id=nextID;
                nextID++;
                games.push(jsonObj);
            }
            else if (data.type == "pong"){ //part of the ping/pong keep alive system
                clientCount++;
            }
            /* 
            getting values from the socket i.e. userID, socketID, gameID
            selects the game obj by filtering through the games array until an object with the correct gameID is found
            creating a user object to append to the game obj
            Sends a message to the host with details of the user that has joined.
            */
            else if (data.type == "joinGame"){
                socket.type = socketType.player;
                let gameID = data.gameID;
                let userID = data.userID;
                socket.id = nextID;
                nextID++;
                let username = data.username;
                let gameObj = games.filter((x)=>{return x.gameID == gameID})[0]; //This finds the game object to add the player to
                var index = games.indexOf(gameObj);
                var userJson = {
                    userID: Number(userID),
                    uniqueID: nextID - 1,
                    username: username,
                    score: 0,
                    questionsCompleted: [] //after each question the time taken to answer and result is stored so it can be saved later on and used for analytics
                }
                games[index].players.push(userJson);
                socketObj = sockets.filter((x) => {return x.id == games[index].gameID})[0]; //Finds the socket of the host
                index = sockets.indexOf(socketObj);
                sockets[index].send(JSON.stringify({type: "userJoin", userID: userID, username: username})); //tells the host that a user has connected and passes any relevant details
            }
            /* 
            this is the code which deals with the host moving to the next question
                
            */
            else if (data.type == "nextQuestion"){
                let quizObj = getQuizObj(games, socket.id);
                let index = games.indexOf(quizObj);
                games[index].answered = 0;
                //This query selects the questions for the selected quiz
                db.query("SELECT * FROM questionmapping, question WHERE questionmapping.quizID = ? AND questionmapping.questionID = question.questionID", [quizObj.quizID], (err, results) => {
                    if (err) throw err;
                    if (results.length >= quizObj.currQuestion + 1){
                        let question = results[quizObj.currQuestion].question; //question
                        games[index].currQuestionData = results[quizObj.currQuestion];
                        for (var i = 0; i < quizObj.players.length; i++){
                            userSocket = sockets.filter((x) => {return x.id == quizObj.players[i].uniqueID})[0]; //Finds the user socket
                            userSocket.send(JSON.stringify({type: "previewQuestion", questionNo: quizObj.currQuestion + 1, question: question})); //Sends the questionPreview message to the client
                        }
                        //Does the same as above but for the host.
                        hostSocket = getSocketObj(sockets, quizObj.gameID);
                        hostSocket.send(JSON.stringify({type: "previewQuestion", questionNo: quizObj.currQuestion + 1, question: question}));
                        setTimeout(() => { //This sends the clients the presentQuestion message telling them that the user can now submit a question
                            games[index].currQuestionData.startTime = new Date().getTime() / 1000;
                            for (var i = 0; i < quizObj.players.length; i++){
                                userSocket = sockets.filter((x) => {return x.id == quizObj.players[i].uniqueID})[0]; //Finds the user socket
                                userSocket.send(JSON.stringify({type: "presentQuestion", questionObj: games[index].currQuestionData, questionNo: quizObj.currQuestion + 1})); //Sends the questionPreview message to the client
                            }
                            games[index].currState = gameState.questionInProgress;
                            hostSocket.send(JSON.stringify({type: "presentQuestion", questionObj: games[index].currQuestionData, questionNo: quizObj.currQuestion + 1, totalUsers: quizObj.players.length}));
                        }, 3000);
                    }
                    else{
                        let players = games[index].players;
                        players.sort((a,b) => b.score - a.score);
                        for (var i = 0; i < players.length; i++){
                            let userSocket = sockets.filter((x) => {return x.id == players[i].uniqueID})[0];
                            userSocket.send(JSON.stringify({type: "gameOver", position: i + 1}));
                            let currPlayer = players[i];
                            db.query("SELECT * FROM analytics WHERE userID = ?", [currPlayer.userID], (err, results) => {
                                if (err) throw err;
                                questionIDs = [];
                                results.map((x) => {questionIDs.push(x.questionID)});
                                for (var question = 0; question < currPlayer.questionsCompleted.length; question++){
                                    let currQuestionObj = currPlayer.questionsCompleted[question];
                                    if (questionIDs.includes(currQuestionObj.questionID)){
                                        let analyticsObj = results.filter((x) => {return x.questionID == currQuestionObj.questionID})[0];
                                        let total = analyticsObj.avgTime * analyticsObj.timesAnswered;
                                        total += currQuestionObj.timeToAnswer;
                                        let timesAnswered = analyticsObj.timesAnswered + 1
                                        let avgTime = total / timesAnswered;
                                        db.query("UPDATE analytics SET avgTime = ?, timesAnswered = ?, lastAnswered = NOW() WHERE userID = ? and questionID = ?", [avgTime, timesAnswered, currPlayer.userID, currQuestionObj.questionID], (err, results) => {if (err) throw err;});
                                    }
                                    else{
                                        db.query("INSERT INTO analytics VALUES (?, ?, ?, 1, NOW())",[currPlayer.userID, currQuestionObj.questionID, currQuestionObj.timeToAnswer], (err, results) => {if (err) throw err;});
                                    }
                                }
                            })
                        }
                        let hostSocket = getSocketObj(sockets, games[index].gameID);
                        hostSocket.send(JSON.stringify({type: "gameOver", players: players}));
                    }
                });
            }
            //Need to focus on commenting this part of the code.
            else if (data.type == "submitQuestion"){
                var playerIndex;
                gameObj = games.filter((x) => {
                    let playerArr = x.players.filter((y) => {return y.uniqueID == socket.id});
                    if (playerArr.length > 0){
                        playerIndex = x.players.indexOf(playerArr[0]);
                        return true;
                    }
                })[0];
                var gameIndex = games.indexOf(gameObj);
                let answer = data.option;
                let timeToAnswer = (new Date().getTime() / 1000) - gameObj.currQuestionData.startTime;
                var answerCorrect = answer == gameObj.currQuestionData.correctAns;
                let score = 10000 * (2.64 ** (-timeToAnswer*0.3));
                if(!answerCorrect) timeToAnswer = timeToAnswer * 100;
                if (answerCorrect) games[gameIndex].players[playerIndex].score += score;
                games[gameIndex].players[playerIndex].questionsCompleted.push({questionID: gameObj.currQuestionData.questionID, result: answerCorrect, timeToAnswer: timeToAnswer});
                let hostSocket = getSocketObj(sockets, gameObj.gameID);
                games[gameIndex].answered += 1;
                hostSocket.send(JSON.stringify({type: "answerUpdate", totalAnswered: gameObj.answered, totalUsers: gameObj.players.length}));
                socket.send(JSON.stringify({type: "answerAccepted", timeTaken: timeToAnswer}));
            }
            else if (data.type == "finishQuestion"){
                var gameObj = getQuizObj(games, socket.id);
                var index = games.indexOf(gameObj);
                var totalUsers = gameObj.players.length;
                var questionData = gameObj.currQuestionData;
                let questionMapping = {
                    0: "ansA",
                    1: "ansB",
                    2: "ansC",
                    3: "ansD"
                }
                var correctAnswerIndex = questionMapping[questionData.correctAns];
                var correctAnswer = questionData[correctAnswerIndex];
                var totalCorrect = 0;
                for (var i = 0; i < totalUsers; i++){
                    let userObj = gameObj.players[i];
                    var result;
                    if (userObj.questionsCompleted.length == gameObj.currQuestion || userObj.questionsCompleted[gameObj.currQuestion].result == false){
                        result = false
                    }
                    else{
                        result = true;
                        totalCorrect += 1
                    }
                    var userSocket = sockets.filter((x) => {return x.id == userObj.uniqueID})[0];
                    userSocket.send(JSON.stringify({type: "resultData", result: result}));
                }
                var hostSocket = getSocketObj(sockets, gameObj.gameID);
                hostSocket.send(JSON.stringify({type: "resultData", totalCorrect: totalCorrect, totalUsers: totalUsers, userList: gameObj.players, correctAnswer: correctAnswer}));
                games[index].currState = gameState.idle;
                games[index].currQuestion += 1;
            }
        });
    });
    socketServer.on("disconnect", (socket) => {
        deleteSocket(socket);
    });

    app.get("/quizSelect", (req, res) => {
        if(req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/quizSelect.html"));
        }
        else{
            res.redirect("http://localhost:4000/home");
        }
    })

    //This fetches the quizzes from the database
    app.post("/getQuizList", (req, res) => {
        db.query("SELECT * FROM quiz", (err, results) => { //This fetches the name and ID of all quizzes
            if(err) throw(err);
            let initialRes = results;
            db.query("SELECT * FROM questionMapping", (err, results) => { //This allows us to determine the number of questions in each quiz
                if (err) throw (err);
                //This fetches the length of the quizzes. (When the database grows this may be too slow)
                for (var i = 0; i < initialRes.length; i++){
                    let newArr = results.filter((x) => {return x.quizID == initialRes[i].quizID});
                    initialRes[i].questionNo = newArr.length; //By filtering by quizID using the above line, we can determine the number of questions in each quiz
                }
                res.json(initialRes); //The resulting data will contain the quiz object from the origonal query with the number of questions appended.
            })
        });
    });

    //Simple route for quizHost, the main page for hosting a quiz
    app.get("/quizHost", (req, res) => {
        if(req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/quizHost.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    //Fetches the quizzes by class. returns the number of active quizzes for classes you are a part of
    app.post("/getQuizzesByClass", (req, res) => {
        var userID = req.session.user.userID;
        db.query("SELECT classID from classmap WHERE userID = ?", [userID], (err, results) => {
            if (err) throw (err);
            var idList = [];
            results.map((x) => {idList.push(x.classID)});
            var gamesList = games.filter((x) => {return idList.includes(Number(x.classID));}); //Checks if any classes you are a member of have any active quizzes
            res.json({gamesList: gamesList}); //returns a list of game objects for the client
        });
    });

    //Simple route for joining a quiz (this will be accessed by students)
    app.get("/joinQuiz", (req, res) => {
        if(req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/quizJoin.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    //simple route for playing a quiz, this is the main screen for playing a quiz. (accessed by students only)
    app.get("/playQuiz", (req, res) => {
        if (req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/quizUser.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    app.post("/getQuestion", (req, res) => {
        var userID = req.session.user.userID;
        db.query("SELECT * FROM analytics WHERE userID = ?", [userID], (err, results) => {
            if (err) throw err;
            var answeredList = results;
            db.query("SELECT * FROM question", (err, results) => {
                if (err) throw err;
                var allQuestions = results;
                answeredList.sort((a,b) => b.avgTime - a.avgTime); //sorts the list by time taken to answer
                for (var i = 0; i < answeredList.length; i++){
                    var timePrecedence = 2.4**-i * 100 * answeredList[i].avgTime;
                    var dateAnswered = answeredList[i].lastAnswered;
                    var timeDifference = (new Date() - dateAnswered);
                    var totalPrecedence = (timeDifference * 0.5) + timePrecedence;
                    answeredList[i].precedence = totalPrecedence;
                    var questionObj = allQuestions.filter((x) => {return x.questionID == answeredList[i].questionID})[0];
                    //I dont know how this is as quick as it is but i should look into a different way of handling this
                    for (var x = 0; x < totalPrecedence; x++){
                        allQuestions.push(questionObj);
                    }
                }
                let randomNumber = Math.floor(Math.random() * (allQuestions.length));
                var question = allQuestions[randomNumber];
                res.json({questionData: question});
            });
        })
    });

    app.post("/submitQuestionAnswer", (req, res) => {
        var questionID = req.body.questionID;
        var timeToAnswer = req.body.timeToAnswer;
        var userID = req.session.user.userID;
        var result = req.body.result;
        saveAnswer(db, userID, questionID, timeToAnswer, result);
        res.json({res: true});
    })

    app.get("/personalisedQuiz", (req, res) =>{
        if (req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/personalisedQuiz.html"));
        }
    })
}

function getQuizObj(games, gameID){
    let obj = games.filter((x) => {return x.gameID == gameID})[0];
    return obj;
}

function getSocketObj(sockets, socketID){
    let obj = sockets.filter((x) => {return x.id == socketID})[0];
    return obj;
}

function saveAnswer(db, userID, questionID, timeToAnswer, result){
    db.query("SELECT * FROM analytics WHERE userID = ? AND questionID = ?", [userID, questionID],(err, results) => {
        if (err) throw err;
        if (results.length > 0){
            var newAvg;
            var currTotal = results[0].timesAnswered;
            if (result) {
                //This calculates the average time. To make it more realistic, it will only use a total of 10 scores to calculate the average to make it eaasier to reduce the average
                let currAvg = results[0].avgTime;
                if (currTotal > 10){
                    let cumulativeTotal = Number(currTotal * currAvg) + Number(timeToAnswer);
                    newAvg = cumulativeTotal / (currTotal + 1);
                }
                else{
                    let cumulativeTotal = Number(currTotal * 5) + Number(timeToAnswer);
                    newAvg = cumulativeTotal / 11
                }
            }
            else{
                newAvg = timeToAnswer;
            }
            db.query("UPDATE analytics SET avgTime = ?, timesAnswered = ?, lastAnswered = NOW() WHERE userID = ? and questionID = ?", [newAvg, currTotal + 1, userID, questionID], (err, results) => {if (err) throw err;});
        }
        else{
            db.query("INSERT INTO analytics VALUES (?, ?, ?, 1, NOW())", [userID, questionID, timeToAnswer], (err, results) => {if (err) throw err;});
        }
    });
}