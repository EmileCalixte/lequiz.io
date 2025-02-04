db = require('./models/dbModels');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const server = require('http').createServer(app);
const port = 3000;
const env = require('./config/env');
const CronManager = require('./manager/CronManager');
const AuthController = require('./controllers/AuthController');
require('./manager/SocketEngine')(server);

CronManager.executeCronTasks();

const mainRouter = require('./routes/mainRouter');

app.all('*', (req, res, next) => {
    console.log(req.method, req.url);
    res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'development' ? '*' : env.frontUrl);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    next();
});

// Always return 200 for CORS preflight request
app.options('*', (req, res, next) => {
    res.status(200);
    res.send();
})

// Middleware verifying the access token in request
app.all('*', (req, res, next) => {

    const excludedUrls = [ // The URLs for which the access token is not required
        '/auth/access-token',
    ];

    if(excludedUrls.includes(req.url.split('?')[0])) {
        next();
        return;
    }

    if(!req.headers.authorization) {
        res.status(401);
        res.send({
            error: 'Access token is missing',
        });
        return;
    }

    req.accessToken = req.headers.authorization;

    req.accessTokenPayload = AuthController.verifyToken(req.accessToken, AuthController.TOKEN_TYPE_ACCESS_TOKEN);

    next();
});

app.use(bodyParser.json());

/** Routing */
app.use('/', mainRouter);

/** 404 Handling **/
app.use((req, res ,next) => {
    next(new Error(JSON.stringify({status: 404, message: 'Not Found'})));
});

/** Errors Handler Middleware **/
app.use((error, req, res, next) => {
    const responseData = {};

    const status = error.status || 500

    status === 500
        ? responseData.message = 'Erreur interne du serveur. Réessayez plus tard'
        : responseData.message = error.message;

    res.status(status);

    res.json(responseData);
});

server.listen(port,() => {
    console.log(`Server running at http://localhost:${port}`);
});
