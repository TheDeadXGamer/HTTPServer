//index.js

//Include necessary modules
const sql = require('mysql2');
const http = require('http');
const GTG = require('./HTTPFunctions.js')
const Joel = require('./Methods.js')

/**
 * Use settings to create an SQL pool
 * 
 * ```js
 * const pool = sql.createPool({   
    "host": "ip of server hosting the db",
    "port": "port (Default is 3306)",
    "user": "user",
    "password": "password",
    "database": "dbname"
});
 * ```
 */
const pool = sql.createPool({
    "host": "localhost",
    "port": "3306",
    "user": "nodejs",
    "password": "kolja50",
    "database": "joelpeteket"
});

/**
 * Callback for `http.createServer(callback)`
 * ```js
 * getFunc(request, response){
 *  if (request.method == 'POST')
 *      //...
 * //Use parameters of getFunc inside
 * //Request, Response etc
 * }
 * ```
 * @param {http.IncomingMessage} request Object for handling the request sent by the client
 * @param {http.ServerResponse} response Object for sending "responses" to the client who made the request
 * 
 */
function getFunc(request, response) {
    if (request.method == 'GET') {

        //Create URL object by using the url sent from client
        const url = new URL(`http://localhost:8080${request.url}`);

        //On loaded page
        request.on('readable', () => {
            var Urlparameters = url.searchParams; //Fetch URL parameters

            if (!Urlparameters) return;

            //Check for unauthorised access. e.g Check if the 'key' is right.
            if (Urlparameters.get('key') != '987654321') {
                console.error('Error 401: Unauthorised access detected.');
                console.log(request.socket.remoteAddress);
                GTG.HTTPResponse(response, 1); //Send "illegal" response
                return;
            }

            const Method = Urlparameters.get('Method');

            switch(Method){

                case 'Initial':
                    Joel.Initial_Request(response, Urlparameters, pool);
                    return;
                
                case 'Loan':
                    Joel.Loan_Method(response, Urlparameters, pool);
                    return;
                
                case 'Return':
                    Joel.Return_Method(response, Urlparameters, pool);
                    return;
            }
        });
    }
}

/**
 * Server object using `getFunc` as callback
 */
const server = http.createServer(getFunc);  //Create HTTP server that listens on port 8080
server.listen(8080);
