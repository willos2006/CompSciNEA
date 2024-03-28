module.exports = function(app, path, crypto, salt, bodyParser, session, db){
    app.use(session({
        resave: false,
        secret: "secret",
        saveUninitialized: false
    })); //This sets up the session middleware so that user sessions can be persisted

    app.post("/loginPost", (req, res) => {
        //Takes the email and password (plaintext) from the post reqeust
        var email = req.body.email;
        var pass = req.body.pass;
        

        var lengthReq = email.length > 0 && pass.length > 0; 
        var hasSymbol = email.match(/[a-zA-Z0-9]+@[a-zA-Z0-9]+/); //This regex ensures the email is of a valid format
    
        if (lengthReq && hasSymbol){
            let userHash = crypto.pbkdf2Sync(pass, salt, 1000, 64, `sha512`).toString("hex"); //generates a hash for the password
            db.query("SELECT passwordHash, username, userID, userType FROM `userDets` WHERE `email` = ?", [email], (err, results) => {
                if(err) throw err;
                //Checking that the user existsw
                else if(results.length == 0) res.json({valid: false, message: "No user found with that email"});
                //verifies that the password is correct by comparing the hash of the password with the hash stored
                else if(results[0].passwordHash != userHash) res.json({valid: false, message: "Invalid Password"});
                else{
                    //This tells the frontend that the login was successful, and the session variables are set here.
                    req.session.user = {username: results[0].username, userID: results[0].userID, userType: results[0].userType};
                    res.json({valid: true});
                }
            });
        }
        else{
            res.json({valid: false, message: "Invalid values entered"}); //error case
        }
    });
    
    //All of these routes check that the user is logged in and has permission to be routed to these pages

    app.get("/login", (req, res) => {
        if(req.session.user){
            res.redirect("http://localhost:4000/home");
        }
        else{
            res.sendFile(path.join(__dirname,"../Frontend/loginPage.html"));
        }
    });    

    app.get("/signup", (req, res) => {
        res.sendFile(path.join(__dirname, "../Frontend/signupPage.html"));
    });

    app.post("/signupPost", (req, res) => {
        var email = req.body.email;
        var username = req.body.username;
        var password = req.body.password;
        var userType = req.body.userType;

        //much of the same verification that occurs in the login script
        var lengthReq = email.length > 0 && password.length > 0 && username.length > 0;
        var hasSymbol = email.match(/[a-zA-Z0-9]+@[a-zA-Z0-9]+/); 

        if (!lengthReq) {res.json({valid: false, message: "Fields are empty"}); return;}
        if (!hasSymbol) {res.json({valid: false, message: "Invalid email"}); return;}
        db.query("SELECT * FROM `userdets` WHERE `email` = ? OR `username` = ?", [email, username], (err, result) => {
            userMatches = result.length;
            if(userMatches > 0){res.json({valid: false, message: "This email or username is already in use."}); return;}

            let passHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString("hex");

            db.query("INSERT INTO `userdets` (`username`, `passwordHash`, `email`, `userType`) VALUES (?, ?, ?, ?)",[username, passHash, email, userType], (err, result)=>{
                if(err) {res.json({valid: false, message: "Server error. Try again"})}
                else{
                    req.session.user = false;
                    res.json({valid: true}); //tells the frontend to redirect to the login page
                }
            });
        });
    });

    app.get("/logout", (req, res) => {
        req.session.user = false; //This means that verification will fail when attempting to reach other pages.
        res.redirect("http://localhost:4000/login");
    });
}