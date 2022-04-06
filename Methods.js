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
 */
module.exports.Initial_Request = (response, Urlparameters, Pool) => {
    
    //Fetch ID parameter
    const ID = Urlparameters.get('ID');

    //If the parameter can't be found
    if(!ID){
        console.error('Client Error: One or more URL parameters are undefined');
        GTG.HTTPResponse(response, 2);
        return;
    }

    //Fetch pool connection
    Pool.getConnection((PoolError, Connection) => {

        //If something goes wrong with the pool connection
        if(PoolError){
            console.error(PoolError);
            GTG.HTTPResponse(response, 2);
            return;
        }

        //Perform query to check if the ID exists in the DB
        Connection.query(`SELECT * FROM \`elever\` WHERE ID = ${ID}`, (QueryError, QueryResult) => {

            //If something goes wrong with the Query
            if(QueryError){
                console.error(QueryError);
                GTG.HTTPResponse(response, 2);
                return;
            }
            
            //If the ID doesn't exist in the DB
            if(!QueryResult[0]){
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