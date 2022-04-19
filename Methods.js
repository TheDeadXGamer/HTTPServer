//Methods.js

//Include necessary modules
const sql = require('mysql2');
const http = require('http');
const GTG = require('./HTTPFunctions.js');

/**
 * Handles the first request sent by the ESP8266.
 * Sends back a status code that tells the client if the operation was successful or not.
 * 
 * @param {http.OutgoingMessage} response 
 * @param {URLSearchParams} Urlparameters
 * @param {sql.Pool} Pool
 * @returns {void}
 */
module.exports.Initial_Request = (response, Urlparameters, Pool) => {

    //Fetch ID parameter
    const StudentID = Urlparameters.get('ID');

    //If the parameter can't be found
    if (!StudentID) {
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
        Connection.query(`SELECT * FROM \`elever\` WHERE \`ID\` = '${StudentID}'`, (QueryError, QueryResult) => {

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
 * Function for checking whether to loan or return a book
 * Calls the appropriate function in response
 * 
 * @param {http.OutgoingMessage} response 
 * @param {URLSearchParams} Urlparameters
 * @param {sql.Pool} Pool
 * @returns {void}
 */
module.exports.Check_Method = (response, Urlparameters, Pool) => {

    const Parameters = {
    StudentID: Urlparameters.get('ID'),
    BookID: Urlparameters.get('BookID')
    }

    //If the parameter can't be found
    if (!Parameters.StudentID || !Parameters.BookID) {
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

        //Check if the student in question already owns the book
        Connection.query(`SELECT * FROM \`innehav\` WHERE \`BokID\` = '${Parameters.BookID}' AND \`Elev\` = '${Parameters.StudentID}';`, (SelectInnehavError, SelectInnehavResult) => {
                        
            //If the query goes wrong
            if (SelectInnehavError) {
                console.error(SelectBookError);
                GTG.HTTPResponse(response, 2);
                return;
            }

            //If the book can already be found in the table
            if (SelectInnehavResult.length) { 
                this.Return_Method(response, Parameters, Pool);
            }

            else {
                this.Loan_Method(response, Parameters, Pool);
            }
        });
        Connection.release();
    });
}

/**
 * Function for handling when a student loans a book
 * Sends back either successful or unsuccessful operation using HTTP status codes to the client
 * 
 * @param {http.OutgoingMessage} response 
 * @param {{StudentID: string, BookID: string}} Parameters  //Parameters sent from Check method
 * @param {sql.Pool} Pool
 * @returns {void}
 */
module.exports.Loan_Method = (response, Parameters, Pool) => {

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
        Connection.query(`SELECT * FROM \`elever\` WHERE \`ID\` = '${Parameters.StudentID}';`, (SelectStudentError, SelectStudentResult) => {

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
            Connection.query(`SELECT * FROM \`böcker\` WHERE \`ID\` = '${Parameters.BookID}';`, (SelectBookError, SelectBookResult) => {

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

                //Check if the book already belongs to another student
                Connection.query(`SELECT * FROM \`innehav\` WHERE \`BokID\` = '${Parameters.BookID}' AND \`Elev\` != '${Parameters.StudentID}';`, (SelectInnehavError, SelectInnehavResult) => {
                    
                    //If the query goes wrong
                    if (SelectInnehavError) {
                        console.error(SelectBookError);
                        GTG.HTTPResponse(response, 2);
                        return;
                    }

                    //If the book can already be found in the table
                    if (SelectInnehavResult.length) { 
                        console.error('General Error: The book belongs to another student');
                        GTG.HTTPResponse(response, 2);
                        return;
                    }

                    //Insert values into the table
                    const dateYear = new Date();
                    Connection.query(`INSERT INTO \`innehav\` (\`Elev\`, \`Boknamn\`,\`BokID\`, \`Utdatum\`, \`Indatum\`)
                    VALUES ('${SelectStudentResult[0].ID}','${SelectBookResult[0].Modell}','${SelectBookResult[0].ID}',CURDATE(),'${dateYear.getFullYear()}-06-16')`, (InsertError) => {

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
 * Function for when a student returns a book
 * Sends back an HTTP code that tells if the operation went ok
 * 
 * @param {http.OutgoingMessage} response 
 * @param {{StudentID: string, BookID: string}} Parameters
 * @param {sql.Pool} Pool
 * @returns {void}
 */
module.exports.Return_Method = (response, Parameters, Pool) => {

    //Get a connection from the pool
    Pool.getConnection((PoolError, Connection) => {
        //If something goes wrong with establishing the connection
        if (PoolError) {
            console.error(PoolError);
            GTG.HTTPResponse(response, 2);
            return;
        }

        //Book has been returned. Remove it from the database.
        Connection.query(`DELETE FROM \`innehav\` WHERE \`BokID\` = '${Parameters.BookID}';`, (DeleteError) => {

            //If the query goes wrong
            if (DeleteError) {
                console.error(DeleteError);
                GTG.HTTPResponse(response, 2);
                return;
            }
            
            GTG.HTTPResponse(response, 0);
        });
        Connection.release();
    });
}