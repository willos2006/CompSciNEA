module.exports = function(app, path, crypto, salt, bodyParser, session, db){
    const util = require('util');
    
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
                db.query("SELECT * FROM classMap, userdets WHERE classOwnerID = ? AND userdets.userID = classMap.userID", [req.session.user.userID], (err, results) => {
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

    app.get("/viewAllHW", (req, res) => {
        if (req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/viewAllHw.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    app.post("/getAllHws", async (req, res) => {
        let userID = req.session.user.userID;
        var query = util.promisify(db.query).bind(db);
        query = util.promisify(db.query).bind(db);
        let classes = await query("SELECT classID from classes WHERE teacher = ?", [userID]);
        hws = [];
        await Promise.all(classes.map(async (classObj) => {
            let classID = classObj.classID;
            let homeworks = await query("SELECT homeworkset.hwID, homeworkset.title, classes.quickName FROM homeworkset, classes WHERE homeworkset.classID = ? AND classes.classID = homeworkset.classID", [classID]);
            hws.push(homeworks);
        }));
        res.json({hws: hws});
    });

    app.post("/getHwDetails", (req, res) => {
        let hwID = req.body.hwID;
        var query = util.promisify(db.query).bind(db);
        db.query("SELECT * FROM homeworkSet WHERE hwID = ?", [hwID], (err, results) => {
            if (err) throw err;
            let homeworkDetails = results[0];
            db.query("SELECT * FROM homeworksubmission WHERE hwID = ?", [hwID], async (err, results) => {
                let submissions = [];
                await Promise.all(results.map(async (result) => {
                    let question = await query("SELECT question FROM question WHERE questionID = ?", [result.questionID]);
                    let username = await query("SELECT username FROM userdets WHERE userID = ?", [result.userID])
                    await new Promise((resolve) => {
                        let idsDone = [];
                        submissions.map((submission) => {idsDone.push(submission.userID)})
                        question = question[0].question;
                        if (idsDone.includes(result.userID)){
                            let index = idsDone.indexOf(result.userID);
                            submissions[index].questions.push({result: result.result, timeTaken: result.timeTaken, question: question, dateSubmitted: result.dateSubmitted});
                        }
                        else{
                            submissions.push({userID: result.userID, username: username[0].username, questions: [{result: result.result, timeTaken: result.timeTaken, question: question, dateSubmitted: result.dateSubmitted}]})
                        }
                        resolve();
                    });
                }));
                let questions = await query("SELECT * FROM question, questionmapping WHERE question.questionID = questionmapping.questionID AND questionmapping.quizID = ?", [homeworkDetails.quizID]);
                homeworkDetails.questions = questions;
                res.json({hwDetails: homeworkDetails, submissions: submissions});
            });
        })
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
    });

    app.get("/classView", (req, res) => {
        if (req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/classView.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    app.post("/getUniqueClassID", (req, res) => {
        let uniqueID = generateRandomUniqueCode();
        let classID = req.body.classID;
        let ownerID = req.session.user.userID;
        uniqueClassCodes.push({uniqueID: uniqueID, classID: classID, ownerID: ownerID});
        res.json({code: uniqueID});
    })

    app.post("/getUserAnalyticsByID", (req, res) => {
        var userID = req.body.userID;
        db.query("SELECT * FROM analytics, question WHERE analytics.userID = ? AND question.questionID = analytics.questionID", [userID], (err, results) => {
            if (err) throw err;
            if (results.length > 0){
                results.sort((a,b) => a.avgTime - b.avgTime);
                let topicsDone = [];
                let topicAvg = [];
                for (var i = 0; i < results.length; i++){
                    if (!(topicsDone.includes(results[i].topic))){
                        let allTopicQuestions = results.filter((analytic) => {return analytic.topic == results[i].topic});
                        var total = 0;
                        allTopicQuestions.map((analytic) => {total = total + analytic.avgTime});
                        var avg = total / allTopicQuestions.length;
                        topicAvg.push({topic: results[i].topic, avg: avg});
                    }
                }
                topicAvg.sort((a,b) => a.avg-b.avg);
                res.json({results: results, bestTopic: topicAvg[0], worstTopic: topicAvg[topicAvg.length - 1]});
            }
            else{
                res.json({results: false});
            }
        });
    });

    app.post("/addUserToClass", (req, res) => {
        var classID = req.body.classID;
        var username = req.body.username;
        var ownerID = req.session.user.userID
        db.query("SELECT * FROM userdets WHERE username = ? AND userType = 0", [username], (err, results) => {
            if (err) throw err;
            if (results.length > 0){
                var userID = results[0].userID;
                db.query("SELECT * FROM classmap WHERE userID = ? AND classID = ?", [userID, classID], (err, results) => {
                    if (err) throw err;
                    if (results.length == 0){
                        db.query("INSERT INTO classmap (userID, classID, classOwnerID) VALUES (?, ?, ?)", [userID, classID, ownerID], (err, results) => {
                            if (err) throw err;
                            res.json({res: true});
                        });
                    }
                    else{
                        res.json({res:false, errorMsg: "User already added to class"});
                    }
                });
            }
            else{
                res.json({res:false, errorMsg: "Student does not exist"});
            }
        })
    });

    app.get("/deleteUserFromClass", (req, res) => {
        if(req.session.user && req.session.user.userType == 1){
            var userID = req.query.userID;
            var classID = req.query.classID;
            db.query("DELETE FROM classmap WHERE userID = ? AND classID = ?", [userID, classID], (err, results) => {
                if (err){
                    res.send("There was an error. Use the back arrow to return");
                }
                else{
                    res.redirect("http://localhost:4000/classView?classID=" + classID);
                }
            })
        }
        else{
            res.send("You do not have permission to do this.")
        }
    });

    var uniqueClassCodes = []; //array which stores all the current codes in use for students to be added to classes

    app.post("/addUserToClassByCode", (req, res) => {
        let code = req.body.uniqueCode;
        let userID = req.session.user.userID;
        var classObj = getClassByUniqueID(code);
        if (classObj != -1){
            var classID = classObj.classID;
            var ownerID = classObj.ownerID;
            //NEED TO CHECK THAT USER DOES NOT ALREADY EXSIT IN CLASS - NEED TO ADD THIS CHECK
            db.query("INSERT INTO classmap (userID, classID, classOwnerID) VALUES (?, ?, ?)", [userID, classID, ownerID], (err, results) => {
                if(err) throw err;
                res.json({res: true});
            });
        }
        else{
            res.json({res:false, errorMsg: "Code is invalid"});
        }
    });

    app.get("/studentClassView", (req, res) => {
        if (req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/studentClassView.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    });

    app.get("/viewHomework", (req, res) => {
        if(req.session.user){
            if(req.session.user.userType == 1){
                res.sendFile(path.join(__dirname, "../Frontend/teacherHomeworkView.html"));
            }
            else{
                res.sendFile(path.join(__dirname, "../Frontend/studentHomeworkView.html"));
            }
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    })

    app.post("/getStudentClassesByID", (req, res) => {
        let studentID = req.session.user.userID;
        db.query("SELECT classes.quickName, userDets.username FROM classmap, classes, userDets WHERE classmap.userID = ? AND classmap.classID = classes.classID AND userDets.userID = classmap.classOwnerID", [studentID], (req, results) => {
            res.json({classList: results});
        });
    });

    app.get("/setHomework", (req, res) => {
        if (req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/setHomework.html"));
        }
        else{
            res.redirect("http://localhost:4000/")
        }
    });
    
    app.post("/getUserHomework", async (req, res) => {
        let userID = req.session.user.userID;
        var query = util.promisify(db.query).bind(db);
        var classes = await query("SELECT classID FROM classmap WHERE classmap.userID = ?", [userID]);
        var hw = [];
        for (var i = 0; i < classes.length; i++){
            var homeworks = await query("SELECT homeworkset.hwID, homeworkset.classID, homeworkset.message, homeworkset.expectedMinutes, homeworkset.dueDate, homeworkset.title, homeworkset.quizID, userdets.username, classes.quickName FROM homeworkset, userdets, classes WHERE homeworkset.classID = ? AND homeworkset.classID = classes.classID AND classes.teacher = userdets.userID", [classes[i].classID]);
            homeworks.map((homework) => {hw.push(homework)});
        }
        var userSubmissionsResult = await query("SELECT hwID FROM homeworksubmission WHERE userID = ?", [userID]);
        var userSubmissions = []
        userSubmissionsResult.map((submission) => {userSubmissions.push(submission.hwID)});
        for (var i = 0; i < hw.length; i++){
            if(userSubmissions.includes(hw[i].hwID)){
                hw.pop(i);
            }
        }
        res.json({homework: hw});
    });

    app.get("/homeworkDetail", (req, res) => {
        if (req.session.user && req.session.user.userType == 1){
            res.sendFile(path.join(__dirname, "../Frontend/homeworkDetails.html"));
        }
        else{
            res.redirect("http://localhost:4000/");
        }
    })

    app.post("/setHomework", (req, res) => {
        let title = req.body.title;
        let desc = req.body.desc;
        let due = req.body.due;
        let time = req.body.time;
        let classID = req.body.classID;
        let quizID = req.body.quizID;

        due = JStoSQLDate(new Date(due));

        db.query("INSERT INTO homeworkset (classID, message, expectedMinutes, dueDate, title, quizID) VALUES (?,?,?,?,?,?)", [classID, desc, time, due, title, quizID], (err, results) => {
            if(err) throw err;
            res.json({valid: true, message: "Homework Set"});
        })
    });

    app.get("/completeHomework", (req, res) => {
        if(req.session.user && req.session.user.userType == 0){
            res.sendFile(path.join(__dirname, "../Frontend/completeHW.html"));
        }
        else{
            res.redirect("http://localhost:4000/")
        }
    })

    app.post("/getHomeworkByClass", (req, res) => {
        let classID = req.body.classID;
        db.query("SELECT * FROM homeworkset WHERE classID = ? ORDER BY dueDate DESC", [classID], (err, results) => {
            if (err) throw err;
            res.json({homeworks: results});
        });
    });

    function getClassByUniqueID(uniqueID){
        let tempClassObj = uniqueClassCodes.filter((obj) => {return obj.uniqueID == uniqueID});
        if (tempClassObj.length > 0){
            return tempClassObj[0];
        }
        else{
            return -1;
        }
    }

    function generateRandomUniqueCode(){
        let currentCodes = [];
        uniqueClassCodes.map((obj) => {currentCodes.push(obj.uniqueID)});
        let randomNumber = Math.floor(Math.random() * (99999-10000) + 10000);
        while (currentCodes.includes(randomNumber)){
            randomNumber = Math.floor(Math.random() * (99999-10000) + 10000);
        }
        return randomNumber;
    }

    function JStoSQLDate(date){
        let dateString = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
        return dateString; 
    }
}