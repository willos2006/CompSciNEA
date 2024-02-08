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
            else if (data.type == "joinGame"){
                socket.type = socketType.player;
                let gameID = data.gameID;
                let userID = data.userID;
                socket.id = nextID;
                nextID++;
                let username = data.username;
                let tempArray = games.filter((x)=>{return x.gameID == gameID}); //This finds the game object to add the player to
                var index = games.indexOf(tempArray[0]);
                var userJson = {
                    userID: Number(userID),
                    uniqueID: nextID - 1,
                    username: username,
                    score: 0,
                    questionsCompleted: [] //after each question the time taken to answer and result is stored so it can be saved later on and used for analytics
                }
                games[index].players.push(userJson);
                tempArray = sockets.filter((x) => {return x.id == games[index].gameID}); //Finds the socket of the host
                index = sockets.indexOf(tempArray[0]);
                sockets[index].send(JSON.stringify({type: "userJoin", userID: userID, username: username})); //tells the host that a user has connected and passes any relevant details
            }
            else if (data.type == "nextQuestion"){
                let quizObj = games.filter((x) => {return x.gameID == socket.id})[0];
                let index = games.indexOf(quizObj);
                games[index].answered = 0;
                //This query selects the question mappings to find the questionIDs for the selected quiz
                db.query("SELECT questionID FROM questionmapping WHERE quizID = ?", [quizObj.quizID], (err, results) => {
                    if (err) throw err;
                    currQuestionID = results[quizObj.currQuestion]; //This finds the next question by selecting the nth item that was sent to us by the database
                    db.query("SELECT * FROM question WHERE questionID = ?", [currQuestionID], (err, results) => { //This question is then searched for using it's ID from the previous query
                        if (err) throw err;
                        let question = results[0].question; //question
                        games[index].currQuestionData = results[0];
                        games[index].currQuestionData.startTime = new Date().getTime() / 1000;
                        for (var i = 0; i < quizObj.players.length; i++){
                            userSocket = sockets.filter((x) => {return x.id == quizObj.players[i].uniqueID})[0]; //Finds the user socket
                            userSocket.send(JSON.stringify({type: "previewQuestion", questionNo: quizObj.currQuestion + 1, question: question})); //Sends the questionPreview message to the client
                        }
                        //Does the same as above but for the host.
                        hostSocket = sockets.filter((x) => {return x.id == quizObj.gameID})[0];
                        hostSocket.send(JSON.stringify({type: "previewQuestion", questionNo: quizObj.currQuestion + 1, question: question}));
                        setTimeout(() => { //This sends the clients the presentQuestion message telling them that the user can now submit a question
                            for (var i = 0; i < quizObj.players.length; i++){
                                userSocket = sockets.filter((x) => {return x.id == quizObj.players[i].uniqueID})[0]; //Finds the user socket
                                userSocket.send(JSON.stringify({type: "presentQuestion", questionObj: games[index].currQuestionData, questionNo: quizObj.currQuestion + 1})); //Sends the questionPreview message to the client
                            }
                            games[index].currState = gameState.questionInProgress;
                            hostSocket.send(JSON.stringify({type: "presentQuestion", questionObj: games[index].currQuestionData, questionNo: quizObj.currQuestion + 1, totalUsers: quizObj.players.length}));
                        }, 3000);
                    });
                });
            }
            else if (data.type == "submitQuestion"){
                var playerIndex;
                gameObj = games.filter((x) => {
                    let playerArr = x.players.filter((y) => {y.uniqueID == socket.id});
                    if (playerArr.length > 0){
                        playerIndex = x.players.indexOf(playerArr[0]);
                        return true;
                    }
                })[0];
                var gameIndex = games.indexOf(gameObj);
                let answer = data.option;
                let timeToAnswer = (new Date().getTime() / 1000) - gameObj.currQuestionData.startTime;
                var answerCorrect = answer == gameObj.currQuestionData.correctAns;
                games[gameIndex].players[playerIndex].questionsCompleted.push({questionID: gameObj.currQuestionData.questionID, result: answerCorrect, timeToAnswer: timeToAnswer});
                let hostSocket = sockets.filter((x) => {x.id == gameObj.gameID})[0];
                hostSocket.send(JSON.stringify({type: "answerUpdate", totalAnswered: gameObj.answered + 1, totalUsers: gameObj.players.length}));
                games[gameIndex].answered += 1;
                socket.send(JSON.stringify({type: "answerAccepted", timeTaken: timeToAnswer}));
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
    })
}