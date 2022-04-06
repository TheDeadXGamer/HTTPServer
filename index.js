//index.js

//Include necessary modules
const sql = require('mysql2');
const http = require('http');
const GTG = require('./HTTPFunctions.js')

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
            console.log(Urlparameters);
            if (Urlparameters.get('key') != '987654321') {
                console.error('Error 401: Unauthorised access detected.');
                console.log(request.socket.remoteAddress);
                GTG.HTTPResponse(response, 1); //Send "illegal" response
                return;
            }

            //Fetch pool connection
            pool.getConnection((PoolError, connection) => {
                if (PoolError) {
                    console.error(PoolError);
                    return;
                }

                //Get necessary parameters
                const ID = Urlparameters.get('ID');
                const Förnamn = Urlparameters.get('Firstnamn');
                const Efternamn = Urlparameters.get('Efternamn');
                const Mailadress = `${Förnamn}.${Efternamn}@gtg.se`;
                const Mode = Urlparameters.get('Mode');

                //Check if all necessary parameters exist
                if (!ID || !Förnamn || !Efternamn || !Mailadress || !Mode) {
                    console.log(`ID: ${ID}`, `Förnamn: ${Förnamn}`, `Efternamn: ${Efternamn}`, `Mailadress: ${Mailadress}`);
                    console.error('Client Error: One or more URL parameters are undefined');
                    GTG.HTTPResponse(response, 2);
                    return;
                }

                //Is the switch in Insert mode?
                if (Mode == 'Insert') {

                    //Check if ID already exists in DB
                    connection.query(`SELECT * FROM \`elever\` WHERE \`ID\` = '${ID}';`, (SelectError, SelectResult) => {

                        if (SelectError) {
                            console.error(SelectError);
                            return;
                        }

                        //Query returns an ID?
                        if (SelectResult[0]) {
                            GTG.HTTPResponse(response, 2);
                            console.error('Client Error: ID already exists in database');
                            return;
                        }

                        //Insert parameters into new row
                        connection.query(`INSERT INTO \`elever\` (\`ID\`,\`Förnamn\`, \`Efternamn\`, \`Klass\`, \`Mailadress\`) VALUES ('${ID}', '${Förnamn}', '${Efternamn}', 'Rhea', '${Mailadress}');`
                            , (InsertError) => {
                                if (InsertError) {
                                    console.error(InsertError);
                                    return;
                                }

                                GTG.HTTPResponse(response, 0); //Send back "good" response
                            });
                    });
                }

                //Release the pool connection
                connection.release();
            });
        });
    }
}

/**
 * Server object using `getFunc` as callback
 */
const server = http.createServer(getFunc);  //Create HTTP server that listens on port 8080
server.listen(8080);
