module.exports = function(app, path, crypto, salt, bodyParser, session, db){
    app.get("/home", (req, res) => {
        if(req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/homePageTeacher.html"));
        }
        else if (req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/homePageStudent.html"));
        }
        else{
            res.redirect("http://localhost:4000/login");
        }
    });

    app.get("/classList", (req, res) => {
        if (req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/classList.html"));
        }
        else{
            res.redirect("http://localhost:4000/home");
        }
    });

    app.post("/getClasses", (req, res) => {
        if(req.session.user.userType == 1){
            db.query("SELECT * FROM classes WHERE teacher = ?", [req.session.user.userID], (err, results) => {
                if (err) throw err;
                initialRes = results;
                db.query("SELECT * FROM classMap WHERE classOwnerID = ?", [req.session.user.userID], (err, results) => {
                    if (err) throw err;
                    for (let i = 0; i < initialRes.length; i++){
                        tempArr = results.filter((x) => {return x.classID == initialRes[i].classID});
                        initialRes[i].student = tempArr;
                    }
                    res.json(initialRes);
                });
            });
        }
    });

    app.post("/hostQuiz", (req, res) => {
        if(req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/quizHost.html"));
            //Need to create a working protoype of question rewording before this.
        }
        else{
            res.redirect("http://localhost:4000/home");
        }
    });

    app.post("/getUserID", (req, res) => {
        res.json({userID: req.session.user.userID});
    });

    app.post("/getClassNameByID", (req, res) => {
        var classID = req.body.classID;
        db.query("SELECT quickName FROM classes WHERE classID=?", [classID], (err, results) => {
            if (err) throw err;
            res.json({className: results[0].quickName});
        });
    });

    app.post("/getQuizNameByID", (req, res) => {
        var quizID =  req.body.quizID;
        db.query("SELECT bio FROM quiz WHERE quizID=?", [quizID], (err, results) => {
            if (err) throw err;
            res.json({quizName: results[0].bio});
        });
    });

    app.post("/getUsername", (req, res) => {
        var userID = req.session.user.userID;
        db.query("SELECT username FROM userdets WHERE userID = ?", [userID], (err, results) => {
            if (err) throw err;
            var username = results[0].username;
            res.json({username: username});
        })
    })
}