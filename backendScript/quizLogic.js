module.exports = function (app, path, session, db){
    const webSocket = require("ws");
    const socketServer = new webSocket.Server({
        port: 8080
    });

    let sockets = []
    let games = [] //this will contain a list of active games with details of users and hosts.
    var nextQuizID = 0;
    socketServer.on("connection", (socket) => {
        sockets.push(socket);
        console.log("Socket Connected");
        socket.on("message", (data) => {

        });
    });
    socketServer.on("disconnect", (socket) => {
        var index = sockets.indexOf(socket);
        sockets.splice(index, 1);
        //There will be more logic here to determine what to do if a host or player disconnects.
        //i.e. end the game if the host disconnects or just remove the users entry if a player disconnects.
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

    app.post("/startQuiz", (req, res) => {
        var quizID = req.body.quizID;
        var classID = req.body.classID;
        var userID = req.session.user.userID;
        let tempJSON = {
            host: userID,
            classID: classID,
            quizID: quizID,
            currQuestion: 0,
            users: [],
            quizSessionID: nextQuizID
        }
        nextQuizID++;
        res.json({res: true, quizSessionID: nextQuizID-1, userID: userID});
    });

    app.get("/quizHost", (req, res) => {
        res.send("test");
    })
}