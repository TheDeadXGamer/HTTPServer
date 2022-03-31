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
        const url = new URL(`http://localhost:8080${request.url}`);

        request.on('readable', () => {
            var getparams = url.searchParams; //Fetch URL parameters

            if (!getparams) return;

            console.log(getparams);
            if (getparams.get('key') != '987654321') {
                console.error('Error 401: Unauthorised access detected.');
                console.log(request.socket.remoteAddress);
                GTG.HTTPResponse(response, 1); //Send "illegal" response
                return;
            }

            pool.getConnection((PoolError, connection) => {
                if (PoolError) {
                    console.error(PoolError);
                    return;
                }

                const ID = getparams.get('ID');
                const Förnamn = getparams.get('Firstnamn');
                const Efternamn = getparams.get('Efternamn');
                const Mailadress = `${Förnamn}.${Efternamn}@gtg.se`;

                if (!ID || !Förnamn || !Efternamn || !Mailadress) {
                    console.log(`ID: ${ID}`, `Förnamn: ${Förnamn}`, `Efternamn: ${Efternamn}`, `Mailadress: ${Mailadress}`);
                    console.error('Client Error: One or more URL parameters are undefined');
                    GTG.HTTPResponse(response, 2);
                    return;
                }
                
                connection.query(`SELECT * FROM \`elever\` WHERE \`ID\` = '${ID}';`
                , (SelectError, SelectResult) => {
                    if (SelectError){
                        console.error(SelectError);
                        return;
                    }

                    if (SelectResult[0]){
                        GTG.HTTPResponse(response, 2);
                        console.error('Client Error: ID already exists in database');
                        return;
                    }

                    connection.query(`INSERT INTO \`elever\` (\`ID\`,\`Förnamn\`, \`Efternamn\`, \`Klass\`, \`Mailadress\`) VALUES ('${ID}', '${Förnamn}', '${Efternamn}', 'Rhea', '${Mailadress}');`
                        , (InsertError) => {
                            if (InsertError) {
                                console.error(InsertError);
                                return;
                            }

                            //console.log(`${Results[0].Namn} har lånat en bok!`);
                            GTG.HTTPResponse(response, 0); //Send back "good" response
                        });
                });
                connection.release();
            });
        });
    }
}

//Create an HTTP Server and make it listen at port 8080

/**
 * Server object using `getFunc` as callback
 */
const server = http.createServer(getFunc);
server.listen(8080);
