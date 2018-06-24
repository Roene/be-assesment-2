// In this project I use the following sources provice by : Titus Wormer (https://github.com/wooorm):
// plain-server (https://github.com/cmda-be/course-17-18/tree/master/examples/plain-server)
// express-server (https://github.com/cmda-be/course-17-18/tree/master/examples/express-server)
// mysql-server (https://github.com/cmda-be/course-17-18/tree/master/examples/mysql-server)
// Backend Development Lecture 6 (https://docs.google.com/presentation/d/1BHMqO9UV5ePt29n8cnjaznvye8Gu_HrdzhzC3h5rgOI/edit#slide=id.g2922825c54_2_58)
// Backend Development Lab 8 (https://docs.google.com/presentation/d/17acFykwNaTmiiPZJElAqBfz-9XlvuRf6KNU2t-Bm5w0/edit#slide=id.g2922825c54_2_58)
// Special thanks to Bas Pieren & Deanna bosschert for helping me with this project. 

// Load dependencies
var express = require('express')
var session = require('express-session')
var multer = require('multer')
var bodyParser = require('body-parser')
var mysql = require('mysql')
var bcrypt = require('bcrypt')
var saltRounds = 10

require('dotenv').config();

//Connect tho the database with .env file
var connection = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});

connection.connect();

//Upload files in the folder upload
var upload = multer({dest: 'static/upload/'});

express()
	//Secure the session
	.use (express.static('static'))
	.use(bodyParser.urlencoded({extended: true}))
	.use(session({
		resave: false,
		saveUninitialized: true,
		secret: process.env.SESSION_SECRET
	}))

	// When you place a get request it will start the following functions
	.set('view engine', 'ejs')
	.set('views', 'view')
	.get('/', index)
	.get('/sign-up', signupForm)
	.post('/sign-up', upload.single('cover'), signup)
	.get('/login', loginForm)
	.post('/login', login)
 	.get('/log-out', logout)
  	.get('/:id', profile)
  	.get('/dashboard', dashboard)
  	.get('/delete/:id', remove)

  	.use(notFound)

  	//Port where server runs
  	.listen(3400)

// HERE I START USING THE FOLLOWING SOURCES:
// plain-server (https://github.com/cmda-be/course-17-18/tree/master/examples/plain-server)
// express-server (https://github.com/cmda-be/course-17-18/tree/master/examples/express-server)
// mysql-server (https://github.com/cmda-be/course-17-18/tree/master/examples/mysql-server)
// Backend Development Lecture 6 (https://docs.google.com/presentation/d/1BHMqO9UV5ePt29n8cnjaznvye8Gu_HrdzhzC3h5rgOI/edit#slide=id.g2922825c54_2_58)
// Backend Development Lab 8 (https://docs.google.com/presentation/d/17acFykwNaTmiiPZJElAqBfz-9XlvuRf6KNU2t-Bm5w0/edit#slide=id.g2922825c54_2_58)

//Render index,ejs when you go to /
function index(req, res) {
	res.render('index.ejs');
}

//Render signup.ejs when you go to /sign-up
function signupForm(req, res) {
	res.render('sign-up.ejs');
}

// When the signup form carries out the post action then start this function 
function signup(req, res, next) {
	// Check all the field the user is going to fill in and store them in variabeles
	var username = req.body.username;
	var age = req.body.age;
	var gender = req.body.gender;
	var club = req.body.club;
	var description = req.body.description;
	var picture = req.file ? req.file.filename : null;
	var email = req.body.email;
	var password = req.body.password;
	var min = 8;
	var max = 160;

	// Give the user an error when they try to submit without email or password
	if(!email || !password) {
		return res.status(400).send('E-mailadres en/of wachwoord mist');
	}

	//Give the user an error when they filled in a password which is to short or to long
	if(password.length < min || password.length > max) {
		return res.status(400).send('Het wachwoord moet tussen de ' + min + ' en ' + max + ' karakters zijn');
	}

	// Make connection to the database and check if the username exist
	connection.query('SELECT * FROM users WHERE username = ?', username, done);
	
	// If the username don't exist start this function
	function done(err, data) {
		if(err) {
			next(err);
		} else if (data.length === 0) {
			// If there is no data hash the password and start the onhash function
			bcrypt.hash(password, saltRounds, onhash);
		} else {
			// If the username already exist send this error message
			res.status(409).send('De gebruikersnaam is al bezet, kies een andere');
		}
	}

	function onhash(err, hash) {
		if (err) {
			next(err)
		} else {
			// Save all the user information in the database
			connection.query('INSERT INTO users SET ?', {
			username: username,
			age: age,
			hash: hash,
			gender: gender,
			club: club,
			description: description,
			picture: picture,
			email: email
		},
			oninsert)
		}
		
		// When the information is saved in the database start this function
		function oninsert(err, data) {
			if(err) {
				next(err)
			} else {
				// Save the username in the current sesison and send the user to the dashboard
				req.session.user = {username: username};
				res.redirect('dashboard');
			}
		}
	}
}

// Render login.ejs when you go to /login
function loginForm(req, res) {
	res.render('login.ejs');
}

// When the login form carries out the post action then start this function 
function login(req, res, next) {
	// Check all the field the user is going to fill in and store them in variabeles
	var username = req.body.username;
	var password = req.body.password;

	// Make connection to the database and check if the username exist if it exist start the function done
	connection.query('SELECT * FROM users WHERE username = ?', username, done);
	
	function done(err, data) {
		var user = data && data[0];

		if (err) {
			next(err);
		} else if (user) {
			// If the username exist verify it with the saved password and start the function onverify
			bcrypt.compare(password, user.hash, onverify);
		} else {
			// If the username don't exist send this error to the user
			res.status(401).send('Gebruikersnaam bestaat niet')
		}

		function onverify(err, match) {
			if (err) {
				next(err)
			} else if (match) {
				// Save the username in the current sesison and send the user to the dashboard
				req.session.user = {username: username};
				res.redirect('dashboard');
			} else {
				// If the password is incorrect send this error to the user
				res.status(401).send('Wachtwoord klopt niet');
			}
		}
	}
}

// Render dashboard.ejs when you go to /dashboard
function dashboard(req, res, next) {

	//Make connection to the database 
	connection.query('SELECT * FROM users', done);
	
	function done(err, data) {
		if(err) {
			next(err);
		} else {
			// Render the dashboard with the data from the database 
			res.render('dashboard.ejs', {data: data, user:req.session.user})
		}
	}
}

// Render profile.ejs when you go to /:id
function profile(req, res, next) {
	// Store the request id in the variabele
	var id = req.params.id;

	// Make connection to the database and check if the id exist if it exist start the function done
	connection.query('SELECT * FROM users WHERE id = ?', id, done);

	function done(err, data) {
		if(err){
			next(err)
		} else if (data.length === 0) {
			next();
		} else {
			// if the id exist render the profiel.ejs
			res.render('profiel.ejs', {data: data[0], user: req.session.user});
		}
	}
}

// When the user pressed the button 'uitloggen', destroy the current session and send the user back to /
function logout(req, res, next) {
	req.session.destroy(function (err) {
		if (err) {
			next(err);
		} else {
			res.redirect('/');
		}
	})
}

function remove(req, res, next) {
	var id = req.params.id;

	connection.query('DELETE FROM users WHERE id = ?', id, done);

	function done(err) {
		if (err) {
			next(err)
		} else {
			req.session.destroy()
			res.redirect('/')
		}
	}
}

// When the user go to a page which don't exist render the not-found.ejs
function notFound(req, res) {
	res.status(404).render('not-found.ejs');
}