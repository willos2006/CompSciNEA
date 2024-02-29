$(document).ready(() => {
    //Getting the classID of the class from the query string in the URL
    var urlParams = new URLSearchParams(window.location.search);
    const entries = urlParams.entries();
    const params = {};
    for (entry of entries) {
        params[entry[0]] = entry[1];
    }
    var classID = params.classID;

    $.ajaxSetup({async: false});
    var classObj;
    $.post("/getClasses", (data) => {
        classObj = data.filter(x => {return x.classID = classID})[0];
    });
    var bestTopics = []
    var worstTopics = []

    $("#classNameText").html(classObj.quickName);

    var timeTotal = 0;
    var totalUsers = classObj.student.length;
    var avgCount = 0;
    for (var user = 0; user < totalUsers; user++){
        $.ajaxSetup({async: false});
        $.post("/getUserAnalyticsByID", {userID: classObj.student[user].userID}, (data) => {
            var bestTopic;
            var worstTopic;
            var avgTimeTaken;
            if (data.results){
                avgCount += 1;
                bestTopic = data.bestTopic.topic;
                worstTopic = data.worstTopic.topic;

                let currTotal = 0
                for (var i = 0; i < data.results.length; i++){
                    currTotal += data.results[i].avgTime;
                }
                avgTimeTaken = currTotal / data.results.length;

                timeTotal += avgTimeTaken;

                if(bestTopics.includes(bestTopic)){
                    let tempTopicObj = bestTopic.filter((topic) => {return topic.topicName == bestTopic})[0];
                    let index = bestTopics.indexOf(tempTopicObj);
                    bestTopics[index].count += 1;
                }
                else{
                    bestTopics.push({topicName: bestTopic, count: 1});
                }

                if(worstTopics.includes(bestTopic)){
                    let tempTopicObj = worstTopic.filter((topic) => {return topic.topicName == worstTopic})[0];
                    let index = worstTopics.indexOf(tempTopicObj);
                    worstTopics[index].count += 1;
                }
                else{
                    worstTopics.push({topicName: worstTopic, count: 1});
                }
            }
            else{
                worstTopic = "N/A";
                bestTopic = "N/A";
                avgTimeTaken = 0;
            }

            var currentUser = classObj.student[user];
            $("#studentList").append(`<li id='${currentUser.userID}'>${currentUser.username}<ul><li>Best topic: ${bestTopic}</li><li>Worst Topic: ${worstTopic}</li><li>Average Time: ${avgTimeTaken}</li><li><a href="http://localhost:4000/deleteUserFromClass?classID=${classID}&userID=${currentUser.userID}">DELETE USER</a></ul></li>`);
        });
    }

    let avgTime = timeTotal / avgCount;
    console.log(avgCount);

    if (avgCount > 0){
        bestTopics.sort((a,b) => a.count - b.count);
        worstTopics.sort((a,b) => a.count - b.count);
        $("#bestTopicText").html(bestTopics[0].topicName);
        $("#worstTopicText").html(worstTopics[0].topicName);
    }
    else{
        $("#bestTopicText").html("N/A");
        $("#worstTopicText").html("N/A");
    }

    $("#avgTimeText").html(avgTime);

    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });

    $("#addUser").on("click", () => {
        var username = $("#usernameInput").val();
        if (username != ""){
            $.post("/addUserToClass", {username: username, classID: classID}, (data) => {
                if (data.res){
                    alert("User Added");
                    window.location = "http://localhost:4000/classView?classID="+classID;
                }
                else{
                    alert(data.errorMsg);
                }
            })
        }
        else{
            alert("Please enter a (valid) username")
        }
    })
});