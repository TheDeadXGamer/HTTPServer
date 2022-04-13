//Methods.js

//Include necessary modules
const sql = require('mysql2');
const http = require('http');
const GTG = require('./HTTPFunctions.js');

/**
 * Handles the first request sent by the ESP8266.
 * Sends back a status code that tells the ESP if the operation was successful or not.
 * 
 * @param {http.OutgoingMessage} response 
 * @param {URLSearchParams} Urlparameters
 * @param {sql.Pool} Pool
 * @returns {void}
 */
module.exports.Initial_Request = (response, Urlparameters, Pool) => {

    //Fetch ID parameter
    const ID = Urlparameters.get('ID');

    //If the parameter can't be found
    if (!ID) {
        console.error('Client Error: One or more URL parameters are undefined');
        GTG.HTTPResponse(response, 2);
        return;
    }

    //Fetch pool connection
    Pool.getConnection((PoolError, Connection) => {

        //If something goes wrong with the pool connection
        if (PoolError) {
            console.error(PoolError);
            GTG.HTTPResponse(response, 2);
            return;
        }

        //Perform query to check if the ID exists in the DB
        Connection.query(`SELECT * FROM \`elever\` WHERE \`ID\` = '${ID}'`, (QueryError, QueryResult) => {

            //If something goes wrong with the Query
            if (QueryError) {
                console.error(QueryError);
                GTG.HTTPResponse(response, 2);
                return;
            }
            
            console.log(QueryResult[0]);

            //If the ID doesn't exist in the DB
            if (!QueryResult.length) {
                console.error('Client Error: Given ID does not match any in the database.');
                GTG.HTTPResponse(response, 2);
                return;
            }
        });

        //Send back good response and release the connection.
        GTG.HTTPResponse(response, 0);
        Connection.release();
    });
}

/**
 * Function for handling when a student loans a book
 * Sends back either successful or unsuccessful operation using HTTP status codes
 * 
 * @param {http.OutgoingMessage} response 
 * @param {URLSearchParams} Urlparameters
 * @param {sql.Pool} Pool
 * @returns {void}
 */
module.exports.Loan_Method = (response, Urlparameters, Pool) => {

    //Fetch the student and book ID
    const StudentID = Urlparameters.get('ID');
    const BookID = Urlparameters.get('BookID');

    //If the parameters haven't been set
    if (!StudentID || !BookID) {
        console.error('Client Error: One or more URL parameters are undefined');
        GTG.HTTPResponse(response, 2);
        return;
    }

    //Get a connection from the pool
    Pool.getConnection((PoolError, Connection) => {

        //If something goes wrong with establishing the connection
        if (PoolError) {
            console.error(PoolError);
            GTG.HTTPResponse(response, 2);
            return;
        }

        //Check to see if the student exists. Gets executed in a previous function.
        //Is just an additional check to see that the ESP doesn't send a bad value
        Connection.query(`SELECT * FROM \`elever\` WHERE ID = '${StudentID}';`, (SelectStudentError, SelectStudentResult) => {

            //If th query is unsuccessful for whatever reason
            if (SelectStudentError) {
                console.error(SelectStudentError);
                GTG.HTTPResponse(response, 2);
                return;
            }

            //Shouldn't ever occur, however in the event that the ESP sends a bad value
            if (!SelectStudentResult.length) {
                console.error('Client Error: Given ID does not match any in the database.');
                GTG.HTTPResponse(response, 3);
                return;
            }

            //Perform query to check for the bookid in the book table
            Connection.query(`SELECT * FROM \`böcker\` WHERE ID = '${BookID}';`, (SelectBookError, SelectBookResult) => {

                //If the query goes wrong
                if (SelectBookError) {
                    console.error(SelectBookError);
                    GTG.HTTPResponse(response, 2);
                    return;
                }

                //If the book can't be found in the book table
                if (!SelectBookResult[0]) {
                    console.error('Client Error: Given ID does not match any in the database.');
                    GTG.HTTPResponse(response, 2);
                    return;
                }

                Connection.query(`SELECT * FROM \`innehav\` WHERE BokID = ${BookID}`, (SelectInnehavError, SelectInnehavResult) => {
                    
                    //If the query goes wrong
                    if (SelectInnehavError) {
                        console.error(SelectBookError);
                        GTG.HTTPResponse(response, 2);
                        return;
                    }

                    //If the book can already be found in the table
                    if (SelectInnehavResult.length) { 
                        console.error('General Error: Book has already been loaned');
                        GTG.HTTPResponse(response, 2);
                        return;
                    }

                    //Insert values into the table
                    Connection.query(`INSERT INTO \`innehav\` (\`Elev\`, \`Boknamn\`,\`BokID\`, \`Utdatum\`, \`Indatum\`)
                    VALUES ('${SelectStudentResult[0].Namn}','${SelectBookResult[0].Modell}','${SelectBookResult[0].ID}',CURDATE(),'${new Date.getFullYear()}-06-16')`, (InsertError) => {

                        //If it can't be inserted
                        if (InsertError) {
                            console.error('Unknown server error: INSERT function rejected request.');
                            GTG.HTTPResponse(response, 3);
                        }
                    });
                });
            });
        });
    });
}

/**
 *  
 * @param {http.OutgoingMessage} response 
 * @param {URLSearchParams} Urlparameters
 * @param {sql.Pool} Pool
 * @returns {void}
 */
module.exports.Return_Method = (response, Urlparameters, Pool) => {

    //Fetch ID parameters
    const StudentID = Urlparameters.get('ID');
    const BookID = Urlparameters.get('BookID');

    //If the parameter can't be found
    if (!StudentID || !BookID) {
        console.error('Client Error: One or more URL parameters are undefined');
        GTG.HTTPResponse(response, 2);
        return;
    }

    //Get a connection from the pool
    Pool.getConnection((PoolError, Connection) => {
        //If something goes wrong with establishing the connection
        if (PoolError) {
            console.error(PoolError);
            GTG.HTTPResponse(response, 2);
            return;
        }

        //Check to see if the student exists. Gets executed in a previous function.
        //Is just an additional check to see that the ESP doesn't send a bad value
        Connection.query(`SELECT * FROM \`elever\` WHERE ID = '${StudentID}';`, (SelectStudentError, SelectStudentResult) => {

            //If th query is unsuccessful for whatever reason
            if (SelectStudentError) {
                console.error(SelectStudentError);
                GTG.HTTPResponse(response, 2);
                return;
            }

            //Shouldn't ever occur, however in the event that the ESP sends a bad value
            if (!SelectStudentResult.length) {
                console.error('Client Error: Given ID does not match any in the database.');
                GTG.HTTPResponse(response, 3);
                return;
            }

            //Perform query to check for the bookid in the book table
            Connection.query(`SELECT * FROM \`böcker\` WHERE ID = '${BookID}';`, (SelectBookError, SelectBookResult) => {

                //If the query goes wrong
                if (SelectBookError) {
                    console.error(SelectBookError);
                    GTG.HTTPResponse(response, 2);
                    return;
                }

                //If the book can't be found in the book table
                if (!SelectBookResult.length) {
                    console.error('Client Error: Given ID does not match any in the database.');
                    GTG.HTTPResponse(response, 2);
                    return;
                }

                Connection.query(`SELECT * FROM \`innehav\` WHERE BokID = ${BookID}`, (SelectInnehavError, SelectInnehavResult) => {

                    //If the query goes wrong
                    if (SelectInnehavError) {
                        console.error(SelectBookError);
                        GTG.HTTPResponse(response, 2);
                        return;
                    }

                    //If the book can't be found in the table
                    if (!SelectInnehavResult.length) {
                        console.error('General Error: Book has not been loaned yet.');
                        GTG.HTTPResponse(response, 2);
                        return;
                    }

                    Connection.query(`DELETE FROM \`innehav\` WHERE BokID = ${BookID}`, (DeleteError) => {

                        //If the query goes wrong
                        if (DeleteError) {
                            console.error(SelectBookError);
                            GTG.HTTPResponse(response, 2);
                            return;
                        }
                    
                        GTG.HTTPResponse(response, 0);
                    });
                });
            });
        });
        Connection.release();
    });
}