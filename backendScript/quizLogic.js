module.exports = function (app, path, session, db){
    const webSocket = require("ws");
    const socketServer = new webSocket.Server({
        port: 8080
    });

    let sockets = []
    let games = [] //this will contain a list of active games with details of users and hosts.
    var nextID = 0;

    function deleteSocket(socket){
        if(socket.type == 1){
            let gameToDelete = games.filter((x) => {return x.gameID == socket.id})[0];
            for (var i = 0; i < gameToDelete.players.length; i++){
                var userSocket = sockets.filter((x) => {return gameToDelete.players[i].uniqueID == x.id})[0];
                userSocket.send(JSON.stringify({type: "hostDisconnect"}));
            }
            index = games.indexOf(gameToDelete);
            games.splice(index, 1);
        }
        else if (socket.type == 2){
            var userID;
            var tempGames = games.filter((x) => {
                let tempArr = x.players.filter((y) => {return y.uniqueID == socket.id});
                if (tempArr.length > 0){
                    userID = tempArr[0].userID;
                    return true;
                }
            });
            if (tempGames.length > 0){
                let tempArr = sockets.filter((x) => {return x.id == tempGames[0].gameID});
                tempArr[0].send(JSON.stringify({type: "userLeave", userID: userID}));
                let gameIndex = games.indexOf(tempGames[0]);
                tempArr = tempGames[0].players.filter((x) => {return x.userID == userID});
                let playerIndex = tempGames[0].players.indexOf(tempGames[0]);
                games[gameIndex].players.splice(playerIndex, 1);
            }
        }
        var index = sockets.indexOf(socket);
        sockets.splice(index, 1);
    }

    socketServer.on("connection", (socket) => {
        sockets.push(socket);
        socket.type = 0
        /*
        SOCKET IDS:
        0-UNINITIALISED
        1-HOST
        2-PLAYER
        */
       //keep alive script to check that the client is still listeing. If not, it will delete the connection and remove from lists
        let serverCount = 0;
        let clientCount = 0;
        var keepAlive = setInterval(() => {
            if (serverCount != clientCount){
                deleteSocket(socket);
                clearInterval(keepAlive);
                return;
            }
            serverCount++;
            socket.send(JSON.stringify({type: "ping"}));
        }, 500);
        socket.on("message", (data) => {
            data = JSON.parse(data);
            if(data.type == "init"){
                socket.type = 1
                jsonObj = {
                    hostID: data.userID,
                    quizID: data.quizID,
                    gameID: nextID,
                    currState: 0,
                    currQuestion: 0,
                    classID: data.classID,
                    players: []
                }
                socket.id=nextID;
                nextID++;
                games.push(jsonObj);
            }
            else if (data.type == "pong"){
                clientCount++;
            }
            else if (data.type == "joinGame"){
                socket.type = 2;
                let gameID = data.gameID;
                let userID = data.userID;
                socket.id = nextID;
                nextID++;
                let username = data.username;
                let tempArray = games.filter((x)=>{return x.gameID == gameID});
                var index = games.indexOf(tempArray[0]);
                var userJson = {
                    userID: userID,
                    uniqueID: nextID - 1,
                    username: username,
                    score: 0,
                    questionsCompleted: [] //after each question the time taken to answer and result is stored so it can be saved later on and used for analytics
                }
                games[index].players.push(userJson);
                tempArray = sockets.filter((x) => {return x.id == games[index].gameID});
                index = sockets.indexOf(tempArray[0]);
                sockets[index].send(JSON.stringify({type: "userJoin", userID: userID, username: username}));
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

    app.post("/getQuizList", (req, res) => {
        db.query("SELECT * FROM quiz", (err, results) => {
            if(err) throw(err);
            let initialRes = results;
            db.query("SELECT * FROM questionMapping", (err, results) => {
                if (err) throw (err);
                //This fetches the length of the quizzes. (When the database grows this may be too slow)
                for (var i = 0; i < initialRes.length; i++){
                    let newArr = results.filter((x) => {return x.quizID == initialRes[i].quizID});
                    initialRes[i].questionNo = newArr.length;
                }
                res.json(initialRes);
            })
        });
    });

    app.get("/quizHost", (req, res) => {
        if(req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/quizHost.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    app.post("/getQuizzesByClass", (req, res) => {
        var userID = req.session.user.userID;
        db.query("SELECT classID from classmap WHERE userID = ?", [userID], (err, results) => {
            if (err) throw (err);
            var idList = [];
            results.map((x) => {idList.push(x.classID)});
            var gamesList = games.filter((x) => {return idList.includes(Number(x.classID));});
            res.json({gamesList: gamesList});
        });
    });

    app.get("/joinQuiz", (req, res) => {
        if(req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/quizJoin.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    app.get("/playQuiz", (req, res) => {
        if (req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/quizUser.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    })
}