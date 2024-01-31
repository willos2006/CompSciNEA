module.exports = function (app, path, session, db){
    const webSocket = require("ws");
    const socketServer = new webSocket.Server({
        port: 8080
    });

    let sockets = []
    let games = [] //this will contain a list of active games with details of users and hosts.
    var nextQuizID = 0;

    function deleteSocket(socket){
        var index = sockets.indexOf(socket);
        sockets.splice(index, 1);
        if(socket.type == 1){
            let gameToDelete = games.filter((x) => {return x.gameID == socket.id});
            index = games.indexOf(gameToDelete);
            games.splice(index, 1);
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
    })
}