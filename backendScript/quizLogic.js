module.exports = function (app, path, session, db){
    const webSocket = require("ws");
    const socketServer = new webSocket.Server({
        port: 8080
    });

    let sockets = []
    let games = [] //this will contain a list of active games with details of users and hosts.
    var nextQuizID = 0;
    var nextUserID = 0;

    function deleteSocket(socket){
        var index = sockets.indexOf(socket);
        sockets.splice(index, 1);
        if(socket.type == 1){
            let gameToDelete = games.filter((x) => {return x.gameID == socket.id});
            index = games.indexOf(gameToDelete);
            games.splice(index, 1);
        }
        else if (socket.type == 2){
            //code here once joing code is established
        }
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
                    gameID: nextQuizID,
                    currState: 0,
                    currQuestion: 0,
                    classID: data.classID,
                    players: []
                }
                socket.id=nextQuizID;
                nextQuizID++;
                games.push(jsonObj);
            }
            else if (data.type == "pong"){
                clientCount++;
            }
            else if (data.type == "joinGame"){
                socket.type == 2;
                let gameID = data.gameID;
                let userID = data.userID;
                socket.id = nextUserID;
                nextUserID++;
                let username = data.username;
                let tempArray = games.filter((x)=>{return x.gameID == gameID});
                var index = games.indexOf(tempArray);
                var userJson = {
                    userID: userID,
                    uniqueID: nextUserID - 1,
                    username: username,
                    score: 0,
                    questionsCompleted: [] //after each question the time taken to answer and result is stored so it can be saved later on and used for analytics
                }
                games[index].push(userJson);
                tempArray = sockets.filter((x) => {return x.id == games[index].gameID});
                index = sockets.indexOf(tempArray);
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
                    let newArr = results.filter((x) => {return x.quizID == initialRes[i].quizID}); //FIX THIS :(
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
            var gamesList = games.filter((x) => {return idList.includes(x.classID);});
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
    })
}